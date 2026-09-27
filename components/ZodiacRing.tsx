import { StyleSheet, Text, View } from 'react-native';
import { DEGREES_PER_NAME } from '../lib/birth-name';
import { colors, fonts, type } from '../lib/theme';

const SIZE = 240;
const C = SIZE / 2;
const R_OUT = 104;
const R_IN = 86;
const R_SUN = 66;
const SUN = 14;

/**
 * Places a thin bar whose centre sits `r` from the ring's centre at `deg`
 * (0° at the top, clockwise), rotated to point outward. React Native rotates a
 * view about its own centre, so putting that centre on the polar point is all
 * the geometry there is — the same trick the Galgal wheel uses for its chords.
 */
function radial(deg: number, r: number, width: number, length: number) {
  const a = (deg * Math.PI) / 180;
  const x = C + r * Math.sin(a);
  const y = C - r * Math.cos(a);
  return {
    position: 'absolute' as const,
    left: x - width / 2,
    top: y - length / 2,
    width,
    height: length,
    transform: [{ rotate: `${deg}deg` }],
  };
}

/**
 * The circle the Sun walks in a year, cut into the 72 parts of 5° the names are
 * assigned to, with the birth's part lit and the Sun on it. Every sixth mark is
 * longer: those are the borders of the zodiac signs, which the explanation
 * below the ring names.
 */
export function ZodiacRing({ id, longitude }: { id: number; longitude: number }) {
  const band = R_OUT - R_IN;
  const mid = (R_OUT + R_IN) / 2;
  // Chord of one 5° part at the band's middle radius.
  const partWidth = 2 * mid * Math.sin(((DEGREES_PER_NAME / 2) * Math.PI) / 180);

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Круг из 72 частей, Солнце в ${id}-й части`}
      style={styles.ring}
    >
      <View style={[styles.circle, { width: R_OUT * 2, height: R_OUT * 2, left: C - R_OUT, top: C - R_OUT }]} />
      <View style={[styles.circle, { width: R_IN * 2, height: R_IN * 2, left: C - R_IN, top: C - R_IN }]} />

      <View
        style={[
          radial((id - 1) * DEGREES_PER_NAME + DEGREES_PER_NAME / 2, mid, partWidth, band),
          styles.part,
        ]}
      />

      {Array.from({ length: 72 }, (_, i) => {
        const major = i % 6 === 0;
        const length = major ? band + 6 : band;
        return (
          <View
            key={i}
            style={[
              radial(i * DEGREES_PER_NAME, R_OUT - length / 2, major ? 1.6 : 0.8, length),
              { backgroundColor: major ? colors.parchmentDim : colors.hairline },
            ]}
          />
        );
      })}

      <View style={[radial(longitude, R_SUN / 2, 1, R_SUN), styles.ray]} />
      <View
        style={[
          styles.sun,
          {
            left: C + R_SUN * Math.sin((longitude * Math.PI) / 180) - SUN / 2,
            top: C - R_SUN * Math.cos((longitude * Math.PI) / 180) - SUN / 2,
          },
        ]}
      />
      <View style={styles.hub} />
      <Text style={styles.origin}>0° · начало Овна</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    width: SIZE,
    height: SIZE,
    alignSelf: 'center',
    marginTop: 18,
  },
  circle: {
    position: 'absolute',
    borderRadius: R_OUT,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  part: {
    backgroundColor: colors.sparkWash,
    borderWidth: 1,
    borderColor: colors.spark,
  },
  ray: {
    backgroundColor: colors.sparkSoft,
  },
  sun: {
    position: 'absolute',
    width: SUN,
    height: SUN,
    borderRadius: SUN / 2,
    backgroundColor: colors.spark,
  },
  hub: {
    position: 'absolute',
    left: C - 3,
    top: C - 3,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.parchmentDim,
  },
  origin: {
    position: 'absolute',
    top: -18,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontFamily: fonts.body,
    ...type.tag,
    color: colors.parchmentDim,
  },
});
