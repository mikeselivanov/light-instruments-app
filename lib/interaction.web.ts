import type { TextStyle, ViewStyle } from 'react-native';

// react-native-web passes unrecognised style keys straight through to the DOM,
// so plain CSS properties work here even though React Native's style types
// have no names for them — hence the casts, the same pattern as the CSS
// scroll-snap styles in app/settings.tsx.

/**
 * For anything the user taps.
 *
 * `touch-action: manipulation` drops the ~300ms the browser otherwise holds
 * every tap for while it waits to see whether a double-tap-to-zoom is coming.
 * Scrolling and pinch-to-zoom stay available, so this costs the user nothing —
 * it only removes the wait. #root carries the same rule (public/index.html);
 * repeating it on the controls themselves keeps the guarantee attached to the
 * button rather than to an ancestor somebody may later restyle.
 */
export const tappable = {
  touchAction: 'manipulation',
} as unknown as ViewStyle;

/**
 * For the long-form reading text, which opts back out of the app-wide
 * `user-select: none` set on #root. Suppressing selection is right for labels
 * and buttons — it is what stops a long press raising the selection callout —
 * but the actual prose is there to be read, quoted and copied.
 */
export const selectableText = {
  userSelect: 'text',
} as unknown as TextStyle;
