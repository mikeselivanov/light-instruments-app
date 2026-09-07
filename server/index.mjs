// Daily push service. Plain node:http — the API is three endpoints, and a
// framework would be more dependency than code.
import { createServer } from 'node:http';
import webpush from 'web-push';
import { openDb } from './db.mjs';
import { runTick } from './push.mjs';
import { loadNames } from './names.mjs';
import { isAllowedEndpoint } from './schedule.mjs';

const PORT = Number(process.env.PORT ?? 8787);
const DB_PATH = process.env.DB_PATH ?? '/var/lib/72names/subs.db';
const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? 'mailto:mike.selivanov@gmail.com';
const MAX_SUBSCRIPTIONS = Number(process.env.MAX_SUBSCRIPTIONS ?? 10000);

if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
  console.error('VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY must be set.');
  process.exit(1);
}

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

const db = openDb(DB_PATH);
const names = loadNames();

async function send(sub, payload) {
  await webpush.sendNotification(
    { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
    JSON.stringify(payload)
  );
}

function readJson(req, limitBytes = 8 * 1024) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      // Bound the body: this endpoint is open to the internet. Pause rather
      // than destroy — destroying tears down the socket before the 413 can be
      // written, so the caller sees an empty response instead of a reason.
      if (body.length > limitBytes) {
        req.pause();
        reject(Object.assign(new Error('payload too large'), { statusCode: 413 }));
      }
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('invalid json'));
      }
    });
    req.on('error', reject);
  });
}

function json(res, status, body) {
  const text = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(text),
  });
  res.end(text);
}

function validate(body) {
  const { endpoint, keys, hour, minute, tz } = body ?? {};
  if (typeof endpoint !== 'string' || !isAllowedEndpoint(endpoint)) return 'endpoint';
  if (!keys || typeof keys.p256dh !== 'string' || typeof keys.auth !== 'string') return 'keys';
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return 'hour';
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) return 'minute';
  if (typeof tz !== 'string' || tz.length > 64) return 'tz';
  try {
    // Rejects a bogus zone here rather than letting every tick throw later.
    new Intl.DateTimeFormat('en-CA', { timeZone: tz });
  } catch {
    return 'tz';
  }
  return null;
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/api/health') {
      return json(res, 200, { ok: true, subscriptions: db.count() });
    }

    if (req.method === 'POST' && req.url === '/api/subscribe') {
      const body = await readJson(req);
      const invalid = validate(body);
      if (invalid) return json(res, 400, { error: `invalid ${invalid}` });
      if (db.count() >= MAX_SUBSCRIPTIONS) return json(res, 503, { error: 'at capacity' });

      db.upsert({
        endpoint: body.endpoint,
        p256dh: body.keys.p256dh,
        auth: body.keys.auth,
        hour: body.hour,
        minute: body.minute,
        tz: body.tz,
      });
      return json(res, 200, { ok: true });
    }

    if (req.method === 'POST' && req.url === '/api/unsubscribe') {
      const body = await readJson(req);
      if (typeof body?.endpoint !== 'string') return json(res, 400, { error: 'invalid endpoint' });
      db.remove(body.endpoint);
      return json(res, 200, { ok: true });
    }

    return json(res, 404, { error: 'not found' });
  } catch (error) {
    return json(res, error.statusCode ?? 400, { error: error.message });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`72names-push listening on 127.0.0.1:${PORT}, ${db.count()} subscriptions`);
});

// One in-process timer rather than a systemd timer: a single unit is less to
// get wrong, and the tick is cheap.
setInterval(async () => {
  try {
    const { sent, removed } = await runTick(db, send, names);
    if (sent || removed) console.log(`tick: sent ${sent}, removed ${removed}`);
  } catch (error) {
    console.error('tick failed:', error);
  }
}, 60_000);
