import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tappable } from '../lib/interaction';
import { colors, fonts, type } from '../lib/theme';

/**
 * The two stepper shapes every time, date and offset control is built from:
 * a column (▲ value ▼) for the birth screen, where the value is the focus, and
 * an inline row (− value +) for a settings row, where it is one line of many.
 *
 * Presses only — no scroll, no drag. That is the point of this control: the
 * scroll wheel it replaces depended on scroll snapping, which react-native-web
 * does not do and which behaved differently under a finger than under a mouse.
 * A button behaves the same everywhere.
 */

/** First repeat after a hold begins, then the interval shrinks to the floor. */
const HOLD_FIRST_MS = 120;
const HOLD_FLOOR_MS = 40;
const HOLD_ACCELERATION = 0.85;
/** How long a press must last to count as a hold rather than a tap. */
const HOLD_DELAY_MS = 400;

/**
 * Tap = one step (via onPress, so screen readers activate it too). Hold = a
 * step now and then repeats that speed up until the finger lifts. Pressable
 * does not fire onPress after onLongPress has fired, so a hold never adds an
 * extra step on release.
 */
function useHoldRepeat(step: () => void) {
  const stepRef = useRef(step);
  stepRef.current = step;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  const start = () => {
    stop();
    stepRef.current();
    let delay = HOLD_FIRST_MS;
    const tick = () => {
      stepRef.current();
      delay = Math.max(HOLD_FLOOR_MS, delay * HOLD_ACCELERATION);
      timer.current = setTimeout(tick, delay);
    };
    timer.current = setTimeout(tick, delay);
  };

  useEffect(() => stop, []);

  return {
    onPress: () => stepRef.current(),
    onLongPress: start,
    onPressOut: stop,
    delayLongPress: HOLD_DELAY_MS,
  };
}

function StepButton({
  icon,
  label,
  onStep,
  round,
}: {
  icon: 'chevron-up' | 'chevron-down' | 'remove' | 'add';
  label: string;
  onStep: () => void;
  round?: boolean;
}) {
  const hold = useHoldRepeat(onStep);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      {...hold}
      style={({ pressed }) => [
        round ? styles.roundButton : styles.columnButton,
        tappable,
        pressed && styles.pressed,
      ]}
    >
      <Ionicons name={icon} size={20} color={colors.spark} />
    </Pressable>
  );
}

/**
 * The value itself. Pressable when `onTyped` is given: a press swaps it for a
 * number-pad field, and whatever was typed is handed to `onTyped` on submit or
 * blur. `onTyped` returns false for input it rejects, and the old value simply
 * stays — no error message for a mistyped digit.
 */
function StepValue({
  display,
  onTyped,
  label,
  textStyle,
  width,
}: {
  display: string;
  onTyped?: (text: string) => boolean;
  label: string;
  textStyle: object;
  width: number;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');

  if (editing && onTyped) {
    const finish = () => {
      onTyped(text);
      setEditing(false);
    };
    return (
      <TextInput
        accessibilityLabel={label}
        autoFocus
        value={text}
        onChangeText={setText}
        onSubmitEditing={finish}
        onBlur={finish}
        keyboardType="number-pad"
        inputMode="numeric"
        maxLength={5}
        selectTextOnFocus
        style={[textStyle, styles.input, { width }]}
      />
    );
  }

  const value = <Text style={[textStyle, { width }, styles.centered]}>{display}</Text>;
  if (!onTyped) return value;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${display}. Нажмите, чтобы ввести цифрами`}
      onPress={() => {
        setText('');
        setEditing(true);
      }}
      style={({ pressed }) => [tappable, pressed && styles.pressed]}
    >
      {value}
    </Pressable>
  );
}

export function StepperColumn({
  label,
  display,
  onStep,
  onTyped,
  width = 76,
  size = 'large',
}: {
  label: string;
  display: string;
  onStep: (delta: 1 | -1) => void;
  onTyped?: (text: string) => boolean;
  width?: number;
  /** `medium` for the date, where a month name has to fit in a column. */
  size?: 'large' | 'medium';
}) {
  return (
    <View style={styles.column}>
      <StepButton icon="chevron-up" label={`${label} больше`} onStep={() => onStep(1)} />
      <StepValue
        display={display}
        onTyped={onTyped}
        label={label}
        textStyle={size === 'large' ? styles.columnValue : styles.columnValueMedium}
        width={width}
      />
      <StepButton icon="chevron-down" label={`${label} меньше`} onStep={() => onStep(-1)} />
    </View>
  );
}

export function StepperInline({
  label,
  display,
  onStep,
  onTyped,
  width = 76,
  decreaseLabel,
  increaseLabel,
}: {
  label: string;
  display: string;
  onStep: (delta: 1 | -1) => void;
  onTyped?: (text: string) => boolean;
  width?: number;
  decreaseLabel: string;
  increaseLabel: string;
}) {
  return (
    <View style={styles.inline}>
      <StepButton icon="remove" label={decreaseLabel} onStep={() => onStep(-1)} round />
      <StepValue
        display={display}
        onTyped={onTyped}
        label={label}
        textStyle={styles.inlineValue}
        width={width}
      />
      <StepButton icon="add" label={increaseLabel} onStep={() => onStep(1)} round />
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.6,
  },
  column: {
    alignItems: 'center',
    gap: 4,
  },
  columnButton: {
    width: 64,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.veilRaised,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.veilRaised,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  columnValue: {
    fontFamily: fonts.bodyBold,
    fontSize: 40,
    lineHeight: 56,
    color: colors.parchment,
  },
  columnValueMedium: {
    fontFamily: fonts.bodyBold,
    fontSize: 24,
    lineHeight: 44,
    color: colors.parchment,
  },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  inlineValue: {
    fontFamily: fonts.bodyBold,
    ...type.rowTitle,
    fontSize: 21,
    color: colors.parchment,
  },
  centered: {
    textAlign: 'center',
  },
  input: {
    textAlign: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.spark,
    backgroundColor: colors.sparkWash,
    paddingVertical: 0,
  },
});
