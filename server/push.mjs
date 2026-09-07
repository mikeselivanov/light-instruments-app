import { isDue, nameIndexForDate, localParts } from './schedule.mjs';

// Matches the copy in lib/notifications.tsx so the wording is identical on
// every platform.
const TITLE = 'Имя дня';

export function buildPayload(date, names) {
  const name = names[nameIndexForDate(date, names.length)];
  return {
    title: TITLE,
    body: name.title,
    url: `/names/${name.id}`,
  };
}

// statusCode values the push services use to say the subscription itself is
// dead. Anything else (a 500, a timeout) says nothing about the subscription,
// so it must not cause a delete — that would unsubscribe people during an
// outage.
const GONE = new Set([404, 410]);

export async function runTick(db, send, names, now = new Date()) {
  const payload = buildPayload(now, names);
  let sent = 0;
  let removed = 0;

  for (const sub of db.all()) {
    if (!isDue(sub, now)) continue;

    try {
      await send(sub, payload);
      db.markSent(sub.endpoint, localParts(now, sub.tz).day);
      sent += 1;
    } catch (error) {
      if (GONE.has(error.statusCode)) {
        db.remove(sub.endpoint);
        removed += 1;
      } else {
        // Left unmarked on purpose: the next tick retries it today.
        console.error(`push failed for ${sub.endpoint}:`, error.message);
      }
    }
  }

  return { sent, removed };
}
