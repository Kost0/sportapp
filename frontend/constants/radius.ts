/**
 * Border radius design tokens.
 */

export const RADIUS = {
  /** Small: badges, tags */
  sm: 8,
  /** Medium: buttons, pills, inputs */
  md: 12,
  /** Large: cards, panels */
  lg: 16,
  /** Extra large: modals, large panels */
  xl: 20,
  /** Full: avatars, FAB buttons */
  full: 9999,
} as const;

export type RadiusToken = keyof typeof RADIUS;
