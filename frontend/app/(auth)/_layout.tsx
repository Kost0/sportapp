import { Redirect, Stack } from 'expo-router';
import React from 'react';

import { useAuth } from '@/lib/auth/auth-context';

export default function AuthLayout() {
  const { token } = useAuth();

  if (token) {
    return <Redirect href="/" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
