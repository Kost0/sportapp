/**
 * Color design tokens derived from Figma design tokens.
 * Supports both light and dark modes.
 * 
 * Backward compatible: COLORS.bg, COLORS.ink, etc. return light theme values.
 * For dark mode: use getColor('dark').bg or useThemeColor().
 */

export const FIGMA_TOKENS = {
  dark: '#29313E',
  grayText: '#6B7280',
  darkGreen: '#5B892A',
  lightGreen: '#E6F3D8',
  red: '#F05657',
} as const;

const LIGHT = {
  // Backgrounds
  bg: '#F5F5F7',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',

  // Text
  textPrimary: '#29313E',
  textSecondary: '#6B7280',
  textInverse: '#FFFFFF',
  textLink: '#29313E',

  // Accent / Brand
  ink: '#29313E',
  inkMuted: 'rgba(41, 49, 62, 0.6)',
  inkLight: 'rgba(41, 49, 62, 0.08)',

  // Semantic
  success: '#5B892A',
  successBg: '#E6F3D8',
  danger: '#F05657',
  dangerBg: 'rgba(240, 86, 87, 0.08)',
  dangerBorder: 'rgba(240, 86, 87, 0.25)',
  warning: '#F59E0B',
  warningBg: 'rgba(245, 158, 11, 0.08)',

  // UI Elements
  divider: '#E5E7EB',
  dividerStrong: '#D1D5DB',
  border: '#E5E7EB',
  borderFocus: '#29313E',

  // Badges
  badgeBg: '#E6F3D8',
  badgeText: '#5B892A',
  badgeDangerBg: 'rgba(240, 86, 87, 0.10)',
  badgeDangerText: '#F05657',

  // Buttons
  buttonPrimaryBg: '#29313E',
  buttonPrimaryText: '#FFFFFF',
  buttonPrimaryPressed: 'rgba(41, 49, 62, 0.92)',
  buttonSecondaryBg: '#F3F4F6',
  buttonSecondaryText: '#6B7280',
  buttonSecondaryBorder: '#E5E7EB',

  // Inputs
  inputBg: '#FFFFFF',
  inputBorder: '#E5E7EB',
  inputPlaceholder: '#9CA3AF',

  // Tab bar
  tabBarBg: 'rgba(255, 255, 255, 0.92)',
  tabBarBorder: 'rgba(0, 0, 0, 0.06)',
  tabIconActive: '#29313E',
  tabIconInactive: '#6B7280',

  // Avatar
  avatarPlaceholder: '#E5E7EB',
  avatarBorder: '#FFFFFF',

  // Overlay / Backdrop
  overlay: 'rgba(0, 0, 0, 0.40)',
  backdropBlur: 'rgba(255, 255, 255, 0.72)',

  // Progress dots
  progressDotActive: '#29313E',
  progressDotInactive: '#D9DFE6',

  // Shadow colors
  shadowCard: 'rgba(12, 26, 75, 0.06)',
  shadowElevated: 'rgba(12, 26, 75, 0.10)',
  shadowFab: 'rgba(41, 49, 62, 0.20)',
} as const;

const DARK = {
  // Backgrounds
  bg: '#0F1117',
  surface: '#1A1D27',
  surfaceElevated: '#22252F',

  // Text
  textPrimary: '#F0F0F2',
  textSecondary: '#9CA3AF',
  textInverse: '#29313E',
  textLink: '#E6F3D8',

  // Accent / Brand
  ink: '#E6F3D8',
  inkMuted: 'rgba(230, 243, 216, 0.6)',
  inkLight: 'rgba(230, 243, 216, 0.08)',

  // Semantic
  success: '#7CB342',
  successBg: 'rgba(124, 179, 66, 0.15)',
  danger: '#F05657',
  dangerBg: 'rgba(240, 86, 87, 0.15)',
  dangerBorder: 'rgba(240, 86, 87, 0.30)',
  warning: '#F59E0B',
  warningBg: 'rgba(245, 158, 11, 0.15)',

  // UI Elements
  divider: '#2D3140',
  dividerStrong: '#3D4155',
  border: '#2D3140',
  borderFocus: '#E6F3D8',

  // Badges
  badgeBg: 'rgba(91, 137, 42, 0.20)',
  badgeText: '#7CB342',
  badgeDangerBg: 'rgba(240, 86, 87, 0.15)',
  badgeDangerText: '#F05657',

  // Buttons
  buttonPrimaryBg: '#E6F3D8',
  buttonPrimaryText: '#29313E',
  buttonPrimaryPressed: 'rgba(230, 243, 216, 0.88)',
  buttonSecondaryBg: '#22252F',
  buttonSecondaryText: '#9CA3AF',
  buttonSecondaryBorder: '#2D3140',

  // Inputs
  inputBg: '#1A1D27',
  inputBorder: '#2D3140',
  inputPlaceholder: '#6B7280',

  // Tab bar
  tabBarBg: 'rgba(26, 29, 39, 0.95)',
  tabBarBorder: 'rgba(255, 255, 255, 0.06)',
  tabIconActive: '#E6F3D8',
  tabIconInactive: '#6B7280',

  // Avatar
  avatarPlaceholder: '#2D3140',
  avatarBorder: '#1A1D27',

  // Overlay / Backdrop
  overlay: 'rgba(0, 0, 0, 0.60)',
  backdropBlur: 'rgba(26, 29, 39, 0.80)',

  // Progress dots
  progressDotActive: '#E6F3D8',
  progressDotInactive: '#2D3140',

  // Shadow colors
  shadowCard: 'rgba(0, 0, 0, 0.30)',
  shadowElevated: 'rgba(0, 0, 0, 0.40)',
  shadowFab: 'rgba(230, 243, 216, 0.15)',
} as const;

/**
 * Flat light-theme colors for backward compatibility.
 * Existing code: import { COLORS } from ...; COLORS.bg → works.
 */
export const COLORS = LIGHT;

/**
 * Nested color system for light/dark mode access.
 * Usage: COLORS_MODES.light.bg, COLORS_MODES.dark.bg
 */
export const COLORS_MODES = {
  light: LIGHT,
  dark: DARK,
} as const;

/**
 * Type-safe color token accessor.
 * Usage: getColor('dark').bg
 */
export type ColorScheme = 'light' | 'dark';
export type ColorTokens = typeof LIGHT;

export function getColor(scheme: ColorScheme = 'light'): ColorTokens {
  return COLORS_MODES[scheme] as ColorTokens;
}
