import { getApiBaseUrl } from '@/lib/api/config';
import type { ApiEnvelope } from '@/lib/api/types';

export class ApiError extends Error {
  public readonly code: string;
  public readonly status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

const parseEnvelope = <T>(v: unknown): ApiEnvelope<T> => {
  if (!isRecord(v) || typeof v.ok !== 'boolean') {
    return { ok: false, error: { code: 'BAD_RESPONSE', message: 'invalid server response' } };
  }
  if (v.ok === true) {
    return { ok: true, data: (v as { data: T }).data };
  }

  const err = isRecord(v.error) ? v.error : null;
  const code = typeof err?.code === 'string' ? err.code : 'UNKNOWN_ERROR';
  const message = typeof err?.message === 'string' ? err.message : 'request failed';
  return { ok: false, error: { code, message } };
};

type PostOptions = {
  token?: string | null;
  signal?: AbortSignal;
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
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body ?? {}),
    signal: opts.signal,
  });

  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    // ignore
  }

  const env = parseEnvelope<TRes>(json);
  if (env.ok) return env.data;

  throw new ApiError(env.error.message, env.error.code, res.status);
};
