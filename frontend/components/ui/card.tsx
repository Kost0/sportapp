/**
 * Card — universal card component with consistent shadow, radius, and padding.
 * Replaces duplicated card styles across activity-card, my-activity-card,
 * sport-category-card, and profile-card.
 */

import React from 'react';
import {
  Platform,
  Pressable,
  type PressableProps,
  type StyleProp,
  StyleSheet,
  View,
  type ViewProps,
  type ViewStyle,
} from 'react-native';

import { COLORS, getColor, type ColorScheme } from '@/constants/colors';
import { RADIUS } from '@/constants/radius';
import { shadowCard as getCardShadow } from '@/constants/shadows';

type CardVariant = 'default' | 'elevated' | 'flat';

type CardBaseProps = {
  variant?: CardVariant;
  contentStyle?: StyleProp<ViewStyle>;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  colorScheme?: ColorScheme;
  style?: StyleProp<ViewStyle>;
};

type CardProps = CardBaseProps & {
  children: React.ReactNode;
};

export function Card({
  variant = 'default',
  contentStyle,
  padding = 'md',
  colorScheme,
  style,
  children,
  ...rest
}: CardProps & Omit<ViewProps, 'style'>) {
  const scheme = colorScheme ?? 'light';
  const colors = getColor(scheme);

  const paddingStyle = padding === 'none'
    ? {}
    : padding === 'sm'
      ? styles.paddingSm
      : padding === 'lg'
        ? styles.paddingLg
        : styles.paddingMd;

  const shadow = variant === 'flat'
    ? {}
    : variant === 'elevated'
      ? Platform.OS === 'web'
        ? { boxShadow: '0px 8px 32px -4px rgba(12, 26, 75, 0.12), 0px 2px 8px 0px rgba(12, 26, 75, 0.06)' }
        : { shadowColor: '#0C1A4B', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.10, shadowRadius: 16, elevation: 8 }
      : getCardShadow(scheme);

  return (
    <View
      style={[
        styles.outer,
        {
          backgroundColor: variant === 'flat' ? 'transparent' : colors.surface,
          borderRadius: RADIUS.lg,
        },
        shadow,
        style,
      ]}
      {...rest}
    >
      <View style={[paddingStyle, contentStyle]}>{children}</View>
    </View>
  );
}

type PressableCardProps = CardBaseProps & {
  onPress: () => void;
  children: React.ReactNode;
};

export function PressableCard({
  variant = 'default',
  contentStyle,
  padding = 'md',
  colorScheme,
  style,
  onPress,
  children,
  ...rest
}: PressableCardProps & Omit<PressableProps, 'style'>) {
  const scheme = colorScheme ?? 'light';
  const colors = getColor(scheme);

  const paddingStyle = padding === 'none'
    ? {}
    : padding === 'sm'
      ? styles.paddingSm
      : padding === 'lg'
        ? styles.paddingLg
        : styles.paddingMd;

  const shadow = variant === 'flat'
    ? {}
    : variant === 'elevated'
      ? Platform.OS === 'web'
        ? { boxShadow: '0px 8px 32px -4px rgba(12, 26, 75, 0.12), 0px 2px 8px 0px rgba(12, 26, 75, 0.06)' }
        : { shadowColor: '#0C1A4B', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.10, shadowRadius: 16, elevation: 8 }
      : getCardShadow(scheme);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.outer,
        {
          backgroundColor: variant === 'flat' ? 'transparent' : colors.surface,
          borderRadius: RADIUS.lg,
        },
        shadow,
        pressed && styles.pressed,
        style,
      ]}
      {...rest}
    >
      <View style={[paddingStyle, contentStyle]}>{children}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outer: {
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.996 }],
  },
  paddingSm: {
    padding: 8,
  },
  paddingMd: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  paddingLg: {
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
});
