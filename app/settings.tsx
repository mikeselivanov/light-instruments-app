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

  // setTime closes over the provider's settings of the render it came from and
  // branches on `enabled`. The timer and the unmount flush fire later, so they
  // must call the latest one — a stale setTime would save with stale settings
  // (e.g. write enabled:false after the user has just switched it on).
  const setTimeRef = useRef(setTime);
  setTimeRef.current = setTime;

  useEffect(() => {
    if (!pending.current) setDraft({ hour, minute });
  }, [hour, minute]);

  // Switching notifications off abandons an edit still waiting to be saved:
  // nothing should be sent after the user turned them off.
  const dropPending = () => {
    if (!pending.current) return;
    clearTimeout(pending.current.timer);
    pending.current = null;
    setDraft({ hour, minute });
  };

  // At the tap itself, not only once `enabled` flips: setEnabled(false) first
  // awaits the push-subscription lookup, and the timer could fire in between.
  const toggle = (next: boolean) => {
    if (!next) dropPending();
    setEnabled(next);
  };

  // Also when something else turns them off (recheckPermission).
  useEffect(() => {
    if (!enabled) dropPending();
  }, [enabled]);

  // Leaving the screen inside the delay still saves the last value.
  useEffect(
    () => () => {
      if (!pending.current) return;
      clearTimeout(pending.current.timer);
      setTimeRef.current(pending.current.time.hour, pending.current.time.minute);
    },
    // Empty on purpose: this cleanup must run once, at unmount; it reaches the
    // current setTime through setTimeRef.
    []
  );

  const changeTime = (next: ClockTime) => {
    setDraft(next);
    if (pending.current) clearTimeout(pending.current.timer);
    pending.current = {
      time: next,
      timer: setTimeout(() => {
        pending.current = null;
        setTimeRef.current(next.hour, next.minute);
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
            onValueChange={toggle}
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
