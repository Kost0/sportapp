import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { COLORS, getColor, type ColorScheme } from "@/constants/colors";
import { TEXT_STYLES } from "@/constants/typography";
import { RADIUS } from "@/constants/radius";
import { SPACING } from "@/constants/spacing";
import { shadowCard } from "@/constants/shadows";

type Props = {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  colorScheme?: ColorScheme;
};

export function SportCategoryCard({ icon, label, onPress, colorScheme }: Props) {
  const scheme = colorScheme ?? 'light';
  const colors = getColor(scheme);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
        },
        shadowCard(scheme),
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.iconContainer, { backgroundColor: colors.inkLight, borderRadius: RADIUS.md }]}>
        {icon}
      </View>
      <Text style={[TEXT_STYLES.label, { color: colors.textPrimary }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 110,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.base,
    paddingHorizontal: SPACING.sm,
    alignItems: "center",
    gap: SPACING.sm,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.97 }],
  },
  iconContainer: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
});
