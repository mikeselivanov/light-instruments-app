import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  dropSubscription,
  getSubscription,
  needsInstallForPush,
  pushSupported,
  sendSubscription,
  subscribe,
} from './push-client';

// Metro picks this file over notifications.tsx for the web build. The contract
// is identical apart from installRequired, so the screens do not branch on
// platform.
//
// The scheduling itself lives on the server: the web has no API for "every day
// at 09:00" — Notification Triggers never shipped anywhere — so the chosen time
// and timezone are stored server-side and a per-minute tick does the sending.

const STORAGE_KEY = 'notifications:v1';
const VAPID_PUBLIC_KEY = process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY ?? '';

type StoredSettings = { enabled: boolean; hour: number; minute: number };
const DEFAULT_SETTINGS: StoredSettings = { enabled: false, hour: 9, minute: 0 };

type NotificationSettingsContextValue = {
  enabled: boolean;
  hour: number;
  minute: number;
  isLoaded: boolean;
  osPermissionDenied: boolean;
  scheduleError: boolean;
  installRequired: boolean;
  setEnabled: (enabled: boolean) => Promise<void>;
  setTime: (hour: number, minute: number) => Promise<void>;
  recheckPermission: () => Promise<void>;
};

const NotificationSettingsContext = createContext<NotificationSettingsContextValue | null>(null);

async function persist(settings: StoredSettings) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings)).catch(() => {});
}

export function NotificationSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<StoredSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);
  const [osPermissionDenied, setOsPermissionDenied] = useState(false);
  const [scheduleError, setScheduleError] = useState(false);
  const [installRequired, setInstallRequired] = useState(false);

  useEffect(() => {
    setInstallRequired(needsInstallForPush());
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) });
      })
      .finally(() => setIsLoaded(true));
  }, []);

  const recheckPermission = async () => {
    setInstallRequired(needsInstallForPush());
    if (!pushSupported()) return;
    if (Notification.permission === 'granted') {
      setOsPermissionDenied(false);
      return;
    }
    if (!settings.enabled) return;
    // Permission was revoked in browser settings while the toggle was on.
    const existing = await getSubscription();
    if (existing) await dropSubscription(existing).catch(() => {});
    const next = { ...settings, enabled: false };
    setSettings(next);
    await persist(next);
    setOsPermissionDenied(true);
  };

  const setEnabled = async (nextEnabled: boolean) => {
    setScheduleError(false);

    if (!nextEnabled) {
      const existing = await getSubscription();
      if (existing) await dropSubscription(existing).catch(() => {});
      const next = { ...settings, enabled: false };
      setSettings(next);
      await persist(next);
      return;
    }

    if (needsInstallForPush()) {
      setInstallRequired(true);
      return;
    }
    if (!pushSupported()) {
      setScheduleError(true);
      return;
    }
    if (!VAPID_PUBLIC_KEY) {
      // A build-time misconfiguration, not something the user can act on, so
      // it goes to the console rather than the UI. Expo only inlines env vars
      // prefixed EXPO_PUBLIC_, so a .env holding plain VAPID_PUBLIC_KEY leaves
      // this empty and pushManager.subscribe() fails with something cryptic.
      console.error(
        'EXPO_PUBLIC_VAPID_PUBLIC_KEY is empty — check .env and rebuild. ' +
          'The EXPO_PUBLIC_ prefix is required; Expo ignores env vars without it.'
      );
      setScheduleError(true);
      return;
    }

    try {
      // Called straight off the user's tap: iOS only grants permission in
      // response to direct interaction.
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setOsPermissionDenied(true);
        return;
      }
      const subscription = await subscribe(VAPID_PUBLIC_KEY);
      await sendSubscription(subscription, settings.hour, settings.minute);
      const next = { ...settings, enabled: true };
      setSettings(next);
      await persist(next);
      setOsPermissionDenied(false);
    } catch {
      setScheduleError(true);
    }
  };

  const setTime = async (hour: number, minute: number) => {
    setScheduleError(false);
    if (settings.enabled) {
      try {
        const subscription = await getSubscription();
        if (!subscription) throw new Error('no subscription');
        await sendSubscription(subscription, hour, minute);
        const next = { ...settings, hour, minute };
        setSettings(next);
        await persist(next);
      } catch {
        // Nothing is scheduled server-side at the new time, so reflect that
        // honestly rather than leaving enabled: true over nothing.
        const next = { ...settings, hour, minute, enabled: false };
        setSettings(next);
        await persist(next);
        setScheduleError(true);
      }
    } else {
      const next = { ...settings, hour, minute };
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
      installRequired,
      setEnabled,
      setTime,
      recheckPermission,
    }),
    [settings, isLoaded, osPermissionDenied, scheduleError, installRequired]
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
