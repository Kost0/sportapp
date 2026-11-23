import { describe, expect, it } from 'vitest';
import { sessionUserId } from '../../lib/auth/session-user';

const token = (claims: unknown) => `header.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.signature`;

describe('session identity without the profile service', () => {
  it('reads the subject from both an original and refreshed token', () => {
    const sub = 'ff69bafd-7238-4b3c-a1f7-1cf07371d1de';
    expect(sessionUserId(token({ sub, exp: 100 }))).toBe(sub);
    expect(sessionUserId(token({ sub, exp: 200 }))).toBe(sub);
  });
  it('decodes URL-safe UTF-8 claims without browser globals', () => {
    expect(sessionUserId(token({ sub: 'user', name: 'Игрок 🏃' }))).toBe('user');
  });
  it('returns no identity for absent, malformed or non-string subjects', () => {
    for (const value of [null, '', 'opaque', 'a.b.c', 'a.@@@.c', 'a.e30.', token({}), token(null), token({ sub: '' }), token({ sub: '  ' }), token({ sub: 42 })]) {
      expect(sessionUserId(value)).toBeNull();
    }
  });
});
