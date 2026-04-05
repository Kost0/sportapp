/**
 * Typography design tokens.
 * Font family: Montserrat (primary) / Montserrat Alternates (accent).
 * 
 * Scale based on a 1.250 minor third ratio with 10px base.
 */

export const FONT_FAMILY = {
  primary: 'Montserrat',
  primaryBold: 'Montserrat-Bold',
  primarySemiBold: 'Montserrat-SemiBold',
  primaryMedium: 'Montserrat-Medium',
  primaryRegular: 'Montserrat-Regular',
  accent: 'MontserratAlternates-Regular',
  accentBold: 'MontserratAlternates-Bold',
  accentSemiBold: 'MontserratAlternates-SemiBold',
  accentMedium: 'MontserratAlternates-Medium',
} as const;

export const FONT_SIZE = {
  xs: 10,
  sm: 12,
  base: 14,
  md: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 32,
} as const;

export const LINE_HEIGHT = {
  xs: 14,
  sm: 16,
  base: 20,
  md: 22,
  lg: 24,
  xl: 28,
  '2xl': 30,
  '3xl': 34,
  '4xl': 38,
} as const;

export const LETTER_SPACING = {
  tight: -0.4,
  normal: 0,
  wide: 0.2,
  wider: 0.5,
} as const;

/**
 * Pre-composed text style presets.
 * Each preset includes: fontFamily, fontSize, lineHeight, letterSpacing, fontWeight.
 */
export const TEXT_STYLES = {
  // Display / Hero
  display: {
    fontFamily: FONT_FAMILY.primaryBold,
    fontSize: FONT_SIZE['4xl'],
    lineHeight: LINE_HEIGHT['4xl'],
    letterSpacing: LETTER_SPACING.tight,
    fontWeight: '700' as const,
  },
  h1: {
    fontFamily: FONT_FAMILY.primaryBold,
    fontSize: FONT_SIZE['3xl'],
    lineHeight: LINE_HEIGHT['3xl'],
    letterSpacing: LETTER_SPACING.tight,
    fontWeight: '700' as const,
  },
  h2: {
    fontFamily: FONT_FAMILY.primaryBold,
    fontSize: FONT_SIZE['2xl'],
    lineHeight: LINE_HEIGHT['2xl'],
    letterSpacing: LETTER_SPACING.normal,
    fontWeight: '700' as const,
  },
  h3: {
    fontFamily: FONT_FAMILY.primarySemiBold,
    fontSize: FONT_SIZE.xl,
    lineHeight: LINE_HEIGHT.xl,
    letterSpacing: LETTER_SPACING.normal,
    fontWeight: '600' as const,
  },

  // Body
  bodyLg: {
    fontFamily: FONT_FAMILY.primaryRegular,
    fontSize: FONT_SIZE.md,
    lineHeight: LINE_HEIGHT.md,
    letterSpacing: LETTER_SPACING.normal,
    fontWeight: '400' as const,
  },
  body: {
    fontFamily: FONT_FAMILY.primaryRegular,
    fontSize: FONT_SIZE.base,
    lineHeight: LINE_HEIGHT.base,
    letterSpacing: LETTER_SPACING.normal,
    fontWeight: '400' as const,
  },
  bodySm: {
    fontFamily: FONT_FAMILY.primaryRegular,
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    letterSpacing: LETTER_SPACING.normal,
    fontWeight: '400' as const,
  },

  // Labels / UI
  labelLg: {
    fontFamily: FONT_FAMILY.primarySemiBold,
    fontSize: FONT_SIZE.base,
    lineHeight: LINE_HEIGHT.base,
    letterSpacing: LETTER_SPACING.wide,
    fontWeight: '600' as const,
  },
  label: {
    fontFamily: FONT_FAMILY.primarySemiBold,
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    letterSpacing: LETTER_SPACING.wide,
    fontWeight: '600' as const,
  },
  labelSm: {
    fontFamily: FONT_FAMILY.primaryMedium,
    fontSize: FONT_SIZE.xs,
    lineHeight: LINE_HEIGHT.xs,
    letterSpacing: LETTER_SPACING.wider,
    fontWeight: '500' as const,
  },

  // Accent (Montserrat Alternates)
  accent: {
    fontFamily: FONT_FAMILY.accent,
    fontSize: FONT_SIZE.base,
    lineHeight: LINE_HEIGHT.base,
    letterSpacing: LETTER_SPACING.normal,
    fontWeight: '400' as const,
  },
  accentBold: {
    fontFamily: FONT_FAMILY.accentBold,
    fontSize: FONT_SIZE.base,
    lineHeight: LINE_HEIGHT.base,
    letterSpacing: LETTER_SPACING.normal,
    fontWeight: '700' as const,
  },
  accentSm: {
    fontFamily: FONT_FAMILY.accentMedium,
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    letterSpacing: LETTER_SPACING.wide,
    fontWeight: '500' as const,
  },

  // Button
  buttonPrimary: {
    fontFamily: FONT_FAMILY.primarySemiBold,
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    letterSpacing: LETTER_SPACING.wide,
    fontWeight: '600' as const,
  },
  buttonSecondary: {
    fontFamily: FONT_FAMILY.primaryMedium,
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    letterSpacing: LETTER_SPACING.wide,
    fontWeight: '500' as const,
  },

  // Badge
  badge: {
    fontFamily: FONT_FAMILY.accentBold,
    fontSize: FONT_SIZE.sm,
    lineHeight: LINE_HEIGHT.sm,
    letterSpacing: LETTER_SPACING.wider,
    fontWeight: '700' as const,
  },

  // Tab label
  tabLabel: {
    fontFamily: FONT_FAMILY.primarySemiBold,
    fontSize: FONT_SIZE.xs,
    lineHeight: LINE_HEIGHT.xs,
    letterSpacing: LETTER_SPACING.wider,
    fontWeight: '600' as const,
  },

  // Input
  input: {
    fontFamily: FONT_FAMILY.primarySemiBold,
    fontSize: FONT_SIZE.md,
    lineHeight: LINE_HEIGHT.md,
    letterSpacing: LETTER_SPACING.normal,
    fontWeight: '600' as const,
  },
  inputPlaceholder: {
    fontFamily: FONT_FAMILY.primaryRegular,
    fontSize: FONT_SIZE.md,
    lineHeight: LINE_HEIGHT.md,
    letterSpacing: LETTER_SPACING.normal,
    fontWeight: '400' as const,
  },
} as const;

export type TextStyleName = keyof typeof TEXT_STYLES;
