import { Fragment } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { descentOf, glyphFor } from '../lib/hebrew';
import { colors, fonts } from '../lib/theme';

type Props = {
  letters: [string, string, string];
  variant: 'compact' | 'display';
};

/**
 * How big the letters are and how tightly they sit.
 *
 * `columnGap` is the gap flexbox puts between every child of the row, and the
 * row reads letter · letter · letter — so the distance from one letter column
 * to the next is `2 * columnGap` plus the dot's own width. A column is as wide
 * as whichever of its two lines is wider, the letter or its Russian
 * pronunciation, which is what stops the pronunciations ever running into each
 * other however close the letters are pulled: one number governs both gaps and
 * the tighter of the two is the one it binds.
 *
 * The numbers come from measuring the real font metrics — Ashurit advance
 * widths for the letters, PT Sans for the captions and the dot — across all 72
 * names, rather than from eyeballing one of them. Letter to letter is now
 * about 20pt at the focus size where it used to be 25–43pt, and that is with
 * the letters themselves grown from 64 to 112pt.
 */
const DISPLAY = {
  glyph: 112,
  caption: 14,
  columnGap: 6,
  captionClearance: 0.12,
} as const;

/** Caption tracking, as a fraction of its own size. */
const CAPTION_TRACKING = 0.04;

/** The separator dot's size, as a fraction of the letters' size. */
const DOT_SIZE = 0.25;

/**
 * How far the dot is nudged down, as a fraction of the letters' size, so that
 * it sits on the optical centre of the letter bodies instead of on the top
 * edge the row aligns every child to.
 *
 * Derived rather than dialled in by eye: the letters' baseline falls 0.960em
 * below the top of their line box and the median letter stands 0.649em tall,
 * putting the centre of the letter bodies 0.636em down; the dot's own ink
 * centre already sits 0.722em below the top of its box, scaled by DOT_SIZE.
 * The difference is what is left to travel. Both terms scale with the letter
 * size, so the one fraction serves every size.
 */
const DOT_DROP = 0.4555;

/**
 * The room Ashurit's line box keeps below the baseline — its hhea descender
 * (0.40em) plus half the line gap — as a fraction of the font size.
 *
 * Almost no Hebrew letter uses it, so at 112pt it left the transliterations
 * stranded roughly 50pt under letters that stop dead on the baseline. The
 * captions are pulled back up through it by `captionClearance` above, which is
 * measured from the lowest ink the name actually has (see `descentOf`) and so
 * comes out identical for every name — whether it ends in a final Tsadi or in
 * a Hey that never crosses the baseline at all.
 */
const GLYPH_BOX_DESCENT = 0.41;

// 'compact' — the three glyphs in a row, right-to-left (as the name is
// actually read), for list rows. 'display' — glyph+transliteration columns,
// also right-to-left, used wherever the letters are the focal point. There is
// deliberately one display size: the name-of-the-day card and the detail
// screen used to render it at 88 and 112pt, and seeing the same name at two
// sizes one tap apart read as an inconsistency rather than as hierarchy.
export function HebrewGlyphs({ letters, variant }: Props) {
  // The middle dot belongs to how the name is written and is never optional —
  // it is what marks the three letters as read one by one rather than as a
  // word, the traditional way to show that in Hebrew typesetting. It appears
  // in both variants; what changes with size is only how much room it takes.
  if (variant === 'compact') {
    return (
      <View style={styles.compactRow}>
        {letters.map((letter, i) => (
          <Fragment key={i}>
            <Text style={styles.compactGlyph}>{glyphFor(letter, i === letters.length - 1)}</Text>
            {i < letters.length - 1 && <Text style={styles.compactDot}>·</Text>}
          </Fragment>
        ))}
      </View>
    );
  }

  const { glyph, caption, columnGap, captionClearance } = DISPLAY;

  const glyphs = letters.map((letter, i) => glyphFor(letter, i === letters.length - 1));
  // One offset for all three columns, from the deepest descender in this
  // particular name, so the captions keep a shared baseline instead of each
  // hanging at its own height under its own letter.
  const captionOffset =
    (Math.max(...glyphs.map(descentOf)) + captionClearance - GLYPH_BOX_DESCENT) * glyph;

  return (
    <View style={[styles.displayRow, { gap: columnGap }]}>
      {letters.map((letter, i) => (
        <Fragment key={i}>
          <View style={styles.displayColumn}>
            <Text style={[styles.displayGlyph, { fontSize: glyph }]}>{glyphs[i]}</Text>
            <Text
              style={[
                styles.displayCaption,
                {
                  fontSize: caption,
                  letterSpacing: caption * CAPTION_TRACKING,
                  marginTop: captionOffset,
                },
              ]}
            >
              {letter}
            </Text>
          </View>
          {i < letters.length - 1 && (
            <Text
              style={[
                styles.displayDot,
                {
                  fontSize: glyph * DOT_SIZE,
                  transform: [{ translateY: glyph * DOT_DROP }],
                },
              ]}
            >
              ·
            </Text>
          )}
        </Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  compactRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 2,
  },
  compactGlyph: {
    fontFamily: fonts.displayHebrew,
    fontSize: 19,
    paddingHorizontal: 2,
    color: colors.spark,
  },
  compactDot: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.sparkSoft,
    transform: [{ translateY: -4 }],
  },
  // row-reverse, because `hebrewLetters` is in reading order and Hebrew reads
  // right to left. See lib/hebrew.ts.
  displayRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  displayColumn: {
    alignItems: 'center',
  },
  displayGlyph: {
    fontFamily: fonts.displayHebrew,
    color: colors.parchment,
  },
  displayCaption: {
    fontFamily: fonts.body,
    textTransform: 'uppercase',
    color: colors.parchmentDim,
  },
  displayDot: {
    fontFamily: fonts.body,
    color: colors.parchmentDim,
  },
});
