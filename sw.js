// --- ISI FILE sw.js ---
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const SB_URL = "URL_SUPABASE_KAMU";
const SB_KEY = "KEY_ANON_KAMU";
const supabase = createClient(SB_URL, SB_KEY);

// sw.js - CUKUP PAKAI INI SAJA, HAPUS IMPORT SUPABASE-NYA
self.addEventListener('push', function(event) {
    const data = event.data ? event.data.json() : { title: "Folkpresso", body: "Ada pesanan baru, bb!" };
    
    const options = {
        body: data.body,
        icon: 'img/FPLOGO.png',
        badge: 'img/FPLOGO.png',
        vibrate: [200, 100, 200],
        data: { url: '/index.html' }
    };

    event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(clients.openWindow(event.notification.data.url));
});