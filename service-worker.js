// service-worker.js (FIX) — niente redirect fantasma
// Funziona bene su GitHub Pages /lcb_tracker/ e evita che i link finiscano su pagine sbagliate.

const CACHE_NAME = 'lcb-tracker-cache-v2';
const ASSETS = [
  './',
  './index.html',
  './diario_rcu_chatgpt_v4_5.html',
  './dashboard_rcu_chatgpt_v4_5.html',
  './analisi_rcu_chatgpt_v4_5.html',
  './manifest.json',
  './icons/icon-512.png',
  './icons/icon-192.png',
  './icons/icon-128.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Non fallire se un asset manca: così il SW non resta “rotto”
    await Promise.allSettled(
      ASSETS.map(async (url) => {
        try {
          const res = await fetch(url, { cache: 'reload' });
          if (res.ok) await cache.put(url, res);
        } catch (_) {}
      })
    );
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k !== CACHE_NAME ? caches.delete(k) : null)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Solo stesso origin
  if (url.origin !== self.location.origin) return;

  const isHTML =
    req.mode === 'navigate' ||
    (req.headers.get('accept') || '').includes('text/html');

  // Navigazioni HTML: network-first (evita che la cache “mappi” pagine sbagliate)
  if (isHTML) {
    event.respondWith((async () => {
      try {
        return await fetch(req);
      } catch (_) {
        // Offline: prova prima la pagina richiesta, poi home
        return (await caches.match(req)) || (await caches.match('./index.html'));
      }
    })());
    return;
  }

  // Asset: cache-first
  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      const res = await fetch(req);
      const cache = await caches.open(CACHE_NAME);
      cache.put(req, res.clone());
      return res;
    } catch (_) {
      return cached;
    }
  })());
});
