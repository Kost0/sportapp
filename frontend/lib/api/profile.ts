import { postJson } from '@/lib/api/client';

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
  gender?: Exclude<ProfileGender, ''>;
  birthDate?: string;
  favoriteSports: string[];
};

export type UpdateProfileResp = {
  updated: boolean;
  version: number;
};

export const getProfile = async (token: string): Promise<Profile> => {
  return postJson<Record<string, never>, Profile>('/profile/get', {}, { token });
};

export const updateProfile = async (token: string, req: UpdateProfileReq): Promise<UpdateProfileResp> => {
  return postJson<UpdateProfileReq, UpdateProfileResp>('/profile/update', req, { token });
};
