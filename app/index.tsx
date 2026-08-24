import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HebrewGlyphs } from '../components/HebrewGlyphs';
import { useFavorites } from '../lib/favorites';
import { nameOfTheDay, randomNameId } from '../lib/data';
import { colors, fonts } from '../lib/theme';

export default function Home() {
  const insets = useSafeAreaInsets();
  const { favoriteIds } = useFavorites();
  const today = nameOfTheDay();

  const dateLabel = new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  return (
    <ScrollView
      contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 24 }]}
    >
      <Text style={styles.kicker}>{dateLabel}</Text>

      <Pressable
        style={({ pressed }) => [styles.dayCard, pressed && styles.pressed]}
        onPress={() => router.push(`/names/${today.id}`)}
      >
        <Text style={styles.dayEyebrow}>Имя дня</Text>
        <HebrewGlyphs letters={today.hebrewLetters} variant="display" size="large" />
        <Text style={styles.dayTitle}>{today.title}</Text>
        <Text style={styles.dayTeaser} numberOfLines={3}>
          {today.summary}
        </Text>
        <View style={styles.dayCta}>
          <Text style={styles.dayCtaText}>Читать</Text>
        </View>
      </Pressable>

      <View style={styles.grid}>
        <Tile
          label="Введение"
          sub="Как это устроено"
          onPress={() => router.push('/intro')}
        />
        <Tile
          label="Случайное имя"
          sub="1 из 72"
          onPress={() => router.push(`/names/${randomNameId(today.id)}`)}
        />
        <Tile
          label="Категории"
          sub="По жизненным темам"
          onPress={() => router.push('/categories')}
        />
        <Tile
          label="Избранное"
          sub={favoriteIds.size > 0 ? `${favoriteIds.size} сохранено` : 'Пока пусто'}
          onPress={() => router.push('/favorites')}
        />
        <Tile
          wide
          label="Все имена"
          sub="Полный список, 72"
          onPress={() => router.push('/names')}
        />
      </View>
    </ScrollView>
  );
}

function Tile({
  label,
  sub,
  onPress,
  wide,
}: {
  label: string;
  sub: string;
  onPress: () => void;
  wide?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.tile,
        wide && styles.tileWide,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
    >
      <View>
        <Text style={styles.tileLabel}>{label}</Text>
        <Text style={styles.tileSub}>{sub}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 48,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  pressed: {
    opacity: 0.8,
  },
  kicker: {
    fontFamily: fonts.body,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.parchmentDim,
    marginBottom: 18,
  },
  dayCard: {
    borderRadius: 18,
    paddingVertical: 26,
    paddingHorizontal: 20,
    backgroundColor: colors.veil,
    borderWidth: 1,
    borderColor: colors.hairlineSoft,
    marginBottom: 22,
    alignItems: 'center',
  },
  dayEyebrow: {
    fontFamily: fonts.body,
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.spark,
    marginBottom: 16,
  },
  dayTitle: {
    fontFamily: fonts.displayRuBold,
    fontSize: 21,
    color: colors.parchment,
    marginTop: 14,
    marginBottom: 8,
    textAlign: 'center',
  },
  dayTeaser: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 20,
    color: colors.parchmentDim,
    textAlign: 'center',
    maxWidth: 320,
    marginBottom: 18,
  },
  dayCta: {
    backgroundColor: colors.spark,
    borderRadius: 100,
    paddingVertical: 10,
    paddingHorizontal: 22,
  },
  dayCtaText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.void,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tile: {
    width: '48%',
    backgroundColor: colors.veil,
    borderWidth: 1,
    borderColor: colors.hairlineSoft,
    borderRadius: 14,
    padding: 16,
  },
  tileWide: {
    width: '100%',
  },
  tileLabel: {
    fontFamily: fonts.displayRuBold,
    fontSize: 14.5,
    color: colors.parchment,
    lineHeight: 18,
  },
  tileSub: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.parchmentDim,
    marginTop: 3,
  },
});
