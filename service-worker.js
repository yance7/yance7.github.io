/* ============================================
   Yance · 个人主页 — 轻量 Service Worker
   策略（v6 全面网络优先）：
   · 预缓存核心资源（安装时）
   · 所有同源 GET：网络优先，失败回退缓存
   · 跨域 / 非 GET：直接放行
   · 激活时清除旧缓存 + 通知客户端刷新
   ============================================ */
var CACHE = 'yance-v17';
var PRECACHE = [
  './',
  './index.html',
  './research.html',
  './works.html',
  './honors.html',
  './academics.html',
  './concerts.html',
  './404.html',
  './assets/vue/main.js',
  './assets/vue/main.css',
  './assets/vue/favicon.svg',
  './assets/vue/site.webmanifest'
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
    }).then(function () {
      /* 通知所有客户端刷新 */
      return self.clients.matchAll({ includeUncontrolled: true });
    }).then(function (clients) {
      clients.forEach(function (client) {
        client.postMessage({ type: 'SW_UPDATED' });
      });
    })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;

  if (req.method !== 'GET') return;

  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  /* 所有同源 GET 请求：网络优先 */
  event.respondWith(
    fetch(req).then(function (res) {
      if (res && res.status === 200) {
        var copy = res.clone();
        caches.open(CACHE).then(function (cache) { cache.put(req, copy); });
      }
      return res;
    }).catch(function () {
      return caches.match(req).then(function (cached) {
        if (cached) return cached;
        /* 导航请求回退到 index.html */
        if (req.mode === 'navigate') return caches.match('./index.html');
        return new Response('', { status: 504, statusText: 'Offline' });
      });
    })
  );
});
