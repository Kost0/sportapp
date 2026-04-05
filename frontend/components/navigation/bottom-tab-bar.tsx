import { MaterialIcons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useRouter, type Href } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS, getColor } from '@/constants/colors';
import { TEXT_STYLES } from '@/constants/typography';
import { RADIUS } from '@/constants/radius';
import { SPACING } from '@/constants/spacing';
import { shadowTabBar, shadowFab } from '@/constants/shadows';

type TabId = 'index' | 'activities' | 'map' | 'profile';

type TabSpec = {
  id: TabId;
  label: string;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
};

const TABS: TabSpec[] = [
  { id: 'index', label: 'Главная', icon: 'home' },
  { id: 'activities', label: 'Активности', icon: 'directions-run' },
  { id: 'map', label: 'Площадки', icon: 'map' },
  { id: 'profile', label: 'Профиль', icon: 'person' },
];

export function BottomTabBar({ state, navigation }: BottomTabBarProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const byName = useMemo(() => {
    const m = new Map<string, { key: string; index: number }>();
    state.routes.forEach((r, index) => m.set(r.name, { key: r.key, index }));
    return m;
  }, [state.routes]);

  const activeName = state.routes[state.index]?.name;

  const onTabPress = (name: TabId) => {
    const meta = byName.get(name);
    if (!meta) return;

    const route = state.routes[meta.index];
    const event = navigation.emit({
      type: 'tabPress',
      target: meta.key,
      canPreventDefault: true,
    });

    if (event.defaultPrevented) return;
    (navigation as any).navigate(route.name, route.params);
  };

  // Use safe area bottom inset, with a minimum of 8px for visual breathing room
  const barBottomPadding = Math.max(insets.bottom, 8);

  return (
    <View style={[styles.outer, { paddingBottom: barBottomPadding }]} pointerEvents="box-none">
      <View style={[styles.panel, shadowTabBar()]}>
        <View style={styles.row}>
          {TABS.slice(0, 2).map((t) => {
            const selected = activeName === t.id;
            return (
              <Pressable
                key={t.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => onTabPress(t.id)}
                style={({ pressed }) => [styles.tab, pressed && styles.pressed]}>
                <View style={[styles.iconCircle, selected && styles.iconCircleActive]}>
                  <MaterialIcons
                    name={t.icon}
                    size={20}
                    color={selected ? getColor().tabIconActive : getColor().tabIconInactive}
                  />
                </View>
                <Text style={[TEXT_STYLES.tabLabel, selected ? styles.labelActive : styles.labelInactive]}>
                  {t.label}
                </Text>
              </Pressable>
            );
          })}

          <View style={styles.centerSlot} />

          {TABS.slice(2).map((t) => {
            const selected = activeName === t.id;
            return (
              <Pressable
                key={t.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => onTabPress(t.id)}
                style={({ pressed }) => [styles.tab, pressed && styles.pressed]}>
                <View style={[styles.iconCircle, selected && styles.iconCircleActive]}>
                  <MaterialIcons
                    name={t.icon}
                    size={20}
                    color={selected ? getColor().tabIconActive : getColor().tabIconInactive}
                  />
                </View>
                <Text style={[TEXT_STYLES.tabLabel, selected ? styles.labelActive : styles.labelInactive]}>
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Создать"
          onPress={() => router.push('/create-activity' as Href)}
          style={({ pressed }) => [styles.plusButton, shadowFab(), pressed && styles.plusPressed]}>
          <MaterialIcons name="add" size={28} color="#FFFFFF" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    backgroundColor: 'transparent',
  },
  panel: {
    height: 88,
    backgroundColor: getColor().tabBarBg,
    borderTopWidth: 0.5,
    borderTopColor: getColor().tabBarBorder,
  },
  row: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 52,
  },
  pressed: {
    opacity: 0.85,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleActive: {
    backgroundColor: 'rgba(41, 49, 62, 0.08)',
  },
  labelActive: {
    color: getColor().tabIconActive,
  },
  labelInactive: {
    color: getColor().tabIconInactive,
  },
  centerSlot: {
    flex: 1,
  },
  plusButton: {
    position: 'absolute',
    left: '50%',
    top: -18,
    marginLeft: -32,
    width: 64,
    height: 64,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.ink,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.surface,
  },
  plusPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.96 }],
  },
});
