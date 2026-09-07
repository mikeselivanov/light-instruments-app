import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

const STORAGE_KEY = 'notifications:v1';
const ANDROID_CHANNEL_ID = 'daily-name';
const NOTIFICATION_TITLE = 'Имя дня';
const NOTIFICATION_BODY = 'Новое имя дня готово — откройте, чтобы узнать';

type StoredSettings = {
  enabled: boolean;
  hour: number;
  minute: number;
};

const DEFAULT_SETTINGS: StoredSettings = {
  enabled: false,
  hour: 9,
  minute: 0,
};

type NotificationSettingsContextValue = {
  enabled: boolean;
  hour: number;
  minute: number;
  isLoaded: boolean;
  osPermissionDenied: boolean;
  scheduleError: boolean;
  // Always false on native — the app is installed by definition. The web
  // build overrides this whole module (notifications.web.tsx), where it means
  // "iOS, and Push is unavailable until the app is on the Home Screen".
  installRequired: boolean;
  setEnabled: (enabled: boolean) => Promise<void>;
  setTime: (hour: number, minute: number) => Promise<void>;
  recheckPermission: () => Promise<void>;
};

const NotificationSettingsContext = createContext<NotificationSettingsContextValue | null>(null);

async function persist(settings: StoredSettings) {
  // Swallow AsyncStorage failures here so every fire-and-forget call site
  // (there are several) doesn't need its own .catch — an unpersisted write
  // just means the in-memory state and storage drift until the next
  // successful write, which is an acceptable degradation for this feature.
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings)).catch(() => {});
}

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Имя дня',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

async function cancelAll() {
  // The app only ever has one active repeating notification, so cancelling
  // everything before scheduling is simpler and more robust than tracking a
  // single id — two overlapping calls (e.g. two wheel columns settling close
  // together) each wipe the slate before scheduling their own, so the result
  // is always exactly one live notification, never a leaked duplicate.
  await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
}

async function scheduleDaily(hour: number, minute: number): Promise<string> {
  return Notifications.scheduleNotificationAsync({
    content: {
      title: NOTIFICATION_TITLE,
      body: NOTIFICATION_BODY,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: Platform.OS === 'android' ? ANDROID_CHANNEL_ID : undefined,
    },
  });
}

export function NotificationSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<StoredSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);
  const [osPermissionDenied, setOsPermissionDenied] = useState(false);
  const [scheduleError, setScheduleError] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) });
      })
      .finally(() => setIsLoaded(true));
  }, []);

  const recheckPermission = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    if (status === 'granted') {
      // Always clear the flag once permission is confirmed granted again,
      // even if `enabled` is currently false — this is what lets a user who
      // revoked-then-re-granted permission in system settings see the hint
      // disappear on their next visit, instead of it being stuck forever
      // because `enabled` was already flipped false by the original revoke.
      setOsPermissionDenied(false);
      return;
    }
    if (!settings.enabled) return;
    await cancelAll();
    const next: StoredSettings = { ...settings, enabled: false };
    setSettings(next);
    await persist(next);
    setOsPermissionDenied(true);
  };

  const setEnabled = async (nextEnabled: boolean) => {
    setScheduleError(false);
    if (nextEnabled) {
      try {
        await ensureAndroidChannel();
        const { status: existing } = await Notifications.getPermissionsAsync();
        let status = existing;
        if (status !== 'granted') {
          const req = await Notifications.requestPermissionsAsync();
          status = req.status;
        }
        if (status !== 'granted') {
          setOsPermissionDenied(true);
          return;
        }
        await cancelAll();
        await scheduleDaily(settings.hour, settings.minute);
        const next: StoredSettings = { ...settings, enabled: true };
        setSettings(next);
        await persist(next);
        setOsPermissionDenied(false);
      } catch {
        setScheduleError(true);
      }
    } else {
      await cancelAll();
      const next: StoredSettings = { ...settings, enabled: false };
      setSettings(next);
      await persist(next);
    }
  };

  const setTime = async (hour: number, minute: number) => {
    setScheduleError(false);
    if (settings.enabled) {
      try {
        await cancelAll();
        await scheduleDaily(hour, minute);
        const next: StoredSettings = { ...settings, hour, minute };
        setSettings(next);
        await persist(next);
      } catch {
        // Nothing is scheduled anymore (cancelAll already ran), so honestly
        // reflect that as disabled rather than leaving enabled: true with
        // nothing actually scheduled at the OS level.
        const next: StoredSettings = { ...settings, hour, minute, enabled: false };
        setSettings(next);
        await persist(next);
        setScheduleError(true);
      }
    } else {
      const next: StoredSettings = { ...settings, hour, minute };
      setSettings(next);
      await persist(next);
    }
  };

  const value = useMemo<NotificationSettingsContextValue>(
    () => ({
      enabled: settings.enabled,
      hour: settings.hour,
      minute: settings.minute,
      isLoaded,
      osPermissionDenied,
      scheduleError,
      installRequired: false,
      setEnabled,
      setTime,
      recheckPermission,
    }),
    [settings, isLoaded, osPermissionDenied, scheduleError]
  );

  return (
    <NotificationSettingsContext.Provider value={value}>
      {children}
    </NotificationSettingsContext.Provider>
  );
}

export function useNotificationSettings(): NotificationSettingsContextValue {
  const ctx = useContext(NotificationSettingsContext);
  if (!ctx) {
    throw new Error('useNotificationSettings must be used within NotificationSettingsProvider');
  }
  return ctx;
}
