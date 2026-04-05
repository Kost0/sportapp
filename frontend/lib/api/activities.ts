import { postJson } from '@/lib/api/client';

export type ActivityStatus = 'OPEN' | 'FULL' | 'COMPLETED' | 'CANCELLED';

export type ActivityListItem = {
  activityId: string;
  title: string;
  sport: string;
  address: string;
  date: string;
  spotsLeft: number;
  status: ActivityStatus;
  version: number;
  organizerId: string;
  imageUrl?: string;
};

export type ActivitiesListResp = {
  items: ActivityListItem[];
  total: number;
};

export type ActivityParticipant = {
  userId: string;
  role: string;
  joinedAt: string;
};

export type ActivityDetail = {
  activityId: string;
  title: string;
  sport: string;
  status: ActivityStatus;
  lat: number;
  lon: number;
  address: string;
  date: string;
  maxParticipants: number;
  spotsLeft: number;
  description: string;
  organizerId: string;
  version: number;
  participants: ActivityParticipant[];
  myRole: string | null;
};

export type JoinResp = {
  activityId: string;
  myRole: string;
  spotsLeft: number;
  activityVersion: number;
};

export const listActivities = async (
  token: string,
  limit = 20,
  offset = 0,
  filters: { sport?: string; date?: string; status?: string; search?: string } = {}
) => {
  return postJson<
    { sport?: string; date?: string; status?: string; limit: number; offset: number; search?: string },
    ActivitiesListResp
  >(
    '/activities/list',
    {
      limit,
      offset,
      sport: filters.sport,
      date: filters.date,
      status: filters.status,
      search: filters.search,
    },
    { token }
  );
};

export const getActivity = async (token: string, activityId: string) => {
  return postJson<{ activityId: string }, ActivityDetail>('/activities/get', { activityId }, { token });
};

export const joinActivity = async (token: string, activityId: string) => {
  return postJson<{ activityId: string }, JoinResp>('/activities/join', { activityId }, { token });
};

export const leaveActivity = async (token: string, activityId: string) => {
  return postJson<{ activityId: string }, void>('/activities/leave', { activityId }, { token });
};

export type CreateActivityInput = {
  title: string;
  sport: string;
  lat: number;
  lon: number;
  address: string;
  date: string;
  maxParticipants: number;
  description: string;
};

export type CreateActivityResp = {
  activityId: string;
  status: ActivityStatus;
  version: number;
};

export const createActivity = async (token: string, input: CreateActivityInput) => {
  return postJson<CreateActivityInput, CreateActivityResp>('/activities/create', input, { token });
};

export type UpdateActivityInput = {
  title?: string;
  sport?: string;
  lat?: number;
  lon?: number;
  address?: string;
  date?: string;
  maxParticipants?: number;
  description?: string;
};

export type UpdateActivityResp = {
  activityId: string;
  updated: boolean;
  version: number;
};

export const updateActivity = async (
  token: string,
  activityId: string,
  userId: string,
  input: UpdateActivityInput
) => {
  return postJson<
    { userId: string; activityId: string } & UpdateActivityInput,
    UpdateActivityResp
  >('/activities/update', { userId, activityId, ...input }, { token });
};

export type ReportActivityInput = {
  activityId: string;
  reporterId: string;
  reason: string;
};

export const reportActivity = async (
  token: string,
  input: ReportActivityInput
) => {
  return postJson<ReportActivityInput, void>('/activities/report', input, { token });
};
