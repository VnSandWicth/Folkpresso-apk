// --- ISI FILE sw.js ---
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const SB_URL = "URL_SUPABASE_KAMU";
const SB_KEY = "KEY_ANON_KAMU";
const supabase = createClient(SB_URL, SB_KEY);

self.addEventListener('push', function(event) {
    // Ambil data yang dikirim dari Edge Function lu
    const data = event.data ? event.data.json() : { title: "Folkpresso", body: "Ada pesanan baru, bb!" };
    
    const options = {
        body: data.body,
        icon: 'img/FPLOGO.png', // Logo Folkpresso lu
        badge: 'img/FPLOGO.png',
        vibrate: [200, 100, 200], // Getar ala WA
        data: { url: '/index.html' }
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Pas notif diklik, buka aplikasi kopi lu
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data.url)
    );
});