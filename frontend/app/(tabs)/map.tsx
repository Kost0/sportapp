import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PlaceList } from '@/components/place-list';
import { COLORS } from '@/constants/colors';

export default function MapScreen() {
  const router = useRouter();
  return <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
    <View style={styles.header}><Text style={styles.title}>Площадки</Text></View>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <PlaceList onSelect={place => router.push({ pathname: '/court/[id]', params: { id: place.id } })} />
    </ScrollView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg }, header: { padding: 24, paddingBottom: 12 },
  title: { fontSize: 20, fontWeight: '600', color: COLORS.ink }, content: { paddingHorizontal: 24, paddingBottom: 32 },
});
