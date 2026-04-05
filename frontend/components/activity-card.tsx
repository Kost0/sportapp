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
import { COLORS, getColor, type ColorScheme } from "@/constants/colors";
import { TEXT_STYLES } from "@/constants/typography";
import { RADIUS } from "@/constants/radius";
import { SPACING } from "@/constants/spacing";
import { SportIcon } from "./sport-icon";
import { formatStartsAt } from "../utils/date-format";
import { StatusBadge } from "./status-badge";
import { PressableCard } from "./ui/card";

type Props = {
  activity: ActivityListItem;
  onPress: (activityId: string) => void;
  colorScheme?: ColorScheme;
};

export function ActivityCard({ activity, onPress, colorScheme }: Props) {
  const scheme = colorScheme ?? 'light';
  const colors = getColor(scheme);

  const startsAt = useMemo(
    () => formatStartsAt(activity.date).short,
    [activity.date]
  );

  const spotsText = useMemo(() => {
    if (activity.status !== "OPEN" && activity.spotsLeft === 0) return "мест нет";
    return `осталось ${Math.max(activity.spotsLeft, 0)} мест`;
  }, [activity.spotsLeft, activity.status]);

  const hasImage = activity.imageUrl && /^https?:\/\//.test(activity.imageUrl);

  return (
    <PressableCard onPress={() => onPress(activity.activityId)} padding="none">
      <View style={styles.inner}>
        {hasImage && (
          <Image source={{ uri: activity.imageUrl }} style={styles.cardImage} />
        )}
        {/* Top row: sport title + status badge */}
        <View style={[styles.topRow, hasImage && styles.topRowWithImage]}>
          <View style={styles.titleRow}>
            <Text numberOfLines={1} style={[TEXT_STYLES.h3, { color: colors.textPrimary, flexShrink: 1 }]}>
              {activity.sport}
            </Text>
            <View style={[styles.iconWrap, { backgroundColor: colors.ink }]}>
              <SportIcon sport={activity.sport} size={18} color={colors.surface} />
            </View>
          </View>
          <StatusBadge status={activity.status} colorScheme={scheme} />
        </View>

        {/* Middle row: creator + spots */}
        <View style={styles.middleRow}>
          <View style={styles.creatorRow}>
            <Image
              source={{ uri: `https://api.dicebear.com/7.x/identicon/png?seed=${activity.organizerId}` }}
              style={styles.avatar}
            />
            <Text numberOfLines={1} style={[TEXT_STYLES.bodySm, { color: colors.textPrimary, flexShrink: 1 }]}>
              Организатор
            </Text>
            <View style={[styles.bullet, { backgroundColor: colors.inkMuted }]} />
            <Text numberOfLines={1} style={[TEXT_STYLES.bodySm, { color: colors.textPrimary, flexShrink: 1 }]}>
              {startsAt}
            </Text>
          </View>

          <Text style={[TEXT_STYLES.labelSm, { color: colors.ink }]}>
            {spotsText}
          </Text>
        </View>

        {/* Bottom: title + address */}
        <Text numberOfLines={1} style={[TEXT_STYLES.label, { color: colors.textPrimary, marginTop: SPACING.sm }]}>
          {activity.title}
        </Text>
        <Text numberOfLines={1} style={[TEXT_STYLES.bodySm, { color: colors.textSecondary, marginTop: SPACING.xs }]}>
          {activity.address}
        </Text>
      </View>
    </PressableCard>
  );
}

const styles = StyleSheet.create({
  inner: {
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.md,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    minWidth: 0,
    flex: 1,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.full,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  middleRow: {
    marginTop: SPACING.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.sm,
  },
  creatorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    minWidth: 0,
    flex: 1,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    flexShrink: 0,
  },
  bullet: {
    width: 3,
    height: 3,
    borderRadius: RADIUS.full,
    flexShrink: 0,
  },
  cardImage: {
    width: '100%',
    height: 140,
    marginBottom: SPACING.sm,
  },
  topRowWithImage: {
    paddingTop: 0,
  },
});
