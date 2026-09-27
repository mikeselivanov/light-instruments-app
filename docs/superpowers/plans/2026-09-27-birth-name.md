# Имя по рождению — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Экран `/birth`, где пользователь выбирает способ (по дате или по времени
рождения), получает одно из 72 имён с объяснением расчёта и может сделать его «моим» в
Избранном. Плюс новый выбор времени (степпер) вместо колеса в Настройках.

**Architecture:** Расчёт — чистые модули `lib/birth-name.ts` (Солнце через
astronomy-engine, 20-минутные отрезки, стыки) и `lib/stepper-math.ts` (арифметика
степперов). Интерфейс — один маршрут `app/birth.tsx` с фазами в локальном состоянии,
без параметров URL: так дата рождения нигде не остаётся. «Моё имя» — поле рядом с
избранным в `lib/favorites.tsx`, ключ `myName:v1`.

**Tech Stack:** Expo SDK 54, expo-router 6, React Native 0.81 / react-native-web 0.21,
TypeScript strict, AsyncStorage, **astronomy-engine 2.1.19** (новая зависимость).

**Spec:** [docs/superpowers/specs/2026-09-26-birth-name-design.md](../specs/2026-09-26-birth-name-design.md)

Мокап: <https://claude.ai/artifact/3gWSjH1XBSDdrngFQVTBhx> — экраны 1–7 и вариант
«Время · Б — степпер». В мокапе иврит набран строкой; в приложении он всегда идёт через
`HebrewGlyphs`.

## Global Constraints

Действуют в каждой задаче.

- **Дата и время рождения не сохраняются нигде.** Ни в AsyncStorage/localStorage, ни в
  URL (`/birth` — без search params), ни в логах. Хранится только
  `myName:v1 = { id, method }`.
- **Одна новая зависимость — `astronomy-engine`, версия `~2.1.19`.** Больше никаких:
  ни `react-native-svg`, ни date-библиотек, ни `Intl`-полифилов. Круг и полоса рисуются
  обычными `View`.
- **Навигация только `router.replace`.** Никогда `push`/`back`. Причина:
  [app/index.tsx:14-27](../../../app/index.tsx#L14-L27).
- **Иврит только через `HebrewGlyphs`.** Он даёт Ашурит, порядок справа налево, конечные
  формы и точки между буквами. **В новых местах с `variant="compact"` передавать
  `dotRatio={DISPLAY_DOT_RATIO}`** — пользователь просил маленькие точки, а не жирные.
- Цвета — только из `colors` в `lib/theme.ts`, размеры шрифта — из `type`.
- Строки по-русски прямо в коде. Кнопка на результате называется **«В избранное»**
  (не «Сделать моим именем»).
- Каждый экран ниже главного: `<HomeButton />`, обёртка `<ScreenTransition>`, отступы
  `useScreenPadding()`. Всё нажимаемое получает стиль `tappable`.
- Документация Expo — строго v54: <https://docs.expo.dev/versions/v54.0.0/>.
- Коммиты: сообщение в повелительном наклонении по-английски, как в `git log`, и строка
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` в конце.

## Как здесь проверяют

Тестового фреймворка в проекте нет, и этот план его не заводит.

1. **Чистая логика** компилируется штатным `tsc` в папку скретчпада и проверяется
   `node --test`. Путь скретчпада дальше — `$SCRATCH`:

   ```bash
   export SCRATCH=<скретчпад сессии>/birth
   mkdir -p "$SCRATCH/built"
   # tsc оставит в birth-name.js `from 'astronomy-engine'`; node ищет пакет рядом с файлом.
   ln -sfn "$PWD/node_modules" "$SCRATCH/built/node_modules"
   # Скомпилированные .js — ES-модули.
   echo '{"type":"module"}' > "$SCRATCH/built/package.json"
   ```

   Компиляция (из корня репозитория):

   ```bash
   ./node_modules/.bin/tsc lib/stepper-math.ts lib/birth-name.ts --outDir "$SCRATCH/built" \
     --target es2020 --module es2020 --moduleResolution node --strict --skipLibCheck
   ```

   `birth-name.ts` берёт из `stepper-math.ts` только типы (`import type`) — `tsc` такой
   импорт стирает, так что выходные файлы запускаются в node без сборщика. Появится
   импорт значения между ними — node упадёт на `from './stepper-math'` без расширения.

2. **Экраны** проверяются Playwright'ом против `npm run web` (`http://localhost:8081`),
   **с эмуляцией касаний**, а не кликами: десктопный клик не ловит ошибки
   `touch-action`. Удержание кнопки степпера — это как раз касание, которое длится.

   Один раз за сессию:

   ```bash
   cd "$SCRATCH" && npm init -y >/dev/null && npm i playwright && npx playwright install chromium
   ```

   ```js
   // $SCRATCH/harness.mjs
   import { chromium, devices } from 'playwright';

   export async function open(path, { storage = {}, notifications = false } = {}) {
     const browser = await chromium.launch();
     const ctx = await browser.newContext({ ...devices['iPhone 13'] }); // hasTouch: true
     // Без выданного разрешения recheckPermission на экране Настроек выключает
     // уведомления, и строка времени исчезает раньше, чем её успеют проверить.
     if (notifications) await ctx.grantPermissions(['notifications']);
     // AsyncStorage на вебе — это localStorage; так тест задаёт начальное состояние.
     await ctx.addInitScript((s) => {
       for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v);
     }, storage);
     const page = await ctx.newPage();
     const cdp = await ctx.newCDPSession(page);
     await page.goto('http://localhost:8081' + path);
     await page.waitForTimeout(1500);
     return { browser, ctx, page, cdp };
   }

   async function touch(cdp, type, x, y) {
     await cdp.send('Input.dispatchTouchEvent', {
       type,
       touchPoints: type === 'touchEnd' ? [] : [{ x, y }],
     });
   }

   /** Центр элемента после прокрутки к нему: CDP бьёт в координаты вьюпорта. */
   async function center(locator) {
     await locator.scrollIntoViewIfNeeded();
     const b = await locator.boundingBox();
     return [b.x + b.width / 2, b.y + b.height / 2];
   }

   export async function tapEl(cdp, locator) {
     const [x, y] = await center(locator);
     await touch(cdp, 'touchStart', x, y);
     await touch(cdp, 'touchEnd', x, y);
   }

   /** Палец лежит на элементе `ms` миллисекунд. */
   export async function holdEl(cdp, page, locator, ms) {
     const [x, y] = await center(locator);
     await touch(cdp, 'touchStart', x, y);
     await page.waitForTimeout(ms);
     await touch(cdp, 'touchEnd', x, y);
   }
   ```

   Скрипты проверок лежат в `$SCRATCH` и в репозиторий не коммитятся.

## File Structure

| Файл | Ответственность |
|---|---|
| `lib/stepper-math.ts` | Типы `CalendarDate`/`ClockTime`, арифметика шагов (wrap, дни месяца, границы дат, смещение UTC), разбор набранных цифр, `formatClock`. Чистый. |
| `lib/birth-name.ts` | Долгота Солнца, номер имени по долготе и по времени, стыки и момент перехода, подписи («23° Тельца», «UTC+3»). Чистый, импортирует только astronomy-engine. |
| `components/Stepper.tsx` | Примитивы `StepperColumn` (▲ значение ▼) и `StepperInline` (− значение +): нажатие = шаг, удержание = повтор с ускорением, нажатие на значение = ввод цифрами. |
| `components/TimeStepper.tsx` | Время на степперах: `large` (две колонки) и `inline` (одна строка). |
| `components/DateStepper.tsx` | Дата тремя колонками: день, месяц, год. |
| `components/ZodiacRing.tsx` | Круг 72 × 5° с выделенной частью и Солнцем. |
| `components/DayStrip.tsx` | Сутки 72 × 20 минут с выделенным отрезком. |
| `app/birth.tsx` | Экран: ввод → результат / «на стыке». |
| `lib/favorites.tsx` | *(правка)* `myName`, `setMyName`, `methodLabel`; снятие звезды снимает «Моё». |
| `components/NameRow.tsx` | *(правка)* проп `mine` — подсветка, плашка «Моё · …», мелкая точка. |
| `app/favorites.tsx` | *(правка)* «моё» первым. |
| `app/index.tsx` | *(правка)* плитка «Имя по рождению» / «Моё имя». |
| `app/settings.tsx` | *(правка)* колесо → `TimeStepper inline`, сохранение с задержкой 600 мс. |
| `CLAUDE.md` | *(правка)* архитектура: новые маршрут и модули. |

---

### Task 1: Расчёт — astronomy-engine, `lib/stepper-math.ts`, `lib/birth-name.ts`

**Files:**
- Modify: `package.json`, `package-lock.json` (зависимость)
- Create: `lib/stepper-math.ts`, `lib/birth-name.ts`
- Test: `$SCRATCH/stepper-math.test.mjs`, `$SCRATCH/birth-name.test.mjs` (не коммитятся)

**Interfaces:**
- Produces (`lib/stepper-math.ts`): `type CalendarDate = { year; month /* 1–12 */; day }`,
  `type ClockTime = { hour; minute }`, `FIRST_YEAR = 1900`, `MONTHS_GENITIVE: string[]`,
  `OFFSET_MIN/MAX/STEP`, `wrap(value, size)`, `daysInMonth(year, month)`,
  `clampDate(date, today)`, `stepDate(date, 'day'|'month'|'year', 1|-1, today)`,
  `toMinutes(t)`, `fromMinutes(total)`, `stepOffset(offset, 1|-1)`,
  `parseTypedNumber(text, min, max): number|null`, `parseTypedTime(text): ClockTime|null`,
  `formatClock(t): string`.
- Produces (`lib/birth-name.ts`): `type BirthMethod = 'sun' | 'time'`,
  `DEGREES_PER_NAME = 5`, `MINUTES_PER_NAME = 20`, `BOUNDARY_WINDOW_MINUTES = 5`,
  `sunLongitude(utcMs)`, `nameIdBySun(lon)`, `nameIdByTime(t)`, `timeSlot(id)`,
  `deviceOffsetMinutes(date, time|null)`, `localToUtc(date, time, offset)`,
  `utcToLocalTime(utcMs, offset)`, `resolveBySun(date, time|null, offset): SunResult`,
  `zodiacLabel(lon)`, `formatOffset(offset)`, `roundToFive(t)`.
  `SunResult = { kind: 'single'; id; longitude } | { kind: 'boundary'; before; after; crossing: ClockTime; crossingUtc: number }`.
  Смещение везде — **минуты к востоку от UTC** (UTC+3 → 180).

- [ ] **Step 1: Поставить зависимость**

```bash
npm i astronomy-engine@~2.1.19
```

Ожидаемо: в `package.json` → `"astronomy-engine": "~2.1.19"`. Пакет чистый JS (MIT), без
нативного кода, `npx expo install` для него не нужен.

- [ ] **Step 2: Написать тесты**

`$SCRATCH/stepper-math.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  wrap, daysInMonth, clampDate, stepDate, toMinutes, fromMinutes, stepOffset,
  parseTypedNumber, parseTypedTime, OFFSET_MIN, OFFSET_MAX,
} from './built/stepper-math.js';

const today = { year: 2026, month: 9, day: 27 };

test('wrap по кругу в обе стороны', () => {
  assert.equal(wrap(24, 24), 0);
  assert.equal(wrap(-1, 24), 23);
  assert.equal(wrap(-5, 60), 55);
});

test('дней в месяце, включая високосный февраль', () => {
  assert.equal(daysInMonth(2000, 2), 29);
  assert.equal(daysInMonth(1900, 2), 28);
  assert.equal(daysInMonth(2024, 2), 29);
  assert.equal(daysInMonth(1990, 4), 30);
});

test('день крутится внутри месяца и не переносит месяц', () => {
  assert.deepEqual(stepDate({ year: 1990, month: 4, day: 30 }, 'day', 1, today), { year: 1990, month: 4, day: 1 });
  assert.deepEqual(stepDate({ year: 1990, month: 4, day: 1 }, 'day', -1, today), { year: 1990, month: 4, day: 30 });
});

test('смена месяца поджимает день: 31 марта ▲ → 30 апреля', () => {
  assert.deepEqual(stepDate({ year: 1990, month: 3, day: 31 }, 'month', 1, today), { year: 1990, month: 4, day: 30 });
  assert.deepEqual(stepDate({ year: 1990, month: 12, day: 5 }, 'month', 1, today), { year: 1990, month: 1, day: 5 });
});

test('29 февраля високосного года ▼ по году → 28 февраля', () => {
  assert.deepEqual(stepDate({ year: 2000, month: 2, day: 29 }, 'year', -1, today), { year: 1999, month: 2, day: 28 });
});

test('год упирается в 1900 и в сегодня, дата не бывает в будущем', () => {
  assert.equal(stepDate({ year: 1900, month: 6, day: 1 }, 'year', -1, today).year, 1900);
  assert.equal(stepDate({ year: 2026, month: 6, day: 1 }, 'year', 1, today).year, 2026);
  assert.deepEqual(clampDate({ year: 2026, month: 12, day: 1 }, today), today);
});

test('минуты суток по кругу', () => {
  assert.equal(toMinutes({ hour: 9, minute: 5 }), 545);
  assert.deepEqual(fromMinutes(-5), { hour: 23, minute: 55 });
  assert.deepEqual(fromMinutes(1440), { hour: 0, minute: 0 });
});

test('смещение UTC: шаг 15 минут, края не переходятся', () => {
  assert.equal(stepOffset(180, 1), 195);
  assert.equal(stepOffset(OFFSET_MIN, -1), OFFSET_MIN);
  assert.equal(stepOffset(OFFSET_MAX, 1), OFFSET_MAX);
});

test('ввод числа в колонку', () => {
  assert.equal(parseTypedNumber('07', 0, 23), 7);
  assert.equal(parseTypedNumber('24', 0, 23), null);
  assert.equal(parseTypedNumber('1a', 0, 23), null);
  assert.equal(parseTypedNumber('1985', 1900, 2026), 1985);
});

test('ввод времени целиком', () => {
  assert.deepEqual(parseTypedTime('9:05'), { hour: 9, minute: 5 });
  assert.deepEqual(parseTypedTime('09.05'), { hour: 9, minute: 5 });
  assert.deepEqual(parseTypedTime('0905'), { hour: 9, minute: 5 });
  assert.deepEqual(parseTypedTime('905'), { hour: 9, minute: 5 });
  assert.equal(parseTypedTime('24:00'), null);
  assert.equal(parseTypedTime('9:60'), null);
  assert.equal(parseTypedTime('abc'), null);
});
```

`$SCRATCH/birth-name.test.mjs`. Эталонные моменты — из таблицы USNO «Earth's Seasons»
(<https://aa.usno.navy.mil/data/Earth_Seasons>). Если сеть есть, сверь их с таблицей
перед запуском; менять допуск, чтобы тест прошёл, нельзя.

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  sunLongitude, nameIdBySun, nameIdByTime, timeSlot, localToUtc, utcToLocalTime,
  resolveBySun, zodiacLabel, formatOffset, roundToFive,
} from './built/birth-name.js';
import { formatClock } from './built/stepper-math.js';

// Equinoxes and solstices, UTC, from the USNO "Earth's Seasons" table
// (https://aa.usno.navy.mil/data/Earth_Seasons). At these moments the Sun's
// longitude is exactly 0°, 90°, 180°, 270°.
const USNO = [
  ['1990-03-20T21:19Z', 0],
  ['2000-03-20T07:35Z', 0],
  ['2000-06-21T01:48Z', 90],
  ['2000-09-22T17:28Z', 180],
  ['2000-12-21T13:37Z', 270],
  ['2024-03-20T03:06Z', 0],
  ['2024-06-20T20:51Z', 90],
  ['2024-09-22T12:44Z', 180],
  ['2024-12-21T09:21Z', 270],
];

test('долгота Солнца сходится с таблицей USNO в пределах 2 минут', () => {
  // The Sun moves ~0.0007° a minute; 2 minutes is ~0.0014°.
  for (const [iso, deg] of USNO) {
    const lon = sunLongitude(Date.parse(iso));
    let diff = lon - deg;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    assert.ok(Math.abs(diff) < 0.0014, `${iso}: ${lon}`);
  }
});

test('номер имени по долготе: части по 5°, от 0° Овна', () => {
  assert.equal(nameIdBySun(0), 1);
  assert.equal(nameIdBySun(4.999), 1);
  assert.equal(nameIdBySun(5), 2);
  assert.equal(nameIdBySun(53.14), 11);
  assert.equal(nameIdBySun(359.99), 72);
  assert.equal(nameIdBySun(360), 1);
});

test('номер имени по времени: 72 отрезка по 20 минут от полуночи', () => {
  assert.equal(nameIdByTime({ hour: 0, minute: 0 }), 1);
  assert.equal(nameIdByTime({ hour: 0, minute: 19 }), 1);
  assert.equal(nameIdByTime({ hour: 0, minute: 20 }), 2);
  assert.equal(nameIdByTime({ hour: 7, minute: 40 }), 24);
  assert.equal(nameIdByTime({ hour: 23, minute: 59 }), 72);
  assert.deepEqual(timeSlot(24), { from: { hour: 7, minute: 40 }, to: { hour: 7, minute: 59 } });
});

test('локальное время ↔ UTC при фиксированном смещении', () => {
  const utc = localToUtc({ year: 1990, month: 5, day: 14 }, { hour: 7, minute: 40 }, 180);
  assert.equal(new Date(utc).toISOString(), '1990-05-14T04:40:00.000Z');
  assert.deepEqual(utcToLocalTime(utc, 180), { hour: 7, minute: 40 });
  assert.deepEqual(utcToLocalTime(utc, -330), { hour: 23, minute: 10 });
});

test('14 мая 1990, 07:40 UTC+3 — одно имя, № 11, 23° Тельца', () => {
  const r = resolveBySun({ year: 1990, month: 5, day: 14 }, { hour: 7, minute: 40 }, 180);
  assert.equal(r.kind, 'single');
  assert.equal(r.id, 11);
  assert.equal(zodiacLabel(r.longitude), '23° Тельца');
});

test('14 мая 1990 без времени — тоже № 11, стыка нет', () => {
  const r = resolveBySun({ year: 1990, month: 5, day: 14 }, null, 180);
  assert.deepEqual([r.kind, r.id], ['single', 11]);
});

test('2 ноября 1985 без времени, UTC+3 — стык № 44 → № 45 около 14:47', () => {
  const r = resolveBySun({ year: 1985, month: 11, day: 2 }, null, 180);
  assert.equal(r.kind, 'boundary');
  assert.deepEqual([r.before, r.after], [44, 45]);
  assert.deepEqual(r.crossing, { hour: 14, minute: 47 });
  assert.equal(formatClock(roundToFive(r.crossing)), '14:45');
});

test('2 ноября 1985 со временем — одно имя по обе стороны границы', () => {
  const date = { year: 1985, month: 11, day: 2 };
  assert.equal(resolveBySun(date, { hour: 9, minute: 0 }, 180).id, 44);
  assert.equal(resolveBySun(date, { hour: 20, minute: 0 }, 180).id, 45);
});

test('время в пределах 5 минут от границы — всё равно стык', () => {
  const r = resolveBySun({ year: 1985, month: 11, day: 2 }, { hour: 14, minute: 45 }, 180);
  assert.equal(r.kind, 'boundary');
});

test('стык через 0° Овна: № 72 → № 1 в день равноденствия', () => {
  // 2000-03-20 07:35 UTC is the equinox; UTC offset 0.
  const r = resolveBySun({ year: 2000, month: 3, day: 20 }, null, 0);
  assert.equal(r.kind, 'boundary');
  assert.deepEqual([r.before, r.after], [72, 1]);
  assert.deepEqual(r.crossing, { hour: 7, minute: 35 });
});

test('подпись смещения', () => {
  assert.equal(formatOffset(180), 'UTC+3');
  assert.equal(formatOffset(330), 'UTC+5:30');
  assert.equal(formatOffset(-210), 'UTC−3:30');
  assert.equal(formatOffset(0), 'UTC');
});

test('округление до 5 минут переходит через полночь', () => {
  assert.deepEqual(roundToFive({ hour: 23, minute: 58 }), { hour: 0, minute: 0 });
});
```

- [ ] **Step 3: Запустить и убедиться, что падает**

```bash
./node_modules/.bin/tsc lib/stepper-math.ts lib/birth-name.ts --outDir "$SCRATCH/built" \
  --target es2020 --module es2020 --moduleResolution node --strict --skipLibCheck
```

Ожидаемо: `error TS6053: File 'lib/stepper-math.ts' not found`.

- [ ] **Step 4: Написать `lib/stepper-math.ts`**

```ts
/**
 * Arithmetic behind the steppers: what one press of ▲ or ▼ does to a time, a
 * date or a UTC offset, and how typed digits are read. Pure, so the rules can be
 * checked without a screen — and so a wrap or a clamp is decided in one place
 * rather than in three components.
 */

export type CalendarDate = { year: number; month: number; day: number }; // month 1–12
export type ClockTime = { hour: number; minute: number };

export const FIRST_YEAR = 1900;
export const MINUTES_PER_DAY = 1440;
/** UTC offsets in use run from −12:00 to +14:00, on quarter hours (Nepal is +5:45). */
export const OFFSET_MIN = -720;
export const OFFSET_MAX = 840;
export const OFFSET_STEP = 15;

export const MONTHS_GENITIVE = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

/** Wraps into [0, size): a clock's ▲ on 23 gives 0, its ▼ on 0 gives 23. */
export function wrap(value: number, size: number): number {
  return ((value % size) + size) % size;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function compare(a: CalendarDate, b: CalendarDate): number {
  return a.year - b.year || a.month - b.month || a.day - b.day;
}

/** Keeps a date real and within [1 January 1900, today]. */
export function clampDate(date: CalendarDate, today: CalendarDate): CalendarDate {
  const year = Math.min(Math.max(date.year, FIRST_YEAR), today.year);
  const day = Math.min(Math.max(date.day, 1), daysInMonth(year, date.month));
  const next = { year, month: date.month, day };
  return compare(next, today) > 0 ? today : next;
}

/**
 * One press on one column of the date stepper. Day and month wrap inside their
 * own column and never carry into the next — the columns are three separate
 * dials, and a day that rolled the month over would move a value the user was
 * not touching. Year does not wrap: 1900 and this year are hard ends.
 */
export function stepDate(
  date: CalendarDate,
  field: 'day' | 'month' | 'year',
  delta: 1 | -1,
  today: CalendarDate
): CalendarDate {
  if (field === 'day') {
    const size = daysInMonth(date.year, date.month);
    return clampDate({ ...date, day: wrap(date.day - 1 + delta, size) + 1 }, today);
  }
  if (field === 'month') {
    return clampDate({ ...date, month: wrap(date.month - 1 + delta, 12) + 1 }, today);
  }
  return clampDate({ ...date, year: date.year + delta }, today);
}

export function toMinutes({ hour, minute }: ClockTime): number {
  return hour * 60 + minute;
}

export function fromMinutes(total: number): ClockTime {
  const t = wrap(total, MINUTES_PER_DAY);
  return { hour: Math.floor(t / 60), minute: t % 60 };
}

export function stepOffset(offset: number, delta: 1 | -1): number {
  return Math.min(Math.max(offset + delta * OFFSET_STEP, OFFSET_MIN), OFFSET_MAX);
}

/** Typed digits for one column: «7» → 7, «07» → 7; out of range or not digits → null. */
export function parseTypedNumber(text: string, min: number, max: number): number | null {
  if (!/^\d{1,4}$/.test(text.trim())) return null;
  const n = Number(text.trim());
  return n >= min && n <= max ? n : null;
}

/**
 * A typed clock time: «9:05», «09.05», «0905», «905». Anything else — or 24:00,
 * or 9:60 — is null, and the caller keeps the value it had.
 */
export function parseTypedTime(text: string): ClockTime | null {
  const t = text.trim();
  const m = /^(\d{1,2})[:.\s](\d{2})$/.exec(t) ?? /^(\d{1,2})(\d{2})$/.exec(t);
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  return hour < 24 && minute < 60 ? { hour, minute } : null;
}

/** 7:05 → «07:05». */
export function formatClock({ hour, minute }: ClockTime): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}
```

- [ ] **Step 5: Написать `lib/birth-name.ts`**

```ts
import { MakeTime, SearchSunLongitude, SunPosition } from 'astronomy-engine';
import type { CalendarDate, ClockTime } from './stepper-math';

/**
 * Which one of the 72 Names belongs to a birth.
 *
 * The mapping comes from angelology (Lenain, «La Science cabalistique», 1823),
 * not from Berg's book, which picks a name by the task at hand. Its order of the
 * 72 is the order of Exodus 14:19–21 — the same as assets/data/names.ru.json —
 * so the number computed here is a DivineName id as is.
 *
 * Pure: no React, no storage. A birth date passes through here and is never
 * kept anywhere — see the privacy section of the spec.
 */

export type BirthMethod = 'sun' | 'time';


const MINUTE = 60_000;
const DAY = 86_400_000;

/** Degrees of the Sun's circle each name holds: 360 / 72. */
export const DEGREES_PER_NAME = 5;
/** Minutes of the day each name holds: 1440 / 72. */
export const MINUTES_PER_NAME = 20;

/**
 * How close to a boundary, either side, a birth still counts as "between two
 * names" even with a time given. The calculation agrees with the USNO season
 * tables to about a minute, but a remembered birth time is rarely better than
 * five, and naming one of two names with confidence the input cannot support
 * would be worse than asking.
 */
export const BOUNDARY_WINDOW_MINUTES = 5;

/**
 * Apparent geocentric ecliptic longitude of the Sun, degrees in [0, 360), true
 * equinox of date — the quantity the seasons are defined by, so 0° is the
 * March equinox exactly.
 */
export function sunLongitude(utcMs: number): number {
  return SunPosition(MakeTime(new Date(utcMs))).elon;
}

export function nameIdBySun(longitude: number): number {
  const lon = ((longitude % 360) + 360) % 360;
  return Math.floor(lon / DEGREES_PER_NAME) + 1;
}

export function nameIdByTime({ hour, minute }: ClockTime): number {
  return Math.floor((hour * 60 + minute) / MINUTES_PER_NAME) + 1;
}

/** The 20-minute slot a time falls into, as clock times: 07:40 → 07:40–07:59. */
export function timeSlot(id: number): { from: ClockTime; to: ClockTime } {
  const start = (id - 1) * MINUTES_PER_NAME;
  const end = start + MINUTES_PER_NAME - 1;
  return {
    from: { hour: Math.floor(start / 60), minute: start % 60 },
    to: { hour: Math.floor(end / 60), minute: end % 60 },
  };
}

/**
 * The device's UTC offset, minutes east, as it stood at that local moment.
 *
 * `Date`'s local-time constructor applies the OS time zone database with its
 * history — the same rules that put the USSR on "decree time" or moved a
 * country's summer time — so this is the offset the birth actually happened
 * under, not today's. It needs no `Intl` time-zone support, which Hermes does
 * not guarantee on every Android build.
 */
export function deviceOffsetMinutes(date: CalendarDate, time: ClockTime | null): number {
  const t = time ?? { hour: 12, minute: 0 };
  return -new Date(date.year, date.month - 1, date.day, t.hour, t.minute).getTimezoneOffset();
}

export function localToUtc(date: CalendarDate, time: ClockTime, offsetMinutes: number): number {
  return (
    Date.UTC(date.year, date.month - 1, date.day, time.hour, time.minute) - offsetMinutes * MINUTE
  );
}

/** The local clock time of a UTC moment under a fixed offset. */
export function utcToLocalTime(utcMs: number, offsetMinutes: number): ClockTime {
  const d = new Date(utcMs + offsetMinutes * MINUTE);
  return { hour: d.getUTCHours(), minute: d.getUTCMinutes() };
}

/** When the Sun reaches the start of name `id`'s part of the circle, searching forward. */
function crossingUtc(id: number, fromUtc: number): number {
  const target = (id - 1) * DEGREES_PER_NAME;
  const found = SearchSunLongitude(target, MakeTime(new Date(fromUtc)), 2);
  if (!found) throw new Error(`Sun does not reach ${target}° within 2 days`);
  return found.date.getTime();
}

export type SunResult =
  | { kind: 'single'; id: number; longitude: number }
  | {
      kind: 'boundary';
      before: number;
      after: number;
      /** Moment the Sun passes from `before` to `after`, local to the offset used. */
      crossing: ClockTime;
      /** The same moment as a UTC timestamp, to place the Sun for either candidate. */
      crossingUtc: number;
    };

/**
 * Name by the Sun's position. Without a time the whole local day is checked:
 * the Sun covers a name's 5° in about five days, so one day in five holds a
 * boundary, and on that day the name depends on the hour.
 */
export function resolveBySun(
  date: CalendarDate,
  time: ClockTime | null,
  offsetMinutes: number
): SunResult {
  const [from, to] = time
    ? [
        localToUtc(date, time, offsetMinutes) - BOUNDARY_WINDOW_MINUTES * MINUTE,
        localToUtc(date, time, offsetMinutes) + BOUNDARY_WINDOW_MINUTES * MINUTE,
      ]
    : [
        localToUtc(date, { hour: 0, minute: 0 }, offsetMinutes),
        localToUtc(date, { hour: 0, minute: 0 }, offsetMinutes) + DAY - MINUTE,
      ];

  const before = nameIdBySun(sunLongitude(from));
  const after = nameIdBySun(sunLongitude(to));

  if (before === after) {
    const at = time ? localToUtc(date, time, offsetMinutes) : (from + to) / 2;
    const longitude = sunLongitude(at);
    return { kind: 'single', id: nameIdBySun(longitude), longitude };
  }

  const crossing = crossingUtc(after, from);
  return {
    kind: 'boundary',
    before,
    after,
    crossing: utcToLocalTime(crossing, offsetMinutes),
    crossingUtc: crossing,
  };
}

const SIGNS_GENITIVE = [
  'Овна', 'Тельца', 'Близнецов', 'Рака', 'Льва', 'Девы',
  'Весов', 'Скорпиона', 'Стрельца', 'Козерога', 'Водолея', 'Рыб',
];

/** 53.14 → «23° Тельца». Whole degrees, rounded down, as a position is read. */
export function zodiacLabel(longitude: number): string {
  const lon = ((longitude % 360) + 360) % 360;
  return `${Math.floor(lon % 30)}° ${SIGNS_GENITIVE[Math.floor(lon / 30)]}`;
}

/** 180 → «UTC+3», 330 → «UTC+5:30», -210 → «UTC−3:30», 0 → «UTC». */
export function formatOffset(offsetMinutes: number): string {
  if (offsetMinutes === 0) return 'UTC';
  const sign = offsetMinutes > 0 ? '+' : '−';
  const abs = Math.abs(offsetMinutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `UTC${sign}${h}${m ? ':' + String(m).padStart(2, '0') : ''}`;
}

/** 14:47 → «14:45». For the boundary screen, which says «около». */
export function roundToFive({ hour, minute }: ClockTime): ClockTime {
  const total = (Math.round((hour * 60 + minute) / 5) * 5) % 1440;
  return { hour: Math.floor(total / 60), minute: total % 60 };
}
```

- [ ] **Step 6: Скомпилировать и прогнать тесты**

```bash
./node_modules/.bin/tsc lib/stepper-math.ts lib/birth-name.ts --outDir "$SCRATCH/built" \
  --target es2020 --module es2020 --moduleResolution node --strict --skipLibCheck
node --test "$SCRATCH/stepper-math.test.mjs" "$SCRATCH/birth-name.test.mjs"
./node_modules/.bin/tsc --noEmit
```

Ожидаемо: `pass 22`, `fail 0`; `tsc --noEmit` без ошибок.

- [ ] **Step 7: Коммит**

```bash
git add package.json package-lock.json lib/stepper-math.ts lib/birth-name.ts
git commit -m "Add the birth-name calculation on astronomy-engine"
```

---

### Task 2: Степпер и новый выбор времени в Настройках

**Files:**
- Create: `components/Stepper.tsx`, `components/TimeStepper.tsx`
- Modify: `app/settings.tsx` (колесо `TimeWheel` уходит целиком)
- Test: `$SCRATCH/settings.check.mjs`

**Interfaces:**
- Consumes: из `lib/stepper-math.ts` — `wrap`, `toMinutes`, `fromMinutes`,
  `parseTypedNumber`, `parseTypedTime`, `formatClock`, `ClockTime`.
- Produces: `StepperColumn({ label, display, onStep(d: 1|-1), onTyped?(text): boolean, width?, size?: 'large'|'medium' })`,
  `StepperInline({ label, display, onStep, onTyped?, width?, decreaseLabel, increaseLabel })`,
  `TimeStepper({ value: ClockTime, onChange, minuteStep: 1|5, variant: 'large'|'inline', label? })`.
  Подписи кнопок (на них завязаны проверки): колонка — «{label} больше» / «{label}
  меньше»; `TimeStepper inline` — «Позже на N мин» / «Раньше на N мин».

- [ ] **Step 1: Написать проверку**

Уведомления включаются через localStorage. В браузере Playwright нет push-подписки,
поэтому сохранение на сервер падает, и `setTime` откатывает время назад. Это и
проверяется: пока нажимают — показывается новое, через 600 мс после отпускания
откатывается.

`$SCRATCH/settings.check.mjs`:

```js
import assert from 'node:assert/strict';
import { open, tapEl, holdEl } from './harness.mjs';

const { browser, page, cdp } = await open('/settings', {
  storage: { 'notifications:v1': JSON.stringify({ enabled: true, hour: 9, minute: 0 }) },
  notifications: true,
});
const shown = () => page.getByText(/^\d\d:\d\d$/).first().textContent();

assert.equal(await shown(), '09:00');

await tapEl(cdp, page.getByRole('button', { name: 'Позже на 5 мин' }));
assert.equal(await shown(), '09:05', 'одно касание = один шаг');

await holdEl(cdp, page, page.getByRole('button', { name: 'Позже на 5 мин' }), 1500);
const afterHold = await shown();
assert.ok(afterHold > '09:30', `удержание ускоряется, получили ${afterHold}`);

await page.waitForTimeout(1500);
assert.equal(await shown(), '09:00', 'без подписки сохранение откатывается к сохранённому');

await tapEl(cdp, page.getByRole('button', { name: /Время уведомления: 09:00/ }));
await page.keyboard.type('2130');
await page.keyboard.press('Enter');
assert.equal(await shown(), '21:30', 'ввод цифрами');

await browser.close();
console.log('settings: ok');
```

- [ ] **Step 2: Запустить и убедиться, что падает**

```bash
npm run web   # в отдельном терминале, ждать «Web is waiting on http://localhost:8081»
node "$SCRATCH/settings.check.mjs"
```

Ожидаемо: падает на отсутствии кнопки «Позже на 5 мин».

- [ ] **Step 3: Написать `components/Stepper.tsx`**

```tsx
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tappable } from '../lib/interaction';
import { colors, fonts, type } from '../lib/theme';

/**
 * The two stepper shapes every time, date and offset control is built from:
 * a column (▲ value ▼) for the birth screen, where the value is the focus, and
 * an inline row (− value +) for a settings row, where it is one line of many.
 *
 * Presses only — no scroll, no drag. That is the point of this control: the
 * scroll wheel it replaces depended on scroll snapping, which react-native-web
 * does not do and which behaved differently under a finger than under a mouse.
 * A button behaves the same everywhere.
 */

/** First repeat after a hold begins, then the interval shrinks to the floor. */
const HOLD_FIRST_MS = 120;
const HOLD_FLOOR_MS = 40;
const HOLD_ACCELERATION = 0.85;
/** How long a press must last to count as a hold rather than a tap. */
const HOLD_DELAY_MS = 400;

/**
 * Tap = one step (via onPress, so screen readers activate it too). Hold = a
 * step now and then repeats that speed up until the finger lifts. Pressable
 * does not fire onPress after onLongPress has fired, so a hold never adds an
 * extra step on release.
 */
function useHoldRepeat(step: () => void) {
  const stepRef = useRef(step);
  stepRef.current = step;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  const start = () => {
    stop();
    stepRef.current();
    let delay = HOLD_FIRST_MS;
    const tick = () => {
      stepRef.current();
      delay = Math.max(HOLD_FLOOR_MS, delay * HOLD_ACCELERATION);
      timer.current = setTimeout(tick, delay);
    };
    timer.current = setTimeout(tick, delay);
  };

  useEffect(() => stop, []);

  return {
    onPress: () => stepRef.current(),
    onLongPress: start,
    onPressOut: stop,
    delayLongPress: HOLD_DELAY_MS,
  };
}

function StepButton({
  icon,
  label,
  onStep,
  round,
}: {
  icon: 'chevron-up' | 'chevron-down' | 'remove' | 'add';
  label: string;
  onStep: () => void;
  round?: boolean;
}) {
  const hold = useHoldRepeat(onStep);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      {...hold}
      style={({ pressed }) => [
        round ? styles.roundButton : styles.columnButton,
        tappable,
        pressed && styles.pressed,
      ]}
    >
      <Ionicons name={icon} size={20} color={colors.spark} />
    </Pressable>
  );
}

/**
 * The value itself. Pressable when `onTyped` is given: a press swaps it for a
 * number-pad field, and whatever was typed is handed to `onTyped` on submit or
 * blur. `onTyped` returns false for input it rejects, and the old value simply
 * stays — no error message for a mistyped digit.
 */
function StepValue({
  display,
  onTyped,
  label,
  textStyle,
  width,
}: {
  display: string;
  onTyped?: (text: string) => boolean;
  label: string;
  textStyle: object;
  width: number;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');

  if (editing && onTyped) {
    const finish = () => {
      onTyped(text);
      setEditing(false);
    };
    return (
      <TextInput
        accessibilityLabel={label}
        autoFocus
        value={text}
        onChangeText={setText}
        onSubmitEditing={finish}
        onBlur={finish}
        keyboardType="number-pad"
        inputMode="numeric"
        maxLength={5}
        selectTextOnFocus
        style={[textStyle, styles.input, { width }]}
      />
    );
  }

  const value = <Text style={[textStyle, { width }, styles.centered]}>{display}</Text>;
  if (!onTyped) return value;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${display}. Нажмите, чтобы ввести цифрами`}
      onPress={() => {
        setText('');
        setEditing(true);
      }}
      style={({ pressed }) => [tappable, pressed && styles.pressed]}
    >
      {value}
    </Pressable>
  );
}

export function StepperColumn({
  label,
  display,
  onStep,
  onTyped,
  width = 76,
  size = 'large',
}: {
  label: string;
  display: string;
  onStep: (delta: 1 | -1) => void;
  onTyped?: (text: string) => boolean;
  width?: number;
  /** `medium` for the date, where a month name has to fit in a column. */
  size?: 'large' | 'medium';
}) {
  return (
    <View style={styles.column}>
      <StepButton icon="chevron-up" label={`${label} больше`} onStep={() => onStep(1)} />
      <StepValue
        display={display}
        onTyped={onTyped}
        label={label}
        textStyle={size === 'large' ? styles.columnValue : styles.columnValueMedium}
        width={width}
      />
      <StepButton icon="chevron-down" label={`${label} меньше`} onStep={() => onStep(-1)} />
    </View>
  );
}

export function StepperInline({
  label,
  display,
  onStep,
  onTyped,
  width = 76,
  decreaseLabel,
  increaseLabel,
}: {
  label: string;
  display: string;
  onStep: (delta: 1 | -1) => void;
  onTyped?: (text: string) => boolean;
  width?: number;
  decreaseLabel: string;
  increaseLabel: string;
}) {
  return (
    <View style={styles.inline}>
      <StepButton icon="remove" label={decreaseLabel} onStep={() => onStep(-1)} round />
      <StepValue
        display={display}
        onTyped={onTyped}
        label={label}
        textStyle={styles.inlineValue}
        width={width}
      />
      <StepButton icon="add" label={increaseLabel} onStep={() => onStep(1)} round />
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.6,
  },
  column: {
    alignItems: 'center',
    gap: 4,
  },
  columnButton: {
    width: 64,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.veilRaised,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.veilRaised,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  columnValue: {
    fontFamily: fonts.bodyBold,
    fontSize: 40,
    lineHeight: 56,
    color: colors.parchment,
  },
  columnValueMedium: {
    fontFamily: fonts.bodyBold,
    fontSize: 24,
    lineHeight: 44,
    color: colors.parchment,
  },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  inlineValue: {
    fontFamily: fonts.bodyBold,
    ...type.rowTitle,
    fontSize: 21,
    color: colors.parchment,
  },
  centered: {
    textAlign: 'center',
  },
  input: {
    textAlign: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.spark,
    backgroundColor: colors.sparkWash,
    paddingVertical: 0,
  },
});
```

- [ ] **Step 4: Написать `components/TimeStepper.tsx`**

```tsx
import { StyleSheet, Text, View } from 'react-native';
import { StepperColumn, StepperInline } from './Stepper';
import {
  formatClock,
  fromMinutes,
  parseTypedNumber,
  parseTypedTime,
  toMinutes,
  wrap,
  type ClockTime,
} from '../lib/stepper-math';
import { colors } from '../lib/theme';

/**
 * A clock time on steppers. `large` is two columns (hours, minutes) for the
 * birth screen; `inline` is one «− 09:00 +» row for Settings, where the whole
 * time moves by `minuteStep`.
 *
 * With a 5-minute step, typed minutes are rounded down onto the step, so the
 * value stays on the grid the ▲▼ buttons walk.
 */
export function TimeStepper({
  value,
  onChange,
  minuteStep,
  variant,
  label = 'Время',
}: {
  value: ClockTime;
  onChange: (next: ClockTime) => void;
  minuteStep: 1 | 5;
  variant: 'large' | 'inline';
  label?: string;
}) {
  const onGrid = (t: ClockTime): ClockTime => ({
    hour: t.hour,
    minute: t.minute - (t.minute % minuteStep),
  });

  if (variant === 'inline') {
    return (
      <StepperInline
        label={label}
        display={formatClock(value)}
        decreaseLabel={`Раньше на ${minuteStep} мин`}
        increaseLabel={`Позже на ${minuteStep} мин`}
        onStep={(d) => onChange(fromMinutes(toMinutes(value) + d * minuteStep))}
        onTyped={(text) => {
          const t = parseTypedTime(text);
          if (t) onChange(onGrid(t));
          return t !== null;
        }}
      />
    );
  }

  return (
    <View style={styles.row}>
      <StepperColumn
        label="Часы"
        display={String(value.hour).padStart(2, '0')}
        onStep={(d) => onChange({ ...value, hour: wrap(value.hour + d, 24) })}
        onTyped={(text) => {
          const h = parseTypedNumber(text, 0, 23);
          if (h !== null) onChange({ ...value, hour: h });
          return h !== null;
        }}
      />
      <Text style={styles.colon}>:</Text>
      <StepperColumn
        label="Минуты"
        display={String(value.minute).padStart(2, '0')}
        onStep={(d) => onChange({ ...value, minute: wrap(value.minute + d * minuteStep, 60) })}
        onTyped={(text) => {
          const m = parseTypedNumber(text, 0, 59);
          if (m !== null) onChange(onGrid({ ...value, minute: m }));
          return m !== null;
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  colon: {
    fontSize: 36,
    color: colors.parchmentDim,
  },
});
```

- [ ] **Step 5: Заменить колесо в `app/settings.tsx`**

Итоговый файл целиком. Что ушло: `TimeWheel`, константы `HOURS`/`MINUTES`/
`ITEM_HEIGHT`/`VISIBLE_ROWS`/`WHEEL_*`, `webWheel`, стили `wheel*` и `colon`, импорты
`ScrollView`, `useLayoutEffect`, `NativeScrollEvent`, `NativeSyntheticEvent`,
`ViewStyle`. Что пришло: `draft` + отложенное на 600 мс сохранение с досохранением при
уходе с экрана, строка времени в одну линию.

```tsx
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
```

- [ ] **Step 6: Прогнать проверку и типы**

```bash
node "$SCRATCH/settings.check.mjs"
./node_modules/.bin/tsc --noEmit
```

Ожидаемо: `settings: ok`, `tsc` без ошибок.

- [ ] **Step 7: Коммит**

```bash
git add components/Stepper.tsx components/TimeStepper.tsx app/settings.tsx
git commit -m "Replace the settings time wheel with a stepper"
```

---

### Task 3: «Моё имя» в Избранном

**Files:**
- Modify: `lib/favorites.tsx`, `components/NameRow.tsx`, `app/favorites.tsx`
- Test: `$SCRATCH/favorites.check.mjs`

**Interfaces:**
- Consumes: `BirthMethod` из `lib/birth-name.ts` (только тип).
- Produces: `useFavorites()` дополнительно отдаёт `myName: MyName | null` и
  `setMyName(name: MyName)`; `type MyName = { id: number; method: BirthMethod }`;
  `methodLabel(method): 'по дате' | 'по времени'`; `NameRow` принимает
  `mine?: BirthMethod`.
- Инвариант: `setMyName` добавляет имя в избранное; `toggleFavorite(id)`, снимающий
  звезду с «моего» имени, очищает `myName` и ключ `myName:v1`.

- [ ] **Step 1: Написать проверку**

`$SCRATCH/favorites.check.mjs`:

```js
import assert from 'node:assert/strict';
import { open, tapEl } from './harness.mjs';

const { browser, page, cdp } = await open('/favorites', {
  storage: {
    'favorites:v1': JSON.stringify([1, 3, 11, 72]),
    'myName:v1': JSON.stringify({ id: 11, method: 'sun' }),
  },
});

const titles = await page.getByText(/^(Путешествие во времени|Творить чудеса|Изгнание остатков зла|Духовное очищение)$/).allTextContents();
assert.equal(titles[0], 'Изгнание остатков зла', '«моё» идёт первым');
assert.ok(await page.getByText('Моё · по дате').isVisible(), 'плашка «Моё · по дате»');

// Снять звезду у «моего» — пометка уходит вместе с ним.
await tapEl(cdp, page.getByRole('button', { name: 'Убрать из избранного' }).first());
await page.waitForTimeout(300);
assert.equal(await page.getByText('Моё · по дате').count(), 0);
assert.equal(await page.evaluate(() => localStorage.getItem('myName:v1')), null);

await browser.close();
console.log('favorites: ok');
```

- [ ] **Step 2: Запустить и убедиться, что падает**

```bash
node "$SCRATCH/favorites.check.mjs"
```

Ожидаемо: падает на ««моё» идёт первым» (первым стоит «Путешествие во времени»).

- [ ] **Step 3: `lib/favorites.tsx` — итоговый файл**

```tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { BirthMethod } from './birth-name';

const STORAGE_KEY = 'favorites:v1';

/**
 * The name the user took as theirs from the birth screen, and which way it was
 * worked out. Only this is kept — never the birth date or time it came from;
 * those are personal and live in the birth screen's state until it closes.
 */
const MY_NAME_KEY = 'myName:v1';

export type MyName = { id: number; method: BirthMethod };

type FavoritesContextValue = {
  favoriteIds: Set<number>;
  isFavorite: (id: number) => boolean;
  toggleFavorite: (id: number) => void;
  /** At most one. Always also a favorite — see `toggleFavorite`. */
  myName: MyName | null;
  /** Favorites the name and makes it "mine", replacing any earlier one. */
  setMyName: (name: MyName) => void;
  isLoaded: boolean;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const [myName, setMyNameState] = useState<MyName | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    Promise.all([AsyncStorage.getItem(STORAGE_KEY), AsyncStorage.getItem(MY_NAME_KEY)])
      .then(([rawFavorites, rawMyName]) => {
        if (rawFavorites) setFavoriteIds(new Set(JSON.parse(rawFavorites)));
        if (rawMyName) setMyNameState(JSON.parse(rawMyName));
      })
      .finally(() => setIsLoaded(true));
  }, []);

  const writeFavorites = (next: Set<number>) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...next])).catch(() => {});
  };

  const toggleFavorite = (id: number) => {
    const removing = favoriteIds.has(id);
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      writeFavorites(next);
      return next;
    });
    // "Mine" is a mark on a favorite, not a list of its own: unstarring the
    // name takes the mark with it, so there is never a "my name" that the
    // Favorites screen does not show.
    if (removing && myName?.id === id) {
      setMyNameState(null);
      AsyncStorage.removeItem(MY_NAME_KEY).catch(() => {});
    }
  };

  const setMyName = (name: MyName) => {
    setFavoriteIds((prev) => {
      if (prev.has(name.id)) return prev;
      const next = new Set(prev).add(name.id);
      writeFavorites(next);
      return next;
    });
    setMyNameState(name);
    AsyncStorage.setItem(MY_NAME_KEY, JSON.stringify(name)).catch(() => {});
  };

  const value = useMemo<FavoritesContextValue>(
    () => ({
      favoriteIds,
      isFavorite: (id) => favoriteIds.has(id),
      toggleFavorite,
      myName,
      setMyName,
      isLoaded,
    }),
    [favoriteIds, myName, isLoaded]
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider');
  return ctx;
}

/** «по дате» / «по времени» — for the «Моё · …» marks. */
export function methodLabel(method: BirthMethod): string {
  return method === 'sun' ? 'по дате' : 'по времени';
}
```

- [ ] **Step 4: `components/NameRow.tsx` — итоговый файл**

```tsx
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { DISPLAY_DOT_RATIO, HebrewGlyphs } from './HebrewGlyphs';
import { methodLabel, useFavorites } from '../lib/favorites';
import type { BirthMethod } from '../lib/birth-name';
import { tappable } from '../lib/interaction';
import { colors, fonts, type } from '../lib/theme';
import type { DivineName } from '../lib/data';

/**
 * `mine` marks the row as the user's own name from the birth screen: lit in
 * gold, a «Моё · по дате» plate in place of the category, and the fine
 * separator dot the user asked for on the new surfaces.
 */
export function NameRow({ name, mine }: { name: DivineName; mine?: BirthMethod }) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorite = isFavorite(name.id);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        mine && styles.rowMine,
        tappable,
        pressed && styles.rowPressed,
      ]}
      onPress={() => router.replace(`/names/${name.id}`)}
    >
      <Text style={styles.num}>{String(name.id).padStart(2, '0')}</Text>
      <HebrewGlyphs
        letters={name.hebrewLetters}
        variant="compact"
        dotRatio={mine ? DISPLAY_DOT_RATIO : undefined}
      />
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>
          {name.title}
        </Text>
        {mine ? (
          <Text style={styles.mineBadge}>Моё · {methodLabel(mine)}</Text>
        ) : (
          <Text style={styles.tag} numberOfLines={1}>
            {name.category}
          </Text>
        )}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={favorite ? 'Убрать из избранного' : 'В избранное'}
        // The glyph itself is a ~20pt target sitting inside a row that is also
        // pressable, so it needs slop on every side to be reliably hittable
        // without the row swallowing the tap.
        hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
        onPress={() => toggleFavorite(name.id)}
        style={({ pressed }) => [styles.starHit, tappable, pressed && styles.starPressed]}
      >
        <Text style={[styles.star, favorite && styles.starFilled]}>
          {favorite ? '★' : '☆'}
        </Text>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingVertical: 13,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairlineSoft,
  },
  rowMine: {
    backgroundColor: colors.sparkWash,
    borderWidth: 1,
    borderColor: colors.sparkSoft,
    borderRadius: 12,
    paddingHorizontal: 10,
    marginHorizontal: -6,
  },
  mineBadge: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 100,
    overflow: 'hidden',
    backgroundColor: colors.spark,
    color: colors.void,
    fontFamily: fonts.bodyBold,
    ...type.tag,
    textTransform: 'uppercase',
  },
  rowPressed: {
    backgroundColor: colors.veil,
  },
  num: {
    fontFamily: fonts.body,
    ...type.small,
    color: colors.parchmentDim,
    width: 20,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: fonts.displayRuBold,
    ...type.rowTitle,
    color: colors.parchment,
  },
  tag: {
    fontFamily: fonts.body,
    ...type.small,
    color: colors.parchmentDim,
    marginTop: 2,
  },
  starHit: {
    paddingLeft: 6,
  },
  starPressed: {
    opacity: 0.5,
  },
  star: {
    fontSize: 20,
    color: colors.hairlineSoft,
  },
  starFilled: {
    color: colors.spark,
  },
});
```

- [ ] **Step 5: `app/favorites.tsx` — итоговый файл**

```tsx
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { HomeButton } from '../components/HomeButton';
import { NameRow } from '../components/NameRow';
import { useScreenPadding } from '../lib/safe-area';
import { useFavorites } from '../lib/favorites';
import { NAMES } from '../lib/data';
import { colors, fonts, type } from '../lib/theme';
import { ScreenTransition } from '../components/ScreenTransition';

export default function Favorites() {
  const padding = useScreenPadding();
  const { favoriteIds, myName } = useFavorites();
  // The user's own name leads the list; the rest keep the book's order.
  const list = NAMES.filter((n) => favoriteIds.has(n.id)).sort(
    (a, b) => Number(b.id === myName?.id) - Number(a.id === myName?.id)
  );

  return (
    <ScreenTransition style={{ backgroundColor: colors.void }}>
      <FlatList
        style={{ flex: 1, backgroundColor: colors.void }}
        contentContainerStyle={[styles.content, padding]}
        data={list}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <NameRow name={item} mine={item.id === myName?.id ? myName.method : undefined} />
        )}
        ListHeaderComponent={
          <View style={styles.header}>
            <HomeButton />
            <Text style={styles.title}>Избранное</Text>
            <Text style={styles.sub}>
              {list.length > 0 ? `${list.length} сохранено` : 'Пока ничего не отмечено'}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            Отмечайте имена звёздочкой в списке или на экране деталей — они появятся здесь.
          </Text>
        }
      />
    </ScreenTransition>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    marginBottom: 8,
  },
  title: {
    fontFamily: fonts.displayRuBold,
    ...type.screenTitle,
    color: colors.parchment,
    marginBottom: 4,
  },
  sub: {
    fontFamily: fonts.body,
    ...type.small,
    color: colors.parchmentDim,
    marginBottom: 10,
  },
  empty: {
    fontFamily: fonts.body,
    ...type.body,
    color: colors.parchmentDim,
    marginTop: 24,
  },
});
```

- [ ] **Step 6: Прогнать проверку и типы**

```bash
node "$SCRATCH/favorites.check.mjs"
./node_modules/.bin/tsc --noEmit
```

Ожидаемо: `favorites: ok`.

- [ ] **Step 7: Коммит**

```bash
git add lib/favorites.tsx components/NameRow.tsx app/favorites.tsx
git commit -m "Mark the user's own name in favorites"
```

---

### Task 4: Экран «Имя по рождению»

**Files:**
- Create: `components/DateStepper.tsx`, `components/ZodiacRing.tsx`,
  `components/DayStrip.tsx`, `app/birth.tsx`
- Test: `$SCRATCH/birth.check.mjs`

**Interfaces:**
- Consumes: всё из Task 1; `StepperColumn`, `StepperInline`, `TimeStepper` (Task 2);
  `useFavorites().myName/setMyName/toggleFavorite` (Task 3); `HebrewGlyphs`,
  `DISPLAY_DOT_RATIO`, `getNameById`.
- Produces: маршрут `/birth` без параметров. Подписи, на которые завязаны проверки:
  карточки «По дате» / «По времени» (`role=radio`), кнопки «Узнать имя», «В избранное»,
  «Изменить данные», «Указать время рождения», колонки «День/Месяц/Год/Часы/Минуты»
  с кнопками «… больше» / «… меньше», переключатель «Указать время».

- [ ] **Step 1: Написать проверку**

Дата по умолчанию — 1 января 1990. Проверка ставит 14 мая 1990 кнопками (4 × «Месяц
больше», 13 × «День больше»), затем 2 ноября 1985 — ввод года цифрами.

Расчёт зависит от пояса устройства, поэтому контекст фиксирует
`timezoneId: 'Europe/Moscow'` (UTC+3 в эти даты), чтобы ожидания из Task 1 совпадали.

`$SCRATCH/birth.check.mjs`:

```js
import assert from 'node:assert/strict';
import { chromium, devices } from 'playwright';

const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices['iPhone 13'], timezoneId: 'Europe/Moscow' });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
const tap = async (loc) => {
  await loc.scrollIntoViewIfNeeded();
  const b = await loc.boundingBox();
  const p = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [p] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
};
const btn = (name) => page.getByRole('button', { name, exact: true });
const times = async (name, n) => { for (let i = 0; i < n; i++) await tap(btn(name)); };

await page.goto('http://localhost:8081/birth');
await page.waitForTimeout(1500);

// 1. По дате, без времени: 14 мая 1990 → № 11.
for (let i = 0; i < 4; i++) await tap(btn('Месяц больше'));
await times('День больше', 13);
assert.ok(await page.getByText('мая', { exact: true }).first().isVisible());
assert.ok(await page.getByText('UTC+3 · как на устройстве').first().isVisible());
await tap(btn('Узнать имя'));
assert.ok(await page.getByText('Ваше имя · по дате').first().isVisible());
assert.ok(await page.getByText('Изгнание остатков зла').first().isVisible());
assert.ok(await page.getByText(/23° Тельца/).first().isVisible(), 'объяснение с положением Солнца');
assert.ok(await page.getByText(/имя № 11/).first().isVisible());
assert.equal(new URL(page.url()).search, '', 'в URL нет данных рождения');

// 2. «В избранное» делает имя «моим».
await tap(btn('В избранное'));
assert.deepEqual(
  JSON.parse(await page.evaluate(() => localStorage.getItem('myName:v1'))),
  { id: 11, method: 'sun' }
);
assert.ok(await btn('В избранном').isVisible());

// 3. Стык: 2 ноября 1985, без времени.
await tap(btn('Изменить данные'));
await tap(page.getByRole('button', { name: /^Год: 1990/ }));
await page.keyboard.type('1985');
await page.keyboard.press('Enter');
for (let i = 0; i < 6; i++) await tap(btn('Месяц больше'));   // мая → ноября
await times('День меньше', 12);                                   // 14 → 2
await tap(btn('Узнать имя'));
assert.ok(await page.getByText('На стыке двух имён').first().isVisible());
assert.ok(await page.getByText(/около 14:45/).first().isVisible());
assert.ok(await page.getByText(/До 14:45 · № 44/).first().isVisible());
assert.ok(await page.getByText(/После 14:45 · № 45/).first().isVisible());

// 4. «Указать время рождения» → время 14:45 уже стоит; 20:00 → № 45.
await tap(btn('Указать время рождения'));
await tap(page.getByRole('button', { name: /^Часы: 14/ }));
await page.keyboard.type('20');
await page.keyboard.press('Enter');
await tap(btn('Узнать имя'));
assert.ok(await page.getByText('Энергия благополучия').first().isVisible());

// 5. По времени: 07:40 → № 24.
await tap(btn('Изменить данные'));
await tap(page.getByRole('radio', { name: /По времени/ }));
await tap(page.getByRole('button', { name: /^Часы: 20/ }));
await page.keyboard.type('7');
await page.keyboard.press('Enter');
await tap(page.getByRole('button', { name: /^Минуты: 45/ }));
await page.keyboard.type('40');
await page.keyboard.press('Enter');
await tap(btn('Узнать имя'));
assert.ok(await page.getByText('Ваше имя · по времени').first().isVisible());
assert.ok(await page.getByText('Искоренить зависть').first().isVisible());
assert.ok(await page.getByText(/07:40–07:59/).first().isVisible());

// 6. Ничего о рождении не осталось в хранилище.
const stored = await page.evaluate(() => JSON.stringify({ ...localStorage }));
for (const leak of ['1985', '1990', '14:45', '07:40']) {
  assert.ok(!stored.includes(leak), `в localStorage нашлось «${leak}»: ${stored}`);
}

await page.reload();
await page.waitForTimeout(1500);
assert.ok(await page.getByText('Имя по рождению').first().isVisible(), 'после перезагрузки — пустой ввод');

await browser.close();
console.log('birth: ok');
```

- [ ] **Step 2: Запустить и убедиться, что падает**

```bash
node "$SCRATCH/birth.check.mjs"
```

Ожидаемо: падает — маршрута `/birth` нет (Unmatched Route), кнопки «Месяц больше» нет.

- [ ] **Step 3: `components/DateStepper.tsx`**

```tsx
import { StyleSheet, View } from 'react-native';
import { StepperColumn } from './Stepper';
import {
  clampDate,
  daysInMonth,
  FIRST_YEAR,
  MONTHS_GENITIVE,
  parseTypedNumber,
  stepDate,
  type CalendarDate,
} from '../lib/stepper-math';

/**
 * A date as three stepper columns: day, month, year. Each column is its own
 * dial — see `stepDate` for why a day never carries into the month. Day and
 * year can also be typed; the month is a word and only steps.
 */
export function DateStepper({
  value,
  onChange,
  today,
}: {
  value: CalendarDate;
  onChange: (next: CalendarDate) => void;
  today: CalendarDate;
}) {
  return (
    <View style={styles.row}>
      <StepperColumn
        label="День"
        width={52}
        size="medium"
        display={String(value.day)}
        onStep={(d) => onChange(stepDate(value, 'day', d, today))}
        onTyped={(text) => {
          const day = parseTypedNumber(text, 1, daysInMonth(value.year, value.month));
          if (day !== null) onChange(clampDate({ ...value, day }, today));
          return day !== null;
        }}
      />
      <StepperColumn
        label="Месяц"
        width={128}
        size="medium"
        display={MONTHS_GENITIVE[value.month - 1]}
        onStep={(d) => onChange(stepDate(value, 'month', d, today))}
      />
      <StepperColumn
        label="Год"
        width={72}
        size="medium"
        display={String(value.year)}
        onStep={(d) => onChange(stepDate(value, 'year', d, today))}
        onTyped={(text) => {
          const year = parseTypedNumber(text, FIRST_YEAR, today.year);
          if (year !== null) onChange(clampDate({ ...value, year }, today));
          return year !== null;
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
});
```

- [ ] **Step 4: `components/ZodiacRing.tsx`**

```tsx
import { StyleSheet, Text, View } from 'react-native';
import { DEGREES_PER_NAME } from '../lib/birth-name';
import { colors, fonts, type } from '../lib/theme';

const SIZE = 240;
const C = SIZE / 2;
const R_OUT = 104;
const R_IN = 86;
const R_SUN = 66;
const SUN = 14;

/**
 * Places a thin bar whose centre sits `r` from the ring's centre at `deg`
 * (0° at the top, clockwise), rotated to point outward. React Native rotates a
 * view about its own centre, so putting that centre on the polar point is all
 * the geometry there is — the same trick the Galgal wheel uses for its chords.
 */
function radial(deg: number, r: number, width: number, length: number) {
  const a = (deg * Math.PI) / 180;
  const x = C + r * Math.sin(a);
  const y = C - r * Math.cos(a);
  return {
    position: 'absolute' as const,
    left: x - width / 2,
    top: y - length / 2,
    width,
    height: length,
    transform: [{ rotate: `${deg}deg` }],
  };
}

/**
 * The circle the Sun walks in a year, cut into the 72 parts of 5° the names are
 * assigned to, with the birth's part lit and the Sun on it. Every sixth mark is
 * longer: those are the borders of the zodiac signs, which the explanation
 * below the ring names.
 */
export function ZodiacRing({ id, longitude }: { id: number; longitude: number }) {
  const band = R_OUT - R_IN;
  const mid = (R_OUT + R_IN) / 2;
  // Chord of one 5° part at the band's middle radius.
  const partWidth = 2 * mid * Math.sin(((DEGREES_PER_NAME / 2) * Math.PI) / 180);

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Круг из 72 частей, Солнце в ${id}-й части`}
      style={styles.ring}
    >
      <View style={[styles.circle, { width: R_OUT * 2, height: R_OUT * 2, left: C - R_OUT, top: C - R_OUT }]} />
      <View style={[styles.circle, { width: R_IN * 2, height: R_IN * 2, left: C - R_IN, top: C - R_IN }]} />

      <View
        style={[
          radial((id - 1) * DEGREES_PER_NAME + DEGREES_PER_NAME / 2, mid, partWidth, band),
          styles.part,
        ]}
      />

      {Array.from({ length: 72 }, (_, i) => {
        const major = i % 6 === 0;
        const length = major ? band + 6 : band;
        return (
          <View
            key={i}
            style={[
              radial(i * DEGREES_PER_NAME, R_OUT - length / 2, major ? 1.6 : 0.8, length),
              { backgroundColor: major ? colors.parchmentDim : colors.hairline },
            ]}
          />
        );
      })}

      <View style={[radial(longitude, R_SUN / 2, 1, R_SUN), styles.ray]} />
      <View
        style={[
          styles.sun,
          {
            left: C + R_SUN * Math.sin((longitude * Math.PI) / 180) - SUN / 2,
            top: C - R_SUN * Math.cos((longitude * Math.PI) / 180) - SUN / 2,
          },
        ]}
      />
      <View style={styles.hub} />
      <Text style={styles.origin}>0° · начало Овна</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    width: SIZE,
    height: SIZE,
    alignSelf: 'center',
    marginTop: 18,
  },
  circle: {
    position: 'absolute',
    borderRadius: R_OUT,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  part: {
    backgroundColor: colors.sparkWash,
    borderWidth: 1,
    borderColor: colors.spark,
  },
  ray: {
    backgroundColor: colors.sparkSoft,
  },
  sun: {
    position: 'absolute',
    width: SUN,
    height: SUN,
    borderRadius: SUN / 2,
    backgroundColor: colors.spark,
  },
  hub: {
    position: 'absolute',
    left: C - 3,
    top: C - 3,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.parchmentDim,
  },
  origin: {
    position: 'absolute',
    top: -18,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontFamily: fonts.body,
    ...type.tag,
    color: colors.parchmentDim,
  },
});
```

- [ ] **Step 5: `components/DayStrip.tsx`**

```tsx
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, type } from '../lib/theme';

const MARKS = ['00:00', '06:00', '12:00', '18:00', '24:00'];

/**
 * The day as 72 cells of 20 minutes, the birth's cell lit. Every 18th cell —
 * each six hours — is a shade lighter so the labels under it can be read
 * against something.
 */
export function DayStrip({ id }: { id: number }) {
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Сутки из 72 отрезков по 20 минут, выделен ${id}-й`}
      style={styles.wrap}
    >
      <View style={styles.cells}>
        {Array.from({ length: 72 }, (_, i) => (
          <View
            key={i}
            style={[
              styles.cell,
              i % 18 === 0 && styles.cellMark,
              i === id - 1 && styles.cellLit,
            ]}
          />
        ))}
      </View>
      <View style={styles.marks}>
        {MARKS.map((m) => (
          <Text key={m} style={styles.mark}>
            {m}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
  },
  cells: {
    flexDirection: 'row',
    gap: 1,
    height: 34,
  },
  cell: {
    flex: 1,
    borderRadius: 1,
    backgroundColor: colors.veilRaised,
  },
  cellMark: {
    backgroundColor: colors.hairline,
  },
  cellLit: {
    backgroundColor: colors.spark,
  },
  marks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  mark: {
    fontFamily: fonts.body,
    ...type.tag,
    color: colors.parchmentDim,
  },
});
```

- [ ] **Step 6: `app/birth.tsx`**

```tsx
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { DateStepper } from '../components/DateStepper';
import { DayStrip } from '../components/DayStrip';
import { DISPLAY_DOT_RATIO, HebrewGlyphs } from '../components/HebrewGlyphs';
import { HomeButton } from '../components/HomeButton';
import { ScreenTransition } from '../components/ScreenTransition';
import { StepperInline } from '../components/Stepper';
import { TimeStepper } from '../components/TimeStepper';
import { ZodiacRing } from '../components/ZodiacRing';
import {
  DEGREES_PER_NAME,
  deviceOffsetMinutes,
  formatOffset,
  nameIdByTime,
  resolveBySun,
  roundToFive,
  sunLongitude,
  timeSlot,
  zodiacLabel,
  type BirthMethod,
} from '../lib/birth-name';
import { getNameById } from '../lib/data';
import { useFavorites } from '../lib/favorites';
import { tappable } from '../lib/interaction';
import { useScreenPadding } from '../lib/safe-area';
import {
  formatClock,
  MONTHS_GENITIVE,
  stepOffset,
  type CalendarDate,
  type ClockTime,
} from '../lib/stepper-math';
import { colors, fonts, type } from '../lib/theme';

/**
 * «Имя по рождению»: which of the 72 Names belongs to a birth, and how that was
 * worked out.
 *
 * One route with its phases as local state — input, result, "between two
 * names" — and no search params. That is deliberate and is the privacy promise
 * on the input screen: a birth date in the URL would sit in the PWA's address
 * bar and, on a reload, in the VPS's nginx access log. Here it lives in this
 * component's state and is gone when the screen closes. Only the resulting
 * name, if the user stars it, is ever stored (lib/favorites.tsx).
 */

const MINUTE = 60_000;

type Inputs = {
  method: BirthMethod;
  date: CalendarDate;
  timeKnown: boolean;
  time: ClockTime;
  /** null = the device's own zone, as it stood on that date. */
  manualOffset: number | null;
};

type Outcome =
  | {
      kind: 'sun';
      id: number;
      longitude: number;
      /** How the result was reached, for the explanation block. */
      basis: { type: 'time' } | { type: 'day' } | { type: 'pick'; side: 'before' | 'after'; at: ClockTime };
    }
  | { kind: 'time'; id: number }
  | {
      kind: 'boundary';
      before: number;
      after: number;
      crossing: ClockTime;
      crossingUtc: number;
    };

function todayDate(): CalendarDate {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
}

function dateLabel({ year, month, day }: CalendarDate): string {
  return `${day} ${MONTHS_GENITIVE[month - 1]} ${year}`;
}

export default function Birth() {
  const padding = useScreenPadding();
  const today = todayDate();
  const [inputs, setInputs] = useState<Inputs>({
    method: 'sun',
    date: { year: 1990, month: 1, day: 1 },
    timeKnown: false,
    time: { hour: 12, minute: 0 },
    manualOffset: null,
  });
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const offset =
    inputs.manualOffset ??
    deviceOffsetMinutes(inputs.date, inputs.timeKnown ? inputs.time : null);

  const update = (patch: Partial<Inputs>) => setInputs((prev) => ({ ...prev, ...patch }));

  const calculate = () => {
    if (inputs.method === 'time') {
      setOutcome({ kind: 'time', id: nameIdByTime(inputs.time) });
      return;
    }
    const r = resolveBySun(inputs.date, inputs.timeKnown ? inputs.time : null, offset);
    setOutcome(
      r.kind === 'single'
        ? {
            kind: 'sun',
            id: r.id,
            longitude: r.longitude,
            basis: { type: inputs.timeKnown ? 'time' : 'day' },
          }
        : r
    );
  };

  return (
    <ScreenTransition style={{ backgroundColor: colors.void }}>
      <ScrollView contentContainerStyle={[styles.scroll, padding]}>
        <View style={styles.topBar}>
          <HomeButton style={styles.homeButton} />
          {outcome && (
            <Pressable
              accessibilityRole="button"
              onPress={() => setOutcome(null)}
              hitSlop={10}
              style={({ pressed }) => [tappable, pressed && styles.pressed]}
            >
              <Text style={styles.link}>Изменить данные</Text>
            </Pressable>
          )}
        </View>

        {!outcome && (
          <InputPhase
            inputs={inputs}
            offset={offset}
            today={today}
            update={update}
            onSubmit={calculate}
          />
        )}

        {outcome?.kind === 'boundary' && (
          <BoundaryPhase
            outcome={outcome}
            date={inputs.date}
            offset={offset}
            onPick={(side) =>
              setOutcome({
                kind: 'sun',
                id: side === 'before' ? outcome.before : outcome.after,
                // Half an hour either side of the crossing puts the Sun
                // plainly inside the chosen part for the ring.
                longitude: sunLongitude(
                  outcome.crossingUtc + (side === 'before' ? -30 : 30) * MINUTE
                ),
                basis: { type: 'pick', side, at: roundToFive(outcome.crossing) },
              })
            }
            onAddTime={() => {
              update({ timeKnown: true, time: roundToFive(outcome.crossing) });
              setOutcome(null);
            }}
          />
        )}

        {(outcome?.kind === 'sun' || outcome?.kind === 'time') && (
          <ResultPhase outcome={outcome} inputs={inputs} offset={offset} />
        )}
      </ScrollView>
    </ScreenTransition>
  );
}

function InputPhase({
  inputs,
  offset,
  today,
  update,
  onSubmit,
}: {
  inputs: Inputs;
  offset: number;
  today: CalendarDate;
  update: (patch: Partial<Inputs>) => void;
  onSubmit: () => void;
}) {
  const [editingOffset, setEditingOffset] = useState(false);

  return (
    <View style={styles.phase}>
      <View>
        <Text style={styles.title}>Имя по рождению</Text>
        <Text style={styles.lead}>
          Традиция связывает каждое из 72 имён с моментом рождения. Выберите, как считать.
        </Text>
      </View>

      <View accessibilityRole="radiogroup" style={styles.methods}>
        <MethodCard
          selected={inputs.method === 'sun'}
          title="По дате"
          sub="Где было Солнце в день рождения"
          onPress={() => update({ method: 'sun' })}
        />
        <MethodCard
          selected={inputs.method === 'time'}
          title="По времени"
          sub="Час и минута рождения"
          onPress={() => update({ method: 'time' })}
        />
      </View>

      {inputs.method === 'sun' && (
        <>
          <Section label="Дата рождения">
            <DateStepper value={inputs.date} today={today} onChange={(date) => update({ date })} />
          </Section>

          <Section label="Время рождения" note="необязательно">
            <View style={styles.switchRow}>
              <Text style={styles.small}>
                Нужно, только если вы родились на стыке двух имён — мы подскажем.
              </Text>
              <Switch
                accessibilityLabel="Указать время"
                value={inputs.timeKnown}
                onValueChange={(timeKnown) => update({ timeKnown })}
                trackColor={{ false: colors.hairline, true: colors.sparkSoft }}
                thumbColor={inputs.timeKnown ? colors.spark : colors.parchmentDim}
              />
            </View>
            {inputs.timeKnown && (
              <TimeStepper
                variant="large"
                minuteStep={1}
                label="Время рождения"
                value={inputs.time}
                onChange={(time) => update({ time })}
              />
            )}
          </Section>

          <View style={styles.offsetBox}>
            <View style={styles.offsetRow}>
              <View style={styles.flex}>
                <Text style={styles.small}>Часовой пояс места рождения</Text>
                <Text style={styles.body}>
                  {formatOffset(offset)} ·{' '}
                  {inputs.manualOffset === null ? 'как на устройстве' : 'вручную'}
                </Text>
              </View>
              {!editingOffset && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setEditingOffset(true)}
                  hitSlop={10}
                  style={({ pressed }) => [tappable, pressed && styles.pressed]}
                >
                  <Text style={styles.link}>Изменить</Text>
                </Pressable>
              )}
            </View>
            {editingOffset && (
              <View style={styles.offsetEditor}>
                <StepperInline
                  label="Часовой пояс"
                  display={formatOffset(offset)}
                  width={112}
                  decreaseLabel="Западнее на 15 минут"
                  increaseLabel="Восточнее на 15 минут"
                  onStep={(d) => update({ manualOffset: stepOffset(offset, d) })}
                />
                {inputs.manualOffset !== null && (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => update({ manualOffset: null })}
                    hitSlop={10}
                    style={({ pressed }) => [tappable, pressed && styles.pressed]}
                  >
                    <Text style={styles.link}>Как на устройстве</Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>
        </>
      )}

      {inputs.method === 'time' && (
        <Section label="Время рождения">
          <TimeStepper
            variant="large"
            minuteStep={1}
            label="Время рождения"
            value={inputs.time}
            onChange={(time) => update({ time })}
          />
          <Text style={styles.small}>По часам в месте рождения. Дата для этого способа не нужна.</Text>
        </Section>
      )}

      <View style={styles.privacy}>
        <Ionicons name="lock-closed-outline" size={16} color={colors.thread} />
        <Text style={[styles.small, styles.flex]}>
          {inputs.method === 'sun' ? 'Дата и время' : 'Время'} не сохраняются и не покидают
          устройство. Запомнить можно только само имя.
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={onSubmit}
        style={({ pressed }) => [styles.primary, tappable, pressed && styles.pressed]}
      >
        <Text style={styles.primaryText}>Узнать имя</Text>
      </Pressable>
    </View>
  );
}

function ResultPhase({
  outcome,
  inputs,
  offset,
}: {
  outcome: Extract<Outcome, { kind: 'sun' | 'time' }>;
  inputs: Inputs;
  offset: number;
}) {
  const { myName, setMyName, toggleFavorite } = useFavorites();
  const name = getNameById(outcome.id);
  if (!name) return null;
  const method: BirthMethod = outcome.kind;
  const isMine = myName?.id === name.id;

  return (
    <View style={styles.phase}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>
          Ваше имя · {method === 'sun' ? 'по дате' : 'по времени'}
        </Text>
        <HebrewGlyphs letters={name.hebrewLetters} variant="display" />
        <Text style={styles.small}>№ {name.id}</Text>
        <Text style={styles.nameTitle}>{name.title}</Text>
        <Text style={styles.teaser} numberOfLines={3}>
          {name.summary}
        </Text>
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace(`/names/${name.id}`)}
            style={({ pressed }) => [styles.primarySmall, tappable, pressed && styles.pressed]}
          >
            <Text style={styles.primaryText}>Читать</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => (isMine ? toggleFavorite(name.id) : setMyName({ id: name.id, method }))}
            style={({ pressed }) => [styles.secondary, tappable, pressed && styles.pressed]}
          >
            <Ionicons name={isMine ? 'star' : 'star-outline'} size={15} color={colors.spark} />
            <Text style={styles.secondaryText}>{isMine ? 'В избранном' : 'В избранное'}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.sectionLabel}>
        <Text style={styles.eyebrow}>Как определено имя</Text>
        <View style={styles.rule} />
      </View>

      {outcome.kind === 'sun' ? (
        <SunExplanation outcome={outcome} inputs={inputs} offset={offset} />
      ) : (
        <TimeExplanation id={outcome.id} time={inputs.time} />
      )}

      <Text style={styles.small}>
        {outcome.kind === 'sun'
          ? 'Этот способ пришёл из ангелологии: Ленен, «La Science cabalistique», 1823. В книге Иегуды Берга имя выбирают по жизненной задаче, а не по дате рождения.'
          : 'Этот способ пришёл из ангелологии, а не из книги Иегуды Берга. Считается по часам в месте рождения.'}
      </Text>
    </View>
  );
}

function SunExplanation({
  outcome,
  inputs,
  offset,
}: {
  outcome: Extract<Outcome, { kind: 'sun' }>;
  inputs: Inputs;
  offset: number;
}) {
  const degrees = Math.floor(outcome.longitude);
  const from = (outcome.id - 1) * DEGREES_PER_NAME;
  const when =
    outcome.basis.type === 'time'
      ? `${dateLabel(inputs.date)}, ${formatClock(inputs.time)} (${formatOffset(offset)})`
      : `${dateLabel(inputs.date)}, время не указано (${formatOffset(offset)})`;
  const stood =
    outcome.basis.type === 'time'
      ? `Солнце стояло на ${degrees}° круга — это ${zodiacLabel(outcome.longitude)}.`
      : `В этот день Солнце стояло около ${degrees}° круга — это ${zodiacLabel(outcome.longitude)}.`;

  return (
    <>
      <ZodiacRing id={outcome.id} longitude={outcome.longitude} />
      <Text style={styles.read}>
        За год Солнце проходит полный круг зодиака. Традиция делит этот круг на 72 равные части
        по 5° — по одной на каждое имя, начиная с весеннего равноденствия.
      </Text>
      <View style={styles.plate}>
        <Text style={styles.small}>{when}</Text>
        {outcome.basis.type === 'pick' && (
          <Text style={styles.body}>
            Вы выбрали имя {outcome.basis.side === 'before' ? 'до' : 'после'} перехода около{' '}
            {formatClock(outcome.basis.at)}.
          </Text>
        )}
        <Text style={styles.body}>{stood}</Text>
        <Text style={styles.body}>
          {degrees}° попадает в {outcome.id}-ю часть ({from}°–{from + DEGREES_PER_NAME}°) →{' '}
          <Text style={styles.accent}>имя № {outcome.id}</Text>.
        </Text>
      </View>
    </>
  );
}

function TimeExplanation({ id, time }: { id: number; time: ClockTime }) {
  const slot = timeSlot(id);
  return (
    <>
      <DayStrip id={id} />
      <Text style={styles.read}>
        Сутки делятся на 72 отрезка по 20 минут, начиная с полуночи. Каждому отрезку по порядку
        соответствует одно имя: 00:00–00:19 — первое, 23:40–23:59 — последнее.
      </Text>
      <View style={styles.plate}>
        <Text style={styles.small}>Время рождения {formatClock(time)}</Text>
        <Text style={styles.body}>
          Это отрезок {formatClock(slot.from)}–{formatClock(slot.to)}.
        </Text>
        <Text style={styles.body}>
          Он {id}-й по счёту от полуночи → <Text style={styles.accent}>имя № {id}</Text>.
        </Text>
      </View>
    </>
  );
}

function BoundaryPhase({
  outcome,
  date,
  offset,
  onPick,
  onAddTime,
}: {
  outcome: Extract<Outcome, { kind: 'boundary' }>;
  date: CalendarDate;
  offset: number;
  onPick: (side: 'before' | 'after') => void;
  onAddTime: () => void;
}) {
  const at = formatClock(roundToFive(outcome.crossing));
  return (
    <View style={styles.phase}>
      <View>
        <Text style={[styles.eyebrow, styles.thread]}>На стыке двух имён</Text>
        <Text style={styles.title}>{dateLabel(date)}</Text>
        <Text style={styles.lead}>
          В этот день Солнце перешло из одной части круга в следующую — около {at} по{' '}
          {formatOffset(offset)}. Ваше имя зависит от того, родились вы до или после.
        </Text>
      </View>

      <Candidate id={outcome.before} label={`До ${at}`} onPress={() => onPick('before')} />
      <Candidate id={outcome.after} label={`После ${at}`} onPress={() => onPick('after')} />

      <Pressable
        accessibilityRole="button"
        onPress={onAddTime}
        style={({ pressed }) => [styles.primary, tappable, pressed && styles.pressed]}
      >
        <Text style={styles.primaryText}>Указать время рождения</Text>
      </Pressable>

      <View style={styles.plate}>
        <Text style={styles.bodyStrong}>Почему так</Text>
        <Text style={styles.small}>
          Круг зодиака делится на 72 части по 5°, Солнце проходит одну часть примерно за 5 дней.
          Граница между частями приходится на конкретный час, поэтому в пограничный день без
          времени рождения точно не скажешь, какое имя ваше.
        </Text>
        <Text style={styles.small}>
          Родились в другом часовом поясе? Поменяйте его на экране ввода — время перехода
          пересчитается.
        </Text>
      </View>
    </View>
  );
}

function Candidate({ id, label, onPress }: { id: number; label: string; onPress: () => void }) {
  const name = getNameById(id);
  if (!name) return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${name.title}`}
      onPress={onPress}
      style={({ pressed }) => [styles.candidate, tappable, pressed && styles.pressed]}
    >
      <HebrewGlyphs
        letters={name.hebrewLetters}
        variant="compact"
        size={26}
        dotRatio={DISPLAY_DOT_RATIO}
      />
      <View style={styles.flex}>
        <Text style={styles.candidateEyebrow}>
          {label} · № {id}
        </Text>
        <Text style={styles.candidateTitle}>{name.title}</Text>
      </View>
    </Pressable>
  );
}

function MethodCard({
  selected,
  title,
  sub,
  onPress,
}: {
  selected: boolean;
  title: string;
  sub: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.method,
        selected && styles.methodSelected,
        tappable,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected && <View style={styles.radioDot} />}
      </View>
      <View style={styles.flex}>
        <Text style={styles.methodTitle}>{title}</Text>
        <Text style={styles.small}>{sub}</Text>
      </View>
    </Pressable>
  );
}

function Section({ label, note, children }: { label: string; note?: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        {label}
        {note && <Text style={styles.sectionNote}> · {note}</Text>}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  flex: {
    flex: 1,
    minWidth: 0,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  homeButton: {
    marginBottom: 0,
  },
  link: {
    fontFamily: fonts.bodyBold,
    ...type.button,
    color: colors.spark,
  },
  phase: {
    gap: 18,
  },
  title: {
    fontFamily: fonts.displayRuBold,
    ...type.screenTitle,
    color: colors.parchment,
    marginBottom: 6,
  },
  lead: {
    fontFamily: fonts.body,
    ...type.body,
    color: colors.parchmentDim,
  },
  read: {
    fontFamily: fonts.body,
    ...type.read,
    color: colors.parchment,
  },
  body: {
    fontFamily: fonts.body,
    ...type.body,
    color: colors.parchment,
  },
  bodyStrong: {
    fontFamily: fonts.bodyBold,
    ...type.body,
    color: colors.parchment,
  },
  small: {
    fontFamily: fonts.body,
    ...type.small,
    color: colors.parchmentDim,
  },
  accent: {
    fontFamily: fonts.bodyBold,
    color: colors.spark,
  },
  thread: {
    color: colors.thread,
    marginBottom: 6,
  },
  methods: {
    gap: 8,
  },
  method: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.veil,
    borderWidth: 1,
    borderColor: colors.hairlineSoft,
  },
  methodSelected: {
    backgroundColor: colors.sparkWash,
    borderColor: colors.spark,
  },
  methodTitle: {
    fontFamily: fonts.displayRuBold,
    ...type.rowTitle,
    color: colors.parchment,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: colors.parchmentDim,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: colors.spark,
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.spark,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontFamily: fonts.body,
    ...type.eyebrow,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: colors.parchmentDim,
  },
  sectionNote: {
    textTransform: 'none',
    letterSpacing: 0,
    fontWeight: '400',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  offsetBox: {
    gap: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: colors.voidRaised,
    borderWidth: 1,
    borderColor: colors.hairlineSoft,
  },
  offsetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  offsetEditor: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  privacy: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  primary: {
    height: 50,
    borderRadius: 100,
    backgroundColor: colors.spark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primarySmall: {
    borderRadius: 100,
    backgroundColor: colors.spark,
    paddingVertical: 12,
    paddingHorizontal: 22,
  },
  primaryText: {
    fontFamily: fonts.bodyBold,
    ...type.button,
    color: colors.void,
  },
  secondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: colors.spark,
    paddingVertical: 11,
    paddingHorizontal: 18,
  },
  secondaryText: {
    fontFamily: fonts.bodyBold,
    ...type.button,
    color: colors.spark,
  },
  card: {
    alignItems: 'center',
    gap: 10,
    borderRadius: 18,
    paddingVertical: 24,
    // 14, as on the home card: the widest name block is 240.5pt at display size.
    paddingHorizontal: 14,
    backgroundColor: colors.veil,
    borderWidth: 1,
    borderColor: colors.hairlineSoft,
  },
  eyebrow: {
    fontFamily: fonts.body,
    ...type.eyebrow,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: colors.spark,
  },
  nameTitle: {
    fontFamily: fonts.displayRuBold,
    ...type.nameTitle,
    color: colors.parchment,
    textAlign: 'center',
  },
  teaser: {
    fontFamily: fonts.body,
    ...type.body,
    color: colors.parchmentDim,
    textAlign: 'center',
    maxWidth: 320,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 6,
  },
  sectionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rule: {
    flex: 1,
    height: 1,
    backgroundColor: colors.hairline,
  },
  plate: {
    gap: 6,
    padding: 14,
    borderRadius: 12,
    backgroundColor: colors.voidRaised,
    borderWidth: 1,
    borderColor: colors.hairlineSoft,
  },
  candidate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 14,
    backgroundColor: colors.veil,
    borderWidth: 1,
    borderColor: colors.hairlineSoft,
  },
  candidateEyebrow: {
    fontFamily: fonts.body,
    ...type.eyebrow,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: colors.parchmentDim,
  },
  candidateTitle: {
    fontFamily: fonts.displayRuBold,
    ...type.rowTitle,
    color: colors.parchment,
    marginTop: 2,
  },
});
```

- [ ] **Step 7: Прогнать проверку, типы и посмотреть глазами**

```bash
node "$SCRATCH/birth.check.mjs"
./node_modules/.bin/tsc --noEmit
```

Ожидаемо: `birth: ok`. Затем снять скриншоты результата «по дате», «на стыке» и «по
времени» (iPhone 13, `page.screenshot({ fullPage: true })`) и сравнить с экранами 4–6
мокапа. Особенно проверить: деления круга стоят по окружности, а не столбиком (значит,
`rotate` не применился); Солнце лежит в выделенной части; точки между буквами у
кандидатов на стыке мелкие; месяц «сентября» помещается в колонку на ширине 320 pt
(`viewport: { width: 320, height: 640 }`).

- [ ] **Step 8: Коммит**

```bash
git add components/DateStepper.tsx components/ZodiacRing.tsx components/DayStrip.tsx app/birth.tsx
git commit -m "Add the birth-name screen"
```

---

### Task 5: Плитка на главном экране

**Files:**
- Modify: `app/index.tsx`
- Test: `$SCRATCH/home.check.mjs`

**Interfaces:**
- Consumes: `useFavorites().myName`, `methodLabel` (Task 3), маршрут `/birth` (Task 4).

- [ ] **Step 1: Написать проверку**

`$SCRATCH/home.check.mjs`:

```js
import assert from 'node:assert/strict';
import { open, tapEl } from './harness.mjs';

// Без «моего имени» — вход в расчёт.
let s = await open('/');
await tapEl(s.cdp, s.page.getByRole('button', { name: 'Имя по рождению' }));
await s.page.waitForTimeout(800);
assert.equal(new URL(s.page.url()).pathname, '/birth');
await s.browser.close();

// С «моим именем» — само имя и «Пересчитать».
s = await open('/', {
  storage: {
    'favorites:v1': JSON.stringify([11]),
    'myName:v1': JSON.stringify({ id: 11, method: 'time' }),
  },
});
assert.ok(await s.page.getByText('Моё имя · по времени').isVisible());
await tapEl(s.cdp, s.page.getByRole('button', { name: 'Пересчитать' }));
await s.page.waitForTimeout(800);
assert.equal(new URL(s.page.url()).pathname, '/birth');
await s.browser.close();

s = await open('/', {
  storage: {
    'favorites:v1': JSON.stringify([11]),
    'myName:v1': JSON.stringify({ id: 11, method: 'time' }),
  },
});
await tapEl(s.cdp, s.page.getByRole('button', { name: 'Моё имя: Изгнание остатков зла' }));
await s.page.waitForTimeout(800);
assert.equal(new URL(s.page.url()).pathname, '/names/11');
await s.browser.close();
console.log('home: ok');
```

- [ ] **Step 2: Запустить и убедиться, что падает**

```bash
node "$SCRATCH/home.check.mjs"
```

Ожидаемо: падает — кнопки «Имя по рождению» нет.

- [ ] **Step 3: `app/index.tsx` — итоговый файл**

Плитка стоит между карточкой «Имя дня» и сеткой. «Пересчитать» — вложенный `Pressable`:
в react-native-web внутреннее нажатие не всплывает во внешний, как и у звезды в
`NameRow`.

```tsx
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { DISPLAY_DOT_RATIO, HebrewGlyphs } from '../components/HebrewGlyphs';
import { InstallBanner } from '../components/InstallBanner';
import { PracticeRow } from '../components/PracticeRow';
import { methodLabel, useFavorites } from '../lib/favorites';
import { tappable } from '../lib/interaction';
import { useScreenPadding } from '../lib/safe-area';
import { getNameById, nameOfTheDay, randomNameId } from '../lib/data';
import { colors, fonts, type } from '../lib/theme';
import { ScreenTransition } from '../components/ScreenTransition';

/**
 * Every navigation in this app is `router.replace`, never `push`.
 *
 * Pushing builds up browser history, and browser history is what the platform
 * back/forward gestures move through — the edge swipe on iOS, the system back
 * gesture on Android. A web page cannot intercept either of those, and
 * `overscroll-behavior: none` does not touch them: it governs scroll chaining,
 * not OS gestures. The only way to stop them navigating is to leave them
 * nothing to navigate to, so the history stays exactly one entry deep.
 *
 * The cost is that Android's back gesture now closes the app instead of
 * stepping back a screen. That is the trade: the Home and prev/next buttons on
 * the Name screen exist to carry the navigation this gives up.
 */
export default function Home() {
  const padding = useScreenPadding(24);
  const { favoriteIds } = useFavorites();
  const today = nameOfTheDay();

  const dateLabel = new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  return (
    <ScreenTransition style={{ backgroundColor: colors.void }}>
      <ScrollView contentContainerStyle={[styles.scroll, padding]}>
        <View style={styles.topBar}>
          <Text style={styles.kicker}>{dateLabel}</Text>
          <Pressable
            onPress={() => router.replace('/settings')}
            style={({ pressed }) => [styles.gearBtn, tappable, pressed && styles.pressed]}
            hitSlop={8}
          >
            <Ionicons name="settings-outline" size={20} color={colors.parchmentDim} />
          </Pressable>
        </View>

        <InstallBanner />

        <Pressable
          style={({ pressed }) => [styles.dayCard, tappable, pressed && styles.pressed]}
          onPress={() => router.replace(`/names/${today.id}`)}
        >
          <Text style={styles.dayEyebrow}>Имя дня</Text>
          <HebrewGlyphs letters={today.hebrewLetters} variant="display" />
          <Text style={styles.dayTitle}>{today.title}</Text>
          <Text style={styles.dayTeaser} numberOfLines={3}>
            {today.summary}
          </Text>
          <View style={styles.dayCta}>
            <Text style={styles.dayCtaText}>Читать</Text>
          </View>
        </Pressable>

        <BirthTile />

        <View style={styles.grid}>
          <Tile
            label="Введение"
            sub="Как это устроено"
            onPress={() => router.replace('/intro')}
          />
          <Tile
            label="Случайное имя"
            sub="1 из 72"
            onPress={() => router.replace(`/names/${randomNameId(today.id)}`)}
          />
          <Tile
            label="Категории"
            sub="По жизненным темам"
            onPress={() => router.replace('/categories')}
          />
          <Tile
            label="Избранное"
            sub={favoriteIds.size > 0 ? `${favoriteIds.size} сохранено` : 'Пока пусто'}
            onPress={() => router.replace('/favorites')}
          />
          <Tile
            label="Все имена"
            sub="Полный список, 72"
            onPress={() => router.replace('/names')}
          />
          <Tile
            label="Таблица имён"
            sub="Все 72 на одном экране"
            onPress={() => router.replace('/names/table')}
          />
        </View>

        <View style={styles.sectionLabel}>
          <Text style={styles.sectionLabelText}>Практики</Text>
          <View style={styles.sectionRule} />
        </View>

        <View style={styles.practices}>
          <PracticeRow
            transliteration="ЙУД"
            label="Дыхание"
            sub="Тетраграмматон, в своём ритме"
            onPress={() => router.replace('/practices/breathing')}
          />
          <PracticeRow
            transliteration="АЛЕФ"
            label="Созерцание буквы"
            sub="22 буквы, 3–5 минут"
            onPress={() => router.replace('/practices/letter')}
          />
          <PracticeRow
            transliteration="ШИН"
            label="Колесо Галгал"
            sub="231 врата, круг за кругом"
            onPress={() => router.replace('/practices/galgal')}
          />
        </View>
      </ScrollView>
    </ScreenTransition>
  );
}

/**
 * The way into the birth screen — or, once the user has taken a name from it
 * as theirs, that name. The tile then opens the name itself, and «Пересчитать»
 * is the way back into the calculation. Nothing about the birth is shown: it
 * was never kept.
 */
function BirthTile() {
  const { myName } = useFavorites();
  const mine = myName ? getNameById(myName.id) : undefined;

  if (!myName || !mine) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Имя по рождению"
        onPress={() => router.replace('/birth')}
        style={({ pressed }) => [styles.birthTile, tappable, pressed && styles.pressed]}
      >
        <View style={styles.birthIcon}>
          <Ionicons name="sunny-outline" size={22} color={colors.thread} />
        </View>
        <View style={styles.birthText}>
          <Text style={styles.tileLabel}>Имя по рождению</Text>
          <Text style={styles.tileSub}>По дате или времени рождения</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.parchmentDim} />
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Моё имя: ${mine.title}`}
      onPress={() => router.replace(`/names/${mine.id}`)}
      style={({ pressed }) => [styles.birthTile, styles.birthTileMine, tappable, pressed && styles.pressed]}
    >
      <HebrewGlyphs
        letters={mine.hebrewLetters}
        variant="compact"
        size={24}
        dotRatio={DISPLAY_DOT_RATIO}
      />
      <View style={styles.birthText}>
        <Text style={styles.birthEyebrow}>Моё имя · {methodLabel(myName.method)}</Text>
        <Text style={styles.tileLabel} numberOfLines={2}>
          {mine.title}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.replace('/birth')}
        hitSlop={10}
        style={({ pressed }) => [tappable, pressed && styles.pressed]}
      >
        <Text style={styles.birthRecalc}>Пересчитать</Text>
      </Pressable>
    </Pressable>
  );
}

function Tile({
  label,
  sub,
  onPress,
  wide,
}: {
  label: string;
  sub: string;
  onPress: () => void;
  wide?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      // Without this the tile reads out as its two stacked strings and offers
      // no role at all — these tiles are the app's main navigation.
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.tile,
        tappable,
        wide && styles.tileWide,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
    >
      <View>
        <Text style={styles.tileLabel}>{label}</Text>
        <Text style={styles.tileSub}>{sub}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: {
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  pressed: {
    opacity: 0.8,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  kicker: {
    fontFamily: fonts.body,
    ...type.eyebrow,
    fontWeight: '700',
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
  dayCard: {
    borderRadius: 18,
    paddingVertical: 26,
    // 14, not 20: the name is now set at the same size here as on the detail
    // screen, and the widest of the 72 blocks is 240.5pt. On a 320pt phone
    // that leaves 320 - 40 (screen) - 28 (card) = 252pt to hold it.
    paddingHorizontal: 14,
    backgroundColor: colors.veil,
    borderWidth: 1,
    borderColor: colors.hairlineSoft,
    marginBottom: 22,
    alignItems: 'center',
  },
  dayEyebrow: {
    fontFamily: fonts.body,
    ...type.eyebrow,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: colors.spark,
    marginBottom: 18,
  },
  dayTitle: {
    fontFamily: fonts.displayRuBold,
    ...type.nameTitle,
    color: colors.parchment,
    marginTop: 16,
    marginBottom: 10,
    textAlign: 'center',
  },
  dayTeaser: {
    fontFamily: fonts.body,
    ...type.body,
    color: colors.parchmentDim,
    textAlign: 'center',
    maxWidth: 320,
    marginBottom: 20,
  },
  dayCta: {
    backgroundColor: colors.spark,
    borderRadius: 100,
    paddingVertical: 10,
    paddingHorizontal: 22,
  },
  dayCtaText: {
    fontFamily: fonts.bodyBold,
    ...type.button,
    fontWeight: '700',
    color: colors.void,
  },
  birthTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 14,
    backgroundColor: colors.veil,
    borderWidth: 1,
    borderColor: colors.threadBorder,
    marginBottom: 10,
  },
  birthTileMine: {
    borderColor: colors.sparkSoft,
  },
  birthIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.threadSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  birthText: {
    flex: 1,
    minWidth: 0,
  },
  birthEyebrow: {
    fontFamily: fonts.body,
    ...type.eyebrow,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: colors.spark,
    marginBottom: 2,
  },
  birthRecalc: {
    fontFamily: fonts.bodyBold,
    ...type.small,
    color: colors.spark,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  sectionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 24,
    marginBottom: 12,
  },
  sectionLabelText: {
    fontFamily: fonts.body,
    ...type.eyebrow,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: colors.spark,
  },
  sectionRule: {
    flex: 1,
    height: 1,
    backgroundColor: colors.hairline,
  },
  practices: {
    gap: 9,
  },
  tile: {
    width: '48%',
    backgroundColor: colors.veil,
    borderWidth: 1,
    borderColor: colors.hairlineSoft,
    borderRadius: 14,
    padding: 16,
  },
  tileWide: {
    width: '100%',
  },
  tileLabel: {
    fontFamily: fonts.displayRuBold,
    ...type.rowTitle,
    color: colors.parchment,
  },
  tileSub: {
    fontFamily: fonts.body,
    ...type.small,
    color: colors.parchmentDim,
    marginTop: 3,
  },
});
```

- [ ] **Step 4: Прогнать проверку, типы, скриншот**

```bash
node "$SCRATCH/home.check.mjs"
./node_modules/.bin/tsc --noEmit
```

Ожидаемо: `home: ok`. Скриншот главной в обоих состояниях сравнить с экраном 1 мокапа.

- [ ] **Step 5: Коммит**

```bash
git add app/index.tsx
git commit -m "Add the birth-name tile to the home screen"
```

---

### Task 6: Сквозная проверка, веб-сборка, документация

**Files:**
- Modify: `CLAUDE.md` (раздел Architecture)

- [ ] **Step 1: Все проверки подряд**

```bash
./node_modules/.bin/tsc lib/stepper-math.ts lib/birth-name.ts --outDir "$SCRATCH/built" \
  --target es2020 --module es2020 --moduleResolution node --strict --skipLibCheck
node --test "$SCRATCH/stepper-math.test.mjs" "$SCRATCH/birth-name.test.mjs"
for f in settings favorites birth home; do node "$SCRATCH/$f.check.mjs" || echo "FAILED: $f"; done
./node_modules/.bin/tsc --noEmit
```

Ожидаемо: `pass 22`, четыре `ok`, ни одного `FAILED`.

- [ ] **Step 2: Веб-сборка и её размер**

```bash
npm run build:web
ls -la dist/_expo/static/js/web/*.js
for f in dist/_expo/static/js/web/*.js; do gzip -c "$f" | wc -c; done
```

Ожидаемо: сборка проходит. Прирост gzip-размера бандла около 50–60 КБ к прежним
~584 КБ (astronomy-engine ≈ 49 КБ плюс новый код). Заметно больше — остановиться и
сообщить.

Проверить, что сборка свежее последнего изменения исходников (правило проекта):
`stat -f %m dist/index.html` больше, чем у самого нового из изменённых файлов.

- [ ] **Step 3: Нативная сборка — только проверка типов и бандла Metro**

```bash
npx expo export --platform android --output-dir "$SCRATCH/android-export"
```

Ожидаемо: бандл Hermes собирается без ошибок (astronomy-engine — чистый JS). Запуск на
устройстве в этот план не входит. Если пользователь соберёт APK для RuStore, первым
делом проверить экран `/birth` на дате с летним временем в прошлом, например 1 июля 1985.

- [ ] **Step 4: Обновить `CLAUDE.md`**

В разделе Architecture, в списке экранов после `app/intro.tsx`, добавить:

```markdown
  - `app/birth.tsx` — «Имя по рождению»: имя по дате (положение Солнца, 72 × 5°) или по
    времени (72 × 20 минут). Одна страница без search params: дата рождения не
    сохраняется нигде (ни в URL, ни в хранилище), хранится только `myName:v1`.
```

И после пункта про `lib/favorites.tsx`:

```markdown
- `lib/birth-name.ts` — расчёт имени по рождению (Солнце — через `astronomy-engine`);
  `lib/stepper-math.ts` — арифметика степперов (`components/Stepper.tsx`,
  `TimeStepper`, `DateStepper`), которыми выбирается время и в Настройках.
```

А в пункте про `lib/favorites.tsx` дописать: «плюс `myName:v1` — `{ id, method }`
имени, которое пользователь сделал своим на экране рождения».

- [ ] **Step 5: Коммит**

```bash
git add CLAUDE.md
git commit -m "Document the birth-name screen and steppers"
```

---

## Self-review

**Покрытие спеки.** Приватность и один маршрут → Task 4 (проверки 6 и URL). «Моё имя»,
«В избранное», снятие звезды → Task 3 + Task 4 шаг 2 проверки. Астрономический расчёт и
точность → Task 1 (эталон USNO, допуск 2 мин). Необязательное время и стык, окно 5 минут →
Task 1 (тесты) + Task 4. Часовой пояс устройства и ручное смещение → Task 1
(`deviceOffsetMinutes`, `stepOffset`) + Task 4. Способ «по времени» → Task 1 + Task 4.
Степпер вместо колеса и задержка сохранения → Task 2. Иврит через `HebrewGlyphs`, мелкая
точка → Tasks 3–5. Главная, Избранное, Настройки → Tasks 5, 3, 2. Строка об источнике →
Task 4. Проверка из спеки → Tasks 1–6.

**Заглушки.** Нет: весь код приведён целиком. Код проверен до записи плана: модули
Task 1 — `node --test` (22/22), все `.tsx` — `tsc --noEmit` на копии репозитория.
Экранные проверки не запускались: исполнитель прогоняет их впервые, и если проверка
расходится с поведением по мелочи (текст локатора, тайминг), чинится проверка, а не
поведение, со строкой объяснения в отчёте.

**Согласованность имён.** `ClockTime`/`CalendarDate` определены в `stepper-math.ts` и
только импортируются типом в `birth-name.ts`. `formatClock` — только в
`stepper-math.ts`. `BirthMethod = 'sun' | 'time'` — Task 1, так же в Tasks 3–5.
`methodLabel` — Task 3, так же в Task 5. `DISPLAY_DOT_RATIO` — существующий экспорт
`HebrewGlyphs`.
