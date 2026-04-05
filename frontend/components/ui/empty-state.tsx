/**
 * EmptyState — display when there's no content to show.
 * Provides icon, title, description, and optional action button.
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

type IconName = keyof typeof MaterialIcons.glyphMap;

type EmptyStateProps = {
  /** Icon name from MaterialIcons */
  icon?: IconName;
  /** Custom emoji or text icon (alternative to icon) */
  emoji?: string;
  /** Title text */
  title: string;
  /** Optional description text */
  description?: string;
  /** Optional action button */
  action?: {
    label: string;
    onPress: () => void;
  };
  /** Color scheme */
  colorScheme?: ColorScheme;
};

const DEFAULT_ICONS: Record<string, IconName> = {
  activities: 'directions-run',
  courts: 'sports-tennis',
  profile: 'person',
  default: 'inbox',
};

export function EmptyState({
  icon,
  emoji,
  title,
  description,
  action,
  colorScheme,
}: EmptyStateProps) {
  const scheme = colorScheme ?? 'light';
  const colors = getColor(scheme);

  const displayIcon = icon || DEFAULT_ICONS.default;
  const iconSize = 64;

  return (
    <View style={styles.container}>
      {/* Icon */}
      <View style={[styles.iconWrap, { backgroundColor: colors.inkLight }]}>
        {emoji ? (
          <Text style={styles.emoji}>{emoji}</Text>
        ) : (
          <MaterialIcons
            name={displayIcon}
            size={iconSize}
            color={colors.inkMuted}
          />
        )}
      </View>

      {/* Title */}
      <Text
        style={[
          TEXT_STYLES.h3,
          styles.title,
          { color: colors.textPrimary },
        ]}
      >
        {title}
      </Text>

      {/* Description */}
      {description && (
        <Text
          style={[
            TEXT_STYLES.body,
            styles.description,
            { color: colors.textSecondary },
          ]}
        >
          {description}
        </Text>
      )}

      {/* Action Button */}
      {action && (
        <Pressable
          style={[styles.actionButton, { backgroundColor: colors.ink }]}
          onPress={action.onPress}
        >
          <Text style={[TEXT_STYLES.label, { color: colors.textInverse }]}>
            {action.label}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

/**
 * EmptyStateCard — EmptyState wrapped in a card container.
 */

type EmptyStateCardProps = EmptyStateProps & {
  /** Optional card padding override */
  padding?: 'none' | 'sm' | 'md' | 'lg';
};

export function EmptyStateCard({
  padding = 'lg',
  ...props
}: EmptyStateCardProps) {
  const paddingStyle = padding === 'none'
    ? {}
    : padding === 'sm'
      ? styles.paddingSm
      : padding === 'lg'
        ? styles.paddingLg
        : styles.paddingMd;

  return (
    <View style={[styles.card, paddingStyle]}>
      <EmptyState {...props} />
    </View>
  );
}

/**
 * InlineEmptyState — smaller version for use within lists.
 */

type InlineEmptyStateProps = {
  icon?: IconName;
  emoji?: string;
  text: string;
  colorScheme?: ColorScheme;
};

export function InlineEmptyState({
  icon,
  emoji,
  text,
  colorScheme,
}: InlineEmptyStateProps) {
  const scheme = colorScheme ?? 'light';
  const colors = getColor(scheme);

  return (
    <View style={styles.inlineContainer}>
      {emoji ? (
        <Text style={styles.inlineEmoji}>{emoji}</Text>
      ) : icon ? (
        <MaterialIcons
          name={icon}
          size={20}
          color={colors.inkMuted}
          style={styles.inlineIcon}
        />
      ) : null}
      <Text style={[TEXT_STYLES.bodySm, { color: colors.textSecondary }]}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING['3xl'],
    paddingHorizontal: SPACING.xl,
  },
  iconWrap: {
    width: 120,
    height: 120,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  emoji: {
    fontSize: 48,
  },
  title: {
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  description: {
    textAlign: 'center',
    maxWidth: 280,
  },
  actionButton: {
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.full,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    marginHorizontal: SPACING.base,
  },
  paddingSm: {
    padding: SPACING.sm,
  },
  paddingMd: {
    padding: SPACING.base,
  },
  paddingLg: {
    padding: SPACING.xl,
  },
  inlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl,
    gap: SPACING.sm,
  },
  inlineIcon: {
    marginRight: SPACING.xs,
  },
  inlineEmoji: {
    fontSize: 18,
    marginRight: SPACING.xs,
  },
});
