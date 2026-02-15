// sw.js - Service Worker for Folkpresso
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

const firebaseConfig = {
    apiKey: "AIzaSyBR_Er6zVysY-J-ht8PMpKRW0FJ69utN3w",
    authDomain: "folkpresso.firebaseapp.com",
    projectId: "folkpresso",
    messagingSenderId: "728120023418",
    appId: "1:728120023418:web:62c8b1271da8af8a67dec3"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Background Message Handler
messaging.onBackgroundMessage((payload) => {
    console.log('[sw.js] Received background message ', payload);
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: 'img/FPLOGO.png'
    };
    self.registration.showNotification(notificationTitle, notificationOptions);
});

const CACHE_NAME = 'folkpresso-v3';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    event.waitUntil(clients.openWindow('/index.html'));
});
