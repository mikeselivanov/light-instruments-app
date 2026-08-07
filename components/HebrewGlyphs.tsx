import { StyleSheet, Text, View } from 'react-native';
import { glyphFor } from '../lib/hebrew';
import { colors, fonts } from '../lib/theme';

type Props = {
  letters: [string, string, string];
  variant: 'compact' | 'display';
};

// 'compact' — a narrow vertical stack of bare glyphs for list rows, where
// horizontal space is scarce and the name title needs the room instead.
// 'display' — three glyph+transliteration columns side by side, used where
// the letters are the focal point (name-of-day card, detail screen).
export function HebrewGlyphs({ letters, variant }: Props) {
  if (variant === 'compact') {
    return (
      <View style={styles.compactStack}>
        {letters.map((letter, i) => (
          <Text key={i} style={styles.compactGlyph}>
            {glyphFor(letter)}
          </Text>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.displayRow}>
      {letters.map((letter, i) => (
        <View key={i} style={styles.displayColumn}>
          <Text style={styles.displayGlyph}>{glyphFor(letter)}</Text>
          <Text style={styles.displayTranslit}>{letter}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  compactStack: {
    width: 26,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  compactGlyph: {
    fontFamily: fonts.displayHebrew,
    fontSize: 15,
    lineHeight: 17,
    color: colors.spark,
  },
  displayRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 22,
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
  displayTranslit: {
    fontFamily: fonts.body,
    fontSize: 10.5,
    letterSpacing: 0.06 * 10.5,
    textTransform: 'uppercase',
    color: colors.parchmentDim,
  },
});
