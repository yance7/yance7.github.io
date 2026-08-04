/* ============================================
   Yance · 个人主页 — 轻量 Service Worker
   策略：
   · 预缓存核心资源（安装时）
   · 导航请求：网络优先，失败回退缓存（保证更新可见 + 离线可用）
   · 静态资源：stale-while-revalidate（秒开 + 后台更新）
   · 跨域 / 非 GET：直接放行
   ============================================ */
var CACHE = 'yance-v5';
var PRECACHE = [
  './',
  './index.html',
  './research.html',
  './works.html',
  './honors.html',
  './academics.html',
  './concerts.html',
  './404.html',
  './assets/style.css',
  './assets/app.js',
  './assets/favicon.svg',
  './assets/concert-deco.jpg',
  './site.webmanifest'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(PRECACHE).catch(function () {
        /* 单个资源失败不阻断安装 */
      });
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE; })
            .map(function (k) { return caches.delete(k); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;

  if (req.method !== 'GET') return;

  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  /* 导航请求：网络优先 */
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (cache) { cache.put(req, copy); });
        return res;
      }).catch(function () {
        return caches.match(req).then(function (cached) {
          return cached || caches.match('./index.html');
        });
      })
    );
    return;
  }

  /* 静态资源：stale-while-revalidate */
  event.respondWith(
    caches.match(req).then(function (cached) {
      var network = fetch(req).then(function (res) {
        if (res && res.status === 200) {
          var copy = res.clone();
          caches.open(CACHE).then(function (cache) { cache.put(req, copy); });
        }
        return res;
      }).catch(function () { return cached; });
      return cached || network;
    })
  );
});
