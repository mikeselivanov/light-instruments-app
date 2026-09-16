import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { HebrewGlyphs } from '../../components/HebrewGlyphs';
import { IconButton } from '../../components/IconButton';
import { ScreenTransition } from '../../components/ScreenTransition';
import { selectableText, tappable } from '../../lib/interaction';
import { useScreenPadding } from '../../lib/safe-area';
import { useFavorites } from '../../lib/favorites';
import { getNameById, randomNameId, NAMES } from '../../lib/data';
import { colors, fonts, type } from '../../lib/theme';

const SWIPE_DISTANCE_THRESHOLD = 40;

export default function NameDetail() {
  const { paddingBottom, ...edges } = useScreenPadding();
  const { id, dir } = useLocalSearchParams<{ id: string; dir?: string }>();
  const { isFavorite, toggleFavorite } = useFavorites();

  const name = getNameById(Number(id));
  if (!name) {
    return (
      <View style={[styles.frame, edges]}>
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

  // `replace`, not `push`: stepping through names must not pile 72 entries
  // onto the history stack. `dir` is what the root layout reads to slide the
  // screen in from the correct side.
  const go = (targetId: number, dir: 'prev' | 'next') =>
    router.replace({ pathname: '/names/[id]', params: { id: String(targetId), dir } });

  // Biased toward the horizontal on purpose. At the old 20/15 any drag
  // steeper than about 37 degrees off horizontal was handed to the scroller,
  // and a thumb swiping across a phone rarely travels that straight — which is
  // why changing Name so often scrolled the page instead. 14/22 moves the
  // boundary out to about 57 degrees; anything plainly vertical still scrolls.
  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-14, 14])
    .failOffsetY([-22, 22])
    .runOnJS(true)
    .onEnd((e) => {
      if (e.translationX <= -SWIPE_DISTANCE_THRESHOLD) {
        go(nextId, 'next');
      } else if (e.translationX >= SWIPE_DISTANCE_THRESHOLD) {
        go(prevId, 'prev');
      }
    });

  return (
    <GestureDetector gesture={swipeGesture}>
      {/* This View is not decoration — it is what keeps the screen scrollable.
          GestureDetector attaches the handler to its direct child's underlying
          view, and on web react-native-gesture-handler writes
          `touch-action: none` onto that element (see setTouchAction in
          web/tools/GestureHandlerWebDelegate). With the ScrollView as the
          direct child, that lands on the very element that does the scrolling
          and the browser then refuses to scroll it with a finger at all —
          which is exactly what an iOS user reported. Wheel and trackpad
          scrolling are unaffected by touch-action, which is why it looked fine
          on a desktop browser. Putting a plain View in between moves
          `touch-action: none` off the scroller and onto a wrapper that has
          nothing to scroll. */}
      <View style={styles.swipeArea}>
        {/* key: stepping to the next Name is a router.replace, which keeps
            this component mounted and only swaps its params — without a key
            that changes, the animation would run once and never again. */}
        <ScreenTransition key={name.id} from={dir === 'prev' ? 'left' : 'right'}>
          {/* The Name and its controls are pinned; only the description
              scrolls. Two reasons. The letters are what the screen is for —
              scrolling them off to read about them defeats the point — and
              with nothing scrollable under the thumb up here, a sideways swipe
              across the Name can no longer be mistaken for a scroll. */}
          <View style={[styles.frame, edges]}>
            {/* Buttons for the same three moves the swipe makes, because a swipe
                is invisible: nothing on screen says it exists, and it is awkward
                one-handed on a large phone. These replaced a "← Назад" text link,
                which at 57x19pt was small enough that a press which drifted a
                little did nothing at all — or, past the swipe threshold, landed
                on a different name instead of going back. */}
            <View style={styles.nav}>
              <IconButton
                icon="chevron-back"
                label="Предыдущее имя"
                onPress={() => go(prevId, 'prev')}
              />
              <IconButton
                icon="home-outline"
                label="На главную"
                // navigate, not push: returns to the home screen already sitting
                // in the stack rather than stacking a second copy on top of it.
                onPress={() => router.replace('/')}
              />
              <IconButton
                icon="chevron-forward"
                label="Следующее имя"
                onPress={() => go(nextId, 'next')}
              />
            </View>

            <View style={styles.hero}>
              <Text style={styles.num}>Имя {String(name.id).padStart(2, '0')}</Text>
              <HebrewGlyphs letters={name.hebrewLetters} variant="display" />
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
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.btn,
                  tappable,
                  favorite && styles.btnPrimary,
                  pressed && styles.btnPressed,
                ]}
                onPress={() => toggleFavorite(name.id)}
              >
                <Text style={[styles.btnText, favorite && styles.btnPrimaryText]}>
                  {favorite ? '★ В избранном' : '☆ В избранное'}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [styles.btn, tappable, pressed && styles.btnPressed]}
                onPress={() => router.replace(`/names/${randomNameId(name.id)}`)}
              >
                <Text style={styles.btnText}>↻ Случайное</Text>
              </Pressable>
            </View>

            <ScrollView
              style={styles.scroller}
              contentContainerStyle={{ paddingBottom }}
            >
              <Text style={styles.blockHeading}>Описание</Text>
              <Text style={[styles.blockText, selectableText]}>{name.summary}</Text>
            </ScrollView>
          </View>
        </ScreenTransition>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  swipeArea: {
    flex: 1,
    backgroundColor: colors.void,
  },
  frame: {
    flex: 1,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  scroller: {
    flex: 1,
  },
  notFound: {
    fontFamily: fonts.body,
    ...type.body,
    color: colors.parchmentDim,
    // A margin, not padding: the container's paddingTop is the safe-area inset
    // and must not be overwritten to give this one line some breathing room.
    marginTop: 20,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 20,
    flexShrink: 0,
  },
  num: {
    fontFamily: fonts.body,
    ...type.eyebrow,
    fontWeight: '700',
    color: colors.spark,
    marginBottom: 20,
  },
  title: {
    fontFamily: fonts.displayRuBold,
    ...type.nameTitle,
    color: colors.parchment,
    marginTop: 18,
    marginBottom: 12,
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
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  tagText: {
    fontFamily: fonts.body,
    ...type.tag,
    fontWeight: '700',
    color: colors.thread,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
    flexShrink: 0,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.veil,
    borderRadius: 100,
    paddingVertical: 11,
    paddingHorizontal: 16,
  },
  btnPressed: {
    opacity: 0.7,
  },
  btnPrimary: {
    backgroundColor: colors.spark,
    borderColor: colors.spark,
  },
  btnText: {
    fontFamily: fonts.bodyBold,
    ...type.button,
    fontWeight: '700',
    color: colors.parchment,
  },
  btnPrimaryText: {
    color: colors.void,
  },
  blockHeading: {
    fontFamily: fonts.body,
    ...type.eyebrow,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: colors.parchmentDim,
    marginBottom: 12,
  },
  blockText: {
    fontFamily: fonts.body,
    ...type.read,
    color: colors.parchment,
  },
});
