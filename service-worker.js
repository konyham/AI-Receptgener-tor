const CACHE_NAME = 'konyha-miki-cache-v1.58.0';
const urlsToCache = [
  '/',
  '/index.html',
  '/index.tsx',
  '/manifest.json?v=1.58.0',
  // CDNs from importmap
  'https://cdn.tailwindcss.com',
  'https://aistudiocdn.com/react@^19.2.0',
  'https://aistudiocdn.com/react-dom@^19.2.0/client.mjs',
  'https://aistudiocdn.com/@google/genai@^1.22.0',
  // Icons from manifest
  'https://storage.googleapis.com/genai-assets/konyha-miki-icons-v2/icon-192.png?v=1.58.0',
  'https://storage.googleapis.com/genai-assets/konyha-miki-icons-v2/icon-512.png?v=1.58.0',
  'https://storage.googleapis.com/genai-assets/konyha-miki-icons-v2/apple-touch-icon.png?v=1.58.0'
];

// Install event: open cache and add all core assets.
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching core assets');
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('Service Worker: Failed to cache core assets:', error);
      })
  );
  self.skipWaiting();
});

// Activate event: clean up old caches.
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch event: serve from cache first, then network.
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Don't cache Gemini API calls.
  if (url.hostname === 'generativelanguage.googleapis.com') {
    return;
  }

  // Use a "Cache falling back to Network" strategy for all other requests.
  event.respondWith(
    caches.match(request)
      .then(cachedResponse => {
        // If we have a cached response, return it.
        if (cachedResponse) {
          return cachedResponse;
        }

        // Otherwise, fetch from the network.
        return fetch(request).then(networkResponse => {
          // If the fetch is successful, clone the response and cache it.
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(request, responseToCache);
              });
          }
          return networkResponse;
        });
      }).catch(error => {
        console.log('Service Worker: Fetch failed; user is likely offline.', error);
      })
  );
});