import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
} from "react-native";

import { COLORS } from "../constants/colors";

type ButtonProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
};

export function PrimaryButton({
  title,
  onPress,
  disabled,
  loading,
  style,
}: ButtonProps) {
  const isDisabled = Boolean(disabled || loading);

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        styles.primary,
        pressed && !isDisabled ? styles.pressed : null,
        isDisabled ? styles.disabled : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={COLORS.buttonPrimaryText} />
      ) : (
        <Text style={[styles.title, styles.primaryTitle]}>{title}</Text>
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
}: ButtonProps) {
  const isDisabled = Boolean(disabled || loading);

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        styles.secondary,
        pressed && !isDisabled ? styles.pressed : null,
        isDisabled ? styles.disabled : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={COLORS.buttonSecondaryText} />
      ) : (
        <Text style={[styles.title, styles.secondaryTitle]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    borderRadius: 14,
    justifyContent: "center",
  },
  primary: {
    backgroundColor: COLORS.buttonPrimaryBg,
    padding: 17,
    width: "100%",
  },
  secondary: {
    backgroundColor: COLORS.buttonSecondaryBg,
    padding: 9,
    width: "100%",
  },
  title: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  primaryTitle: {
    color: COLORS.buttonPrimaryText,
  },
  secondaryTitle: {
    color: COLORS.buttonSecondaryText,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.6,
  },
});
