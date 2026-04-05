import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
} from "react-native";

import { COLORS, getColor, type ColorScheme } from "@/constants/colors";
import { TEXT_STYLES } from "@/constants/typography";
import { RADIUS } from "@/constants/radius";

type ButtonProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  colorScheme?: ColorScheme;
};

export function PrimaryButton({
  title,
  onPress,
  disabled,
  loading,
  style,
  colorScheme,
}: ButtonProps) {
  const scheme = colorScheme ?? 'light';
  const colors = getColor(scheme);
  const isDisabled = Boolean(disabled || loading);

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        styles.primary,
        {
          backgroundColor: isDisabled ? colors.inkMuted : colors.buttonPrimaryBg,
        },
        pressed && !isDisabled ? styles.pressed : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.buttonPrimaryText} />
      ) : (
        <Text style={[TEXT_STYLES.buttonPrimary, { color: colors.buttonPrimaryText }]}>{title}</Text>
      )}
    </Pressable>
  );
}

export function SecondaryButton({
  title,
  onPress,
  disabled,
  loading,
  style,
  colorScheme,
}: ButtonProps) {
  const scheme = colorScheme ?? 'light';
  const colors = getColor(scheme);
  const isDisabled = Boolean(disabled || loading);

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        styles.secondary,
        {
          backgroundColor: isDisabled ? colors.inkLight : colors.buttonSecondaryBg,
          borderColor: colors.buttonSecondaryBorder,
        },
        pressed && !isDisabled ? styles.pressed : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.buttonSecondaryText} />
      ) : (
        <Text style={[TEXT_STYLES.buttonSecondary, { color: colors.buttonSecondaryText }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    borderRadius: RADIUS.md,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: 'transparent',
  },
  primary: {
    paddingVertical: 14,
    width: "100%",
    borderWidth: 0,
  },
  secondary: {
    paddingVertical: 12,
    width: "100%",
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
});
