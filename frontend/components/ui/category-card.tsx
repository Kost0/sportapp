/**
 * CategoryCard — interactive category selection card.
 * Used on home screen for quick access to sport categories.
 */

import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, getColor, type ColorScheme } from '@/constants/colors';
import { TEXT_STYLES } from '@/constants/typography';
import { SPACING } from '@/constants/spacing';
import { RADIUS } from '@/constants/radius';

type CategoryIcon = keyof typeof MaterialIcons.glyphMap;

export type CategoryData = {
  key: string;
  label: string;
  icon: CategoryIcon;
  /** Optional emoji fallback */
  emoji?: string;
  /** Background color override */
  bgColor?: string;
  /** Icon color override */
  iconColor?: string;
};

type CategoryCardProps = {
  category: CategoryData;
  /** Callback when pressed */
  onPress: (key: string) => void;
  /** Card size variant */
  size?: 'small' | 'medium' | 'large';
  /** Show label below icon */
  showLabel?: boolean;
  /** Color scheme */
  colorScheme?: ColorScheme;
};

const DEFAULT_CATEGORIES: CategoryData[] = [
  { key: 'running', label: 'Бег', icon: 'directions-run', emoji: '🏃' },
  { key: 'cycling', label: 'Велосипед', icon: 'directions-bike', emoji: '🚴' },
  { key: 'football', label: 'Футбол', icon: 'sports-soccer', emoji: '⚽' },
  { key: 'basketball', label: 'Баскетбол', icon: 'sports-basketball', emoji: '🏀' },
  { key: 'tennis', label: 'Теннис', icon: 'sports-tennis', emoji: '🎾' },
  { key: 'swimming', label: 'Плавание', icon: 'pool', emoji: '🏊' },
  { key: 'hiking', label: 'Походы', icon: 'terrain', emoji: '🥾' },
  { key: 'climbing', label: 'Скалолазание', icon: 'terrain', emoji: '🧗' },
];

export function CategoryCard({
  category,
  onPress,
  size = 'medium',
  showLabel = true,
  colorScheme,
}: CategoryCardProps) {
  const scheme = colorScheme ?? 'light';
  const colors = getColor(scheme);

  const sizeStyles = {
    small: {
      container: styles.containerSmall,
      iconWrap: styles.iconWrapSmall,
      icon: 24,
      label: TEXT_STYLES.labelSm,
    },
    medium: {
      container: styles.containerMedium,
      iconWrap: styles.iconWrapMedium,
      icon: 32,
      label: TEXT_STYLES.label,
    },
    large: {
      container: styles.containerLarge,
      iconWrap: styles.iconWrapLarge,
      icon: 40,
      label: TEXT_STYLES.body,
    },
  };

  const variant = sizeStyles[size];
  const bgColor = category.bgColor || colors.inkLight;
  const iconColor = category.iconColor || colors.ink;

  return (
    <Pressable
      onPress={() => onPress(category.key)}
      style={({ pressed }) => [
        variant.container,
        { backgroundColor: bgColor },
        pressed && styles.pressed,
      ]}
    >
      <View style={[variant.iconWrap, { backgroundColor: iconColor }]}>
        {category.emoji ? (
          <Text style={[styles.emoji, { fontSize: variant.icon }]}>
            {category.emoji}
          </Text>
        ) : (
          <MaterialIcons
            name={category.icon}
            size={variant.icon}
            color={COLORS.surface}
          />
        )}
      </View>
      {showLabel && (
        <Text style={[variant.label, styles.label, { color: colors.textPrimary }]}>
          {category.label}
        </Text>
      )}
    </Pressable>
  );
}

/**
 * CategoryGrid — grid of category cards.
 */

type CategoryGridProps = {
  categories?: CategoryData[];
  onPress: (key: string) => void;
  /** Number of columns */
  columns?: number;
  /** Card size */
  size?: 'small' | 'medium' | 'large';
  /** Gap between cards */
  gap?: number;
};

export function CategoryGrid({
  categories = DEFAULT_CATEGORIES,
  onPress,
  columns = 4,
  size = 'medium',
  gap = 12,
}: CategoryGridProps) {
  const colors = getColor();

  return (
    <View style={[styles.grid, { gap }]}>
      {categories.map((category, index) => (
        <CategoryCard
          key={category.key}
          category={category}
          onPress={onPress}
          size={size}
        />
      ))}
    </View>
  );
}

/**
 * CategoryRow — horizontal scrollable row of categories.
 */

type CategoryRowProps = {
  categories?: CategoryData[];
  onPress: (key: string) => void;
  /** Card size */
  size?: 'small' | 'medium' | 'large';
  /** Show see all button */
  showSeeAll?: boolean;
  onSeeAll?: () => void;
};

export function CategoryRow({
  categories = DEFAULT_CATEGORIES,
  onPress,
  size = 'medium',
  showSeeAll = false,
  onSeeAll,
}: CategoryRowProps) {
  const colors = getColor();

  return (
    <View style={styles.rowContainer}>
      <View style={styles.rowHeader}>
        <Text style={[TEXT_STYLES.h3, { color: colors.textPrimary }]}>
         Категории
        </Text>
        {showSeeAll && (
          <Pressable onPress={onSeeAll} hitSlop={8}>
            <Text style={[TEXT_STYLES.label, { color: colors.textSecondary }]}>
              Все →
            </Text>
          </Pressable>
        )}
      </View>
      <View style={styles.rowScroll}>
        {categories.map((category) => (
          <CategoryCard
            key={category.key}
            category={category}
            onPress={onPress}
            size={size}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Container variants
  containerSmall: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    borderRadius: RADIUS.lg,
    minWidth: 72,
  },
  containerMedium: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.base,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.lg,
    minWidth: 88,
  },
  containerLarge: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.base,
    borderRadius: RADIUS.xl,
    minWidth: 100,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
  // Icon wrap
  iconWrapSmall: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  iconWrapMedium: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  iconWrapLarge: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  emoji: {
    lineHeight: undefined,
  },
  label: {
    textAlign: 'center',
  },
  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  // Row
  rowContainer: {
    gap: SPACING.sm,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
  },
  rowScroll: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.xs,
    overflow: 'scroll',
  },
});
