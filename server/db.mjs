// Subscription storage on node:sqlite — built into Node, so the VPS needs no
// native module builds. Requires Node >= 22.13, where it came out from behind
// the --experimental-sqlite flag.
import { DatabaseSync } from 'node:sqlite';
import { localParts } from './schedule.mjs';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS subscriptions (
  endpoint      TEXT PRIMARY KEY,
  p256dh        TEXT NOT NULL,
  auth          TEXT NOT NULL,
  hour          INTEGER NOT NULL,
  minute        INTEGER NOT NULL,
  tz            TEXT NOT NULL,
  last_sent_day TEXT,
  created_at    INTEGER NOT NULL
);
`;

export function openDb(path) {
  const db = new DatabaseSync(path);
  db.exec(SCHEMA);

  const insert = db.prepare(`
    INSERT INTO subscriptions (endpoint, p256dh, auth, hour, minute, tz, last_sent_day, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(endpoint) DO UPDATE SET
      p256dh = excluded.p256dh,
      auth = excluded.auth,
      hour = excluded.hour,
      minute = excluded.minute,
      tz = excluded.tz,
      last_sent_day = excluded.last_sent_day
  `);
  const del = db.prepare('DELETE FROM subscriptions WHERE endpoint = ?');
  const selectAll = db.prepare('SELECT * FROM subscriptions');
  const update = db.prepare('UPDATE subscriptions SET last_sent_day = ? WHERE endpoint = ?');
  const counter = db.prepare('SELECT COUNT(*) AS n FROM subscriptions');

  return {
    upsert(sub, now = new Date()) {
      const { day, minutes } = localParts(now, sub.tz);
      // If the chosen time has already gone by today, mark today as sent.
      // Otherwise the next tick sees an overdue slot and fires a notification
      // moments after the user turned the setting on.
      const alreadyPassed = minutes >= sub.hour * 60 + sub.minute;
      insert.run(
        sub.endpoint,
        sub.p256dh,
        sub.auth,
        sub.hour,
        sub.minute,
        sub.tz,
        alreadyPassed ? day : null,
        Date.now()
      );
    },
    remove(endpoint) {
      del.run(endpoint);
    },
    all() {
      return selectAll.all();
    },
    markSent(endpoint, day) {
      update.run(day, endpoint);
    },
    count() {
      return counter.get().n;
    },
    close() {
      db.close();
    },
  };
}
