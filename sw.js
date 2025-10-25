// Service Worker
const CACHE_NAME = 'attendance-app-v1';
const urlsToCache = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// インストール
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('キャッシュを開きました');
        return cache.addAll(urlsToCache);
      })
      .catch(err => {
        console.log('キャッシュ追加エラー:', err);
      })
  );
});

// フェッチ
self.addEventListener('fetch', event => {
  // Google Apps Script などの外部APIリクエストはService Workerをバイパス
  if (event.request.url.includes('script.google.com') ||
      event.request.url.includes('googleapis.com') ||
      !event.request.url.startsWith(self.location.origin)) {
    // 外部リクエストはそのまま通す（キャッシュしない）
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // キャッシュがあればそれを返し、なければネットワークから取得
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

// アクティベート（古いキャッシュを削除）
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('古いキャッシュを削除:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
