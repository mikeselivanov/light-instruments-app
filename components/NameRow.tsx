import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { DISPLAY_DOT_RATIO, HebrewGlyphs } from './HebrewGlyphs';
import { methodLabel, useFavorites } from '../lib/favorites';
import type { BirthMethod } from '../lib/birth-name';
import { tappable } from '../lib/interaction';
import { colors, fonts, type } from '../lib/theme';
import type { DivineName } from '../lib/data';

/**
 * `mine` marks the row as the user's own name from the birth screen: lit in
 * gold, a «Моё · по дате» plate in place of the category, and the fine
 * separator dot the user asked for on the new surfaces.
 */
export function NameRow({ name, mine }: { name: DivineName; mine?: BirthMethod }) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorite = isFavorite(name.id);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        mine && styles.rowMine,
        tappable,
        pressed && styles.rowPressed,
      ]}
      onPress={() => router.replace(`/names/${name.id}`)}
    >
      <Text style={styles.num}>{String(name.id).padStart(2, '0')}</Text>
      <HebrewGlyphs
        letters={name.hebrewLetters}
        variant="compact"
        dotRatio={mine ? DISPLAY_DOT_RATIO : undefined}
      />
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>
          {name.title}
        </Text>
        {mine ? (
          <Text style={styles.mineBadge}>Моё · {methodLabel(mine)}</Text>
        ) : (
          <Text style={styles.tag} numberOfLines={1}>
            {name.category}
          </Text>
        )}
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
  rowMine: {
    backgroundColor: colors.sparkWash,
    borderWidth: 1,
    borderColor: colors.sparkSoft,
    borderRadius: 12,
    paddingHorizontal: 10,
    marginHorizontal: -6,
  },
  mineBadge: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 100,
    overflow: 'hidden',
    backgroundColor: colors.spark,
    color: colors.void,
    fontFamily: fonts.bodyBold,
    ...type.tag,
    textTransform: 'uppercase',
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
