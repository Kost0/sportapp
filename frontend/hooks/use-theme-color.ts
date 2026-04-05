/**
 * Theme color hook — wraps the new COLORS system with backward compatibility.
 * Supports both the new COLORS tokens and the legacy Colors from theme.ts.
 */

import { useColorScheme } from '@/hooks/use-color-scheme';
import { COLORS, COLORS_MODES, type ColorScheme } from '@/constants/colors';
import { Colors } from '@/constants/theme';

type LegacyColorName = keyof typeof Colors.light & keyof typeof Colors.dark;
type NewColorName = keyof typeof COLORS;

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: LegacyColorName | NewColorName
): string {
  const theme = (useColorScheme() ?? 'light') as ColorScheme;
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  }

  // Try new COLORS system (flat = light theme for backward compat)
  const flatColors = COLORS as Record<string, string>;
  if (colorName in flatColors) {
    return flatColors[colorName];
  }

  // Try nested COLORS_MODES for dark mode
  const modeColors = COLORS_MODES[theme] as Record<string, string>;
  if (colorName in modeColors) {
    return modeColors[colorName];
  }

  // Fallback to legacy Colors
  const legacyColors = Colors[theme] as Record<string, string>;
  if (colorName in legacyColors) {
    return legacyColors[colorName];
  }

  return props.light ?? props.dark ?? '#000000';
}
