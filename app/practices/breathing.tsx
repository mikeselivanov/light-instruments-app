import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Glyph } from '../../components/Glyph';
import { HomeButton } from '../../components/HomeButton';
import { IconButton } from '../../components/IconButton';
import { Pill, StartButton } from '../../components/PracticeControls';
import { ScreenTransition } from '../../components/ScreenTransition';
import { selectableText, tappable } from '../../lib/interaction';
import { useScreenPadding } from '../../lib/safe-area';
import { colors, fonts, type } from '../../lib/theme';
import { useWakeLock } from '../../lib/wake-lock';

type Phase = 'intro' | 'run' | 'done';
type Minutes = 3 | 5 | 10;

/**
 * The four letters of the Name, read as one full breath.
 *
 * `mode` is what the ring does while the letter stands: grow through the
 * inhale, hold through either pause, contract through the exhale. Nothing here
 * carries a duration — the person breathing supplies that by touching.
 */
const PHASES = [
  {
    transliteration: 'ЙУД',
    label: 'вдох',
    hint: 'Коснитесь экрана, когда закончите вдох',
    mode: 'grow',
  },
  {
    transliteration: 'ХЕЙ',
    label: 'пауза',
    hint: 'Коснитесь, когда пауза закончится',
    mode: 'hold',
  },
  {
    transliteration: 'ВАВ',
    label: 'выдох',
    hint: 'Коснитесь в конце выдоха',
    mode: 'shrink',
  },
  {
    transliteration: 'ХЕЙ',
    label: 'покой',
    hint: 'Коснитесь, когда захочется вдохнуть',
    mode: 'hold',
  },
] as const;

/** How far the ring contracts by the end of an exhale. */
const MIN_SCALE = 0.44;
/** What a phase is assumed to last before this person has breathed one. */
const DEFAULT_MS = 4000;
/** Floor and ceiling on a recorded phase, so one stray touch cannot skew the median. */
const SAMPLE_MIN_MS = 700;
const SAMPLE_MAX_MS = 20_000;
/** Half of the letter's crossfade: out, swap, back in. */
const GLYPH_FADE_MS = 130;
/** How long the hint and the phase label take to leave after the first cycle. */
const LABELS_FADE_MS = 600;

const RING_SIZE = 236;
const GLYPH_SIZE = 116;

function median(list: readonly number[]): number {
  if (list.length === 0) return DEFAULT_MS;
  const sorted = [...list].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/**
 * The ring's easing: 95% of the way there at the expected duration, then a crawl.
 *
 * This is the whole trick of the screen. A ring that simply eased to its target
 * over the expected time would arrive and sit there waiting, which reads as
 * "you are late"; one that moved linearly forever would never look like a
 * breath. At t = 0.25 of a four-times-longer animation — that is, exactly at
 * the expected duration — this returns 1 − e⁻³ ≈ 0.95, and spends the rest of
 * its budget covering the last twentieth. So it always looks alive, never
 * finishes first, and never has to snap back when the person takes longer.
 */
const asymptotic = (t: number) => (1 - Math.exp(-12 * t)) / (1 - Math.exp(-12));

export default function BreathingPractice() {
  const [phase, setPhase] = useState<Phase>('intro');
  const [minutes, setMinutes] = useState<Minutes>(5);

  return (
    <ScreenTransition style={{ backgroundColor: colors.void }}>
      {phase === 'intro' && (
        <IntroView
          minutes={minutes}
          onMinutes={setMinutes}
          onStart={() => setPhase('run')}
        />
      )}
      {phase === 'run' && (
        <RunView
          minutes={minutes}
          onEarlyExit={() => setPhase('intro')}
          onComplete={() => setPhase('done')}
        />
      )}
      {phase === 'done' && <DoneView />}
    </ScreenTransition>
  );
}

function IntroView({
  minutes,
  onMinutes,
  onStart,
}: {
  minutes: Minutes;
  onMinutes: (m: Minutes) => void;
  onStart: () => void;
}) {
  const padding = useScreenPadding();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.void }}
      contentContainerStyle={[styles.scroll, padding]}
    >
      <HomeButton style={styles.back} />

      <Text style={styles.title}>Дыхание на Имя</Text>

      <View style={styles.paragraphs}>
        <Text style={[styles.paragraph, selectableText]}>
          Четырёхбуквенное Имя — это не слово, которое произносят, а описание одного
          полного дыхания. Йуд — вдох, искра и начало. Хей — раскрытие, пауза наверху.
          Вав — выдох, связь и продолжение. Хей — покой перед следующим вдохом.
        </Text>
        <Text style={[styles.paragraph, selectableText]}>
          <Text style={styles.paragraphLead}>Зачем.</Text> Дыхание — единственный
          телесный процесс, который идёт сам и которым можно управлять. Практика не
          меняет его, а возвращает внимание к нему: пока вы смотрите на букву, ум занят
          одной вещью, а не тридцатью.
        </Text>
        <Text style={[styles.paragraph, selectableText]}>
          <Text style={styles.paragraphLead}>Как.</Text> Дышите как дышится — ритм не
          задан. Смотрите на букву и касайтесь экрана, когда эта часть дыхания
          закончилась. Имя не произносят вслух, его только видят. Если отвлеклись —
          просто коснитесь и продолжайте.
        </Text>
      </View>

      <View style={styles.pillGroup}>
        <Text style={styles.pillGroupLabel}>Длительность</Text>
        <View style={styles.pillRow}>
          <Pill label="3 минуты" selected={minutes === 3} onPress={() => onMinutes(3)} />
          <Pill label="5 минут" selected={minutes === 5} onPress={() => onMinutes(5)} />
          <Pill label="10 минут" selected={minutes === 10} onPress={() => onMinutes(10)} />
        </View>
      </View>

      <StartButton label="Начать" onPress={onStart} />
    </ScrollView>
  );
}

function RunView({
  minutes,
  onEarlyExit,
  onComplete,
}: {
  minutes: Minutes;
  onEarlyExit: () => void;
  onComplete: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const [hintShown, setHintShown] = useState(true);

  // The authoritative phase index. State drives what is drawn, but a touch that
  // lands during the letter's crossfade has to be counted against the phase the
  // person is actually in, not the one still fading out.
  const indexRef = useRef(0);
  const firstCycleDone = useRef(false);
  const samples = useRef<number[][]>([[], [], [], []]);
  const phaseStartedAt = useRef(Date.now());
  const sessionEndsAt = useRef(Date.now() + minutes * 60_000);

  const scale = useRef(new Animated.Value(MIN_SCALE)).current;
  const glyphOpacity = useRef(new Animated.Value(1)).current;
  const labelsOpacity = useRef(new Animated.Value(1)).current;

  useWakeLock(true);

  const animateRing = useCallback(
    (phaseIndex: number) => {
      const { mode } = PHASES[phaseIndex];
      // A pause keeps whatever the previous phase reached: the breath is being
      // held, so the ring holds too.
      if (mode === 'hold') return;

      const expected = median(samples.current[phaseIndex]);
      Animated.timing(scale, {
        toValue: mode === 'grow' ? 1 : MIN_SCALE,
        duration: expected * 4,
        easing: asymptotic,
        useNativeDriver: true,
      }).start();
    },
    [scale]
  );

  useEffect(() => {
    phaseStartedAt.current = Date.now();
    sessionEndsAt.current = Date.now() + minutes * 60_000;
    scale.setValue(MIN_SCALE);
    animateRing(0);

    return () => {
      scale.stopAnimation();
      glyphOpacity.stopAnimation();
      labelsOpacity.stopAnimation();
    };
  }, [minutes, animateRing, scale, glyphOpacity, labelsOpacity]);

  const advance = useCallback(() => {
    const now = Date.now();
    const current = indexRef.current;

    samples.current[current].push(
      Math.min(Math.max(now - phaseStartedAt.current, SAMPLE_MIN_MS), SAMPLE_MAX_MS)
    );

    const next = (current + 1) % PHASES.length;

    if (next === 0) {
      // A cycle just closed on the second Hey. This is the only moment the
      // session is allowed to end — never mid-inhale.
      if (now >= sessionEndsAt.current) {
        onComplete();
        return;
      }
      if (!firstCycleDone.current) {
        firstCycleDone.current = true;
        setHintShown(false);
        Animated.timing(labelsOpacity, {
          toValue: 0,
          duration: LABELS_FADE_MS,
          useNativeDriver: true,
        }).start();
      }
    }

    indexRef.current = next;
    phaseStartedAt.current = now;
    animateRing(next);

    Animated.timing(glyphOpacity, {
      toValue: 0,
      duration: GLYPH_FADE_MS,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) return;
      setIndex(indexRef.current);
      Animated.timing(glyphOpacity, {
        toValue: 1,
        duration: GLYPH_FADE_MS,
        useNativeDriver: true,
      }).start();
    });
  }, [animateRing, glyphOpacity, labelsOpacity, onComplete]);

  const ringOpacity = scale.interpolate({
    inputRange: [MIN_SCALE, 1],
    outputRange: [0.55, 1],
  });
  const fillOpacity = scale.interpolate({
    inputRange: [MIN_SCALE, 1],
    outputRange: [0.25, 0.9],
  });

  return (
    <View style={styles.runScreen}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Следующая фаза дыхания"
        onPress={advance}
        style={[styles.runField, tappable]}
      >
        <View style={styles.ringWrap}>
          <Animated.View
            style={[styles.ringFill, { opacity: fillOpacity, transform: [{ scale }] }]}
          />
          <Animated.View
            testID="breath-ring"
            style={[styles.ring, { opacity: ringOpacity, transform: [{ scale }] }]}
          />
          <Animated.View testID="breath-glyph" style={{ opacity: glyphOpacity }}>
            <Glyph
              transliteration={PHASES[index].transliteration}
              size={GLYPH_SIZE}
              color={colors.parchment}
            />
          </Animated.View>
        </View>
      </Pressable>

      <Animated.View
        pointerEvents="none"
        style={[styles.labels, { opacity: labelsOpacity }]}
      >
        <Text testID="breath-phase" style={styles.phaseLabel}>
          {PHASES[index].label}
        </Text>
        {hintShown && (
          <Text testID="breath-hint" style={styles.hint}>
            {PHASES[index].hint}
          </Text>
        )}
      </Animated.View>

      <View style={[styles.chrome, { top: insets.top + 20, right: insets.right + 20 }]}>
        <IconButton icon="close-outline" label="Завершить" onPress={onEarlyExit} />
      </View>
    </View>
  );
}

function DoneView() {
  const padding = useScreenPadding();

  return (
    <View style={[styles.doneScreen, padding]}>
      <View style={styles.doneContent}>
        <Glyph transliteration="ХЕЙ" size={88} color={colors.sparkSoft} />
        <Text style={styles.doneTitle}>Сессия завершена</Text>
        <StartButton label="На главную" onPress={() => router.replace('/')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  back: {
    marginBottom: 22,
  },
  title: {
    fontFamily: fonts.displayRuBold,
    ...type.screenTitle,
    color: colors.parchment,
    marginBottom: 22,
  },
  paragraphs: {
    gap: 16,
    marginBottom: 28,
  },
  paragraph: {
    fontFamily: fonts.body,
    ...type.read,
    color: colors.parchmentDim,
  },
  paragraphLead: {
    fontFamily: fonts.bodyBold,
    fontWeight: '700',
    color: colors.parchmentDim,
  },
  pillGroup: {
    marginBottom: 22,
  },
  pillGroupLabel: {
    fontFamily: fonts.body,
    ...type.small,
    color: colors.parchmentDim,
    marginBottom: 10,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  runScreen: {
    flex: 1,
    backgroundColor: colors.void,
  },
  runField: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 1.5,
    borderColor: colors.sparkSoft,
  },
  ringFill: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    backgroundColor: colors.sparkWash,
  },
  labels: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 56,
    alignItems: 'center',
    gap: 14,
  },
  phaseLabel: {
    fontFamily: fonts.body,
    ...type.eyebrow,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: colors.sparkSoft,
  },
  hint: {
    fontFamily: fonts.body,
    ...type.small,
    color: colors.parchmentDim,
    textAlign: 'center',
  },
  chrome: {
    position: 'absolute',
  },
  doneScreen: {
    flex: 1,
    backgroundColor: colors.void,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneContent: {
    maxWidth: 480,
    width: '100%',
    alignItems: 'center',
    gap: 20,
  },
  doneTitle: {
    fontFamily: fonts.displayRuBold,
    ...type.screenTitle,
    color: colors.parchment,
    textAlign: 'center',
  },
});
