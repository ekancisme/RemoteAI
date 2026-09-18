// RemoteAI service worker — enables "Add to Home Screen" installability
// and offline caching of the app shell. API calls to GitHub are never cached.
const CACHE_NAME = 'remoteai-shell-v1';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './favicon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Never cache cross-origin API traffic (GitHub) — always network.
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // Same-origin GETs: cache-first with network refresh (stale-while-revalidate style)
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});