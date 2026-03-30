import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActivityCard } from "@/components/activity-card";
import { COLORS } from "@/constants/colors";
import type { ActivityListItem } from "@/lib/api/activities";
import { listActivities } from "@/lib/api/activities";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/auth-context";

export default function HomeScreen() {
  const router = useRouter();
  const { token, logout } = useAuth();
  const [items, setItems] = useState<ActivityListItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        <Text style={styles.headerTitle}>Искать активность</Text>
        <View style={styles.headerIcons}>
          <MaterialIcons name="tune" size={20} color={COLORS.textSecondary} />
          <Pressable onPress={logout} hitSlop={10}>
            <MaterialIcons
              name="logout"
              size={20}
              color={COLORS.textSecondary}
            />
          </Pressable>
        </View>
      </View>

      {error ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>{error}</Text>
        </View>
      ) : null}

      <FlatList
        data={items}
        keyExtractor={(item) => item.activityId}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <Text style={styles.sectionTitle}>
            {busy ? 'Загружаю…' : canLoad ? 'Ближайшие активности' : 'Требуется вход'}
          </Text>
        }
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
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
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  headerIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  banner: {
    marginHorizontal: 20,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 107, 107, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.25)',
  },
  bannerText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: "600",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.textPrimary,
    paddingHorizontal: 4,
    paddingBottom: 10,
  },
});
