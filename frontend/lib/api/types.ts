export type ApiErrorBody = {
  code: string;
  message: string;
};

export type ApiEnvelopeOk<T> = {
  ok: true;
  data: T;
};

export type ApiEnvelopeErr = {
  ok: false;
  error: ApiErrorBody;
};

export type ApiEnvelope<T> = ApiEnvelopeOk<T> | ApiEnvelopeErr;
