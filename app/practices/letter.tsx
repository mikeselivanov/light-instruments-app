import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Glyph } from '../../components/Glyph';
import { HomeButton } from '../../components/HomeButton';
import { IconButton } from '../../components/IconButton';
import { Pill, StartButton } from '../../components/PracticeControls';
import { ScreenTransition } from '../../components/ScreenTransition';
import { tappable, selectableText } from '../../lib/interaction';
import { ALPHABET, ALPHABET_SOURCE, type Letter } from '../../lib/letters';
import { useScreenPadding } from '../../lib/safe-area';
import { colors, fonts, type } from '../../lib/theme';
import { useWakeLock } from '../../lib/wake-lock';

type Phase = 'pick' | 'setup' | 'run' | 'done';
type Background = 'evening' | 'day';

// Chrome (the "Завершить" control) fades out this long after a session
// starts, or after the last touch that brought it back.
const CHROME_VISIBLE_MS = 2000;
const CHROME_FADE_MS = 700;
const CHROME_REVEAL_MS = 200;
// The whole surface dims to black over this long once the session's minutes
// run out, then the screen moves to `done`.
const SESSION_FADE_MS = 8000;

// The grid's own maxWidth/alignSelf column (matches styles.scroll below).
const CONTENT_MAX_WIDTH = 480;
const GRID_COLUMNS = 4;
const GRID_GAP = 8;

export default function LetterPractice() {
  const [phase, setPhase] = useState<Phase>('pick');
  const [selected, setSelected] = useState<Letter | null>(null);
  const [minutes, setMinutes] = useState<3 | 5>(3);
  const [background, setBackground] = useState<Background>('evening');

  const pick = (letter: Letter) => {
    setSelected(letter);
    setPhase('setup');
  };

  return (
    <ScreenTransition style={{ backgroundColor: colors.void }}>
      {phase === 'pick' && <PickView onPick={pick} />}
      {phase === 'setup' && selected && (
        <SetupView
          letter={selected}
          minutes={minutes}
          background={background}
          onMinutes={setMinutes}
          onBackground={setBackground}
          onBack={() => setPhase('pick')}
          onStart={() => setPhase('run')}
        />
      )}
      {phase === 'run' && selected && (
        <RunView
          letter={selected}
          minutes={minutes}
          background={background}
          onEarlyExit={() => setPhase('pick')}
          onComplete={() => setPhase('done')}
        />
      )}
      {phase === 'done' && <DoneView onRestart={() => setPhase('pick')} />}
    </ScreenTransition>
  );
}

function PickView({ onPick }: { onPick: (letter: Letter) => void }) {
  const padding = useScreenPadding();
  const { width: windowWidth } = useWindowDimensions();
  // A plain percentage width can't give 4 equal columns with a fixed-px gap
  // at every screen size — gap doesn't shrink with it, so on any phone
  // narrower than ~400pt (every phone this app targets) a quarter-ish
  // percentage plus three 8pt gaps overflows the row and only 3 columns fit.
  // Measuring the real column and solving for the cell size sidesteps that.
  const contentWidth =
    Math.min(windowWidth, CONTENT_MAX_WIDTH) - padding.paddingLeft - padding.paddingRight;
  const cellSize = (contentWidth - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.void }}
      contentContainerStyle={[styles.scroll, padding]}
    >
      <HomeButton style={styles.back} />

      <Text style={styles.title}>Созерцание буквы</Text>

      <View style={styles.paragraphs}>
        <Text style={[styles.paragraph, selectableText]}>
          <Text style={styles.paragraphLead}>Что это.</Text> Самая старая и самая простая
          из практик с буквами: неподвижное всматривание в одну форму. Не читать, не
          называть звук, не искать значение — просто смотреть, как смотрят на пламя
          свечи.
        </Text>
        <Text style={[styles.paragraph, selectableText]}>
          <Text style={styles.paragraphLead}>Зачем.</Text> Буква — удобная опора для
          внимания: она конечна, неподвижна и ничего от вас не требует. Ум, которому не
          за что зацепиться, успокаивается сам; форма остаётся, а внутренняя болтовня
          постепенно стихает.
        </Text>
        <Text style={[styles.paragraph, selectableText]}>
          <Text style={styles.paragraphLead}>Как.</Text> Выберите букву — с какой
          захочется, порядка нет. Смотрите на неё расслабленно, не вглядываясь до рези;
          моргать можно. Мысли будут приходить — не боритесь с ними, просто возвращайте
          взгляд к букве. Начать стоит с трёх минут.
        </Text>
      </View>

      <View style={styles.grid}>
        {ALPHABET.map((letter) => (
          <Pressable
            key={letter.transliteration}
            accessibilityRole="button"
            accessibilityLabel={`Буква ${letter.name}`}
            onPress={() => onPick(letter)}
            style={({ pressed }) => [
              styles.cell,
              { width: cellSize },
              tappable,
              pressed && styles.cellPressed,
            ]}
          >
            <Glyph transliteration={letter.transliteration} size={30} color={colors.spark} />
            <Text style={styles.cellName}>{letter.name.toLowerCase()}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.source, selectableText]}>{ALPHABET_SOURCE}</Text>
    </ScrollView>
  );
}

function SetupView({
  letter,
  minutes,
  background,
  onMinutes,
  onBackground,
  onBack,
  onStart,
}: {
  letter: Letter;
  minutes: 3 | 5;
  background: Background;
  onMinutes: (m: 3 | 5) => void;
  onBackground: (b: Background) => void;
  onBack: () => void;
  onStart: () => void;
}) {
  const padding = useScreenPadding();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.void }}
      contentContainerStyle={[styles.scroll, padding]}
    >
      <IconButton icon="arrow-back-outline" label="Назад" onPress={onBack} style={styles.back} />

      <View style={[styles.preview, background === 'day' && styles.previewDay]}>
        <Glyph
          transliteration={letter.transliteration}
          size={112}
          color={background === 'day' ? colors.dayInk : colors.spark}
        />
      </View>

      <Text style={styles.letterName}>{letter.name}</Text>
      <Text style={[styles.letterNote, selectableText]}>{letter.note}</Text>

      <View style={styles.pillGroup}>
        <Text style={styles.pillGroupLabel}>Длительность</Text>
        <View style={styles.pillRow}>
          <Pill label="3 минуты" selected={minutes === 3} onPress={() => onMinutes(3)} />
          <Pill label="5 минут" selected={minutes === 5} onPress={() => onMinutes(5)} />
        </View>
      </View>

      <View style={styles.pillGroup}>
        <Text style={styles.pillGroupLabel}>Фон</Text>
        <View style={styles.pillRow}>
          <Pill
            label="Вечер"
            selected={background === 'evening'}
            onPress={() => onBackground('evening')}
          />
          <Pill label="День" selected={background === 'day'} onPress={() => onBackground('day')} />
        </View>
      </View>

      <StartButton label="Начать" onPress={onStart} />
    </ScrollView>
  );
}

function RunView({
  letter,
  minutes,
  background,
  onEarlyExit,
  onComplete,
}: {
  letter: Letter;
  minutes: 3 | 5;
  background: Background;
  onEarlyExit: () => void;
  onComplete: () => void;
}) {
  const insets = useSafeAreaInsets();
  const chromeOpacity = useRef(new Animated.Value(1)).current;
  const surfaceOpacity = useRef(new Animated.Value(1)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useWakeLock(true);

  const scheduleHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      Animated.timing(chromeOpacity, {
        toValue: 0,
        duration: CHROME_FADE_MS,
        useNativeDriver: true,
      }).start();
    }, CHROME_VISIBLE_MS);
  }, [chromeOpacity]);

  const revealChrome = useCallback(() => {
    Animated.timing(chromeOpacity, {
      toValue: 1,
      duration: CHROME_REVEAL_MS,
      useNativeDriver: true,
    }).start();
    scheduleHide();
  }, [chromeOpacity, scheduleHide]);

  useEffect(() => {
    chromeOpacity.setValue(1);
    surfaceOpacity.setValue(1);
    scheduleHide();

    const completeTimer = setTimeout(() => {
      Animated.timing(surfaceOpacity, {
        toValue: 0,
        duration: SESSION_FADE_MS,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) onComplete();
      });
    }, minutes * 60_000);

    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = null;
      clearTimeout(completeTimer);
      chromeOpacity.stopAnimation();
      surfaceOpacity.stopAnimation();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minutes]);

  return (
    <Animated.View
      style={[
        styles.runScreen,
        background === 'day' ? styles.runScreenDay : styles.runScreenEvening,
        { opacity: surfaceOpacity },
      ]}
    >
      <Pressable
        accessibilityLabel="Созерцание"
        onPress={revealChrome}
        style={styles.runPressable}
      >
        <Glyph
          transliteration={letter.transliteration}
          size={200}
          color={background === 'day' ? colors.dayInk : colors.spark}
        />
      </Pressable>

      <Animated.View
        testID="gaze-chrome"
        pointerEvents="box-none"
        style={[
          styles.chrome,
          { top: insets.top + 20, left: insets.left + 20 },
          { opacity: chromeOpacity },
        ]}
      >
        <IconButton icon="close-outline" label="Завершить" onPress={onEarlyExit} />
      </Animated.View>
    </Animated.View>
  );
}

function DoneView({ onRestart }: { onRestart: () => void }) {
  const padding = useScreenPadding();

  return (
    <View style={[styles.doneScreen, padding]}>
      <View style={styles.doneContent}>
        <Text style={styles.doneTitle}>Сессия завершена</Text>
        <StartButton label="К буквам" onPress={onRestart} />
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  cell: {
    // width is set inline per-cell (computed from the real column width —
    // see the comment above PickView's cellSize calculation).
    aspectRatio: 1,
    backgroundColor: colors.veil,
    borderWidth: 1,
    borderColor: colors.hairlineSoft,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellPressed: {
    backgroundColor: colors.veilRaised,
  },
  cellName: {
    fontFamily: fonts.body,
    ...type.tag,
    color: colors.parchmentDim,
    marginTop: 6,
  },
  source: {
    fontFamily: fonts.body,
    ...type.small,
    color: colors.parchmentDim,
    marginTop: 22,
  },
  preview: {
    alignSelf: 'center',
    width: 180,
    height: 180,
    borderRadius: 24,
    backgroundColor: colors.void,
    borderWidth: 1,
    borderColor: colors.hairlineSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  previewDay: {
    backgroundColor: colors.dayGround,
    borderColor: 'transparent',
  },
  letterName: {
    fontFamily: fonts.displayRuBold,
    ...type.screenTitle,
    color: colors.parchment,
    textAlign: 'center',
    marginBottom: 10,
  },
  letterNote: {
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
  },
  runScreen: {
    flex: 1,
  },
  runScreenEvening: {
    backgroundColor: colors.void,
  },
  runScreenDay: {
    backgroundColor: colors.dayGround,
  },
  runPressable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  },
  doneTitle: {
    fontFamily: fonts.displayRuBold,
    ...type.screenTitle,
    color: colors.parchment,
    marginBottom: 24,
    textAlign: 'center',
  },
});
