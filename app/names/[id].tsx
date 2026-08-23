import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { HebrewGlyphs } from '../../components/HebrewGlyphs';
import { useFavorites } from '../../lib/favorites';
import { getNameById, randomNameId, NAMES } from '../../lib/data';
import { colors, fonts } from '../../lib/theme';

const SWIPE_DISTANCE_THRESHOLD = 40;

export default function NameDetail() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isFavorite, toggleFavorite } = useFavorites();

  const name = getNameById(Number(id));
  if (!name) {
    return (
      <View style={[styles.scroll, { paddingTop: insets.top + 40 }]}>
        <Text style={styles.notFound}>Имя не найдено.</Text>
      </View>
    );
  }

  const favorite = isFavorite(name.id);

  // Swipe left/right moves through the full 72-name list in book order,
  // regardless of where the user navigated in from (favorites, a category,
  // random). Wraps around at both ends.
  const currentIndex = NAMES.findIndex((n) => n.id === name.id);
  const nextId = NAMES[(currentIndex + 1) % NAMES.length].id;
  const prevId = NAMES[(currentIndex - 1 + NAMES.length) % NAMES.length].id;

  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .failOffsetY([-15, 15])
    .runOnJS(true)
    .onEnd((e) => {
      if (e.translationX <= -SWIPE_DISTANCE_THRESHOLD) {
        router.replace({ pathname: '/names/[id]', params: { id: String(nextId), dir: 'next' } });
      } else if (e.translationX >= SWIPE_DISTANCE_THRESHOLD) {
        router.replace({ pathname: '/names/[id]', params: { id: String(prevId), dir: 'prev' } });
      }
    });

  return (
    <GestureDetector gesture={swipeGesture}>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.void }}
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 20 }]}
      >
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>← Назад</Text>
        </Pressable>

        <View style={styles.hero}>
          <Text style={styles.num}>
            Имя {String(name.id).padStart(2, '0')} из {NAMES.length}
          </Text>
          <HebrewGlyphs letters={name.hebrewLetters} variant="display" size="large" />
          <Text style={styles.title}>{name.title}</Text>
          <View style={styles.tags}>
            {[name.category, ...name.keywords].map((k) => (
              <View key={k} style={styles.tag}>
                <Text style={styles.tagText}>{k}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable
            style={[styles.btn, favorite && styles.btnPrimary]}
            onPress={() => toggleFavorite(name.id)}
          >
            <Text style={[styles.btnText, favorite && styles.btnPrimaryText]}>
              {favorite ? '★ В избранном' : '☆ В избранное'}
            </Text>
          </Pressable>
          <Pressable
            style={styles.btn}
            onPress={() => router.push(`/names/${randomNameId(name.id)}`)}
          >
            <Text style={styles.btnText}>↻ Случайное</Text>
          </Pressable>
        </View>

        <View style={styles.block}>
          <Text style={styles.blockHeading}>Описание</Text>
          <Text style={styles.blockText}>{name.summary}</Text>
        </View>
      </ScrollView>
    </GestureDetector>
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
  notFound: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.parchmentDim,
  },
  back: {
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: '700',
    color: colors.parchmentDim,
    marginBottom: 22,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 22,
  },
  num: {
    fontFamily: fonts.body,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: colors.spark,
    marginBottom: 18,
  },
  title: {
    fontFamily: fonts.displayRuBold,
    fontSize: 22,
    color: colors.parchment,
    marginTop: 16,
    marginBottom: 10,
    textAlign: 'center',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
  },
  tag: {
    backgroundColor: colors.threadSoft,
    borderColor: colors.threadBorder,
    borderWidth: 1,
    borderRadius: 100,
    paddingHorizontal: 11,
    paddingVertical: 4,
  },
  tagText: {
    fontFamily: fonts.body,
    fontSize: 11,
    fontWeight: '700',
    color: colors.thread,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 26,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.veil,
    borderRadius: 100,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  btnPrimary: {
    backgroundColor: colors.spark,
    borderColor: colors.spark,
  },
  btnText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    fontWeight: '700',
    color: colors.parchment,
  },
  btnPrimaryText: {
    color: colors.void,
  },
  block: {
    marginBottom: 22,
  },
  blockHeading: {
    fontFamily: fonts.body,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.parchmentDim,
    marginBottom: 10,
  },
  blockText: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 23,
    color: colors.parchment,
  },
});
