import { listPlaces } from '@/lib/api/places';
import { useAuth } from '@/lib/auth/auth-context';
import { sportLabel } from '@/constants/sports';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ExternalLink } from '@/components/external-link';
import { PrimaryButton } from '@/components/ui-buttons';
import { COLORS, getColor } from '@/constants/colors';
import { RADIUS } from '@/constants/radius';
import { SCREEN, SPACING } from '@/constants/spacing';
import { TEXT_STYLES } from '@/constants/typography';
import { DEMO_COURTS } from '@/lib/courts';

export function generateStaticParams() {
  return DEMO_COURTS.map(court => ({ id: court.id }));
}

export default function CourtDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const courtId = Array.isArray(id) ? id[0] : id;
  const demo = DEMO_COURTS.find(item => item.id === courtId);
  const { token } = useAuth();
  const [saved, setSaved] = useState<{ name: string; sport: string; location: string; icon: 'place' } | null>(null);
  const [loading, setLoading] = useState(!demo);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (demo) { setLoading(false); setError(false); return; }
    if (!token || !courtId) return;
    const controller = new AbortController();
    setLoading(true); setError(false); setSaved(null);
    void listPlaces(token, '', controller.signal, courtId).then(({ items }) => {
      if (controller.signal.aborted) return;
      const place = items[0];
      setSaved(place ? { name: place.address, sport: place.sports.map(sportLabel).join(' · '), location: place.address, icon: 'place' } : null);
    }).catch(() => { if (!controller.signal.aborted) setError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [demo, token, courtId, retry]);
  const court = demo ?? saved;
  const colors = getColor();
  const backToCourts = () => router.dismissTo('/(tabs)/map');

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={backToCourts} accessibilityRole="button" accessibilityLabel="Назад к площадкам" style={styles.back}>
          <MaterialIcons name="arrow-back" size={24} color={colors.ink} />
        </Pressable>
        <Text style={[TEXT_STYLES.h3, { color: colors.ink }]}>Площадка</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {loading && !demo ? <ActivityIndicator color={colors.ink} /> : error ? <>
          <Text style={TEXT_STYLES.body}>Не удалось загрузить место.</Text>
          <PrimaryButton title="Повторить" onPress={() => setRetry(value => value + 1)} />
        </> : court ? <>
          <View style={styles.card}>
            <View style={styles.icon}>
              <MaterialIcons name={court.icon} size={40} color={colors.ink} />
            </View>
            <Text accessibilityRole="header" style={[TEXT_STYLES.h2, { color: colors.textPrimary }]}>{court.name}</Text>
            <Text style={[TEXT_STYLES.body, { color: colors.textSecondary }]}>{court.sport}</Text>
            <View style={styles.location}>
              <MaterialIcons name="place" size={24} color={colors.textSecondary} />
              <Text style={[TEXT_STYLES.body, styles.locationText, { color: colors.textPrimary }]}>{court.location}</Text>
            </View>
          </View>
          <Text style={[TEXT_STYLES.bodySm, { color: colors.textSecondary }]}>
            {demo ? 'Это пример площадки. Актуальные данные о занятости и расстоянии пока недоступны.' : 'Это место использовалось в активностях. Доступность площадки уточняйте перед встречей.'}
          </Text>
          <ExternalLink
            href={`https://yandex.ru/maps/?text=${encodeURIComponent(demo ? `${court.location}, Москва` : court.location)}`}
            style={styles.mapLink}>
            Посмотреть место на карте ↗
          </ExternalLink>
        </> : <>
          <Text accessibilityRole="header" style={[TEXT_STYLES.h2, { color: colors.textPrimary }]}>Площадка не найдена</Text>
          <Text style={[TEXT_STYLES.body, { color: colors.textSecondary }]}>Выберите площадку из списка.</Text>
          <PrimaryButton title="К площадкам" onPress={backToCourts} />
        </>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, gap: SPACING.sm },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  content: { padding: SCREEN.paddingHorizontal, gap: SPACING.base },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.lg, gap: SPACING.md },
  icon: { width: 72, height: 72, backgroundColor: COLORS.divider, borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center' },
  location: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingTop: SPACING.sm },
  locationText: { flex: 1 },
  mapLink: { ...TEXT_STYLES.buttonPrimary, color: COLORS.surface, backgroundColor: COLORS.ink, textAlign: 'center', padding: SPACING.base, borderRadius: RADIUS.md, overflow: 'hidden' },
});
