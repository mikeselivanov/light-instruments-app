// Debug helper: push to one endpoint right now.
//
//   node send.mjs --force <endpoint>
//   node send.mjs --all
//
// Without this, testing the delivery path means waiting for the scheduled
// minute to come round.
import webpush from 'web-push';
import { openDb } from './db.mjs';
import { buildPayload } from './push.mjs';
import { loadNames } from './names.mjs';

const db = openDb(process.env.DB_PATH ?? '/var/lib/72names/subs.db');
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT ?? 'mailto:mike.selivanov@gmail.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const args = process.argv.slice(2);
const payload = buildPayload(new Date(), loadNames());
const targets = args.includes('--all')
  ? db.all()
  : db.all().filter((sub) => sub.endpoint === args[args.indexOf('--force') + 1]);

if (targets.length === 0) {
  console.error('No matching subscription. Endpoints on file:');
  for (const sub of db.all()) console.error(`  ${sub.endpoint}`);
  process.exit(1);
}

console.log(`payload: ${JSON.stringify(payload)}`);
for (const sub of targets) {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload)
    );
    console.log(`sent -> ${sub.endpoint}`);
  } catch (error) {
    console.error(`failed -> ${sub.endpoint}: ${error.statusCode ?? ''} ${error.message}`);
  }
}
