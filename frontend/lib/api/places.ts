import { postJson } from './client';
export type SavedPlace = { placeId: string; address: string; lat: number; lon: number; sports: string[] };
export const listPlaces = (token: string, search = '', signal?: AbortSignal, placeId?: string) =>
  postJson<{ search: string; placeId?: string }, { items: SavedPlace[] }>('/places/list', { search, placeId }, { token, signal });
