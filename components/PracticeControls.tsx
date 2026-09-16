import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { tappable } from '../lib/interaction';
import { colors, fonts, type } from '../lib/theme';

/**
 * The two controls every practice's setup screen is built from.
 *
 * All three practices ask the same two questions before they start — how long,
 * and in what mode — and then offer one full-width way in. They were written
 * once for the letter screen; this is the same code, moved rather than copied,
 * so the pills and the button cannot drift apart from one practice to the next.
 */

/** A choice in a row of choices: duration, background, pace. */
export function Pill({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        selected && styles.pillSelected,
        tappable,
        pressed && styles.pillPressed,
      ]}
    >
      <Text style={[styles.pillText, selected && styles.pillTextSelected]}>{label}</Text>
    </Pressable>
  );
}

/** The full-width way into a practice — and back out of its closing screen. */
export function StartButton({
  label,
  onPress,
  style,
}: {
  label: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.button, tappable, style, pressed && styles.buttonPressed]}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 100,
    backgroundColor: colors.veil,
    borderWidth: 1,
    borderColor: colors.hairlineSoft,
  },
  pillPressed: {
    backgroundColor: colors.veilRaised,
  },
  pillSelected: {
    backgroundColor: colors.sparkWash,
    borderColor: colors.sparkSoft,
  },
  pillText: {
    fontFamily: fonts.body,
    ...type.button,
    color: colors.parchmentDim,
  },
  pillTextSelected: {
    color: colors.spark,
  },
  button: {
    width: '100%',
    borderRadius: 100,
    paddingVertical: 15,
    backgroundColor: colors.spark,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    fontFamily: fonts.bodyBold,
    ...type.button,
    fontWeight: '700',
    color: colors.void,
  },
});
