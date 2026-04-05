/**
 * useHaptics — hook for consistent haptic feedback across the app.
 * Provides various haptic patterns for different interactions.
 */

import { useCallback } from 'react';
import * as Haptics from 'expo-haptics';

type HapticType = 
  | 'selection'     // Light tap for selections
  | 'impact-light'  // Light impact
  | 'impact-medium' // Medium impact
  | 'impact-heavy'  // Heavy impact
  | 'success'       // Success feedback (double tap)
  | 'warning'       // Warning feedback
  | 'error'         // Error feedback
  | 'notification'; // Notification type

export function useHaptics() {
  const trigger = useCallback(async (type: HapticType = 'selection') => {
    try {
      switch (type) {
        case 'selection':
          await Haptics.selectionAsync();
          break;
        case 'impact-light':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'impact-medium':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'impact-heavy':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
        case 'success':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case 'warning':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;
        case 'error':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
        case 'notification':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        default:
          await Haptics.selectionAsync();
      }
    } catch {
      // Silently fail - haptics not supported on all devices
    }
  }, []);

  const selection = useCallback(() => trigger('selection'), [trigger]);
  const light = useCallback(() => trigger('impact-light'), [trigger]);
  const medium = useCallback(() => trigger('impact-medium'), [trigger]);
  const heavy = useCallback(() => trigger('impact-heavy'), [trigger]);
  const success = useCallback(() => trigger('success'), [trigger]);
  const warning = useCallback(() => trigger('warning'), [trigger]);
  const error = useCallback(() => trigger('error'), [trigger]);

  return {
    trigger,
    selection,
    light,
    medium,
    heavy,
    success,
    warning,
    error,
  };
}

/**
 * withHaptics — HOC to add haptic feedback to pressable components.
 */

import { Pressable, type PressableProps } from 'react-native';

type HapticPressableProps = Omit<PressableProps, 'onPress'> & {
  onPress: () => void;
  hapticType?: HapticType;
};

export function withHaptics<P extends HapticPressableProps>(
  Component: React.ComponentType<P>
) {
  return function HapticComponent(props: P) {
    const { onPress, hapticType = 'selection', ...rest } = props;
    const haptics = useHaptics();

    const handlePress = () => {
      haptics.trigger(hapticType);
      onPress();
    };

    return <Component {...rest} onPress={handlePress} />;
  };
}

/**
 * HapticButton — button with built-in haptic feedback.
 */

import { PrimaryButton as BasePrimaryButton, SecondaryButton as BaseSecondaryButton } from '@/components/ui-buttons';
import type { ViewStyle } from 'react-native';

type BaseButtonProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
};

export function HapticPrimaryButton({ onPress, ...props }: BaseButtonProps) {
  const haptics = useHaptics();
  
  return (
    <BasePrimaryButton
      {...props}
      onPress={() => {
        haptics.medium();
        onPress();
      }}
    />
  );
}

export function HapticSecondaryButton({ onPress, ...props }: BaseButtonProps) {
  const haptics = useHaptics();
  
  return (
    <BaseSecondaryButton
      {...props}
      onPress={() => {
        haptics.light();
        onPress();
      }}
    />
  );
}
