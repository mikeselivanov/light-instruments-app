import { MakeTime, SearchSunLongitude, SunPosition } from 'astronomy-engine';
import type { CalendarDate, ClockTime } from './stepper-math';

/**
 * Which one of the 72 Names belongs to a birth.
 *
 * The mapping comes from angelology (Lenain, «La Science cabalistique», 1823),
 * not from Berg's book, which picks a name by the task at hand. Its order of the
 * 72 is the order of Exodus 14:19–21 — the same as assets/data/names.ru.json —
 * so the number computed here is a DivineName id as is.
 *
 * Pure: no React, no storage. A birth date passes through here and is never
 * kept anywhere — see the privacy section of the spec.
 */

export type BirthMethod = 'sun' | 'time';


const MINUTE = 60_000;
const DAY = 86_400_000;

/** Degrees of the Sun's circle each name holds: 360 / 72. */
export const DEGREES_PER_NAME = 5;
/** Minutes of the day each name holds: 1440 / 72. */
export const MINUTES_PER_NAME = 20;

/**
 * How close to a boundary, either side, a birth still counts as "between two
 * names" even with a time given. The calculation agrees with the USNO season
 * tables to about a minute, but a remembered birth time is rarely better than
 * five, and naming one of two names with confidence the input cannot support
 * would be worse than asking.
 */
export const BOUNDARY_WINDOW_MINUTES = 5;

/**
 * Apparent geocentric ecliptic longitude of the Sun, degrees in [0, 360), true
 * equinox of date — the quantity the seasons are defined by, so 0° is the
 * March equinox exactly.
 */
export function sunLongitude(utcMs: number): number {
  return SunPosition(MakeTime(new Date(utcMs))).elon;
}

export function nameIdBySun(longitude: number): number {
  const lon = ((longitude % 360) + 360) % 360;
  return Math.floor(lon / DEGREES_PER_NAME) + 1;
}

export function nameIdByTime({ hour, minute }: ClockTime): number {
  return Math.floor((hour * 60 + minute) / MINUTES_PER_NAME) + 1;
}

/** The 20-minute slot a time falls into, as clock times: 07:40 → 07:40–07:59. */
export function timeSlot(id: number): { from: ClockTime; to: ClockTime } {
  const start = (id - 1) * MINUTES_PER_NAME;
  const end = start + MINUTES_PER_NAME - 1;
  return {
    from: { hour: Math.floor(start / 60), minute: start % 60 },
    to: { hour: Math.floor(end / 60), minute: end % 60 },
  };
}

/**
 * The device's UTC offset, minutes east, as it stood at that local moment.
 *
 * `Date`'s local-time constructor applies the OS time zone database with its
 * history — the same rules that put the USSR on "decree time" or moved a
 * country's summer time — so this is the offset the birth actually happened
 * under, not today's. It needs no `Intl` time-zone support, which Hermes does
 * not guarantee on every Android build.
 */
export function deviceOffsetMinutes(date: CalendarDate, time: ClockTime | null): number {
  const t = time ?? { hour: 12, minute: 0 };
  // Rounded: before standard time, zones ran on local mean time, and some
  // engines report that offset with a fractional minute.
  return Math.round(
    -new Date(date.year, date.month - 1, date.day, t.hour, t.minute).getTimezoneOffset()
  );
}

export function localToUtc(date: CalendarDate, time: ClockTime, offsetMinutes: number): number {
  return (
    Date.UTC(date.year, date.month - 1, date.day, time.hour, time.minute) - offsetMinutes * MINUTE
  );
}

/** The local clock time of a UTC moment under a fixed offset. */
export function utcToLocalTime(utcMs: number, offsetMinutes: number): ClockTime {
  const d = new Date(utcMs + offsetMinutes * MINUTE);
  return { hour: d.getUTCHours(), minute: d.getUTCMinutes() };
}

/** When the Sun reaches the start of name `id`'s part of the circle, searching forward. */
function crossingUtc(id: number, fromUtc: number): number {
  const target = (id - 1) * DEGREES_PER_NAME;
  const found = SearchSunLongitude(target, MakeTime(new Date(fromUtc)), 2);
  if (!found) throw new Error(`Sun does not reach ${target}° within 2 days`);
  return found.date.getTime();
}

export type SunResult =
  | { kind: 'single'; id: number; longitude: number }
  | {
      kind: 'boundary';
      before: number;
      after: number;
      /** Moment the Sun passes from `before` to `after`, local to the offset used. */
      crossing: ClockTime;
      /** The same moment as a UTC timestamp, to place the Sun for either candidate. */
      crossingUtc: number;
    };

/**
 * Name by the Sun's position. Without a time the whole local day is checked:
 * the Sun covers a name's 5° in about five days, so one day in five holds a
 * boundary, and on that day the name depends on the hour.
 */
export function resolveBySun(
  date: CalendarDate,
  time: ClockTime | null,
  offsetMinutes: number
): SunResult {
  const [from, to] = time
    ? [
        localToUtc(date, time, offsetMinutes) - BOUNDARY_WINDOW_MINUTES * MINUTE,
        localToUtc(date, time, offsetMinutes) + BOUNDARY_WINDOW_MINUTES * MINUTE,
      ]
    : [
        localToUtc(date, { hour: 0, minute: 0 }, offsetMinutes),
        localToUtc(date, { hour: 0, minute: 0 }, offsetMinutes) + DAY - MINUTE,
      ];

  const before = nameIdBySun(sunLongitude(from));
  const after = nameIdBySun(sunLongitude(to));

  if (before === after) {
    const at = time ? localToUtc(date, time, offsetMinutes) : (from + to) / 2;
    const longitude = sunLongitude(at);
    return { kind: 'single', id: nameIdBySun(longitude), longitude };
  }

  const crossing = crossingUtc(after, from);
  return {
    kind: 'boundary',
    before,
    after,
    crossing: utcToLocalTime(crossing, offsetMinutes),
    crossingUtc: crossing,
  };
}

const SIGNS_GENITIVE = [
  'Овна', 'Тельца', 'Близнецов', 'Рака', 'Льва', 'Девы',
  'Весов', 'Скорпиона', 'Стрельца', 'Козерога', 'Водолея', 'Рыб',
];

/** 53.14 → «23° Тельца». Whole degrees, rounded down, as a position is read. */
export function zodiacLabel(longitude: number): string {
  const lon = ((longitude % 360) + 360) % 360;
  return `${Math.floor(lon % 30)}° ${SIGNS_GENITIVE[Math.floor(lon / 30)]}`;
}

/** 180 → «UTC+3», 330 → «UTC+5:30», -210 → «UTC−3:30», 0 → «UTC». */
export function formatOffset(offsetMinutes: number): string {
  if (offsetMinutes === 0) return 'UTC';
  const sign = offsetMinutes > 0 ? '+' : '−';
  const abs = Math.abs(offsetMinutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `UTC${sign}${h}${m ? ':' + String(m).padStart(2, '0') : ''}`;
}

/** 14:47 → «14:45». For the boundary screen, which says «около». */
export function roundToFive({ hour, minute }: ClockTime): ClockTime {
  const total = (Math.round((hour * 60 + minute) / 5) * 5) % 1440;
  return { hour: Math.floor(total / 60), minute: total % 60 };
}
