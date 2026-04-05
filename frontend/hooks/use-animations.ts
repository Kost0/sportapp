/**
 * useAnimatedPress — hook for press animations with spring physics.
 * Provides smooth scale and opacity animations on press.
 */

import { useCallback } from 'react';
import { type View, type StyleProp, type AnimatedStyle } from 'react-native';
import { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

type SpringConfig = {
  damping?: number;
  mass?: number;
  stiffness?: number;
  overshootClamping?: boolean;
};

const DEFAULT_SPRING: SpringConfig = {
  damping: 15,
  stiffness: 150,
  mass: 0.5,
};

type HapticType = 'selection' | 'light' | 'medium' | 'heavy';

export function useAnimatedPress(
  config: SpringConfig = DEFAULT_SPRING,
  haptic: HapticType = 'light'
) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle((): AnimatedStyle<View> => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  const triggerHaptic = useCallback(async () => {
    try {
      switch (haptic) {
        case 'selection':
          await Haptics.selectionAsync();
          break;
        case 'light':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'medium':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'heavy':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
      }
    } catch {
      // Silently fail on devices without haptics
    }
  }, [haptic]);

  const onPressIn = useCallback(() => {
    'worklet';
    scale.value = withSpring(0.96, config);
    opacity.value = withSpring(0.9, config);
    triggerHaptic();
  }, [config, opacity, scale, triggerHaptic]);

  const onPressOut = useCallback(() => {
    'worklet';
    scale.value = withSpring(1, config);
    opacity.value = withSpring(1, config);
  }, [config, opacity, scale]);

  return {
    animatedStyle,
    onPressIn,
    onPressOut,
  };
}

/**
 * AnimatedPressable — pressable with built-in spring animation.
 */

type AnimatedPressableProps = {
  children: React.ReactNode;
  onPress?: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
  style?: StyleProp<AnimatedStyle<View>>;
  disabled?: boolean;
};

export function AnimatedPressable({
  children,
  onPress,
  onPressIn: externalPressIn,
  onPressOut: externalPressOut,
  style,
  disabled,
}: AnimatedPressableProps) {
  const { animatedStyle, onPressIn, onPressOut } = useAnimatedPress();

  const handlePressIn = () => {
    onPressIn();
    externalPressIn?.();
  };

  const handlePressOut = () => {
    onPressOut();
    externalPressOut?.();
  };

  return (
    <Animated.View
      style={[animatedStyle, style]}
      onTouchStart={disabled ? undefined : handlePressIn}
      onTouchEnd={disabled ? undefined : handlePressOut}
      onTouchCancel={disabled ? undefined : handlePressOut}
    >
      {children}
    </Animated.View>
  );
}

/**
 * AnimatedCard — card with press animation.
 */

import { COLORS, getColor, type ColorScheme } from '@/constants/colors';
import { RADIUS } from '@/constants/radius';
import { SPACING } from '@/constants/spacing';

type AnimatedCardProps = {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<AnimatedStyle<View>>;
  colorScheme?: ColorScheme;
};

export function AnimatedCard({
  children,
  onPress,
  style,
  colorScheme = 'light',
}: AnimatedCardProps) {
  const colors = getColor(colorScheme);
  const { animatedStyle, onPressIn, onPressOut } = useAnimatedPress();

  const cardStyle: StyleProp<AnimatedStyle<View>> = [
    styles.card,
    { backgroundColor: colors.surface },
    animatedStyle,
    style,
  ];

  if (onPress) {
    return (
      <Animated.View
        style={cardStyle}
        onTouchStart={onPressIn}
        onTouchEnd={onPressOut}
        onTouchCancel={onPressOut}
        onTouchEndCapture={onPress}
      >
        {children}
      </Animated.View>
    );
  }

  return <Animated.View style={cardStyle}>{children}</Animated.View>;
}

const styles = {
  card: {
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    shadowColor: COLORS.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
};
