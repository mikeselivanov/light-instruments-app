import { test } from 'node:test';
import assert from 'node:assert/strict';
import { localParts, isDue, nameIndexForDate, isAllowedEndpoint } from './schedule.mjs';

// 21:00 UTC is midnight in Moscow, which makes it a good probe for both the
// day rollover and the hour formatting.
const MSK_MIDNIGHT = new Date('2026-09-07T21:00:00Z');

test('localParts reports the local day and minutes past midnight', () => {
  assert.deepEqual(localParts(MSK_MIDNIGHT, 'Europe/Moscow'), { day: '2026-09-08', minutes: 0 });
  assert.deepEqual(localParts(MSK_MIDNIGHT, 'Asia/Kamchatka'), { day: '2026-09-08', minutes: 540 });
});

test('localParts renders midnight as 00, not 24', () => {
  // Older ICU builds return "24" for midnight with hour12:false, which would
  // put minutes at 1440 and make isDue fire a day early.
  assert.equal(localParts(MSK_MIDNIGHT, 'Europe/Moscow').minutes, 0);
});

test('isDue fires once the local time has been reached', () => {
  const sub = { hour: 9, minute: 0, tz: 'Europe/Moscow', last_sent_day: null };
  // 06:00 UTC = 09:00 Moscow
  assert.equal(isDue(sub, new Date('2026-09-08T06:00:00Z')), true);
});

test('isDue stays false before the local time', () => {
  const sub = { hour: 9, minute: 0, tz: 'Europe/Moscow', last_sent_day: null };
  // 05:00 UTC = 08:00 Moscow
  assert.equal(isDue(sub, new Date('2026-09-08T05:00:00Z')), false);
});

test('isDue still fires after a missed tick', () => {
  // The condition is "the time has passed", not "the time is exactly now", so
  // a restart or a stalled tick delays the notification instead of losing it.
  const sub = { hour: 9, minute: 0, tz: 'Europe/Moscow', last_sent_day: null };
  assert.equal(isDue(sub, new Date('2026-09-08T12:00:00Z')), true);
});

test('isDue does not repeat within the same local day', () => {
  const sub = { hour: 9, minute: 0, tz: 'Europe/Moscow', last_sent_day: '2026-09-08' };
  assert.equal(isDue(sub, new Date('2026-09-08T12:00:00Z')), false);
});

test('isDue fires again the next local day', () => {
  const sub = { hour: 9, minute: 0, tz: 'Europe/Moscow', last_sent_day: '2026-09-08' };
  assert.equal(isDue(sub, new Date('2026-09-09T06:00:00Z')), true);
});

test('nameIndexForDate matches the formula in lib/data.ts', () => {
  const date = new Date('2026-09-07T12:00:00Z');
  const expected = Math.floor(date.getTime() / 86_400_000) % 72;
  assert.equal(nameIndexForDate(date, 72), expected);
});

test('nameIndexForDate is stable across a UTC day', () => {
  assert.equal(
    nameIndexForDate(new Date('2026-09-07T00:00:00Z'), 72),
    nameIndexForDate(new Date('2026-09-07T23:59:59Z'), 72)
  );
});

test('isAllowedEndpoint accepts the real push services', () => {
  assert.equal(isAllowedEndpoint('https://fcm.googleapis.com/fcm/send/abc'), true);
  assert.equal(isAllowedEndpoint('https://web.push.apple.com/QWERTY'), true);
  assert.equal(isAllowedEndpoint('https://updates.push.services.mozilla.com/wpush/v2/x'), true);
});

test('isAllowedEndpoint rejects anything else', () => {
  // Without this the endpoint field turns the service into an open relay that
  // will POST to any host an attacker names.
  assert.equal(isAllowedEndpoint('https://evil.example.com/collect'), false);
  assert.equal(isAllowedEndpoint('http://fcm.googleapis.com/fcm/send/abc'), false);
  assert.equal(isAllowedEndpoint('not a url'), false);
  assert.equal(isAllowedEndpoint('https://notfcm.googleapis.com.evil.com/x'), false);
});
