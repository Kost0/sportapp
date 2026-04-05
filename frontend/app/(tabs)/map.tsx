import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState, useCallback } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS, getColor } from '@/constants/colors';
import { TEXT_STYLES } from '@/constants/typography';
import { SPACING, SCREEN } from '@/constants/spacing';
import { RADIUS } from '@/constants/radius';

type SportCourt = {
  id: string;
  name: string;
  sport: string;
  address: string;
  distance?: string;
  available: boolean;
};

const MOCK_COURTS: SportCourt[] = [
  {
    id: '1',
    name: 'Баскетбольная площадка',
    sport: 'Баскетбол',
    address: 'Парк Горького',
    distance: '1.2 км',
    available: true,
  },
  {
    id: '2',
    name: 'Футбольное поле',
    sport: 'Футбол',
    address: 'Спортивный комплекс ЦСКА',
    distance: '2.5 км',
    available: true,
  },
  {
    id: '3',
    name: 'Волейбольная площадка',
    sport: 'Волейбол',
    address: 'Воробьевы горы',
    distance: '3.1 км',
    available: false,
  },
  {
    id: '4',
    name: 'Теннисный корт',
    sport: 'Теннис',
    address: 'Лужники',
    distance: '4.0 км',
    available: true,
  },
  {
    id: '5',
    name: 'Скалодром',
    sport: 'Скалолазание',
    address: 'Сокольники',
    distance: '5.2 км',
    available: true,
  },
];

export default function MapScreen() {
  const router = useRouter();
  const colors = getColor();
  const [refreshing, setRefreshing] = useState(false);

  const handleCourtPress = (courtId: string) => {
    console.log('Court pressed:', courtId);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Simulate refresh
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const renderCourt = (court: SportCourt) => (
    <Pressable
      key={court.id}
      style={styles.courtCard}
      onPress={() => handleCourtPress(court.id)}
    >
      <View style={styles.courtIconWrap}>
        <MaterialIcons
          name={court.sport === 'Баскетбол' ? 'sports-basketball' : 
                court.sport === 'Футбол' ? 'sports-soccer' :
                court.sport === 'Волейбол' ? 'sports-volleyball' :
                court.sport === 'Теннис' ? 'sports-tennis' : 'terrain'}
          size={24}
          color={colors.ink}
        />
      </View>
      <View style={styles.courtInfo}>
        <Text style={[TEXT_STYLES.label, { color: colors.textPrimary }]} numberOfLines={1}>
          {court.name}
        </Text>
        <Text style={[TEXT_STYLES.bodySm, { color: colors.textSecondary }]} numberOfLines={1}>
          {court.address}
        </Text>
        <View style={styles.courtMeta}>
          {court.distance && (
            <View style={styles.metaItem}>
              <MaterialIcons name="near-me" size={14} color={colors.textSecondary} />
              <Text style={[TEXT_STYLES.labelSm, { color: colors.textSecondary }]}>
                {court.distance}
              </Text>
            </View>
          )}
          <View style={[
            styles.statusBadge,
            { backgroundColor: court.available ? COLORS.successBg : COLORS.dangerBg }
          ]}>
            <Text style={[
              TEXT_STYLES.labelSm, 
              { color: court.available ? COLORS.success : COLORS.danger }
            ]}>
              {court.available ? 'Свободно' : 'Занято'}
            </Text>
          </View>
        </View>
      </View>
      <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={[TEXT_STYLES.h3, { color: colors.ink }]}>Площадки</Text>
        <View style={styles.headerIcons}>
          <Pressable hitSlop={10}>
            <MaterialIcons name="my-location" size={20} color={colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      <View style={styles.mapPlaceholder}>
        <MaterialIcons name="map" size={48} color={colors.textSecondary} />
        <Text style={[TEXT_STYLES.body, { color: colors.textSecondary, textAlign: 'center' }]}>
          Карта временно недоступна
        </Text>
        <Text style={[TEXT_STYLES.bodySm, { color: colors.textSecondary, textAlign: 'center' }]}>
          Показаны ближайшие площадки списком
        </Text>
      </View>

      <ScrollView 
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.ink}
            colors={[colors.ink]}
          />
        }
      >
        <Text style={[TEXT_STYLES.h3, styles.sectionTitle]}>Ближайшие площадки</Text>
        {MOCK_COURTS.map(renderCourt)}
      </ScrollView>
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
    paddingBottom: SPACING.base,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  mapPlaceholder: {
    marginHorizontal: SCREEN.paddingHorizontal,
    height: 180,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.divider,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.base,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: SCREEN.paddingHorizontal,
    paddingBottom: SCREEN.bottomPadding,
  },
  sectionTitle: {
    marginBottom: SPACING.base,
  },
  courtCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    marginBottom: SCREEN.cardGap,
    gap: SPACING.base,
  },
  courtIconWrap: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  courtInfo: {
    flex: 1,
    gap: SPACING.xs,
  },
  courtMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
});