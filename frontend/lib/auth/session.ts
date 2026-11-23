import { getApiBaseUrl } from '@/lib/api/config';
import { readApiResponse } from '@/lib/api/response';
import { SessionManager } from './session-manager';
import { sessionStorage } from './session-storage';

export const session = new SessionManager(sessionStorage, async refreshToken => {
  const response = await fetch(`${getApiBaseUrl()}/auth/refresh`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  return readApiResponse<{ accessToken: string; expiresIn: number }>(response);
});
