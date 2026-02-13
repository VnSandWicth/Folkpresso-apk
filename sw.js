// Ganti versi setiap kali Anda upload perubahan baru ke server!
// Contoh: v5 -> v6 -> v7
const CACHE_NAME = 'folkpresso-app-v6';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  // Tambahkan file gambar/css lain jika perlu, tapi hati-hati cache size
];

// 1. Install & Cache
self.addEventListener('install', event => {
  // Paksa SW baru untuk segera aktif (Skip Waiting)
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// 2. Activate & Clean Old Cache (PENTING: Clients Claim)
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
    }).then(() => {
      // PENTING: Beritahu browser untuk menggunakan SW baru SEKARANG JUGA
      return self.clients.claim();
    })
  );
});

// 3. Fetch Strategy: Network First (Internet Dulu, Kalau Gagal Baru Cache)
self.addEventListener('fetch', event => {
  // Abaikan request selain GET atau ke domain luar
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Jika ada internet, simpan versi terbaru ke cache
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
        // Jika offline, ambil dari cache
        return caches.match(event.request);
      })
  );
});