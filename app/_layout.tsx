import { useEffect, useCallback } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { FavoritesProvider } from '../lib/favorites';
import { colors } from '../lib/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PTSerif: require('../assets/fonts/PTSerif-Regular.ttf'),
    'PTSerif-Bold': require('../assets/fonts/PTSerif-Bold.ttf'),
    PTSans: require('../assets/fonts/PTSans-Regular.ttf'),
    'PTSans-Bold': require('../assets/fonts/PTSans-Bold.ttf'),
    FrankRuhlLibre: require('../assets/fonts/FrankRuhlLibre.ttf'),
  });

  const onLayout = useCallback(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  useEffect(() => {
    onLayout();
  }, [onLayout]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <FavoritesProvider>
          <View style={{ flex: 1, backgroundColor: colors.void }}>
            <StatusBar style="light" />
            <Stack
              screenOptions={({ route }) => ({
                headerShown: false,
                contentStyle: { backgroundColor: colors.void },
                // Swiping to the previous name (`dir=prev`) should feel like
                // going backward — slide in from the left instead of the
                // app-wide default.
                animation:
                  (route.params as { dir?: string } | undefined)?.dir === 'prev'
                    ? 'slide_from_left'
                    : 'slide_from_right',
              })}
            />
          </View>
        </FavoritesProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
