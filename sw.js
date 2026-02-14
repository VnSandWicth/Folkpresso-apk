// sw.js - Service Worker for Push Notifications
self.addEventListener('push', function (event) {
    let data = { title: "Folkpresso", body: "Ada info baru nih bang!" };
    try {
        if (event.data) {
            data = event.data.json();
        }
    } catch (e) {
        console.warn("Push data bukan JSON, pake default.");
    }

    const options = {
        body: data.body,
        icon: 'img/FPLOGO.png',
        badge: 'img/FPLOGO.png',
        vibrate: [200, 100, 200],
        data: { url: '/index.html' }
    };

    event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    event.waitUntil(clients.openWindow(event.notification.data.url || '/index.html'));
});
