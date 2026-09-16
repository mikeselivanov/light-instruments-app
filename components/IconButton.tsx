import { type ComponentProps } from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tappable } from '../lib/interaction';
import { colors } from '../lib/theme';

/**
 * The app's round icon control.
 *
 * It exists mainly to pin down the hit target. What it replaced was a
 * "← Назад" text link roughly 57×19pt in size, and at that size a press that
 * drifted even slightly missed: react-native-web cancels a Pressable once the
 * finger moves about 10pt, and on the name screen that same drift is read as a
 * swipe instead — so a sloppy tap either did nothing or landed on a different
 * name. 44pt square is the smallest target Apple's guidelines call reliable.
 */
export function IconButton({
  icon,
  label,
  onPress,
  style,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.btn, tappable, style, pressed && styles.pressed]}
    >
      <Ionicons name={icon} size={22} color={colors.parchment} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.veil,
    borderWidth: 1,
    borderColor: colors.hairlineSoft,
  },
  pressed: {
    opacity: 0.7,
    backgroundColor: colors.veilRaised,
  },
});
