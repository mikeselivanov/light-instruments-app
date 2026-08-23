import { Fragment } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { glyphFor } from '../lib/hebrew';
import { colors, fonts } from '../lib/theme';

type Props = {
  letters: [string, string, string];
  variant: 'compact' | 'display';
  size?: 'default' | 'large';
};

// 'compact' — the three glyphs in a row, right-to-left (as the name is
// actually read), for list rows. 'display' — glyph+transliteration columns,
// also right-to-left, used where the letters are the focal point (name-of-day
// card, detail screen); `size="large"` scales it up for the meditation view.
export function HebrewGlyphs({ letters, variant, size = 'default' }: Props) {
  // The three letters are read individually, not as a connected word, so a
  // middle dot separates them — the traditional way to mark that in Hebrew
  // typesetting.
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

  const large = size === 'large';

  return (
    <View style={[styles.displayRow, large && styles.displayRowLarge]}>
      {letters.map((letter, i) => (
        <Fragment key={i}>
          <View style={styles.displayColumn}>
            <Text style={[styles.displayGlyph, large && styles.displayGlyphLarge]}>
              {glyphFor(letter, i === letters.length - 1)}
            </Text>
            <Text style={[styles.displayTranslit, large && styles.displayTranslitLarge]}>
              {letter}
            </Text>
          </View>
          {i < letters.length - 1 && (
            <Text style={[styles.displayDot, large && styles.displayDotLarge]}>·</Text>
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
    fontSize: 17,
    paddingHorizontal: 2,
    color: colors.spark,
  },
  compactDot: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.sparkSoft,
    transform: [{ translateY: -4 }],
  },
  displayRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 22,
  },
  displayRowLarge: {
    gap: 30,
  },
  displayColumn: {
    alignItems: 'center',
    gap: 6,
  },
  displayGlyph: {
    fontFamily: fonts.displayHebrew,
    fontSize: 40,
    paddingHorizontal: 4,
    color: colors.parchment,
  },
  displayGlyphLarge: {
    fontSize: 64,
  },
  displayTranslit: {
    fontFamily: fonts.body,
    fontSize: 10.5,
    letterSpacing: 0.06 * 10.5,
    textTransform: 'uppercase',
    color: colors.parchmentDim,
  },
  displayTranslitLarge: {
    fontSize: 13,
    letterSpacing: 0.06 * 13,
  },
  displayDot: {
    fontFamily: fonts.body,
    fontSize: 28,
    color: colors.parchmentDim,
    transform: [{ translateY: -8 }],
  },
  displayDotLarge: {
    fontSize: 40,
    transform: [{ translateY: -13 }],
  },
});
