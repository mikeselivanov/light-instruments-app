# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

- `npm start` — start the Expo dev server (Metro), then choose a platform from the CLI menu
- `npm run ios` — start the dev server and launch the iOS simulator
- `npm run android` — start the dev server and launch the Android emulator
- `npm run web` — start the dev server and open in a browser
- `npx tsc --noEmit` — type-check the project (no separate lint/test scripts are configured yet)

## Architecture

Expo (SDK 54) / React Native app — a browsable reference for the Kabbalistic "72 Names of God"
(content sourced from `72_imeni_boga.pdf`, Yehuda Berg's book), with favorites and a daily pick.

- Routing is file-based via `expo-router`; entry point is `expo-router/entry` (set in
  `package.json`), not a hand-written `index.ts`/`App.tsx`. Screens live under `app/`:
  - `app/_layout.tsx` — root `Stack`, loads bundled fonts, wraps the tree in
    `SafeAreaProvider` / `GestureHandlerRootView` / `FavoritesProvider`.
  - `app/index.tsx` — home screen (name-of-the-day card + tiles).
  - `app/names/index.tsx` — all names, optionally filtered via the `category` search param.
  - `app/names/[id].tsx` — name detail screen. The eye button opens a meditation mode
    (`components/NameMeditation.tsx`): only the letters, large (`HebrewGlyphs variant="bare"`),
    a touch anywhere returns; swipe is off and the screen is kept awake meanwhile.
  - `app/categories/index.tsx`, `app/favorites.tsx`, `app/intro.tsx` — the remaining tiles.
  - `app/birth.tsx` — «Имя по рождению»: имя по дате (положение Солнца, 72 × 5°) или по
    времени (72 × 20 минут). Одна страница без search params: дата рождения не
    сохраняется нигде (ни в URL, ни в хранилище), хранится только `myName:v1`.
- `lib/data.ts` reads `assets/data/names.ru.json` (72 entries: id, title, `hebrewLetters`,
  `keywords`, `summary`) and derives categories, random pick, and "name of the day" (deterministic
  by date, not `Math.random()` on every open).
- `lib/hebrew.ts` maps the Russian transliteration used in the book (e.g. `"ВАВ"`) to the actual
  Hebrew glyph — `hebrewLetters` in the data is the single source of truth for both.
- `lib/favorites.tsx` is a React context backed by `@react-native-async-storage/async-storage`
  (key `favorites:v1`, a plain array of ids) — the only mutable state in the app, плюс
  `myName:v1` — `{ id, method }` имени, которое пользователь сделал своим на экране рождения.
- `lib/birth-name.ts` — расчёт имени по рождению (Солнце — через `astronomy-engine`);
  `lib/stepper-math.ts` — арифметика степперов (`components/Stepper.tsx`,
  `TimeStepper`, `DateStepper`), которыми выбирается время и в Настройках.
- `lib/theme.ts` holds the color/font tokens for the app's single (dark) visual direction; see the
  published design artifact from this project's chat history for the rationale.
- Custom fonts (`PT Serif`, `PT Sans`, `Frank Ruhl Libre` — bundled as `.ttf` under
  `assets/fonts/`) are loaded with `expo-font`'s `useFonts` in the root layout, gated behind
  `expo-splash-screen`.
- TypeScript config (`tsconfig.json`) extends `expo/tsconfig.base` with `strict: true`.
- No test framework, linter, or CI config is set up yet.

Because Expo 57 differs from earlier versions the model may have training knowledge of, consult the versioned docs (linked in AGENTS.md) before writing platform APIs, config, or navigation code — note the project was deliberately pinned back to SDK 54, so treat the v54 docs as authoritative here, not v57.
