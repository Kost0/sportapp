import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Platform } from 'react-native';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAppFonts } from '@/hooks/use-app-fonts';
import { AuthProvider, useAuth } from '@/lib/auth/auth-context';
import { COLORS_MODES } from '@/constants/colors';

export const unstable_settings = {
  anchor: '(tabs)',
};

function Navigation() {
  const { token, isLoading } = useAuth();
  if (isLoading) return null;
  return (
    <Stack>
      <Stack.Protected guard={Boolean(token)}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        {/* Web drawers trap focus/pointer events away from nested native pickers. */}
        <Stack.Screen name="create-activity" options={{ headerShown: false, presentation: Platform.OS === 'web' ? 'card' : 'modal' }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        <Stack.Screen name="activity/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="court/[id]" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={!token}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { fontsLoaded, fontError } = useAppFonts();

  // Don't render until fonts are loaded
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <Navigation />
            <StatusBar
              style={colorScheme === 'dark' ? 'light' : 'dark'}
              translucent={false}
              backgroundColor={colorScheme === 'dark' ? COLORS_MODES.dark.bg : COLORS_MODES.light.bg}
            />
          </ThemeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
