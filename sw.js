// Ganti versi ke v4 agar HP dipaksa update cache lama
const CACHE_NAME = 'folkpresso-app-v4';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json'
];

// 1. Install Service Worker & Cache File Awal
self.addEventListener('install', event => {
  self.skipWaiting(); // Paksa SW baru untuk segera aktif
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// 2. Hapus Cache Lama saat SW Baru Aktif
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Menghapus cache lama:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// 3. Strategi: Network First (Internet Dulu, Baru Cache)
// Ini penting agar perbaikan login kamu terbaca oleh HP
self.addEventListener('fetch', event => {
  // Jangan cache request ke Firebase/Supabase/API luar
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Kalau ada internet, ambil file terbaru lalu simpan ke cache
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        var responseToCache = response.clone();
        caches.open(CACHE_NAME)
          .then(cache => {
            cache.put(event.request, responseToCache);
          });
        return response;
      })
      .catch(() => {
        // Kalau OFFLINE, baru ambil dari cache
        return caches.match(event.request);
      })
  );
});