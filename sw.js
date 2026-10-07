const CACHE = 'nami-learning-studio-2026-10-07-v13-video-background';
const SHELL = './index.html?v=13';
const CORE = [
  SHELL,
  './manifest.webmanifest',
  './icons/matrix-nami.svg?v=3',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './resources/starwars-font.css?v=2',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(CORE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key.startsWith('nami-learning-studio-') && key !== CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Audio and background video use normal HTTP caching. Avoid
  // retaining large videos or every visited WAV in service-worker storage.
  if (url.pathname.includes('/resources/sw-audio/') || url.pathname.includes('/resources/sw-video/')) return;

  // Let HTTP range requests go straight to the network. The Star Wars SFX archive
  // depends on byte ranges and should never be stored as a partial Cache API entry.
  if (event.request.headers.has('range')) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(SHELL, copy));
          return response;
        })
        .catch(() => caches.match(SHELL)),
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(
      (cached) =>
        cached ||
        fetch(event.request).then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          }
          return response;
        }),
    ),
  );
});
