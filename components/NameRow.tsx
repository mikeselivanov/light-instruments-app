import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { HebrewGlyphs } from './HebrewGlyphs';
import { useFavorites } from '../lib/favorites';
import { colors, fonts } from '../lib/theme';
import type { DivineName } from '../lib/data';

export function NameRow({ name }: { name: DivineName }) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorite = isFavorite(name.id);

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={() => router.push(`/names/${name.id}`)}
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
        hitSlop={10}
        onPress={() => toggleFavorite(name.id)}
        style={styles.starHit}
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
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairlineSoft,
  },
  rowPressed: {
    backgroundColor: colors.veil,
  },
  num: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.parchmentDim,
    width: 18,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: fonts.displayRuBold,
    fontSize: 14.5,
    lineHeight: 18,
    color: colors.parchment,
  },
  tag: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.parchmentDim,
    marginTop: 2,
  },
  starHit: {
    paddingLeft: 6,
  },
  star: {
    fontSize: 17,
    color: colors.hairlineSoft,
  },
  starFilled: {
    color: colors.spark,
  },
});
