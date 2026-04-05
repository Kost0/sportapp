import { postJson } from '@/lib/api/client';

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
  return postJson<Record<string, never>, HomeData>('/views/home', {}, { token });
};
