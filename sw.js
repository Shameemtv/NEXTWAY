const CACHE_NAME = 'nextway-native-v3';
const STATIC_ASSETS = [
  './index.html',
  './manifest.json',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Offline-First / Cache-First strategy for static assets
self.addEventListener('fetch', (e) => {
  const url = e.request.url;
  
  // NEVER cache Realtime Firebase database WebSocket/HTTP requests
  if (e.request.method !== 'GET' || /firebaseio\.com|firebasedatabase\.app|googleapis\.com/.test(url)) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      // 1. Serve immediately from cache if available (Zero Lag)
      if (cachedResponse) {
        // Background refresh to keep app quietly updated for the next launch
        e.waitUntil(
          fetch(e.request).then((res) => {
            caches.open(CACHE_NAME).then((c) => c.put(e.request, res.clone()));
          }).catch(() => {}) 
        );
        return cachedResponse;
      }
      
      // 2. If not in cache (first load), fetch from network and save to cache
      return fetch(e.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(e.request, copy));
        return res;
      }).catch(() => {
        // App is offline and it wasn't in cache.
        console.error('Offline and resource missing:', url);
      });
    })
  );
});

// Advanced Periodic Background Data Sync
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'sync-nextway-data') {
    event.waitUntil(
      new Promise((resolve) => {
        // Trigger all active frontend clients to silently wake up their Firebase Connections
        self.clients.matchAll().then(clients => {
          clients.forEach(client => client.postMessage({ type: 'BACKGROUND_SYNC' }));
        });
        resolve();
      })
    );
  }
});
