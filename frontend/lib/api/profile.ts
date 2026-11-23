import { postJson, fetchFormData } from '@/lib/api/client';
import { getApiBaseUrl } from './config';
import { resolveMediaUrl } from '@/utils/media-url';

export type ProfileGender = 'MALE' | 'FEMALE' | 'OTHER' | '';

export type Profile = {
  userId: string;
  username: string;
  avatarUrl?: string;
  gender?: Exclude<ProfileGender, ''>;
  birthDate?: string;
  age?: number;
  favoriteSports: string[];
  version: number;
};

export type UpdateProfileReq = {
  username: string;
  gender?: ProfileGender;
  birthDate?: string;
  favoriteSports: string[];
};

export type UpdateProfileResp = {
  updated: boolean;
  version: number;
};

export const getProfile = async (token: string): Promise<Profile> => {
  const profile = await postJson<Record<string, never>, Profile>('/profile/get', {}, { token });
  return { ...profile, avatarUrl: resolveMediaUrl(profile.avatarUrl, getApiBaseUrl()) };
};

export const updateProfile = async (token: string, req: UpdateProfileReq): Promise<UpdateProfileResp> => {
  return postJson<UpdateProfileReq, UpdateProfileResp>('/profile/update', req, { token });
};

export type UploadAvatarResp = {
  avatarUrl: string;
  version: number;
};

export const uploadAvatar = async (token: string, uri: string): Promise<UploadAvatarResp> => {
  return fetchFormData<UploadAvatarResp>('/profile/avatar', uri, { token });
};

export type PublicProfile = {
  userId: string;
  username: string;
  avatarUrl?: string;
  favoriteSports: string[];
};

export const getProfileById = async (token: string, targetUserId: string): Promise<PublicProfile> => {
  const profile = await postJson<{ targetUserId: string }, PublicProfile>('/profile/get-by-id', { targetUserId }, { token });
  return { ...profile, avatarUrl: resolveMediaUrl(profile.avatarUrl, getApiBaseUrl()) };
};
