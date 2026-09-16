import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { router } from 'expo-router';
import { IconButton } from './IconButton';

/**
 * The control every screen below the home screen carries.
 *
 * It goes home rather than one step back. The app is a shallow hub and spoke —
 * home, a list, a name — and "one step back" is not somewhere the user can
 * predict: after swiping through names, or arriving from a notification, or
 * coming into the list via a category, the previous entry is rarely the place
 * they meant. Home always is.
 *
 * `replace`, like every other navigation in this app: nothing is ever pushed,
 * so the history stays one entry deep and the browser's own back/forward — the
 * edge swipe on Android and iOS, which no web page is allowed to intercept —
 * has nothing to move between. See the note in app/index.tsx.
 */
export function HomeButton({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <IconButton
      icon="home-outline"
      label="На главную"
      onPress={() => router.replace('/')}
      style={[styles.position, style]}
    />
  );
}

const styles = StyleSheet.create({
  position: {
    alignSelf: 'flex-start',
    marginBottom: 18,
  },
});
