/**
 * Font loading hook for Montserrat and Montserrat Alternates.
 * Use this in the root layout to ensure fonts are ready before rendering.
 */

import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

// Prevent auto-hiding splash screen
SplashScreen.preventAutoHideAsync().catch(() => {
  // Ignore errors (e.g., splash screen already hidden)
});

export function useAppFonts() {
  const [fontsLoaded, fontError] = useFonts({
    // Montserrat (primary)
    'Montserrat-Regular': require('../assets/fonts/Montserrat-Regular.ttf'),
    'Montserrat-Medium': require('../assets/fonts/Montserrat-Medium.ttf'),
    'Montserrat-SemiBold': require('../assets/fonts/Montserrat-SemiBold.ttf'),
    'Montserrat-Bold': require('../assets/fonts/Montserrat-Bold.ttf'),

    // Montserrat Alternates (accent)
    'MontserratAlternates-Regular': require('../assets/fonts/MontserratAlternates-Regular.ttf'),
    'MontserratAlternates-Medium': require('../assets/fonts/MontserratAlternates-Medium.ttf'),
    'MontserratAlternates-SemiBold': require('../assets/fonts/MontserratAlternates-SemiBold.ttf'),
    'MontserratAlternates-Bold': require('../assets/fonts/MontserratAlternates-Bold.ttf'),
  });

  return { fontsLoaded, fontError };
}
