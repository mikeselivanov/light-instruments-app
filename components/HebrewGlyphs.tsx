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
  if (variant === 'compact') {
    return (
      <View style={styles.compactRow}>
        {letters.map((letter, i) => (
          <Text key={i} style={styles.compactGlyph}>
            {glyphFor(letter, i === letters.length - 1)}
          </Text>
        ))}
      </View>
    );
  }

  const large = size === 'large';

  return (
    <View style={[styles.displayRow, large && styles.displayRowLarge]}>
      {letters.map((letter, i) => (
        <View key={i} style={styles.displayColumn}>
          <Text style={[styles.displayGlyph, large && styles.displayGlyphLarge]}>
            {glyphFor(letter, i === letters.length - 1)}
          </Text>
          <Text style={[styles.displayTranslit, large && styles.displayTranslitLarge]}>
            {letter}
          </Text>
        </View>
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
    color: colors.spark,
  },
  displayRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
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
});
