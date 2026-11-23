import { getApiBaseUrl } from '@/lib/api/config';
import { ApiError, readApiResponse } from './response';
export { ApiError } from './response';
import { session } from '@/lib/auth/session';
import { Platform } from 'react-native';

type PostOptions = {
  token?: string | null;
  signal?: AbortSignal;
};

const authorizedFetch = async (url: string, init: RequestInit, opts: PostOptions) => {
  const authenticated = Boolean(opts.token);
  const token = authenticated ? await session.accessToken() : null;
  if (authenticated && !token) throw new ApiError('Session expired', 'UNAUTHORIZED', 401);
  const send = (accessToken: string | null) => fetch(url, {
    ...init,
    signal: opts.signal,
    headers: { ...init.headers, ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
  });
  let res = await send(token);
  if (res.status === 401 && token) {
    const renewed = await session.refresh(token);
    if (renewed) res = await send(renewed);
  }
  return res;
};

export const postJson = async <TReq, TRes>(
  path: string,
  body: TReq,
  opts: PostOptions = {}
): Promise<TRes> => {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const res = await authorizedFetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body ?? {}),
  }, opts);

  return readApiResponse<TRes>(res);
};

export const fetchFormData = async <TRes>(
  path: string,
  fileUri: string,
  opts: PostOptions = {}
): Promise<TRes> => {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;

  const formData = new FormData();
  
  // Get the file name from URI
  const filename = fileUri.split('/').pop() || 'avatar.jpg';
  const fileType = filename.endsWith('.png') ? 'image/png' : 'image/jpeg';
  
  if (Platform.OS === 'web') {
    const file = await fetch(fileUri);
    const blob = await file.blob();
    formData.append('file', blob, blob.type === 'image/png' ? 'avatar.png' : 'avatar.jpg');
  } else {
    formData.append('file', { uri: fileUri, name: filename, type: fileType } as unknown as Blob);
  }

  const headers: Record<string, string> = {};
  const res = await authorizedFetch(url, {
    method: 'POST',
    headers,
    body: formData,
  }, opts);

  return readApiResponse<TRes>(res);
};
