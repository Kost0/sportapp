import type { ApiEnvelope } from './types';

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

export async function readApiResponse<T>(res: Response): Promise<T> {
  let json: unknown = null;
  try { json = await res.json(); } catch { /* The envelope parser reports malformed responses. */ }
  const envelope = parseEnvelope<T>(json);
  if (envelope.ok && res.ok) return envelope.data;
  if (envelope.ok) throw new ApiError('Request failed', 'HTTP_ERROR', res.status);
  throw new ApiError(envelope.error.message, envelope.error.code, res.status);
}
