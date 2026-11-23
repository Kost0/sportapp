import { describe, expect, it, vi } from 'vitest';
import { SessionManager, type SessionStorage } from '../../lib/auth/session-manager';

function setup(saved: string | null = null) {
  let value = saved;
  const storage: SessionStorage = { read: async () => value, write: async next => { value = next; } };
  const refresh = vi.fn(async () => ({ accessToken: 'renewed', expiresIn: 3600 }));
  const session = new SessionManager(storage, refresh);
  return { storage, refresh, session, saved: () => value };
}
const credentials = { accessToken: 'access', refreshToken: 'refresh', expiresIn: 3600 };

describe('persistent sessions', () => {
  it('restores login after a page/app restart', async () => {
    const first = setup();
    await first.session.set(credentials);
    const second = setup(first.saved());
    await second.session.restore();
    expect(await second.session.accessToken()).toBe('access');
    expect(second.refresh).not.toHaveBeenCalled();
  });
  it('shares refresh between simultaneous expired-token requests', async () => {
    const { session, refresh } = setup();
    await session.set({ ...credentials, expiresIn: -1 });
    expect(await Promise.all([session.accessToken(), session.accessToken(), session.accessToken()]))
      .toEqual(['renewed', 'renewed', 'renewed']);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(await session.refresh('access')).toBe('renewed');
    expect(refresh).toHaveBeenCalledTimes(1);
  });
  it('does not resurrect a logged-out session after an outstanding refresh', async () => {
    let resolve!: (value: { accessToken: string; expiresIn: number }) => void;
    const { storage } = setup();
    const session = new SessionManager(storage, () => new Promise(done => { resolve = done; }));
    await session.set(credentials);
    const pending = session.refresh('access');
    await session.clear();
    resolve({ accessToken: 'late', expiresIn: 3600 });
    expect(await pending).toBeNull();
    expect(await storage.read()).toBeNull();
    expect(session.current).toBeNull();
  });
  it('clears revoked credentials but preserves them after a network failure', async () => {
    const { session, refresh, saved } = setup();
    await session.set(credentials);
    refresh.mockRejectedValueOnce(new Error('offline'));
    await expect(session.refresh('access')).rejects.toThrow('offline');
    expect(saved()).not.toBeNull();
    refresh.mockRejectedValueOnce(Object.assign(new Error('revoked'), { code: 'TOKEN_REVOKED' }));
    await expect(session.refresh('access')).rejects.toThrow('revoked');
    expect(saved()).toBeNull();
  });
  it('does not return refreshed credentials if logout happens during persistence', async () => {
    const { session, storage } = setup();
    await session.set(credentials);
    let release!: () => void;
    let started!: () => void;
    const writing = new Promise<void>(done => { started = done; });
    const originalWrite = storage.write;
    storage.write = async value => {
      if (value !== null) {
        started();
        await new Promise<void>(done => { release = done; });
      }
      await originalWrite(value);
    };
    const refreshing = session.refresh('access');
    await writing;
    const logout = session.clear();
    release();
    expect(await refreshing).toBeNull();
    await logout;
    expect(await storage.read()).toBeNull();
  });
  it('recovers from corrupt storage and reports failed persistence', async () => {
    const { session, storage } = setup('{bad json');
    await session.restore();
    expect(session.current).toBeNull();
    storage.write = async () => { throw new Error('storage unavailable'); };
    await expect(session.set(credentials)).rejects.toThrow('storage unavailable');
    expect(session.current).toBeNull();
  });
});
