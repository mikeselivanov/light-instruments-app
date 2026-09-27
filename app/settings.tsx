import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as Linking from 'expo-linking';
import { HomeButton } from '../components/HomeButton';
import { TimeStepper } from '../components/TimeStepper';
import type { ClockTime } from '../lib/stepper-math';
import { tappable } from '../lib/interaction';
import { useScreenPadding } from '../lib/safe-area';
import { colors, fonts, type } from '../lib/theme';
import { useNotificationSettings } from '../lib/notifications';
import { ScreenTransition } from '../components/ScreenTransition';

/**
 * How long the time must sit still before it is saved. On the web every save is
 * a round-trip to the push server, and holding + on the stepper walks through
 * dozens of values a second — only the one the user stops on should be sent.
 */
const COMMIT_DELAY_MS = 600;

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

  // What the stepper shows. It runs ahead of the saved time while the user is
  // pressing, and falls back in line with it whenever nothing is pending — so
  // a save the server rejected (setTime rolls back) shows up here too.
  const [draft, setDraft] = useState<ClockTime>({ hour, minute });
  const pending = useRef<{ timer: ReturnType<typeof setTimeout>; time: ClockTime } | null>(null);

  useEffect(() => {
    if (!pending.current) setDraft({ hour, minute });
  }, [hour, minute]);

  // Leaving the screen inside the delay still saves the last value.
  useEffect(
    () => () => {
      if (!pending.current) return;
      clearTimeout(pending.current.timer);
      setTime(pending.current.time.hour, pending.current.time.minute);
    },
    // Empty on purpose: this cleanup must run once, at unmount. Listing setTime
    // would re-run it — and flush a half-finished edit — whenever the
    // notification context re-renders.
    []
  );

  const changeTime = (next: ClockTime) => {
    setDraft(next);
    if (pending.current) clearTimeout(pending.current.timer);
    pending.current = {
      time: next,
      timer: setTimeout(() => {
        pending.current = null;
        setTime(next.hour, next.minute);
      }, COMMIT_DELAY_MS),
    };
  };

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
            <TimeStepper
              variant="inline"
              minuteStep={5}
              label="Время уведомления"
              value={draft}
              onChange={changeTime}
            />
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.veil,
    borderWidth: 1,
    borderColor: colors.hairlineSoft,
    borderRadius: 14,
    paddingVertical: 10,
    paddingLeft: 16,
    paddingRight: 12,
    marginBottom: 14,
  },
  hint: {
    fontFamily: fonts.body,
    ...type.small,
    color: colors.spark,
    marginTop: 4,
  },
});
