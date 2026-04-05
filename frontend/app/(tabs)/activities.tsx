import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActivityCard } from "@/components/activity-card";
import { COLORS, getColor } from "@/constants/colors";
import { TEXT_STYLES } from "@/constants/typography";
import { SPACING, SCREEN } from "@/constants/spacing";
import { RADIUS } from "@/constants/radius";
import type { ActivityListItem } from "@/lib/api/activities";
import { listActivities } from "@/lib/api/activities";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/auth-context";

export default function ActivitiesScreen() {
  const router = useRouter();
  const { token, logout } = useAuth();
  const [items, setItems] = useState<ActivityListItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const colors = getColor();

  const canLoad = useMemo(() => Boolean(token), [token]);
  const PAGE_SIZE = 20;

  const loadItems = useCallback(async (offset = 0, isRefresh = false) => {
    if (!token) return;

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setBusy(true);
    }
    setError(null);

    try {
      const res = await listActivities(token, PAGE_SIZE, offset);
      if (isRefresh) {
        setItems(res.items ?? []);
      } else {
        setItems(prev => [...prev, ...(res.items ?? [])]);
      }
      setHasMore((res.items?.length ?? 0) === PAGE_SIZE);
    } catch (e: unknown) {
      if (e instanceof ApiError) {
        if (e.status === 401) logout();
        setError(`${e.code}: ${e.message}`);
      } else {
        setError('Failed to load activities');
      }
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setBusy(false);
      }
    }
  }, [token, logout]);

  useEffect(() => {
    loadItems(0, true);
  }, [loadItems]);

  const onRefresh = useCallback(() => {
    loadItems(0, true);
  }, [loadItems]);

  const onEndReached = useCallback(() => {
    if (!busy && hasMore) {
      loadItems(items.length, false);
    }
  }, [busy, hasMore, loadItems, items.length]);

  const handleSearchPress = () => {
    Alert.alert('Поиск', 'Фильтр поиска находится в разработке', [{ text: 'OK' }]);
  };

  const handleMorePress = () => {
    Alert.alert('Настройки', 'Дополнительные настройки находятся в разработке', [{ text: 'OK' }]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={[TEXT_STYLES.h3, { color: colors.ink }]}>Искать активность</Text>
        <View style={styles.headerIcons}>
          <Pressable hitSlop={10} onPress={handleSearchPress}>
            <MaterialIcons name="search" size={20} color={colors.textSecondary} />
          </Pressable>
          <Pressable hitSlop={10} onPress={handleMorePress}>
            <MaterialIcons name="more-vert" size={20} color={colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      {error ? (
        <View style={styles.banner}>
          <Text style={[TEXT_STYLES.bodySm, { color: colors.textPrimary }]}>{error}</Text>
        </View>
      ) : null}

      <FlatList
        data={items}
        keyExtractor={(item) => item.activityId}
        contentContainerStyle={styles.listContent}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.ink}
            colors={[colors.ink]}
          />
        }
        ListHeaderComponent={
          <>
            <View style={styles.mapPlaceholder}>
              <MaterialIcons name="map" size={48} color={colors.textSecondary} />
              <Text style={[TEXT_STYLES.label, { color: colors.textSecondary }]}>Карта временно недоступна</Text>
            </View>
            <Text style={[TEXT_STYLES.h3, styles.sectionTitle]}>
              {busy ? 'Загружаю…' : canLoad ? 'Ближайшие активности' : 'Требуется вход'}
            </Text>
          </>
        }
        ItemSeparatorComponent={() => <View style={{ height: SCREEN.cardGap }} />}
        renderItem={({ item }) => (
          <ActivityCard
            activity={item}
            onPress={(id) =>
              router.push({ pathname: "/activity/[id]", params: { id } } as any)
            }
          />
        )}
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  banner: {
    marginHorizontal: SCREEN.paddingHorizontal,
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.dangerBg,
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
  },
  mapPlaceholder: {
    height: 200,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.divider,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.base,
    gap: SPACING.sm,
  },
  listContent: {
    paddingHorizontal: SCREEN.paddingHorizontal,
    paddingBottom: SCREEN.bottomPadding,
  },
  sectionTitle: {
    paddingHorizontal: SPACING.xs,
    paddingBottom: SPACING.sm,
  },
});
