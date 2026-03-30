import React from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { COLORS } from '@/constants/colors';

type Props = ViewProps & {
  children: React.ReactNode;
};

export function ProfileCard({ style, children, ...rest }: Props) {
  return (
    <View style={[styles.card, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
  },
});
