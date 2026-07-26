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
      if (cached) {
        // Есть в кеше — отдаём мгновенно, в фоне тихо обновляем кеш свежей версией.
        fetch(req).then(res => {
          if (res && res.status === 200) {
            const resClone = res.clone(); // клонируем СРАЗУ, до того как тело кто-то прочитает
            caches.open(CACHE_NAME).then(cache => cache.put(req, resClone)).catch(() => {});
          }
        }).catch(() => { /* офлайн — просто оставляем то, что уже в кеше */ });
        return cached;
      }
      // БАГФИКС: раньше при промахе кеша И отсутствии сети код делал
      // `.catch(() => cached)`, а `cached` в этой ветке всегда undefined —
      // respondWith() получал undefined вместо Response и падал с ошибкой
      // "Failed to convert value to 'Response'". Теперь просто идём в сеть
      // и кешируем результат; если сети нет — ошибка сети дойдёт до браузера
      // штатно (что и должно происходить для некешированного ресурса офлайн).
      return fetch(req).then(res => {
        if (res && res.status === 200) {
          // БАГФИКС: клонировать нужно СРАЗУ и синхронно. Раньше res.clone()
          // вызывался внутри .then() у caches.open() — а это асинхронно,
          // и к моменту выполнения браузер мог уже начать читать тело res
          // (мы же его возвращаем через `return res` чуть ниже) — тогда
          // clone() падал с "Response body is already used".
          const resClone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, resClone)).catch(() => {});
        }
        return res;
      });
    })
  );
});
