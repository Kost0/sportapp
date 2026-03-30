import Constants from 'expo-constants';
import { Platform } from 'react-native';

const asString = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null);

const extractHost = (hostUri: string): string | null => {
  // Examples:
  // - "192.168.1.10:8081"
  // - "192.168.1.10:8081/--/"
  // - "exp://192.168.1.10:8081"
  const cleaned = hostUri
    .replace(/^https?:\/\//, '')
    .replace(/^exp:\/\//, '')
    .split('/')[0];

  const host = cleaned.split(':')[0];
  return host ? host : null;
};

const guessDevApiBaseUrl = (): string | null => {
  const extra: unknown = (Constants as unknown as { expoConfig?: unknown }).expoConfig;
  const hostUri = asString((extra as { hostUri?: unknown } | null)?.hostUri);
  if (hostUri) {
    const host = extractHost(hostUri);
    if (host) return `http://${host}:8080`;
  }

  const manifest = (Constants as unknown as { manifest?: unknown }).manifest;
  const debuggerHost = asString((manifest as { debuggerHost?: unknown } | null)?.debuggerHost);
  if (debuggerHost) {
    const host = extractHost(debuggerHost);
    if (host) return `http://${host}:8080`;
  }

  return null;
};

export const getApiBaseUrl = (): string => {
  const env = asString(process.env.EXPO_PUBLIC_API_URL);
  if (env) return env.replace(/\/$/, '');

  // Web can usually reach localhost directly.
  if (Platform.OS === 'web') return 'http://localhost:8080';

  const guessed = guessDevApiBaseUrl();
  if (guessed) return guessed;

  // Last resort: keep it explicit so the user can fix it quickly.
  return 'http://localhost:8080';
};
