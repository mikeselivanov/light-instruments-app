// Generates the PWA icon set.
//
// icon-192/512 are straight resizes of assets/icon.png via sips (macOS
// built-in, no dependency to install).
//
// icon-maskable-512 has to be a composite, which sips cannot do. Rather than
// pull in ImageMagick, it reuses the Android adaptive icon layers already in
// the repo: an adaptive foreground is drawn inside a safe zone by definition,
// which is exactly the constraint a maskable icon has. Both layers are
// already 512x512, so this is pure alpha compositing with no resampling.
import { execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { PNG } from 'pngjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const assets = join(root, 'assets');
const out = join(root, 'public');

await mkdir(out, { recursive: true });

for (const size of [192, 512]) {
  execFileSync(
    'sips',
    [
      '-z',
      String(size),
      String(size),
      join(assets, 'icon.png'),
      '--out',
      join(out, `icon-${size}.png`),
    ],
    { stdio: 'ignore' }
  );
  console.log(`icon-${size}.png`);
}

const bg = PNG.sync.read(await readFile(join(assets, 'android-icon-background.png')));
const fg = PNG.sync.read(await readFile(join(assets, 'android-icon-foreground.png')));

if (bg.width !== fg.width || bg.height !== fg.height) {
  throw new Error(
    `adaptive icon layers differ in size: ${bg.width}x${bg.height} vs ${fg.width}x${fg.height}`
  );
}

const composed = new PNG({ width: bg.width, height: bg.height });
for (let i = 0; i < bg.data.length; i += 4) {
  const alpha = fg.data[i + 3] / 255;
  for (let channel = 0; channel < 3; channel++) {
    composed.data[i + channel] = Math.round(
      fg.data[i + channel] * alpha + bg.data[i + channel] * (1 - alpha)
    );
  }
  composed.data[i + 3] = 255;
}

await writeFile(join(out, 'icon-maskable-512.png'), PNG.sync.write(composed));
console.log('icon-maskable-512.png');
