import { test, expect, type Page } from '@playwright/test';
import type { ActivityDetail } from '../../lib/api/activities';

const KEY = 'sportpoint.session.v1';
const testToken = (signature: string) => `${Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url')}.${Buffer.from('{"sub":"user"}').toString('base64url')}.${signature}`;
const accessToken = testToken('access');
const renewedToken = testToken('renewed');
const saved = { accessToken, refreshToken: 'refresh', expiresAt: Date.now() + 3600_000 };
async function mockApi(page: Page, { signedIn = true } = {}) {
  const state = { creates: 0, refreshes: 0, logouts: 0, lists: [] as Record<string, unknown>[], items: [] as Record<string, unknown>[],
    places: [] as { placeId: string; address: string; lat: number; lon: number; sports: string[] }[],
    detail: null as ActivityDetail | null, joins: 0, leaves: 0, reports: [] as Record<string, unknown>[], updates: [] as Record<string, unknown>[],
    profile: { userId: 'user', username: 'Tester', birthDate: '2000-02-29', gender: 'OTHER', favoriteSports: ['Бег'], version: 1 } };
  if (signedIn) await page.addInitScript(({ key, value }) => {
    if (!localStorage.getItem('test.initialized')) {
      localStorage.setItem(key, JSON.stringify(value)); localStorage.setItem('test.initialized', 'yes');
    }
  }, { key: KEY, value: saved });
  await page.route('http://localhost:8080/**', async route => {
    const request = route.request();
    if (request.method() === 'OPTIONS') { await route.fulfill({ status: 204 }); return; }
    const path = new URL(request.url()).pathname;
    const body = request.headers()['content-type']?.includes('application/json') ? request.postDataJSON() : {};
    let data: unknown = {};
    switch (path) {
      case '/auth/login': data = { ...saved, expiresIn: 3600 }; break;
      case '/auth/refresh': state.refreshes++; data = { accessToken: renewedToken, expiresIn: 3600 }; break;
      case '/auth/logout': state.logouts++; break;
      case '/views/home': data = { user: { userId: 'user', username: 'Tester', avatarUrl: '' }, myActivities: state.items, newsFeed: [] }; break;
      case '/activities/list': state.lists.push(body); data = { items: state.items, total: state.items.length }; break;
      case '/activities/create':
        state.creates++;
        await new Promise(resolve => setTimeout(resolve, 350));
        state.items.push({ ...body, activityId: 'created', organizerId: 'user', status: 'OPEN', spotsLeft: body.maxParticipants === 0 ? 0 : body.maxParticipants - 1, version: 1 });
        data = { activityId: 'created', status: 'OPEN', version: 1 }; break;
      case '/places/list': data = { items: state.places.filter(place => (!body.placeId || body.placeId === place.placeId) && (!body.search || place.address.toLowerCase().includes(body.search.toLowerCase()))) }; break;
      case '/activities/get': data = state.detail; break;
      case '/profile/get-by-id': data = { userId: body.targetUserId, username: 'Tester', favoriteSports: [] }; break;
      case '/activities/join':
        state.joins++;
        if (!state.detail) throw new Error('missing fixture');
        state.detail.participants.push({ userId: 'user', role: 'PARTICIPANT', joinedAt: new Date().toISOString() });
        state.detail.myRole = 'PARTICIPANT';
        state.detail.spotsLeft = state.detail.maxParticipants === 0 ? 0 : state.detail.maxParticipants - state.detail.participants.length;
        state.detail.status = state.detail.maxParticipants !== 0 && state.detail.spotsLeft === 0 ? 'FULL' : 'OPEN';
        data = { myRole: 'PARTICIPANT', spotsLeft: state.detail.spotsLeft, activityVersion: 2 }; break;
      case '/activities/leave':
        state.leaves++;
        if (!state.detail) throw new Error('missing fixture');
        state.detail.participants = state.detail.participants.filter(p => p.userId !== 'user');
        state.detail.myRole = null; state.detail.status = 'OPEN';
        state.detail.spotsLeft = state.detail.maxParticipants === 0 ? 0 : state.detail.maxParticipants - state.detail.participants.length;
        data = null; break;
      case '/activities/update':
        if (!state.detail) throw new Error('missing fixture');
        state.updates.push(body);
        state.detail = { ...state.detail, ...body, version: state.detail.version + 1 };
        state.detail!.spotsLeft = state.detail!.maxParticipants === 0 ? 0 : state.detail!.maxParticipants - state.detail!.participants.length;
        state.detail!.status = state.detail!.maxParticipants !== 0 && state.detail!.spotsLeft === 0 ? 'FULL' : 'OPEN';
        data = { updated: true, version: state.detail!.version }; break;
      case '/activities/report': state.reports.push(body); data = null; break;
      case '/profile/get': data = state.profile; break;
      case '/profile/update': state.profile = { ...state.profile, ...body }; data = { updated: true, version: 2 }; break;
      default: throw new Error(`Unmocked API: ${path}`);
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, data }) });
  });
  return state;
}

test('login survives reload; logout remains logged out after reload', async ({ page }) => {
  const state = await mockApi(page, { signedIn: false });
  await page.goto('/');
  await page.getByPlaceholder('Email').fill('test@example.com');
  await page.getByPlaceholder('Пароль', { exact: true }).fill('password');
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await expect(page.getByText('Tester', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('Tester', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Профиль/ }).click();
  await expect(page.getByRole('button', { name: 'Выйти', exact: true }).getByText('Выйти', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Выйти', exact: true }).click();
  await expect(page.getByPlaceholder('Email')).toBeVisible();
  await page.reload();
  await expect(page.getByPlaceholder('Email')).toBeVisible();
  expect(state.logouts).toBe(1);
});

test('registration requires a nickname and explains duplicate names and retries', async ({ page }) => {
  await mockApi(page, { signedIn: false });
  const requests: Record<string, string>[] = [];
  let failure = 'USERNAME_ALREADY_EXISTS';
  await page.route('http://localhost:8080/auth/register', async route => {
    requests.push(route.request().postDataJSON());
    await route.fulfill({ status: failure ? 400 : 200, contentType: 'application/json', body: JSON.stringify(failure
      ? { ok: false, error: { code: failure, message: failure } }
      : { ok: true, data: { ...saved, userId: 'user', expiresIn: 3600 } }) });
  });
  await page.goto('/login');
  await page.getByRole('button', { name: 'Нет аккаунта? Регистрация', exact: true }).click();
  await page.getByPlaceholder('Email').fill('new@example.test');
  await page.getByPlaceholder('Пароль', { exact: true }).fill('Test-password-123');
  await page.getByRole('button', { name: 'Создать аккаунт', exact: true }).click();
  await expect(page.getByText('Укажите email, никнейм и пароль.', { exact: true })).toBeVisible();
  expect(requests).toHaveLength(0);
  await page.getByPlaceholder('Никнейм').fill('  Taken  ');
  await page.getByRole('button', { name: 'Создать аккаунт', exact: true }).click();
  await expect(page.getByText('Этот никнейм уже занят. Выберите другой.', { exact: true })).toBeVisible();
  expect(requests[0].username).toBe('Taken');
  expect(await page.evaluate(key => localStorage.getItem(key), KEY)).toBeNull();
  failure = 'REGISTRATION_UNAVAILABLE';
  await page.getByPlaceholder('Никнейм').fill('New name');
  await page.getByRole('button', { name: 'Создать аккаунт', exact: true }).click();
  await expect(page.getByText(/Не удалось завершить регистрацию/)).toBeVisible();
  await expect(page.getByPlaceholder('Никнейм')).toHaveValue('New name');
  expect(await page.evaluate(key => localStorage.getItem(key), KEY)).toBeNull();
  failure = '';
  await page.getByRole('button', { name: 'Создать аккаунт', exact: true }).click();
  await expect(page.getByText('Tester', { exact: true })).toBeVisible();
  expect(requests[2]).toEqual(requests[1]);
  await page.reload();
  await expect(page.getByText('Tester', { exact: true })).toBeVisible();
});

test('visible logout works with a missing profile and an unavailable logout API', async ({ page }) => {
  await mockApi(page);
  await page.setViewportSize({ width: 320, height: 568 });
  await page.route('http://localhost:8080/profile/get', route => route.fulfill({ status: 400, contentType: 'application/json',
    body: JSON.stringify({ ok: false, error: { code: 'PROFILE_NOT_FOUND', message: 'profile not found' } }) }));
  await page.route('http://localhost:8080/auth/logout', route => route.abort('failed'));
  await page.goto('/profile');
  const button = page.getByRole('button', { name: 'Выйти', exact: true });
  await expect(button.getByText('Выйти', { exact: true })).toBeVisible();
  await expect(button).toBeInViewport();
  const bounds = (await button.boundingBox())!;
  expect(bounds.height).toBeGreaterThanOrEqual(44);
  expect(bounds.width).toBeGreaterThanOrEqual(44);
  await button.click();
  await expect(page.getByPlaceholder('Email')).toBeVisible();
  await expect.poll(() => page.evaluate(key => localStorage.getItem(key), KEY)).toBeNull();
  await page.reload();
  await expect(page.getByPlaceholder('Email')).toBeVisible();
  await page.goto('/activity/detail');
  await expect(page.getByPlaceholder('Email')).toBeVisible();
});

test('expired saved session refreshes instead of showing login', async ({ page }) => {
  const state = await mockApi(page, { signedIn: false });
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
    { key: KEY, value: { ...saved, expiresAt: 1 } });
  await page.goto('/');
  await expect(page.getByText('Tester', { exact: true })).toBeVisible();
  expect(state.refreshes).toBe(1);
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).accessToken, KEY)).toBe(renewedToken);
});

test('creation submits once, closes the wizard, and refreshes activities', async ({ page }) => {
  const state = await mockApi(page);
  await page.goto('/activities');
  await page.getByRole('button', { name: 'Создать', exact: true }).click();
  await page.getByRole('button', { name: 'Баскетбол', exact: true }).click();
  await page.getByRole('button', { name: 'Далее', exact: true }).click();
  await page.getByPlaceholder('Например: Вечерний баскетбол').fill('Regression basketball');
  await page.getByRole('button', { name: 'Далее', exact: true }).click();
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  await page.getByText(String(tomorrow.getDate()), { exact: true }).click();
  await page.getByRole('button', { name: 'Далее', exact: true }).click();
  await page.getByPlaceholder('Улица, дом или название места').fill('Test sports ground');
  await page.getByRole('button', { name: 'Далее', exact: true }).click();
  await page.getByRole('button', { name: 'Далее', exact: true }).click();
  await page.getByRole('button', { name: 'Создать', exact: true }).evaluate(element => {
    (element as HTMLElement).click(); (element as HTMLElement).click();
  });
  await expect(page).toHaveURL(/\/activities$/);
  await expect(page.getByText('Regression basketball', { exact: true })).toHaveCount(1);
  expect(state.creates).toBe(1);
  expect(state.items[0].requestId).toMatch(/^[0-9a-f-]{36}$/);
  await page.getByRole('button', { name: 'Создать', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Далее', exact: true })).toBeDisabled();
  await page.goto('/');
  await page.getByText('3 дня', { exact: true }).click();
  await expect(page.getByText('Regression basketball', { exact: true })).toBeVisible();
});

test('birthday picker preserves day, cancels edits, clamps leap days and saves a clear', async ({ page }) => {
  const state = await mockApi(page);
  await page.goto('/profile');
  await page.getByRole('button', { name: 'Дата рождения: 29.02.2000', exact: true }).click();
  await expect(page.getByRole('radio', { name: 'День 29', exact: true })).toBeChecked();
  await page.getByRole('radio', { name: 'Год 2001', exact: true }).click();
  await expect(page.getByRole('radio', { name: 'День 29', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Отмена', exact: true }).click();
  await page.getByRole('button', { name: 'Дата рождения: 29.02.2000', exact: true }).click();
  await expect(page.getByRole('radio', { name: 'Год 2000', exact: true })).toBeChecked();
  await page.getByRole('radio', { name: 'День 7', exact: true }).click();
  await page.getByRole('button', { name: 'Подтвердить', exact: true }).click();
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
  await expect.poll(() => state.profile.birthDate).toBe('2000-02-07');
  await page.getByRole('button', { name: 'Дата рождения: 07.02.2000', exact: true }).click();
  await page.getByRole('button', { name: 'Очистить', exact: true }).click();
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
  await expect.poll(() => state.profile.birthDate).toBe('');
  await page.reload();
  await expect(page.getByRole('button', { name: /Дата рождения: Выберите/ })).toBeVisible();
});

test('search keeps keyboard focus and category navigation applies the filter', async ({ page }) => {
  const state = await mockApi(page);
  await page.goto('/');
  await page.getByText('Баскетбол', { exact: true }).click();
  await expect.poll(() => state.lists.at(-1)?.sport).toBe('basketball');
  const search = page.getByPlaceholder('Поиск активностей...');
  await search.pressSequentially('basketball', { delay: 50 });
  await expect(search).toBeFocused();
  await expect.poll(() => state.lists.at(-1)?.search).toBe('basketball');
  await page.getByText('Завтра', { exact: true }).click();
  await expect.poll(() => state.lists.at(-1)?.date).toBe('tomorrow');
});

test('protected deep links require login and missing wizard drafts restart safely', async ({ page }) => {
  await mockApi(page, { signedIn: false });
  await page.goto('/create-activity/confirm');
  await expect(page.getByPlaceholder('Email')).toBeVisible();
  await page.getByPlaceholder('Email').fill('test@example.com');
  await page.getByPlaceholder('Пароль', { exact: true }).fill('password');
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await expect(page.getByText('Tester', { exact: true })).toBeVisible();
  await page.goto('/create-activity/confirm');
  await expect(page).toHaveURL(/\/create-activity$/);
  await expect(page.getByRole('button', { name: 'Далее', exact: true })).toBeDisabled();
});

test('an API 401 refreshes the token and retries the authenticated request', async ({ page }) => {
  const state = await mockApi(page);
  await page.route('http://localhost:8080/views/home', async route => {
    if (route.request().headers().authorization === `Bearer ${accessToken}`) {
      await route.fulfill({ status: 401, contentType: 'application/json',
        body: JSON.stringify({ ok: false, error: { code: 'UNAUTHORIZED', message: 'expired' } }) });
    } else await route.fallback();
  });
  await page.goto('/');
  await expect(page.getByText('Tester', { exact: true })).toBeVisible();
  expect(state.refreshes).toBe(1);
  await expect(page.getByPlaceholder('Email')).toHaveCount(0);
});

test('court cards open matching details, survive reload and return to the list', async ({ page }) => {
  await mockApi(page);
  await page.goto('/map');
  const courts = [
    ['Баскетбольная площадка', 'Парк Горького'],
    ['Футбольное поле', 'Спортивный комплекс ЦСКА'],
    ['Волейбольная площадка', 'Воробьевы горы'],
    ['Теннисный корт', 'Лужники'],
    ['Скалодром', 'Сокольники'],
  ];
  for (const [index, [name, location]] of courts.entries()) {
    const card = page.getByRole('button', { name: `Открыть площадку: ${name}`, exact: true });
    // Click the right edge, where the arrow sits, as in the reported bug.
    await card.scrollIntoViewIfNeeded();
    const box = await card.boundingBox();
    await card.click({ position: { x: box!.width - 28, y: box!.height / 2 } });
    await expect(page).toHaveURL(new RegExp(`/court/${index + 1}$`));
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
    await expect(page.getByText(location, { exact: true }).filter({ visible: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Посмотреть место на карте ↗' })).toHaveAttribute(
      'href', `https://yandex.ru/maps/?text=${encodeURIComponent(`${location}, Москва`)}`);
    await page.reload();
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Назад к площадкам', exact: true }).click();
    await expect(page).toHaveURL(/\/map$/);
  }
});

test('unknown court links recover to the list and court deep links require login', async ({ page }) => {
  await mockApi(page, { signedIn: false });
  await page.goto('/court/1');
  await expect(page.getByPlaceholder('Email')).toBeVisible();
  await page.getByPlaceholder('Email').fill('test@example.com');
  await page.getByPlaceholder('Пароль', { exact: true }).fill('password');
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await expect(page.getByText('Tester', { exact: true })).toBeVisible();
  await page.goto('/court/missing');
  await expect(page.getByRole('heading', { name: 'Площадка не найдена' })).toBeVisible();
  await page.getByRole('button', { name: 'К площадкам', exact: true }).click();
  await expect(page).toHaveURL(/\/map$/);
  await expect(page.getByRole('button', { name: /Открыть площадку:/ })).toHaveCount(5);
});

test('profile offers every sport and running hero applies the running filter', async ({ page }) => {
  const state = await mockApi(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Найти маршрут', exact: true }).click();
  await expect.poll(() => state.lists.at(-1)?.sport).toBe('running');
  await page.getByRole('button', { name: /Профиль/ }).click();
  for (const sport of ['Бег','Велосипед','Футбол','Баскетбол','Волейбол','Теннис','Бадминтон','Плавание','Паркур','Другое']) {
    await expect(page.getByRole('button', { name: sport, exact: true })).toBeVisible();
  }
  await page.getByRole('button', { name: 'Бадминтон', exact: true }).click();
  await page.getByRole('button', { name: 'Плавание', exact: true }).click();
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
  await expect.poll(() => state.profile.favoriteSports).toEqual(['Бег','Бадминтон','Плавание']);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Бадминтон', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('future calendar, minute time, existing places and unlimited capacity submit together', async ({ page }) => {
  const state = await mockApi(page);
  state.places.push({ placeId: 'saved-park', address: 'Previously created sports ground', lat: 59.9, lon: 30.3, sports: ['running'] });
  await page.goto('/activities');
  await page.getByRole('button', { name: 'Создать', exact: true }).click();
  await page.getByRole('button', { name: 'Бег', exact: true }).click();
  await page.getByRole('button', { name: 'Далее', exact: true }).click();
  await page.getByPlaceholder('Например: Вечерний баскетбол').fill('Unlimited minute run');
  await page.getByRole('button', { name: 'Далее', exact: true }).click();
  await page.getByRole('button', { name: 'Выбрать другую дату', exact: true }).click();
  const target = new Date(); target.setDate(15); target.setMonth(target.getMonth() + 1); target.setFullYear(target.getFullYear() + 1);
  await page.getByRole('button', { name: 'Следующий месяц', exact: true }).click();
  await page.getByRole('textbox', { name: 'Год активности' }).fill(String(target.getFullYear()));
  const key = `${target.getFullYear()}-${String(target.getMonth()+1).padStart(2,'0')}-15`;
  await page.getByRole('button', { name: `Выбрать дату ${key}`, exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Год активности' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Выбрать время: 18:00', exact: true }).click();
  await page.getByRole('textbox', { name: 'Часы', exact: true }).fill('06');
  await page.getByRole('textbox', { name: 'Минуты', exact: true }).fill('37');
  await page.getByRole('button', { name: 'Готово', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Часы', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Выбрать время: 06:37', exact: true }).click();
  await page.getByRole('textbox', { name: 'Минуты', exact: true }).fill('99');
  await expect(page.getByRole('button', { name: 'Готово', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Отмена выбора', exact: true }).click();
  await page.getByRole('button', { name: 'Выбрать время: 06:37', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('textbox', { name: 'Минуты', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Далее', exact: true }).click();
  await page.getByRole('button', { name: 'Выбрать существующее место', exact: true }).click();
  await page.getByRole('button', { name: 'Выбрать место: Теннисный корт', exact: true }).click();
  await expect(page.getByPlaceholder('Улица, дом или название места')).toHaveValue('Теннисный корт, Лужники');
  await page.getByRole('button', { name: 'Выбрать существующее место', exact: true }).click();
  await page.getByRole('button', { name: 'Выбрать место: Previously created sports ground', exact: true }).click();
  await page.getByRole('button', { name: 'Далее', exact: true }).click();
  await page.getByRole('textbox', { name: 'Максимум участников', exact: true }).fill('75');
  await expect(page.getByRole('button', { name: 'Увеличить число участников' })).toBeEnabled();
  await page.getByRole('checkbox', { name: 'Без ограничений', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Без ограничений', exact: true })).toBeChecked();
  await page.getByRole('checkbox', { name: 'Без ограничений', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Максимум участников' })).toHaveValue('75');
  await page.getByRole('checkbox', { name: 'Без ограничений', exact: true }).click();
  await page.getByRole('button', { name: 'Далее', exact: true }).click();
  await page.getByRole('button', { name: 'Создать', exact: true }).click();
  await expect(page).toHaveURL(/\/activities$/);
  expect(state.items[0]).toMatchObject({ maxParticipants: 0, address: 'Previously created sports ground', lat: 59.9, lon: 30.3 });
  const submitted = new Date(state.items[0].date as string);
  expect(submitted.getFullYear()).toBe(target.getFullYear());
  expect(submitted.getMonth()).toBe(target.getMonth());
  expect(submitted.getDate()).toBe(15);
  expect(submitted.getMinutes()).toBe(37);
  await expect(page.getByText('Без ограничений', { exact: true })).toBeVisible();
  await page.goto('/map');
  await page.getByRole('button', { name: 'Открыть площадку: Previously created sports ground', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Previously created sports ground', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Previously created sports ground', exact: true })).toBeVisible();
});

function detailFixture(): ActivityDetail {
  return { activityId: 'detail', title: 'Actual activity title', sport: 'running', status: 'OPEN', lat: 55.75, lon: 37.6,
    address: 'Test park', date: new Date(Date.now()+86400_000*30).toISOString(), maxParticipants: 2, spotsLeft: 1,
    description: '', organizerId: 'owner', version: 1, participants: [{ userId: 'owner', role: 'ORGANIZER', joinedAt: new Date().toISOString() }], myRole: null };
}

test('activity title, join/leave state and report submission update immediately', async ({ page }) => {
  const state = await mockApi(page); state.detail = detailFixture();
  await page.goto('/activity/detail');
  await expect(page.getByText('Actual activity title', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Присоединиться', exact: true }).evaluate(e => { (e as HTMLElement).click(); (e as HTMLElement).click(); });
  await expect(page.getByText('Участники (2)', { exact: true })).toBeVisible();
  await expect(page.getByText('Нет мест', { exact: true })).toBeVisible();
  expect(state.joins).toBe(1);
  await page.getByRole('button', { name: 'Покинуть', exact: true }).click();
  await expect(page.getByText('Участники (1)', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Присоединиться', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Пожаловаться', exact: true }).click();
  await page.getByPlaceholder('Причина жалобы').fill('Подробная причина на русском языке');
  await page.getByRole('button', { name: 'Отправить жалобу', exact: true }).click();
  await expect(page.getByPlaceholder('Причина жалобы')).toHaveCount(0);
  expect(state.reports).toEqual([{ activityId: 'detail', reason: 'Подробная причина на русском языке' }]);
});

test('organizer capacity editing refreshes places and can switch to unlimited', async ({ page }) => {
  const state = await mockApi(page); state.detail = { ...detailFixture(), organizerId: 'user', myRole: 'ORGANIZER' };
  await page.goto('/activity/detail');
  await page.getByRole('button', { name: 'Редактировать', exact: true }).click();
  await page.getByRole('textbox', { name: 'Максимум участников', exact: true }).fill('4');
  await page.getByRole('button', { name: /^Выбрать время:/ }).click();
  await page.getByRole('textbox', { name: 'Часы', exact: true }).fill('09');
  await page.getByRole('textbox', { name: 'Минуты', exact: true }).fill('23');
  await page.getByRole('button', { name: 'Готово', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Минуты', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
  expect(new Date(state.detail!.date).getMinutes()).toBe(23);
  await expect(page.getByPlaceholder('Название')).toHaveCount(0);
  await expect(page.getByText('Осталось мест: 3 из 4', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Редактировать', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Без ограничений', exact: true }).click();
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
  await expect(page.getByText('Без ограничений по числу участников', { exact: true })).toBeVisible();
});

test('home defaults to all dates with ten-item pages and resets pagination when filtering', async ({ page }) => {
  const state = await mockApi(page);
  state.items = Array.from({ length: 23 }, (_, index) => {
    const date = new Date(); date.setDate(date.getDate() + (index < 2 ? index - 30 : index - 2));
    return { activityId: `home-${index}`, title: `Home fixture ${String(index + 1).padStart(2, '0')}`,
      date: date.toISOString(), sport: 'running', status: index < 2 ? 'COMPLETED' : 'OPEN', myRole: index % 2 ? 'PARTICIPANT' : 'ORGANIZER' };
  });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Все', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText(/^Home fixture /)).toHaveCount(10);
  await expect(page.getByText('Home fixture 01', { exact: true })).toBeVisible();
  await expect(page.getByText('Home fixture 10', { exact: true })).toBeVisible();
  await expect(page.getByText('Вы организатор', { exact: true })).toHaveCount(5);
  await expect(page.getByText('Вы участник', { exact: true })).toHaveCount(5);
  await expect(page.getByText('Страница 1 из 3', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Предыдущая', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Следующая', exact: true }).click();
  await expect(page.getByText('Home fixture 11', { exact: true })).toBeVisible();
  await expect(page.getByText('Home fixture 01', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Следующая', exact: true }).click();
  await expect(page.getByText(/^Home fixture /)).toHaveCount(3);
  await expect(page.getByText('Home fixture 23', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Следующая', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Предыдущая', exact: true }).click();
  await expect(page.getByText('Страница 2 из 3', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Сегодня', exact: true }).click();
  await expect(page.getByText(/^Home fixture /)).toHaveCount(1);
  await expect(page.getByText('Home fixture 03', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Все', exact: true }).click();
  await expect(page.getByText('Страница 1 из 3', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Все', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText(/^Home fixture /)).toHaveCount(10);
});

for (const viewport of [{ width: 320, height: 568 }, { width: 960, height: 440 }, { width: 1840, height: 800 }]) {
  test(`report/edit actions fit their dialogs and editing belongs only to the creator at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const state = await mockApi(page); state.detail = { ...detailFixture(), myRole: 'PARTICIPANT' };
    await page.goto('/activity/detail');
    await expect(page.getByRole('button', { name: 'Редактировать', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Пожаловаться', exact: true }).click();
    const report = page.getByTestId('report-dialog');
    await expect(report).toBeVisible();
    for (const name of ['Отмена', 'Отправить жалобу']) {
      const control = report.getByRole('button', { name, exact: true });
      await expect(control).toBeInViewport();
      const parent = (await report.boundingBox())!, child = (await control.boundingBox())!;
      expect(child.x).toBeGreaterThanOrEqual(parent.x - 1);
      expect(child.x + child.width).toBeLessThanOrEqual(parent.x + parent.width + 1);
      expect(child.y + child.height).toBeLessThanOrEqual(parent.y + parent.height + 1);
    }
    await page.getByPlaceholder('Причина жалобы').fill('Проверка корректной раскладки кнопок');
    await report.getByRole('button', { name: 'Отправить жалобу', exact: true }).click();
    await expect(report).toHaveCount(0);
    // A stale membership role must neither hide the creator's controls nor grant ownership to another user.
    state.detail = { ...detailFixture(), organizerId: 'user', myRole: 'PARTICIPANT' };
    await page.reload();
    await expect(page.getByRole('button', { name: 'Вы организатор', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Пожаловаться', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Покинуть', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Редактировать', exact: true }).click();
    const edit = page.getByTestId('edit-dialog');
    for (const name of ['Отмена', 'Сохранить']) {
      const control = edit.getByRole('button', { name, exact: true });
      await expect(control).toBeInViewport();
      const parent = (await edit.boundingBox())!, child = (await control.boundingBox())!;
      expect(child.x).toBeGreaterThanOrEqual(parent.x - 1);
      expect(child.x + child.width).toBeLessThanOrEqual(parent.x + parent.width + 1);
      expect(child.y + child.height).toBeLessThanOrEqual(parent.y + parent.height + 1);
    }
    await edit.getByPlaceholder('Название', { exact: true }).fill('Edited by the creator');
    await edit.getByRole('button', { name: 'Сохранить', exact: true }).click();
    await expect(page.getByText('Edited by the creator', { exact: true })).toBeVisible();
    state.detail = { ...detailFixture(), organizerId: 'someone-else', myRole: 'ORGANIZER' };
    await page.reload();
    await expect(page.getByRole('button', { name: 'Пожаловаться', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Редактировать', exact: true })).toHaveCount(0);
  });
}

test('creator can edit a past activity without resubmitting an unchanged past date', async ({ page }) => {
  const state = await mockApi(page);
  state.detail = { ...detailFixture(), organizerId: 'user', myRole: null, date: new Date(Date.now() - 86400_000).toISOString() };
  await page.goto('/activity/detail');
  await page.getByRole('button', { name: 'Редактировать', exact: true }).click();
  await page.getByPlaceholder('Название', { exact: true }).fill('Edited past activity');
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
  await expect(page.getByText('Edited past activity', { exact: true })).toBeVisible();
  expect(state.updates).toEqual([{ activityId: 'detail', title: 'Edited past activity' }]);
});

for (const creator of [true, false]) {
  test(`missing profiles do not block activity details or change creator permissions (${creator})`, async ({ page }) => {
    const state = await mockApi(page);
    state.detail = { ...detailFixture(), organizerId: creator ? 'user' : 'owner', myRole: 'ORGANIZER' };
    let ownProfileRequests = 0, missingProfiles = 0;
    await page.route('http://localhost:8080/profile/**', async route => {
      if (route.request().url().endsWith('/profile/get')) ownProfileRequests++;
      await route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ ok: false,
        error: { code: 'PROFILE_NOT_FOUND', message: 'profile not found' } }) });
      missingProfiles++;
    });
    await page.goto('/activity/detail');
    await expect(page.getByText('Actual activity title', { exact: true })).toBeVisible();
    await expect.poll(() => missingProfiles).toBeGreaterThan(0);
    await expect(page.getByText(/PROFILE_NOT_FOUND/)).toHaveCount(0);
    expect(ownProfileRequests).toBe(0);
    if (creator) {
      await page.getByRole('button', { name: 'Редактировать', exact: true }).click();
      await page.getByPlaceholder('Название', { exact: true }).fill('Saved without any profile');
      await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
      await expect(page.getByText('Saved without any profile', { exact: true })).toBeVisible();
    } else {
      await expect(page.getByRole('button', { name: 'Редактировать', exact: true })).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Пожаловаться', exact: true })).toBeEnabled();
    }
    await page.reload();
    await expect(page.getByText(state.detail.title, { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Редактировать', exact: true })).toHaveCount(creator ? 1 : 0);
  });
}

test('a profile network failure is optional but a missing activity still shows its own error', async ({ page }) => {
  const state = await mockApi(page); state.detail = detailFixture();
  await page.route('http://localhost:8080/profile/**', route => route.abort('failed'));
  await page.goto('/activity/detail');
  await expect(page.getByText('Actual activity title', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Присоединиться', exact: true })).toBeEnabled();
  await page.route('http://localhost:8080/activities/get', route => route.fulfill({ status: 400, contentType: 'application/json',
    body: JSON.stringify({ ok: false, error: { code: 'ACTIVITY_NOT_FOUND', message: 'activity not found' } }) }));
  await page.reload();
  await expect(page.getByText('Активность не найдена', { exact: true })).toBeVisible();
  await expect(page.getByText('Actual activity title', { exact: true })).toHaveCount(0);
});
