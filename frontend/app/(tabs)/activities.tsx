import { SPORTS } from '@/constants/sports';
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState, useCallback, useSyncExternalStore } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActivityCard } from "@/components/activity-card";
import { FilterBar, type FilterOption } from "@/components/ui/filter-bar";
import { SearchBar } from "@/components/ui/search-bar";
import { SkeletonGroup } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { COLORS, getColor } from "@/constants/colors";
import { TEXT_STYLES } from "@/constants/typography";
import { SPACING, SCREEN } from "@/constants/spacing";
import { RADIUS } from "@/constants/radius";
import type { ActivityListItem } from "@/lib/api/activities";
import { listActivities } from "@/lib/api/activities";
import { ApiError } from "@/lib/api/client";
import { ActivityPager } from "@/lib/activity-pager";
import { useAuth } from "@/lib/auth/auth-context";

type SortOption = 'date' | 'distance' | 'popular';

const SORT_OPTIONS: { key: SortOption; label: string }[] = [
  { key: 'date', label: 'По дате' },
  { key: 'distance', label: 'Рядом' },
  { key: 'popular', label: 'Популярные' },
];

const SPORT_FILTERS: FilterOption[] = SPORTS.map(sport => ({ key: sport.id, label: sport.label, icon: sport.icon }));

const DATE_FILTERS: FilterOption[] = [
  { key: 'today', label: 'Сегодня' },
  { key: 'tomorrow', label: 'Завтра' },
  { key: 'week', label: 'На этой неделе' },
  { key: 'all', label: 'Все' },
];

export default function ActivitiesScreen() {
  const router = useRouter();
  const { token, logout } = useAuth();
  const params = useLocalSearchParams<{ sport?: string }>();
  const [searchQuery, setSearchQuery] = useState('');
  const [search, setSearch] = useState('');
  const [selectedSport, setSelectedSport] = useState(params.sport ?? '');
  const [selectedDate, setSelectedDate] = useState('all');
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const colors = getColor();

  useEffect(() => { setSelectedSport(params.sport ?? ''); }, [params.sport]);
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchQuery.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const pager = useMemo(() => new ActivityPager<ActivityListItem>((offset, signal) =>
    listActivities(token!, 20, offset, {
      sport: selectedSport || undefined,
      date: selectedDate === 'all' ? undefined : selectedDate,
      search: search || undefined,
    }, signal)), [token, selectedSport, selectedDate, search]);
  const { items, loading: busy, refreshing, error: requestError } = useSyncExternalStore(pager.subscribe, pager.snapshot, pager.snapshot);
  const error = requestError instanceof ApiError ? `${requestError.code}: ${requestError.message}`
    : requestError ? 'Не удалось загрузить активности' : null;

  useEffect(() => {
    if (requestError instanceof ApiError && requestError.status === 401) logout();
  }, [requestError, logout]);
  useFocusEffect(useCallback(() => {
    if (token) void pager.refresh();
    return pager.cancel;
  }, [pager, token]));

  const onRefresh = () => { void pager.refresh(); };
  const onEndReached = () => { void pager.loadMore(); };
  const handleSearchSubmit = () => setSearch(searchQuery.trim());
  const handleSportFilterChange = (sport: string | string[]) =>
    setSelectedSport(Array.isArray(sport) ? sport[0] || '' : sport);
  const handleDateFilterChange = (date: string | string[]) =>
    setSelectedDate(Array.isArray(date) ? date[0] || 'all' : date);
  const handleSortChange = (sort: SortOption) => {
    setSortBy(sort);
    setShowSortMenu(false);
  };

  const handleActivityPress = (activityId: string) => {
    router.push({ pathname: "/activity/[id]", params: { id: activityId } } as any);
  };

  const handleCreateActivity = () => {
    router.push("/create-activity");
  };

  const sortLabel = SORT_OPTIONS.find(o => o.key === sortBy)?.label || 'По дате';

  const renderHeader = () => (
    <View style={styles.headerContent}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmit={handleSearchSubmit}
          placeholder="Поиск активностей..."
          onClear={() => setSearchQuery('')}
        />
      </View>

      {/* Sport Filters */}
      <View style={styles.filtersSection}>
        <FilterBar
          options={SPORT_FILTERS}
          value={selectedSport}
          onChange={handleSportFilterChange}
          placeholder="Вид спорта"
          showAllOption={true}
          allLabel="Все"
        />
      </View>

      {/* Date Filters */}
      <View style={styles.filtersSection}>
        <FilterBar
          options={DATE_FILTERS}
          value={selectedDate}
          onChange={handleDateFilterChange}
          placeholder="Дата"
          showAllOption={false}
        />
      </View>

      {/* Sort */}
      <View style={styles.sortRow}>
        <Text style={[TEXT_STYLES.bodySm, { color: colors.textSecondary }]}>
          {items.length > 0 ? `Найдено: ${items.length}` : 'Активности'}
        </Text>
        <Pressable
          style={styles.sortButton}
          onPress={() => setShowSortMenu(!showSortMenu)}
        >
          <MaterialIcons name="sort" size={16} color={colors.textSecondary} />
          <Text style={[TEXT_STYLES.labelSm, { color: colors.textSecondary }]}>
            {sortLabel}
          </Text>
          <MaterialIcons
            name={showSortMenu ? "expand-less" : "expand-more"}
            size={16}
            color={colors.textSecondary}
          />
        </Pressable>
      </View>

      {/* Sort Menu */}
      {showSortMenu && (
        <View style={[styles.sortMenu, { backgroundColor: colors.surface }]}>
          {SORT_OPTIONS.map((option) => (
            <Pressable
              key={option.key}
              style={[
                styles.sortMenuItem,
                sortBy === option.key && { backgroundColor: colors.inkLight },
              ]}
              onPress={() => handleSortChange(option.key)}
            >
              <Text
                style={[
                  TEXT_STYLES.body,
                  { color: sortBy === option.key ? colors.ink : colors.textPrimary },
                ]}
              >
                {option.label}
              </Text>
              {sortBy === option.key && (
                <MaterialIcons name="check" size={20} color={colors.ink} />
              )}
            </Pressable>
          ))}
        </View>
      )}

      {/* Map Placeholder (for future map integration) */}
      <View style={styles.mapPlaceholder}>
        <MaterialIcons name="map" size={32} color={colors.textSecondary} />
        <Text style={[TEXT_STYLES.bodySm, { color: colors.textSecondary }]}>
          Карта скоро появится
        </Text>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <EmptyState
        emoji="🔍"
        title="Ничего не найдено"
        description={searchQuery || selectedSport || selectedDate !== 'all' 
          ? "Попробуйте изменить фильтры"
          : "Присоединяйтесь к активностям или создавайте свои"
        }
        action={{
          label: "Создать активность",
          onPress: handleCreateActivity,
        }}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={[TEXT_STYLES.h3, { color: colors.ink }]}>Искать активность</Text>
        <View style={styles.headerIcons}>
          <Pressable hitSlop={10} onPress={handleCreateActivity}>
            <MaterialIcons name="add" size={24} color={colors.textSecondary} />
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
        ListHeaderComponent={renderHeader()}
        ListEmptyComponent={
          busy ? (
            <View style={styles.loadingContainer}>
              <SkeletonGroup count={3} variant="list-item" />
            </View>
          ) : (
            renderEmpty()
          )
        }
        ItemSeparatorComponent={() => <View style={{ height: SCREEN.cardGap }} />}
        renderItem={({ item }) => (
          <ActivityCard
            activity={item}
            onPress={handleActivityPress}
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
  headerContent: {
    gap: SPACING.sm,
    paddingBottom: SPACING.base,
  },
  searchContainer: {
    paddingHorizontal: SCREEN.paddingHorizontal,
  },
  filtersSection: {
    paddingVertical: SPACING.xs,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SCREEN.paddingHorizontal,
    paddingVertical: SPACING.sm,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  sortMenu: {
    marginHorizontal: SCREEN.paddingHorizontal,
    marginBottom: SPACING.sm,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  sortMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.md,
  },
  mapPlaceholder: {
    height: 160,
    marginHorizontal: SCREEN.paddingHorizontal,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.divider,
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
  },
  listContent: {
    paddingHorizontal: SCREEN.paddingHorizontal,
    paddingBottom: SCREEN.bottomPadding,
  },
  loadingContainer: {
    paddingHorizontal: SCREEN.paddingHorizontal,
    paddingTop: SPACING.lg,
  },
  emptyContainer: {
    paddingVertical: SPACING.xl,
  },
});
