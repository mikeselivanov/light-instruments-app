import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ViewStyle,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as Linking from 'expo-linking';
import { HomeButton } from '../components/HomeButton';
import { tappable } from '../lib/interaction';
import { useScreenPadding } from '../lib/safe-area';
import { colors, fonts, type } from '../lib/theme';
import { useNotificationSettings } from '../lib/notifications';
import { ScreenTransition } from '../components/ScreenTransition';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);
const ITEM_HEIGHT = 44;
const VISIBLE_ROWS = 3;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ROWS;
const WHEEL_PADDING = ITEM_HEIGHT; // one empty row above/below so edge values can reach center

// Web-only. react-native-web ignores snapToInterval, so the wheel is snapped
// with CSS instead — without it the scroll comes to rest between rows and the
// selected value sits half outside the highlight. These properties are not in
// React Native's style types, hence the cast and living outside StyleSheet.
// `center`, not `start`. The content is padded by one row top and bottom so
// the selected value sits in the middle of three, which means the code reads
// the selection as scrollTop / ITEM_HEIGHT. Under `start` the browser snaps
// row N's top edge to the viewport top, putting its snap points one row
// higher — and the snap point for the first row lands at ITEM_HEIGHT, not 0,
// so the first value (00) could never be committed at all. `center` puts the
// snap points exactly on N * ITEM_HEIGHT, which is the coordinate system the
// rest of this component already uses.
const webWheel = {
  scroll: { scrollSnapType: 'y mandatory' } as unknown as ViewStyle,
  row: { scrollSnapAlign: 'center' } as unknown as ViewStyle,
};

export default function Settings() {
  const padding = useScreenPadding();
  const {
    enabled,
    hour,
    minute,
    isLoaded,
    osPermissionDenied,
    scheduleError,
    installRequired,
    setEnabled,
    setTime,
    recheckPermission,
  } = useNotificationSettings();

  // installRequired outranks the rest: on iOS the Push API is absent until the
  // app is on the Home Screen, so every other message would be misleading.
  const hint = installRequired
    ? {
        text: 'Чтобы получать уведомления, добавьте приложение на домашний экран: «Поделиться» → «На экран „Домой“».',
        tappable: false,
      }
    : osPermissionDenied
      ? {
          text:
            Platform.OS === 'web'
              ? 'Уведомления запрещены в настройках браузера для этого сайта. Разрешите их и вернитесь сюда.'
              : 'Уведомления выключены в настройках телефона. Нажмите, чтобы открыть системные настройки приложения и включить их.',
          // Linking.openSettings() does not exist on web, so tapping would be
          // a dead button there.
          tappable: Platform.OS !== 'web',
        }
      : scheduleError
        ? { text: 'Не удалось включить уведомления, попробуйте ещё раз.', tappable: false }
        : null;

  useFocusEffect(
    useCallback(() => {
      recheckPermission();
    }, [recheckPermission])
  );

  return (
    <ScreenTransition style={{ backgroundColor: colors.void }}>
      <View style={[styles.screen, padding]}>
        <HomeButton />
        <Text style={styles.title}>Настройки</Text>

        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>Уведомления об имени дня</Text>
            <Text style={styles.rowSub}>Раз в день напомним открыть новое имя</Text>
          </View>
          <Switch
            value={enabled}
            onValueChange={setEnabled}
            disabled={!isLoaded || installRequired}
            trackColor={{ false: colors.hairline, true: colors.sparkSoft }}
            thumbColor={enabled ? colors.spark : colors.parchmentDim}
          />
        </View>

        {enabled && (
          <View style={styles.timeRow}>
            <Text style={styles.rowLabel}>Время</Text>
            <View style={styles.wheelGroup}>
              <TimeWheel
                value={hour}
                onChange={(next) => {
                  if (next !== hour) setTime(next, minute);
                }}
                values={HOURS}
              />
              <Text style={styles.colon}>:</Text>
              <TimeWheel
                value={minute}
                onChange={(next) => {
                  if (next !== minute) setTime(hour, next);
                }}
                values={MINUTES}
              />
            </View>
          </View>
        )}

        {hint && (
          hint.tappable ? (
            <Pressable
              onPress={() => Linking.openSettings()}
              accessibilityRole="button"
              style={({ pressed }) => [tappable, pressed && styles.pressed]}
            >
              <Text style={styles.hint}>{hint.text}</Text>
            </Pressable>
          ) : (
            <Text style={styles.hint}>{hint.text}</Text>
          )
        )}
      </View>
    </ScreenTransition>
  );
}

function TimeWheel({
  value,
  onChange,
  values,
}: {
  value: number;
  onChange: (next: number) => void;
  values: number[];
}) {
  const scrollRef = useRef<ScrollView>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Where the wheel is physically parked. Lets the sync effect tell "the
  // parent accepted, we are already there" from "the parent rejected, scroll
  // back" — without it the effect re-scrolls after every commit and fights
  // the browser's own snap animation, which is what made it feel stuttery.
  const parkedIndex = useRef<number | null>(null);
  // Bumped on every commit so the sync effect re-runs even when the parent
  // rejects the change and `value` therefore stays put.
  const [syncNonce, setSyncNonce] = useState(0);

  const commitOffset = (y: number) => {
    const index = Math.round(y / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(values.length - 1, index));
    if (values[clamped] === value) return;
    parkedIndex.current = clamped;
    onChange(values[clamped]);
    setSyncNonce((n) => n + 1);
  };

  useEffect(
    () => () => {
      if (settleTimer.current) clearTimeout(settleTimer.current);
    },
    []
  );

  // react-native-web never emits onMomentumScrollEnd — the web has no notion
  // of momentum ending — so on web the wheel settles by debouncing onScroll
  // instead. Without this the value simply never changes when scrolled.
  const handleScroll =
    Platform.OS === 'web'
      ? (event: NativeSyntheticEvent<NativeScrollEvent>) => {
          const y = event.nativeEvent.contentOffset.y;
          if (settleTimer.current) clearTimeout(settleTimer.current);
          settleTimer.current = setTimeout(() => commitOffset(y), 180);
        }
      : undefined;

  // Keeps the scroll position on whatever `value` actually is. It runs on
  // mount (ScrollView otherwise starts at 0, not at `value`), whenever the
  // parent accepts a new value, and — via syncNonce — after a commit the
  // parent rejected, which is what springs the wheel back instead of leaving
  // it showing a time the app did not accept.
  useLayoutEffect(() => {
    const index = Math.max(0, values.indexOf(value));
    // Already parked there — either the mount position or a commit the parent
    // accepted. Scrolling again would only interrupt the browser mid-snap.
    if (parkedIndex.current === index) return;
    scrollRef.current?.scrollTo({ y: index * ITEM_HEIGHT, animated: false });
    parkedIndex.current = index;
  }, [value, values, syncNonce]);

  return (
    <View style={styles.wheel}>
      <View pointerEvents="none" style={styles.wheelHighlight} />
      <ScrollView
        ref={scrollRef}
        // snapToInterval is a native-only prop: react-native-web does not turn
        // it into CSS scroll snapping, so the web wheel needs the CSS itself
        // or it comes to rest between rows.
        style={[{ height: WHEEL_HEIGHT }, Platform.OS === 'web' && webWheel.scroll]}
        contentContainerStyle={{ paddingVertical: WHEEL_PADDING }}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={handleScroll}
        onMomentumScrollEnd={(e) => commitOffset(e.nativeEvent.contentOffset.y)}
      >
        {values.map((v) => (
          <View
            key={v}
            style={[styles.wheelRow, Platform.OS === 'web' && webWheel.row]}
          >
            <Text style={[styles.wheelValue, v === value && styles.wheelValueActive]}>
              {String(v).padStart(2, '0')}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.6,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.void,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  title: {
    fontFamily: fonts.displayRuBold,
    ...type.screenTitle,
    color: colors.parchment,
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.veil,
    borderWidth: 1,
    borderColor: colors.hairlineSoft,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },
  rowText: {
    flex: 1,
    paddingRight: 12,
  },
  rowLabel: {
    fontFamily: fonts.displayRuBold,
    ...type.rowTitle,
    color: colors.parchment,
  },
  rowSub: {
    fontFamily: fonts.body,
    ...type.small,
    color: colors.parchmentDim,
    marginTop: 3,
  },
  timeRow: {
    backgroundColor: colors.veil,
    borderWidth: 1,
    borderColor: colors.hairlineSoft,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },
  wheelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  wheel: {
    width: 70,
    height: WHEEL_HEIGHT,
  },
  wheelHighlight: {
    position: 'absolute',
    top: ITEM_HEIGHT,
    left: 2,
    right: 2,
    height: ITEM_HEIGHT,
    backgroundColor: colors.sparkWash,
    borderRadius: 8,
  },
  wheelRow: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelValue: {
    fontFamily: fonts.body,
    fontSize: 19,
    color: colors.parchmentDim,
    opacity: 0.5,
  },
  wheelValueActive: {
    fontFamily: fonts.displayRuBold,
    fontSize: 26,
    color: colors.parchment,
    opacity: 1,
  },
  colon: {
    fontFamily: fonts.displayRuBold,
    fontSize: 22,
    color: colors.parchmentDim,
  },
  hint: {
    fontFamily: fonts.body,
    ...type.small,
    color: colors.spark,
    marginTop: 4,
  },
});
