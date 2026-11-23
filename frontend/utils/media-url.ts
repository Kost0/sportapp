// Avatar paths are served through the public API, including on physical devices.
export function resolveMediaUrl(value: string | undefined, apiBaseUrl: string): string {
  if (!value) return '';
  if (value.startsWith('/avatars/')) return `${apiBaseUrl}${value}`;
  try {
    const url = new URL(value);
    // Support profile records saved by the previous Docker configuration.
    if (url.hostname === 'user-profiles' && url.pathname.startsWith('/avatars/')) {
      return `${apiBaseUrl}${url.pathname}${url.search}`;
    }
    return /^https?:$/.test(url.protocol) ? value : '';
  } catch { return ''; }
}
