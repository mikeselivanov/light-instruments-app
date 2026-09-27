import { StyleSheet, View } from 'react-native';
import { StepperColumn } from './Stepper';
import {
  clampDate,
  daysInMonth,
  FIRST_YEAR,
  MONTHS_GENITIVE,
  parseTypedNumber,
  stepDate,
  type CalendarDate,
} from '../lib/stepper-math';

/**
 * A date as three stepper columns: day, month, year. Each column is its own
 * dial — see `stepDate` for why a day never carries into the month. Day and
 * year can also be typed; the month is a word and only steps.
 */
export function DateStepper({
  value,
  onChange,
  today,
}: {
  value: CalendarDate;
  onChange: (next: CalendarDate) => void;
  today: CalendarDate;
}) {
  return (
    <View style={styles.row}>
      <StepperColumn
        label="День"
        width={52}
        size="medium"
        display={String(value.day)}
        onStep={(d) => onChange(stepDate(value, 'day', d, today))}
        onTyped={(text) => {
          const day = parseTypedNumber(text, 1, daysInMonth(value.year, value.month));
          if (day !== null) onChange(clampDate({ ...value, day }, today));
          return day !== null;
        }}
      />
      <StepperColumn
        label="Месяц"
        width={128}
        size="medium"
        display={MONTHS_GENITIVE[value.month - 1]}
        onStep={(d) => onChange(stepDate(value, 'month', d, today))}
      />
      <StepperColumn
        label="Год"
        width={72}
        size="medium"
        display={String(value.year)}
        onStep={(d) => onChange(stepDate(value, 'year', d, today))}
        onTyped={(text) => {
          const year = parseTypedNumber(text, FIRST_YEAR, today.year);
          if (year !== null) onChange(clampDate({ ...value, year }, today));
          return year !== null;
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
});
