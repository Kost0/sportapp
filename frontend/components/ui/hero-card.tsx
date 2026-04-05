/**
 * HeroCard — prominent call-to-action card for home screen.
 * Features gradient background, main message, and action button.
 */

import React from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, getColor, type ColorScheme } from '@/constants/colors';
import { TEXT_STYLES } from '@/constants/typography';
import { SPACING } from '@/constants/spacing';
import { RADIUS } from '@/constants/radius';

type HeroCardProps = {
  /** Main title text */
  title: string;
  /** Subtitle/description text */
  subtitle?: string;
  /** Emoji icon */
  emoji?: string;
  /** Icon from MaterialIcons (alternative to emoji) */
  icon?: keyof typeof MaterialIcons.glyphMap;
  /** Action button label */
  actionLabel?: string;
  /** Action button callback */
  onAction?: () => void;
  /** Secondary action (text link) */
  secondaryAction?: {
    label: string;
    onPress: () => void;
  };
  /** Gradient colors [start, end] */
  gradient?: [string, string];
  /** Color scheme */
  colorScheme?: ColorScheme;
};

export function HeroCard({
  title,
  subtitle,
  emoji,
  icon,
  actionLabel,
  onAction,
  secondaryAction,
  gradient = ['#29313E', '#1A1D27'],
  colorScheme,
}: HeroCardProps) {
  const scheme = colorScheme ?? 'light';
  const colors = getColor(scheme);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Decorative elements */}
        <View style={styles.decorCircle1} />
        <View style={styles.decorCircle2} />

        {/* Content */}
        <View style={styles.content}>
          {/* Icon */}
          <View style={styles.iconWrap}>
            {emoji ? (
              <Text style={styles.emoji}>{emoji}</Text>
            ) : icon ? (
              <MaterialIcons
                name={icon}
                size={40}
                color={COLORS.surface}
              />
            ) : null}
          </View>

          {/* Text */}
          <View style={styles.textContent}>
            <Text style={[TEXT_STYLES.h2, styles.title]}>
              {title}
            </Text>
            {subtitle && (
              <Text style={[TEXT_STYLES.body, styles.subtitle]}>
                {subtitle}
              </Text>
            )}
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            {actionLabel && onAction && (
              <Pressable
                style={styles.actionButton}
                onPress={onAction}
              >
                <Text style={[TEXT_STYLES.label, styles.actionText]}>
                  {actionLabel}
                </Text>
                <MaterialIcons
                  name="arrow-forward"
                  size={18}
                  color={COLORS.ink}
                />
              </Pressable>
            )}
            {secondaryAction && (
              <Pressable
                style={styles.secondaryButton}
                onPress={secondaryAction.onPress}
              >
                <Text style={[TEXT_STYLES.label, styles.secondaryText]}>
                  {secondaryAction.label}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

/**
 * HeroCardCompact — smaller hero for inline use.
 */

type HeroCardCompactProps = {
  title: string;
  subtitle?: string;
  emoji?: string;
  icon?: keyof typeof MaterialIcons.glyphMap;
  onPress?: () => void;
  colorScheme?: ColorScheme;
};

export function HeroCardCompact({
  title,
  subtitle,
  emoji,
  icon,
  onPress,
  colorScheme,
}: HeroCardCompactProps) {
  const scheme = colorScheme ?? 'light';
  const colors = getColor(scheme);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.compactContainer,
        { backgroundColor: colors.ink },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.compactContent}>
        {emoji ? (
          <Text style={styles.compactEmoji}>{emoji}</Text>
        ) : icon ? (
          <MaterialIcons
            name={icon}
            size={28}
            color={COLORS.surface}
          />
        ) : null}
        <View style={styles.compactText}>
          <Text style={[TEXT_STYLES.label, styles.compactTitle]}>
            {title}
          </Text>
          {subtitle && (
            <Text style={[TEXT_STYLES.bodySm, styles.compactSubtitle]}>
              {subtitle}
            </Text>
          )}
        </View>
        <MaterialIcons
          name="chevron-right"
          size={24}
          color={COLORS.surface}
        />
      </View>
    </Pressable>
  );
}

/**
 * SuggestionCard — personalized suggestion for the user.
 */

type SuggestionCardProps = {
  /** Sport type */
  sport: string;
  /** Suggested action */
  suggestion: string;
  /** Emoji for the sport */
  emoji?: string;
  /** Button label */
  buttonLabel?: string;
  /** Button callback */
  onButtonPress?: () => void;
  /** Dismiss callback */
  onDismiss?: () => void;
};

export function SuggestionCard({
  sport,
  suggestion,
  emoji,
  buttonLabel = 'Откликнуться',
  onButtonPress,
  onDismiss,
}: SuggestionCardProps) {
  const colors = getColor();

  return (
    <View style={[styles.suggestionContainer, { backgroundColor: colors.successBg }]}>
      {/* Header */}
      <View style={styles.suggestionHeader}>
        <View style={styles.suggestionBadge}>
          {emoji && <Text style={styles.suggestionEmoji}>{emoji}</Text>}
          <Text style={[TEXT_STYLES.labelSm, { color: colors.success }]}>
            {sport}
          </Text>
        </View>
        {onDismiss && (
          <Pressable onPress={onDismiss} hitSlop={8}>
            <MaterialIcons name="close" size={18} color={colors.textSecondary} />
          </Pressable>
        )}
      </View>

      {/* Content */}
      <Text style={[TEXT_STYLES.body, styles.suggestionText, { color: colors.textPrimary }]}>
        {suggestion}
      </Text>

      {/* Action */}
      {onButtonPress && (
        <Pressable
          style={[styles.suggestionButton, { backgroundColor: colors.success }]}
          onPress={onButtonPress}
        >
          <Text style={[TEXT_STYLES.label, { color: COLORS.surface }]}>
            {buttonLabel}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: SPACING.xl,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
  },
  gradient: {
    minHeight: 180,
    padding: SPACING.xl,
  },
  decorCircle1: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  decorCircle2: {
    position: 'absolute',
    bottom: -20,
    left: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
  },
  iconWrap: {
    marginBottom: SPACING.base,
  },
  emoji: {
    fontSize: 48,
  },
  textContent: {
    marginBottom: SPACING.base,
  },
  title: {
    color: COLORS.surface,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.75)',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.base,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    gap: SPACING.xs,
  },
  actionText: {
    color: COLORS.ink,
  },
  secondaryButton: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  secondaryText: {
    color: 'rgba(255, 255, 255, 0.85)',
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  // Compact
  compactContainer: {
    marginHorizontal: SPACING.xl,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
  },
  compactContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactEmoji: {
    fontSize: 28,
    marginRight: SPACING.sm,
  },
  compactText: {
    flex: 1,
  },
  compactTitle: {
    color: COLORS.surface,
  },
  compactSubtitle: {
    color: 'rgba(255, 255, 255, 0.75)',
  },
  // Suggestion
  suggestionContainer: {
    marginHorizontal: SPACING.xl,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  suggestionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  suggestionEmoji: {
    fontSize: 16,
  },
  suggestionText: {
    marginBottom: SPACING.base,
  },
  suggestionButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
  },
});
