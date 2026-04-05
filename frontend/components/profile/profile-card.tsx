import React from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { COLORS, getColor, type ColorScheme } from '@/constants/colors';
import { RADIUS } from '@/constants/radius';
import { shadowCard } from '@/constants/shadows';

type Props = ViewProps & {
  children: React.ReactNode;
  colorScheme?: ColorScheme;
};

export function ProfileCard({ style, children, colorScheme, ...rest }: Props) {
  const scheme = colorScheme ?? 'light';
  const colors = getColor(scheme);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
        },
        shadowCard(scheme),
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
  },
});
