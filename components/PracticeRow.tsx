import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Glyph } from './Glyph';
import { tappable } from '../lib/interaction';
import { colors, fonts, type } from '../lib/theme';

/**
 * A practice in the home screen's list.
 *
 * Deliberately not a tile. The grid above it holds ways into the 72 Names —
 * more of the same kind of thing — and three more squares would read as five
 * more names to browse. A row with a letter mark reads as a different kind of
 * object, which is what a practice is.
 */
export function PracticeRow({
  transliteration,
  label,
  sub,
  onPress,
}: {
  transliteration: string;
  label: string;
  sub: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.row, tappable, pressed && styles.rowPressed]}
    >
      <View style={styles.mark}>
        <Glyph transliteration={transliteration} size={24} color={colors.spark} />
      </View>
      <View style={styles.text}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.sub}>{sub}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    width: '100%',
    backgroundColor: colors.voidRaised,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 15,
  },
  rowPressed: {
    borderColor: colors.sparkSoft,
    backgroundColor: colors.veil,
  },
  mark: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.sparkWash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
  },
  label: {
    fontFamily: fonts.displayRuBold,
    ...type.rowTitle,
    color: colors.parchment,
  },
  sub: {
    fontFamily: fonts.body,
    ...type.small,
    color: colors.parchmentDim,
    marginTop: 3,
  },
});
