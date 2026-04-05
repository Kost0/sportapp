import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState, useCallback } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS, getColor } from '@/constants/colors';
import { TEXT_STYLES } from '@/constants/typography';
import { SPACING, SCREEN } from '@/constants/spacing';
import { RADIUS } from '@/constants/radius';

type Place = {
  id: string;
  name: string;
  type: string;
  address: string;
  rating: number;
  image?: string;
};

const MOCK_PLACES: Place[] = [
  {
    id: '1',
    name: 'Парк Горького',
    type: 'Парк',
    address: 'ул. Косыгина, 28',
    rating: 4.8,
  },
  {
    id: '2',
    name: 'Спортивный комплекс ЦСКА',
    type: 'Стадион',
    address: 'ул. Лавочкина, 32',
    rating: 4.6,
  },
  {
    id: '3',
    name: 'Воробьевы горы',
    type: 'Парк',
    address: 'Воробьевская наб., 1',
    rating: 4.7,
  },
  {
    id: '4',
    name: 'Лужники',
    type: 'Стадион',
    address: 'ул. Лужники, 24',
    rating: 4.5,
  },
  {
    id: '5',
    name: 'Сокольники',
    type: 'Парк',
    address: 'ул. Сокольнический вал, 1',
    rating: 4.4,
  },
];

export default function ExploreScreen() {
  const router = useRouter();
  const colors = getColor();
  const [refreshing, setRefreshing] = useState(false);

  const handlePlacePress = (placeId: string) => {
    // Navigate to place details or show on map
    console.log('Place pressed:', placeId);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Simulate refresh
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const renderPlace = ({ item }: { item: Place }) => (
    <Pressable
      style={styles.placeCard}
      onPress={() => handlePlacePress(item.id)}
    >
      <View style={styles.placeImagePlaceholder}>
        <MaterialIcons name="place" size={32} color={colors.textSecondary} />
      </View>
      <View style={styles.placeInfo}>
        <View style={styles.placeHeader}>
          <Text style={[TEXT_STYLES.label, { color: colors.textPrimary }]} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.ratingBadge}>
            <MaterialIcons name="star" size={14} color={COLORS.warning} />
            <Text style={[TEXT_STYLES.labelSm, { color: colors.textPrimary }]}>
              {item.rating}
            </Text>
          </View>
        </View>
        <Text style={[TEXT_STYLES.bodySm, { color: colors.textSecondary }]} numberOfLines={1}>
          {item.type} • {item.address}
        </Text>
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={[TEXT_STYLES.h3, { color: colors.ink }]}>Интересные места</Text>
        <View style={styles.headerIcons}>
          <Pressable hitSlop={10}>
            <MaterialIcons name="search" size={20} color={colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      <FlatList
        data={MOCK_PLACES}
        keyExtractor={(item) => item.id}
        renderItem={renderPlace}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.ink}
            colors={[colors.ink]}
          />
        }
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: SCREEN.cardGap }} />}
        ListHeaderComponent={
          <View style={styles.intro}>
            <Text style={[TEXT_STYLES.body, { color: colors.textSecondary }]}>
              Найдите спортивные площадки и парки рядом с вами
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialIcons name="location-off" size={48} color={colors.textSecondary} />
            <Text style={[TEXT_STYLES.body, { color: colors.textSecondary, textAlign: 'center' }]}>
              Места не найдены
            </Text>
          </View>
        }
      />
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
  listContent: {
    paddingHorizontal: SCREEN.paddingHorizontal,
    paddingBottom: SCREEN.bottomPadding,
  },
  intro: {
    marginBottom: SPACING.base,
  },
  placeCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    gap: SPACING.base,
  },
  placeImagePlaceholder: {
    width: 72,
    height: 72,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: SPACING.xs,
  },
  placeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: COLORS.badgeBg,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  emptyState: {
    paddingVertical: SPACING['3xl'],
    alignItems: 'center',
    gap: SPACING.base,
  },
});