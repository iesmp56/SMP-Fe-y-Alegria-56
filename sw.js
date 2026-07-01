// Service Worker — AsistenciaQR Santa María de la Providencia Fe y Alegría 56
const CACHE_NAME = 'asistenciaqr-smpp-v1';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './logo.jpeg'
];

// Instalación: cachear los recursos base
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => {
        // Avisar a las páginas abiertas que hay una versión nueva esperando
        return self.clients.matchAll({ type: 'window' }).then((clients) => {
          clients.forEach((client) => client.postMessage({ type: 'SW_UPDATED' }));
        });
      })
  );
});

// Activación: limpiar cachés viejos y tomar control
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Mensaje desde la página para forzar activación inmediata del SW nuevo
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Estrategia: network-first con fallback a caché (para que funcione offline
// pero siempre intente traer la versión más reciente de Firestore/HTML)
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // No interceptar peticiones a Firebase/Firestore (deben ir siempre a la red)
  if (req.url.includes('firestore.googleapis.com') ||
      req.url.includes('firebase') ||
      req.url.includes('googleapis.com')) {
    return;
  }

  if (req.method !== 'GET') return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        return res;
      })
      .catch(() => caches.match(req))
  );
});
