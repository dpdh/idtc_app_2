const CACHE_VERSION = 'v125';
const SHELL_CACHE = `idtc-mobile-${CACHE_VERSION}`;
const RUNTIME_CACHE = `idtc-runtime-${CACHE_VERSION}`;
const CORE = [
  './',
  './index.html',
  './styles.css?v=81',
  './twini-config.js?v=1',
  './app.js?v=81',
  './image-zoom.js?v=2',
  './auth-security.js?v=1',
  './admin-cms.js?v=6',
  './shop.js?v=3',
  './ambient-bubbles.js?v=1',
  './sw.js',
  './manifest.webmanifest',
  './assets/img/favicon.png',
  './assets/img/emblem-white.png',
  './assets/img/dni/ITDC_icon.png',
  './assets/img/dni/twini-ai-icon.png',
  './assets/img/dni/twini-shop-icon.png',
  './data/anggota.json?v=22',
  './data/materi.json?v=22',
  './data/struktur.json?v=22',
  './data/produk.json?v=22',
  './data/merch.json?v=22',
  './data/twini-ai.json?v=3',
  './data/twini-ai-sensors.json?v=1',
  './data/twini-ai-bim.json?v=1',
];
const MAX_RUNTIME_ENTRIES = 60;

self.addEventListener('install', event => {
  event.waitUntil(caches.open(SHELL_CACHE).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys
        .filter(key => (key.startsWith('idtc-mobile-') || key.startsWith('idtc-runtime-'))
          && key !== SHELL_CACHE && key !== RUNTIME_CACHE)
        .map(key => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('./index.html')));
    return;
  }

  if (request.headers.has('range')) return;

  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;

    const response = await fetch(request);
    if (response.ok && response.type === 'basic') {
      event.waitUntil((async () => {
        const cache = await caches.open(RUNTIME_CACHE);
        await cache.put(request, response.clone());
        const keys = await cache.keys();
        if (keys.length > MAX_RUNTIME_ENTRIES) {
          await Promise.all(keys.slice(0, keys.length - MAX_RUNTIME_ENTRIES).map(key => cache.delete(key)));
        }
      })());
    }
    return response;
  })());
});