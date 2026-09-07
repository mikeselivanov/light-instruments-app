// Web build loads the subset woff2 faces produced by scripts/build-fonts.mjs
// (143 KB instead of 1.76 MB). Run `npm run build:fonts` before exporting —
// assets/fonts/web/ is gitignored and absent on a fresh clone.
export const fontAssets = {
  'PTSerif-Bold': require('../assets/fonts/web/PTSerif-Bold.woff2'),
  PTSans: require('../assets/fonts/web/PTSans-Regular.woff2'),
  'PTSans-Bold': require('../assets/fonts/web/PTSans-Bold.woff2'),
  Ashurit: require('../assets/fonts/web/Ashurit.woff2'),
};
