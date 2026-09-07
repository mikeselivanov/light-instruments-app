// Font face map shared by every platform. The keys are the family names used
// in lib/theme.ts, so adding a face here without adding it there (or vice
// versa) is what silently falls back to the system font.
export const fontAssets = {
  'PTSerif-Bold': require('../assets/fonts/PTSerif-Bold.ttf'),
  PTSans: require('../assets/fonts/PTSans-Regular.ttf'),
  'PTSans-Bold': require('../assets/fonts/PTSans-Bold.ttf'),
  Ashurit: require('../assets/fonts/Ashurit.ttf'),
};
