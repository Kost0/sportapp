import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '@/constants/colors';

export default function MapScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Площадки</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.text}>Экран в разработке</Text>
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
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.ink,
  },
  body: {
    paddingHorizontal: 24,
    paddingTop: 10,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
});
