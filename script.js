function requestNotificationPermission() {
    if ('Notification' in window) {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                console.log('✅ Izin Pop-up Notifikasi Diberikan');
            }
        });
    }
}
// Panggil saat user pertama kali masuk
requestNotificationPermission();



// Tailwind Configuration
tailwind.config = {
    darkMode: 'class',
    theme: {
        extend: {
            fontFamily: { sans: ['Plus Jakarta Sans', 'sans-serif'] }
        }
    }
}

// === SUPABASE CONFIG ===
var SB_URL = "https://gfmvigkhflkqetbftttr.supabase.co";
var SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmbXZpZ2toZmxrcWV0YmZ0dHRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNTQ3NDAsImV4cCI6MjA4NTYzMDc0MH0.dGq7S_3y2nG8Nrl_ZpzLVuncoedp2rlIzb2u4cZ44Fg";

// Initialize Supabase Client
if (typeof supabase !== 'undefined') {
    window.supabaseClient = supabase.createClient(SB_URL, SB_KEY);
    console.log("✅ Supabase Client Initialized");
} else {
    console.error("❌ Supabase SDK not found!");
}

var defaultMarquee = `🔥 "Aren Latte-nya juara!" - Andi &nbsp;&nbsp; • &nbsp;&nbsp; 🎵 Now Playing: The 1975 &nbsp;&nbsp; • &nbsp;&nbsp; ☕ Folkpresso Open!`;
var marqueeTimer;
var marqueeResetTimer = null;
var activeMessages = []; // [{message, timestamp}, ...] - urut kronologis (duluan = tampil duluan)
var isDisplayingMarquee = false;
// Memori supaya pesan yang sama (berdasarkan ID) gak muncul dua kali
window.shownMessageIds = new Set();
// Memori supaya naik level gak teriak-teriak terus
window.lastNotifiedTier = "";

window.displayMarqueeMessage = function (message, timestamp, id) {
    var marqueeEl = document.querySelector('.animate-marquee') || document.getElementById('marquee-text');
    if (!marqueeEl) return;

    // JIKA ID SUDAH PERNAH TAMPIL, TOLAK!
    if (id && window.shownMessageIds.has(id)) return;
    if (id) window.shownMessageIds.add(id);

    // Cek duplikat konten yang lagi antre
    if (activeMessages.some(function (m) { return m.message === message; })) return;

    activeMessages.push({ message: message, timestamp: timestamp || Date.now() });
    renderMarqueeMessages();
};

window.insertAnnouncement = async function (message) {
    if (!window.supabaseClient) return;
    try {
        // Kita pake ID random biar bisa dilock di sisi client
        var tempId = "msg_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
        var { error } = await window.supabaseClient
            .from('announcements')
            .insert([{ message: message, timestamp: Date.now() }]);
        
        if (!error) {
            // Langsung masukin ke antrean lokal supaya cepet tampil
            window.displayMarqueeMessage(message, Date.now(), tempId);
        }
    } catch (e) { console.error(e); }
};

function updateBroadcastIndicator() {
    const text = document.getElementById('broadcast-text');
    if (text && activeMessages.length > 0) {
        text.innerText = `Live (${activeMessages.length})`;
        text.className = "text-[10px] text-blue-500 font-bold uppercase tracking-widest";
    } else if (text && activeMessages.length === 0) {
        text.innerText = "Live";
        text.className = "text-[10px] text-green-500 font-bold uppercase tracking-widest";
    }
}
function renderMarqueeMessages() {
    var textEl = document.getElementById('marquee-text');
    if (!textEl) textEl = document.querySelector('.animate-marquee');
    if (!textEl) return;
    
    var container = textEl.parentElement;
    if (container.getAttribute('data-status') === 'playing') return;

    if (activeMessages.length > 0) {
        // --- MODE PESAN USER (SEKALI LEWAT) ---
        container.setAttribute('data-status', 'playing');
        activeMessages.sort(function(a, b) { return (a.timestamp || 0) - (b.timestamp || 0); });
        var msg = activeMessages.shift(); 

        container.innerHTML = ''; // Hapus elemen lama
        var newEl = document.createElement('div');
        newEl.id = 'marquee-text';
        newEl.className = 'text-xs font-bold text-blue-200 tracking-wide'; 
        newEl.style.whiteSpace = 'nowrap';
        newEl.innerHTML = `<span class="bg-yellow-400 text-blue-900 px-2 rounded-md font-black">INFO:</span> ${msg.message}`;
        container.appendChild(newEl);

        // Animasi via Javascript (Iterations: 1 agar tidak looping)
        var anim = newEl.animate([
            { transform: 'translateX(100%)' },
            { transform: 'translateX(-100%)' }
        ], {
            duration: 15000,
            iterations: 1, 
            easing: 'linear'
        });

        anim.onfinish = function() {
            container.setAttribute('data-status', 'idle');
            renderMarqueeMessages(); // Cek antrean berikutnya
        };

    } else {
        // --- MODE TOKO (LOOPING INFINITE) ---
        if (textEl.innerHTML.indexOf("Folkpresso Open") !== -1 && textEl.classList.contains('animate-marquee')) return;
        container.innerHTML = '';
        var defEl = document.createElement('div');
        defEl.id = 'marquee-text';
        defEl.className = 'animate-marquee text-xs font-bold text-blue-200 tracking-wide';
        defEl.innerHTML = defaultMarquee;
        container.appendChild(defEl);
        container.setAttribute('data-status', 'idle');
    }
}

function initSupabase() {
    if (typeof window.supabase !== 'undefined' && !window.supabaseClient) {
        try {
            window.supabaseClient = window.supabase.createClient(SB_URL, SB_KEY);
            console.log("✅ Supabase client created");
            return true;
        } catch (e) {
            console.error("❌ Supabase init error:", e);
            return false;
        }
    }
    return !!window.supabaseClient;
}

// --- CEK STATUS TOKO ---
async function syncStoreStatus() {
    if (!window.supabaseClient) return;

    // 1. Ambil status terakhir dari Database
    const { data } = await window.supabaseClient
        .from('broadcast_notifications')
        .select('message')
        .eq('title', 'SYSTEM_STORE_STATUS')
        .order('id', { ascending: false })
        .limit(1);

    if (data && data.length > 0) {
        const status = data[0].message; // 'OPEN' atau 'CLOSED'

        // Update Variabel Global
        window.isStoreOpen = (status === 'OPEN');

        // Update UI Indikator (Banner Marquee / Badge)
        updateStoreVisuals();
    }
}

function updateStoreVisuals() {
    const statusBadge = document.getElementById('store-status-badge');

    if (!window.isStoreOpen) {
        // JIKA TUTUP
        if (statusBadge) {
            statusBadge.classList.remove('hidden');
            statusBadge.innerHTML = '<span class="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span> <span class="text-[9px] font-bold text-red-500 ml-1">TUTUP</span>';
        }
        showToast("🔒 Toko Sedang Tutup");
    } else {
        // JIKA BUKA
        if (statusBadge) statusBadge.classList.add('hidden');
    }
}

// Panggil fungsi ini saat inisialisasi
setTimeout(syncStoreStatus, 2000); // Tunggu sebentar setelah load

function initMarqueeChannel() {
    if (!window.supabaseClient) {
        console.log("⚠️ Supabase client not ready");
        initSupabase();
    }

    if (!window.marqueeChannel && window.supabaseClient) {
        try {
            console.log("📡 Subscribing to announcements table...");

            // Subscribe ke perubahan di tabel announcements
            window.marqueeChannel = window.supabaseClient
                .channel('announcements-channel')
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'announcements'
                    },
                    function (payload) {
                        console.log("📨 New announcement from database (GLOBAL):", payload);
                        if (payload.new && payload.new.message) {
                            const message = payload.new.message;
                            const timestamp = payload.new.timestamp || Date.now();
                            const id = payload.new.id || null;
                            window.displayMarqueeMessage(message, timestamp, id);
                        } else {
                            console.warn("⚠️ Invalid payload structure:", payload);
                        }
                    }
                )
                .subscribe(function (status, err) {
                    console.log("📡 Channel status:", status);

                    const indicator = document.getElementById('broadcast-indicator');
                    const text = document.getElementById('broadcast-text');

                    if (status === 'SUBSCRIBED') {
                        console.log("✅ Subscribed to announcements table!");
                        if (indicator) {
                            indicator.className = "w-2 h-2 bg-green-500 rounded-full animate-pulse";
                        }
                        if (text) {
                            text.innerText = "Live";
                            text.className = "text-[10px] text-green-500 font-bold uppercase tracking-widest";
                        }
                    } else if (status === 'CHANNEL_ERROR') {
                        console.error("❌ Channel error:", err);
                        if (indicator) {
                            indicator.className = "w-2 h-2 bg-red-500 rounded-full";
                        }
                        if (text) {
                            text.innerText = "Error";
                            text.className = "text-[10px] text-red-500 font-bold uppercase tracking-widest";
                        }
                    } else if (status === 'TIMED_OUT') {
                        console.error("❌ Channel timeout");
                        if (indicator) {
                            indicator.className = "w-2 h-2 bg-orange-500 rounded-full";
                        }
                        if (text) {
                            text.innerText = "Timeout";
                            text.className = "text-[10px] text-orange-500 font-bold uppercase tracking-widest";
                        }
                    } else if (status === 'CLOSED') {
                        console.warn("⚠️ Channel closed");
                        if (indicator) {
                            indicator.className = "w-2 h-2 bg-gray-500 rounded-full";
                        }
                        if (text) {
                            text.innerText = "Closed";
                            text.className = "text-[10px] text-gray-500 font-bold uppercase tracking-widest";
                        }
                    }
                });

            return true;
        } catch (e) {
            console.error("❌ Channel init error:", e);
            return false;
        }
    }
    return !!window.marqueeChannel;
}

function initNotificationChannel() {
    if (!window.supabaseClient) return;

    // Hapus channel lama jika ada (untuk mencegah duplikasi listener)
    if (window.storeChannel) window.supabaseClient.removeChannel(window.storeChannel);

    // Buat Channel Baru
    window.storeChannel = window.supabaseClient
        .channel('public:broadcast_notifications_v2')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'broadcast_notifications' }, payload => {
            const data = payload.new;
            if (!data) return;

            console.log("📡 SIGNAL DITERIMA:", data.title, data.message);

            // === KASUS 1: STATUS TOKO BERUBAH (REALTIME) ===
            if (data.title === 'SYSTEM_STORE_STATUS') {
                // 1. Update Variable Global
                window.isStoreOpen = (data.message === 'OPEN');

                // 2. Paksa Update Tampilan (Badge) Detik Itu Juga
                updateStoreVisuals();

                // 3. Tampilkan Toast / Pop-up Sesuai Status
                if (window.isStoreOpen) {
                    showToast("🔓 UPDATE: Toko Sudah BUKA! Silahkan pesan.");
                    // Getar pendek 2x tanda buka
                    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
                } else {
                    showToast("🔒 UPDATE: Toko TUTUP Sementara.");
                    // Getar panjang tanda tutup
                    if (navigator.vibrate) navigator.vibrate([500]);
                }
            }

            // === KASUS 2: NOTIFIKASI DARI OWNER (PROMO DLL) ===
            else {
                // Refresh list notifikasi karena ada pesan baru
                loadNotifications();

                // Munculkan Toast Pesan
                showToast("📩 Pesan Baru: " + data.title);
                if (navigator.vibrate) navigator.vibrate(200);
            }
        })
        .subscribe((status) => {
            console.log("Status Koneksi Realtime:", status);
        });
}

// Polling system untuk marquee (lebih reliable daripada Realtime)
window.lastAnnouncementTs = 0;
window.pollingInterval = null;

function parseRowTs(row) {
    var v = row.timestamp || row.created_at;
    if (!v) return Date.now();
    return typeof v === 'number' ? v : new Date(v).getTime();
}

async function initMarqueePolling() {
    if (!window.supabaseClient) return false;
    if (window.pollingInterval) return true;

    // --- SOLUSI: PASANG DINDING WAKTU ---
    // Kita set waktu sekarang sebagai titik awal. 
    // Pesan yang dibuat SEBELUM detik ini tidak akan pernah ditarik.
    window.lastAnnouncementTs = Date.now();

    // Kita skip pengambilan 5 pesan terakhir (riwayat) agar Marquee bersih saat start.
    console.log("📡 Marquee Started: Menunggu aktivitas real-time...");

    var indicator = document.getElementById('broadcast-indicator');
    var text = document.getElementById('broadcast-text');
    var broadcastStatus = document.getElementById('broadcast-status');
    
    if (indicator) indicator.className = "w-2 h-2 bg-green-500 rounded-full animate-pulse";
    if (text) { 
        text.innerText = "Live"; 
        text.className = "text-[10px] text-green-500 font-bold uppercase tracking-widest"; 
    }
    if (broadcastStatus) broadcastStatus.classList.remove('hidden');

    // Polling System: Hanya ambil data yang dibuat setelah aplikasi dibuka
    window.pollingInterval = setInterval(async function () {
        if (!window.supabaseClient) return;
        try {
            var last = window.lastAnnouncementTs || Date.now();
            var iso = new Date(last + 1).toISOString();
            
            var { data, error } = await window.supabaseClient
                .from('announcements')
                .select('*')
                .gt('created_at', iso) // Hanya ambil yang LEBIH BARU dari waktu buka/refresh
                .order('created_at', { ascending: true })
                .limit(20);

            if (error) return;
            if (data && data.length > 0) {
                data.forEach(function (row) {
                    var ts = parseRowTs(row);
                    // Tampilkan pesan baru
                    window.displayMarqueeMessage(row.message, ts, row.id);
                    if (ts > window.lastAnnouncementTs) window.lastAnnouncementTs = ts;
                });
            }
        } catch (e) { }
    }, 1500);

    return true;
}

var initInterval = setInterval(function () {
    if (initSupabase() && initMarqueePolling()) {
        initMarqueeChannel(); // Realtime: semua user dapat update global (order/quest/tier dari user lain)
        initNotificationChannel(); // Start listening for broadcasts
        loadProducts(); // Load all products dynamically
        setupRealtimeNotifications(); // Listen for new notifs (badge)
        checkUnreadNotifications(); // Check for existing unread notifications on load
        clearInterval(initInterval);
        console.log("✅ Supabase & Polling & Realtime Ready");
    }
}, 1000);

async function checkUnreadNotifications() {
    if (!window.supabaseClient) return;
    try {
        const { data } = await window.supabaseClient
            .from('broadcast_notifications')
            .select('created_at')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (data) {
            var latestNotifTime = new Date(data.created_at).getTime();
            // Ambil catatan kapan terakhir kali user buka menu notif
            var lastViewTime = parseInt(localStorage.getItem('folkpresso_last_notif_view')) || 0;
            var badge = document.getElementById('notif-badge');

            if (badge) {
                // Badge CUMA muncul kalo ada notif yang lebih baru dari kunjungan terakhir
                if (latestNotifTime > lastViewTime) {
                    badge.classList.remove('hidden');
                } else {
                    badge.classList.add('hidden');
                }
            }
        }
    } catch (e) { console.error("Unread check error:", e); }
}

const firebaseConfig = {
    apiKey: "AIzaSyBR_Er6zVysY-J-ht8PMpKRW0FJ69utN3w",
    authDomain: "folkpresso.firebaseapp.com",
    databaseURL: "https://folkpresso-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "folkpresso",
    storageBucket: "folkpresso.firebasestorage.app",
    messagingSenderId: "728120023418",
    appId: "1:728120023418:web:62c8b1271da8af8a67dec3",
    measurementId: "G-4VRF8TV2E1"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const app = firebase.app();
const auth = firebase.auth();
const db = firebase.firestore();

auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .then(() => {
        console.log("✅ Auth Persistence set to LOCAL");
    })
    .catch((error) => {
        console.error("❌ Auth Persistence Error:", error);
    });

var currentUser = "Guest";
var userPoints = 0;
var userCaffeine = 0;
var currentTierStatus = "";
var cart = [];
var isStoreOpen = true;
var communityGoal = 0;

auth.onAuthStateChanged((user) => {
    const loginScreen = document.getElementById('login-screen');
    const mainApp = document.getElementById('main-app');

    if (user) {
        loginScreen.classList.add('hidden');
        mainApp.classList.remove('hidden');
        startFolkSync(user.uid);
    } else {
        auth.getRedirectResult()
            .then((result) => {
                if (result.user) {
                    console.log("✅ Login Redirect Berhasil");
                    checkAndSaveUser(result.user);
                } else {
                    loginScreen.classList.remove('hidden');
                    loginScreen.style.opacity = '1';
                    mainApp.classList.add('hidden');
                }
            })
            .catch((error) => {
                console.error("Redirect Error:", error);
                loginScreen.classList.remove('hidden');
                loginScreen.style.opacity = '1';
                alert("Gagal Login (Redirect): " + error.message);
            });
    }
});

window.switchAuthTab = function (tab) {
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const btnLogin = document.getElementById('tab-btn-login');
    const btnRegister = document.getElementById('tab-btn-register');

    const loginErr = document.getElementById('login-error');
    const regErr = document.getElementById('reg-error');
    if (loginErr) { loginErr.classList.add('hidden'); loginErr.innerText = ''; }
    if (regErr) { regErr.classList.add('hidden'); regErr.innerText = ''; }

    if (tab === 'register') {
        tabLogin.classList.add('hidden');
        tabRegister.classList.remove('hidden');
        btnLogin.className = 'flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 text-slate-400';
        btnRegister.className = 'flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 bg-white text-emerald-600 shadow-sm';
    } else {
        tabLogin.classList.remove('hidden');
        tabRegister.classList.add('hidden');
        btnLogin.className = 'flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 bg-white text-blue-700 shadow-sm';
        btnRegister.className = 'flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 text-slate-400';
    }
};

window.loginWithGoogle = function () {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    auth.signInWithPopup(provider)
        .then((result) => {
            console.log("✅ Login Popup Berhasil:", result.user.email);
            checkAndSaveUser(result.user);
        })
        .catch((error) => {
            console.warn("⚠️ Popup diblokir browser, mencoba metode Redirect...", error);
            if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user' || error.message.includes('Cross-Origin')) {
                auth.signInWithRedirect(provider);
            } else {
                alert("Login Gagal: " + error.message);
            }
        });
};

function checkAndSaveUser(user) {
    const userRef = db.collection('users').doc(user.uid);
    userRef.get().then((doc) => {
        if (!doc.exists) {
            userRef.set({
                username: user.displayName || user.email.split('@')[0],
                email: user.email,
                photo: user.photoURL,
                points: 0,
                caffeine: 0,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    });
}

window.loginWithEmail = function () {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errEl = document.getElementById('login-error');
    const btnText = document.getElementById('login-text');

    if (errEl) { errEl.classList.add('hidden'); errEl.innerText = ''; }

    if (!email || !password) {
        if (errEl) { errEl.innerText = 'Email dan kata sandi harus diisi!'; errEl.classList.remove('hidden'); }
        return;
    }

    if (btnText) btnText.innerText = 'Memproses...';

    auth.signInWithEmailAndPassword(email, password)
        .then(function () {
            console.log('✅ Login email berhasil');
            if (btnText) btnText.innerText = 'Masuk';
        })
        .catch(function (error) {
            console.error('❌ Login email error:', error);
            if (btnText) btnText.innerText = 'Masuk';
            if (errEl) {
                if (error.code === 'auth/user-not-found') {
                    errEl.innerText = 'Akun tidak ditemukan. Silakan daftar terlebih dahulu.';
                } else if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                    errEl.innerText = 'Email atau kata sandi salah!';
                } else if (error.code === 'auth/invalid-email') {
                    errEl.innerText = 'Format email tidak valid!';
                } else if (error.code === 'auth/too-many-requests') {
                    errEl.innerText = 'Terlalu banyak percobaan. Coba lagi nanti.';
                } else {
                    errEl.innerText = 'Login gagal: ' + error.message;
                }
                errEl.classList.remove('hidden');
            }
        });
};

window.registerWithEmail = async function () {
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const phoneRaw = document.getElementById('reg-phone').value.trim();
    const errEl = document.getElementById('reg-error');
    const btnText = document.getElementById('reg-text');

    if (errEl) { errEl.classList.add('hidden'); errEl.innerText = ''; }

    if (!email || !password || !phoneRaw) {
        if (errEl) { errEl.innerText = 'Semua field harus diisi!'; errEl.classList.remove('hidden'); }
        return;
    }

    if (password.length < 6) {
        if (errEl) { errEl.innerText = 'Kata sandi minimal 6 karakter!'; errEl.classList.remove('hidden'); }
        return;
    }

    let phone = phoneRaw.replace(/[\s\-]/g, '');
    if (phone.startsWith('0')) phone = phone.substring(1);
    phone = '+62' + phone;

    if (!/^\+62[0-9]{9,13}$/.test(phone)) {
        if (errEl) { errEl.innerText = 'Format nomor HP tidak valid! Contoh: 812345678xx'; errEl.classList.remove('hidden'); }
        return;
    }

    if (btnText) btnText.innerText = 'Memproses...';

    try {
        const result = await auth.createUserWithEmailAndPassword(email, password);
        const user = result.user;

        const phoneCheck = await db.collection('users').where('phone', '==', phone).limit(1).get();

        if (!phoneCheck.empty) {
            await user.delete();
            if (errEl) {
                errEl.innerText = '❌ Nomor HP sudah terdaftar! Gunakan nomor lain atau masuk dengan akun yang ada.';
                errEl.classList.remove('hidden');
            }
            if (btnText) btnText.innerText = 'Daftar Sekarang';
            return;
        }

        await db.collection('users').doc(user.uid).set({
            username: email.split('@')[0],
            customName: email.split('@')[0],
            email: user.email,
            phone: phone,
            photo: '',
            points: 0,
            caffeine: 0,
            nameChangeCount: 0,
            lastQuestDate: '',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        console.log('✅ Registrasi berhasil:', user.email, phone);
        if (btnText) btnText.innerText = 'Daftar Sekarang';

    } catch (error) {
        console.error('❌ Registrasi error:', error);
        if (btnText) btnText.innerText = 'Daftar Sekarang';

        if (errEl) {
            if (error.code === 'auth/email-already-in-use') {
                errEl.innerText = 'Email sudah terdaftar! Silakan masuk atau gunakan email lain.';
            } else if (error.code === 'auth/invalid-email') {
                errEl.innerText = 'Format email tidak valid!';
            } else if (error.code === 'auth/weak-password') {
                errEl.innerText = 'Kata sandi terlalu lemah! Gunakan minimal 6 karakter.';
            } else {
                errEl.innerText = 'Pendaftaran gagal: ' + error.message;
            }
            errEl.classList.remove('hidden');
        }
    }
};

function startFolkSync(uid) {
    db.collection("users").doc(uid).onSnapshot((doc) => {
        if (doc.exists) {
            const data = doc.data();
            currentUser = data.customName || data.username || "Friend";
            userPoints = data.points || 0;
            userCaffeine = data.caffeine || 0;

            const nameDisplay = document.getElementById('home-username');
            const pointsDisplay = document.getElementById('home-points');
            const profilePhoto = document.getElementById('profile-photo-nav');

            if (nameDisplay) nameDisplay.innerText = currentUser;
            if (pointsDisplay) pointsDisplay.innerText = userPoints.toLocaleString();
            if (profilePhoto && data.photo) profilePhoto.src = data.photo;

            var addressInput = document.getElementById('input-address');
            var detailInput = document.getElementById('input-address-detail');
            var cartAddr = document.getElementById('cart-address-display');

            if (data.address) {
                window.userAddress = data.address;
                if (addressInput) addressInput.value = data.address;
                if (cartAddr) cartAddr.innerText = data.address + (data.addressDetail ? ` (${data.addressDetail})` : '');
            }

            if (detailInput) {
                detailInput.value = data.addressDetail || '';
            }

            if (data.phone) {
                window.userPhone = data.phone;
                var bioPhone = document.getElementById('bio-phone');
                if (bioPhone) bioPhone.value = data.phone.replace('+62', '');
            }

            var bioName = document.getElementById('bio-name');
            var bioEmail = document.getElementById('bio-email');
            if (bioName) bioName.value = data.customName || data.username || '';
            if (bioEmail) bioEmail.value = data.email || '';

            var profilePhotoDisplay = document.getElementById('profile-photo-display');
            var profileDisplayName = document.getElementById('profile-display-name');
            if (profilePhotoDisplay && data.photo) profilePhotoDisplay.src = data.photo;
            if (profileDisplayName) profileDisplayName.innerText = currentUser;

            if (data.caffeineShownMilestones) {
                caffeineShownMilestones = data.caffeineShownMilestones;
            }

            checkQuestStatus(data.lastQuestDate);
            updateMemberUI();
            checkPointsReset(data);
            loadUserVouchers();
        }
    });
}

function checkQuestStatus(lastDate) {
    const today = new Date().toDateString();
    const btn = document.getElementById('quest-card');
    const status = document.getElementById('quest-status');
    if (!btn) return;
    if (lastDate === today) {
        btn.classList.add('opacity-50');
        if (status) status.innerText = "Terklaim ✅";
    } else {
        btn.classList.remove('opacity-50');
        if (status) status.innerText = "Klaim +50 Poin";
    }
}

// --- GANTI FUNCTION updateMemberUI DENGAN INI ---

function updateMemberUI() {
    var card = document.getElementById('member-card');
    var tierName = document.getElementById('tier-name');
    var bar = document.getElementById('level-bar');
    var dispPoints = document.getElementById('display-points');
    var cafMg = document.getElementById('caffeine-mg');
    var cafBar = document.getElementById('caffeine-bar');

    if (!card || !tierName || !bar || !dispPoints) return;

    dispPoints.innerText = userPoints.toLocaleString();

    var oldTier = currentTierStatus;
    var newTier = "";
    var cardBase = 'rounded-[2rem] p-6 shadow-2xl relative overflow-hidden h-52 flex flex-col justify-between transition-all duration-500 mb-6';

    if (userPoints >= 801) {
        card.className = 'member-card-platinum ' + cardBase;
        tierName.innerText = 'FOLK PLATINUM 💎';
        bar.style.width = Math.min((userPoints / 1000) * 100, 100) + '%';
        newTier = 'FOLK PLATINUM 💎';
    } else if (userPoints >= 501) {
        card.className = 'member-card-gold ' + cardBase;
        tierName.innerText = 'FOLK GOLD 👑';
        bar.style.width = (userPoints / 800) * 100 + '%';
        newTier = 'FOLK GOLD 👑';
    } else if (userPoints >= 301) {
        card.className = 'member-card-silver ' + cardBase;
        tierName.innerText = 'FOLK SILVER ⚔️';
        bar.style.width = (userPoints / 500) * 100 + '%';
        newTier = 'FOLK SILVER ⚔️';
    } else {
        card.className = 'member-card-bronze ' + cardBase;
        tierName.innerText = 'FOLK BRONZE 🥉';
        bar.style.width = (userPoints / 300) * 100 + '%';
        newTier = 'BRONZE MEMBER 🥉';
    }

    // --- BAGIAN PERBAIKAN LOOPING ---
    // Cek: Apakah status berubah? DAN apakah kita belum pernah umumin ini?
    if (oldTier !== '' && oldTier !== newTier) {
            grantTierVoucher(newTier);       
    }
    // --------------------------------

    currentTierStatus = newTier;

    if (cafMg && cafBar) {
        cafMg.innerHTML = userCaffeine + '<span class="text-xs text-slate-400">mg</span>';
        cafBar.style.height = Math.min((userCaffeine / 1000) * 100, 100) + "%";

        if (userCaffeine >= 800) {
            cafBar.className = 'absolute bottom-0 w-full bg-red-500 transition-all duration-1000';
            cafMg.className = 'text-2xl font-black text-red-500';
        } else if (userCaffeine >= 500) {
            cafBar.className = 'absolute bottom-0 w-full bg-orange-500 transition-all duration-1000';
            cafMg.className = 'text-2xl font-black text-orange-500';
        } else if (userCaffeine >= 300) {
            cafBar.className = 'absolute bottom-0 w-full bg-yellow-400 transition-all duration-1000';
            cafMg.className = 'text-2xl font-black text-yellow-500';
        } else {
            cafBar.className = 'absolute bottom-0 w-full bg-green-400 transition-all duration-1000';
            cafMg.className = 'text-2xl font-black text-green-500';
        }
        checkCaffeineMilestone(userCaffeine);
    }
}

var caffeineShownMilestones = {};
var caffeineMilestones = [
    { mg: 100, icon: '☕', title: 'Starter Pack!', msg: 'Ini baru pemanasan, lanjutin ngopinya, tapi jangan berlebihan ya! ☕' },
    { mg: 300, icon: '🔥', title: 'Kopi Warrior!', msg: 'Wah, kamu emang pengkopi handal! Semangat terus!' },
    { mg: 500, icon: '⚡', title: 'Caffeine Addict!', msg: 'Hati-hati, jantungmu sudah deg-degan nih! 💓' },
    { mg: 800, icon: '🚀', title: 'Overdrive Mode!', msg: 'Kamu resmi jadi mesin kopi berjalan! Istirahat juga ya~ 😴' },
    { mg: 1000, icon: '👑', title: 'KOPI LEGEND!', msg: 'Folkpresso harus kasih kamu piala! 🏆 Kamu raja kopi sejati!' }
];

function checkCaffeineMilestone(mg) {
    for (var i = caffeineMilestones.length - 1; i >= 0; i--) {
        if (mg >= caffeineMilestones[i].mg && !caffeineShownMilestones[caffeineMilestones[i].mg]) {
            caffeineShownMilestones[caffeineMilestones[i].mg] = true;
            var user = auth.currentUser;
            if (user) {
                db.collection('users').doc(user.uid).update({
                    caffeineShownMilestones: caffeineShownMilestones
                });
            }
            (function (milestone) {
                setTimeout(function () { showCaffeineMilestonePopup(milestone); }, 800);
            })(caffeineMilestones[i]);
            break;
        }
    }
}

function showCaffeineMilestonePopup(milestone) {
    var existing = document.getElementById('caffeine-milestone-popup');
    if (existing) existing.remove();

    var popup = document.createElement('div');
    popup.id = 'caffeine-milestone-popup';
    popup.className = 'fixed inset-0 z-[999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-6';
    popup.style.animation = 'fadeIn 0.3s ease';
    popup.innerHTML = `
        <div class="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl max-w-sm w-full text-center transform" style="animation: popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)">
            <div class="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center text-5xl" 
                 style="background: linear-gradient(135deg, #fef3c7, #fde68a); border: 3px solid #f59e0b;">
                ${milestone.icon}
            </div>
            <h3 class="text-xl font-black text-slate-800 dark:text-white mb-2">${milestone.title}</h3>
            <p class="text-sm text-slate-500 dark:text-slate-400 mb-1 font-bold">${milestone.mg}mg Caffeine Reached!</p>
            <p class="text-sm text-slate-600 dark:text-slate-300 mb-6 font-medium">${milestone.msg}</p>
            <button onclick="document.getElementById('caffeine-milestone-popup').remove()" 
                    class="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-8 py-3 rounded-2xl font-bold text-sm active:scale-95 transition-transform shadow-lg shadow-orange-500/30">
                Mantap! 🎉
            </button>
        </div>
    `;
    document.body.appendChild(popup);
    setTimeout(function () {
        var el = document.getElementById('caffeine-milestone-popup');
        if (el) el.remove();
    }, 6000);
}

window.activeVoucher = null;
window.userVouchers = [];

var tierVoucherMap = {
    'SILVER MEMBER ⚔️': { discount: 3000, label: 'Silver Upgrade - Diskon Rp 3.000' },
    'GOLD MEMBER 👑': { discount: 5000, label: 'Gold Upgrade - Diskon Rp 5.000' },
    'PLATINUM MEMBER 💎': { discount: 8000, label: 'Platinum Upgrade - Diskon Rp 8.000' }
};

// --- GANTI FUNCTION grantTierVoucher ---

function grantTierVoucher(tierName) {
    var user = auth.currentUser;
    var tierVoucherMap = {
        'FOLK SILVER ⚔️': { discount: 3000, label: 'Silver Upgrade - Rp 3.000' },
        'FOLK GOLD 👑': { discount: 5000, label: 'Gold Upgrade - Rp 5.000' },
        'FOLK PLATINUM 💎': { discount: 8000, label: 'Platinum Upgrade - Rp 8.000' }
    };

    if (!user || !tierVoucherMap[tierName]) return;

    db.collection('users').doc(user.uid).get().then((doc) => {
        if (doc.exists) {
            var data = doc.data();
            var grantedTiers = data.grantedTiers || [];

            // --- SATPAM DATABASE (ANTI-LOOP) ---
            // Cek apakah tier ini sudah pernah di-broadcast sebelumnya
            if (grantedTiers.includes(tierName)) {
                return; // Berhenti di sini, jangan kirim broadcast lagi
            }

            // Jika lolos, berarti ini pertama kalinya naik tier ini
            if (window.supabaseClient) {
                // Broadcast sekali saja
                window.insertAnnouncement("👑 " + currentUser + " naik peringkat menjadi " + tierName + "!");
            }

            var v = tierVoucherMap[tierName];
            var voucher = {
                tier: tierName,
                discount: v.discount,
                label: v.label,
                used: false,
                createdAt: new Date().toISOString()
            };

            db.collection('users').doc(user.uid).collection('vouchers').add(voucher).then(function () {
                db.collection('users').doc(user.uid).update({
                    grantedTiers: firebase.firestore.FieldValue.arrayUnion(tierName)
                });
                showToast('🎫 Selamat! Kamu dapat voucher ' + v.label + '!');
            });
        }
    });
}

function showTierUpPopup(tierName, voucher) {
    var existing = document.getElementById('tier-up-popup');
    if (existing) existing.remove();

    var tierColors = {
        'SILVER MEMBER ⚔️': { bg: 'from-slate-400 to-slate-600', icon: '⚔️' },
        'GOLD MEMBER 👑': { bg: 'from-yellow-400 to-amber-600', icon: '👑' },
        'PLATINUM MEMBER 💎': { bg: 'from-purple-500 to-indigo-700', icon: '💎' }
    };
    var tc = tierColors[tierName] || { bg: 'from-blue-500 to-blue-700', icon: '🏆' };

    var popup = document.createElement('div');
    popup.id = 'tier-up-popup';
    popup.className = 'fixed inset-0 z-[999] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-6';
    popup.style.animation = 'fadeIn 0.3s ease';
    popup.innerHTML = '<div class="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl max-w-sm w-full text-center" style="animation: popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)">' +
        '<div class="w-24 h-24 mx-auto mb-4 rounded-full flex items-center justify-center text-5xl bg-gradient-to-br ' + tc.bg + ' shadow-lg">' + tc.icon + '</div>' +
        '<h3 class="text-xl font-black text-slate-800 dark:text-white mb-1">Naik Tier! 🎉</h3>' +
        '<p class="text-lg font-black bg-gradient-to-r ' + tc.bg + ' bg-clip-text text-transparent mb-3">' + tierName + '</p>' +
        '<div class="bg-amber-50 dark:bg-slate-800 p-4 rounded-2xl border-2 border-dashed border-amber-300 mb-5">' +
        '<p class="text-xs font-bold text-amber-600 mb-1">🎫 Voucher Hadiah</p>' +
        '<p class="text-lg font-black text-amber-700">Diskon Rp ' + voucher.discount.toLocaleString() + '</p>' +
        '<p class="text-[10px] text-amber-500">' + voucher.label + ' (1x pakai)</p></div>' +
        '<button onclick="document.getElementById(\'tier-up-popup\').remove()" class="bg-gradient-to-r ' + tc.bg + ' text-white px-8 py-3 rounded-2xl font-bold text-sm active:scale-95 transition-transform shadow-lg">Terima Kasih! 🙏</button></div>';

    document.body.appendChild(popup);
    setTimeout(function () {
        var el = document.getElementById('tier-up-popup');
        if (el) el.remove();
    }, 10000);
}

function loadUserVouchers() {
    var user = auth.currentUser;
    if (!user) return;
    window.userVouchers = [];
    var firestorePromise = db.collection('users').doc(user.uid).collection('vouchers')
        .where('used', '==', false)
        .get().then(function (snap) {
            snap.forEach(function (doc) {
                window.userVouchers.push({ id: doc.id, source: 'tierup', ...doc.data() });
            });
        }).catch(function (e) { console.error('Firestore voucher load error:', e); });

    var supabasePromise = Promise.resolve();
    if (window.supabaseClient) {
        supabasePromise = window.supabaseClient.from('vouchers')
            .select('*')
            .then(function (res) {
                if (res.data) {
                    res.data.forEach(function (v) {
                        var isTarget = v.target === 'all' || v.target === user.uid;
                        var alreadyUsed = v.used_by && v.used_by.indexOf(user.uid) !== -1;
                        var usedCount = (v.used_by && v.used_by.length) || 0;
                        var isFull = v.max_users && usedCount >= v.max_users;

                        if (isTarget && !alreadyUsed && !isFull) {
                            window.userVouchers.push({
                                id: 'sb_' + v.id,
                                supabaseId: v.id,
                                source: 'admin',
                                label: v.label,
                                discount: v.discount,
                                expiryDate: v.expiry_date
                            });
                        }
                    });
                }
            }).catch(function (e) { console.error('Supabase voucher load error:', e); });
    }
    Promise.all([firestorePromise, supabasePromise]).then(function () {
        updateVoucherBtnBadge();
    });
}

function updateVoucherBtnBadge() {
    var btnText = document.getElementById('voucher-btn-text');
    if (!btnText) return;
    var count = window.userVouchers.length;
    if (count > 0) {
        btnText.innerText = 'Pakai Voucher (' + count + ' tersedia)';
    } else {
        btnText.innerText = 'Tidak ada voucher';
    }
}

window.toggleVoucherPanel = function () {
    var panel = document.getElementById('voucher-panel');
    if (!panel) return;
    panel.classList.toggle('hidden');
    if (!panel.classList.contains('hidden')) {
        loadVoucherPanel();
    }
};

function loadVoucherPanel() {
    var panel = document.getElementById('voucher-panel');
    if (!panel) return;
    loadUserVouchers();
    setTimeout(function () {
        if (window.userVouchers.length === 0) {
            panel.innerHTML = '<p class="text-xs text-slate-400 text-center py-3 italic">Vouchermu masih kosong nih atau Naik tier untuk mendapat voucher! 🎯</p>';
            return;
        }
        panel.innerHTML = window.userVouchers.map(function (v) {
            var isActive = window.activeVoucher && window.activeVoucher.id === v.id;
            var btnClass = isActive
                ? 'bg-green-500 text-white border-green-500'
                : 'bg-white dark:bg-slate-800 text-amber-600 border-amber-200 dark:border-amber-600';
            var btnLabel = isActive ? '✅ Dipakai' : 'Gunakan';
            var sourceBadge = v.source === 'admin'
                ? '<span class="text-[8px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded ml-1">PROMO</span>'
                : '<span class="text-[8px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded ml-1">TIER</span>';

            var expiryHtml = '';
            var isExpired = false;
            if (v.expiryDate) {
                var exp = new Date(v.expiryDate);
                var now = new Date();
                var diffTime = exp - now;
                var diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays < 0) {
                    isExpired = true;
                    expiryHtml = '<span class="text-[9px] text-red-500 font-bold block">⚠️ Kadaluarsa</span>';
                } else if (diffDays <= 3) {
                    expiryHtml = '<span class="text-[9px] text-orange-500 font-bold block">⏳ Sisa ' + diffDays + ' hari</span>';
                } else {
                    expiryHtml = '<span class="text-[9px] text-slate-400 block">Berlaku s.d. ' + v.expiryDate + '</span>';
                }
            }
            var disableAttr = isExpired ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : '';
            if (isExpired && isActive) removeVoucher();
            return '<div class="flex items-center justify-between p-3 rounded-xl border ' + btnClass + ' transition-all">' +
                '<div class="flex-1">' +
                '<p class="text-xs font-bold">' + v.label + sourceBadge + '</p>' +
                '<p class="text-[10px] text-slate-400">Diskon Rp ' + v.discount.toLocaleString() + '</p>' +
                expiryHtml +
                '</div>' +
                '<button ' + disableAttr + ' onclick="' + (isActive ? 'removeVoucher()' : 'applyVoucher(\'' + v.id + '\', ' + v.discount + ', \'' + v.label.replace(/'/g, "\\'") + '\', \'' + v.source + '\')') + '" ' +
                'class="px-3 py-1.5 rounded-lg text-[10px] font-bold ' + (isActive ? 'bg-red-100 text-red-500' : 'bg-amber-100 text-amber-600') + ' active:scale-95 transition-all">' +
                (isActive ? '❌ Batal' : '🎫 ' + btnLabel) + '</button></div>';
        }).join('');
    }, 500);
}

window.applyVoucher = function (id, discount, label, source) {
    window.activeVoucher = { id: id, discount: discount, label: label, source: source || 'tierup' };
    showToast('🎫 Voucher ' + label + ' digunakan!');
    renderCart();
};

window.removeVoucher = function () {
    window.activeVoucher = null;
    showToast('❌ Voucher dibatalkan');
    renderCart();
};

function markVoucherUsed() {
    if (!window.activeVoucher) return;
    var user = auth.currentUser;
    if (!user) return;
    if (window.activeVoucher.source === 'admin' && window.supabaseClient) {
        var sbId = window.activeVoucher.id.replace('sb_', '');
        window.supabaseClient.from('vouchers')
            .select('used_by')
            .eq('id', sbId)
            .single()
            .then(function (res) {
                var usedBy = (res.data && res.data.used_by) || [];
                usedBy.push(user.uid);
                return window.supabaseClient.from('vouchers')
                    .update({ used_by: usedBy })
                    .eq('id', sbId);
            }).then(function () {
                console.log('✅ Admin voucher marked as used');
                window.activeVoucher = null;
                loadUserVouchers();
            });
    } else {
        db.collection('users').doc(user.uid).collection('vouchers')
            .doc(window.activeVoucher.id)
            .update({ used: true, usedAt: new Date().toISOString() })
            .then(function () {
                console.log('✅ Tier voucher marked as used');
                window.activeVoucher = null;
                loadUserVouchers();
            });
    }
}

function checkPointsReset(userData) {
    var user = auth.currentUser;
    if (!user) return;
    var lastReset = userData.lastPointsReset;
    var now = new Date();
    if (!lastReset) {
        db.collection('users').doc(user.uid).update({
            lastPointsReset: now.toISOString()
        });
        return;
    }
    var resetDate = new Date(lastReset);
    var diffMs = now - resetDate;
    var diffDays = diffMs / (1000 * 60 * 60 * 24);
    if (diffDays >= 90) {
        db.collection('users').doc(user.uid).update({
            points: 0,
            lastPointsReset: now.toISOString()
        }).then(function () {
            showToast('🔄 Poin telah direset (periode 3 bulan). Ayo kumpulkan lagi!');
        });
    }
}

// END OF CHUNK 2

var manualProducts = [
    { name: "Aren", price: 15000, type: "signature", image: "img/gula aren.png", mg: 80, cost: 9000 },
    { name: "Salted Caramel ", price: 15000, type: "signature", image: "img/salted.png", mg: 85, cost: 9000 },
    { name: "Spanish Coffee", price: 15000, type: "signature", image: "img/spanish.png", mg: 85, cost: 9000 },
    { name: "Pistachio", price: 15000, type: "signature", image: "img/pistacio.png", mg: 85, cost: 9000 },
    { name: "Caramel Macchiato", price: 15000, type: "Signature", image: "img/maciato.png", mg: 85, cost: 9000 },
    { name: "Americano", price: 15000, type: "classic", image: "img/americano.png", mg: 120, cost: 9000 },
    { name: "Caffe Latte", price: 15000, type: "classic", image: "img/latte.png", mg: 80, cost: 9000 },
    { name: "Caramel", price: 15000, type: "classic", image: "img/cappucino.png", mg: 80, cost: 9000 },
    { name: "Butterscotch", price: 15000, type: "classic", image: "img/cappucino.png", mg: 80, cost: 9000 },
    { name: "Hazelnut", price: 15000, type: "classic", image: "img/hazelnut.png", mg: 80, cost: 9000 },
    { name: "Vanilla", price: 15000, type: "classic", image: "img/vanilla.png", mg: 80, cost: 9000 },
    { name: "Rumbullion", price: 15000, type: "classic", image: "img/vanilla.png", mg: 80, cost: 9000 },
    { name: "Tiramisu", price: 15000, type: "classic", image: "img/tiramisu.png", mg: 80, cost: 9000 },
    { name: "Matcha Latte", price: 15000, type: "non-coffee", image: "img/matcha.png", mg: 0, cost: 9000 },
    { name: "Chocolate", price: 15000, type: "non-coffee", image: "img/coklat.png", mg: 5, cost: 9000 },
];

var products = manualProducts;

window.onload = function () {
    renderProducts(products);
    renderMenuGrid(products);
    communityGoal = parseInt(localStorage.getItem('folkpresso_community_goal')) || 0;
    updateGoalUI();
};

async function loadProducts() {
    console.log("✅ Using manual product list:", products.length);
    loadPopularProducts();
    renderMenuGrid(products);
}

function setupRealtimeNotifications() {
    if (!window.supabaseClient) return;
    window.supabaseClient
        .channel('public:broadcast_notifications_badge')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'broadcast_notifications' }, payload => {
            console.log('🔔 New notification received!');
            var badge = document.getElementById('notif-badge');
            if (!document.getElementById('profile-page').classList.contains('active')) {
                if (badge) badge.classList.remove('hidden');
            }
            showToast('📢 Ada pengumuman baru!');
        })
        .subscribe();
}

// --- PRODUCT MODAL & CUSTOMIZATION ---
window.currentProduct = null;
window.modalQty = 1;
window.modalOptions = { sweet: '100%', temp: 'Ice' };

window.openProductModal = function (name, price, mg, cost, image, desc, type) {
    if (!window.isStoreOpen) {
        showToast("⛔ Maaf, Toko Sedang Tutup!");
        if (navigator.vibrate) navigator.vibrate(200);
        return;
    }

    window.currentProduct = { name, price, mg, cost, image, type };
    window.modalQty = 1;
    window.modalOptions = { sweet: '100%', temp: 'Ice' };

    // Set UI
    document.getElementById('pm-image').src = image || 'img/gula aren.png';
    document.getElementById('pm-name').innerText = name;
    document.getElementById('pm-price').innerText = 'Rp ' + price.toLocaleString();
    document.getElementById('pm-desc').innerText = desc || 'Nikmati kesegaran ' + name + ' khas Folkpresso.';
    document.getElementById('pm-qty').innerText = '1';

    updateModalTotal();

    // Reset Options UI
    document.querySelectorAll('.opt-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.sweet-opt[data-val="100%"]').forEach(b => b.classList.add('active'));
    document.querySelectorAll('.temp-opt[data-val="Ice"]').forEach(b => b.classList.add('active'));

    // Show/Hide Options based on product type
    const isNonCoffee = type === 'non-coffee';
    const sweetnessSection = document.getElementById('opt-sweetness');
    if (sweetnessSection) sweetnessSection.style.display = isNonCoffee ? 'none' : 'block';

    const modal = document.getElementById('product-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
};

window.closeProductModal = function () {
    const modal = document.getElementById('product-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
};

window.selectOption = function (type, val) {
    window.modalOptions[type] = val;
    // Update UI
    const btns = document.querySelectorAll(type === 'sweet' ? '.sweet-opt' : '.temp-opt');
    btns.forEach(b => {
        if (b.getAttribute('data-val') === val) b.classList.add('active');
        else b.classList.remove('active');
    });
};

window.updateModalQty = function (d) {
    window.modalQty += d;
    if (window.modalQty < 1) window.modalQty = 1;
    document.getElementById('pm-qty').innerText = window.modalQty;
    updateModalTotal();
};

function updateModalTotal() {
    if (!window.currentProduct) return;
    const total = window.currentProduct.price * window.modalQty;
    document.getElementById('pm-total').innerText = 'Rp ' + total.toLocaleString();
}

window.confirmAddToCart = function () {
    if (!window.currentProduct) return;

    // Construct Name with Variants
    let finalName = window.currentProduct.name;
    let variants = [];

    if (window.currentProduct.type !== 'non-coffee') {
        variants.push(window.modalOptions.sweet); // e.g. "Less Sugar" or "75%"
    }
    variants.push(window.modalOptions.temp); // "Ice" or "Hot"

    const variantStr = variants.join(', ');
    const note = `Note: ${variantStr}`;

    // Add to Cart Logic
    const existingItem = cart.find(i => i.name === finalName && i.note === note);
    if (existingItem) {
        existingItem.quantity += window.modalQty;
    } else {
        cart.push({
            name: finalName,
            price: window.currentProduct.price,
            mg: window.currentProduct.mg,
            cost: window.currentProduct.cost,
            quantity: window.modalQty,
            note: note,
            variant: variantStr // Store for easier display if needed
        });
    }

    showToast(finalName + " ditambahkan!");
    renderCart();
    closeProductModal();
};

// Modified renderProducts to use Modal
function renderProducts(list) {
    var container = document.getElementById('product-list');
    if (!container) return;
    container.innerHTML = '';
    list.forEach(function (p) {
        var imgSrc = p.image || "img/gula aren.png";
        if (imgSrc && !imgSrc.startsWith('http') && !imgSrc.startsWith('img/')) {
            imgSrc = 'img/' + imgSrc;
        }
        imgSrc = imgSrc.split('/').map(part => encodeURIComponent(part)).join('/');
        imgSrc = imgSrc.replace(/%2F/g, '/').replace(/%3A/g, ':');

        // Escape string for onclick
        const safeName = p.name.replace(/'/g, "\\'");
        const safeType = (p.type || '').replace(/'/g, "\\'");

        container.innerHTML += `
        <div class="bg-white dark:bg-slate-900 p-4 rounded-[2rem] border border-slate-100 dark:border-slate-800 flex items-center gap-4">
            <div class="w-16 h-16 shrink-0"><img src="${imgSrc}" class="w-full h-full object-cover rounded-2xl shadow-sm bg-slate-50" onerror="this.src='img/gula aren.png'"></div>
            <div class="flex-1 min-w-0"><h4 class="font-bold text-sm dark:text-white truncate">${p.name}</h4><p class="text-blue-600 dark:text-blue-400 font-black text-xs">Rp ${p.price.toLocaleString()}</p></div>
            <button onclick="openProductModal('${safeName}', ${p.price}, ${p.mg}, ${p.cost}, '${imgSrc}', '', '${safeType}')" class="bg-blue-900 dark:bg-blue-600 text-white w-10 h-10 rounded-xl font-bold shrink-0 shadow-lg active:scale-90 transition-transform">+</button>
        </div>`;
    });
}

// Keep addToCart for backward compatibility or direct calls
window.addToCart = function (name, price, mg, cost, note = '', qty = 1) {
    if (!window.isStoreOpen) {
        showToast("⛔ Maaf, Toko Sedang Tutup!");
        if (navigator.vibrate) navigator.vibrate(200);
        return;
    }
    var item = cart.find(i => i.name === name && i.note === note);
    if (item) item.quantity += qty; else cart.push({ name, price, mg, cost, quantity: qty, note: note });
    showToast(name + " ditambahkan!");
    renderCart();
};

function renderCart() {
    var list = document.getElementById('cart-items');
    if (!list) return;
    var total = 0;
    list.innerHTML = cart.length ? '' : '<p class="text-center text-slate-400 text-xs py-10 italic">Keranjang kosong...</p>';
    cart.forEach((item, index) => {
        total += item.price * item.quantity;
        const noteDisplay = item.note ? `<p class="text-[10px] text-slate-400 italic">${item.note.replace('Note: ', '')}</p>` : '';

        list.innerHTML += `
        <div class="bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4 mb-3">
            <div class="flex-1">
                <h4 class="font-extrabold text-sm dark:text-white">${item.name}</h4>
                ${noteDisplay}
                <p class="text-blue-600 dark:text-blue-400 text-xs">Rp ${(item.price * item.quantity).toLocaleString()}</p>
            </div>
            <div class="flex items-center bg-slate-50 dark:bg-slate-800 p-1.5 rounded-2xl">
                <button onclick="updateQty(${index}, -1)" class="w-8 h-8 bg-white dark:bg-slate-700 text-slate-600 dark:text-white rounded-xl font-bold">-</button>
                <span class="px-4 text-sm font-black dark:text-white">${item.quantity}</span>
                <button onclick="updateQty(${index}, 1)" class="w-8 h-8 bg-blue-900 dark:bg-blue-600 text-white rounded-xl font-bold">+</button>
            </div>
        </div>`;
    });
    var totalEl = document.getElementById('cart-total');
    if (totalEl) totalEl.innerText = 'Rp ' + total.toLocaleString();

    var finalTotal = total;
    var voucherRow = document.getElementById('voucher-row');
    var voucherDiscDisplay = document.getElementById('voucher-discount-display');
    var finalEl = document.getElementById('cart-total-final');

    if (window.activeVoucher && total > 0) {
        var disc = Math.min(window.activeVoucher.discount, total);
        finalTotal = total - disc;
        if (voucherRow) voucherRow.classList.remove('hidden');
        if (voucherDiscDisplay) voucherDiscDisplay.innerText = '- Rp ' + disc.toLocaleString();
    } else {
        if (voucherRow) voucherRow.classList.add('hidden');
    }
    if (finalEl) finalEl.innerText = 'Rp ' + finalTotal.toLocaleString();
    loadVoucherPanel();
}

window.updateQty = function (i, d) {
    cart[i].quantity += d;
    if (cart[i].quantity < 1) cart.splice(i, 1);
    renderCart();
};

var MIDTRANS_SERVER_KEY = 'Mid-server-JWBir0vEHwL6X-vc7ftNa79H';

window.openPayment = function () {
    if (!cart.length) return showToast("Keranjang kosong!");
    var totalOrder = cart.reduce(function (a, b) { return a + (b.price * b.quantity); }, 0);
    if (window.activeVoucher) {
        totalOrder = Math.max(0, totalOrder - window.activeVoucher.discount);
    }
    var orderId = 'KOPIKU-' + Date.now();
    var itemDetails = cart.map(function (item) {
        return {
            id: item.name.replace(/\s+/g, '-').toLowerCase(),
            price: item.price,
            quantity: item.quantity,
            name: item.name
        };
    });

    var transactionData = {
        transaction_details: { order_id: orderId, gross_amount: totalOrder },
        item_details: itemDetails,
        customer_details: {
            first_name: currentUser || 'Guest',
            email: (auth.currentUser && auth.currentUser.email) || 'guest@kopiku.app',
            shipping_address: { address: window.userAddress || '-' }
        },
        enabled_payments: ['gopay', 'shopeepay', 'other_qris', 'dana']
    };

    showToast('⏳ Memproses pembayaran...');
    var targetUrl = 'https://app.sandbox.midtrans.com/snap/v1/transactions';
    var proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent(targetUrl);

    fetch(proxyUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Basic ' + btoa(MIDTRANS_SERVER_KEY + ':')
        },
        body: JSON.stringify(transactionData)
    })
        .then(function (res) {
            if (!res.ok) throw new Error(res.status + ' ' + res.statusText);
            return res.json();
        })
        .then(function (data) {
            if (data.token) {
                window.snap.pay(data.token, {
                    onSuccess: function (result) {
                        var method = result.payment_type || 'midtrans';
                        if (method === 'other_qris') method = 'QRIS';
                        handlePaymentSuccess(method);
                    },
                    onPending: function (result) { showToast('⏳ Pembayaran pending...'); },
                    onError: function (result) { showToast('❌ Pembayaran gagal!'); },
                    onClose: function () { console.log('🚪 Snap popup ditutup'); }
                });
            } else if (data.redirect_url) {
                window.open(data.redirect_url, '_blank');
            } else {
                openSimulationModal();
            }
        })
        .catch(function (err) {
            openSimulationModal();
        });
};

function handlePaymentSuccess(method) {
    submitTransaction(method);
    markVoucherUsed();
    var orderItems = cart.map(function (item) { return item.quantity + 'x ' + item.name; }).join(', ');
    addNotification('☕ Pesanan berhasil!', orderItems + ' via ' + method);
    showToast('✅ Pembayaran berhasil via ' + method + '!');
    cart = [];
    renderCart();
    showPage('home');
}

window.closePaymentModal = function () { };
window.processPayment = function (method) { handlePaymentSuccess(method); };

function openSimulationModal() {
    document.getElementById('simulation-payment-modal').classList.remove('hidden');
    document.getElementById('simulation-payment-modal').classList.add('flex');
}
function closeSimulationModal() {
    document.getElementById('simulation-payment-modal').classList.add('hidden');
    document.getElementById('simulation-payment-modal').classList.remove('flex');
}

let deferredPrompt;
const installBtn = document.getElementById('btn-install-app');

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').then(reg => {
            reg.update();
            if (reg.waiting) postMessageToSW(reg.waiting);
            reg.addEventListener('updatefound', () => {
                const newWorker = reg.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        console.log("🔄 New update found, reloading...");
                    }
                });
            });
        }).catch(err => console.log('❌ SW Registration Failed:', err));

        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (!refreshing) {
                refreshing = true;
                window.location.reload();
            }
        });
    });
}

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installBtn) installBtn.classList.remove('hidden');
});

window.installPWA = async () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        deferredPrompt = null;
        if (outcome === 'accepted' && installBtn) installBtn.classList.add('hidden');
    } else {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        if (isIOS) showIOSInstallGuide();
        else showToast("⚠️ Aplikasi mungkin sudah terinstall atau browser tidak mendukung.");
    }
};

function showIOSInstallGuide() {
    var popup = document.createElement('div');
    popup.id = 'ios-install-popup';
    popup.className = 'fixed inset-0 z-[9999] flex items-end justify-center bg-black/60 backdrop-blur-sm p-4';
    popup.innerHTML = `
        <div class="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2rem] p-6 shadow-2xl slide-up text-center relative">
            <button onclick="this.parentElement.parentElement.remove()" class="absolute top-4 right-4 w-8 h-8 bg-slate-100 rounded-full text-slate-500 font-bold">✕</button>
            <div class="w-16 h-16 bg-slate-100 rounded-2xl mx-auto mb-4 flex items-center justify-center text-3xl shadow-sm">🍎</div>
            <h3 class="text-lg font-black text-slate-800 dark:text-white mb-2">Install di iPhone</h3>
            <p class="text-sm text-slate-500 mb-6">Aplikasi ini bisa diinstall tanpa App Store!</p>
            <div class="flex items-center gap-4 text-left bg-slate-50 dark:bg-slate-800 p-3 rounded-xl mb-2">
                <span class="text-2xl">1️⃣</span>
                <div><p class="text-xs font-bold text-slate-600 dark:text-slate-300">Tap tombol Share</p><p class="text-[10px] text-slate-400">Ikon kotak dengan panah ke atas di bawah layar</p></div>
            </div>
            <div class="flex items-center gap-4 text-left bg-slate-50 dark:bg-slate-800 p-3 rounded-xl">
                <span class="text-2xl">2️⃣</span>
                <div><p class="text-xs font-bold text-slate-600 dark:text-slate-300">Pilih 'Add to Home Screen'</p><p class="text-[10px] text-slate-400">Scroll ke bawah sedikit untuk menemukannya</p></div>
            </div>
        </div>`;
    document.body.appendChild(popup);
}

window.addEventListener('appinstalled', () => {
    if (installBtn) installBtn.classList.add('hidden');
});

if (window.matchMedia('(display-mode: standalone)').matches) {
    if (installBtn) installBtn.classList.add('hidden');
}

// END OF CHUNK 3



// --- MY COFFEE WRAPPED ---
window.showWrapped = function () {
    const user = auth.currentUser;
    if (!user) return showToast("Login dulu untuk lihat Wrapped!");

    // Basic Stats Calculation (Mock if no history, or pull from user data)
    // ideally we pull from 'transactions' where user_id == uid.
    // For now, we use the 'caffeine' and 'points' in user doc as proxy for total consumption
    db.collection('users').doc(user.uid).get().then(doc => {
        if (!doc.exists) return;
        const data = doc.data();
        const totalCaffeine = data.caffeine || 0;
        const totalCups = Math.floor(totalCaffeine / 100); // Approx

        // Determine Persona
        let persona = { icon: '👶', title: 'Newbie Brewer', desc: 'Baru mulai petualangan kopi nih!' };
        if (totalCups > 10) persona = { icon: '☕', title: 'Daily Sipper', desc: 'Kopi adalah bensin harianmu.' };
        if (totalCups > 50) persona = { icon: '🦁', title: 'The Caffeine Lion', desc: 'Raja hutan beton yang tak bisa aum tanpa kopi.' };
        if (totalCups > 100) persona = { icon: '🧙‍♂️', title: 'Coffee Wizard', desc: 'Darahmu sudah 90% Arabica.' };

        // Determine Fav Drink (Mock random for now as we don't query aggregation yet)
        const favDrink = products[Math.floor(Math.random() * products.length)];

        // Update UI
        document.getElementById('wrap-total-cups').innerText = totalCups;
        document.getElementById('wrap-caffeine').innerText = totalCaffeine.toLocaleString();

        document.getElementById('wrap-fav-name').innerText = favDrink ? favDrink.name : '-';
        document.getElementById('wrap-fav-img').src = favDrink ? (favDrink.image || 'img/kopi.png') : 'img/kopi.png';
        document.getElementById('wrap-fav-count').innerText = Math.floor(totalCups * 0.4) || 1; // Mock 40% is fav

        document.getElementById('wrap-persona-icon').innerText = persona.icon;
        document.getElementById('wrap-persona-title').innerText = persona.title;
        document.getElementById('wrap-persona-desc').innerText = persona.desc;

        // Reset Slides
        document.querySelectorAll('.wrapped-slide').forEach(el => el.classList.add('hidden'));
        document.getElementById('slide-1').classList.remove('hidden');

        // Show Modal
        document.getElementById('wrapped-modal').classList.remove('hidden');
        document.getElementById('wrapped-modal').classList.add('flex');
    });
};

window.nextSlide = function (slideNum) {
    document.querySelectorAll('.wrapped-slide').forEach(el => el.classList.add('hidden'));
    document.getElementById('slide-' + slideNum).classList.remove('hidden');
};

window.closeWrapped = function () {
    document.getElementById('wrapped-modal').classList.add('hidden');
    document.getElementById('wrapped-modal').classList.remove('flex');
};

window.shareWrapped = function () {
    if (navigator.share) {
        navigator.share({
            title: 'Folkpresso Wrapped',
            text: 'Aku adalah ' + document.getElementById('wrap-persona-title').innerText + ' di Folkpresso! ☕',
            url: 'https://folkpresso.app'
        }).catch(console.error);
    } else {
        showToast("Fitur share tidak didukung browser ini.");
    }
};

// Product Modal Logic
let currentProduct = null;
let currentSugar = 'Normal';
window.modalQty = 1;

window.openProductModal = function (name, price, mg, cost, image, desc, type) {
    currentProduct = { name, price, mg, cost, image, type };
    window.modalQty = 1;

    document.getElementById('pm-image').src = image;
    document.getElementById('pm-name').innerText = name;
    document.getElementById('pm-price').innerText = "Rp " + price.toLocaleString();
    document.getElementById('pm-qty').innerText = "1";

    // Reset selections
    currentSugar = 'Normal';

    // Update UI
    document.querySelectorAll('.sugar-btn').forEach(b => {
        b.classList.remove('active', 'border-blue-500', 'bg-blue-50', 'text-blue-600');
        b.classList.add('border-slate-100', 'text-slate-500');
    });
    const defSugar = document.getElementById('sugar-normal');
    if (defSugar) {
        defSugar.classList.add('active', 'border-blue-500', 'bg-blue-50', 'text-blue-600');
        defSugar.classList.remove('border-slate-100', 'text-slate-500');
    }

    updateModalTotal(); // Initial calc

    document.getElementById('product-modal').classList.remove('hidden');
    document.getElementById('product-modal').classList.add('flex');
}

window.updateModalQty = function (d) {
    window.modalQty += d;
    if (window.modalQty < 1) window.modalQty = 1;
    document.getElementById('pm-qty').innerText = window.modalQty;
    updateModalTotal();
};

function updateModalTotal() {
    if (!currentProduct) return;
    const total = currentProduct.price * window.modalQty;
    const totalEl = document.getElementById('pm-total');
    if (totalEl) totalEl.innerText = 'Rp ' + total.toLocaleString();
}

window.closeProductModal = function () {
    document.getElementById('product-modal').classList.add('hidden');
    document.getElementById('product-modal').classList.remove('flex');
}

window.selectSugar = function (level) {
    currentSugar = level;
    document.querySelectorAll('.sugar-btn').forEach(b => {
        b.classList.remove('active', 'border-blue-500', 'bg-blue-50', 'text-blue-600');
        b.classList.add('border-slate-100', 'text-slate-500');
    });
    const btn = document.getElementById(level === 'Normal' ? 'sugar-normal' : 'sugar-' + level.replace('%', ''));
    if (btn) {
        btn.classList.add('active', 'border-blue-500', 'bg-blue-50', 'text-blue-600');
        btn.classList.remove('border-slate-100', 'text-slate-500');
    }
}

window.confirmAddToCart = function () {
    if (!currentProduct) return;

    // Construct Note
    const note = `Sugar: ${currentSugar}`;

    window.addToCart(currentProduct.name, currentProduct.price, currentProduct.mg, currentProduct.cost, note, window.modalQty);
    closeProductModal();
}

async function submitTransaction(method) {
    const user = auth.currentUser;
    if (!user) return;

    // --- BAGIAN INI MENYIAPKAN PESAN BROADCAST ---
    // Mengambil detail: "2x Kopi Aren, 1x Donat"
    var orderDetails = cart.map(function (item) { 
        return item.quantity + "x " + item.name; 
    }).join(", ");

    // Format pesan: "User memesan 2x Kopi Aren via QRIS"
    var broadcastMsg = "🛒 " + currentUser + " memesan " + orderDetails + " via " + method + "!";
    // ---------------------------------------------

    let totalOrder = cart.reduce((a, b) => a + (b.price * b.quantity), 0);
    let totalCaffeine = cart.reduce((a, b) => a + (b.mg * b.quantity), 0);
    let totalCups = cart.reduce((a, b) => a + b.quantity, 0);

    communityGoal += totalCups;
    localStorage.setItem('folkpresso_community_goal', communityGoal);
    updateGoalUI();

    const userRef = db.collection("users").doc(user.uid);
    userRef.update({
        points: firebase.firestore.FieldValue.increment(Math.floor(totalOrder / 1000)),
        caffeine: firebase.firestore.FieldValue.increment(totalCaffeine)
    });

    const now = new Date();
    const dateStamp = now.toISOString().split('T')[0];
    const fullTimeStr = now.toLocaleDateString('id-ID') + " | " + now.toLocaleTimeString('id-ID');

    const payload = cart.map(item => ({
        date: dateStamp,
        full_time: fullTimeStr,
        name: item.name,
        type: 'in',
        qty: item.quantity,
        unit_price: item.price,
        unit_cost: item.cost || 0,
        total: item.price * item.quantity,
        method: method,
        payment_status: 'success',
        location: window.userAddress || '-',
        notes: (window.userPhone || '-') + (item.note ? ' | ' + item.note : '')
    }));

    if (window.supabaseClient) {
        try {
            // Cek voucher
            if (window.activeVoucher && window.activeVoucher.source === 'admin' && window.activeVoucher.supabaseId) {
                const vId = window.activeVoucher.supabaseId;
                const { data: vData } = await window.supabaseClient.from('vouchers').select('used_by').eq('id', vId).single();
                if (vData) {
                    const currentUsed = vData.used_by || [];
                    if (currentUsed.indexOf(user.uid) === -1) {
                        const newUsed = currentUsed.concat(user.uid);
                        await window.supabaseClient.from('vouchers').update({ used_by: newUsed }).eq('id', vId);
                    }
                }
            }

            // Simpan transaksi
            const { data, error } = await window.supabaseClient.from('transactions').insert(payload);
            if (error) {
                console.error("❌ Supabase Error:", error);
            }

            // --- KIRIM PESAN KE MARQUEE GLOBAL ---
            await window.insertAnnouncement(broadcastMsg);
            // -------------------------------------

        } catch (err) { console.error("❌ Error saat kirim data:", err); }
    }

    showToast("Pesanan diterima! Mohon tunggu.");

    // Kosongkan keranjang
    cart = [];
    renderCart();

    window.currentOrderId = null;
    window.activeVoucher = null;
    if (document.getElementById('voucher-btn-text')) document.getElementById('voucher-btn-text').innerText = 'Pakai Voucher';
}

window.showPage = function (id) {
    document.querySelectorAll('.app-page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(id + '-page');
    if (target) target.classList.add('active');

    document.querySelectorAll('.bottom-nav-item').forEach(b => {
        b.classList.remove('active');
    });
    const btn = document.getElementById('btn-' + id);
    if (btn) btn.classList.add('active');

    if (id === 'cart') {
        renderCart();
        var cartAddr = document.getElementById('cart-address-display');
        if (cartAddr && window.userAddress) cartAddr.innerText = window.userAddress;
    }
    if (id === 'profile') {
        updateMemberUI();
        loadNotifications();
        loadOrderHistory();

        // Clear badge when viewing profile
        setTimeout(() => {
            localStorage.setItem('folkpresso_last_notif_view', Date.now());
            const badge = document.getElementById('notif-badge');
            if (badge) badge.classList.add('hidden');
        }, 1000);
    }
};

function showToast(msg) {
    var container = document.getElementById('toast-container');
    if (!container) return;
    var t = document.createElement('div');
    t.className = 'toast'; t.innerText = msg;
    container.appendChild(t);
    setTimeout(() => t.remove(), 2500);
}

function updateGoalUI() {
    var goalPercent = Math.min((communityGoal / 20) * 100, 100);
    const bar = document.getElementById('goal-bar');
    const txt = document.getElementById('goal-counter');
    if (bar) bar.style.width = goalPercent + "%";
    if (txt) txt.innerText = communityGoal + " / 20 Cups";
}

window.toggleDark = function () {
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('folkpresso_dark_mode', document.documentElement.classList.contains('dark'));
};

if (localStorage.getItem('folkpresso_dark_mode') === 'true') {
    document.documentElement.classList.add('dark');
}

window.testMarquee = function () {
    if (window.supabaseClient) {
        window.insertAnnouncement("🧪 Test dari " + currentUser + " - " + new Date().toLocaleTimeString());
    }
};

window.logout = function () {
    if (confirm("Yakin mau keluar?")) {
        auth.signOut().then(() => location.reload());
    }
};

window.claimQuest = function () {
    const user = auth.currentUser;
    if (!user) return;
    const userRef = db.collection("users").doc(user.uid);
    const today = new Date().toDateString();
    
    userRef.get().then((doc) => {
        if (doc.exists && doc.data().lastQuestDate === today) {
            showToast("Sudah diklaim hari ini!");
        } else {
            userRef.update({ points: firebase.firestore.FieldValue.increment(50), lastQuestDate: today }).then(() => {
                showToast("🎉 +50 Poin Quest!");
                
                // --- KODE BARU BUAT MARQUEE ---
                if (window.supabaseClient) {
                    window.insertAnnouncement("⚔️ " + currentUser + " berhasil menyelesaikan Daily Quest (+50 Poin)!");
                }
                // ------------------------------
            });
        }
    });
};

window.saveBiodata = function () {
    const user = auth.currentUser;
    if (!user) return showToast('Silakan login terlebih dahulu!');
    const name = document.getElementById('bio-name').value.trim();
    const phoneRaw = document.getElementById('bio-phone').value.trim();
    const address = document.getElementById('input-address').value.trim();
    if (!name) return showToast('Nama tidak boleh kosong!');
    let phone = '';
    if (phoneRaw) {
        phone = phoneRaw.replace(/[\s\-]/g, '');
        if (phone.startsWith('0')) phone = phone.substring(1);
        phone = '+62' + phone;
    }
    const updateData = { customName: name, address: address };
    if (phone) { updateData.phone = phone; window.userPhone = phone; }
    db.collection('users').doc(user.uid).update(updateData).then(function () {
        window.userAddress = address;
        showToast('✅ Biodata berhasil disimpan!');
    }).catch(function (err) { showToast('❌ Gagal menyimpan: ' + err.message); });
};

window.mysteryBrew = function () {
    var random = products[Math.floor(Math.random() * products.length)];
    window.addToCart(random.name, random.price, random.mg, random.cost);
};

function renderMenuGrid(list) {
    var grid = document.getElementById('menu-product-grid');
    if (!grid) return;
    grid.innerHTML = '';
    list.forEach(function (p) {
        var imgSrc = p.image || 'img/gula aren.png';
        if (imgSrc && !imgSrc.startsWith('http') && !imgSrc.startsWith('img/')) imgSrc = 'img/' + imgSrc;
        imgSrc = imgSrc.split('/').map(part => encodeURIComponent(part)).join('/');
        imgSrc = imgSrc.replace(/%2F/g, '/').replace(/%3A/g, ':');

        const safeName = p.name.replace(/'/g, "\\'");
        const safeType = (p.type || '').replace(/'/g, "\\'");

        grid.innerHTML += `
        <div class="menu-product-card relative transition-all active:scale-95" data-type="${p.type}">
            <span class="absolute top-2 right-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded-full backdrop-blur-sm border border-white/20 z-10">${p.type || 'Menu'}</span>
            <img src="${imgSrc}" class="w-full h-32 object-cover rounded-t-2xl" onerror="this.src='img/gula aren.png'">
            <div class="p-3 bg-white dark:bg-slate-900 rounded-b-2xl border border-t-0 border-slate-100 dark:border-slate-800">
                <h4 class="font-bold text-sm dark:text-white truncate">${p.name}</h4>
                <p class="text-blue-600 font-extrabold text-xs mt-1">Rp ${p.price.toLocaleString()}</p>
                <button onclick="openProductModal('${safeName}', ${p.price}, ${p.mg}, ${p.cost}, '${imgSrc}', '', '${safeType}')" class="mt-2 w-full bg-red-500 hover:bg-red-600 text-white text-[10px] font-bold py-2 rounded-xl active:scale-95 transition-all">Add to Cart</button>
            </div>
        </div>`;
    });
}

window.filterMenu = function (category) {
    var tabs = document.querySelectorAll('#menu-category-tabs .category-pill');
    tabs.forEach(function (t) { t.classList.remove('active'); });
    event.target.classList.add('active');
    if (category === 'all') renderMenuGrid(products);
    else renderMenuGrid(products.filter(p => (p.type || '').toLowerCase() === category.toLowerCase()));
};

window.searchMenu = function (query) {
    var q = query.toLowerCase().trim();
    if (!q) { renderMenuGrid(products); return; }
    renderMenuGrid(products.filter(p => p.name.toLowerCase().indexOf(q) !== -1));
};

window.saveAddress = function () {
    var user = auth.currentUser;
    var addr = document.getElementById('input-address').value.trim();
    if (!user || !addr) { showToast('Masukkan alamat terlebih dahulu!'); return; }
    db.collection('users').doc(user.uid).update({ address: addr }).then(function () {
        window.userAddress = addr;
        showToast('📍 Alamat tersimpan!');
    });
};

window.getGPSAddress = function () {
    var btn = document.getElementById('btn-gps');
    var status = document.getElementById('gps-status');
    var addrInput = document.getElementById('input-address');
    var detailInput = document.getElementById('input-address-detail');

    if (!navigator.geolocation) {
        showToast('❌ GPS tidak didukung browser ini');
        return;
    }

    if (btn) btn.innerHTML = '<span class="animate-spin">⌛</span> Mencari Detail...';
    if (status) {
        status.classList.remove('hidden');
        status.innerText = '📡 Menghubungkan satelit...';
    }

    var options = {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0
    };

    navigator.geolocation.getCurrentPosition(
        function (pos) {
            var lat = pos.coords.latitude;
            var lon = pos.coords.longitude;

            if (status) status.innerText = 'Titik didapat. Mengurai alamat lengkap...';

            fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`, {
                headers: {
                    'Accept-Language': 'id-ID, id;q=0.9'
                }
            })
                .then(r => r.json())
                .then(data => {
                    if (data && data.address) {
                        let a = data.address;
                        let parts = [];
                        let jalan = a.road || a.street || a.footway || a.path || a.track || a.pedestrian;
                        if (jalan) {
                            if (a.house_number) parts.push(jalan + " No. " + a.house_number);
                            else parts.push(jalan);
                        } else {
                            let poi = a.amenity || a.building || a.shop || a.office || a.leisure;
                            if (poi) parts.push(poi);
                        }
                        let lingkungan = a.neighbourhood || a.hamlet || a.quarter || a.residential;
                        if (lingkungan) parts.push(lingkungan);
                        let kelurahan = a.village || a.town_hall;
                        if (!kelurahan) {
                            if (a.suburb && !a.city_district && !a.county) kelurahan = a.suburb;
                        }
                        if (kelurahan) parts.push("Kel/Desa " + kelurahan);
                        let kecamatan = a.city_district || a.district || a.county || a.municipality;
                        let kota = a.city || a.town || a.regency;
                        if (kecamatan && kecamatan !== kota && kecamatan !== kelurahan) {
                            parts.push("Kec. " + kecamatan);
                        } else if (a.suburb && !kelurahan) {
                            parts.push("Kec. " + a.suburb);
                        }
                        if (kota) parts.push(kota);
                        if (a.postcode) parts.push(a.postcode);
                        let uniqueParts = [...new Set(parts)];
                        var finalAddr = uniqueParts.join(", ");
                        if (finalAddr.length < 5) finalAddr = data.display_name;

                        if (addrInput) addrInput.value = finalAddr;
                        window.userAddress = finalAddr; // Base address

                        if (status) status.innerText = '✅ Terdeteksi: ' + finalAddr;
                        showToast('📍 Alamat Ditemukan! Silakan isi detail.');

                        // Focus on detail input
                        if (detailInput) {
                            detailInput.value = '';
                            detailInput.focus();
                            detailInput.placeholder = "Contoh: Pagar Hitam, Lantai 2...";
                        }

                    } else {
                        var backup = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
                        if (addrInput) addrInput.value = backup;
                        window.userAddress = backup;
                        if (status) status.innerText = '⚠️ Nama jalan tidak terdaftar di peta.';
                    }
                    if (btn) btn.innerHTML = '📡 Update Lokasi';
                })
                .catch(err => {
                    console.error(err);
                    if (btn) btn.innerHTML = '📡 Gunakan GPS';
                    if (status) status.innerText = '⚠️ Gagal mengambil detail alamat.';
                });
        },
        function (err) {
            if (btn) btn.innerHTML = '📡 Gunakan GPS';
            let errorMsg = 'Gagal melacak lokasi.';
            if (err.code === 1) errorMsg = '❌ Izin GPS ditolak.';
            if (err.code === 3) errorMsg = '❌ Waktu habis (Timeout).';
            showToast(errorMsg);
            if (status) status.innerText = errorMsg;
        },
        options
    );
};

var notifications = JSON.parse(localStorage.getItem('kopiku_notifs') || '[]');
function addNotification(title, message) {
    notifications.unshift({ title, message, time: Date.now() });
    if (notifications.length > 20) notifications.pop();
    localStorage.setItem('kopiku_notifs', JSON.stringify(notifications));
}

async function loadNotifications() {
    var container = document.getElementById('notif-list');
    if (!container) return;

    container.innerHTML = '<div class="flex justify-center py-4"><span class="animate-spin text-blue-500">⌛</span></div>';

    var broadcasts = [];
    if (window.supabaseClient) {
        try {
            const { data } = await window.supabaseClient
                .from('broadcast_notifications')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(20);
            if (data) broadcasts = data;
        } catch (e) { console.error("Notif fetch error:", e); }
    }

    var all = [];
    broadcasts.forEach(n => {
        if (n.title === 'SYSTEM_STORE_STATUS') return;
        all.push({
            title: "📢 " + n.title,
            message: n.message,
            time: new Date(n.created_at).getTime()
        });
    });

    all = all.slice(0, 30);

    if (all.length === 0) {
        container.innerHTML = '<p class="text-xs text-slate-400 italic text-center py-4">Belum ada notifikasi</p>';
        return;
    }

    container.innerHTML = '';
    all.forEach(function (n) {
        const diff = Date.now() - n.time;
        let timeStr = "";
        if (diff < 60000) timeStr = "Baru saja";
        else if (diff < 3600000) timeStr = Math.floor(diff / 60000) + " menit lalu";
        else if (diff < 86400000) timeStr = Math.floor(diff / 3600000) + " jam lalu";
        else timeStr = new Date(n.time).toLocaleDateString('id-ID');

        container.innerHTML += `
        <div class="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden group mb-2 transition-all">
            <div class="flex justify-between items-start mb-1">
                <h4 class="font-bold text-slate-800 dark:text-white text-sm uppercase tracking-wider">${n.title}</h4>
                <span class="text-[10px] text-slate-400 italic">${timeStr}</span>
            </div>
            <p class="text-xs text-slate-500 dark:text-slate-300 leading-relaxed font-medium">${n.message}</p>
        </div>`;
    });

    var lastViewTime = parseInt(localStorage.getItem('folkpresso_last_notif_view')) || 0;
    var latestTime = all.length > 0 ? new Date(all[0].time).getTime() : 0;

    const badge = document.getElementById('notif-badge');
    if (badge) {
        if (latestTime > lastViewTime) {
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }

    if (document.getElementById('profile-page').classList.contains('active')) {
        localStorage.setItem('folkpresso_last_notif_view', Date.now());
        const badge = document.getElementById('notif-badge');
    if (badge) badge.classList.add('hidden');
    }
}

function getTimeAgo(timestamp) {
    var diff = Date.now() - timestamp;
    var mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Baru saja';
    if (mins < 60) return mins + ' menit lalu';
    var hours = Math.floor(mins / 60);
    if (hours < 24) return hours + ' jam lalu';
    return Math.floor(hours / 24) + ' hari lalu';
}

window.loadOrderHistory = async function () {
    var container = document.getElementById('order-history-list');
    if (!container) return;
    container.innerHTML = '<p class="text-xs text-slate-400 italic text-center py-4">Memuat...</p>';

    if (!window.supabaseClient) {
        container.innerHTML = '<p class="text-xs text-red-400 italic text-center py-4">Database belum terhubung</p>';
        return;
    }

    var user = auth.currentUser;
    if (!user) {
        container.innerHTML = '<p class="text-xs text-slate-400 italic text-center py-4">Silakan login</p>';
        return;
    }

    try {
        var { data, error } = await window.supabaseClient
            .from('transactions')
            .select('date, full_time, name, qty, total, method, payment_status, user_id')
            .eq('user_id', user.uid)
            .order('id', { ascending: false })
            .limit(20);

        if (error) {
            container.innerHTML = '<p class="text-xs text-red-400 italic text-center py-4">Gagal memuat: ' + error.message + '</p>';
            return;
        }

        if (!data || data.length === 0) {
            container.innerHTML = '<p class="text-xs text-slate-400 italic text-center py-4">Belum ada riwayat pesanan</p>';
            return;
        }

        container.innerHTML = '';
        data.forEach(function (tx) {
            container.innerHTML += `
            <div class="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl mb-2">
                <div class="flex justify-between items-start">
                    <h5 class="font-bold text-xs dark:text-white">${tx.name} (${tx.qty}x)</h5>
                    <span class="text-[10px] text-slate-400">${tx.full_time || tx.date}</span>
                </div>
                <div class="flex justify-between items-center mt-1">
                    <span class="text-[11px] text-blue-600 font-bold">Rp ${(tx.total || 0).toLocaleString()}</span>
                    <span class="text-[10px] px-2 py-0.5 rounded-full font-bold ${tx.payment_status === 'success' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}">${tx.method}</span>
                </div>
            </div>`;
        });
    } catch (e) {
        container.innerHTML = '<p class="text-xs text-red-400 italic text-center py-4">Error: ' + e.message + '</p>';
    }
};

window.loadPopularProducts = async function () {
    if (!window.supabaseClient) {
        renderProducts(products.slice(0, 3));
        return;
    }

    try {
        var { data, error } = await window.supabaseClient
            .from('transactions')
            .select('name, qty');

        if (error || !data || data.length === 0) {
            renderProducts(products.slice(0, 3));
            return;
        }

        var countMap = {};
        data.forEach(function (tx) {
            if (!countMap[tx.name]) countMap[tx.name] = 0;
            countMap[tx.name] += (tx.qty || 1);
        });

        var sorted = products.slice().sort(function (a, b) {
            return (countMap[b.name] || 0) - (countMap[a.name] || 0);
        });

        var top3 = sorted.slice(0, 3);
        renderProducts(top3);
    } catch (e) {
        console.error('Error loading popular:', e);
        renderProducts(products.slice(0, 3));
    }
};

window.testMarquee = function () {
    if (window.supabaseClient) {
        window.insertAnnouncement("🧪 Test dari " + currentUser + " - " + new Date().toLocaleTimeString());
    }
};

window.testMultipleMarquee = function () {
    if (!window.supabaseClient) return;
    window.insertAnnouncement("☕ User A memesan 2x Aren Coffee via Cash!");
    setTimeout(() => window.insertAnnouncement("☕ User B memesan 1x Salted Caramel via QRIS!"), 500);
    setTimeout(() => window.insertAnnouncement("⚔️ User C berhasil claim Daily Quest +50 poin!"), 1000);
};

// Initialize Notification Listener
window.initNotificationListener = function () {
    if (!window.supabaseClient) return;

    // 1. Listen for Admin Broadcasts (Notifications)
    window.supabaseClient.channel('public:broadcast_notifications')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'broadcast_notifications' }, payload => {
            console.log('🔔 New Notification:', payload);
            const badge = document.getElementById('notif-badge');
            if (badge && !document.getElementById('profile-page').classList.contains('active')) {
                badge.classList.remove('hidden');
            }
            showToast("🔔 Info Baru: " + payload.new.title);

            // If on profile page, refresh list
            if (document.getElementById('profile-page').classList.contains('active')) {
                loadNotifications();
            }
        })
        .subscribe();

    // 2. Listen for Global Activity (Marquee Details)
    window.supabaseClient.channel('public:announcements')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'announcements' }, payload => {
            console.log('📢 New Activity:', payload);
            if (payload.new && payload.new.message) {
                displayMarqueeMessage(payload.new.message, payload.new.timestamp, payload.new.id);
            }
        })
        .subscribe();
};

window.broadcastActivity = async function (message) {
    if (window.insertAnnouncement) await window.insertAnnouncement(message);
};

// Initialize Features
document.addEventListener('DOMContentLoaded', () => {
    if (window.initNotificationListener) window.initNotificationListener();
    if (typeof renderMarqueeMessages === 'function') renderMarqueeMessages();

    // Check local storage for community goal
    if (localStorage.getItem('folkpresso_community_goal')) {
        communityGoal = parseInt(localStorage.getItem('folkpresso_community_goal'));
        updateGoalUI();
    }
});

// FINAL CLEANUP
console.log("🚀 script.js initialized");

// --- TARO INI DI SCRIPT.JS APLIKASI CUSTOMER ---

const clientRealtime = supabase.createClient(SB_URL, SB_KEY);

function listenToAdminUpdates() {
    // 1. Dengerin Broadcast Notifikasi (Marquee/Pop-up User)
    clientRealtime.channel('public:broadcast_notifications')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'broadcast_notifications' }, payload => {
            const data = payload.new;
            
            // Jika ini update status toko
            if (data.title === 'SYSTEM_STORE_STATUS') {
                window.isStoreOpen = (data.message === 'OPEN');
                updateStoreVisuals(); // Fungsi untuk ubah tombol/banner toko
                showToast(`📢 Toko sekarang: ${data.message}`);
            } else {
                // Jika ini promo/info biasa, langsung munculin di Marquee
                if (window.displayMarqueeMessage) {
                    window.displayMarqueeMessage(data.message, Date.now(), data.id);
                }
                // Munculin notifikasi browser jika di background
                sendPushNotification(data.title, data.message);
            }
        })
        .subscribe();

    // 2. Dengerin Voucher Baru
    clientRealtime.channel('public:vouchers')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'vouchers' }, payload => {
            showToast("🎫 Ada Voucher Baru buat kamu!");
            if (window.loadUserVouchers) window.loadUserVouchers(); // Refresh list voucher otomatis
        })
        .subscribe();
}

// Jalankan fungsi saat app mulai
listenToAdminUpdates();
