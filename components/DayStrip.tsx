import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, type } from '../lib/theme';

const MARKS = ['00:00', '06:00', '12:00', '18:00', '24:00'];

/**
 * The day as 72 cells of 20 minutes, the birth's cell lit. Every 18th cell —
 * each six hours — is a shade lighter so the labels under it can be read
 * against something.
 */
export function DayStrip({ id }: { id: number }) {
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Сутки из 72 отрезков по 20 минут, выделен ${id}-й`}
      style={styles.wrap}
    >
      <View style={styles.cells}>
        {Array.from({ length: 72 }, (_, i) => (
          <View
            key={i}
            style={[
              styles.cell,
              i % 18 === 0 && styles.cellMark,
              i === id - 1 && styles.cellLit,
            ]}
          />
        ))}
      </View>
      <View style={styles.marks}>
        {MARKS.map((m) => (
          <Text key={m} style={styles.mark}>
            {m}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
  },
  cells: {
    flexDirection: 'row',
    gap: 1,
    height: 34,
  },
  cell: {
    flex: 1,
    borderRadius: 1,
    backgroundColor: colors.veilRaised,
  },
  cellMark: {
    backgroundColor: colors.hairline,
  },
  cellLit: {
    backgroundColor: colors.spark,
  },
  marks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  mark: {
    fontFamily: fonts.body,
    ...type.tag,
    color: colors.parchmentDim,
  },
});
