import { MaterialIcons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useRouter, type Href } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS } from '@/constants/colors';

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
    // BottomTabBarProps navigation is hard to type strictly across mixed route params.
    // Use runtime route.name/params.
    (navigation as any).navigate(route.name, route.params);
  };

  const barBottomPadding = insets.bottom;

  return (
    <View style={[styles.outer, { paddingBottom: barBottomPadding }]} pointerEvents="box-none">
      <View style={styles.panel}>
        <View style={styles.row}>
          {TABS.slice(0, 2).map((t) => {
            const selected = activeName === t.id;
            return (
              <Pressable
                key={t.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => onTabPress(t.id)}
                style={({ pressed }) => [styles.tab, pressed ? styles.pressed : null]}>
                <MaterialIcons
                  name={t.icon}
                  size={20}
                  color={selected ? COLORS.ink : COLORS.textSecondary}
                />
                <Text style={[styles.label, selected ? styles.labelActive : styles.labelInactive]}>
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
                style={({ pressed }) => [styles.tab, pressed ? styles.pressed : null]}>
                <MaterialIcons
                  name={t.icon}
                  size={20}
                  color={selected ? COLORS.ink : COLORS.textSecondary}
                />
                <Text style={[styles.label, selected ? styles.labelActive : styles.labelInactive]}>
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
          style={({ pressed }) => [styles.plusButton, pressed ? styles.plusPressed : null]}>
          <MaterialIcons name="add" size={26} color={COLORS.surface} />
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
    height: 90,
    backgroundColor: 'rgba(255, 255, 255, 0.97)',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    shadowColor: 'rgba(73, 77, 90, 0.12)',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 1,
    shadowRadius: 40,
    elevation: 12,
  },
  row: {
    height: 70,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 18,
    paddingBottom: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 3,
    height: 40,
  },
  pressed: {
    opacity: 0.92,
  },
  label: {
    fontSize: 9,
    fontWeight: '600',
  },
  labelActive: {
    color: COLORS.ink,
  },
  labelInactive: {
    color: COLORS.textSecondary,
  },
  centerSlot: {
    flex: 1,
  },
  plusButton: {
    position: 'absolute',
    left: '50%',
    top: 0,
    marginLeft: -35,
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.ink,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.surface,
    shadowColor: 'rgba(41, 49, 62, 0.18)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 16,
  },
  plusPressed: {
    opacity: 0.94,
    transform: [{ scale: 0.99 }],
  },
});
