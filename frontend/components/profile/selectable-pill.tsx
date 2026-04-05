import React from 'react';
import { Pressable, StyleSheet, Text, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { COLORS, getColor, type ColorScheme } from '@/constants/colors';
import { TEXT_STYLES } from '@/constants/typography';
import { RADIUS } from '@/constants/radius';

type Props = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  selected: boolean;
  layout?: 'fill' | 'hug';
  style?: StyleProp<ViewStyle>;
  colorScheme?: ColorScheme;
};

export function SelectablePill({ label, selected, layout = 'hug', style, colorScheme, ...rest }: Props) {
  const scheme = colorScheme ?? 'light';
  const colors = getColor(scheme);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.base,
        layout === 'fill' ? styles.fill : styles.hug,
        {
          backgroundColor: selected ? colors.ink : colors.buttonSecondaryBg,
          borderColor: selected ? 'transparent' : colors.buttonSecondaryBorder,
        },
        pressed && styles.pressed,
        style,
      ]}
      {...rest}>
      <Text style={[
        TEXT_STYLES.label,
        {
          color: selected ? colors.surface : colors.textPrimary,
        },
      ]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 36,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  fill: {
    flex: 1,
  },
  hug: {
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.97 }],
  },
});
