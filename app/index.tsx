import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { HebrewGlyphs } from '../components/HebrewGlyphs';
import { InstallBanner } from '../components/InstallBanner';
import { PracticeRow } from '../components/PracticeRow';
import { useFavorites } from '../lib/favorites';
import { tappable } from '../lib/interaction';
import { useScreenPadding } from '../lib/safe-area';
import { nameOfTheDay, randomNameId } from '../lib/data';
import { colors, fonts, type } from '../lib/theme';
import { ScreenTransition } from '../components/ScreenTransition';

/**
 * Every navigation in this app is `router.replace`, never `push`.
 *
 * Pushing builds up browser history, and browser history is what the platform
 * back/forward gestures move through — the edge swipe on iOS, the system back
 * gesture on Android. A web page cannot intercept either of those, and
 * `overscroll-behavior: none` does not touch them: it governs scroll chaining,
 * not OS gestures. The only way to stop them navigating is to leave them
 * nothing to navigate to, so the history stays exactly one entry deep.
 *
 * The cost is that Android's back gesture now closes the app instead of
 * stepping back a screen. That is the trade: the Home and prev/next buttons on
 * the Name screen exist to carry the navigation this gives up.
 */
export default function Home() {
  const padding = useScreenPadding(24);
  const { favoriteIds } = useFavorites();
  const today = nameOfTheDay();

  const dateLabel = new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  return (
    <ScreenTransition style={{ backgroundColor: colors.void }}>
      <ScrollView contentContainerStyle={[styles.scroll, padding]}>
        <View style={styles.topBar}>
          <Text style={styles.kicker}>{dateLabel}</Text>
          <Pressable
            onPress={() => router.replace('/settings')}
            style={({ pressed }) => [styles.gearBtn, tappable, pressed && styles.pressed]}
            hitSlop={8}
          >
            <Ionicons name="settings-outline" size={20} color={colors.parchmentDim} />
          </Pressable>
        </View>

        <InstallBanner />

        <Pressable
          style={({ pressed }) => [styles.dayCard, tappable, pressed && styles.pressed]}
          onPress={() => router.replace(`/names/${today.id}`)}
        >
          <Text style={styles.dayEyebrow}>Имя дня</Text>
          <HebrewGlyphs letters={today.hebrewLetters} variant="display" />
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
            onPress={() => router.replace('/intro')}
          />
          <Tile
            label="Случайное имя"
            sub="1 из 72"
            onPress={() => router.replace(`/names/${randomNameId(today.id)}`)}
          />
          <Tile
            label="Категории"
            sub="По жизненным темам"
            onPress={() => router.replace('/categories')}
          />
          <Tile
            label="Избранное"
            sub={favoriteIds.size > 0 ? `${favoriteIds.size} сохранено` : 'Пока пусто'}
            onPress={() => router.replace('/favorites')}
          />
          <Tile
            wide
            label="Все имена"
            sub="Полный список, 72"
            onPress={() => router.replace('/names')}
          />
        </View>

        <View style={styles.sectionLabel}>
          <Text style={styles.sectionLabelText}>Практики</Text>
          <View style={styles.sectionRule} />
        </View>

        <View style={styles.practices}>
          <PracticeRow
            transliteration="ЙУД"
            label="Дыхание"
            sub="Тетраграмматон, в своём ритме"
            onPress={() => router.replace('/practices/breathing')}
          />
          <PracticeRow
            transliteration="АЛЕФ"
            label="Созерцание буквы"
            sub="22 буквы, 3–5 минут"
            onPress={() => router.replace('/practices/letter')}
          />
          <PracticeRow
            transliteration="ШИН"
            label="Колесо Галгал"
            sub="231 врата, круг за кругом"
            onPress={() => router.replace('/practices/galgal')}
          />
        </View>
      </ScrollView>
    </ScreenTransition>
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
        tappable,
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
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  pressed: {
    opacity: 0.8,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  kicker: {
    fontFamily: fonts.body,
    ...type.eyebrow,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: colors.parchmentDim,
  },
  gearBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.veil,
    borderWidth: 1,
    borderColor: colors.hairlineSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCard: {
    borderRadius: 18,
    paddingVertical: 26,
    // 14, not 20: the name is now set at the same size here as on the detail
    // screen, and the widest of the 72 blocks is 240.5pt. On a 320pt phone
    // that leaves 320 - 40 (screen) - 28 (card) = 252pt to hold it.
    paddingHorizontal: 14,
    backgroundColor: colors.veil,
    borderWidth: 1,
    borderColor: colors.hairlineSoft,
    marginBottom: 22,
    alignItems: 'center',
  },
  dayEyebrow: {
    fontFamily: fonts.body,
    ...type.eyebrow,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: colors.spark,
    marginBottom: 18,
  },
  dayTitle: {
    fontFamily: fonts.displayRuBold,
    ...type.nameTitle,
    color: colors.parchment,
    marginTop: 16,
    marginBottom: 10,
    textAlign: 'center',
  },
  dayTeaser: {
    fontFamily: fonts.body,
    ...type.body,
    color: colors.parchmentDim,
    textAlign: 'center',
    maxWidth: 320,
    marginBottom: 20,
  },
  dayCta: {
    backgroundColor: colors.spark,
    borderRadius: 100,
    paddingVertical: 10,
    paddingHorizontal: 22,
  },
  dayCtaText: {
    fontFamily: fonts.bodyBold,
    ...type.button,
    fontWeight: '700',
    color: colors.void,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  sectionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 24,
    marginBottom: 12,
  },
  sectionLabelText: {
    fontFamily: fonts.body,
    ...type.eyebrow,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: colors.spark,
  },
  sectionRule: {
    flex: 1,
    height: 1,
    backgroundColor: colors.hairline,
  },
  practices: {
    gap: 9,
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
    ...type.rowTitle,
    color: colors.parchment,
  },
  tileSub: {
    fontFamily: fonts.body,
    ...type.small,
    color: colors.parchmentDim,
    marginTop: 3,
  },
});
