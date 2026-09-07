import { useCallback, useLayoutEffect, useRef } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import { colors, fonts } from '../lib/theme';
import { useNotificationSettings } from '../lib/notifications';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);
const ITEM_HEIGHT = 44;
const VISIBLE_ROWS = 3;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ROWS;
const WHEEL_PADDING = ITEM_HEIGHT; // one empty row above/below so edge values can reach center

export default function Settings() {
  const insets = useSafeAreaInsets();
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
    <View style={[styles.screen, { paddingTop: insets.top + 20 }]}>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>← Назад</Text>
      </Pressable>
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
            style={({ pressed }) => pressed && styles.pressed}
          >
            <Text style={styles.hint}>{hint.text}</Text>
          </Pressable>
        ) : (
          <Text style={styles.hint}>{hint.text}</Text>
        )
      )}
    </View>
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
  // Sentinel `null` forces the very first layout effect run to scroll too —
  // ScrollView otherwise mounts scrolled to 0, not to `value`'s position.
  const lastScrolledValue = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (value !== lastScrolledValue.current) {
      const index = Math.max(0, values.indexOf(value));
      scrollRef.current?.scrollTo({ y: index * ITEM_HEIGHT, animated: false });
      lastScrolledValue.current = value;
    }
  }, [value, values]);

  return (
    <View style={styles.wheel}>
      <View pointerEvents="none" style={styles.wheelHighlight} />
      <ScrollView
        ref={scrollRef}
        style={{ height: WHEEL_HEIGHT }}
        contentContainerStyle={{ paddingVertical: WHEEL_PADDING }}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
          const clamped = Math.max(0, Math.min(values.length - 1, index));
          lastScrolledValue.current = values[clamped];
          onChange(values[clamped]);
        }}
      >
        {values.map((v) => (
          <View key={v} style={styles.wheelRow}>
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
    paddingHorizontal: 20,
    paddingBottom: 48,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  back: {
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: '700',
    color: colors.parchmentDim,
    marginBottom: 18,
  },
  title: {
    fontFamily: fonts.displayRuBold,
    fontSize: 22,
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
    fontSize: 14.5,
    color: colors.parchment,
  },
  rowSub: {
    fontFamily: fonts.body,
    fontSize: 11.5,
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
    fontSize: 17,
    color: colors.parchmentDim,
    opacity: 0.5,
  },
  wheelValueActive: {
    fontFamily: fonts.displayRuBold,
    fontSize: 24,
    color: colors.parchment,
    opacity: 1,
  },
  colon: {
    fontFamily: fonts.displayRuBold,
    fontSize: 20,
    color: colors.parchmentDim,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.spark,
    marginTop: 4,
  },
});
