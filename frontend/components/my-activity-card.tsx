import React, { useMemo } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { COLORS, getColor, type ColorScheme } from "@/constants/colors";
import { TEXT_STYLES } from "@/constants/typography";
import { RADIUS } from "@/constants/radius";
import { SPACING } from "@/constants/spacing";
import { SportIcon } from "./sport-icon";
import { formatStartsAt } from "@/utils/date-format";
import type { MyActivityItem } from "@/lib/api/home";
import { PressableCard } from "./ui/card";

type Props = {
  activity: MyActivityItem;
  organizerName?: string;
  organizerAvatar?: string;
  distance?: string;
  onPress: (activityId: string) => void;
  colorScheme?: ColorScheme;
};

export function MyActivityCard({
  activity,
  organizerName,
  organizerAvatar,
  distance,
  onPress,
  colorScheme,
}: Props) {
  const scheme = colorScheme ?? 'light';
  const colors = getColor(scheme);

  const timeText = useMemo(
    () => formatStartsAt(activity.date).short,
    [activity.date]
  );

  return (
    <PressableCard onPress={() => onPress(activity.activityId)} padding="none">
      <View style={styles.inner}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text numberOfLines={1} style={[TEXT_STYLES.h3, { color: colors.textPrimary, flexShrink: 1 }]}>
              {activity.sport}
            </Text>
            <View style={[styles.iconWrap, { backgroundColor: colors.ink }]}>
              <SportIcon sport={activity.sport} size={18} color={colors.surface} />
            </View>
          </View>
          {distance ? (
            <Text style={[TEXT_STYLES.labelSm, { color: colors.ink }]}>{distance}</Text>
          ) : null}
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
          <Text numberOfLines={1} style={[TEXT_STYLES.bodySm, { color: colors.textPrimary, flexShrink: 1 }]}>
            {organizerName || "Организатор"}
          </Text>
          <View style={[styles.bullet, { backgroundColor: colors.inkMuted }]} />
          <Text numberOfLines={1} style={[TEXT_STYLES.bodySm, { color: colors.textPrimary, flexShrink: 1 }]}>
            {timeText}
          </Text>
        </View>
      </View>
    </PressableCard>
  );
}

const styles = StyleSheet.create({
  inner: {
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACING.sm,
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
  organizerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    minWidth: 0,
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
});
