import { Redirect, Tabs } from 'expo-router';
import React from 'react';

import { BottomTabBar } from '@/components/navigation/bottom-tab-bar';
import { useAuth } from '@/lib/auth/auth-context';

export default function TabLayout() {
  const { token } = useAuth();

  if (!token) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      tabBar={(props) => <BottomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Главная',
        }}
      />
      <Tabs.Screen
        name="activities"
        options={{
          title: 'Активности',
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Площадки',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Профиль',
        }}
      />
    </Tabs>
  );
}
