// Service Worker для «Искра» — кеширует оболочку приложения (app shell),
// чтобы интерфейс открывался мгновенно и частично работал офлайн.
// Firebase-запросы (Auth/Firestore) НЕ кешируются — они всегда идут в сеть,
// чтобы сообщения оставались актуальными в реальном времени.

// Версия кеша — при каждом реальном обновлении файлов проекта браузер сам
// заметит, что sw.js изменился (побайтово), скачает новую версию и запустит
// цикл install -> waiting -> (по команде со страницы) activate.
// БАГФИКС: версия кеша поднята до v7, т.к. содержимое app.js снова изменилось
// (исправлена гонка состояний в отправке сообщения — превью/сортировка
// списка чатов больше не портится у чужого чата при быстром переключении) —
// иначе часть пользователей ещё долго получала бы из кеша старую версию.
const CACHE_NAME = 'iskra-shell-v7';
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
    // Новая версия встаёт в режим "waiting" и ждёт явной команды со страницы
    // (см. 'message' ниже) — на этом построено уведомление "Доступно обновление".
  );
});

// Страница (app.js) присылает эту команду, когда пользователь нажимает
// "Обновить" в баннере — только тогда новый SW реально активируется.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
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
    caches.match(req, { ignoreSearch: true }).then(cached => {
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
      // При промахе кеша идём в сеть и кешируем результат; если сети нет —
      // ошибка сети дойдёт до браузера штатно.
      return fetch(req).then(res => {
        if (res && res.status === 200) {
          // Клонировать нужно СРАЗУ и синхронно, до асинхронного caches.open(),
          // иначе к этому моменту тело res могло уже начать читаться (мы же
          // возвращаем res чуть ниже) — тогда clone() падает с ошибкой.
          const resClone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, resClone)).catch(() => {});
        }
        return res;
      });
    })
  );
});
