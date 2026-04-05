/**
 * Spacing design tokens.
 * Base unit: 4px. All spacing values are multiples of 4.
 */

export const SPACING = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
} as const;

export type SpacingToken = keyof typeof SPACING;

/**
 * Screen-level spacing presets.
 */
export const SCREEN = {
  /** Horizontal padding for screen content */
  paddingHorizontal: SPACING.xl,
  /** Default gap between sections */
  sectionGap: SPACING.xl,
  /** Default gap between cards in a list */
  cardGap: SPACING.md,
  /** Default gap between inline elements */
  inlineGap: SPACING.sm,
  /** Bottom padding to avoid tab bar overlap */
  bottomPadding: SPACING['2xl'],
} as const;
