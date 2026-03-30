import { Stack } from 'expo-router';
import React from 'react';

export default function CreateActivityLayout() {
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
