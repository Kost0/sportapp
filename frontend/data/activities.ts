export type ActivityStatus = "Активно" | "Мало мест" | "Скрыто";

export type ActivityParticipant = {
  id: string;
  name: string;
  avatarUrl: string;
};

export type Activity = {
  id: string;
  sport: string;
  status: ActivityStatus;
  distanceText: string;
  spots: { taken: number; total: number };
  startsAt: string;
  address: string;
  title: string;
  description: string;
  imageUrl: string;
  creator: { name: string; role: string; avatarUrl: string };
  participants: ActivityParticipant[];
};

type ParseResult<T> = { ok: true; value: T } | { ok: false; reason: string };

let cachedVisibleActivities: Activity[] | null = null;
let cachedVisibleById: Map<string, Activity> | null = null;

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

const asString = (v: unknown): ParseResult<string> => {
  if (typeof v === "string") return { ok: true, value: v };
  return { ok: false, reason: "expected string" };
};

const asNumber = (v: unknown): ParseResult<number> => {
  if (typeof v === "number" && Number.isFinite(v)) return { ok: true, value: v };
  return { ok: false, reason: "expected number" };
};

const parseParticipant = (v: unknown): ParseResult<ActivityParticipant> => {
  if (!isRecord(v)) return { ok: false, reason: "expected participant object" };
  const id = asString(v.id);
  const name = asString(v.name);
  const avatarUrl = asString(v.avatarUrl);
  if (!id.ok || !name.ok || !avatarUrl.ok) {
    return { ok: false, reason: "invalid participant fields" };
  }
  return { ok: true, value: { id: id.value, name: name.value, avatarUrl: avatarUrl.value } };
};

const parseActivity = (v: unknown): ParseResult<Activity> => {
  if (!isRecord(v)) return { ok: false, reason: "expected activity object" };

  const id = asString(v.id);
  const sport = asString(v.sport);
  const status = asString(v.status);
  const distanceText = asString(v.distanceText);
  const startsAt = asString(v.startsAt);
  const address = asString(v.address);
  const title = asString(v.title);
  const description = asString(v.description);
  const imageUrl = asString(v.imageUrl);

  if (
    !id.ok ||
    !sport.ok ||
    !status.ok ||
    !distanceText.ok ||
    !startsAt.ok ||
    !address.ok ||
    !title.ok ||
    !description.ok ||
    !imageUrl.ok
  ) {
    return { ok: false, reason: "invalid activity scalar fields" };
  }

  const rawSpots = v.spots;
  if (!isRecord(rawSpots)) return { ok: false, reason: "invalid spots" };
  const taken = asNumber(rawSpots.taken);
  const total = asNumber(rawSpots.total);
  if (!taken.ok || !total.ok) return { ok: false, reason: "invalid spots numbers" };

  const rawCreator = v.creator;
  if (!isRecord(rawCreator)) return { ok: false, reason: "invalid creator" };
  const creatorName = asString(rawCreator.name);
  const creatorRole = asString(rawCreator.role);
  const creatorAvatarUrl = asString(rawCreator.avatarUrl);
  if (!creatorName.ok || !creatorRole.ok || !creatorAvatarUrl.ok) {
    return { ok: false, reason: "invalid creator fields" };
  }

  const rawParticipants = v.participants;
  if (!Array.isArray(rawParticipants)) {
    return { ok: false, reason: "invalid participants" };
  }

  const participants: ActivityParticipant[] = [];
  for (const p of rawParticipants) {
    const parsed = parseParticipant(p);
    if (parsed.ok) participants.push(parsed.value);
  }

  const normalizedStatus: ActivityStatus =
    status.value === "Активно" || status.value === "Мало мест" || status.value === "Скрыто"
      ? (status.value as ActivityStatus)
      : "Активно";

  return {
    ok: true,
    value: {
      id: id.value,
      sport: sport.value,
      status: normalizedStatus,
      distanceText: distanceText.value,
      spots: { taken: taken.value, total: total.value },
      startsAt: startsAt.value,
      address: address.value,
      title: title.value,
      description: description.value,
      imageUrl: imageUrl.value,
      creator: {
        name: creatorName.value,
        role: creatorRole.value,
        avatarUrl: creatorAvatarUrl.value,
      },
      participants,
    },
  };
};

const loadRawActivities = (): unknown => {
  // Using require keeps TypeScript config simple.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const data = require("./activities.json");
  return data as unknown;
};

export const getActivities = (): Activity[] => {
  if (cachedVisibleActivities) return cachedVisibleActivities;

  const raw = loadRawActivities();
  if (!Array.isArray(raw)) return [];

  const parsed: Activity[] = [];
  for (const item of raw) {
    const res = parseActivity(item);
    if (res.ok && res.value.status !== "Скрыто") parsed.push(res.value);
  }

  cachedVisibleActivities = parsed;
  cachedVisibleById = new Map(parsed.map((a) => [a.id, a] as const));

  return cachedVisibleActivities;
};

export const getActivityById = (id: string): Activity | null => {
  getActivities();
  return cachedVisibleById?.get(id) ?? null;
};
