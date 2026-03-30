import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { SportIcon } from "../../components/sport-icon";
import { StatusBadge } from "../../components/status-badge";
import { PrimaryButton, SecondaryButton } from "../../components/ui-buttons";
import { COLORS } from "../../constants/colors";
import type { ActivityDetail } from "@/lib/api/activities";
import { getActivity, joinActivity } from "@/lib/api/activities";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/auth-context";
import { formatStartsAt } from "../../utils/date-format";

type Params = { id?: string | string[] };

const normalizeId = (id: Params["id"]) => (Array.isArray(id) ? id[0] : id);

export default function ActivityDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<Params>();
  const id = normalizeId(params.id);

  const { token, logout } = useAuth();
  const [activity, setActivity] = useState<ActivityDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startsAt = useMemo(
    () => (activity ? formatStartsAt(activity.date) : null),
    [activity]
  );

  useEffect(() => {
    if (!id || !token) return;

    let cancelled = false;
    setBusy(true);
    setError(null);

    getActivity(token, id)
      .then((res) => {
        if (cancelled) return;
        setActivity(res);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        if (e instanceof ApiError) {
          if (e.status === 401) logout();
          setError(`${e.code}: ${e.message}`);
        } else {
          setError('Failed to load activity');
        }
      })
      .finally(() => {
        if (cancelled) return;
        setBusy(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, token, logout]);

  const canJoin = useMemo(() => {
    if (!activity) return false;
    if (activity.status !== 'OPEN') return false;
    if (activity.myRole) return false;
    if (activity.spotsLeft <= 0) return false;
    return true;
  }, [activity]);

  const onJoin = async () => {
    if (!id || !token) return;
    setActionBusy(true);
    setError(null);
    try {
      const res = await joinActivity(token, id);
      setActivity((prev) =>
        prev
          ? {
              ...prev,
              spotsLeft: res.spotsLeft,
              version: res.activityVersion,
              myRole: res.myRole,
            }
          : prev
      );
    } catch (e: unknown) {
      if (e instanceof ApiError) {
        if (e.status === 401) logout();
        setError(`${e.code}: ${e.message}`);
      } else {
        setError('Join failed');
      }
    } finally {
      setActionBusy(false);
    }
  };

  if (!activity) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Pressable
              onPress={() => router.back()}
              hitSlop={10}
              style={{ padding: 2 }}
            >
              <MaterialIcons
                name="arrow-back"
                size={20}
                color={COLORS.textSecondary}
              />
            </Pressable>
            <Text style={styles.headerTitle}>Подробный обзор</Text>
          </View>
        </View>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>
            {busy ? "Загружаю…" : "Активность не найдена"}
          </Text>
          <Text style={styles.emptyText}>
            {error ? error : "Вернитесь в список и выберите другую."}
          </Text>
          <View style={{ height: 16 }} />
          <PrimaryButton title="К списку" onPress={() => router.replace("/")} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            style={{ padding: 2 }}
          >
            <MaterialIcons
              name="arrow-back"
              size={20}
              color={COLORS.textSecondary}
            />
          </Pressable>
          <Text style={styles.headerTitle}>Подробный обзор</Text>
        </View>
        <StatusBadge status={activity.status} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroWrap} />

        <View style={styles.titleRow}>
          <Text style={styles.activityTitle}>{activity.sport}</Text>
          <View style={styles.sportIconWrap}>
            <SportIcon sport={activity.sport} size={24} color={COLORS.surface} />
          </View>
        </View>

        <Text style={styles.creatorRole}>Организатор: {activity.organizerId}</Text>

        <Text style={styles.description}>{activity.description || ""}</Text>

        <View style={styles.infoRow}>
          <View style={styles.infoIconWrap}>
            <MaterialIcons name="event" size={20} color={COLORS.surface} />
          </View>
          <View style={styles.infoTextWrap}>
            <View style={styles.infoInline}>
              <Text style={styles.infoPrimary}>{startsAt?.long ?? ""}</Text>
              <View style={styles.bulletSmall} />
              <Text style={styles.infoSecondary}>{startsAt?.time ?? ""}</Text>
            </View>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoIconWrap}>
            <MaterialIcons name="place" size={20} color={COLORS.surface} />
          </View>
          <View style={styles.infoTextWrap}>
            <Text style={styles.infoPrimary}>{activity.address}</Text>
          </View>
        </View>

        <View style={styles.participantsBlock}>
          <Text style={styles.participantsTitle}>
            Участники ({activity.participants.length})
          </Text>
          <Text style={styles.description}>
            Осталось мест: {Math.max(activity.spotsLeft, 0)} из {activity.maxParticipants}
          </Text>
        </View>

        <View style={styles.buttonsRow}>
          <View style={styles.buttonCol}>
            <PrimaryButton
              title={activity.myRole ? "Вы участник" : actionBusy ? "…" : "Присоединиться"}
              onPress={onJoin}
              disabled={!canJoin || actionBusy}
            />
          </View>
          <View style={styles.buttonCol}>
            <SecondaryButton
              title="Не показывать"
              onPress={() => router.back()}
            />
          </View>
        </View>

        {error ? (
          <View style={styles.errorWrap}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  headerRow: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  heroWrap: {
    height: 210,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: COLORS.divider,
  },
  titleRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  activityTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  sportIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  creatorRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 50,
  },
  creatorAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1.4,
    borderColor: COLORS.surface,
  },
  creatorAbout: {
    flex: 1,
    justifyContent: "center",
  },
  creatorInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flexWrap: "wrap",
  },
  creatorName: {
    fontSize: 15,
    fontWeight: "500",
    color: COLORS.textPrimary,
  },
  creatorRole: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.textPrimary,
  },
  bullet: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: COLORS.ink,
  },
  description: {
    marginTop: 12,
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 18,
    color: COLORS.textSecondary,
  },
  infoRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  infoIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  infoTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  infoInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  infoPrimary: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.textPrimary,
  },
  infoSecondary: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.textPrimary,
  },
  bulletSmall: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.ink,
  },
  participantsBlock: {
    marginTop: 12,
    gap: 5,
  },
  participantsTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  buttonsRow: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "stretch",
    gap: 12,
  },
  buttonCol: {
    flex: 1,
  },
  moreWrap: {
    marginTop: 22,
  },
  moreTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  emptyWrap: {
    paddingHorizontal: 20,
    paddingTop: 40,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.textSecondary,
  },
  errorWrap: {
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 107, 107, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.25)',
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
});
