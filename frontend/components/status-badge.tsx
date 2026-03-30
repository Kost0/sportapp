import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { COLORS } from "../constants/colors";

import type { ActivityStatus } from "@/lib/api/activities";

type Props = {
  status: ActivityStatus;
};

export function StatusBadge({ status }: Props) {
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
    <View style={[styles.base, isDanger ? styles.danger : styles.ok]}>
      <Text style={[styles.text, isDanger ? styles.dangerText : styles.okText]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  ok: {
    backgroundColor: COLORS.badgeBg,
  },
  danger: {
    backgroundColor: COLORS.badgeDangerBg,
  },
  text: {
    fontSize: 12,
    fontWeight: "700",
  },
  okText: {
    color: COLORS.badgeText,
  },
  dangerText: {
    color: COLORS.badgeDangerText,
  },
});
