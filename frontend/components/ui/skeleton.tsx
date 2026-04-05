/**
 * Skeleton — placeholder for loading states.
 * Provides shimmer animation to indicate content is loading.
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  type ViewStyle,
} from 'react-native';

import { COLORS } from '@/constants/colors';
import { RADIUS } from '@/constants/radius';

type SkeletonProps = {
  /** Height of the skeleton bar */
  height?: number;
  /** Width - number for fixed, string for percentage */
  width?: number | string;
  /** Border radius */
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  /** Optional style overrides */
  style?: ViewStyle;
  /** Show animated shimmer (default: true) */
  animated?: boolean;
};

const RADIUS_MAP = {
  none: 0,
  sm: RADIUS.sm,
  md: RADIUS.md,
  lg: RADIUS.lg,
  full: 9999,
};

export function Skeleton({
  height = 20,
  width = '100%',
  rounded = 'md',
  style,
  animated = true,
}: SkeletonProps) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) return;

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1200,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [shimmerAnim, animated]);

  const opacity = animated
    ? shimmerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0.7],
      })
    : 0.5;

  return (
    <Animated.View
      style={[
        styles.base,
        {
          height,
          width,
          borderRadius: RADIUS_MAP[rounded],
          opacity,
        },
        style,
      ]}
    />
  );
}

/**
 * SkeletonBox — predefined skeleton shapes for common layouts.
 */

type SkeletonBoxProps = {
  /** Layout variant */
  variant?: 'card' | 'list-item' | 'avatar' | 'text' | 'chart';
  /** Optional style overrides */
  style?: ViewStyle;
};

export function SkeletonBox({ variant = 'card', style }: SkeletonBoxProps) {
  switch (variant) {
    case 'card':
      return (
        <Animated.View style={[styles.cardContainer, style]}>
          <Skeleton height={24} width="60%" rounded="sm" />
          <Skeleton height={16} width="40%" rounded="sm" style={styles.mtSm} />
          <Skeleton height={60} width="100%" rounded="lg" style={styles.mtMd} />
        </Animated.View>
      );

    case 'list-item':
      return (
        <Animated.View style={[styles.listItemContainer, style]}>
          <Skeleton width={48} height={48} rounded="full" />
          <Animated.View style={styles.listItemContent}>
            <Skeleton height={16} width="70%" rounded="sm" />
            <Skeleton height={12} width="40%" rounded="sm" style={styles.mtXs} />
          </Animated.View>
        </Animated.View>
      );

    case 'avatar':
      return <Skeleton width={64} height={64} rounded="full" />;

    case 'text':
      return (
        <Animated.View style={[styles.textContainer, style]}>
          <Skeleton height={16} width="100%" rounded="sm" />
          <Skeleton height={16} width="80%" rounded="sm" style={styles.mtXs} />
          <Skeleton height={16} width="60%" rounded="sm" style={styles.mtXs} />
        </Animated.View>
      );

    case 'chart':
      return (
        <Animated.View style={[styles.chartContainer, style]}>
          <Skeleton height={120} width={40} rounded="md" />
          <Skeleton height={80} width={40} rounded="md" style={styles.mlSm} />
          <Skeleton height={100} width={40} rounded="md" style={styles.mlSm} />
          <Skeleton height={60} width={40} rounded="md" style={styles.mlSm} />
        </Animated.View>
      );

    default:
      return <Skeleton height={20} width="100%" style={style} />;
  }
}

/**
 * SkeletonGroup — multiple skeletons for loading screens.
 */

type SkeletonGroupProps = {
  /** Number of skeleton items to show */
  count?: number;
  /** Variant for each skeleton */
  variant?: 'card' | 'list-item' | 'avatar' | 'text';
  /** Gap between items */
  gap?: number;
};

export function SkeletonGroup({
  count = 3,
  variant = 'list-item',
  gap = 16,
}: SkeletonGroupProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonBox
          key={index}
          variant={variant}
          style={index > 0 ? { marginTop: gap } : undefined}
        />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: COLORS.divider,
  },
  cardContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 16,
  },
  listItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 12,
  },
  listItemContent: {
    flex: 1,
    marginLeft: 12,
  },
  textContainer: {
    gap: 4,
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 140,
    padding: 16,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
  },
  mtSm: {
    marginTop: 8,
  },
  mtXs: {
    marginTop: 4,
  },
  mtMd: {
    marginTop: 12,
  },
  mlSm: {
    marginLeft: 8,
  },
});
