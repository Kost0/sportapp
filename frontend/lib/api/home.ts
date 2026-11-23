import { postJson } from '@/lib/api/client';
import { getApiBaseUrl } from './config';
import { resolveMediaUrl } from '@/utils/media-url';

export type NewsItem = {
  newsId: string;
  title: string;
  imageUrl: string;
  sport: string;
  publishedAt: string;
};

export type MyActivityItem = {
  activityId: string;
  title: string;
  sport: string;
  date: string;
  status: string;
  myRole: string;
};

export type HomeUser = {
  userId: string;
  username: string;
  avatarUrl: string;
};

export type HomeData = {
  user: HomeUser;
  newsFeed: NewsItem[];
  myActivities: MyActivityItem[];
};

export const getHomeData = async (token: string): Promise<HomeData> => {
  const home = await postJson<Record<string, never>, HomeData>('/views/home', {}, { token });
  return { ...home, user: { ...home.user, avatarUrl: resolveMediaUrl(home.user.avatarUrl, getApiBaseUrl()) } };
};
