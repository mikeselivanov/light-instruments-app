import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

const DURATION = 240;
/** How far the arriving screen travels. Short: a long slide reads as sluggish. */
const DISTANCE = 26;

/**
 * Slides and fades a screen's content in as it arrives.
 *
 * It exists because the navigator's own animation does nothing on the web.
 * expo-router's Stack is @react-navigation/native-stack, which delegates to
 * react-native-screens — and react-native-screens ships ScreenStack.web.js as
 * literally `const ScreenStack = View`, with no transform or animation in it
 * anywhere. Sampling every frame of a real navigation confirmed it: 74 frames,
 * not one of them moving, zero running web animations. Screens simply swapped,
 * the way a web page does and an app does not. So the slide_from_left /
 * slide_from_right chosen in the root layout was reaching nobody — every user
 * of this app is on the web build.
 *
 * This animates the arriving screen only. The departing one is already gone by
 * the time React renders the new route, so it cannot be moved without changing
 * navigator: @react-navigation/stack does animate on web, but it pulls in a
 * masked-view native module for header effects this app has no headers for.
 * Most of the perceived difference is in the arrival anyway.
 */
export function ScreenTransition({
  from = 'right',
  style,
  children,
}: {
  from?: 'left' | 'right';
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: DURATION,
      // Decelerating: fast off the mark, settling at the end, which is how
      // native stack pushes are eased.
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [progress]);

  return (
    <Animated.View
      style={[
        styles.fill,
        style,
        {
          opacity: progress,
          transform: [
            {
              translateX: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [from === 'left' ? -DISTANCE : DISTANCE, 0],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
