import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from './db.mjs';
import { buildPayload, runTick } from './push.mjs';

const NAMES = Array.from({ length: 72 }, (_, i) => ({ id: i + 1, title: `Имя${i + 1}` }));

const SUB = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
  p256dh: 'key',
  auth: 'auth',
  hour: 9,
  minute: 0,
  tz: 'Europe/Moscow',
};

test('buildPayload names the day and links to it', () => {
  const date = new Date('2026-09-08T06:00:00Z');
  const index = Math.floor(date.getTime() / 86_400_000) % 72;
  const payload = buildPayload(date, NAMES);
  assert.equal(payload.title, 'Имя дня');
  assert.equal(payload.body, NAMES[index].title);
  assert.equal(payload.url, `/names/${NAMES[index].id}`);
});

test('runTick sends to a due subscription', async () => {
  const db = openDb(':memory:');
  db.upsert(SUB, new Date('2026-09-08T05:00:00Z'));
  const calls = [];
  const result = await runTick(
    db,
    async (sub, payload) => calls.push({ sub, payload }),
    NAMES,
    new Date('2026-09-08T06:00:00Z')
  );
  assert.equal(result.sent, 1);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].sub.endpoint, SUB.endpoint);
});

test('runTick skips a subscription that is not due yet', async () => {
  const db = openDb(':memory:');
  db.upsert(SUB, new Date('2026-09-08T05:00:00Z'));
  const result = await runTick(db, async () => {}, NAMES, new Date('2026-09-08T05:30:00Z'));
  assert.equal(result.sent, 0);
});

test('runTick does not send twice in one local day', async () => {
  const db = openDb(':memory:');
  db.upsert(SUB, new Date('2026-09-08T05:00:00Z'));
  const now = new Date('2026-09-08T06:00:00Z');
  await runTick(db, async () => {}, NAMES, now);
  const second = await runTick(db, async () => {}, NAMES, now);
  assert.equal(second.sent, 0);
});

test('runTick drops a subscription the push service reports as gone', async () => {
  const db = openDb(':memory:');
  db.upsert(SUB, new Date('2026-09-08T05:00:00Z'));
  const gone = Object.assign(new Error('gone'), { statusCode: 410 });
  const result = await runTick(
    db,
    async () => {
      throw gone;
    },
    NAMES,
    new Date('2026-09-08T06:00:00Z')
  );
  assert.equal(result.removed, 1);
  assert.equal(db.count(), 0);
});

test('runTick keeps a subscription after a transient failure', async () => {
  // A 500 from the push service says nothing about the subscription itself,
  // so deleting on it would quietly unsubscribe people during an outage.
  const db = openDb(':memory:');
  db.upsert(SUB, new Date('2026-09-08T05:00:00Z'));
  const boom = Object.assign(new Error('boom'), { statusCode: 500 });
  const result = await runTick(
    db,
    async () => {
      throw boom;
    },
    NAMES,
    new Date('2026-09-08T06:00:00Z')
  );
  assert.equal(result.removed, 0);
  assert.equal(db.count(), 1);
});

test('runTick retries the same day after a transient failure', async () => {
  const db = openDb(':memory:');
  db.upsert(SUB, new Date('2026-09-08T05:00:00Z'));
  const boom = Object.assign(new Error('boom'), { statusCode: 500 });
  const now = new Date('2026-09-08T06:00:00Z');
  await runTick(
    db,
    async () => {
      throw boom;
    },
    NAMES,
    now
  );
  const retry = await runTick(db, async () => {}, NAMES, now);
  assert.equal(retry.sent, 1);
});

test('one failing subscription does not block the others', async () => {
  const db = openDb(':memory:');
  db.upsert(SUB, new Date('2026-09-08T05:00:00Z'));
  db.upsert({ ...SUB, endpoint: 'https://web.push.apple.com/xyz' }, new Date('2026-09-08T05:00:00Z'));
  const gone = Object.assign(new Error('gone'), { statusCode: 404 });
  let ok = 0;
  const result = await runTick(
    db,
    async (sub) => {
      if (sub.endpoint === SUB.endpoint) throw gone;
      ok += 1;
    },
    NAMES,
    new Date('2026-09-08T06:00:00Z')
  );
  assert.equal(ok, 1);
  assert.equal(result.sent, 1);
  assert.equal(result.removed, 1);
});
