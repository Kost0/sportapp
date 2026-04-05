import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { COLORS, getColor, type ColorScheme } from "@/constants/colors";
import { TEXT_STYLES } from "@/constants/typography";
import { RADIUS } from "@/constants/radius";

import type { ActivityStatus } from "@/lib/api/activities";

type Props = {
  status: ActivityStatus;
  colorScheme?: ColorScheme;
};

export function StatusBadge({ status, colorScheme }: Props) {
  const scheme = colorScheme ?? 'light';
  const colors = getColor(scheme);

  const label =
    status === "OPEN"
      ? "Открыто"
      : status === "FULL"
        ? "Нет мест"
        : status === "COMPLETED"
          ? "Завершено"
          : "Отменено";
  const isDanger = status === "FULL" || status === "CANCELLED";

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: isDanger ? colors.badgeDangerBg : colors.badgeBg,
        },
      ]}
    >
      <Text
        style={[
          TEXT_STYLES.badge,
          {
            color: isDanger ? colors.badgeDangerText : colors.badgeText,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: RADIUS.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
});
