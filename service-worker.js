// service-worker.js
// v5

const CACHE_NAME = 'konyha-miki-cache-v5';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json?v=1.2',
  '/icon-192x192.png',
  '/icon-512x512.png',
  // Az alkalmazás saját indító szkriptje
  '/index.tsx',
  // Az alkalmazás futtatásához szükséges alapvető JS csomagok
  'https://aistudiocdn.com/react@^19.1.1',
  'https://aistudiocdn.com/react-dom@^19.1.1/client',
  'https://aistudiocdn.com/@google/genai@^1.16.0'
];

// 1. Telepítés: A Service Worker telepítésekor megnyitjuk a cache-t és hozzáadjuk az alapvető fájlokat.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache and caching essential assets');
        return cache.addAll(urlsToCache);
      })
  );
});

// 2. Aktiválás: Régi, felesleges cache-ek törlése.
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// 3. Fetch: Hálózati kérések elfogása.
// A "Cache-first, then network" stratégiát használjuk.
self.addEventListener('fetch', (event) => {
  // Nem cache-eljük a Gemini API kéréseket
  if (event.request.url.includes('generativelanguage.googleapis.com')) {
    return;
  }
    
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Ha a válasz a cache-ben van, azonnal visszatérünk vele.
        if (response) {
          return response;
        }

        // Ha nincs a cache-ben, akkor lekérjük a hálózatról.
        return fetch(event.request).then(
          (response) => {
            // A 'basic' és 'cors' típusú válaszokat cache-eljük.
            // A 'cors' szükséges a CDN-ről érkező erőforrásokhoz.
            if (!response || response.status !== 200 || (response.type !== 'basic' && response.type !== 'cors')) {
              return response;
            }

            // Készítünk egy másolatot a válaszról, mert a response stream csak egyszer olvasható.
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
  );
});