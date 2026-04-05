import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { MyActivityCard } from "@/components/my-activity-card";
import { SportCategoryCard } from "@/components/sport-category-card";
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

const SPORT_CATEGORIES = [
  { key: "news", label: "Новости", icon: "article" },
  { key: "running", label: "Бег", icon: "directions-run" },
  { key: "cycling", label: "Велосипед", icon: "directions-bike" },
  { key: "hiking", label: "Hiking", icon: "terrain" },
];

export default function HomeScreen() {
  const router = useRouter();
  const { token, logout } = useAuth();
  const [homeData, setHomeData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<TimeFilter>("today");
  const colors = getColor();

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    getHomeData(token)
      .then((data) => {
        if (cancelled) return;
        setHomeData(data);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        if (e instanceof ApiError) {
          if (e.status === 401) logout();
          setError(`${e.code}: ${e.message}`);
        } else {
          setError("Не удалось загрузить данные");
        }
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token, logout]);

  const filteredActivities = React.useMemo(() => {
    if (!homeData?.myActivities) return [];
    
    const now = new Date();
    const activities = homeData.myActivities;

    switch (activeFilter) {
      case "today": {
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
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
        return activities.filter((a) => new Date(a.date) <= threeDaysLater);
      }
      case "7days": {
        const sevenDaysLater = new Date(now);
        sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
        return activities.filter((a) => new Date(a.date) <= sevenDaysLater);
      }
      case "completed":
        return activities.filter((a) => a.status === "COMPLETED");
      default:
        return activities;
    }
  }, [homeData?.myActivities, activeFilter]);

  const handleCategoryPress = (categoryKey: string) => {
    if (categoryKey === "news") {
      // Navigate to news tab or screen
    } else {
      router.push("/activities");
    }
  };

  const handleNotificationPress = () => {
    // Navigate to notifications screen
  };

  const handleProfilePress = () => {
    router.push("/profile");
  };

  const handleActivityPress = (activityId: string) => {
    router.push({ pathname: "/activity/[id]", params: { id: activityId } } as any);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
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
              <Text style={[TEXT_STYLES.body, { color: colors.textSecondary }]}>Привет,</Text>
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

        {/* Question Section */}
        <Text style={[TEXT_STYLES.h3, styles.questionText]}>Чем займешься сегодня?</Text>

        {/* Sport Categories */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContent}
          style={styles.categoriesScroll}
        >
          {SPORT_CATEGORIES.map((category) => (
            <SportCategoryCard
              key={category.key}
              icon={
                <MaterialIcons
                  name={category.icon as any}
                  size={28}
                  color={colors.ink}
                />
              }
              label={category.label}
              onPress={() => handleCategoryPress(category.key)}
            />
          ))}
        </ScrollView>

        {/* My Activities Section */}
        <Text style={[TEXT_STYLES.h3, styles.sectionTitle]}>Мои активности</Text>

        {/* Time Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContent}
          style={styles.filtersScroll}
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
          <Text style={[TEXT_STYLES.body, styles.loadingText]}>Загрузка...</Text>
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
          <View style={styles.emptyState}>
            <Text style={[TEXT_STYLES.body, styles.emptyText]}>
              Нет активностей для выбранного фильтра
            </Text>
          </View>
        )}
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
    paddingBottom: SCREEN.bottomPadding,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SCREEN.paddingHorizontal,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xl,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  userAvatar: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.divider,
  },
  notificationBtn: {
    padding: 4,
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
  questionText: {
    paddingHorizontal: SCREEN.paddingHorizontal,
    marginBottom: SPACING.base,
  },
  categoriesScroll: {
    marginBottom: SPACING.xl,
  },
  categoriesContent: {
    paddingHorizontal: SCREEN.paddingHorizontal,
    gap: SPACING.sm,
  },
  sectionTitle: {
    paddingHorizontal: SCREEN.paddingHorizontal,
    marginBottom: SPACING.sm,
  },
  filtersScroll: {
    marginBottom: SPACING.base,
  },
  filtersContent: {
    paddingHorizontal: SCREEN.paddingHorizontal,
    gap: SPACING.sm,
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
  loadingText: {
    textAlign: "center",
    paddingVertical: SPACING['2xl'],
    color: COLORS.textSecondary,
  },
  emptyState: {
    paddingVertical: SPACING['3xl'],
    paddingHorizontal: SCREEN.paddingHorizontal,
    alignItems: "center",
  },
  emptyText: {
    textAlign: "center",
    color: COLORS.textSecondary,
  },
});
