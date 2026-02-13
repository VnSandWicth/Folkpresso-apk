// --- ISI FILE sw.js ---
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const SB_URL = "URL_SUPABASE_KAMU";
const SB_KEY = "KEY_ANON_KAMU";
const supabase = createClient(SB_URL, SB_KEY);

// Listener untuk memantau database di background
supabase.channel('background-notifs')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'broadcast_notifications' }, payload => {
        const data = payload.new;
        if (data.title !== 'SYSTEM_STORE_STATUS') {
            self.registration.showNotification(data.title, {
                body: data.message,
                icon: 'img/FPLOGO.png', // Ganti dengan path logo kamu
                badge: 'img/FPLOGO.png',
                vibrate: [200, 100, 200],
                data: { url: '/index.html' } // Klik notif buka aplikasi
            });
        }
    })
    .subscribe();

// Saat notifikasi diklik
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(clients.openWindow(event.notification.data.url));
});