/* eslint-env serviceworker */
// Hand-written service worker. workbox-cli injectManifest only substitutes
// the manifest placeholder below — it does not bundle this file — so this
// has to be plain worker-compatible JS with no imports.
//
// The placeholder is matched by a literal string search, so it must appear
// exactly once in this file. Do not name it in a comment.
//
// Push and notificationclick handlers are added by the web-push plan.

const MANIFEST = self.__WB_MANIFEST;
const CACHE = 'app-v1';
const PRECACHE_URLS = MANIFEST.map((entry) =>
  entry.revision ? `${entry.url}?__rev=${entry.revision}` : entry.url
);

// The cache is keyed by request URL, but the precache list carries revisions
// for unhashed files (index.html above all). Strip the marker when storing so
// a plain navigation request still hits the entry.
function cacheKey(url) {
  return url.split('?__rev=')[0];
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await Promise.all(
        PRECACHE_URLS.map(async (url) => {
          const response = await fetch(url, { cache: 'reload' });
          if (response.ok) await cache.put(cacheKey(url), response);
        })
      );
      // Take over immediately rather than waiting for every tab to close.
      // Expo's docs warn specifically about service workers that pin users to
      // a stale build; combined with no-cache on /sw.js in nginx this keeps
      // updates arriving on the next open.
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n !== CACHE).map((n) => caches.delete(n)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  // SPA: every navigation resolves to the single index.html.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cached = await caches.match('/index.html');
        if (cached) return cached;
        try {
          return await fetch(request);
        } catch {
          return new Response('Offline', { status: 503, statusText: 'Offline' });
        }
      })()
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      return fetch(request);
    })()
  );
});
