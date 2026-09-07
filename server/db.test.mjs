import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from './db.mjs';

const SUB = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
  p256dh: 'key',
  auth: 'auth',
  hour: 9,
  minute: 0,
  tz: 'Europe/Moscow',
};

function freshDb() {
  return openDb(':memory:');
}

test('upsert stores a subscription', () => {
  const db = freshDb();
  db.upsert(SUB, new Date('2026-09-08T06:30:00Z'));
  const rows = db.all();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].endpoint, SUB.endpoint);
  assert.equal(rows[0].hour, 9);
  assert.equal(rows[0].tz, 'Europe/Moscow');
});

test('upsert replaces rather than duplicates the same endpoint', () => {
  const db = freshDb();
  db.upsert(SUB, new Date('2026-09-08T06:30:00Z'));
  db.upsert({ ...SUB, hour: 21 }, new Date('2026-09-08T06:30:00Z'));
  const rows = db.all();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].hour, 21);
});

test('subscribing after the target time does not fire immediately', () => {
  // 06:30 UTC is 09:30 in Moscow, i.e. the 09:00 slot has already gone by.
  // Without seeding last_sent_day the next tick would treat this as overdue
  // and push a notification seconds after the user flipped the switch.
  const db = freshDb();
  db.upsert(SUB, new Date('2026-09-08T06:30:00Z'));
  assert.equal(db.all()[0].last_sent_day, '2026-09-08');
});

test('subscribing before the target time leaves the day unseeded', () => {
  // 05:00 UTC is 08:00 in Moscow — the 09:00 slot is still ahead, so today's
  // notification should still be delivered.
  const db = freshDb();
  db.upsert(SUB, new Date('2026-09-08T05:00:00Z'));
  assert.equal(db.all()[0].last_sent_day, null);
});

test('markSent records the day', () => {
  const db = freshDb();
  db.upsert(SUB, new Date('2026-09-08T05:00:00Z'));
  db.markSent(SUB.endpoint, '2026-09-08');
  assert.equal(db.all()[0].last_sent_day, '2026-09-08');
});

test('remove deletes the subscription', () => {
  const db = freshDb();
  db.upsert(SUB, new Date('2026-09-08T05:00:00Z'));
  db.remove(SUB.endpoint);
  assert.equal(db.all().length, 0);
});

test('remove is silent about an unknown endpoint', () => {
  const db = freshDb();
  assert.doesNotThrow(() => db.remove('https://fcm.googleapis.com/fcm/send/nope'));
});

test('count reports the number of subscriptions', () => {
  const db = freshDb();
  assert.equal(db.count(), 0);
  db.upsert(SUB, new Date('2026-09-08T05:00:00Z'));
  assert.equal(db.count(), 1);
});
