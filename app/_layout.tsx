import { useEffect, useCallback } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { useFonts } from 'expo-font';
import { FavoritesProvider } from '../lib/favorites';
import { NotificationSettingsProvider } from '../lib/notifications';
import { colors } from '../lib/theme';
import { nameOfTheDay } from '../lib/data';

SplashScreen.preventAutoHideAsync().catch(() => {});

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PTSerif: require('../assets/fonts/PTSerif-Regular.ttf'),
    'PTSerif-Bold': require('../assets/fonts/PTSerif-Bold.ttf'),
    PTSans: require('../assets/fonts/PTSans-Regular.ttf'),
    'PTSans-Bold': require('../assets/fonts/PTSans-Bold.ttf'),
    Ashurit: require('../assets/fonts/Ashurit.ttf'),
  });

  const onLayout = useCallback(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  useEffect(() => {
    onLayout();
  }, [onLayout]);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(() => {
      const today = nameOfTheDay();
      router.push(`/names/${today.id}`);
    });
    return () => subscription.remove();
  }, []);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <FavoritesProvider>
          <NotificationSettingsProvider>
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
          </NotificationSettingsProvider>
        </FavoritesProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
