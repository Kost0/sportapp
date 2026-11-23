import { Redirect, Stack, usePathname } from 'expo-router';
import React from 'react';
import { CreateActivityProvider, useCreateActivity } from '@/lib/create-activity-context';

export default function CreateActivityLayout() {
  return <CreateActivityProvider><CreateActivityStack /></CreateActivityProvider>;
}

function CreateActivityStack() {
  const { data } = useCreateActivity();
  const pathname = usePathname();
  if (!data.sport && pathname !== '/create-activity') return <Redirect href="/create-activity" />;
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="details" />
      <Stack.Screen name="datetime" />
      <Stack.Screen name="location" />
      <Stack.Screen name="participants" />
      <Stack.Screen name="confirm" />
    </Stack>
  );
}
