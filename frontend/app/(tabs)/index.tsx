import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { MyActivityCard } from "@/components/my-activity-card";
import { CategoryCard, type CategoryData } from "@/components/ui/category-card";
import { HeroCard } from "@/components/ui/hero-card";
import { SkeletonGroup } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { COLORS, getColor } from "@/constants/colors";
import { TEXT_STYLES } from "@/constants/typography";
import { SPACING, SCREEN } from "@/constants/spacing";
import { RADIUS } from "@/constants/radius";
import { getHomeData, type HomeData, type MyActivityItem } from "@/lib/api/home";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/auth-context";

type TimeFilter = "today" | "3days" | "7days" | "completed";

const TIME_FILTERS: { key: TimeFilter; label: string }[] = [
  { key: "today", label: "Сегодня" },
  { key: "3days", label: "3 дня" },
  { key: "7days", label: "7 дней" },
  { key: "completed", label: "Завершён" },
];

const SPORT_CATEGORIES: CategoryData[] = [
  { key: "running", label: "Бег", icon: "directions-run", emoji: "🏃" },
  { key: "cycling", label: "Велосипед", icon: "directions-bike", emoji: "🚴" },
  { key: "football", label: "Футбол", icon: "sports-soccer", emoji: "⚽" },
  { key: "basketball", label: "Баскетбол", icon: "sports-basketball", emoji: "🏀" },
  { key: "tennis", label: "Теннис", icon: "sports-tennis", emoji: "🎾" },
  { key: "swimming", label: "Плавание", icon: "pool", emoji: "🏊" },
];

const HERO_SUGGESTIONS = [
  { sport: "Бег", emoji: "🏃", title: "Хочешь побегать?", subtitle: "Найдем маршрут рядом", action: "Найти маршрут" },
  { sport: "Футбол", emoji: "⚽", title: "Сыграем в футбол?", subtitle: "Находим партнеров поблизости", action: "Найти игру" },
  { sport: "Велосипед", emoji: "🚴", title: "Покатаемся?", subtitle: "Открой для себя новые маршруты", action: "Выбрать маршрут" },
];

export default function HomeScreen() {
  const router = useRouter();
  const { token, logout } = useAuth();
  const [homeData, setHomeData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<TimeFilter>("today");
  const [heroIndex, setHeroIndex] = useState(0);
  const colors = getColor();

  const loadData = useCallback(async (isRefresh = false) => {
    if (!token) return;

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const data = await getHomeData(token);
      setHomeData(data);
    } catch (e: unknown) {
      if (e instanceof ApiError) {
        if (e.status === 401) logout();
        setError(`${e.code}: ${e.message}`);
      } else {
        setError("Не удалось загрузить данные");
      }
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, [token, logout]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    loadData(true);
  }, [loadData]);

  const filteredActivities = React.useMemo(() => {
    if (!homeData?.myActivities) return [];
    
    const now = new Date();
    // Start of today
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    // For comparison: use end of today for "today" filter only
    const activities = homeData.myActivities;

    switch (activeFilter) {
      case "today": {
        const todayEnd = new Date(todayStart);
        todayEnd.setDate(todayEnd.getDate() + 1);
        return activities.filter((a) => {
          const date = new Date(a.date);
          return date >= todayStart && date < todayEnd;
        });
      }
      case "3days": {
        const threeDaysLater = new Date(now);
        threeDaysLater.setDate(threeDaysLater.getDate() + 3);
        return activities.filter((a) => {
          const date = new Date(a.date);
          return date >= todayStart && date <= threeDaysLater;
        });
      }
      case "7days": {
        const sevenDaysLater = new Date(now);
        sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
        return activities.filter((a) => {
          const date = new Date(a.date);
          return date >= todayStart && date <= sevenDaysLater;
        });
      }
      case "completed":
        return activities.filter((a) => a.status === "COMPLETED");
      default:
        // Default: show only upcoming activities (from now onwards)
        return activities.filter((a) => new Date(a.date) >= todayStart);
    }
  }, [homeData?.myActivities, activeFilter]);

  const handleCategoryPress = (categoryKey: string) => {
    router.push("/activities");
  };

  const handleHeroAction = () => {
    router.push("/activities");
  };

  const handleNotificationPress = () => {
    // TODO: Navigate to notifications
  };

  const handleProfilePress = () => {
    router.push("/profile");
  };

  const handleActivityPress = (activityId: string) => {
    router.push({ pathname: "/activity/[id]", params: { id: activityId } } as any);
  };

  const handleCreateActivity = () => {
    router.push("/create-activity");
  };

  // Get random hero suggestion
  const heroSuggestion = HERO_SUGGESTIONS[heroIndex % HERO_SUGGESTIONS.length];

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
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
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={handleProfilePress} style={styles.userInfo}>
            <Image
              source={{
                uri:
                  homeData?.user.avatarUrl ||
                  `https://api.dicebear.com/7.x/identicon/png?seed=${homeData?.user.userId || "default"}`,
              }}
              style={styles.userAvatar}
            />
            <View>
              <Text style={[TEXT_STYLES.bodySm, { color: colors.textSecondary }]}>Привет,</Text>
              <Text style={[TEXT_STYLES.h3, { color: colors.textPrimary }]}>
                {homeData?.user.username || "Пользователь"}
              </Text>
            </View>
          </Pressable>
          <Pressable onPress={handleNotificationPress} hitSlop={12} style={styles.notificationBtn}>
            <MaterialIcons
              name="notifications-none"
              size={26}
              color={colors.textPrimary}
            />
          </Pressable>
        </View>

        {/* Error Banner */}
        {error ? (
          <View style={styles.banner}>
            <Text style={[TEXT_STYLES.bodySm, { color: colors.textPrimary }]}>{error}</Text>
          </View>
        ) : null}

        {/* Hero Card - Personalized Suggestion */}
        <View style={styles.heroSection}>
          {loading ? (
            <SkeletonGroup count={1} variant="card" />
          ) : (
            <HeroCard
              title={heroSuggestion.title}
              subtitle={heroSuggestion.subtitle}
              emoji={heroSuggestion.emoji}
              actionLabel={heroSuggestion.action}
              onAction={handleHeroAction}
              gradient={['#29313E', '#4A5568']}
            />
          )}
        </View>

        {/* Sport Categories */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[TEXT_STYLES.h3, { color: colors.textPrimary }]}>
              Категории
            </Text>
            <Pressable onPress={() => router.push("/activities")} hitSlop={8}>
              <Text style={[TEXT_STYLES.label, { color: colors.textSecondary }]}>
                Все →
              </Text>
            </Pressable>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesContent}
          >
            {SPORT_CATEGORIES.map((category) => (
              <CategoryCard
                key={category.key}
                category={category}
                onPress={handleCategoryPress}
                size="medium"
              />
            ))}
          </ScrollView>
        </View>

        {/* My Activities Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[TEXT_STYLES.h3, { color: colors.textPrimary }]}>
              Мои активности
            </Text>
            <Text style={[TEXT_STYLES.bodySm, { color: colors.textSecondary }]}>
              {filteredActivities.length > 0 ? `(${filteredActivities.length})` : ''}
            </Text>
          </View>

          {/* Time Filters */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersContent}
          >
            {TIME_FILTERS.map((filter) => (
              <Pressable
                key={filter.key}
                onPress={() => setActiveFilter(filter.key)}
                style={[
                  styles.filterPill,
                  activeFilter === filter.key && styles.filterPillActive,
                ]}
              >
                <Text
                  style={[
                    TEXT_STYLES.label,
                    styles.filterText,
                    activeFilter === filter.key && styles.filterTextActive,
                  ]}
                >
                  {filter.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Activities List */}
          {loading ? (
            <SkeletonGroup count={2} variant="list-item" />
          ) : filteredActivities.length > 0 ? (
            <View style={styles.activitiesList}>
              {filteredActivities.map((activity, index) => (
                <View key={activity.activityId}>
                  <MyActivityCard
                    activity={activity}
                    organizerName={homeData?.user.username}
                    organizerAvatar={homeData?.user.avatarUrl}
                    distance="~ 1.3 км"
                    onPress={handleActivityPress}
                  />
                  {index < filteredActivities.length - 1 && (
                    <View style={{ height: SCREEN.cardGap }} />
                  )}
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <EmptyState
                emoji="🏃"
                title="Нет активностей"
                description="Начните свою первую активность или присоединитесь к существующей"
                action={{
                  label: "Создать активность",
                  onPress: handleCreateActivity,
                }}
              />
            </View>
          )}
        </View>

        {/* Quick Action FAB */}
        <Pressable
          style={[styles.fab, { backgroundColor: colors.ink }]}
          onPress={handleCreateActivity}
        >
          <MaterialIcons name="add" size={28} color={colors.textInverse} />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: SCREEN.bottomPadding + 80, // Extra space for FAB
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SCREEN.paddingHorizontal,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.lg,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.divider,
  },
  notificationBtn: {
    padding: SPACING.xs,
  },
  banner: {
    marginHorizontal: SCREEN.paddingHorizontal,
    marginBottom: SPACING.base,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.dangerBg,
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
  },
  heroSection: {
    marginBottom: SPACING.xl,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SCREEN.paddingHorizontal,
    marginBottom: SPACING.sm,
  },
  categoriesContent: {
    paddingHorizontal: SCREEN.paddingHorizontal,
    gap: SPACING.sm,
  },
  filtersContent: {
    paddingHorizontal: SCREEN.paddingHorizontal,
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  filterPill: {
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  filterPillActive: {
    backgroundColor: COLORS.ink,
    borderColor: COLORS.ink,
  },
  filterText: {
    color: COLORS.textSecondary,
  },
  filterTextActive: {
    color: COLORS.surface,
  },
  activitiesList: {
    paddingHorizontal: SCREEN.paddingHorizontal,
  },
  emptyContainer: {
    paddingHorizontal: SCREEN.paddingHorizontal,
    paddingVertical: SPACING.lg,
  },
  fab: {
    position: "absolute",
    right: SPACING.xl,
    bottom: SPACING.xl + SCREEN.bottomPadding,
    width: 56,
    height: 56,
    borderRadius: RADIUS.full,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
