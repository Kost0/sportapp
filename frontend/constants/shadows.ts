/**
 * Shadow design tokens.
 * Platform-aware: web uses boxShadow, native uses shadow* properties.
 */

import { Platform, type ViewStyle } from 'react-native';
import { getColor, type ColorScheme } from './colors';

type ShadowStyle = Pick<
  ViewStyle,
  'shadowColor' | 'shadowOffset' | 'shadowOpacity' | 'shadowRadius' | 'elevation' | 'boxShadow'
>;

/**
 * Card shadow — subtle, used on activity cards, profile cards, etc.
 */
export function shadowCard(scheme: ColorScheme = 'light'): ShadowStyle {
  const color = getColor(scheme).shadowCard;
  if (Platform.OS === 'web') {
    return {
      boxShadow: '0px 2px 12px -2px rgba(12, 26, 75, 0.06), 0px 0px 4px 0px rgba(12, 26, 75, 0.04)',
    };
  }
  return {
    shadowColor: '#0C1A4B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  };
}

/**
 * Elevated shadow — stronger, used on modals, dropdowns, FAB.
 */
export function shadowElevated(scheme: ColorScheme = 'light'): ShadowStyle {
  if (Platform.OS === 'web') {
    return {
      boxShadow: '0px 8px 32px -4px rgba(12, 26, 75, 0.12), 0px 2px 8px 0px rgba(12, 26, 75, 0.06)',
    };
  }
  return {
    shadowColor: '#0C1A4B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 8,
  };
}

/**
 * FAB shadow — prominent, used on the create-activity floating button.
 */
export function shadowFab(scheme: ColorScheme = 'light'): ShadowStyle {
  if (Platform.OS === 'web') {
    return {
      boxShadow: '0px 8px 24px -4px rgba(41, 49, 62, 0.25), 0px 4px 12px 0px rgba(41, 49, 62, 0.12)',
    };
  }
  return {
    shadowColor: '#29313E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.20,
    shadowRadius: 12,
    elevation: 12,
  };
}

/**
 * Tab bar shadow — upward-facing shadow on the bottom tab bar.
 */
export function shadowTabBar(): ShadowStyle {
  if (Platform.OS === 'web') {
    return {
      boxShadow: '0px -4px 20px -2px rgba(73, 77, 90, 0.08)',
    };
  }
  return {
    shadowColor: 'rgba(73, 77, 90, 0.12)',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 1,
    shadowRadius: 40,
    elevation: 12,
  };
}
