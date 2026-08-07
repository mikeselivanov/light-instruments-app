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
  - `app/names/[id].tsx` — name detail screen.
  - `app/categories/index.tsx`, `app/favorites.tsx`, `app/intro.tsx` — the remaining tiles.
- `lib/data.ts` reads `assets/data/names.ru.json` (72 entries: id, title, `hebrewLetters`,
  `keywords`, `summary`) and derives categories, random pick, and "name of the day" (deterministic
  by date, not `Math.random()` on every open).
- `lib/hebrew.ts` maps the Russian transliteration used in the book (e.g. `"ВАВ"`) to the actual
  Hebrew glyph — `hebrewLetters` in the data is the single source of truth for both.
- `lib/favorites.tsx` is a React context backed by `@react-native-async-storage/async-storage`
  (key `favorites:v1`, a plain array of ids) — the only mutable state in the app.
- `lib/theme.ts` holds the color/font tokens for the app's single (dark) visual direction; see the
  published design artifact from this project's chat history for the rationale.
- Custom fonts (`PT Serif`, `PT Sans`, `Frank Ruhl Libre` — bundled as `.ttf` under
  `assets/fonts/`) are loaded with `expo-font`'s `useFonts` in the root layout, gated behind
  `expo-splash-screen`.
- TypeScript config (`tsconfig.json`) extends `expo/tsconfig.base` with `strict: true`.
- No test framework, linter, or CI config is set up yet.

Because Expo 57 differs from earlier versions the model may have training knowledge of, consult the versioned docs (linked in AGENTS.md) before writing platform APIs, config, or navigation code — note the project was deliberately pinned back to SDK 54, so treat the v54 docs as authoritative here, not v57.
