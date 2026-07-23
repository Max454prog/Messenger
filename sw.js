// Service Worker для «Искра» — кеширует оболочку приложения (app shell),
// чтобы интерфейс открывался мгновенно и частично работал офлайн.
// Firebase-запросы (Auth/Firestore) НЕ кешируются — они всегда идут в сеть,
// чтобы сообщения оставались актуальными в реальном времени.

const CACHE_NAME = 'iskra-shell-v1';
const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Кешируем только свои файлы (GET, тот же источник).
  // Всё, что идёт к Firebase/Google API — пропускаем мимо кеша.
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(req).then(cached => {
      const networkFetch = fetch(req)
        .then(res => {
          if (res && res.status === 200) {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, resClone));
          }
          return res;
        })
        .catch(() => cached);
      // Сначала отдаём из кеша для мгновенной загрузки, попутно обновляя кеш из сети.
      return cached || networkFetch;
    })
  );
});
