import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { HebrewGlyphs } from './HebrewGlyphs';
import { tappable } from '../lib/interaction';
import { useScreenPadding } from '../lib/safe-area';
import { useWakeLock } from '../lib/wake-lock';
import { colors, fonts, type } from '../lib/theme';

const FADE_MS = 300;
const HINT_VISIBLE_MS = 3000;
const HINT_FADE_MS = 600;

/** The display size of the Name, and the width of the widest of the 72 blocks at it. */
const DISPLAY_GLYPH = 112;
const WIDEST_BLOCK_AT_DISPLAY = 240.5;
const MAX_GLYPH = 200;
/** The screens' content column, as in app/names/[id].tsx. */
const MAX_CONTENT_WIDTH = 480;

/**
 * The Name alone, for meditating on it: the three letters, large, centred, and
 * nothing else — no number, title, tags, buttons or description.
 *
 * A touch anywhere leaves. Nothing else on this screen can be touched, so the
 * whole screen can be the way out; the hint says so once and then fades, so
 * the first visit does not leave someone facing a screen with no controls.
 *
 * While it is up the screen is kept awake (a meditation has no touches for
 * minutes) and the status bar is hidden on the phone. The name screen switches
 * its swipe off at the same time, so a drifting thumb cannot change the Name
 * mid-meditation.
 */
export function NameMeditation({
  letters,
  onExit,
}: {
  letters: readonly string[];
  onExit: () => void;
}) {
  const { width } = useWindowDimensions();
  const { paddingLeft, paddingRight, paddingBottom } = useScreenPadding();
  const available = Math.min(width, MAX_CONTENT_WIDTH) - paddingLeft - paddingRight;
  // Sized so the widest Name still fits the width; every other Name is narrower.
  const glyph = Math.min(
    MAX_GLYPH,
    Math.floor((DISPLAY_GLYPH * available) / WIDEST_BLOCK_AT_DISPLAY)
  );

  const opacity = useRef(new Animated.Value(0)).current;
  const hint = useRef(new Animated.Value(1)).current;
  const leaving = useRef(false);

  useWakeLock(true);

  useEffect(() => {
    const fadeIn = Animated.timing(opacity, {
      toValue: 1,
      duration: FADE_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    const hintOut = Animated.sequence([
      Animated.delay(HINT_VISIBLE_MS),
      Animated.timing(hint, { toValue: 0, duration: HINT_FADE_MS, useNativeDriver: true }),
    ]);
    fadeIn.start();
    hintOut.start();
    return () => {
      fadeIn.stop();
      hintOut.stop();
    };
  }, [opacity, hint]);

  const exit = () => {
    if (leaving.current) return;
    leaving.current = true;
    Animated.timing(opacity, {
      toValue: 0,
      duration: FADE_MS,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => onExit());
  };

  return (
    <Animated.View style={[styles.fill, { opacity }]}>
      <StatusBar hidden />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Выйти из созерцания"
        onPress={exit}
        style={[styles.fill, tappable]}
      >
        <View style={styles.center}>
          <HebrewGlyphs letters={letters} variant="bare" size={glyph} />
        </View>
        <Animated.Text style={[styles.hint, { bottom: paddingBottom + 16, opacity: hint }]}>
          Коснитесь, чтобы вернуться
        </Animated.Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    backgroundColor: colors.void,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontFamily: fonts.body,
    ...type.small,
    color: colors.parchmentDim,
  },
});
