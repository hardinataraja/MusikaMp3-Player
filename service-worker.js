// === MUSIKA MP3 PLAYER - Service Worker v3 ===
// Fokus: cache hanya file lokal, aman untuk modul eksternal (unpkg, API, dsb)

const CACHE_NAME = 'musikamp3-v3';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json'
];

// Install: cache file utama PWA
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

// Activate: hapus cache versi lama
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys
        .filter(key => key !== CACHE_NAME)
        .map(key => caches.delete(key))
      )
    )
  );
});

// Fetch handler: hanya intercept file lokal
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // ⛔ Jangan intercept permintaan eksternal (seperti unpkg, API, CDN)
  if (url.origin !== self.location.origin) return;

  // Cache-first strategy untuk file lokal
  event.respondWith(
    caches.match(event.request).then(
      cached => cached || fetch(event.request)
    )
  );
});