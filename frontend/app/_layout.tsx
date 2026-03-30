import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider } from '@/lib/auth/auth-context';
import { CreateActivityProvider } from '@/lib/create-activity-context';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <CreateActivityProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen name="create-activity" options={{ headerShown: false, presentation: 'modal' }} />
              <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
              <Stack.Screen name="activity/[id]" options={{ headerShown: false }} />
            </Stack>
            <StatusBar style="dark" translucent={false} backgroundColor="#FAFAFA" />
          </ThemeProvider>
        </CreateActivityProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
