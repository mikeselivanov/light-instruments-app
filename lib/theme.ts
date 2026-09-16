export const colors = {
  void: '#0e0d12',
  voidRaised: '#131019',
  veil: '#1a1620',
  veilRaised: '#221d2b',
  spark: '#c4923d',
  sparkSoft: '#7a5f2f',
  sparkWash: 'rgba(196, 146, 61, 0.12)',
  thread: '#8672c2',
  threadSoft: 'rgba(134,114,194,0.14)',
  threadBorder: 'rgba(134,114,194,0.32)',
  parchment: '#ede6d9',
  parchmentDim: '#9c9284',
  hairline: '#2e2836',
  hairlineSoft: '#241f2c',
} as const;

export const fonts = {
  displayHebrew: 'Ashurit',
  displayRuBold: 'PTSerif-Bold',
  body: 'PTSans',
  bodyBold: 'PTSans-Bold',
} as const;

/**
 * One type scale for the whole app.
 *
 * Sizes live here rather than in the screens so the whole app can be made
 * bigger or smaller in one place — which is what the first round of user
 * feedback asked for. Every entry carries an explicit `lineHeight`: React
 * Native's default leading is about 1.2x, which is too tight for long
 * stretches of Cyrillic, and the app is read slowly rather than skimmed.
 */
export const type = {
  /** Long-form reading text — a name's description, the introduction. */
  read: { fontSize: 17, lineHeight: 27 },
  /** Secondary prose — card teasers, empty states, banner copy. */
  body: { fontSize: 15.5, lineHeight: 23 },
  /** Small print — row subtitles, hints, the attribution. */
  small: { fontSize: 13.5, lineHeight: 19 },
  /** Screen headings. */
  screenTitle: { fontSize: 26, lineHeight: 33 },
  /** The Russian meaning of a name, set under its Hebrew letters. */
  nameTitle: { fontSize: 24, lineHeight: 30 },
  /** Titles inside list rows and tiles. */
  rowTitle: { fontSize: 17, lineHeight: 22 },
  /** Buttons and pill CTAs. */
  button: { fontSize: 14.5, lineHeight: 19 },
  /** Category and keyword pills. */
  tag: { fontSize: 12.5, lineHeight: 16 },
  /** All-caps eyebrows and section headings. */
  eyebrow: { fontSize: 12, lineHeight: 16, letterSpacing: 1.4 },
} as const;
