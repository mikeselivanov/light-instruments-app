// Subsets the app's TTF faces down to the characters actually used and
// repacks them as woff2 for the web build. Measured result: 1.76 MB of TTF
// becomes ~143 KB of woff2, which matters because _layout.tsx blocks the
// first render until every face has loaded.
//
// The character set is written out explicitly rather than derived from
// names.ru.json: deriving it would save a few more KB, but any new UI string
// would then silently lose glyphs.
import subsetFont from 'subset-font';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, 'assets/fonts');
const outDir = join(root, 'assets/fonts/web');

const CYRILLIC = 'абвгдеёжзийклмнопрстуфхцчшщъыьэюяАБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ';
const LATIN = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGITS = '0123456789';
const PUNCT = ' .,:;!?—–-«»""\'()[]{}/\\|@#№$%^&*+=<>~` …→←✕';
const RU_SET = CYRILLIC + LATIN + DIGITS + PUNCT;

// U+0590–U+05FF — the Hebrew block; Ashurit is only ever used for glyphs.
const HEBREW_SET = Array.from({ length: 0x5ff - 0x590 + 1 }, (_, i) =>
  String.fromCharCode(0x590 + i)
).join('');

const JOBS = [
  { src: 'PTSans-Regular.ttf', out: 'PTSans-Regular.woff2', chars: RU_SET },
  { src: 'PTSans-Bold.ttf', out: 'PTSans-Bold.woff2', chars: RU_SET },
  { src: 'PTSerif-Bold.ttf', out: 'PTSerif-Bold.woff2', chars: RU_SET },
  { src: 'Ashurit.ttf', out: 'Ashurit.woff2', chars: HEBREW_SET },
];

const BUDGET_BYTES = 200 * 1024;

await mkdir(outDir, { recursive: true });

let total = 0;
for (const job of JOBS) {
  const source = await readFile(join(srcDir, job.src));
  const subset = await subsetFont(source, job.chars, { targetFormat: 'woff2' });
  await writeFile(join(outDir, job.out), subset);
  total += subset.length;
  const kb = (n) => (n / 1024).toFixed(1).padStart(7);
  console.log(`${job.src.padEnd(22)} ${kb(source.length)} KB -> ${kb(subset.length)} KB`);
}

console.log('-'.repeat(52));
console.log(`Total web font payload: ${(total / 1024).toFixed(1)} KB`);

if (total > BUDGET_BYTES) {
  console.error(`FAIL: exceeds the ${BUDGET_BYTES / 1024} KB budget from the spec.`);
  process.exit(1);
}
