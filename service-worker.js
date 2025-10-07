// service-worker.js

const CACHE_NAME = 'konyha-miki-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
  // A build process során generált JS és CSS fájlokra mutató útvonalak
  // A jelenlegi setupban a JS dinamikusan van betöltve, így a gyökér ('/') cache-elése a legfontosabb.
  // A CDN-ről érkező scriptek is cache-elődnek a 'fetch' eseménykezelőben.
];

// 1. Telepítés: A Service Worker telepítésekor megnyitjuk a cache-t és hozzáadjuk az alapvető fájlokat.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
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
            // Ha a válasz érvénytelen, nem tesszük be a cache-be.
            if (!response || response.status !== 200 || response.type !== 'basic' && response.type !== 'cors') {
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