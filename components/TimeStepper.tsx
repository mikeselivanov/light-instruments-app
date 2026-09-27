import { StyleSheet, Text, View } from 'react-native';
import { StepperColumn, StepperInline } from './Stepper';
import {
  formatClock,
  fromMinutes,
  parseTypedNumber,
  parseTypedTime,
  toMinutes,
  wrap,
  type ClockTime,
} from '../lib/stepper-math';
import { colors } from '../lib/theme';

/**
 * A clock time on steppers. `large` is two columns (hours, minutes) for the
 * birth screen; `inline` is one «− 09:00 +» row for Settings, where the whole
 * time moves by `minuteStep`.
 *
 * With a 5-minute step, typed minutes are rounded down onto the step, so the
 * value stays on the grid the ▲▼ buttons walk.
 */
export function TimeStepper({
  value,
  onChange,
  minuteStep,
  variant,
  label = 'Время',
}: {
  value: ClockTime;
  onChange: (next: ClockTime) => void;
  minuteStep: 1 | 5;
  variant: 'large' | 'inline';
  label?: string;
}) {
  const onGrid = (t: ClockTime): ClockTime => ({
    hour: t.hour,
    minute: t.minute - (t.minute % minuteStep),
  });

  if (variant === 'inline') {
    return (
      <StepperInline
        label={label}
        display={formatClock(value)}
        decreaseLabel={`Раньше на ${minuteStep} мин`}
        increaseLabel={`Позже на ${minuteStep} мин`}
        onStep={(d) => onChange(fromMinutes(toMinutes(value) + d * minuteStep))}
        onTyped={(text) => {
          const t = parseTypedTime(text);
          if (t) onChange(onGrid(t));
          return t !== null;
        }}
      />
    );
  }

  return (
    <View style={styles.row}>
      <StepperColumn
        label="Часы"
        display={String(value.hour).padStart(2, '0')}
        onStep={(d) => onChange({ ...value, hour: wrap(value.hour + d, 24) })}
        onTyped={(text) => {
          const h = parseTypedNumber(text, 0, 23);
          if (h !== null) onChange({ ...value, hour: h });
          return h !== null;
        }}
      />
      <Text style={styles.colon}>:</Text>
      <StepperColumn
        label="Минуты"
        display={String(value.minute).padStart(2, '0')}
        onStep={(d) => onChange({ ...value, minute: wrap(value.minute + d * minuteStep, 60) })}
        onTyped={(text) => {
          const m = parseTypedNumber(text, 0, 59);
          if (m !== null) onChange(onGrid({ ...value, minute: m }));
          return m !== null;
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  colon: {
    fontSize: 36,
    color: colors.parchmentDim,
  },
});
