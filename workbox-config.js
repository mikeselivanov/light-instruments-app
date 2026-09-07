// workbox-cli is used only to build the precache manifest (file list plus
// content hashes) and inject it into sw/index.js. No workbox runtime ships
// to the browser — see sw/index.js.
module.exports = {
  globDirectory: 'dist/',
  globPatterns: [
    '**/*.{js,html,json,woff2,png,ico,svg}',
    // Only Ionicons is imported (app/index.tsx), but Expo bundles all 19
    // vector-icon fonts into dist regardless — 3.9 MB of them. Precaching
    // the whole lot would bloat every install for glyphs nobody asks for,
    // and precaching none of them leaves the settings gear missing offline.
    '**/Ionicons.*.ttf',
  ],
  globIgnores: ['sw.js'],
  swSrc: 'sw/index.js',
  swDest: 'dist/sw.js',
  maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
};
