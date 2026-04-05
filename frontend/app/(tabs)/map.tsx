import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS, getColor } from '@/constants/colors';
import { TEXT_STYLES } from '@/constants/typography';
import { SPACING, SCREEN } from '@/constants/spacing';

export default function MapScreen() {
  const colors = getColor();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={[TEXT_STYLES.h3, { color: colors.ink }]}>Площадки</Text>
      </View>
      <View style={styles.body}>
        <Text style={[TEXT_STYLES.body, { color: colors.textSecondary }]}>Экран в разработке</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    paddingHorizontal: SCREEN.paddingHorizontal,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
  },
  body: {
    paddingHorizontal: SCREEN.paddingHorizontal,
    paddingTop: SPACING.sm,
  },
});
