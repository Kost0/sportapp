// Read the signed-in identity for UI controls without depending on the profile
// service. This does not verify a JWT: the gateway and activity service still
// validate the token and enforce ownership on every protected request.
export function sessionUserId(token: string | null): string | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3 || parts.some(part => !part)) return null;
  const payload = parts[1];
  if (payload.length > 16384 || payload.length % 4 === 1 || !/^[A-Za-z0-9_-]+$/.test(payload)) return null;
  try {
    // No browser-only atob/Buffer globals: this also runs on native platforms.
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    let bits = 0, value = 0, encoded = '';
    for (const char of payload) {
      value = (value << 6) | alphabet.indexOf(char);
      bits += 6;
      if (bits >= 8) {
        bits -= 8;
        encoded += `%${((value >> bits) & 255).toString(16).padStart(2, '0')}`;
        value &= (1 << bits) - 1;
      }
    }
    const claims = JSON.parse(decodeURIComponent(encoded));
    return typeof claims?.sub === 'string' && claims.sub.trim() ? claims.sub : null;
  } catch {
    return null;
  }
}
