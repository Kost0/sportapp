import React, { useMemo } from "react";
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type { ActivityListItem } from "@/lib/api/activities";
import { COLORS } from "../constants/colors";
import { SportIcon } from "./sport-icon";
import { formatStartsAt } from "../utils/date-format";
import { StatusBadge } from "./status-badge";

type Props = {
  activity: ActivityListItem;
  onPress: (activityId: string) => void;
};

export function ActivityCard({ activity, onPress }: Props) {
  const startsAt = useMemo(
    () => formatStartsAt(activity.date).short,
    [activity.date]
  );

  const spotsText = useMemo(() => {
    if (activity.status !== "OPEN" && activity.spotsLeft === 0) return "мест нет";
    return `осталось ${Math.max(activity.spotsLeft, 0)} мест`;
  }, [activity.spotsLeft, activity.status]);

  return (
    <Pressable
      onPress={() => onPress(activity.activityId)}
      style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
    >
      <View style={styles.topRow}>
        <View style={styles.titleRow}>
          <Text numberOfLines={1} style={styles.sportTitle}>
            {activity.sport}
          </Text>
          <View style={styles.iconWrap}>
            <SportIcon sport={activity.sport} size={20} color={COLORS.surface} />
          </View>
        </View>
        <StatusBadge status={activity.status} />
      </View>

      <View style={styles.middleRow}>
        <View style={styles.creatorRow}>
          <Image
            source={{ uri: `https://api.dicebear.com/7.x/identicon/png?seed=${activity.organizerId}` }}
            style={styles.avatar}
          />
          <Text style={styles.creatorName}>Организатор</Text>
          <View style={styles.bullet} />
          <Text numberOfLines={1} style={styles.timeText}>
            {startsAt}
          </Text>
        </View>

        <Text style={styles.spots}>{spotsText}</Text>
      </View>

      <Text numberOfLines={1} style={styles.subtitle}>
        {activity.title}
      </Text>
      <Text numberOfLines={1} style={styles.address}>
        {activity.address}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    paddingHorizontal: 15,
    paddingVertical: 12,
    ...Platform.select({
      web: {
        // Matches the Figma shadow more closely on web.
        boxShadow:
          "0px 4px 20px -2px rgba(50, 50, 71, 0.04), 0px 0px 5px 0px rgba(12, 26, 75, 0.08)",
      },
      default: {
        shadowColor: "#0C1A4B",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 3,
      },
    }),
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.996 }],
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
  },
  sportTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textPrimary,
    maxWidth: 220,
  },
  iconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  distance: {
    fontSize: 10,
    fontWeight: "500",
    color: COLORS.ink,
  },
  middleRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  creatorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
    flex: 1,
  },
  avatar: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    borderWidth: 1.4,
    borderColor: COLORS.surface,
  },
  creatorName: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.textPrimary,
  },
  bullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.ink,
  },
  timeText: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.textPrimary,
    flexShrink: 1,
  },
  spots: {
    fontSize: 10,
    fontWeight: "500",
    color: COLORS.ink,
  },
  spotsDanger: {
    color: COLORS.danger,
  },
  subtitle: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  address: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.textSecondary,
  },
});
