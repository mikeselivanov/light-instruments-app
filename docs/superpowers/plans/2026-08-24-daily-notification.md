# Уведомление «Имя дня» Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Опциональное ежедневное локальное уведомление «Имя дня» с экраном настроек (тумблер + выбор времени), которое по тапу открывает сегодняшнее имя.

**Architecture:** Один повторяющийся локальный триггер `expo-notifications` (`SchedulableTriggerInputTypes.DAILY`), без сервера/FCM/фоновых задач. Настройки живут в новом React-контексте `lib/notifications.tsx` (по образцу существующего `lib/favorites.tsx`), персистятся в AsyncStorage. Экран `app/settings.tsx` использует собственный (не сторонний) компонент выбора времени — прокручиваемое «колесо» на чистом `ScrollView` (`snapToInterval`), а не `@react-native-community/datetimepicker`, потому что эта библиотека **не поддерживает веб-платформу**, а весь визуальный QA в этом проекте идёт через `npm run web` + Playwright-скриншоты; сторонний пикер сломал бы этот процесс и сделал бы невозможным обязательный гейт согласования дизайна (см. ниже). Точка входа на экран настроек — иконка-шестерёнка (`@expo/vector-icons`, уже бандлится с Expo, отдельная зависимость не нужна) рядом с датой на главном экране, а не отдельная плитка в сетке: пробный вариант с плиткой визуально «осиротел» под полноширинной плиткой «Все имена», решение пересмотрено пользователем в ходе Task 2.

**Tech Stack:** Expo SDK 54, `expo-notifications`, `expo-router`, React Context + `@react-native-async-storage/async-storage`, `expo-linking` (`Linking.openSettings()`).

**Spec:** [docs/superpowers/specs/2026-08-24-daily-notification-design.md](../specs/2026-08-24-daily-notification-design.md)

## Global Constraints

- Уведомление — строго локальное (`expo-notifications`, `scheduleNotificationAsync`), без сервера, без FCM/Google Play Services, без `expo-task-manager`/`expo-background-fetch`.
- Уведомления **выключены по умолчанию** (opt-in) — разрешение ОС запрашивается только при включении тумблера пользователем.
- Текст уведомления фиксированный, без имени: заголовок «Имя дня», текст «Новое имя дня готово — откройте, чтобы узнать».
- Тап по уведомлению открывает `app/names/[id]` с именем, пересчитанным в момент тапа через `nameOfTheDay()` — не «замороженным» на момент показа.
- Тумблер обязан отражать реальное состояние OS-разрешения: если пользователь отозвал разрешение в системных настройках телефона, тумблер должен сам погаснуть при следующем открытии экрана настроек, с подсказкой.
- **Обязательный гейт: дизайн `app/settings.tsx` и точки входа на него с `app/index.tsx` должен быть представлен пользователю (скриншот веб-превью) и явно одобрен, прежде чем будет написана бизнес-логика уведомлений (`lib/notifications.tsx`) и уж тем более прежде любой EAS-сборки.** Задача 2 ниже заканчивается этим гейтом и не может считаться выполненной без явного «да» от пользователя. Гейт уже пройден: пользователь увидел два раунда HTML-мокапов (плитка vs ссылка vs шестерёнка на главном экране; степпер vs одометр vs колесо-барабан для времени) вне дерева приложения и подтвердил финальный вариант — иконка-шестерёнка рядом с датой + прокручиваемое колесо времени. Задача 2 переписывается под этот вариант.
- Платформы: Android и iOS оба поддерживаются кодом (`expo-notifications` работает одинаково), но в этом плане собирается и проверяется только Android-сборка — это единственная платформа, которую проект сейчас публикует.

---

### Task 1: Зависимость `expo-notifications` и конфигурация Android-иконки уведомлений

**Files:**
- Modify: `package.json` (через `npx expo install`)
- Modify: `app.json`
- Create: `assets/notification-icon.png`

**Interfaces:**
- Produces: пакет `expo-notifications` доступен для импорта как `import * as Notifications from 'expo-notifications'` в последующих задачах.

- [ ] **Step 1: Установить зависимость**

```bash
npx expo install expo-notifications
```

- [ ] **Step 2: Сгенерировать иконку уведомлений нужного размера**

Google требует 96×96 PNG (белый силуэт на прозрачном фоне) для Android-уведомлений. Переиспользуем уже существующий monochrome-слой адаптивной иконки — он спроектирован по той же спецификации (белый силуэт для темизации Android 13+):

```bash
sips -z 96 96 assets/android-icon-monochrome.png --out assets/notification-icon.png
```

Точная белизна силуэта проверяется на реальном устройстве в Task 6 (это build-time настройка — по документации Expo она в принципе не проявляется без нативной пересборки, так что раньше её не проверить).

- [ ] **Step 3: Добавить конфиг-плагин в `app.json`**

Открыть [app.json](../../../app.json) и заменить `plugins`:

```json
"plugins": [
  "expo-router",
  "expo-font",
  [
    "expo-notifications",
    {
      "icon": "./assets/notification-icon.png",
      "color": "#c4923d"
    }
  ]
]
```

- [ ] **Step 4: Проверить типы**

Run: `npx tsc --noEmit`
Expected: без ошибок (конфиг не влияет на TS, но фиксируем чистое состояние перед следующей задачей).

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json app.json assets/notification-icon.png
git commit -m "Add expo-notifications dependency and Android notification icon config"
```

---

### Task 2: Статичный UI экрана «Настройки» + иконка-шестерёнка на главном экране — ГЕЙТ СОГЛАСОВАНИЯ ДИЗАЙНА

Экран строится на локальном `useState` (заглушка), без реальной логики уведомлений — она появится в Task 4. Цель этой задачи — получить утверждённый пользователем визуальный дизайн, прежде чем писать `lib/notifications.tsx`.

**Files:**
- Create: `app/settings.tsx`
- Modify: `app/index.tsx`

**Interfaces:**
- Produces: `TimeWheel` — локальный компонент внутри `app/settings.tsx` с пропсами `{ value: number; onChange: (next: number) => void; values: number[] }`. Task 4 переиспользует этот же компонент без изменений его API.
- Produces: маршрут `/settings` (файл-роут `app/settings.tsx`, default export).
- Produces: иконка-шестерёнка в `app/index.tsx`, открывающая `/settings` (не плитка в сетке — см. Architecture).

- [ ] **Step 1: Написать `app/settings.tsx`**

```tsx
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
```

`WHEEL_HEIGHT`/`ITEM_HEIGHT` are module-level constants shared by the styles and the scroll math — do not duplicate their values as literals elsewhere in the file.

- [ ] **Step 2: Добавить иконку-шестерёнку рядом с датой на главном экране**

В [app/index.tsx](../../../app/index.tsx) добавить импорт:

```tsx
import { Ionicons } from '@expo/vector-icons';
```

(`@expo/vector-icons` уже установлен транзитивно как зависимость пакета `expo` — отдельно ставить не нужно, импорт разрешится через вложенный `node_modules/expo/node_modules/@expo/vector-icons`.)

Заменить:

```tsx
      <Text style={styles.kicker}>{dateLabel}</Text>
```

на:

```tsx
      <View style={styles.topBar}>
        <Text style={styles.kicker}>{dateLabel}</Text>
        <Pressable
          onPress={() => router.push('/settings')}
          style={({ pressed }) => [styles.gearBtn, pressed && styles.pressed]}
          hitSlop={8}
        >
          <Ionicons name="settings-outline" size={20} color={colors.parchmentDim} />
        </Pressable>
      </View>
```

И в `styles`, заменить:

```tsx
  kicker: {
    fontFamily: fonts.body,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.parchmentDim,
    marginBottom: 18,
  },
```

на:

```tsx
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  kicker: {
    fontFamily: fonts.body,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.parchmentDim,
  },
  gearBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.veil,
    borderWidth: 1,
    borderColor: colors.hairlineSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
```

Не добавлять плитку «Настройки» в `<View style={styles.grid}>` — сетка тайлов остаётся ровно из 5 существующих плиток (Введение, Случайное имя, Категории, Избранное, Все имена), без изменений.

- [ ] **Step 3: Проверить типы**

Run: `npx tsc --noEmit`
Expected: без ошибок.

- [ ] **Step 4: Отрендерить веб-превью и снять скриншоты**

```bash
npm run web
```

Открыть главный экран и `/settings` в браузере (или через уже используемый в проекте Playwright-скрипт для скриншотов), снять минимум 3 скриншота:
1. Главный экран с иконкой-шестерёнкой рядом с датой (и без лишней плитки в сетке).
2. `/settings` с выключенным тумблером.
3. `/settings` с включённым тумблером и видимым колесом времени (временно установить `useState(true)` в Step 1 для `enabled`, снять скриншот, вернуть обратно на `false`).
4. `/settings` с видимой подсказкой про OS-разрешение (временно установить `useState(true)` для `osPermissionDenied`, снять скриншот, вернуть обратно на `false`). Тот же визуальный блок `hint` переиспользуется для варианта «не удалось включить» (`scheduleError`) в Task 3/4 — отдельный скриншот для него не нужен, дизайн контейнера уже покрыт этим кадром.

- [ ] **Step 5: СТОП — показать скриншоты пользователю и дождаться явного одобрения**

Показать все 4 скриншота пользователю (например, открыть PNG-файлы через `open`, как это делалось для остальных экранов в этом проекте). Дизайн уже согласован через два раунда HTML-мокапов вне дерева приложения (см. Architecture) — этот шаг подтверждает, что финальная реализация в реальном коде визуально совпадает с одобренными мокапами, а не открывает дизайн заново. Если реализация разошлась с утверждённым видом — внести правки в `app/settings.tsx`/`app/index.tsx`, вернуться к Step 4. **Не переходить к Task 3, пока пользователь явно не подтвердит финальные скриншоты.**

- [ ] **Step 6: Commit (только после одобрения)**

```bash
git add app/settings.tsx app/index.tsx
git commit -m "Add settings screen UI mockup and home gear-icon entry point (design approved)"
```

---

### Task 3: `lib/notifications.tsx` — хранение настроек, разрешения, планирование

**Files:**
- Create: `lib/notifications.tsx`

**Interfaces:**
- Consumes: `AsyncStorage` (`@react-native-async-storage/async-storage`), `Notifications` (`expo-notifications`), `Platform` (`react-native`).
- Produces:
  - `NotificationSettingsProvider({ children }: { children: ReactNode })` — React-компонент.
  - `useNotificationSettings(): NotificationSettingsContextValue`, где:
    ```ts
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
    ```
  Task 4 и Task 5 используют ровно эти имена и сигнатуры. `scheduleError` — редкий случай сбоя `scheduleNotificationAsync` (спека требует явный откат тумблера с подсказкой «не удалось включить»).

- [ ] **Step 1: Написать `lib/notifications.tsx`**

```tsx
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
      try {
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
```

- [ ] **Step 2: Проверить типы**

Run: `npx tsc --noEmit`
Expected: без ошибок. Если `Notifications.SchedulableTriggerInputTypes` или `Notifications.AndroidImportance` не резолвятся — версия `expo-notifications`, установленная в Task 1, не совпадает с той, что описана в [docs.expo.dev/versions/v54.0.0/sdk/notifications](https://docs.expo.dev/versions/v54.0.0/sdk/notifications/); свериться с фактическими экспортами через `node -e "console.log(Object.keys(require('expo-notifications')))"`.

- [ ] **Step 3: Commit**

```bash
git add lib/notifications.tsx
git commit -m "Add notification settings context: storage, permissions, scheduling"
```

---

### Task 4: Подключить `app/settings.tsx` к реальной логике

Требует одобренного в Task 2 дизайна — эта задача меняет только источник состояния, не JSX-разметку.

**Files:**
- Modify: `app/settings.tsx`

**Interfaces:**
- Consumes: `useNotificationSettings()` из `lib/notifications.tsx` (Task 3).

- [ ] **Step 1: Заменить локальный `useState` на реальный хук**

В [app/settings.tsx](../../../app/settings.tsx) заменить:

```tsx
// TODO(Task 4): заменить локальный useState на useNotificationSettings()
// из lib/notifications.tsx — сигнатура хука уже зафиксирована в Task 3.
const [enabled, setEnabled] = useState(false);
const [hour, setHour] = useState(9);
const [minute, setMinute] = useState(0);
const [osPermissionDenied, setOsPermissionDenied] = useState(false);
```

на:

```tsx
const {
  enabled,
  hour,
  minute,
  osPermissionDenied,
  scheduleError,
  setEnabled,
  setTime,
  recheckPermission,
} = useNotificationSettings();

const hint = osPermissionDenied
  ? { text: 'Уведомления выключены в настройках телефона. Нажмите, чтобы открыть системные настройки приложения и включить их.', tappable: true }
  : scheduleError
    ? { text: 'Не удалось включить уведомления, попробуйте ещё раз.', tappable: false }
    : null;
```

и добавить импорт:

```tsx
import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { useNotificationSettings } from '../lib/notifications';
```

- [ ] **Step 2: Пересчитывать OS-разрешение при каждом открытии экрана**

Добавить в компонент `Settings`, сразу после деструктуризации хука:

```tsx
useFocusEffect(
  useCallback(() => {
    recheckPermission();
  }, [recheckPermission])
);
```

- [ ] **Step 3: Обновить обработчики `TimeWheel`**

Заменить:

```tsx
<TimeWheel value={hour} onChange={setHour} values={HOURS} />
<Text style={styles.colon}>:</Text>
<TimeWheel value={minute} onChange={setMinute} values={MINUTES} />
```

на:

```tsx
<TimeWheel value={hour} onChange={(next) => setTime(next, minute)} values={HOURS} />
<Text style={styles.colon}>:</Text>
<TimeWheel value={minute} onChange={(next) => setTime(hour, next)} values={MINUTES} />
```

`TimeWheel` already re-syncs its scroll position whenever its `value` prop changes for any reason (see the `lastScrolledValue` ref + `useLayoutEffect` in Step 1) — including once `AsyncStorage` finishes loading with a persisted value different from the default. No extra work is needed here for that; this note exists only so you don't reintroduce the bug by "simplifying" `TimeWheel` back to a mount-only scroll.

- [ ] **Step 4: Добавить ссылку на системные настройки в подсказку**

Заменить:

```tsx
{hint && <Text style={styles.hint}>{hint.text}</Text>}
```

на:

```tsx
{hint && (
  hint.tappable ? (
    <Pressable onPress={() => Linking.openSettings()}>
      <Text style={styles.hint}>{hint.text}</Text>
    </Pressable>
  ) : (
    <Text style={styles.hint}>{hint.text}</Text>
  )
)}
```

и добавить импорт `Linking` из `expo-linking`:

```tsx
import * as Linking from 'expo-linking';
```

- [ ] **Step 5: Проверить типы**

Run: `npx tsc --noEmit`
Expected: без ошибок.

- [ ] **Step 6: Ручная проверка в веб-превью**

```bash
npm run web
```

Открыть `/settings`, включить тумблер (в вебе `expo-notifications` не поддерживает реальный запрос разрешения — ожидается, что `setEnabled(true)` либо тихо завершится без ошибки в консоли, либо код не упадёт; полная проверка разрешений — в Task 6 на Android). Проверить, что структура экрана не изменилась по сравнению с одобренным в Task 2 скриншотом.

- [ ] **Step 7: Commit**

```bash
git add app/settings.tsx
git commit -m "Wire settings screen to real notification settings context"
```

---

### Task 5: Провайдер и обработка тапа по уведомлению в `app/_layout.tsx`

**Files:**
- Modify: `app/_layout.tsx`

**Interfaces:**
- Consumes: `NotificationSettingsProvider` (Task 3), `NAMES`/`nameOfTheDay` из `lib/data.ts` (уже существуют).

- [ ] **Step 1: Обернуть дерево в `NotificationSettingsProvider` и настроить обработчик**

В [app/_layout.tsx](../../../app/_layout.tsx) добавить импорты:

```tsx
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { NotificationSettingsProvider } from '../lib/notifications';
import { nameOfTheDay } from '../lib/data';
```

Сразу после `SplashScreen.preventAutoHideAsync().catch(() => {});` добавить глобальный обработчик поведения уведомлений в foreground:

```tsx
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});
```

- [ ] **Step 2: Подписаться на тап по уведомлению**

Внутри компонента `RootLayout`, после существующих `useEffect`/`useCallback`, добавить:

```tsx
useEffect(() => {
  const subscription = Notifications.addNotificationResponseReceivedListener(() => {
    const today = nameOfTheDay();
    router.push(`/names/${today.id}`);
  });
  return () => subscription.remove();
}, []);
```

- [ ] **Step 3: Обернуть дерево в провайдер**

Заменить весь блок:

```tsx
        <FavoritesProvider>
          <View style={{ flex: 1, backgroundColor: colors.void }}>
            <StatusBar style="light" />
            <Stack
              screenOptions={({ route }) => ({
                headerShown: false,
                contentStyle: { backgroundColor: colors.void },
                // Swiping to the previous name (`dir=prev`) should feel like
                // going backward — slide in from the left instead of the
                // app-wide default.
                animation:
                  (route.params as { dir?: string } | undefined)?.dir === 'prev'
                    ? 'slide_from_left'
                    : 'slide_from_right',
              })}
            />
          </View>
        </FavoritesProvider>
```

на:

```tsx
        <FavoritesProvider>
          <NotificationSettingsProvider>
            <View style={{ flex: 1, backgroundColor: colors.void }}>
              <StatusBar style="light" />
              <Stack
                screenOptions={({ route }) => ({
                  headerShown: false,
                  contentStyle: { backgroundColor: colors.void },
                  // Swiping to the previous name (`dir=prev`) should feel like
                  // going backward — slide in from the left instead of the
                  // app-wide default.
                  animation:
                    (route.params as { dir?: string } | undefined)?.dir === 'prev'
                      ? 'slide_from_left'
                      : 'slide_from_right',
                })}
              />
            </View>
          </NotificationSettingsProvider>
        </FavoritesProvider>
```

- [ ] **Step 4: Проверить типы**

Run: `npx tsc --noEmit`
Expected: без ошибок.

- [ ] **Step 5: Ручная проверка в веб-превью**

```bash
npm run web
```

Открыть главный экран → `/settings` → назад — приложение не должно падать и не должно выбрасывать неотловленные ошибки в консоли браузера (реальный тап по уведомлению недоступен в вебе, проверяется в Task 6).

- [ ] **Step 6: Commit**

```bash
git add app/_layout.tsx
git commit -m "Wire notification provider and tap-to-open-today's-name handling"
```

---

### Task 6: Ручная проверка на Android-устройстве/эмуляторе (нельзя проверить в этом окружении разработки)

Реальная доставка запланированного локального уведомления, системный permission-prompt и build-time иконка недоступны для проверки в текущем окружении (нет запущенного Android-эмулятора/устройства). Эта задача — чек-лист для ручного прогона после сборки.

**Files:** нет изменений кода.

- [ ] **Step 1: Собрать preview-APK**

```bash
eas build --platform android --profile preview
```

- [ ] **Step 2: Установить APK на устройство/эмулятор и открыть приложение**

- [ ] **Step 3: Включить тумблер на `/settings`**

Ожидается: системный диалог запроса разрешения на уведомления (Android 13+); после разрешения тумблер остаётся включённым, ошибок в logcat нет.

- [ ] **Step 4: Проверить иконку и текст уведомления**

Временно установить время на `/settings` на ближайшую минуту, дождаться уведомления. Проверить:
- иконка в шторке — белый силуэт (не квадрат-заглушка) на фоне цвета `#c4923d`;
- заголовок «Имя дня», текст «Новое имя дня готово — откройте, чтобы узнать».

- [ ] **Step 5: Проверить тап по уведомлению**

Тап должен открыть `app/names/[id]` с сегодняшним именем дня (сверить с тем, что показано на главном экране в карточке «Имя дня»).

- [ ] **Step 6: Проверить отзыв OS-разрешения**

В системных настройках телефона выключить уведомления для приложения. Вернуться в приложение, открыть `/settings` — тумблер должен сам погаснуть, должна появиться подсказка-ссылка на системные настройки.

- [ ] **Step 7: Проверить выключение тумблера**

Включить разрешение обратно в системе, в приложении включить и затем выключить тумблер. Убедиться, что запланированное уведомление больше не приходит (подождать смены минуты, за которую оно было выставлено).

- [ ] **Step 8: Зафиксировать результат**

Если все пункты пройдены — фича готова к следующей публикационной сборке (`eas build --platform android --profile production` / `rustore`, отдельным явным запросом пользователя, как и раньше в этом проекте). Если что-то не прошло — завести конкретные найденные проблемы как отдельные задачи, а не чинить их «по ходу» этой ручной проверки.
