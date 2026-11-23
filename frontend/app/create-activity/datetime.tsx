import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CreateActivityHeader } from '@/components/create-activity/header';
import { ScheduleInput, scheduleDate } from '@/components/create-activity/schedule-input';
import { PrimaryButton, SecondaryButton } from '@/components/ui-buttons';
import { COLORS } from '@/constants/colors';
import { useCreateActivity } from '@/lib/create-activity-context';

export default function DateTimeScreen() {
  const router = useRouter();
  const { data, updateData } = useCreateActivity();
  const scheduled = scheduleDate(data.date, data.time);
  const future = Boolean(scheduled && scheduled.getTime() > Date.now());
  const next = () => {
    const value = scheduleDate(data.date, data.time);
    if (value && value.getTime() > Date.now()) router.push('/create-activity/location');
  };
  return <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
    <CreateActivityHeader step={3} totalSteps={6} title="Дата и время" />
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <ScheduleInput date={data.date} time={data.time} onChange={(date, time) => updateData({ date, time })} />
      {data.date && !future && <Text accessibilityRole="alert" style={styles.error}>Выберите дату и время в будущем.</Text>}
    </ScrollView>
    <View style={styles.footer}>
      <SecondaryButton title="Назад" onPress={() => router.back()} style={styles.back} />
      <PrimaryButton title="Далее" onPress={next} disabled={!future} style={styles.next} />
    </View>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg }, content: { padding: 20, gap: 16 },
  footer: { flexDirection: 'row', gap: 12, padding: 20 }, back: { flex: 1 }, next: { flex: 2 },
  error: { color: COLORS.danger, fontSize: 13 },
});
