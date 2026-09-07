// Pure scheduling logic. Everything here is deterministic given its inputs,
// which is why it carries the test coverage for the whole service.

const ALLOWED_PUSH_HOSTS = [
  'fcm.googleapis.com',
  'web.push.apple.com',
  'updates.push.services.mozilla.com',
];

export function localParts(date, tz) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    // h23 rather than hour12:false — older ICU builds render midnight as "24"
    // under the latter, which would push `minutes` to 1440.
    hourCycle: 'h23',
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value])
  );
  return {
    day: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

export function isDue(sub, now) {
  const { day, minutes } = localParts(now, sub.tz);
  if (sub.last_sent_day === day) return false;
  // "Has passed", not "is exactly now": a restart or a stalled tick then
  // delays the notification rather than dropping it for the day.
  return minutes >= sub.hour * 60 + sub.minute;
}

export function nameIndexForDate(date, total) {
  // Identical to nameOfTheDay() in lib/data.ts. Days are counted in UTC, so
  // client and server always agree on which name is today's.
  return Math.floor(date.getTime() / 86_400_000) % total;
}

export function isAllowedEndpoint(endpoint) {
  let url;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:') return false;
  return ALLOWED_PUSH_HOSTS.includes(url.hostname);
}
