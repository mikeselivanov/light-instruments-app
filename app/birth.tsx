import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { DateStepper } from '../components/DateStepper';
import { DayStrip } from '../components/DayStrip';
import { DISPLAY_DOT_RATIO, HebrewGlyphs } from '../components/HebrewGlyphs';
import { HomeButton } from '../components/HomeButton';
import { ScreenTransition } from '../components/ScreenTransition';
import { StepperInline } from '../components/Stepper';
import { TimeStepper } from '../components/TimeStepper';
import { ZodiacRing } from '../components/ZodiacRing';
import {
  DEGREES_PER_NAME,
  deviceOffsetMinutes,
  formatOffset,
  nameIdByTime,
  resolveBySun,
  roundToFive,
  sunLongitude,
  timeSlot,
  zodiacLabel,
  type BirthMethod,
} from '../lib/birth-name';
import { getNameById } from '../lib/data';
import { useFavorites } from '../lib/favorites';
import { tappable } from '../lib/interaction';
import { useScreenPadding } from '../lib/safe-area';
import {
  formatClock,
  MONTHS_GENITIVE,
  stepOffset,
  type CalendarDate,
  type ClockTime,
} from '../lib/stepper-math';
import { colors, fonts, type } from '../lib/theme';

/**
 * «Имя по рождению»: which of the 72 Names belongs to a birth, and how that was
 * worked out.
 *
 * One route with its phases as local state — input, result, "between two
 * names" — and no search params. That is deliberate and is the privacy promise
 * on the input screen: a birth date in the URL would sit in the PWA's address
 * bar and, on a reload, in the VPS's nginx access log. Here it lives in this
 * component's state and is gone when the screen closes. Only the resulting
 * name, if the user stars it, is ever stored (lib/favorites.tsx).
 */

const MINUTE = 60_000;

type Inputs = {
  method: BirthMethod;
  date: CalendarDate;
  timeKnown: boolean;
  time: ClockTime;
  /** null = the device's own zone, as it stood on that date. */
  manualOffset: number | null;
};

type Outcome =
  | {
      kind: 'sun';
      id: number;
      longitude: number;
      /** How the result was reached, for the explanation block. */
      basis: { type: 'time' } | { type: 'day' } | { type: 'pick'; side: 'before' | 'after'; at: ClockTime };
    }
  | { kind: 'time'; id: number }
  | {
      kind: 'boundary';
      before: number;
      after: number;
      crossing: ClockTime;
      crossingUtc: number;
    };

function todayDate(): CalendarDate {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
}

function dateLabel({ year, month, day }: CalendarDate): string {
  return `${day} ${MONTHS_GENITIVE[month - 1]} ${year}`;
}

export default function Birth() {
  const padding = useScreenPadding();
  const today = todayDate();
  const [inputs, setInputs] = useState<Inputs>({
    method: 'sun',
    date: { year: 1990, month: 1, day: 1 },
    timeKnown: false,
    time: { hour: 12, minute: 0 },
    manualOffset: null,
  });
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const offset =
    inputs.manualOffset ??
    deviceOffsetMinutes(inputs.date, inputs.timeKnown ? inputs.time : null);

  const update = (patch: Partial<Inputs>) => setInputs((prev) => ({ ...prev, ...patch }));

  const calculate = () => {
    if (inputs.method === 'time') {
      setOutcome({ kind: 'time', id: nameIdByTime(inputs.time) });
      return;
    }
    const r = resolveBySun(inputs.date, inputs.timeKnown ? inputs.time : null, offset);
    setOutcome(
      r.kind === 'single'
        ? {
            kind: 'sun',
            id: r.id,
            longitude: r.longitude,
            basis: { type: inputs.timeKnown ? 'time' : 'day' },
          }
        : r
    );
  };

  return (
    <ScreenTransition style={{ backgroundColor: colors.void }}>
      <ScrollView contentContainerStyle={[styles.scroll, padding]}>
        <View style={styles.topBar}>
          <HomeButton style={styles.homeButton} />
          {outcome && (
            <Pressable
              accessibilityRole="button"
              onPress={() => setOutcome(null)}
              hitSlop={10}
              style={({ pressed }) => [tappable, pressed && styles.pressed]}
            >
              <Text style={styles.link}>Изменить данные</Text>
            </Pressable>
          )}
        </View>

        {!outcome && (
          <InputPhase
            inputs={inputs}
            offset={offset}
            today={today}
            update={update}
            onSubmit={calculate}
          />
        )}

        {outcome?.kind === 'boundary' && (
          <BoundaryPhase
            outcome={outcome}
            date={inputs.date}
            offset={offset}
            onPick={(side) =>
              setOutcome({
                kind: 'sun',
                id: side === 'before' ? outcome.before : outcome.after,
                // Half an hour either side of the crossing puts the Sun
                // plainly inside the chosen part for the ring.
                longitude: sunLongitude(
                  outcome.crossingUtc + (side === 'before' ? -30 : 30) * MINUTE
                ),
                basis: { type: 'pick', side, at: roundToFive(outcome.crossing) },
              })
            }
            onAddTime={() => {
              update({ timeKnown: true, time: roundToFive(outcome.crossing) });
              setOutcome(null);
            }}
          />
        )}

        {(outcome?.kind === 'sun' || outcome?.kind === 'time') && (
          <ResultPhase outcome={outcome} inputs={inputs} offset={offset} />
        )}
      </ScrollView>
    </ScreenTransition>
  );
}

function InputPhase({
  inputs,
  offset,
  today,
  update,
  onSubmit,
}: {
  inputs: Inputs;
  offset: number;
  today: CalendarDate;
  update: (patch: Partial<Inputs>) => void;
  onSubmit: () => void;
}) {
  const [editingOffset, setEditingOffset] = useState(false);

  return (
    <View style={styles.phase}>
      <View>
        <Text style={styles.title}>Имя по рождению</Text>
        <Text style={styles.lead}>
          Традиция связывает каждое из 72 имён с моментом рождения. Выберите, как считать.
        </Text>
      </View>

      <View accessibilityRole="radiogroup" style={styles.methods}>
        <MethodCard
          selected={inputs.method === 'sun'}
          title="По дате"
          sub="Где было Солнце в день рождения"
          onPress={() => update({ method: 'sun' })}
        />
        <MethodCard
          selected={inputs.method === 'time'}
          title="По времени"
          sub="Час и минута рождения"
          onPress={() => update({ method: 'time' })}
        />
      </View>

      {inputs.method === 'sun' && (
        <>
          <Section label="Дата рождения">
            <DateStepper value={inputs.date} today={today} onChange={(date) => update({ date })} />
          </Section>

          <Section label="Время рождения" note="необязательно">
            <View style={styles.switchRow}>
              <Text style={styles.small}>
                Нужно, только если вы родились на стыке двух имён — мы подскажем.
              </Text>
              <Switch
                accessibilityLabel="Указать время"
                value={inputs.timeKnown}
                onValueChange={(timeKnown) => update({ timeKnown })}
                trackColor={{ false: colors.hairline, true: colors.sparkSoft }}
                thumbColor={inputs.timeKnown ? colors.spark : colors.parchmentDim}
              />
            </View>
            {inputs.timeKnown && (
              <TimeStepper
                variant="large"
                minuteStep={1}
                label="Время рождения"
                value={inputs.time}
                onChange={(time) => update({ time })}
              />
            )}
          </Section>

          <View style={styles.offsetBox}>
            <View style={styles.offsetRow}>
              <View style={styles.flex}>
                <Text style={styles.small}>Часовой пояс места рождения</Text>
                <Text style={styles.body}>
                  {formatOffset(offset)} ·{' '}
                  {inputs.manualOffset === null ? 'как на устройстве' : 'вручную'}
                </Text>
              </View>
              {!editingOffset && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setEditingOffset(true)}
                  hitSlop={10}
                  style={({ pressed }) => [tappable, pressed && styles.pressed]}
                >
                  <Text style={styles.link}>Изменить</Text>
                </Pressable>
              )}
            </View>
            {editingOffset && (
              <View style={styles.offsetEditor}>
                <StepperInline
                  label="Часовой пояс"
                  display={formatOffset(offset)}
                  width={112}
                  decreaseLabel="Западнее на 15 минут"
                  increaseLabel="Восточнее на 15 минут"
                  onStep={(d) => update({ manualOffset: stepOffset(offset, d) })}
                />
                {inputs.manualOffset !== null && (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => update({ manualOffset: null })}
                    hitSlop={10}
                    style={({ pressed }) => [tappable, pressed && styles.pressed]}
                  >
                    <Text style={styles.link}>Как на устройстве</Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>
        </>
      )}

      {inputs.method === 'time' && (
        <Section label="Время рождения">
          <TimeStepper
            variant="large"
            minuteStep={1}
            label="Время рождения"
            value={inputs.time}
            onChange={(time) => update({ time })}
          />
          <Text style={styles.small}>По часам в месте рождения. Дата для этого способа не нужна.</Text>
        </Section>
      )}

      <View style={styles.privacy}>
        <Ionicons name="lock-closed-outline" size={16} color={colors.thread} />
        <Text style={[styles.small, styles.flex]}>
          {inputs.method === 'sun' ? 'Дата и время' : 'Время'} не сохраняются и не покидают
          устройство. Запомнить можно только само имя.
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={onSubmit}
        style={({ pressed }) => [styles.primary, tappable, pressed && styles.pressed]}
      >
        <Text style={styles.primaryText}>Узнать имя</Text>
      </Pressable>
    </View>
  );
}

function ResultPhase({
  outcome,
  inputs,
  offset,
}: {
  outcome: Extract<Outcome, { kind: 'sun' | 'time' }>;
  inputs: Inputs;
  offset: number;
}) {
  const { myName, setMyName, toggleFavorite } = useFavorites();
  const name = getNameById(outcome.id);
  if (!name) return null;
  const method: BirthMethod = outcome.kind;
  const isMine = myName?.id === name.id;

  return (
    <View style={styles.phase}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>
          Ваше имя · {method === 'sun' ? 'по дате' : 'по времени'}
        </Text>
        <HebrewGlyphs letters={name.hebrewLetters} variant="display" />
        <Text style={styles.small}>№ {name.id}</Text>
        <Text style={styles.nameTitle}>{name.title}</Text>
        <Text style={styles.teaser} numberOfLines={3}>
          {name.summary}
        </Text>
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace(`/names/${name.id}`)}
            style={({ pressed }) => [styles.primarySmall, tappable, pressed && styles.pressed]}
          >
            <Text style={styles.primaryText}>Читать</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isMine ? 'В избранном' : 'В избранное'}
            onPress={() => (isMine ? toggleFavorite(name.id) : setMyName({ id: name.id, method }))}
            style={({ pressed }) => [styles.secondary, tappable, pressed && styles.pressed]}
          >
            <Ionicons name={isMine ? 'star' : 'star-outline'} size={15} color={colors.spark} />
            <Text style={styles.secondaryText}>{isMine ? 'В избранном' : 'В избранное'}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.sectionLabel}>
        <Text style={styles.eyebrow}>Как определено имя</Text>
        <View style={styles.rule} />
      </View>

      {outcome.kind === 'sun' ? (
        <SunExplanation outcome={outcome} inputs={inputs} offset={offset} />
      ) : (
        <TimeExplanation id={outcome.id} time={inputs.time} />
      )}

      <Text style={styles.small}>
        {outcome.kind === 'sun'
          ? 'Этот способ пришёл из ангелологии: Ленен, «La Science cabalistique», 1823. В книге Иегуды Берга имя выбирают по жизненной задаче, а не по дате рождения.'
          : 'Этот способ пришёл из ангелологии, а не из книги Иегуды Берга. Считается по часам в месте рождения.'}
      </Text>
    </View>
  );
}

function SunExplanation({
  outcome,
  inputs,
  offset,
}: {
  outcome: Extract<Outcome, { kind: 'sun' }>;
  inputs: Inputs;
  offset: number;
}) {
  const degrees = Math.floor(outcome.longitude);
  const from = (outcome.id - 1) * DEGREES_PER_NAME;
  const when =
    outcome.basis.type === 'time'
      ? `${dateLabel(inputs.date)}, ${formatClock(inputs.time)} (${formatOffset(offset)})`
      : `${dateLabel(inputs.date)}, время не указано (${formatOffset(offset)})`;
  const stood =
    outcome.basis.type === 'time'
      ? `Солнце стояло на ${degrees}° круга — это ${zodiacLabel(outcome.longitude)}.`
      : `В этот день Солнце стояло около ${degrees}° круга — это ${zodiacLabel(outcome.longitude)}.`;

  return (
    <>
      <ZodiacRing id={outcome.id} longitude={outcome.longitude} />
      <Text style={styles.read}>
        За год Солнце проходит полный круг зодиака. Традиция делит этот круг на 72 равные части
        по 5° — по одной на каждое имя, начиная с весеннего равноденствия.
      </Text>
      <View style={styles.plate}>
        <Text style={styles.small}>{when}</Text>
        {outcome.basis.type === 'pick' && (
          <Text style={styles.body}>
            Вы выбрали имя {outcome.basis.side === 'before' ? 'до' : 'после'} перехода около{' '}
            {formatClock(outcome.basis.at)}.
          </Text>
        )}
        <Text style={styles.body}>{stood}</Text>
        <Text style={styles.body}>
          {degrees}° попадает в {outcome.id}-ю часть ({from}°–{from + DEGREES_PER_NAME}°) →{' '}
          <Text style={styles.accent}>имя № {outcome.id}</Text>.
        </Text>
      </View>
    </>
  );
}

function TimeExplanation({ id, time }: { id: number; time: ClockTime }) {
  const slot = timeSlot(id);
  return (
    <>
      <DayStrip id={id} />
      <Text style={styles.read}>
        Сутки делятся на 72 отрезка по 20 минут, начиная с полуночи. Каждому отрезку по порядку
        соответствует одно имя: 00:00–00:19 — первое, 23:40–23:59 — последнее.
      </Text>
      <View style={styles.plate}>
        <Text style={styles.small}>Время рождения {formatClock(time)}</Text>
        <Text style={styles.body}>
          Это отрезок {formatClock(slot.from)}–{formatClock(slot.to)}.
        </Text>
        <Text style={styles.body}>
          Он {id}-й по счёту от полуночи → <Text style={styles.accent}>имя № {id}</Text>.
        </Text>
      </View>
    </>
  );
}

function BoundaryPhase({
  outcome,
  date,
  offset,
  onPick,
  onAddTime,
}: {
  outcome: Extract<Outcome, { kind: 'boundary' }>;
  date: CalendarDate;
  offset: number;
  onPick: (side: 'before' | 'after') => void;
  onAddTime: () => void;
}) {
  const at = formatClock(roundToFive(outcome.crossing));
  return (
    <View style={styles.phase}>
      <View>
        <Text style={[styles.eyebrow, styles.thread]}>На стыке двух имён</Text>
        <Text style={styles.title}>{dateLabel(date)}</Text>
        <Text style={styles.lead}>
          В этот день Солнце перешло из одной части круга в следующую — около {at} по{' '}
          {formatOffset(offset)}. Ваше имя зависит от того, родились вы до или после.
        </Text>
      </View>

      <Candidate id={outcome.before} label={`До ${at}`} onPress={() => onPick('before')} />
      <Candidate id={outcome.after} label={`После ${at}`} onPress={() => onPick('after')} />

      <Pressable
        accessibilityRole="button"
        onPress={onAddTime}
        style={({ pressed }) => [styles.primary, tappable, pressed && styles.pressed]}
      >
        <Text style={styles.primaryText}>Указать время рождения</Text>
      </Pressable>

      <View style={styles.plate}>
        <Text style={styles.bodyStrong}>Почему так</Text>
        <Text style={styles.small}>
          Круг зодиака делится на 72 части по 5°, Солнце проходит одну часть примерно за 5 дней.
          Граница между частями приходится на конкретный час, поэтому в пограничный день без
          времени рождения точно не скажешь, какое имя ваше.
        </Text>
        <Text style={styles.small}>
          Родились в другом часовом поясе? Поменяйте его на экране ввода — время перехода
          пересчитается.
        </Text>
      </View>
    </View>
  );
}

function Candidate({ id, label, onPress }: { id: number; label: string; onPress: () => void }) {
  const name = getNameById(id);
  if (!name) return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${name.title}`}
      onPress={onPress}
      style={({ pressed }) => [styles.candidate, tappable, pressed && styles.pressed]}
    >
      <HebrewGlyphs
        letters={name.hebrewLetters}
        variant="compact"
        size={26}
        dotRatio={DISPLAY_DOT_RATIO}
      />
      <View style={styles.flex}>
        <Text style={styles.candidateEyebrow}>
          {label} · № {id}
        </Text>
        <Text style={styles.candidateTitle}>{name.title}</Text>
      </View>
    </Pressable>
  );
}

function MethodCard({
  selected,
  title,
  sub,
  onPress,
}: {
  selected: boolean;
  title: string;
  sub: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.method,
        selected && styles.methodSelected,
        tappable,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected && <View style={styles.radioDot} />}
      </View>
      <View style={styles.flex}>
        <Text style={styles.methodTitle}>{title}</Text>
        <Text style={styles.small}>{sub}</Text>
      </View>
    </Pressable>
  );
}

function Section({ label, note, children }: { label: string; note?: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        {label}
        {note && <Text style={styles.sectionNote}> · {note}</Text>}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  flex: {
    flex: 1,
    minWidth: 0,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  homeButton: {
    marginBottom: 0,
  },
  link: {
    fontFamily: fonts.bodyBold,
    ...type.button,
    color: colors.spark,
  },
  phase: {
    gap: 18,
  },
  title: {
    fontFamily: fonts.displayRuBold,
    ...type.screenTitle,
    color: colors.parchment,
    marginBottom: 6,
  },
  lead: {
    fontFamily: fonts.body,
    ...type.body,
    color: colors.parchmentDim,
  },
  read: {
    fontFamily: fonts.body,
    ...type.read,
    color: colors.parchment,
  },
  body: {
    fontFamily: fonts.body,
    ...type.body,
    color: colors.parchment,
  },
  bodyStrong: {
    fontFamily: fonts.bodyBold,
    ...type.body,
    color: colors.parchment,
  },
  small: {
    fontFamily: fonts.body,
    ...type.small,
    color: colors.parchmentDim,
  },
  accent: {
    fontFamily: fonts.bodyBold,
    color: colors.spark,
  },
  thread: {
    color: colors.thread,
    marginBottom: 6,
  },
  methods: {
    gap: 8,
  },
  method: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.veil,
    borderWidth: 1,
    borderColor: colors.hairlineSoft,
  },
  methodSelected: {
    backgroundColor: colors.sparkWash,
    borderColor: colors.spark,
  },
  methodTitle: {
    fontFamily: fonts.displayRuBold,
    ...type.rowTitle,
    color: colors.parchment,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: colors.parchmentDim,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: colors.spark,
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.spark,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontFamily: fonts.body,
    ...type.eyebrow,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: colors.parchmentDim,
  },
  sectionNote: {
    textTransform: 'none',
    letterSpacing: 0,
    fontWeight: '400',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  offsetBox: {
    gap: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: colors.voidRaised,
    borderWidth: 1,
    borderColor: colors.hairlineSoft,
  },
  offsetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  offsetEditor: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  privacy: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  primary: {
    height: 50,
    borderRadius: 100,
    backgroundColor: colors.spark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primarySmall: {
    borderRadius: 100,
    backgroundColor: colors.spark,
    paddingVertical: 12,
    paddingHorizontal: 22,
  },
  primaryText: {
    fontFamily: fonts.bodyBold,
    ...type.button,
    color: colors.void,
  },
  secondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: colors.spark,
    paddingVertical: 11,
    paddingHorizontal: 18,
  },
  secondaryText: {
    fontFamily: fonts.bodyBold,
    ...type.button,
    color: colors.spark,
  },
  card: {
    alignItems: 'center',
    gap: 10,
    borderRadius: 18,
    paddingVertical: 24,
    // 14, as on the home card: the widest name block is 240.5pt at display size.
    paddingHorizontal: 14,
    backgroundColor: colors.veil,
    borderWidth: 1,
    borderColor: colors.hairlineSoft,
  },
  eyebrow: {
    fontFamily: fonts.body,
    ...type.eyebrow,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: colors.spark,
  },
  nameTitle: {
    fontFamily: fonts.displayRuBold,
    ...type.nameTitle,
    color: colors.parchment,
    textAlign: 'center',
  },
  teaser: {
    fontFamily: fonts.body,
    ...type.body,
    color: colors.parchmentDim,
    textAlign: 'center',
    maxWidth: 320,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 6,
  },
  sectionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rule: {
    flex: 1,
    height: 1,
    backgroundColor: colors.hairline,
  },
  plate: {
    gap: 6,
    padding: 14,
    borderRadius: 12,
    backgroundColor: colors.voidRaised,
    borderWidth: 1,
    borderColor: colors.hairlineSoft,
  },
  candidate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 14,
    backgroundColor: colors.veil,
    borderWidth: 1,
    borderColor: colors.hairlineSoft,
  },
  candidateEyebrow: {
    fontFamily: fonts.body,
    ...type.eyebrow,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: colors.parchmentDim,
  },
  candidateTitle: {
    fontFamily: fonts.displayRuBold,
    ...type.rowTitle,
    color: colors.parchment,
    marginTop: 2,
  },
});
