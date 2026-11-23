import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CapacityInput } from '@/components/create-activity/capacity-input';
import { CreateActivityHeader } from '@/components/create-activity/header';
import { PrimaryButton, SecondaryButton } from '@/components/ui-buttons';
import { COLORS } from '@/constants/colors';
import { useCreateActivity } from '@/lib/create-activity-context';

export default function ParticipantsScreen() {
  const router = useRouter();
  const { data, updateData } = useCreateActivity();
  const [valid, setValid] = useState(true);
  return <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
    <CreateActivityHeader step={5} totalSteps={6} title="Количество участников" />
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <CapacityInput value={data.maxParticipants} onChange={maxParticipants => updateData({ maxParticipants })} onValidityChange={setValid} />
    </ScrollView>
    <View style={styles.footer}>
      <SecondaryButton title="Назад" onPress={() => router.back()} style={styles.back} />
      <PrimaryButton title="Далее" disabled={!valid} onPress={() => { if (valid) router.push('/create-activity/confirm'); }} style={styles.next} />
    </View>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg }, content: { padding: 20 },
  footer: { flexDirection: 'row', gap: 12, padding: 20 }, back: { flex: 1 }, next: { flex: 2 },
});
