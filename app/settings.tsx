import { useLayoutEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../lib/theme';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);
const ITEM_HEIGHT = 44;
const VISIBLE_ROWS = 3;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ROWS;
const WHEEL_PADDING = ITEM_HEIGHT; // one empty row above/below so edge values can reach center

export default function Settings() {
  const insets = useSafeAreaInsets();
  // TODO(Task 4): заменить локальный useState на useNotificationSettings()
  // из lib/notifications.tsx — сигнатура хука уже зафиксирована в Task 3.
  const [enabled, setEnabled] = useState(false);
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);
  const [osPermissionDenied, setOsPermissionDenied] = useState(false);
  const [scheduleError, setScheduleError] = useState(false);

  // Task 4 sources this from the hook instead of local state; the shape
  // (single optional { text, tappable } hint) is what's being approved here.
  const hint = osPermissionDenied
    ? { text: 'Уведомления выключены в настройках телефона. Включите их в системных настройках приложения, чтобы получать напоминание.', tappable: true }
    : scheduleError
      ? { text: 'Не удалось включить уведомления, попробуйте ещё раз.', tappable: false }
      : null;

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
          trackColor={{ false: colors.hairline, true: colors.sparkSoft }}
          thumbColor={enabled ? colors.spark : colors.parchmentDim}
        />
      </View>

      {enabled && (
        <View style={styles.timeRow}>
          <Text style={styles.rowLabel}>Время</Text>
          <View style={styles.wheelGroup}>
            <TimeWheel value={hour} onChange={setHour} values={HOURS} />
            <Text style={styles.colon}>:</Text>
            <TimeWheel value={minute} onChange={setMinute} values={MINUTES} />
          </View>
        </View>
      )}

      {hint && <Text style={styles.hint}>{hint.text}</Text>}
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
    backgroundColor: 'rgba(196, 146, 61, 0.12)',
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
