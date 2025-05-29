// Service Worker per funzionalità offline
const CACHE_NAME = 'foodtracker-v1';
const urlsToCache = [
  '/',
  '/mobile',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json'
];

// Installa il service worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Service Worker: Cache aperta');
        return cache.addAll(urlsToCache);
      })
  );
});

// Intercetta le richieste di rete
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Restituisce la risorsa dalla cache se disponibile
        if (response) {
          return response;
        }
        
        // Altrimenti prova a recuperarla dalla rete
        return fetch(event.request).catch(() => {
          // Se offline, restituisce la pagina mobile
          if (event.request.mode === 'navigate') {
            return caches.match('/mobile');
          }
        });
      })
  );
});

// Aggiorna il service worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Service Worker: Eliminazione cache vecchia', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});