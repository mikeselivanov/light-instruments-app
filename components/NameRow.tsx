import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { HebrewGlyphs } from './HebrewGlyphs';
import { useFavorites } from '../lib/favorites';
import { tappable } from '../lib/interaction';
import { colors, fonts, type } from '../lib/theme';
import type { DivineName } from '../lib/data';

export function NameRow({ name }: { name: DivineName }) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorite = isFavorite(name.id);

  return (
    <Pressable
      style={({ pressed }) => [styles.row, tappable, pressed && styles.rowPressed]}
      onPress={() => router.replace(`/names/${name.id}`)}
    >
      <Text style={styles.num}>{String(name.id).padStart(2, '0')}</Text>
      <HebrewGlyphs letters={name.hebrewLetters} variant="compact" />
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>
          {name.title}
        </Text>
        <Text style={styles.tag} numberOfLines={1}>
          {name.category}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={favorite ? 'Убрать из избранного' : 'В избранное'}
        // The glyph itself is a ~20pt target sitting inside a row that is also
        // pressable, so it needs slop on every side to be reliably hittable
        // without the row swallowing the tap.
        hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
        onPress={() => toggleFavorite(name.id)}
        style={({ pressed }) => [styles.starHit, tappable, pressed && styles.starPressed]}
      >
        <Text style={[styles.star, favorite && styles.starFilled]}>
          {favorite ? '★' : '☆'}
        </Text>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingVertical: 13,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairlineSoft,
  },
  rowPressed: {
    backgroundColor: colors.veil,
  },
  num: {
    fontFamily: fonts.body,
    ...type.small,
    color: colors.parchmentDim,
    width: 20,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: fonts.displayRuBold,
    ...type.rowTitle,
    color: colors.parchment,
  },
  tag: {
    fontFamily: fonts.body,
    ...type.small,
    color: colors.parchmentDim,
    marginTop: 2,
  },
  starHit: {
    paddingLeft: 6,
  },
  starPressed: {
    opacity: 0.5,
  },
  star: {
    fontSize: 20,
    color: colors.hairlineSoft,
  },
  starFilled: {
    color: colors.spark,
  },
});
