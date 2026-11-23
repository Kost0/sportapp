import { expect, it } from 'vitest';
import { resolveMediaUrl } from '../../utils/media-url';
it('resolves new and legacy Docker avatar paths against the reachable API host', () => {
  const base = 'http://192.168.1.10:8080';
  expect(resolveMediaUrl('/avatars/user.png', base)).toBe(`${base}/avatars/user.png`);
  expect(resolveMediaUrl('http://user-profiles:8084/avatars/user.png', base)).toBe(`${base}/avatars/user.png`);
  expect(resolveMediaUrl('https://cdn.example.com/user.png', base)).toBe('https://cdn.example.com/user.png');
  expect(resolveMediaUrl(undefined, base)).toBe('');
});
