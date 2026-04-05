import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
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
  const [error, setError] = useState<string | null>(null);
  const colors = getColor();

  const canLoad = useMemo(() => Boolean(token), [token]);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    setBusy(true);
    setError(null);

    listActivities(token, 20, 0)
      .then((res) => {
        if (cancelled) return;
        setItems(res.items ?? []);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        if (e instanceof ApiError) {
          if (e.status === 401) logout();
          setError(`${e.code}: ${e.message}`);
        } else {
          setError('Failed to load activities');
        }
      })
      .finally(() => {
        if (cancelled) return;
        setBusy(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token, logout]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={[TEXT_STYLES.h3, { color: colors.ink }]}>Искать активность</Text>
        <View style={styles.headerIcons}>
          <Pressable hitSlop={10}>
            <MaterialIcons name="search" size={20} color={colors.textSecondary} />
          </Pressable>
          <Pressable hitSlop={10}>
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
