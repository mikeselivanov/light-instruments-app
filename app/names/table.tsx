import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { DISPLAY_DOT_RATIO, HebrewGlyphs } from '../../components/HebrewGlyphs';
import { HomeButton } from '../../components/HomeButton';
import { NAMES } from '../../lib/data';
import { tappable } from '../../lib/interaction';
import { useScreenPadding } from '../../lib/safe-area';
import { colors, fonts, type } from '../../lib/theme';

/**
 * The 72 Names as the printed chart arranges them: eight columns, nine rows.
 *
 * The arrangement is not decoration and is not ours to improve. The chart is
 * read the way Hebrew is read — right to left, then down — so the first Name
 * sits in the top right corner and the eighth closes that row on the left.
 * Anyone who has used the printed chart knows where a Name lives by its
 * position, and a left-to-right grid would put every one of them somewhere else.
 */
const COLUMNS = 8;
const GAP = 3;

/** Below this the letters stop being legible at eight columns. */
const MIN_CELL = 34;

export default function NamesTable() {
  const padding = useScreenPadding();
  const { width: windowWidth } = useWindowDimensions();

  const available =
    Math.min(windowWidth, 480) - padding.paddingLeft - padding.paddingRight;
  const cell = Math.max((available - GAP * (COLUMNS - 1)) / COLUMNS, MIN_CELL);
  // Three letters plus two fine dots inside the cell. The dots are set at the
  // display variant's ratio rather than the list row's, which is what keeps the
  // divisor near three instead of near four — that difference is a third of the
  // letter size, and at this scale a third is legible against not. Capped so the
  // chart does not turn cartoonish on a tablet.
  const glyph = Math.min(cell / 3.2, 26);

  const names = NAMES;
  const rows = Array.from({ length: Math.ceil(names.length / COLUMNS) }, (_, r) =>
    names.slice(r * COLUMNS, r * COLUMNS + COLUMNS)
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.void }}
      contentContainerStyle={[styles.scroll, padding]}
    >
      <HomeButton style={styles.back} />

      <Text style={styles.title}>Таблица имён</Text>
      <Text style={styles.sub}>
        Все 72 в порядке книги: справа налево, сверху вниз. Коснитесь имени, чтобы
        открыть его.
      </Text>

      <View style={styles.table}>
        {rows.map((row, r) => (
          // row-reverse, so the first Name of each row lands on the right —
          // the data stays in reading order and the layout does the mirroring.
          <View key={r} style={styles.row}>
            {row.map((name) => (
              <Pressable
                key={name.id}
                accessibilityRole="button"
                accessibilityLabel={`${name.id}. ${name.title}`}
                onPress={() => router.replace(`/names/${name.id}`)}
                style={({ pressed }) => [
                  styles.cell,
                  { width: cell, height: cell },
                  tappable,
                  pressed && styles.cellPressed,
                ]}
              >
                <HebrewGlyphs
                  letters={name.hebrewLetters}
                  variant="compact"
                  size={glyph}
                  dotRatio={DISPLAY_DOT_RATIO}
                />
              </Pressable>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  back: {
    marginBottom: 22,
  },
  title: {
    fontFamily: fonts.displayRuBold,
    ...type.screenTitle,
    color: colors.parchment,
    marginBottom: 6,
  },
  sub: {
    fontFamily: fonts.body,
    ...type.small,
    color: colors.parchmentDim,
    marginBottom: 20,
  },
  table: {
    gap: GAP,
  },
  row: {
    flexDirection: 'row-reverse',
    gap: GAP,
  },
  cell: {
    backgroundColor: colors.veil,
    borderWidth: 1,
    borderColor: colors.hairlineSoft,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellPressed: {
    backgroundColor: colors.veilRaised,
    borderColor: colors.sparkSoft,
  },
});
