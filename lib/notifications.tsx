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
  notificationId: string | null;
};

const DEFAULT_SETTINGS: StoredSettings = {
  enabled: false,
  hour: 9,
  minute: 0,
  notificationId: null,
};

type NotificationSettingsContextValue = {
  enabled: boolean;
  hour: number;
  minute: number;
  isLoaded: boolean;
  osPermissionDenied: boolean;
  scheduleError: boolean;
  setEnabled: (enabled: boolean) => Promise<void>;
  setTime: (hour: number, minute: number) => Promise<void>;
  recheckPermission: () => Promise<void>;
};

const NotificationSettingsContext = createContext<NotificationSettingsContextValue | null>(null);

async function persist(settings: StoredSettings) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Имя дня',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

async function cancelExisting(notificationId: string | null) {
  if (!notificationId) return;
  await Notifications.cancelScheduledNotificationAsync(notificationId).catch(() => {});
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
    setSettings((current) => {
      if (!current.enabled) return current;
      Notifications.getPermissionsAsync().then(async ({ status }) => {
        if (status !== 'granted') {
          await cancelExisting(current.notificationId);
          const next: StoredSettings = { ...current, enabled: false, notificationId: null };
          setSettings(next);
          await persist(next);
          setOsPermissionDenied(true);
        } else {
          setOsPermissionDenied(false);
        }
      });
      return current;
    });
  };

  const setEnabled = async (nextEnabled: boolean) => {
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
        const notificationId = await scheduleDaily(settings.hour, settings.minute);
        const next: StoredSettings = { ...settings, enabled: true, notificationId };
        setSettings(next);
        await persist(next);
        setOsPermissionDenied(false);
        setScheduleError(false);
      } catch {
        setScheduleError(true);
      }
    } else {
      await cancelExisting(settings.notificationId);
      const next: StoredSettings = { ...settings, enabled: false, notificationId: null };
      setSettings(next);
      await persist(next);
      setScheduleError(false);
    }
  };

  const setTime = async (hour: number, minute: number) => {
    if (settings.enabled) {
      try {
        await cancelExisting(settings.notificationId);
        const notificationId = await scheduleDaily(hour, minute);
        const next: StoredSettings = { ...settings, hour, minute, notificationId };
        setSettings(next);
        await persist(next);
        setScheduleError(false);
      } catch {
        // cancelExisting already succeeded (or was a no-op), but scheduleDaily failed:
        // the OS has nothing scheduled anymore, so honestly reflect that as disabled
        // rather than leaving enabled: true pointing at a cancelled notificationId.
        const next: StoredSettings = { ...settings, hour, minute, enabled: false, notificationId: null };
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
