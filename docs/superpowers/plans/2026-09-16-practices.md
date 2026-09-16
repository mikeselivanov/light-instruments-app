# Три практики — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить в приложение три самостоятельные медитативные практики — дыхание на
Тетраграмматон, созерцание буквы и обход колеса Галгал — и блок «Практики» на главном экране.

**Architecture:** Каждая практика — один маршрут `expo-router` с фазами внутри
(`intro → setup → run → done` как локальное состояние), потому что история навигации в
приложении держится ровно на одну запись. Три экрана стоят на общей основе: канонический
алфавит `lib/letters.ts` (хранит транслитерации, глифы берёт через существующий
`glyphFor`), примитив одной буквы `components/Glyph.tsx` и хук Wake Lock. Пара «врат»
рендерится существующим `HebrewGlyphs` — ему расширяется тип пропа, и он даром отдаёт
точку, транслитерации, общую базовую линию подписей и конечные формы букв.

**Tech Stack:** Expo SDK 54, expo-router 6, React Native 0.81 / react-native-web 0.21,
TypeScript strict, `@react-native-async-storage/async-storage`. Новых зависимостей — ноль.

**Spec:** [docs/superpowers/specs/2026-09-16-practices-design.md](../specs/2026-09-16-practices-design.md)

## Global Constraints

Действуют в каждой задаче, повторять в каждой не буду.

- **Ноль новых npm-зависимостей.** Ни `react-native-svg`, ни `expo-keep-awake`, ни
  библиотек анимации. Если задача кажется требующей зависимости — это ошибка в плане,
  остановись и скажи.
- **Навигация только `router.replace`.** Никогда `push`, никогда `back`. Причина в
  комментарии [app/index.tsx:11-27](../../../app/index.tsx#L11-L27).
- **Иврит только через `glyphFor()` из `lib/hebrew.ts`.** Ивритские символы не
  хардкодятся в компонентах: данные хранят транслитерации (`'МЕМ'`), глиф получается
  функцией. Это единственное, что даёт конечные формы ך ם ן ף ץ.
- **Тема одна, тёмная.** Все цвета — из `lib/theme.ts`, все размеры шрифта — из `type`.
  Никаких литералов цвета в экранах, кроме дневного фона созерцания (свои токены).
- **Строки по-русски прямо в коде**, как в `app/intro.tsx`. Никакого i18n.
- **Ни звука, ни счётчиков, ни процентов.** Ни «осталось 3 минуты», ни «7 из 21», ни
  «пройдено N %». Это требование спеки, а не стилистика.
- **Каждый экран ниже главного несёт `<HomeButton />`** и обёрнут в `<ScreenTransition>`.
- Отступы экрана — через `useScreenPadding()` из `lib/safe-area.ts`.
- Всё, на что нажимают, получает стиль `tappable` из `lib/interaction.ts`.
- Перед написанием платформенного кода свериться с документацией
  <https://docs.expo.dev/versions/v54.0.0/> — проект намеренно закреплён на SDK 54.

## Как здесь проверяют

Тестового фреймворка для приложения в проекте нет и в этом плане не заводится. Проверка
двухслойная:

1. **Чистая логика** (данные алфавита, геометрия колеса, порядок партнёров) компилируется
   штатным `tsc` в отдельную папку и проверяется скриптом на `node --test`. Зависимостей
   не требует: `typescript` уже в devDependencies.
2. **Экраны** проверяются Playwright'ом против запущенного `npm run web` на
   `http://localhost:8081`. **Обязательно с эмуляцией касаний** — это требование проекта:
   десктопный клик не ловит ошибки `touch-action`, и на этом здесь уже обжигались
   (жест-обёртка писала `touch-action: none` на скроллер, экран не скроллился пальцем ни
   у кого, а все скриншоты были прекрасны).

Playwright не зависимость проекта. Один раз на сессию, в папке скретчпада:

```bash
cd "$SCRATCH" && npm i playwright && npx playwright install chromium
```

Дальше все проверочные скрипты складываются туда же и запускаются `node <script>.mjs`.
В репозиторий они не коммитятся.

Шаблон запуска с касаниями, от него отталкиваются все проверки экранов:

```js
// $SCRATCH/harness.mjs
import { chromium, devices } from 'playwright';

export async function open(path) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'] }); // hasTouch: true
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await page.goto('http://localhost:8081' + path);
  await page.waitForTimeout(1500);           // Metro отдаёт бандл небыстро
  return { browser, ctx, page, cdp };
}

/** Настоящий тап, а не page.click: только он проходит через touch-action. */
export async function tap(cdp, x, y) {
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart', touchPoints: [{ x, y }],
  });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

/**
 * Тап по центру элемента.
 *
 * Прокрутка перед тапом обязательна: CDP шлёт касание в координатах вьюпорта,
 * поэтому элемент ниже сгиба получает тап в пустоту — молча, а тест потом
 * падает по таймауту совсем в другом месте. Живой палец прокручивает к тому,
 * по чему бьёт; стенд тоже. Бокс перечитываем — прокрутка его сдвинула.
 */
export async function tapEl(cdp, locator) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  await tap(cdp, box.x + box.width / 2, box.y + box.height / 2);
}
```

## File Structure

| Файл | Ответственность |
|---|---|
| `lib/letters.ts` | 22 буквы: транслитерация, имя, категория, заметка из «Сефер Йецира». Порядок алфавитный — он же порядок по кругу. Только данные, никакой логики. |
| `lib/galgal.ts` | Чистая геометрия и порядок: раскладка N точек по окружности, список партнёров буквы по часовой, параметры хорды. Ничего не знает про React. |
| `lib/wake-lock.ts` / `.web.ts` | Хук `useWakeLock(active)`. Нативный файл — пустышка, веб-файл — реальный Screen Wake Lock. |
| `components/Glyph.tsx` | Одна ивритская буква нужного размера с оптической центровкой. |
| `components/PracticeRow.tsx` | Строка блока «Практики» на главной. |
| `components/HebrewGlyphs.tsx` | *(правка)* тип пропа расширяется с тройки до массива — и компонент начинает обслуживать пару врат. |
| `lib/theme.ts` | *(правка)* два токена дневного фона для созерцания. |
| `app/practices/letter.tsx` | Созерцание буквы: выбор → настройка → созерцание → завершение. |
| `app/practices/breathing.tsx` | Дыхание: вступление → практика → завершение. |
| `app/practices/galgal.tsx` | Галгал: вступление → колесо → настройка круга → обход → завершение. |
| `app/index.tsx` | *(правка)* блок «Практики» под сеткой плиток. |

---

## Task 1: Канонический алфавит и примитив буквы

Основа для всех трёх экранов. В UI не видно ничего — гейт задачи в том, что данные
сходятся с «Сефер Йецира» и что глифы, включая конечные формы, достаются из
существующей таблицы.

**Files:**
- Create: `lib/letters.ts`
- Create: `components/Glyph.tsx`
- Modify: `components/HebrewGlyphs.tsx:7` (тип пропа `letters`)
- Modify: `lib/theme.ts` (два токена)
- Test: `$SCRATCH/letters.test.mjs` (одноразовый, в репозиторий не идёт)

**Interfaces:**
- Consumes: `glyphFor(transliteration, isFinal)` и `HEBREW_GLYPH_BY_TRANSLITERATION` из
  `lib/hebrew.ts`; `colors`, `fonts` из `lib/theme.ts`.
- Produces:
  - `type LetterCategory = 'mother' | 'double' | 'simple'`
  - `type Letter = { transliteration: string; name: string; category: LetterCategory; note: string }`
  - `const ALPHABET: readonly Letter[]` — 22 записи, алфавитный порядок
  - `<Glyph transliteration={string} size={number} color={string} isFinal?={boolean} />`
  - `colors.dayGround`, `colors.dayInk`

- [ ] **Step 1: Написать падающую проверку данных**

```js
// $SCRATCH/letters.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ALPHABET } from './built/letters.js';
import { glyphFor, HEBREW_GLYPH_BY_TRANSLITERATION } from './built/hebrew.js';

test('ровно 22 буквы, без повторов, в алфавитном порядке', () => {
  assert.equal(ALPHABET.length, 22);
  const keys = ALPHABET.map((l) => l.transliteration);
  assert.equal(new Set(keys).size, 22);
  assert.equal(keys[0], 'АЛЕФ');
  assert.equal(keys[21], 'ТАВ');
});

test('каждая транслитерация известна lib/hebrew.ts', () => {
  for (const letter of ALPHABET) {
    assert.ok(
      letter.transliteration in HEBREW_GLYPH_BY_TRANSLITERATION,
      `нет глифа для ${letter.transliteration}`
    );
  }
});

test('категории по «Сефер Йецира»: 3 матери, 7 двойных, 12 простых', () => {
  const by = (c) => ALPHABET.filter((l) => l.category === c).map((l) => l.transliteration);
  assert.deepEqual(by('mother'), ['АЛЕФ', 'МЕМ', 'ШИН']);
  assert.deepEqual(by('double'), ['БЕТ', 'ГИМЕЛ', 'ДАЛЕТ', 'КАФ', 'ПЕЙ', 'РЕШ', 'ТАВ']);
  assert.equal(by('simple').length, 12);
});

test('у каждой буквы непустое имя и заметка', () => {
  for (const letter of ALPHABET) {
    assert.ok(letter.name.length > 0, letter.transliteration);
    assert.ok(letter.note.length > 20, `заметка-заглушка у ${letter.transliteration}`);
  }
});

test('конечные формы достаются из таблицы, а не из данных', () => {
  assert.equal(glyphFor('МЕМ', false), 'מ');
  assert.equal(glyphFor('МЕМ', true), 'ם');
  assert.equal(glyphFor('ЦАДИК', true), 'ץ');
  assert.equal(glyphFor('АЛЕФ', true), 'א'); // у алефа конечной формы нет
});
```

- [ ] **Step 2: Запустить и убедиться, что падает**

```bash
cd /Users/mselivanov/vsc-projects/light-instruments-app
./node_modules/.bin/tsc lib/letters.ts lib/hebrew.ts --outDir "$SCRATCH/built" --target es2020 --module es2020 --skipLibCheck
node --test "$SCRATCH/letters.test.mjs"
```

Ожидаемо: `tsc` падает с «File 'lib/letters.ts' not found».

`--skipLibCheck` обязателен: стоит перечислить файлы в командной строке, и `tsc`
перестаёт читать `tsconfig.json`, начинает проверять типы всех пакетов `@types` в
`node_modules` и выходит с кодом 2 при полностью исправном своём файле.

Ни `letters.ts`, ни `hebrew.ts` ничего не импортируют, поэтому на выходе получаются
самодостаточные ES-модули, которые `node --test` берёт напрямую. Появится импорт —
компиляция перестанет годиться для проверки: `tsc` оставит `from './hebrew'` без
расширения, а node такое не резолвит.

- [ ] **Step 3: Написать `lib/letters.ts`**

Соответствия — «Сефер Йецира», версия Виленского Гаона в переводе Арье Каплана
(гл. 3 — матери, гл. 4 — двойные, гл. 5 — простые). Ничего не дописывать от себя.

```ts
/**
 * Три класса букв по «Сефер Йецира»: три матери (стихии), семь двойных (пара
 * противоположностей, планета, день недели) и двенадцать простых (способность,
 * созвездие, месяц).
 */
export type LetterCategory = 'mother' | 'double' | 'simple';

export type Letter = {
  /**
   * Ключ для lib/hebrew.ts. Данные держат транслитерацию, а не сам глиф, чтобы
   * буква везде получалась через glyphFor() — только так работают конечные формы.
   *
   * Тип намеренно `string`, а не `keyof typeof HEBREW_GLYPH_BY_TRANSLITERATION`:
   * та таблица объявлена как Record<string, string>, так что keyof от неё — всё
   * тот же string, пользы ноль, а импорт сделал бы этот файл незапускаемым в
   * node без сборщика. Соответствие ключей таблице проверяет тест.
   */
  transliteration: string;
  /** Как буква подписана в интерфейсе. */
  name: string;
  category: LetterCategory;
  /** Над чем «Сефер Йецира» поставила её царствовать. */
  note: string;
};

/**
 * Алфавитный порядок — он же порядок расстановки по кругу в колесе Галгал
 * (алеф сверху, дальше по часовой).
 */
export const ALPHABET: readonly Letter[] = [
  { transliteration: 'АЛЕФ', name: 'Алеф', category: 'mother',
    note: 'Мать. Царствует над дыханием: воздух в мире, умеренное в году, грудь в теле — держит равновесие между огнём и водой.' },
  { transliteration: 'БЕТ', name: 'Бет', category: 'double',
    note: 'Двойная. Царствует над мудростью; её оборот — глупость. Луна, воскресенье.' },
  { transliteration: 'ГИМЕЛ', name: 'Гимел', category: 'double',
    note: 'Двойная. Царствует над богатством; его оборот — бедность. Марс, понедельник.' },
  { transliteration: 'ДАЛЕТ', name: 'Далет', category: 'double',
    note: 'Двойная. Царствует над семенем; его оборот — запустение. Солнце, вторник.' },
  { transliteration: 'ХЕЙ', name: 'Хей', category: 'simple',
    note: 'Простая. Царствует над речью. Овен, нисан.' },
  { transliteration: 'ВАВ', name: 'Вав', category: 'simple',
    note: 'Простая. Царствует над мыслью. Телец, ияр.' },
  { transliteration: 'ЗАЙН', name: 'Зайн', category: 'simple',
    note: 'Простая. Царствует над движением. Близнецы, сиван.' },
  { transliteration: 'ХЕТ', name: 'Хет', category: 'simple',
    note: 'Простая. Царствует над зрением. Рак, таммуз.' },
  { transliteration: 'ТЕТ', name: 'Тет', category: 'simple',
    note: 'Простая. Царствует над слухом. Лев, ав.' },
  { transliteration: 'ЙУД', name: 'Йуд', category: 'simple',
    note: 'Простая. Царствует над действием. Дева, элул.' },
  { transliteration: 'КАФ', name: 'Каф', category: 'double',
    note: 'Двойная. Царствует над жизнью; её оборот — смерть. Венера, среда.' },
  { transliteration: 'ЛАМЕД', name: 'Ламед', category: 'simple',
    note: 'Простая. Царствует над соитием. Весы, тишрей.' },
  { transliteration: 'МЕМ', name: 'Мем', category: 'mother',
    note: 'Мать. Царствует над водой: земля в мире, холод в году, чрево в теле.' },
  { transliteration: 'НУН', name: 'Нун', category: 'simple',
    note: 'Простая. Царствует над обонянием. Скорпион, хешван.' },
  { transliteration: 'САМЕХ', name: 'Самех', category: 'simple',
    note: 'Простая. Царствует над сном. Стрелец, кислев.' },
  { transliteration: 'АЙН', name: 'Айн', category: 'simple',
    note: 'Простая. Царствует над гневом. Козерог, тевет.' },
  { transliteration: 'ПЕЙ', name: 'Пей', category: 'double',
    note: 'Двойная. Царствует над властью; её оборот — подчинение. Меркурий, четверг.' },
  { transliteration: 'ЦАДИК', name: 'Цадик', category: 'simple',
    note: 'Простая. Царствует над вкусом. Водолей, шват.' },
  { transliteration: 'КУФ', name: 'Куф', category: 'simple',
    note: 'Простая. Царствует над смехом. Рыбы, адар.' },
  { transliteration: 'РЕШ', name: 'Реш', category: 'double',
    note: 'Двойная. Царствует над миром; его оборот — война. Сатурн, пятница.' },
  { transliteration: 'ШИН', name: 'Шин', category: 'mother',
    note: 'Мать. Царствует над огнём: небо в мире, жар в году, голова в теле.' },
  { transliteration: 'ТАВ', name: 'Тав', category: 'double',
    note: 'Двойная. Царствует над красотой; её оборот — безобразие. Юпитер, суббота.' },
];

/** Подпись под сеткой букв — источник соответствий выше. */
export const ALPHABET_SOURCE =
  'Соответствия букв даны по «Сефер Йецира» в версии Виленского Гаона, перевод Арье Каплана.';
```

- [ ] **Step 4: Запустить проверку — должна пройти**

```bash
./node_modules/.bin/tsc lib/letters.ts lib/hebrew.ts --outDir "$SCRATCH/built" --target es2020 --module es2020 --skipLibCheck
node --test "$SCRATCH/letters.test.mjs"
```

Ожидаемо: 5 passed.

- [ ] **Step 5: Написать `components/Glyph.tsx`**

Число 0.05 — не подобранное, вывод в комментарии. Не «поправлять на глаз»: в первой
версии мокапа буква была поднята на 0.13em и сидела заметно выше центра круга.

```tsx
import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';
import { glyphFor } from '../lib/hebrew';
import { fonts } from '../lib/theme';

/**
 * Насколько буква опускается, долей от кегля, чтобы её чернила встали в центр
 * своего бокса.
 *
 * Выведено из метрик Ashurit, а не подобрано. Базовая линия шрифта лежит на
 * 0.960em ниже верха строки при штатном интерлиньяже, а сама строка высотой
 * 1.37em (0.960 + 0.41 зарезервированного выносного элемента) — те же числа, на
 * которых стоит HebrewGlyphs. При lineHeight = fontSize половинный интерлиньяж
 * уходит в минус на 0.185em, базовая линия оказывается на 0.775em от верха
 * бокса, а средняя буква высотой 0.649em занимает от 0.126em до 0.775em: её
 * оптический центр на 0.4505em против центра бокса на 0.5em. Разницу и
 * добираем — вниз, а не вверх.
 */
const OPTICAL_OFFSET = 0.05;

/**
 * Одна ивритская буква. Глиф всегда достаётся через glyphFor: `isFinal`
 * переключает каф, мем, нун, пей и цадик на конечные формы ך ם ן ף ץ.
 */
export function Glyph({
  transliteration,
  size,
  color,
  isFinal = false,
  style,
}: {
  transliteration: string;
  size: number;
  color: string;
  isFinal?: boolean;
  style?: StyleProp<TextStyle>;
}) {
  return (
    <Text
      style={[
        styles.glyph,
        {
          fontSize: size,
          lineHeight: size,
          color,
          transform: [{ translateY: size * OPTICAL_OFFSET }],
        },
        style,
      ]}
      // Буква — изображение, а не текст для чтения вслух: её транслитерация
      // всегда стоит рядом отдельной подписью.
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      {glyphFor(transliteration, isFinal)}
    </Text>
  );
}

const styles = StyleSheet.create({
  glyph: {
    fontFamily: fonts.displayHebrew,
    // Android иначе добавляет свой отступ поверх метрик шрифта и ломает расчёт.
    includeFontPadding: false,
  },
});
```

- [ ] **Step 6: Расширить тип в `components/HebrewGlyphs.tsx`**

Компонент уже итерируется по массиву и уже помечает последний элемент конечным
(`i === letters.length - 1`) — жёсткая тройка стоит только в типе. Меняем строку 7:

```tsx
// было
letters: [string, string, string];
// стало
letters: readonly string[];
```

И дописываем к комментарию компонента, что он обслуживает и трёхбуквенное Имя, и
двухбуквенные врата Галгала.

- [ ] **Step 7: Добавить токены дневного фона в `lib/theme.ts`**

В объект `colors`, после `hairlineSoft`:

```ts
  // Дневной режим созерцания буквы — не тема приложения, а принадлежность
  // одного экрана: светлый фон и чёрная буква как в печатной книге.
  dayGround: '#efe9dd',
  dayInk: '#16130f',
```

- [ ] **Step 8: Проверить типы и закоммитить**

```bash
./node_modules/.bin/tsc --noEmit
git add lib/letters.ts lib/theme.ts components/Glyph.tsx components/HebrewGlyphs.tsx
git commit -m "Add the canonical alphabet and a single-glyph primitive"
```

---

## Task 2: Экран созерцания буквы

Первая из практик: на ней устаканивается работа с крупным Ашуритом, таймером сессии и
Wake Lock. Wake Lock живёт здесь же — раньше он никому не нужен, и отдельной задачей его
было бы нечем проверить.

**Files:**
- Create: `app/practices/letter.tsx`
- Create: `lib/wake-lock.ts`
- Create: `lib/wake-lock.web.ts`
- Test: `$SCRATCH/letter.test.mjs`

**Interfaces:**
- Consumes: `ALPHABET`, `ALPHABET_SOURCE` (Task 1); `<Glyph />` (Task 1);
  `colors.dayGround`, `colors.dayInk` (Task 1).
- Produces: `useWakeLock(active: boolean): void` из `lib/wake-lock`; маршрут
  `/practices/letter`.

- [ ] **Step 1: Написать падающую проверку экрана**

```js
// $SCRATCH/letter.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { open, tapEl } from './harness.mjs';

test('сетка показывает все 22 буквы, без пояснений', async () => {
  const { browser, page } = await open('/practices/letter');
  const cells = page.getByRole('button', { name: /^Буква / });
  assert.equal(await cells.count(), 22);
  // в сетке только форма и имя — заметки из lib/letters.ts тут быть не должно
  assert.equal(await page.getByText('Царствует над').count(), 0);
  assert.ok(await page.getByText('Сефер Йецира').isVisible());
  await browser.close();
});

test('выбор буквы открывает настройку с её заметкой', async () => {
  const { browser, page, cdp } = await open('/practices/letter');
  await tapEl(cdp, page.getByRole('button', { name: 'Буква Мем' }));
  await page.waitForTimeout(400);
  assert.ok(await page.getByText(/Царствует над водой/).isVisible());
  assert.ok(await page.getByRole('button', { name: 'Начать' }).isVisible());
  await browser.close();
});

test('после старта интерфейс растворяется, времени на экране нет', async () => {
  const { browser, page, cdp } = await open('/practices/letter');
  await tapEl(cdp, page.getByRole('button', { name: 'Буква Алеф' }));
  await page.waitForTimeout(400);
  await tapEl(cdp, page.getByRole('button', { name: 'Начать' }));
  await page.waitForTimeout(3200);           // 2000 мс ожидания + 700 мс затухания
  assert.equal(
    await page.getByTestId('gaze-chrome').evaluate((el) => getComputedStyle(el).opacity),
    '0'
  );
  assert.equal(await page.getByText(/минут|осталось/i).count(), 0);
  await browser.close();
});

test('касание возвращает управление', async () => {
  const { browser, page, cdp } = await open('/practices/letter');
  await tapEl(cdp, page.getByRole('button', { name: 'Буква Алеф' }));
  await page.waitForTimeout(400);
  await tapEl(cdp, page.getByRole('button', { name: 'Начать' }));
  await page.waitForTimeout(3200);
  await tapEl(cdp, page.getByLabel('Созерцание'));
  await page.waitForTimeout(900);
  assert.equal(
    await page.getByTestId('gaze-chrome').evaluate((el) => getComputedStyle(el).opacity),
    '1'
  );
  await browser.close();
});

test('экран удерживается от гашения', async () => {
  const { browser, page, cdp } = await open('/practices/letter');
  await page.evaluate(() => {
    window.__wakeCalls = 0;
    // defineProperty, not assignment: navigator.wakeLock is an accessor on
    // Navigator.prototype, so `navigator.wakeLock = {...}` is swallowed and the
    // native implementation stays in place — the stub would count nothing.
    Object.defineProperty(navigator, 'wakeLock', {
      configurable: true,
      value: {
        request: async () => {
          window.__wakeCalls++;
          return { release: async () => {} };
        },
      },
    });
  });
  await tapEl(cdp, page.getByRole('button', { name: 'Буква Алеф' }));
  await page.waitForTimeout(400);
  await tapEl(cdp, page.getByRole('button', { name: 'Начать' }));
  await page.waitForTimeout(600);
  assert.ok(await page.evaluate(() => window.__wakeCalls) >= 1, 'wake lock never requested');
  await browser.close();
});
```

- [ ] **Step 2: Запустить и убедиться, что падает**

```bash
npm run web          # отдельный терминал, ждать «Web is waiting on http://localhost:8081»
node --test "$SCRATCH/letter.test.mjs"
```

Ожидаемо: все пять падают — маршрута нет, Metro отдаёт «Unmatched Route».

- [ ] **Step 3: Написать `lib/wake-lock.ts` (нативная пустышка)**

```ts
/**
 * Нативная заглушка. Распространение у проекта PWA-шное (см. спеку от
 * 2026-09-07), и тянуть expo-keep-awake ради платформы, на которой никого нет,
 * незачем — вернётся нативная сборка, реализуем здесь.
 */
export function useWakeLock(_active: boolean): void {}
```

- [ ] **Step 4: Написать `lib/wake-lock.web.ts`**

```ts
import { useEffect } from 'react';

/**
 * Держит экран незагашенным, пока `active`.
 *
 * Практики идут по 3–10 минут, и в созерцании за всё это время не случается ни
 * одного касания — браузер гасит подсветку примерно через полминуты, и практика
 * перестаёт работать.
 *
 * Две тонкости. Блокировка снимается браузером сама, когда вкладка уходит на
 * фон, поэтому её приходится запрашивать заново на visibilitychange. И API есть
 * не везде — в Safari он появился только в 16.4, — так что и проверка наличия, и
 * try/catch здесь обязательны: практика без Wake Lock работает хуже, но работает.
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;

    let sentinel: { release: () => Promise<void> } | null = null;
    let cancelled = false;

    const request = async () => {
      try {
        const next = await (navigator as any).wakeLock.request('screen');
        if (cancelled) {
          next.release().catch(() => {});
          return;
        }
        sentinel = next;
      } catch {
        // Отказ браузера — не повод падать.
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') request();
    };

    request();
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      sentinel?.release().catch(() => {});
    };
  }, [active]);
}
```

- [ ] **Step 5: Написать `app/practices/letter.tsx`**

Структура — фазы как состояние, не как маршруты:

```tsx
type Phase = 'pick' | 'setup' | 'run' | 'done';
```

Что на каждой фазе:

**`pick`** — `ScrollView` с `useScreenPadding()`, внутри: `<HomeButton />`, заголовок
«Созерцание буквы», три абзаца (`type.read`, `colors.parchmentDim`, стиль абзацев —
как `styles.paragraph` в [app/intro.tsx](../../../app/intro.tsx)):

1. «**Что это.** Самая старая и самая простая из практик с буквами: неподвижное
   всматривание в одну форму. Не читать, не называть звук, не искать значение — просто
   смотреть, как смотрят на пламя свечи.»
2. «**Зачем.** Буква — удобная опора для внимания: она конечна, неподвижна и ничего от
   вас не требует. Ум, которому не за что зацепиться, успокаивается сам; форма остаётся,
   а внутренняя болтовня постепенно стихает.»
3. «**Как.** Выберите букву — с какой захочется, порядка нет. Смотрите на неё
   расслабленно, не вглядываясь до рези; моргать можно. Мысли будут приходить — не
   боритесь с ними, просто возвращайте взгляд к букве. Начать стоит с трёх минут.»

Дальше сетка `ALPHABET.map(...)`: `flexDirection: 'row'`, `flexWrap: 'wrap'`, `gap: 8`,
ячейка `width: '23.5%'`, `aspectRatio: 1`, фон `colors.veil`, рамка `colors.hairlineSoft`,
радиус 12. В ячейке `<Glyph size={30} color={colors.spark} />` и под ним имя строчными
(`type.tag`, `colors.parchmentDim`). `accessibilityLabel={`Буква ${letter.name}`}` —
на него завязаны проверки. Под сеткой — `ALPHABET_SOURCE` в `type.small`.

**`setup`** — `IconButton` «Назад» (возврат в `pick` сменой состояния, не навигацией),
`<Glyph size={112} color={colors.spark} />` по центру, имя (`type.screenTitle`,
`fonts.displayRuBold`), заметка (`type.body`, по центру), затем группы пилюль:
«Длительность» 3 / 5 минут и «Фон» Вечер / День. Пилюли — по образцу `styles.dayCta` из
[app/index.tsx](../../../app/index.tsx): выбранная получает фон `colors.sparkWash`, рамку
`colors.sparkSoft`, текст `colors.spark`. Внизу кнопка «Начать» во всю ширину.
Переключение фона меняет превью тут же, до старта.

**`run`** — `Pressable` во весь экран с `accessibilityLabel="Созерцание"`, фон
`colors.void` либо `colors.dayGround`, в центре `<Glyph size={200} />` цветом
`colors.spark` либо `colors.dayInk`. Поверх — `Animated.View` с `testID="gaze-chrome"` и единственным
`IconButton` «Завершить» внутри; `opacity` этой обёртки уходит в 0 через 2000 мс после старта
(`Animated.timing`, 700 мс, `useNativeDriver: true`). Касание переключает видимость
обратно. `useWakeLock(phase === 'run')`. **Ни таймера, ни текста времени на экране.**

Завершение: `setTimeout` на `minutes * 60_000`; по нему вся поверхность гаснет
`Animated.timing` за 8000 мс, затем `setPhase('done')`. Выход крестиком до срока —
сразу в `pick`, без экрана завершения: незаконченная сессия не событие. Все таймеры
снимаются в cleanup эффекта.

**`done`** — «Сессия завершена» (`fonts.displayRuBold`, `type.screenTitle`) и кнопка
«К буквам», возвращающая в `pick`.

- [ ] **Step 6: Прогнать проверки — должны пройти**

```bash
node --test "$SCRATCH/letter.test.mjs"
```

Ожидаемо: 5 passed.

- [ ] **Step 7: Посмотреть глазами на узком экране**

```bash
node -e "
import('playwright').then(async ({ chromium, devices }) => {
  const b = await chromium.launch();
  const c = await b.newContext({ ...devices['iPhone SE'] });   // 320pt
  const p = await c.newPage();
  await p.goto('http://localhost:8081/practices/letter');
  await p.waitForTimeout(2000);
  await p.screenshot({ path: process.env.SCRATCH + '/letter-320.png', fullPage: true });
  await b.close();
});
"
```

Проверить на скриншоте: сетка 4 колонки не разъезжается, буквы не липнут к рамкам ячеек,
буква стоит по центру ячейки (не выше).

- [ ] **Step 8: Типы и коммит**

```bash
./node_modules/.bin/tsc --noEmit
git add app/practices/letter.tsx lib/wake-lock.ts lib/wake-lock.web.ts
git commit -m "Add the letter contemplation practice"
```

---

## Task 3: Экран дыхания на Тетраграмматон

**Files:**
- Create: `app/practices/breathing.tsx`
- Test: `$SCRATCH/breathing.test.mjs`

**Interfaces:**
- Consumes: `<Glyph />` (Task 1), `useWakeLock` (Task 2).
- Produces: маршрут `/practices/breathing`.

- [ ] **Step 1: Написать падающую проверку**

```js
// $SCRATCH/breathing.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { open, tapEl } from './harness.mjs';

const FIELD = { name: 'Следующая фаза дыхания' };

async function start(page, cdp) {
  await tapEl(cdp, page.getByRole('button', { name: 'Начать' }));
  await page.waitForTimeout(500);
}

test('касание ведёт буквы по кругу Йуд → Хей → Вав → Хей', async () => {
  const { browser, page, cdp } = await open('/practices/breathing');
  await start(page, cdp);
  const glyph = page.getByTestId('breath-glyph');
  assert.equal((await glyph.textContent()).trim(), 'י');
  for (const expected of ['ה', 'ו', 'ה', 'י']) {
    await tapEl(cdp, page.getByRole('button', FIELD));
    await page.waitForTimeout(400);
    assert.equal((await glyph.textContent()).trim(), expected);
  }
  await browser.close();
});

test('подсказка и подпись фазы уходят после первого круга', async () => {
  const { browser, page, cdp } = await open('/practices/breathing');
  await start(page, cdp);
  const hint = page.getByTestId('breath-hint');
  const phase = page.getByTestId('breath-phase');
  assert.equal(await hint.evaluate((el) => getComputedStyle(el).opacity), '1');
  for (let i = 0; i < 4; i++) {
    await tapEl(cdp, page.getByRole('button', FIELD));
    await page.waitForTimeout(300);
  }
  await page.waitForTimeout(900);
  assert.equal(await hint.evaluate((el) => getComputedStyle(el).opacity), '0');
  assert.equal(await phase.evaluate((el) => getComputedStyle(el).opacity), '0');
  await browser.close();
});

test('кольцо растёт на вдохе и не доходит до конца само', async () => {
  const { browser, page, cdp } = await open('/practices/breathing');
  await start(page, cdp);
  const ring = page.getByTestId('breath-ring');
  const scaleOf = async () => {
    const m = await ring.evaluate((el) => getComputedStyle(el).transform);
    return m === 'none' ? 1 : parseFloat(m.split('(')[1]);
  };
  const early = await scaleOf();
  await page.waitForTimeout(2500);
  const later = await scaleOf();
  assert.ok(later > early, `кольцо не растёт: ${early} → ${later}`);
  await page.waitForTimeout(8000);           // сильно дольше ожидаемых 4 сек
  assert.ok((await scaleOf()) < 1, 'кольцо доехало до конца и ждёт — так быть не должно');
  await browser.close();
});

test('на экране практики нет ни счётчиков, ни времени', async () => {
  const { browser, page, cdp } = await open('/practices/breathing');
  await start(page, cdp);
  assert.equal(await page.getByText(/\d+\s*(из|мин|сек)/i).count(), 0);
  await browser.close();
});
```

- [ ] **Step 2: Запустить, убедиться, что падает**

```bash
node --test "$SCRATCH/breathing.test.mjs"
```

- [ ] **Step 3: Написать фазы и логику ритма**

Ядро экрана, его писать точно так:

```tsx
const PHASES = [
  { transliteration: 'ЙУД', label: 'вдох', hint: 'Коснитесь экрана, когда закончите вдох', mode: 'grow' },
  { transliteration: 'ХЕЙ', label: 'пауза', hint: 'Коснитесь, когда пауза закончится', mode: 'hold' },
  { transliteration: 'ВАВ', label: 'выдох', hint: 'Коснитесь в конце выдоха', mode: 'shrink' },
  { transliteration: 'ХЕЙ', label: 'покой', hint: 'Коснитесь, когда захочется вдохнуть', mode: 'hold' },
] as const;

/** Насколько кольцо сжимается на выдохе. */
const MIN_SCALE = 0.44;
/** Ожидаемая длительность фазы, пока о пользователе ничего не известно. */
const DEFAULT_MS = 4000;

function median(list: number[]): number {
  if (list.length === 0) return DEFAULT_MS;
  const sorted = [...list].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
```

Анимация кольца — единственное место, где легко ошибиться:

```tsx
/**
 * Кольцо не отсчитывает секунды. Оно проходит 95 % пути за ожидаемую длину фазы
 * и дальше почти незаметно подползает — чтобы показывать движение, но физически
 * не уметь закончиться раньше человека и не ждать его завершённой анимацией.
 *
 * Отсюда и четырёхкратная длительность, и эта функция сглаживания: при t = 0.25
 * (то есть в момент `expected`) она даёт ровно 1 − e⁻³ ≈ 0.95.
 */
const asymptotic = (t: number) => (1 - Math.exp(-12 * t)) / (1 - Math.exp(-12));

function animatePhase(progress: Animated.Value, expected: number) {
  progress.setValue(0);
  Animated.timing(progress, {
    toValue: 1,
    duration: expected * 4,
    easing: asymptotic,
    useNativeDriver: true,
  }).start();
}
```

Масштаб кольца берётся интерполяцией `progress` между `scaleFrom` (значение на момент
смены фазы) и целью: 1 для `grow`, `MIN_SCALE` для `shrink`. На `hold` новая анимация не
запускается — значение остаётся там, где его оставила предыдущая фаза.

Смена буквы — кроссфейд отдельным `Animated.Value`, 260 мс, подмена текста в середине.

- [ ] **Step 4: Собрать экран**

**`intro`** — `<HomeButton />`, заголовок «Дыхание на Имя», три абзаца:

1. «Четырёхбуквенное Имя — это не слово, которое произносят, а описание одного полного
   дыхания. Йуд — вдох, искра и начало. Хей — раскрытие, пауза наверху. Вав — выдох,
   связь и продолжение. Хей — покой перед следующим вдохом.»
2. «**Зачем.** Дыхание — единственный телесный процесс, который идёт сам и которым можно
   управлять. Практика не меняет его, а возвращает внимание к нему: пока вы смотрите на
   букву, ум занят одной вещью, а не тридцатью.»
3. «**Как.** Дышите как дышится — ритм не задан. Смотрите на букву и касайтесь экрана,
   когда эта часть дыхания закончилась. Имя не произносят вслух, его только видят. Если
   отвлеклись — просто коснитесь и продолжайте.»

Пилюли длительности 3 / 5 / 10 минут (по умолчанию 5), кнопка «Начать».

**`run`** — `Pressable` во весь экран, `accessibilityLabel="Следующая фаза дыхания"`,
стиль `tappable`. В центре: `Animated.View` кольца (`testID="breath-ring"`, диаметр 236,
рамка 1.5 `colors.sparkSoft`, радиус 50 %), мягкая заливка под ним и
`<Glyph size={116} color={colors.parchment} />` с `testID="breath-glyph"`. Крестик
«Завершить» — выше по `zIndex`, с `e.stopPropagation()` в обработчике, иначе выход
засчитается ещё и как смена фазы. Подпись фазы (`testID="breath-phase"`) и подсказка
(`testID="breath-hint"`) — под кольцом; обе уходят в прозрачность после первого полного
круга и больше не возвращаются. `useWakeLock(phase === 'run')`.

**Завершение.** Время сессии проверяется в момент смены фазы, а не по таймеру: когда
`Date.now() >= sessionEndsAt` **и** цикл только что замкнулся (индекс вернулся к 0),
практика переходит в `done`. Так сессия всегда заканчивается на закрывающем Хей, а не
посреди вдоха.

**`done`** — `<Glyph transliteration="ХЕЙ" size={88} color={colors.sparkSoft} />`,
«Сессия завершена», кнопка «На главную» (`router.replace('/')`).

- [ ] **Step 5: Прогнать проверки**

```bash
node --test "$SCRATCH/breathing.test.mjs"
```

Ожидаемо: 4 passed. Если падает третья — скорее всего кольцо анимируют обычным
`Easing.out`, который доезжает до конца и встаёт; вернуться к `asymptotic`.

- [ ] **Step 6: Типы и коммит**

```bash
./node_modules/.bin/tsc --noEmit
git add app/practices/breathing.tsx
git commit -m "Add the Tetragrammaton breathing practice"
```

---

## Task 4: Геометрия колеса

Чистая арифметика отдельно от экрана: её можно проверить без браузера, а ошибка в ней
на экране выглядит как «что-то криво» и ищется долго.

**Files:**
- Create: `lib/galgal.ts`
- Test: `$SCRATCH/galgal.test.mjs`

**Interfaces:**
- Consumes: ничего.
- Produces:
  - `type WheelPoint = { x: number; y: number }`
  - `wheelPoints(count: number, size: number, radius: number): WheelPoint[]`
  - `partnersOf(anchor: number, count: number): number[]`
  - `chordLayout(a: WheelPoint, b: WheelPoint): { left: number; top: number; width: number; angle: number }`
  - `letterHitSize(radius: number, count: number): number`

- [ ] **Step 1: Написать падающую проверку**

```js
// $SCRATCH/galgal.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wheelPoints, partnersOf, chordLayout, letterHitSize } from './built/galgal.js';

const near = (a, b, eps = 0.001) => assert.ok(Math.abs(a - b) < eps, `${a} ≉ ${b}`);

test('первая точка строго сверху, дальше по часовой', () => {
  const pts = wheelPoints(22, 280, 116);
  near(pts[0].x, 140);
  near(pts[0].y, 24);                       // 140 − 116
  assert.ok(pts[1].x > pts[0].x, 'вторая буква должна уйти вправо');
  assert.ok(pts[1].y > pts[0].y, 'и вниз');
});

test('точки лежат на окружности и распределены равномерно', () => {
  const pts = wheelPoints(22, 280, 116);
  assert.equal(pts.length, 22);
  for (const p of pts) near(Math.hypot(p.x - 140, p.y - 140), 116);
  const step = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
  for (let i = 1; i < 22; i++) {
    const next = (i + 1) % 22;
    near(Math.hypot(pts[next].x - pts[i].x, pts[next].y - pts[i].y), step, 0.01);
  }
});

test('партнёры — 21 буква по часовой, сама якорная пропущена', () => {
  assert.deepEqual(partnersOf(0, 22).slice(0, 3), [1, 2, 3]);
  assert.equal(partnersOf(0, 22).length, 21);
  assert.ok(!partnersOf(5, 22).includes(5));
  assert.deepEqual(partnersOf(21, 22).slice(0, 2), [0, 1]);   // перекатывается через край
});

test('хорда описана серединой, а не левым краем', () => {
  // В React Native rotate крутит вокруг центра элемента, поэтому раскладка
  // обязана быть от середины — иначе линия уезжает.
  const layout = chordLayout({ x: 0, y: 0 }, { x: 100, y: 0 });
  near(layout.width, 100);
  near(layout.left, 0);                     // 50 − 100/2
  near(layout.top, 0);
  near(layout.angle, 0);
  const diagonal = chordLayout({ x: 0, y: 0 }, { x: 10, y: 10 });
  near(diagonal.angle, Math.PI / 4);
  near(diagonal.width, Math.hypot(10, 10));
});

test('тап-зона равна шагу между буквами и не больше 44', () => {
  near(letterHitSize(116, 22), 2 * 116 * Math.sin(Math.PI / 22));
  assert.equal(letterHitSize(400, 22), 44);  // на широком колесе упирается в 44
});
```

- [ ] **Step 2: Запустить, убедиться, что падает**

```bash
./node_modules/.bin/tsc lib/galgal.ts --outDir "$SCRATCH/built" --target es2020 --module es2020 --skipLibCheck
node --test "$SCRATCH/galgal.test.mjs"
```

- [ ] **Step 3: Написать `lib/galgal.ts`**

```ts
export type WheelPoint = { x: number; y: number };

/** Максимальная тап-зона буквы: рекомендованные Apple 44pt. */
const MAX_HIT = 44;

/**
 * Центры букв по окружности: угол = π/2 − 2π·i/count, то есть первая буква
 * строго сверху, дальше по часовой стрелке — раскладка из PDF-варианта колеса.
 *
 * `size` — сторона квадратного контейнера, координаты возвращаются в его
 * системе, так что их можно класть прямо в left/top абсолютных элементов.
 */
export function wheelPoints(count: number, size: number, radius: number): WheelPoint[] {
  const centre = size / 2;
  return Array.from({ length: count }, (_, i) => {
    const angle = Math.PI / 2 - (2 * Math.PI * i) / count;
    return {
      x: centre + radius * Math.cos(angle),
      // Минус: экранная ось Y растёт вниз, а тригонометрическая — вверх.
      y: centre - radius * Math.sin(angle),
    };
  });
}

/**
 * Партнёры буквы: все остальные по часовой стрелке, начиная с соседней.
 * Сама якорная буква пропускается — отсюда 21 пара в круге из 22 букв.
 */
export function partnersOf(anchor: number, count: number): number[] {
  return Array.from({ length: count - 1 }, (_, k) => (anchor + k + 1) % count);
}

/**
 * Раскладка хорды между двумя буквами для обычного View высотой в пиксель.
 *
 * Важное отличие от веба: в React Native `rotate` вращает элемент вокруг его
 * центра, а не вокруг левого края, и transform-origin задать нельзя. Поэтому
 * прямоугольник ставится серединой на середину хорды — тогда поворот вокруг
 * центра даёт ровно то, что нужно.
 */
export function chordLayout(a: WheelPoint, b: WheelPoint) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const width = Math.hypot(dx, dy);
  return {
    left: (a.x + b.x) / 2 - width / 2,
    top: (a.y + b.y) / 2,
    width,
    angle: Math.atan2(dy, dx),
  };
}

/**
 * Сторона тап-зоны буквы — ровно шаг между соседями по окружности, чтобы зоны
 * не перекрывались.
 *
 * На типичном телефоне (390pt) выходит около 42pt, на самом узком (320pt) —
 * около 34pt, что ниже рекомендованных 44pt. Это осознанно: на колесе из 22
 * элементов перекрывающиеся зоны хуже маленьких, букву выбирают один раз за
 * сессию, а промах исправляется повторным касанием. hitSlop здесь не
 * применять — он вернёт перекрытие.
 */
export function letterHitSize(radius: number, count: number): number {
  return Math.min(MAX_HIT, 2 * radius * Math.sin(Math.PI / count));
}
```

- [ ] **Step 4: Прогнать проверку**

```bash
./node_modules/.bin/tsc lib/galgal.ts --outDir "$SCRATCH/built" --target es2020 --module es2020 --skipLibCheck
node --test "$SCRATCH/galgal.test.mjs"
```

Ожидаемо: 5 passed.

- [ ] **Step 5: Типы и коммит**

```bash
./node_modules/.bin/tsc --noEmit
git add lib/galgal.ts
git commit -m "Add the Galgal wheel geometry"
```

---

## Task 5: Экран колеса Галгал

**Files:**
- Create: `app/practices/galgal.tsx`
- Test: `$SCRATCH/galgal-screen.test.mjs`

**Interfaces:**
- Consumes: `ALPHABET` (Task 1), `<Glyph />` (Task 1), `useWakeLock` (Task 2),
  `wheelPoints` / `partnersOf` / `chordLayout` / `letterHitSize` (Task 4),
  `<HebrewGlyphs letters={readonly string[]} variant="display" />` (Task 1).
- Produces: маршрут `/practices/galgal`; ключ хранилища `galgal:walked:v1`.

- [ ] **Step 1: Написать падающую проверку**

```js
// $SCRATCH/galgal-screen.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { open, tapEl } from './harness.mjs';

async function startCircle(page, cdp, letter) {
  await tapEl(cdp, page.getByRole('button', { name: 'К колесу' }));
  await page.waitForTimeout(400);
  await tapEl(cdp, page.getByRole('button', { name: letter }));
  await page.waitForTimeout(400);
  await tapEl(cdp, page.getByRole('button', { name: 'Начать круг' }));
  await page.waitForTimeout(500);
}

test('колесо показывает 22 буквы и подпись «231 врата»', async () => {
  const { browser, page, cdp } = await open('/practices/galgal');
  await tapEl(cdp, page.getByRole('button', { name: 'К колесу' }));
  await page.waitForTimeout(400);
  assert.equal(await page.getByRole('button', { name: /^Буква / }).count(), 22);
  assert.ok(await page.getByText('231').isVisible());
  await browser.close();
});

test('вторая буква пары берёт конечную форму', async () => {
  const { browser, page, cdp } = await open('/practices/galgal');
  await startCircle(page, cdp, 'Буква Алеф');
  // партнёры идут по часовой от алефа: бет, гимел, ..., мем — двенадцатый
  for (let i = 0; i < 11; i++) {
    await tapEl(cdp, page.getByRole('button', { name: 'Следующая пара' }));
    await page.waitForTimeout(250);
  }
  const pair = await page.getByTestId('gate-pair').textContent();
  assert.ok(pair.includes('ם'), `ожидалась конечная форма мема, получено «${pair}»`);
  assert.ok(!pair.includes('מ'), 'обычная форма мема в конце пары недопустима');
  await browser.close();
});

test('круг — 21 пара, и на экране нет счётчика', async () => {
  const { browser, page, cdp } = await open('/practices/galgal');
  await startCircle(page, cdp, 'Буква Алеф');
  assert.equal(await page.getByText(/\d+\s*из\s*\d+/).count(), 0);
  // 21 пар в круге: старт показывает первую, значит до конца ровно 21 касание.
  for (let i = 0; i < 21; i++) {
    await tapEl(cdp, page.getByRole('button', { name: 'Следующая пара' }));
    await page.waitForTimeout(200);
  }
  await page.waitForTimeout(500);
  assert.ok(await page.getByText('Круг алеф пройден').isVisible());
  await browser.close();
});

test('пройденный круг помечается и переживает перезагрузку', async () => {
  const { browser, page, cdp } = await open('/practices/galgal');
  await startCircle(page, cdp, 'Буква Алеф');
  for (let i = 0; i < 21; i++) {
    await tapEl(cdp, page.getByRole('button', { name: 'Следующая пара' }));
    await page.waitForTimeout(200);
  }
  await page.waitForTimeout(500);
  await page.reload();
  await page.waitForTimeout(2000);
  await tapEl(cdp, page.getByRole('button', { name: 'К колесу' }));
  await page.waitForTimeout(400);
  const marked = await page
    .getByRole('button', { name: 'Буква Алеф' })
    .evaluate((el) => el.dataset.walked);
  assert.equal(marked, 'true');
  await browser.close();
});

test('выход посреди круга ничего не записывает', async () => {
  const { browser, page, cdp } = await open('/practices/galgal');
  await startCircle(page, cdp, 'Буква Бет');
  await tapEl(cdp, page.getByRole('button', { name: 'Следующая пара' }));
  await page.waitForTimeout(250);
  await tapEl(cdp, page.getByRole('button', { name: 'Завершить' }));
  await page.waitForTimeout(400);
  const marked = await page
    .getByRole('button', { name: 'Буква Бет' })
    .evaluate((el) => el.dataset.walked);
  assert.notEqual(marked, 'true');
  await browser.close();
});
```

- [ ] **Step 2: Запустить, убедиться, что падает**

```bash
node --test "$SCRATCH/galgal-screen.test.mjs"
```

- [ ] **Step 3: Собрать экран**

Фазы: `'intro' | 'pick' | 'setup' | 'run' | 'done'`.

**`intro`** — `<HomeButton />`, заголовок «231 врата», три абзаца:

1. «**Что это.** «Сефер Йецира» описывает 22 буквы, вставленные в колесо, которое
   вращается вперёд и назад. Каждая буква соединяется с каждой — 231 сочетание, «врата»,
   через которые, по тексту, было сотворено всё сущее.»
2. «**Зачем.** Значения искать не нужно: у большинства пар его нет. Смысл — в самом
   переборе. Пройти круг буквы до конца, не пропустив ни одного сочетания: практика
   исчерпания, а не понимания.»
3. «**Как.** Выберите букву на колесе. Приложение поведёт её по кругу — по одной паре за
   раз. Каждую произносите вслух или про себя, нараспев, на одном выдохе. Один круг — 21
   пара, три-четыре минуты. Полный обход из 231 врат складывается из таких кругов и
   занимает столько заходов, сколько нужно.»

Кнопка «К колесу».

**`pick`** — колесо. Размер `Math.min(width - 40, 340)`, радиус `size / 2 - 24`,
точки из `wheelPoints`, тап-зона из `letterHitSize`. Каждая буква — `Pressable` с
`accessibilityLabel={`Буква ${letter.name}`}` и `dataSet={{ walked: String(isWalked) }}`
(react-native-web кладёт это в `data-walked`, на нём стоит проверка). Пройденные — цветом
`colors.sparkSoft`, остальные `colors.parchment`. В центре — некликабельная подпись
«231 / врата». Окружность — `View` с `borderRadius: '50%'` и рамкой `colors.hairline`.

**`setup`** — выбранная буква `<Glyph size={104} color={colors.spark} />`, «Круг {имя}»,
«21 сочетание · около трёх минут», пилюли темпа «По касанию» (по умолчанию) / «4 сек» /
«6 сек», кнопка «Начать круг».

**`run`** — `Pressable` во весь экран, `accessibilityLabel="Следующая пара"`. Сверху пара:

```tsx
<View testID="gate-pair">
  <HebrewGlyphs
    letters={[anchor.transliteration, partner.transliteration]}
    variant="display"
  />
</View>
```

Конечную форму, точку между буквами, транслитерации и общую базовую линию подписей
компонент делает сам — ничего из этого здесь не воспроизводить.

Под парой — то же колесо в уменьшенном виде (размер 168, радиус 70, глиф 14), но буквы в
нём **не** `Pressable`, а обычные `View`: экран целиком уже является кнопкой, вложенные
кнопки её ломают. Якорная буква — `colors.spark`, текущий партнёр — на золотой плашке,
пройденные — `colors.sparkSoft`, остальные с `opacity: 0.3`. Хорда между якорем и текущим
партнёром — `View` высотой 1 с раскладкой из `chordLayout`:

```tsx
<View
  style={{
    position: 'absolute',
    left: layout.left,
    top: layout.top,
    width: layout.width,
    height: 1,
    backgroundColor: colors.spark,
    opacity: 0.5,
    transform: [{ rotate: `${layout.angle}rad` }],
  }}
/>
```

В режиме с темпом касание игнорируется, переход ведёт `setTimeout`; в режиме «по касанию»
таймера нет вовсе. Подсказка внизу («Произнесите пару — и коснитесь экрана» либо «Пары
сменяются сами, каждые N сек») уходит после первого перехода. Крестик «Завершить» — выше
по `zIndex`, с `stopPropagation`. `useWakeLock(phase === 'run')`.

**`done`** — после 21-й пары: буква якоря, «Круг {имя} пройден», кнопка «К колесу».
Здесь же запись в хранилище:

```ts
const WALKED_KEY = 'galgal:walked:v1';
// читать при монтировании, писать только по завершении круга — выход посреди
// круга не записывает ничего
await AsyncStorage.setItem(WALKED_KEY, JSON.stringify([...walked, anchor.transliteration]));
```

Работа с `AsyncStorage` — по образцу [lib/favorites.tsx](../../../lib/favorites.tsx):
чтение в `useEffect` при монтировании, запись без ожидания, ошибки чтения гасятся и дают
пустой список.

- [ ] **Step 4: Прогнать проверки**

```bash
node --test "$SCRATCH/galgal-screen.test.mjs"
```

Ожидаемо: 5 passed.

- [ ] **Step 5: Посмотреть колесо на узком экране**

Снять скриншот `/practices/galgal` на `devices['iPhone SE']` (скрипт из Task 2, Step 7,
с другим путём и именем файла). Проверить: буквы не налезают друг на друга, колесо не
выходит за края, подпись в центре не задевает буквы.

- [ ] **Step 6: Типы и коммит**

```bash
./node_modules/.bin/tsc --noEmit
git add app/practices/galgal.tsx
git commit -m "Add the Galgal wheel practice"
```

---

## Task 6: Блок «Практики» на главном экране

Последним — чтобы ссылки не вели в недоделанные экраны.

**Files:**
- Create: `components/PracticeRow.tsx`
- Modify: `app/index.tsx` (после `<View style={styles.grid}>…</View>`)
- Test: `$SCRATCH/home.test.mjs`

**Interfaces:**
- Consumes: `<Glyph />` (Task 1), маршруты из задач 2, 3, 5.
- Produces: `<PracticeRow transliteration label sub onPress />`.

- [ ] **Step 1: Написать падающую проверку**

```js
// $SCRATCH/home.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { open, tapEl } from './harness.mjs';

test('на главной есть блок практик из трёх строк', async () => {
  const { browser, page } = await open('/');
  assert.ok(await page.getByText('Практики').isVisible());
  for (const label of ['Дыхание', 'Созерцание буквы', 'Колесо Галгал']) {
    assert.ok(await page.getByText(label).isVisible(), label);
  }
  // «Имя дня» осталось первым экраном, а не уехало в меню
  assert.ok(await page.getByText('Имя дня').isVisible());
  await browser.close();
});

test('каждая строка ведёт в свою практику', async () => {
  const routes = [
    ['Дыхание', '/practices/breathing'],
    ['Созерцание буквы', '/practices/letter'],
    ['Колесо Галгал', '/practices/galgal'],
  ];
  for (const [label, route] of routes) {
    const { browser, page, cdp } = await open('/');
    await tapEl(cdp, page.getByText(label));
    await page.waitForTimeout(800);
    assert.equal(new URL(page.url()).pathname, route);
    await browser.close();
  }
});
```

- [ ] **Step 2: Запустить, убедиться, что падает**

```bash
node --test "$SCRATCH/home.test.mjs"
```

- [ ] **Step 3: Написать `components/PracticeRow.tsx`**

Строка: `Pressable` во всю ширину, `flexDirection: 'row'`, `alignItems: 'center'`,
`gap: 14`, фон `colors.voidRaised`, рамка `colors.hairline`, радиус 14, паддинг 13/15.
Слева плашка 40×40, радиус 12, фон `colors.sparkWash`, в ней
`<Glyph size={24} color={colors.spark} />`. Справа название (`fonts.displayRuBold`,
`type.rowTitle`) и подпись (`type.small`, `colors.parchmentDim`). Стиль `tappable`,
`pressed` приглушает как в остальных плитках.

- [ ] **Step 4: Врезать блок в `app/index.tsx`**

Сразу после закрывающего тега сетки плиток: заголовок секции — строка из текста
«ПРАКТИКИ» (`type.eyebrow`, `colors.spark`, `textTransform: 'uppercase'`) и волосяной
линии (`flex: 1`, `height: 1`, `backgroundColor: colors.hairline`) в ряд с `gap: 10`,
отступы 24 сверху и 12 снизу. Затем три `PracticeRow` с зазором 9:

| Буква | Название | Подпись | Маршрут |
|---|---|---|---|
| ЙУД | Дыхание | Тетраграмматон, в своём ритме | `/practices/breathing` |
| АЛЕФ | Созерцание буквы | 22 буквы, 3–5 минут | `/practices/letter` |
| ШИН | Колесо Галгал | 231 врата, круг за кругом | `/practices/galgal` |

Навигация — `router.replace`, как во всех существующих плитках.

- [ ] **Step 5: Прогнать все проверки разом**

```bash
for f in letters letter breathing galgal galgal-screen home; do
  node --test "$SCRATCH/$f.test.mjs" || echo "FAILED: $f";
done
```

Ожидаемо: ни одного FAILED.

- [ ] **Step 6: Проверить сборку и что бандл не поехал**

```bash
./node_modules/.bin/tsc --noEmit
npm run build:web
```

Ожидаемо: экспорт проходит, `node_modules` не пополнялся — `git diff package.json`
и `git diff package-lock.json` пустые.

- [ ] **Step 7: Коммит**

```bash
git add components/PracticeRow.tsx app/index.tsx
git commit -m "Add the practices block to the home screen"
```

---

## Self-review

**Покрытие спеки.** Пройдено по разделам: навигация → Task 6; переиспользование
`hebrew.ts`/`HebrewGlyphs` → Task 1 и Task 5; `lib/letters.ts` → Task 1; `Glyph` →
Task 1; Wake Lock → Task 2; созерцание → Task 2; дыхание → Task 3; Галгал → Task 4 + 5;
главный экран → Task 6; порядок работ → порядок задач; проверка → блок «Как здесь
проверяют» и шаги в каждой задаче. Разделы «Отложено» и «Расхождения с исходной
постановкой» задач не требуют по смыслу.

**Заглушки.** Проверено: TBD/TODO нет, тексты абзацев выписаны целиком, тестовый код
приведён полностью, «как в Task N» нигде не заменяет содержание.

**Согласованность имён.** `useWakeLock` (Task 2) — так же в задачах 3 и 5.
`wheelPoints` / `partnersOf` / `chordLayout` / `letterHitSize` (Task 4) — так же в
Task 5. `ALPHABET` / `ALPHABET_SOURCE` / `Letter.transliteration` (Task 1) — так же
везде. `accessibilityLabel` «Буква {имя}», «Следующая фаза дыхания», «Следующая пара»,
«Завершить», «Начать», «Начать круг», «К колесу» — на них стоят проверки, менять нельзя.
`testID`: `breath-glyph`, `breath-ring`, `breath-phase`, `breath-hint`, `gate-pair`.
