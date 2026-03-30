import React from 'react';
import { Pressable, StyleSheet, Text, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { COLORS } from '@/constants/colors';

const BORDER = '#E5E7EB';

type Props = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  selected: boolean;
  layout?: 'fill' | 'hug';
  style?: StyleProp<ViewStyle>;
};

export function SelectablePill({ label, selected, layout = 'hug', style, ...rest }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.base,
        layout === 'fill' ? styles.fill : styles.hug,
        selected ? styles.selected : styles.unselected,
        pressed ? styles.pressed : null,
        style,
      ]}
      {...rest}>
      <Text style={[styles.text, selected ? styles.textSelected : styles.textUnselected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 32,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fill: {
    flex: 1,
  },
  hug: {
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  selected: {
    backgroundColor: COLORS.ink,
    borderWidth: 0,
  },
  unselected: {
    backgroundColor: COLORS.buttonSecondaryBg,
    borderWidth: 1,
    borderColor: BORDER,
  },
  text: {
    fontSize: 13,
    fontWeight: '700',
  },
  textSelected: {
    color: COLORS.surface,
  },
  textUnselected: {
    color: COLORS.ink,
  },
  pressed: {
    opacity: 0.92,
  },
});
