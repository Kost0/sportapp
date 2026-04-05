import React, { useMemo } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { COLORS } from "@/constants/colors";
import { SportIcon } from "./sport-icon";
import { formatStartsAt } from "@/utils/date-format";
import type { MyActivityItem } from "@/lib/api/home";

type Props = {
  activity: MyActivityItem;
  organizerName?: string;
  organizerAvatar?: string;
  distance?: string;
  onPress: (activityId: string) => void;
};

export function MyActivityCard({
  activity,
  organizerName,
  organizerAvatar,
  distance,
  onPress,
}: Props) {
  const timeText = useMemo(
    () => formatStartsAt(activity.date).short,
    [activity.date]
  );

  return (
    <Pressable
      onPress={() => onPress(activity.activityId)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text numberOfLines={1} style={styles.sportTitle}>
            {activity.sport}
          </Text>
          <View style={styles.iconWrap}>
            <SportIcon sport={activity.sport} size={20} color={COLORS.surface} />
          </View>
        </View>
        {distance ? <Text style={styles.distance}>{distance}</Text> : null}
      </View>

      <View style={styles.organizerRow}>
        <Image
          source={{
            uri:
              organizerAvatar ||
              `https://api.dicebear.com/7.x/identicon/png?seed=${activity.activityId}`,
          }}
          style={styles.avatar}
        />
        <Text style={styles.organizerName}>{organizerName || "Организатор"}</Text>
        <View style={styles.bullet} />
        <Text numberOfLines={1} style={styles.timeText}>
          {timeText}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    paddingHorizontal: 15,
    paddingVertical: 12,
    shadowColor: "#0C1A4B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.996 }],
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sportTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textPrimary,
    maxWidth: 180,
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
  organizerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  avatar: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    borderWidth: 1.4,
    borderColor: COLORS.surface,
  },
  organizerName: {
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
});
