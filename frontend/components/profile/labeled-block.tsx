import React from 'react';
import { StyleSheet, Text, View, type ViewProps } from 'react-native';

import { COLORS, getColor, type ColorScheme } from '@/constants/colors';
import { TEXT_STYLES } from '@/constants/typography';
import { SPACING } from '@/constants/spacing';

type Props = ViewProps & {
  label: string;
  children: React.ReactNode;
  colorScheme?: ColorScheme;
};

export function LabeledBlock({ label, children, style, colorScheme, ...rest }: Props) {
  const scheme = colorScheme ?? 'light';
  const colors = getColor(scheme);

  return (
    <View style={[styles.root, style]} {...rest}>
      <Text style={[TEXT_STYLES.label, { color: colors.textSecondary }]}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: SPACING.sm,
  },
});
