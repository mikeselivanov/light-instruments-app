/**
 * Arithmetic behind the steppers: what one press of ▲ or ▼ does to a time, a
 * date or a UTC offset, and how typed digits are read. Pure, so the rules can be
 * checked without a screen — and so a wrap or a clamp is decided in one place
 * rather than in three components.
 */

export type CalendarDate = { year: number; month: number; day: number }; // month 1–12
export type ClockTime = { hour: number; minute: number };

export const FIRST_YEAR = 1900;
export const MINUTES_PER_DAY = 1440;
/** UTC offsets in use run from −12:00 to +14:00, on quarter hours (Nepal is +5:45). */
export const OFFSET_MIN = -720;
export const OFFSET_MAX = 840;
export const OFFSET_STEP = 15;

export const MONTHS_GENITIVE = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

/** Wraps into [0, size): a clock's ▲ on 23 gives 0, its ▼ on 0 gives 23. */
export function wrap(value: number, size: number): number {
  return ((value % size) + size) % size;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function compare(a: CalendarDate, b: CalendarDate): number {
  return a.year - b.year || a.month - b.month || a.day - b.day;
}

/** Keeps a date real and within [1 January 1900, today]. */
export function clampDate(date: CalendarDate, today: CalendarDate): CalendarDate {
  const year = Math.min(Math.max(date.year, FIRST_YEAR), today.year);
  const day = Math.min(Math.max(date.day, 1), daysInMonth(year, date.month));
  const next = { year, month: date.month, day };
  return compare(next, today) > 0 ? today : next;
}

/**
 * One press on one column of the date stepper. Day and month wrap inside their
 * own column and never carry into the next — the columns are three separate
 * dials, and a day that rolled the month over would move a value the user was
 * not touching. Year does not wrap: 1900 and this year are hard ends.
 */
export function stepDate(
  date: CalendarDate,
  field: 'day' | 'month' | 'year',
  delta: 1 | -1,
  today: CalendarDate
): CalendarDate {
  if (field === 'day') {
    const size = daysInMonth(date.year, date.month);
    return clampDate({ ...date, day: wrap(date.day - 1 + delta, size) + 1 }, today);
  }
  if (field === 'month') {
    return clampDate({ ...date, month: wrap(date.month - 1 + delta, 12) + 1 }, today);
  }
  return clampDate({ ...date, year: date.year + delta }, today);
}

export function toMinutes({ hour, minute }: ClockTime): number {
  return hour * 60 + minute;
}

export function fromMinutes(total: number): ClockTime {
  const t = wrap(total, MINUTES_PER_DAY);
  return { hour: Math.floor(t / 60), minute: t % 60 };
}

export function stepOffset(offset: number, delta: 1 | -1): number {
  return Math.min(Math.max(offset + delta * OFFSET_STEP, OFFSET_MIN), OFFSET_MAX);
}

/** Typed digits for one column: «7» → 7, «07» → 7; out of range or not digits → null. */
export function parseTypedNumber(text: string, min: number, max: number): number | null {
  if (!/^\d{1,4}$/.test(text.trim())) return null;
  const n = Number(text.trim());
  return n >= min && n <= max ? n : null;
}

/**
 * A typed clock time: «9:05», «09.05», «0905», «905». Anything else — or 24:00,
 * or 9:60 — is null, and the caller keeps the value it had.
 */
export function parseTypedTime(text: string): ClockTime | null {
  const t = text.trim();
  const m = /^(\d{1,2})[:.\s](\d{2})$/.exec(t) ?? /^(\d{1,2})(\d{2})$/.exec(t);
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  return hour < 24 && minute < 60 ? { hour, minute } : null;
}

/** 7:05 → «07:05». */
export function formatClock({ hour, minute }: ClockTime): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}
