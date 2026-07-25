const CACHE_NAME = 'captain-vocab-v2';
const STATIC_ASSETS = [
  './',
  './index.html',
  './style.css?v=2',
  './app.js?v=2',
  './manifest.json',
  './icon.svg',
  './slovicka_de_400.json'
];

// Install Event - Skip waiting immediately to activate new SW
self.addEventListener('install', (event) => {
  console.log('[SW v2] Installing new Service Worker...');
  self.skipWaiting();
});

// Activate Event - Clear all old caches (including v1)
self.addEventListener('activate', (event) => {
  console.log('[SW v2] Activating and clearing old caches...');
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          console.log('[SW v2] Deleting cache:', key);
          return caches.delete(key);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Network First, fallback to Cache (Always bypass GitHub API)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Bypass Service Worker for GitHub API requests
  if (url.hostname.includes('github.com') || url.hostname.includes('githubusercontent.com')) {
    return;
  }

  // Network First Strategy for app assets to guarantee latest version
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && event.request.method === 'GET') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return response;
      })
      .catch(() => {
        console.log('[SW v2] Network failed, serving from cache:', event.request.url);
        return caches.match(event.request);
      })
  );
});
