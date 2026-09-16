import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Every screen is the same shape: one full-bleed scroller holding a centred
// column. These are the gaps that column keeps from the edges of the screen
// before any device inset is added on top.
const GAP_TOP = 20;
const GAP_BOTTOM = 48;
const GAP_HORIZONTAL = 20;

export type ScreenPadding = {
  paddingTop: number;
  paddingBottom: number;
  paddingLeft: number;
  paddingRight: number;
};

/**
 * Edge padding for a screen's scroll container, device insets included.
 *
 * The screens are full-bleed — there is no fixed header or tab bar to absorb
 * the insets on their behalf, so each screen's own content has to clear the
 * status bar, the home indicator and (in landscape) the notch itself. Bottom
 * matters most: without it the last list row and the 48pt tail of every screen
 * sit underneath the iOS home indicator and the Android gesture bar.
 *
 * `topGap` overrides the default distance below the status bar for the few
 * screens that want more room.
 */
export function useScreenPadding(topGap: number = GAP_TOP): ScreenPadding {
  const insets = useSafeAreaInsets();

  return {
    paddingTop: insets.top + topGap,
    paddingBottom: insets.bottom + GAP_BOTTOM,
    paddingLeft: insets.left + GAP_HORIZONTAL,
    paddingRight: insets.right + GAP_HORIZONTAL,
  };
}
