import React from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { COLORS } from '@/constants/colors';

export default function MapScreen() {
  return (
    <SafeAreaView style={styles.safe}>
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
