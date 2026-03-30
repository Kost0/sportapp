import React from 'react';
import { StyleSheet, Text, View, type ViewProps } from 'react-native';

import { COLORS } from '@/constants/colors';

type Props = ViewProps & {
  label: string;
  children: React.ReactNode;
};

export function LabeledBlock({ label, children, style, ...rest }: Props) {
  return (
    <View style={[styles.root, style]} {...rest}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
});
