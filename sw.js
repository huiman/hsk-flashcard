const APP_VERSION = 'v9.0.0';
const CACHE_NAME = `hsk-flashcards-${APP_VERSION}`;
const CORE_ASSETS = [
  './index.html',
  './css/style.css',
  './css/stories.css',
  './js/data.js',
  './js/story-player.js',
  './js/stories.js',
  './js/app.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon.svg'
];

// 1. Install Service Worker & Pre-cache local assets resiliently
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('[Service Worker] Caching core app assets for', CACHE_NAME);
      for (const asset of CORE_ASSETS) {
        try {
          await cache.add(asset);
        } catch (err) {
          console.warn('[Service Worker] Could not cache:', asset, err);
        }
      }
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate & Clean up old caches immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch strategy: Network-First for JS/JSON/CSS/HTML so latest updates load immediately, Cache-First for others
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const isNetworkFirst = url.pathname.endsWith('.js') || 
                         url.pathname.endsWith('.json') || 
                         url.pathname.endsWith('.css') || 
                         url.pathname.endsWith('.html') || 
                         url.pathname.endsWith('/') ||
                         event.request.mode === 'navigate';

  if (isNetworkFirst) {
    // Network-First with Cache Fallback
    event.respondWith(
      fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
    );
  } else {
    // Cache-First for static assets like images, fonts
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            (event.request.url.startsWith('http') || event.request.url.startsWith('https'))
          ) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        });
      })
    );
  }
});

// 4. สลับไปใช้ Service Worker เวอร์ชันใหม่ทันทีเมื่อได้รับคำสั่ง SKIP_WAITING จากหน้าเว็บ
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data && event.data.type === 'GET_VERSION') {
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({ version: APP_VERSION });
    }
  }
});
