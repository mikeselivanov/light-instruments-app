import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Glyph } from '../../components/Glyph';
import { HebrewGlyphs } from '../../components/HebrewGlyphs';
import { HomeButton } from '../../components/HomeButton';
import { IconButton } from '../../components/IconButton';
import { Pill, StartButton } from '../../components/PracticeControls';
import { ScreenTransition } from '../../components/ScreenTransition';
import { chordLayout, letterHitSize, partnersOf, wheelPoints } from '../../lib/galgal';
import { selectableText, tappable } from '../../lib/interaction';
import { ALPHABET } from '../../lib/letters';
import { useScreenPadding } from '../../lib/safe-area';
import { colors, fonts, type } from '../../lib/theme';
import { useWakeLock } from '../../lib/wake-lock';

type Phase = 'intro' | 'pick' | 'setup' | 'run' | 'done';
/** 0 means the person advances each pair themselves. */
type Pace = 0 | 4 | 6;

/**
 * Which circles have been walked to the end.
 *
 * Not a score and not a percentage — the practice is an exhaustive traversal,
 * and this answers the only question that traversal raises: where did I stop.
 */
const WALKED_KEY = 'galgal:walked:v1';

const BIG_WHEEL_MAX = 340;
const BIG_WHEEL_INSET = 24;
const SMALL_WHEEL_SIZE = 168;
const SMALL_WHEEL_RADIUS = 70;

export default function GalgalPractice() {
  const [phase, setPhase] = useState<Phase>('intro');
  const [anchor, setAnchor] = useState(0);
  const [pace, setPace] = useState<Pace>(0);
  const [walked, setWalked] = useState<Set<string>>(new Set());

  useEffect(() => {
    AsyncStorage.getItem(WALKED_KEY)
      .then((raw) => {
        if (raw) setWalked(new Set(JSON.parse(raw)));
      })
      .catch(() => {});
  }, []);

  const markWalked = useCallback((transliteration: string) => {
    setWalked((prev) => {
      const next = new Set(prev).add(transliteration);
      AsyncStorage.setItem(WALKED_KEY, JSON.stringify([...next])).catch(() => {});
      return next;
    });
  }, []);

  return (
    <ScreenTransition style={{ backgroundColor: colors.void }}>
      {phase === 'intro' && <IntroView onNext={() => setPhase('pick')} />}
      {phase === 'pick' && (
        <PickView
          walked={walked}
          onBack={() => setPhase('intro')}
          onPick={(index) => {
            setAnchor(index);
            setPhase('setup');
          }}
        />
      )}
      {phase === 'setup' && (
        <SetupView
          anchor={anchor}
          walked={walked}
          pace={pace}
          onPace={setPace}
          onBack={() => setPhase('pick')}
          onStart={() => setPhase('run')}
        />
      )}
      {phase === 'run' && (
        <RunView
          anchor={anchor}
          pace={pace}
          onEarlyExit={() => setPhase('pick')}
          onComplete={() => {
            markWalked(ALPHABET[anchor].transliteration);
            setPhase('done');
          }}
        />
      )}
      {phase === 'done' && <DoneView anchor={anchor} onBack={() => setPhase('pick')} />}
    </ScreenTransition>
  );
}

function IntroView({ onNext }: { onNext: () => void }) {
  const padding = useScreenPadding();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.void }}
      contentContainerStyle={[styles.scroll, padding]}
    >
      <HomeButton style={styles.back} />

      <Text style={styles.title}>231 врата</Text>

      <View style={styles.paragraphs}>
        <Text style={[styles.paragraph, selectableText]}>
          <Text style={styles.paragraphLead}>Что это.</Text> «Сефер Йецира» описывает 22
          буквы, вставленные в колесо, которое вращается вперёд и назад. Каждая буква
          соединяется с каждой — 231 сочетание, «врата», через которые, по тексту, было
          сотворено всё сущее.
        </Text>
        <Text style={[styles.paragraph, selectableText]}>
          <Text style={styles.paragraphLead}>Зачем.</Text> Значения искать не нужно: у
          большинства пар его нет. Смысл — в самом переборе. Пройти круг буквы до конца,
          не пропустив ни одного сочетания: практика исчерпания, а не понимания.
        </Text>
        <Text style={[styles.paragraph, selectableText]}>
          <Text style={styles.paragraphLead}>Как.</Text> Выберите букву на колесе.
          Приложение поведёт её по кругу — по одной паре за раз. Каждую произносите вслух
          или про себя, нараспев, на одном выдохе. Один круг — 21 пара, три-четыре
          минуты. Полный обход из 231 врат складывается из таких кругов и занимает
          столько заходов, сколько нужно.
        </Text>
      </View>

      <StartButton label="К колесу" onPress={onNext} />
    </ScrollView>
  );
}

function PickView({
  walked,
  onBack,
  onPick,
}: {
  walked: Set<string>;
  onBack: () => void;
  onPick: (index: number) => void;
}) {
  const padding = useScreenPadding();
  const { width: windowWidth } = useWindowDimensions();
  const size = Math.min(
    windowWidth - padding.paddingLeft - padding.paddingRight,
    BIG_WHEEL_MAX
  );
  const radius = size / 2 - BIG_WHEEL_INSET;
  const points = wheelPoints(ALPHABET.length, size, radius);
  const hit = letterHitSize(radius, ALPHABET.length);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.void }}
      contentContainerStyle={[styles.scroll, padding]}
    >
      <IconButton icon="arrow-back-outline" label="Назад" onPress={onBack} style={styles.back} />

      <View style={[styles.wheel, { width: size, height: size }]}>
        <View
          style={[
            styles.wheelRing,
            {
              top: size / 2 - radius,
              left: size / 2 - radius,
              width: radius * 2,
              height: radius * 2,
              borderRadius: radius,
            },
          ]}
        />

        <View pointerEvents="none" style={[styles.hub, { width: size, height: size }]}>
          <Text style={styles.hubNumber}>231</Text>
          <Text style={styles.hubWord}>врата</Text>
        </View>

        {ALPHABET.map((letter, i) => (
          <Pressable
            key={letter.transliteration}
            accessibilityRole="button"
            accessibilityLabel={`Буква ${letter.name}`}
            // react-native-web turns `dataSet` into data-* attributes, which is
            // how a walked circle stays visible to the verification harness
            // without inventing UI for it. React Native's types have no name for
            // the prop — hence the cast, the same pattern as the web-only style
            // props in lib/interaction.web.ts.
            {...({ dataSet: { walked: String(walked.has(letter.transliteration)) } } as object)}
            onPress={() => onPick(i)}
            style={[
              styles.wheelLetter,
              tappable,
              {
                width: hit,
                height: hit,
                left: points[i].x - hit / 2,
                top: points[i].y - hit / 2,
              },
            ]}
          >
            <Glyph
              transliteration={letter.transliteration}
              size={23}
              color={walked.has(letter.transliteration) ? colors.sparkSoft : colors.parchment}
            />
          </Pressable>
        ))}
      </View>

      <Text style={styles.wheelHint}>
        Коснитесь буквы — она пойдёт по кругу со всеми остальными.
      </Text>
    </ScrollView>
  );
}

function SetupView({
  anchor,
  walked,
  pace,
  onPace,
  onBack,
  onStart,
}: {
  anchor: number;
  walked: Set<string>;
  pace: Pace;
  onPace: (p: Pace) => void;
  onBack: () => void;
  onStart: () => void;
}) {
  const padding = useScreenPadding();
  const letter = ALPHABET[anchor];
  const alreadyWalked = walked.has(letter.transliteration);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.void }}
      contentContainerStyle={[styles.scroll, padding]}
    >
      <IconButton icon="arrow-back-outline" label="Назад" onPress={onBack} style={styles.back} />

      <View style={styles.anchorPreview}>
        <Glyph transliteration={letter.transliteration} size={104} color={colors.spark} />
      </View>

      <Text style={styles.circleName}>Круг {letter.name.toLowerCase()}</Text>
      <Text style={styles.circleSub}>
        {alreadyWalked ? 'Этот круг уже пройден · ' : ''}21 сочетание · около трёх минут
      </Text>

      <View style={styles.pillGroup}>
        <Text style={styles.pillGroupLabel}>Темп</Text>
        <View style={styles.pillRow}>
          <Pill label="По касанию" selected={pace === 0} onPress={() => onPace(0)} />
          <Pill label="4 сек" selected={pace === 4} onPress={() => onPace(4)} />
          <Pill label="6 сек" selected={pace === 6} onPress={() => onPace(6)} />
        </View>
      </View>

      <StartButton label="Начать круг" onPress={onStart} />
    </ScrollView>
  );
}

function RunView({
  anchor,
  pace,
  onEarlyExit,
  onComplete,
}: {
  anchor: number;
  pace: Pace;
  onEarlyExit: () => void;
  onComplete: () => void;
}) {
  const insets = useSafeAreaInsets();
  const order = useRef(partnersOf(anchor, ALPHABET.length)).current;
  const [step, setStep] = useState(0);
  const [hintShown, setHintShown] = useState(true);
  const stepRef = useRef(0);
  const paceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useWakeLock(true);

  const advance = useCallback(() => {
    const next = stepRef.current + 1;
    if (next >= order.length) {
      onComplete();
      return;
    }
    stepRef.current = next;
    setStep(next);
    setHintShown(false);
  }, [order.length, onComplete]);

  useEffect(() => {
    if (!pace) return;
    paceTimer.current = setTimeout(advance, pace * 1000);
    return () => {
      if (paceTimer.current) clearTimeout(paceTimer.current);
      paceTimer.current = null;
    };
  }, [pace, step, advance]);

  const anchorLetter = ALPHABET[anchor];
  const partner = ALPHABET[order[step]];

  const points = wheelPoints(ALPHABET.length, SMALL_WHEEL_SIZE, SMALL_WHEEL_RADIUS);
  const chord = chordLayout(points[anchor], points[order[step]]);
  const walkedPartners = new Set(order.slice(0, step));

  return (
    <View style={styles.runScreen}>
      <Pressable
        // With a pace set the timer owns the sequence, so the surface stops
        // being a control at all — no role, no label, nothing for a screen
        // reader to offer that would do nothing when taken up.
        accessibilityRole={pace ? undefined : 'button'}
        accessibilityLabel={pace ? undefined : 'Следующая пара'}
        onPress={pace ? undefined : advance}
        style={[styles.runField, tappable]}
      >
        <View testID="gate-pair">
          <HebrewGlyphs
            letters={[anchorLetter.transliteration, partner.transliteration]}
            variant="display"
          />
        </View>

        <View style={[styles.wheel, styles.smallWheel]}>
          <View
            style={[
              styles.wheelRing,
              {
                top: SMALL_WHEEL_SIZE / 2 - SMALL_WHEEL_RADIUS,
                left: SMALL_WHEEL_SIZE / 2 - SMALL_WHEEL_RADIUS,
                width: SMALL_WHEEL_RADIUS * 2,
                height: SMALL_WHEEL_RADIUS * 2,
                borderRadius: SMALL_WHEEL_RADIUS,
              },
            ]}
          />

          <View
            style={[
              styles.chord,
              {
                left: chord.left,
                top: chord.top,
                width: chord.width,
                transform: [{ rotate: `${chord.angle}rad` }],
              },
            ]}
          />

          {ALPHABET.map((letter, i) => {
            const isAnchor = i === anchor;
            const isCurrent = i === order[step];
            const isWalked = walkedPartners.has(i);
            return (
              <View
                key={letter.transliteration}
                style={[
                  styles.mapLetter,
                  { left: points[i].x - 14, top: points[i].y - 14 },
                  isCurrent && styles.mapLetterCurrent,
                  !isAnchor && !isCurrent && !isWalked && styles.mapLetterFaded,
                ]}
              >
                <Glyph
                  transliteration={letter.transliteration}
                  size={14}
                  color={
                    isCurrent
                      ? colors.void
                      : isAnchor
                        ? colors.spark
                        : isWalked
                          ? colors.sparkSoft
                          : colors.parchment
                  }
                />
              </View>
            );
          })}
        </View>
      </Pressable>

      {hintShown && (
        <Text pointerEvents="none" style={styles.runHint}>
          {pace
            ? `Пары сменяются сами, каждые ${pace} сек`
            : 'Произнесите пару — и коснитесь экрана'}
        </Text>
      )}

      <View style={[styles.chrome, { top: insets.top + 20, right: insets.right + 20 }]}>
        <IconButton icon="close-outline" label="Завершить" onPress={onEarlyExit} />
      </View>
    </View>
  );
}

function DoneView({ anchor, onBack }: { anchor: number; onBack: () => void }) {
  const padding = useScreenPadding();
  const letter = ALPHABET[anchor];

  return (
    <View style={[styles.doneScreen, padding]}>
      <View style={styles.doneContent}>
        <Glyph transliteration={letter.transliteration} size={80} color={colors.sparkSoft} />
        <Text style={styles.doneTitle}>Круг {letter.name.toLowerCase()} пройден</Text>
        <StartButton label="К колесу" onPress={onBack} />
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
  wheel: {
    alignSelf: 'center',
    position: 'relative',
  },
  smallWheel: {
    width: SMALL_WHEEL_SIZE,
    height: SMALL_WHEEL_SIZE,
    marginTop: 34,
  },
  wheelRing: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  hub: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hubNumber: {
    fontFamily: fonts.displayRuBold,
    fontSize: 28,
    lineHeight: 32,
    color: colors.sparkSoft,
  },
  hubWord: {
    fontFamily: fonts.body,
    ...type.eyebrow,
    textTransform: 'uppercase',
    color: colors.parchmentDim,
    marginTop: 6,
  },
  wheelLetter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  wheelHint: {
    fontFamily: fonts.body,
    ...type.small,
    color: colors.parchmentDim,
    textAlign: 'center',
    marginTop: 22,
  },
  anchorPreview: {
    alignSelf: 'center',
    marginBottom: 14,
  },
  circleName: {
    fontFamily: fonts.displayRuBold,
    ...type.screenTitle,
    color: colors.parchment,
    textAlign: 'center',
    marginBottom: 8,
  },
  circleSub: {
    fontFamily: fonts.body,
    ...type.body,
    color: colors.parchmentDim,
    textAlign: 'center',
    marginBottom: 28,
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
  chord: {
    position: 'absolute',
    height: 1,
    backgroundColor: colors.spark,
    opacity: 0.5,
  },
  mapLetter: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapLetterCurrent: {
    backgroundColor: colors.spark,
  },
  mapLetterFaded: {
    opacity: 0.3,
  },
  runHint: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 44,
    textAlign: 'center',
    fontFamily: fonts.body,
    ...type.small,
    color: colors.parchmentDim,
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
