


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
    .then(() => console.log("✅ Auth Persistence set to LOCAL"))
    .catch((error) => console.error("❌ Auth Persistence Error:", error));

// ==========================================
// 2. SUPABASE & GLOBAL VARIABLES
// ==========================================
var SB_URL = "https://gfmvigkhflkqetbftttr.supabase.co";
var SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmbXZpZ2toZmxrcWV0YmZ0dHRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNTQ3NDAsImV4cCI6MjA4NTYzMDc0MH0.dGq7S_3y2nG8Nrl_ZpzLVuncoedp2rlIzb2u4cZ44Fg";

if (typeof supabase !== 'undefined') {
    window.supabaseClient = supabase.createClient(SB_URL, SB_KEY);
    console.log("✅ Supabase Client Initialized");
}

let currentUser = "Guest";
let userPoints = 0;
let userCaffeine = 0;
let currentTierStatus = "";
let cart = [];
let isStoreOpen = true;
let communityGoal = 0;

// Variabel Modal Product (Cukup 1 kali deklarasi)
let currentProduct = null;
let currentSugar = 'Normal';
window.modalQty = 1;

let defaultMarquee = `🔥 Fuel Your Day With a Perfect Blend! &nbsp;&nbsp; •  &nbsp;&nbsp; ☕ Folkpresso Open!`;
let activeMessages = [];
window.shownMessageIds = new Set();
window.lastNotifiedTier = "";

// ==========================================
// 3. PRODUCT DATA & RENDERING UTILS
// ==========================================
var manualProducts = [
    { name: "Aren", price: 100, type: "signature", image: "img/gula aren.png", mg: 80, cost: 9000 },
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
    async function fetchLatestAnnouncement() {
        isplayMarqueeMessage(payload.new.message)
        const marqueeElement = document.getElementById('marquee-text'); // Pastikan ID ini ada di HTML
        if (!marqueeElement) return;

        const { data, error } = await window.supabaseClient
            .from('announcements')
            .select('message')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (data && !error) {
            marqueeElement.innerText = `☕ ${data.message} • Folkpresso Open!`;
        }
    }

    // 2. Fungsi Realtime khusus buat Marquee (Aman & Terpisah)
    function setupAnnouncementRealtime() {
        const marqueeElement = document.getElementById('marquee-text');

        window.supabaseClient
            .channel('public:announcements')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'announcements' }, payload => {
                console.log("📢 Ada Pengumuman Baru:", payload.new.message);
                if (marqueeElement) {
                    marqueeElement.innerText = `☕ ${payload.new.message} • Folkpresso Open!`;
                }
            })
            .subscribe();
    }
    loadPopularProducts();
    renderMenuGrid(products);
    communityGoal = parseInt(localStorage.getItem('folkpresso_community_goal')) || 0;
    updateGoalUI();
    async function loadPopularProducts() {
        try {
            // 1. Ambil data 5 besar dari SQL View
            const { data: popularData, error } = await window.supabaseClient
                .from('popular_products')
                .select('*');

            if (error) throw error;

            if (popularData && popularData.length > 0) {
                console.log("📊 Data Jualan Kopi dari DB:", popularData);

                const topProducts = popularData.map(soldItem => {
                    // 2. Logika Pencocokan Super Teliti (Fix buat Aren)
                    const match = products.find(p => {
                        const dbName = soldItem.name.trim().toLowerCase();
                        const localName = p.name.trim().toLowerCase();
                        // Cocokkan jika nama sama persis atau salah satu mengandung nama lainnya
                        return dbName === localName || dbName.includes(localName) || localName.includes(dbName);
                    });

                    if (!match) {
                        console.warn(`⚠️ Produk "${soldItem.name}" ada di DB tapi nggak ketemu di script.js!`);
                    }
                    return match;
                }).filter(p => p !== undefined);

                // 3. Render produk yang beneran laku sesuai database
                renderProducts(topProducts);
                console.log(`✅ Berhasil menampilkan ${topProducts.length} produk populer.`);

            } else {
                console.log("ℹ️ Belum ada data jualan kopi, menampilkan menu default.");
                renderProducts(products.slice(0, 5));
            }
        } catch (err) {
            console.error("❌ Error Sinkronisasi Produk Populer:", err);
            renderProducts(products.slice(0, 5)); // Fallback jika terjadi error
        }
    }
};

function renderProducts(list) {
    var container = document.getElementById('product-list');
    if (!container) return;
    container.innerHTML = '';
    list.forEach(function (p) {
        var imgSrc = p.image || "img/gula aren.png";
        if (imgSrc && !imgSrc.startsWith('http') && !imgSrc.startsWith('img/')) imgSrc = 'img/' + imgSrc;
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

function renderMenuGrid(list) {
    var grid = document.getElementById('menu-product-grid');
    if (!grid) return;
    grid.innerHTML = '';
    list.forEach(function (p) {
        var imgSrc = p.image || 'img/gula aren.png';
        if (imgSrc && !imgSrc.startsWith('http') && !imgSrc.startsWith('img/')) imgSrc = 'img/' + imgSrc;
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

// ==========================================
// 4. AUTH & USER DATA SYNC
// ==========================================
auth.onAuthStateChanged((user) => {
    const loginScreen = document.getElementById('login-screen');
    const mainApp = document.getElementById('main-app');

    if (user) {
        loginScreen.classList.add('hidden');
        mainApp.classList.remove('hidden');
        startFolkSync(user.uid);

        setTimeout(() => {
            if ('Notification' in window && Notification.permission === 'default') {
                const modal = document.getElementById('notif-modal');
                if (modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); }
            }
        }, 2000);
    } else {
        // Handle Logout
        loginScreen.classList.remove('hidden');
        mainApp.classList.add('hidden');
    }
});

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

            if (data.address) {
                window.userAddress = data.address;
                const addrInput = document.getElementById('input-address');
                const cartAddr = document.getElementById('cart-address-display');
                if (addrInput) addrInput.value = data.address;
                if (cartAddr) cartAddr.innerText = data.address + (data.addressDetail ? ` (${data.addressDetail})` : '');
            }

            if (data.phone) {
                window.userPhone = data.phone;
                var bioPhone = document.getElementById('bio-phone');
                if (bioPhone) bioPhone.value = data.phone.replace('+62', '');
            }

            // Check GoPay Binding Status
            if (data.isGopayLinked) {
                const gopayText = document.getElementById('gopay-status-text');
                const gopayBtn = document.getElementById('btn-bind-gopay');
                if (gopayText) {
                    gopayText.innerText = "Terhubung: +62" + (data.gopayPhone || data.phone.replace(/[^0-9]/g, ''));
                    gopayText.classList.add('text-green-600');
                }
                if (gopayBtn) {
                    gopayBtn.innerText = "Putuskan";
                    gopayBtn.className = "bg-red-100 text-red-500 px-4 py-2 rounded-xl text-[10px] font-bold shadow-md active:scale-95 transition-all";
                    gopayBtn.onclick = unbindGoPay;
                }
            }

            var bioName = document.getElementById('bio-name');
            var bioEmail = document.getElementById('bio-email');
            if (bioName) bioName.value = data.customName || data.username || '';
            if (bioEmail) bioEmail.value = data.email || '';

            var profilePhotoDisplay = document.getElementById('profile-photo-display');
            var profileDisplayName = document.getElementById('profile-display-name');
            if (profilePhotoDisplay && data.photo) profilePhotoDisplay.src = data.photo;
            if (profileDisplayName) profileDisplayName.innerText = currentUser;

            if (data.caffeineShownMilestones) caffeineShownMilestones = data.caffeineShownMilestones;

            checkQuestStatus(data.lastQuestDate);
            updateMemberUI();
            checkPointsReset(data);
            loadUserVouchers();
        }
    });
}


window.switchAuthTab = function (tab) {
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const btnLogin = document.getElementById('tab-btn-login');
    const btnRegister = document.getElementById('tab-btn-register');

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
    auth.signInWithPopup(provider).then((result) => {
        const userRef = db.collection('users').doc(result.user.uid);
        userRef.get().then((doc) => {
            if (!doc.exists) {
                userRef.set({
                    username: result.user.displayName || result.user.email.split('@')[0],
                    email: result.user.email,
                    photo: result.user.photoURL,
                    points: 0,
                    caffeine: 0,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        });
    });
};

window.loginWithEmail = function () {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    auth.signInWithEmailAndPassword(email, password).catch(err => alert("Login gagal: " + err.message));
};

window.registerWithEmail = async function () {
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const phoneRaw = document.getElementById('reg-phone').value.trim();
    if (!email || !password || !phoneRaw) return alert('Isi semua data!');

    let phone = '+62' + phoneRaw.replace(/[\s\-]/g, '').replace(/^0+/, '');

    try {
        const result = await auth.createUserWithEmailAndPassword(email, password);
        await db.collection('users').doc(result.user.uid).set({
            username: email.split('@')[0],
            customName: email.split('@')[0],
            email: result.user.email,
            phone: phone,
            points: 0,
            caffeine: 0,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (err) { alert(err.message); }
};

window.logout = function () {
    if (confirm("Yakin mau keluar?")) {
        auth.signOut().then(() => location.reload());
    }
};

// ==========================================
// 5. CAFFEINE & TIER SYSTEM
// ==========================================
function updateMemberUI() {
    var card = document.getElementById('member-card');
    var tierName = document.getElementById('tier-name');
    var bar = document.getElementById('level-bar');
    var dispPoints = document.getElementById('display-points');

    if (!card || !tierName || !bar || !dispPoints) return;

    // Definisikan oldTier secara aman
    var oldTier = window.currentTierStatus || "";
    var newTier = "";
    var cardBase = 'shimmer-card member-card-bronze rounded-[2rem] pt-10 px-6 pb-4 shadow-2xl relative h-52 flex flex-col justify-between transition-all duration-500 mb-6';

    dispPoints.innerText = userPoints.toLocaleString();

    // Logika Ganti Tier
    if (userPoints >= 801) {
        card.className = 'member-card-platinum ' + cardBase;
        newTier = 'FOLK PLATINUM 💎';
    } else if (userPoints >= 501) {
        card.className = 'member-card-gold ' + cardBase;
        newTier = 'FOLK GOLD 👑';
    } else if (userPoints >= 301) {
        card.className = 'member-card-silver ' + cardBase;
        newTier = 'FOLK SILVER ⚔️';
    } else {
        card.className = 'member-card-bronze ' + cardBase;
        newTier = 'FOLK BRONZE 🥉';
    }

    tierName.innerText = newTier;

    // Gunakan oldTier yang sudah didefinisikan
    if (oldTier !== "" && oldTier !== newTier) {
        grantTierVoucher(newTier);
    }
    window.currentTierStatus = newTier;
}

var caffeineMilestones = [
    { mg: 100, icon: '☕', title: 'Starter Pack!', msg: 'Ini baru pemanasan, lanjutin ngopinya!' },
    { mg: 300, icon: '🔥', title: 'Kopi Warrior!', msg: 'Wah, kamu emang pengkopi handal!' },
    { mg: 500, icon: '⚡', title: 'Caffeine Addict!', msg: 'Hati-hati, jantungmu sudah deg-degan nih! 💓' },
    { mg: 800, icon: '🚀', title: 'Overdrive Mode!', msg: 'Kamu resmi jadi mesin kopi berjalan!' },
    { mg: 1000, icon: '👑', title: 'KOPI LEGEND!', msg: 'Kamu raja kopi sejati! 🏆' }
];

function checkCaffeineMilestone(mg) {
    for (var i = caffeineMilestones.length - 1; i >= 0; i--) {
        if (mg >= caffeineMilestones[i].mg && !caffeineShownMilestones[caffeineMilestones[i].mg]) {
            caffeineShownMilestones[caffeineMilestones[i].mg] = true;
            if (auth.currentUser) db.collection('users').doc(auth.currentUser.uid).update({ caffeineShownMilestones: caffeineShownMilestones });
            (function (milestone) { setTimeout(function () { showCaffeineMilestonePopup(milestone); }, 800); })(caffeineMilestones[i]);
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
    popup.innerHTML = `
        <div class="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl max-w-sm w-full text-center">
            <div class="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center text-5xl bg-yellow-100">${milestone.icon}</div>
            <h3 class="text-xl font-black mb-2">${milestone.title}</h3>
            <p class="mb-6">${milestone.msg}</p>
            <button onclick="this.parentElement.parentElement.remove()" class="bg-orange-500 text-white px-8 py-3 rounded-2xl font-bold">Mantap! 🎉</button>
        </div>
    `;
    document.body.appendChild(popup);
}

// ==========================================
// 6. QUEST & VOUCHERS
// ==========================================
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
                if (window.supabaseClient) window.insertAnnouncement("⚔️ " + currentUser + " berhasil menyelesaikan Daily Quest (+50 Poin)!");
            });
        }
    });
};

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

window.activeVoucher = null;
window.userVouchers = [];

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
            if (grantedTiers.includes(tierName)) return;

            if (window.supabaseClient) window.insertAnnouncement("👑 " + currentUser + " naik peringkat menjadi " + tierName + "!");
            var v = tierVoucherMap[tierName];
            var voucher = { tier: tierName, discount: v.discount, label: v.label, used: false, createdAt: new Date().toISOString() };

            db.collection('users').doc(user.uid).collection('vouchers').add(voucher).then(function () {
                db.collection('users').doc(user.uid).update({ grantedTiers: firebase.firestore.FieldValue.arrayUnion(tierName) });
                showToast('🎫 Selamat! Kamu dapat voucher ' + v.label + '!');
            });
        }
    });
}

function loadUserVouchers() {
    var user = auth.currentUser;
    if (!user) return;
    window.userVouchers = [];
    db.collection('users').doc(user.uid).collection('vouchers').where('used', '==', false).get().then(function (snap) {
        snap.forEach(function (doc) { window.userVouchers.push({ id: doc.id, source: 'tierup', ...doc.data() }); });
        updateVoucherBtnBadge();
    });
}

function updateVoucherBtnBadge() {
    var btnText = document.getElementById('voucher-btn-text');
    if (btnText) btnText.innerText = window.userVouchers.length > 0 ? 'Pakai Voucher (' + window.userVouchers.length + ' tersedia)' : 'Tidak ada voucher';
}

window.toggleVoucherPanel = function () {
    var panel = document.getElementById('voucher-panel');
    if (!panel) return;
    panel.classList.toggle('hidden');
    if (!panel.classList.contains('hidden')) loadVoucherPanel();
};

function loadVoucherPanel() {
    var panel = document.getElementById('voucher-panel');
    if (!panel) return;
    if (window.userVouchers.length === 0) {
        panel.innerHTML = '<p class="text-xs text-slate-400 text-center py-3">Voucher kosong!</p>';
        return;
    }
    panel.innerHTML = window.userVouchers.map(function (v) {
        var isActive = window.activeVoucher && window.activeVoucher.id === v.id;
        var btnClass = isActive ? 'bg-green-500 text-white' : 'bg-white border border-amber-500 text-amber-600';
        return `
        <div class="flex items-center justify-between p-3 rounded-xl border ${btnClass}">
            <div><p class="text-xs font-bold">${v.label}</p><p class="text-[10px]">Diskon Rp ${v.discount.toLocaleString()}</p></div>
            <button onclick="${isActive ? 'removeVoucher()' : `applyVoucher('${v.id}', ${v.discount}, '${v.label}', '${v.source}')`}" class="px-3 py-1.5 rounded-lg text-[10px] font-bold shadow-sm border border-slate-200">${isActive ? '❌ Batal' : 'Gunakan'}</button>
        </div>`;
    }).join('');
}

window.applyVoucher = function (id, discount, label, source) {
    window.activeVoucher = { id: id, discount: discount, label: label, source: source || 'tierup' };
    showToast('🎫 Voucher digunakan!');
    renderCart();
};

window.removeVoucher = function () {
    window.activeVoucher = null;
    showToast('❌ Voucher dibatalkan');
    renderCart();
};

function checkPointsReset(userData) {
    var user = auth.currentUser;
    if (!user) return;
    var lastReset = userData.lastPointsReset;
    var now = new Date();
    if (!lastReset) {
        db.collection('users').doc(user.uid).update({ lastPointsReset: now.toISOString() });
        return;
    }
    var diffDays = (now - new Date(lastReset)) / (1000 * 60 * 60 * 24);
    if (diffDays >= 90) {
        db.collection('users').doc(user.uid).update({ points: 0, lastPointsReset: now.toISOString() })
            .then(() => showToast('🔄 Poin telah direset (periode 3 bulan).'));
    }
}

// ==========================================
// 7. PRODUCT MODAL & CART
// ==========================================
window.openProductModal = function (name, price, mg, cost, image, desc, type) {
    if (!window.isStoreOpen) {
        showToast("⛔ Maaf, Toko Sedang Tutup!");
        return;
    }

    currentProduct = { name, price, mg, cost, image, type };
    window.modalQty = 1;
    currentSugar = 'Normal';

    document.getElementById('pm-image').src = image;
    document.getElementById('pm-name').innerText = name;
    document.getElementById('pm-price').innerText = 'Rp ' + price.toLocaleString();
    document.getElementById('pm-qty').innerText = '1';

    // Reset Sugar UI
    document.querySelectorAll('.sugar-btn').forEach(b => {
        b.classList.remove('active', 'border-blue-500', 'bg-blue-50', 'text-blue-600');
        b.classList.add('border-slate-100', 'text-slate-500');
    });
    const defSugar = document.getElementById('sugar-normal');
    if (defSugar) {
        defSugar.classList.add('active', 'border-blue-500', 'bg-blue-50', 'text-blue-600');
        defSugar.classList.remove('border-slate-100', 'text-slate-500');
    }

    const sweetnessSection = document.getElementById('opt-sweetness');
    if (sweetnessSection) sweetnessSection.style.display = type === 'non-coffee' ? 'none' : 'block';

    updateModalTotal();
    document.getElementById('product-modal').classList.remove('hidden');
    document.getElementById('product-modal').classList.add('flex');
};

function updateModalTotal() {
    if (!currentProduct) return;
    const total = currentProduct.price * window.modalQty;
    const totalEl = document.getElementById('pm-total');
    if (totalEl) totalEl.innerText = 'Rp ' + total.toLocaleString();
}

window.updateModalQty = function (d) {
    window.modalQty += d;
    if (window.modalQty < 1) window.modalQty = 1;
    document.getElementById('pm-qty').innerText = window.modalQty;
    updateModalTotal();
};

window.closeProductModal = function () {
    const modal = document.getElementById('product-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
};

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
};

window.confirmAddToCart = function () {
    if (!currentProduct) return;
    const note = currentProduct.type !== 'non-coffee' ? `Sugar: ${currentSugar}` : '';

    const existingItem = cart.find(i => i.name === currentProduct.name && i.note === note);
    if (existingItem) {
        existingItem.quantity += window.modalQty;
    } else {
        cart.push({
            name: currentProduct.name,
            price: currentProduct.price,
            mg: currentProduct.mg,
            cost: currentProduct.cost,
            quantity: window.modalQty,
            note: note
        });
    }

    showToast(currentProduct.name + " ditambahkan!");
    renderCart();
    closeProductModal();
};

function renderCart() {
    var list = document.getElementById('cart-items');
    if (!list) return;
    var total = 0;
    list.innerHTML = cart.length ? '' : '<p class="text-center text-slate-400 text-xs py-10 italic">Keranjang kosong...</p>';

    cart.forEach((item, index) => {
        total += item.price * item.quantity;
        const noteDisplay = item.note ? `<p class="text-[10px] text-slate-400 italic">${item.note}</p>` : '';
        list.innerHTML += `
        <div class="bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4 mb-3">
            <div class="flex-1">
                <h4 class="font-extrabold text-sm dark:text-white">${item.name}</h4>
                ${noteDisplay}
                <p class="text-blue-600 font-bold text-xs">Rp ${(item.price * item.quantity).toLocaleString()}</p>
            </div>
            <div class="flex items-center bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-1.5 rounded-2xl">
                <button onclick="updateQty(${index}, -1)" class="w-8 h-8 bg-white dark:bg-slate-700 text-slate-800 dark:text-white font-bold rounded-xl shadow-sm">-</button>
                <span class="px-4 text-sm font-black text-slate-900 dark:text-white">${item.quantity}</span>
                <button onclick="updateQty(${index}, 1)" class="w-8 h-8 bg-blue-600 text-white font-bold rounded-xl shadow-sm">+</button>
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

// ==========================================
// 8. PAYMENT & TRANSACTION (MIDTRANS GOPAY/QRIS ONLY)
// ==========================================
window.openPayment = function () {
    if (!cart.length) return showToast("Keranjang kosong!");
    const modal = document.getElementById('payment-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        setTimeout(() => {
            modal.classList.remove('opacity-0', 'pointer-events-none', 'scale-95');
            modal.classList.add('opacity-100', 'scale-100');
        }, 10);
    }
};

window.closePaymentModal = function () {
    const modal = document.getElementById('payment-modal');
    if (modal) {
        modal.classList.add('hidden', 'opacity-0', 'pointer-events-none');
        modal.classList.remove('flex', 'opacity-100');
    }
};

async function submitTransaction(method) {
    const user = auth.currentUser;
    if (!user) return;

    var orderDetails = cart.map(item => item.quantity + "x " + item.name).join(", ");
    var broadcastMsg = "🛒 " + currentUser + " memesan " + orderDetails + " via " + method + "!";

    let totalOrder = cart.reduce((a, b) => a + (b.price * b.quantity), 0);
    let totalCaffeine = cart.reduce((a, b) => a + (b.mg * b.quantity), 0);
    let totalCups = cart.reduce((a, b) => a + b.quantity, 0);

    communityGoal += totalCups;
    localStorage.setItem('folkpresso_community_goal', communityGoal);
    updateGoalUI();

    db.collection("users").doc(user.uid).update({
        points: firebase.firestore.FieldValue.increment(Math.floor(totalOrder / 1000)),
        caffeine: firebase.firestore.FieldValue.increment(totalCaffeine)
    });

    const payload = cart.map(item => ({
        date: new Date().toISOString().split('T')[0],
        full_time: new Date().toLocaleString('id-ID'),
        name: item.name,
        type: 'in',
        qty: item.quantity,
        unit_price: item.price,
        unit_cost: item.cost || 0,
        total: item.price * item.quantity,
        method: method,
        payment_status: 'success',
        user_id: user.uid
    }));

    if (window.supabaseClient) {
        try {
            if (window.activeVoucher && window.activeVoucher.source === 'tierup') {
                db.collection('users').doc(user.uid).collection('vouchers').doc(window.activeVoucher.id).update({ used: true });
            }
            await window.supabaseClient.from('transactions').insert(payload);
            await window.insertAnnouncement(broadcastMsg);
        } catch (err) { console.error("❌ Error Supabase:", err); }
    }

    showToast("✅ Pesanan berhasil via " + method);
    cart = [];
    window.activeVoucher = null;
    renderCart();
    showPage('home');
}

async function savePendingTransaction(orderId, method, total) {
    const user = auth.currentUser;
    if (!user) return;

    // Masukkan SEMUA data biar sinkron sama tabel transactions lu
    const payload = cart.map(item => ({
        order_id: orderId,
        date: new Date().toISOString().split('T')[0],
        full_time: new Date().toLocaleString('id-ID'), // Tambahkan waktu lengkap
        name: item.name,
        type: 'in', // Kategori masuk
        qty: item.quantity,
        unit_price: item.price,
        unit_cost: item.cost || 0,
        total: item.price * item.quantity,
        method: method,
        payment_status: 'pending',
        user_id: user.uid
    }));

    const { error } = await window.supabaseClient.from('transactions').insert(payload);
    if (error) console.error("❌ Gagal simpan:", error.message);
}

// ==========================================
// 9. SUPABASE REALTIME & NOTIFICATIONS
// ==========================================
window.insertAnnouncement = async function (message) {
    if (!window.supabaseClient) return;
    try {
        var tempId = "msg_" + Date.now();
        var { error } = await window.supabaseClient.from('announcements').insert([{ message: message, timestamp: Date.now() }]);
        if (!error) window.displayMarqueeMessage(message, Date.now(), tempId);
    } catch (e) { console.error(e); }
};

window.displayMarqueeMessage = function (message, timestamp, id) {
    var marqueeEl = document.querySelector('.animate-marquee') || document.getElementById('marquee-text');
    if (!marqueeEl) return;
    if (id && window.shownMessageIds.has(id)) return;
    if (id) window.shownMessageIds.add(id);

    if (activeMessages.some(m => m.message === message)) return;
    activeMessages.push({ message: message, timestamp: timestamp || Date.now() });
    renderMarqueeMessages();
};

function renderMarqueeMessages() {
    var textEl = document.getElementById('marquee-text') || document.querySelector('.animate-marquee');
    if (!textEl) return;
    var container = textEl.parentElement;
    if (container.getAttribute('data-status') === 'playing') return;

    if (activeMessages.length > 0) {
        container.setAttribute('data-status', 'playing');
        activeMessages.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        var msg = activeMessages.shift();

        container.innerHTML = '';
        var newEl = document.createElement('div');
        newEl.id = 'marquee-text';
        newEl.className = 'text-xs font-bold text-blue-200 tracking-wide';
        newEl.style.whiteSpace = 'nowrap';
        newEl.innerHTML = `<span class="bg-yellow-400 text-blue-900 px-2 rounded-md font-black">INFO:</span> ${msg.message}`;
        container.appendChild(newEl);

        var anim = newEl.animate([{ transform: 'translateX(100%)' }, { transform: 'translateX(-100%)' }], { duration: 15000, iterations: 1 });
        anim.onfinish = function () { container.setAttribute('data-status', 'idle'); renderMarqueeMessages(); };
    } else {
        container.innerHTML = '';
        var defEl = document.createElement('div');
        defEl.className = 'animate-marquee text-xs font-bold text-blue-200 tracking-wide';
        defEl.innerHTML = defaultMarquee;
        container.appendChild(defEl);
        container.setAttribute('data-status', 'idle');
    }
}

// Polling & Realtime Init
setTimeout(() => {
    if (window.supabaseClient) {
        // Polling Announcements
        window.lastAnnouncementTs = Date.now();
        setInterval(async function () {
            try {
                var iso = new Date(window.lastAnnouncementTs + 1).toISOString();
                var { data } = await window.supabaseClient.from('announcements').select('*').gt('created_at', iso).order('created_at', { ascending: true }).limit(5);
                if (data && data.length > 0) {
                    data.forEach(row => {
                        var ts = new Date(row.created_at).getTime();
                        window.displayMarqueeMessage(row.message, ts, row.id);
                        if (ts > window.lastAnnouncementTs) window.lastAnnouncementTs = ts;
                    });
                }
            } catch (e) { }
        }, 2000);

        // Listen for Broadcasts / Status
        window.supabaseClient.channel('public:broadcast_notifications')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'broadcast_notifications' }, payload => {
                const data = payload.new;
                if (data.title === 'SYSTEM_STORE_STATUS') {
                    window.isStoreOpen = (data.message === 'OPEN');
                    defaultMarquee = window.isStoreOpen ? `🔥 Fuel Your Day With a Perfect Blend! &nbsp;&nbsp; •  &nbsp;&nbsp; ☕ Folkpresso Open!` : `🔥 Fuel Your Day With a Perfect Blend! &nbsp;&nbsp; •  &nbsp;&nbsp; ☕ Folkpresso Closed!`;
                    renderMarqueeMessages();
                    const statusBadge = document.getElementById('store-status-badge');
                    if (statusBadge) {
                        if (!window.isStoreOpen) {
                            statusBadge.classList.remove('hidden');
                            statusBadge.innerHTML = '<span class="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span> <span class="text-[9px] font-bold text-red-500 ml-1">TUTUP</span>';
                        } else { statusBadge.classList.add('hidden'); }
                    }
                } else {
                    // Update daftar notif & badge
                    if (window.displayMarqueeMessage) {
                        window.displayMarqueeMessage("📢 " + data.title + " - " + data.message, Date.now(), data.id);
                    }
                    showToast("📩 Pesan Baru: " + data.title);
                }
            }).subscribe();

        loadOrderHistory();
    }
}, 2000);

// Popup Izin Notifikasi Web
window.handleSubscribe = async function () {
    const modal = document.getElementById('notif-modal');
    if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
    try {
        const user = auth.currentUser;
        const uid = user ? user.uid : 'Guest-' + Date.now();
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: PUBLIC_VAPID_KEY });
        const { error } = await window.supabaseClient.from('user_subscriptions').insert([{ subscription: subscription, user_id: uid }]);
        if (error) throw error;
        showToast('✅ Notifikasi Aktif!');
    } catch (err) { console.error('Gagal daftar notif:', err); }
}

window.closeNotifModal = function () {
    const modal = document.getElementById('notif-modal');
    if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
}

// ==========================================
// 10. WRAPPED & UI UTILS
// ==========================================
window.showWrapped = function () {
    const user = auth.currentUser;
    if (!user) return showToast("Login dulu buat liat Wrapped!");

    // Perhitungan Cups (Setiap 100mg kafein = 1 cup)
    const totalCups = Math.floor(userCaffeine / 100);

    // Update data ke Modal Wrapped
    document.getElementById('wrap-total-cups').innerText = totalCups;
    document.getElementById('wrap-caffeine').innerText = userCaffeine.toLocaleString();

    // Munculkan Modal Wrapped (Cek z-index di HTML harus tinggi)
    const modal = document.getElementById('wrapped-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        console.log("🎁 Wrapped Opened!");
    }
};
window.nextSlide = function (slideNum) {
    document.querySelectorAll('.wrapped-slide').forEach(el => el.classList.add('hidden'));
    document.getElementById('slide-' + slideNum).classList.remove('hidden');
};

window.closeWrapped = function () {
    document.getElementById('wrapped-modal').classList.add('hidden');
    document.getElementById('wrapped-modal').classList.remove('flex');
};

window.showPage = function (id) {
    document.querySelectorAll('.app-page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(id + '-page');
    if (target) target.classList.add('active');

    document.querySelectorAll('.bottom-nav-item').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById('btn-' + id);
    if (btn) btn.classList.add('active');

    if (id === 'cart') renderCart();
    if (id === 'profile') {
        updateMemberUI();
        loadNotifications();
        loadOrderHistory();
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

window.toggleDark = function () {
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('folkpresso_dark_mode', document.documentElement.classList.contains('dark'));
};
if (localStorage.getItem('folkpresso_dark_mode') === 'true') document.documentElement.classList.add('dark');

function updateGoalUI() {
    var goalPercent = Math.min((communityGoal / 20) * 100, 100);
    const bar = document.getElementById('goal-bar');
    const txt = document.getElementById('goal-counter');
    if (bar) bar.style.width = goalPercent + "%";
    if (txt) txt.innerText = communityGoal + " / 20 Cups";
}

window.saveBiodata = function () {
    const user = auth.currentUser;
    if (!user) return showToast('Silakan login!');
    const name = document.getElementById('bio-name').value.trim();
    const address = document.getElementById('input-address').value.trim();
    if (!name) return showToast('Nama tidak boleh kosong!');
    db.collection('users').doc(user.uid).update({ customName: name, address: address }).then(() => {
        window.userAddress = address;
        showToast('✅ Biodata disimpan!');
    });
};

window.getGPSAddress = function () {
    var addrInput = document.getElementById('input-address');
    if (!navigator.geolocation) return showToast('❌ GPS tidak didukung');
    navigator.geolocation.getCurrentPosition(pos => {
        var lat = pos.coords.latitude; var lon = pos.coords.longitude;
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`)
            .then(r => r.json()).then(data => {
                if (data && data.address) {
                    var finalAddr = data.display_name;
                    if (addrInput) addrInput.value = finalAddr;
                    window.userAddress = finalAddr;
                    showToast('📍 Alamat Ditemukan!');
                }
            });
    }, err => showToast('❌ Gagal melacak lokasi.'), { enableHighAccuracy: true });
};

async function loadNotifications() {
    var container = document.getElementById('notif-list');
    if (!container) return;
    if (window.supabaseClient) {
        const { data } = await window.supabaseClient.from('broadcast_notifications').select('*').order('created_at', { ascending: false }).limit(20);
        if (data && data.length > 0) {
            container.innerHTML = '';
            data.filter(n => n.title !== 'SYSTEM_STORE_STATUS').forEach(n => {
                container.innerHTML += `<div class="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm mb-2"><h4 class="font-bold text-sm">${n.title}</h4><p class="text-xs">${n.message}</p></div>`;
            });
        }
    }
}

window.loadOrderHistory = async function () {
    var container = document.getElementById('order-history-list');
    if (!container || !window.supabaseClient || !auth.currentUser) return;
    const { data } = await window.supabaseClient.from('transactions').select('*').eq('user_id', auth.currentUser.uid).order('id', { ascending: false }).limit(20);
    if (data && data.length > 0) {
        container.innerHTML = '';
        data.forEach(tx => {
            container.innerHTML += `<div class="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl mb-2"><h5 class="font-bold text-xs">${tx.name} (${tx.qty}x)</h5><span class="text-[11px] text-blue-600 font-bold">Rp ${(tx.total || 0).toLocaleString()}</span> <span class="text-[10px] text-slate-500">${tx.method}</span></div>`;
        });
    }
};

window.installPWA = async () => {
    if (window.deferredPrompt) {
        window.deferredPrompt.prompt();
        window.deferredPrompt = null;
    } else showToast("Aplikasi sudah terinstall / iOS gunakan tombol Share.");
};

// ==========================================
// 11. SINKRONISASI STATUS TOKO & NOTIF BUKA/TUTUP
// ==========================================
async function syncInitialStoreStatus() {
    if (!window.supabaseClient) return;
    try {
        // Ambil status terakhir dari Supabase
        const { data } = await window.supabaseClient
            .from('broadcast_notifications')
            .select('*')
            .eq('title', 'SYSTEM_STORE_STATUS')
            .order('id', { ascending: false })
            .limit(1);

        if (data && data.length > 0) {
            window.isStoreOpen = (data[0].message === 'OPEN');
            updateStoreUI();
        }
    } catch (err) { console.error("Gagal ambil status toko:", err); }
}

function updateStoreUI() {
    // 1. Update teks Marquee
    defaultMarquee = window.isStoreOpen
        ? `🔥 Fuel Your Day With a Perfect Blend! &nbsp;&nbsp; •  &nbsp;&nbsp; ☕ Folkpresso Open!`
        : `🔥 Fuel Your Day With a Perfect Blend! &nbsp;&nbsp; •  &nbsp;&nbsp; ☕ Folkpresso Closed!`;

    if (typeof renderMarqueeMessages === 'function') renderMarqueeMessages();

    // 2. Update Tulisan "TUTUP" warna merah di pojok kanan atas
    const statusBadge = document.getElementById('store-status-badge');
    if (statusBadge) {
        if (!window.isStoreOpen) {
            statusBadge.classList.remove('hidden');
            statusBadge.innerHTML = '<span class="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span> <span class="text-[9px] font-bold text-red-500 ml-1">TUTUP</span>';
        } else {
            statusBadge.classList.add('hidden');
        }
    }
}

// Panggil fungsinya 1 detik setelah aplikasi dibuka
setTimeout(syncInitialStoreStatus, 1000);

// --- MODIFIKASI REALTIME LISTENER BIAR ADA NOTIF POP-UP ---
if (window.supabaseClient) {
    window.supabaseClient.channel('public:broadcast_notifications')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'broadcast_notifications' }, payload => {
            const data = payload.new;
            if (data.title === 'SYSTEM_STORE_STATUS') {
                window.isStoreOpen = (data.message === 'OPEN');
                updateStoreUI();
                // MUNCULIN NOTIFIKASI TOKO BUKA/TUTUP DI LAYAR PELANGGAN
                showToast(window.isStoreOpen ? "🟢 Hore! Folkpresso Sekarang BUKA!" : "🔴 Maaf, Folkpresso Sekarang TUTUP!");
            }
        }).subscribe();
}

// === LOGIKA AUTO BANNER 3 SLIDE ===
let currentSlide = 0;
function startBannerAutoSlide() {
    const slider = document.getElementById('banner-slider');
    const dots = document.querySelectorAll('.banner-dot');
    if (!slider || dots.length === 0) return;

    setInterval(() => {
        currentSlide = (currentSlide + 1) % 3; // Loop 0, 1, 2
        slider.style.transform = `translateX(-${currentSlide * 100}%)`;

        // Update dots
        dots.forEach((dot, i) => {
            dot.style.opacity = i === currentSlide ? '1' : '0.4';
            dot.style.width = i === currentSlide ? '16px' : '8px'; // Efek aktif memanjang
        });
    }, 5000); // Ganti tiap 5 detik
}

// Pastikan fungsi ini dipanggil saat web dibuka
window.addEventListener('load', () => {
    startBannerAutoSlide();
});

// === JARING PENANGKAP STATUS MIDTRANS (TARUH DI PALING BAWAH SCRIPT.JS) ===
window.addEventListener('load', async () => {
    // 1. Tangkap data dari link URL setelah Midtrans nge-redirect balik ke web
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('order_id');
    const txStatus = urlParams.get('transaction_status');

    // 2. Kalau ada order_id dan statusnya lunas (settlement/capture)
    if (orderId && (txStatus === 'settlement' || txStatus === 'capture')) {
        if (!window.supabaseClient) return;

        try {
            // Cek dulu ke database, apakah transaksi ini masih pending?
            const { data: txData, error } = await window.supabaseClient
                .from('transactions')
                .select('*')
                .eq('order_id', orderId);

            // Kalau masih pending, kita eksekusi jadi SUCCESS
            if (txData && txData.length > 0 && txData[0].payment_status === 'pending') {

                // A. Ubah status di Supabase jadi success
                await window.supabaseClient
                    .from('transactions')
                    .update({ payment_status: 'success' })
                    .eq('order_id', orderId);

                // B. Hitung poin untuk user (Total belanja dibagi 1000)
                let totalBelanja = txData.reduce((sum, item) => sum + (item.total || 0), 0);
                let pointsEarned = Math.floor(totalBelanja / 1000);

                if (auth.currentUser) {
                    db.collection("users").doc(auth.currentUser.uid).update({
                        points: firebase.firestore.FieldValue.increment(pointsEarned)
                    });
                }

                showToast("✅ Pembayaran Lunas! Kamu dapat +" + pointsEarned + " Poin");

                // C. Bersihkan URL biar sistem nggak nge-update terus kalau halaman di-refresh
                window.history.replaceState({}, document.title, window.location.pathname);

                // D. Buka riwayat pesanan biar pelanggan bisa langsung lihat
                showPage('profile');
                setTimeout(() => {
                    if (typeof loadOrderHistory === 'function') loadOrderHistory();
                }, 1000);
            } else {
                // Kalau udah success dari awal, cukup bersihin URL aja
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        } catch (err) {
            console.error("Gagal konfirmasi pembayaran:", err);
        }
    }
    // Kalau pelanggan batalin pembayaran di tengah jalan
    else if (orderId && (txStatus === 'cancel' || txStatus === 'deny')) {
        showToast("❌ Pembayaran Dibatalkan");
        window.history.replaceState({}, document.title, window.location.pathname);
    }
});

// === SISTEM KONFIRMASI MANUAL UNTUK SANDBOX TESTING ===

// === SISTEM KONFIRMASI MANUAL (VERSI ALARM ADMIN AKTIF) ===
function showPaymentConfirmation(orderId, finalAmount, method) {
    var popup = document.getElementById('universal-popup');
    var content = document.getElementById('popup-content');
    if (!popup || !content) return;

    popup.classList.remove('hidden');
    popup.classList.add('flex');

    setTimeout(() => {
        content.classList.remove('scale-50', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 10);

    document.getElementById('popup-icon').innerText = '⏳';
    document.getElementById('popup-title').innerText = 'Menunggu Pembayaran';
    document.getElementById('popup-message').innerText = 'Silakan selesaikan pembayaran di tab GoPay yang baru terbuka. Jika sudah sukses, klik tombol di bawah.';

    // Kirim data 'method' ke tombol
    document.getElementById('popup-actions').innerHTML = `
        <button onclick="confirmManualPayment('${orderId}', ${finalAmount}, '${method}')" class="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-2xl shadow-lg mb-3 active:scale-95 transition-all">✅ Saya Sudah Bayar</button>
        <button onclick="closeUniversalPopup()" class="w-full bg-slate-100 text-slate-500 font-bold py-3.5 rounded-2xl active:scale-95 transition-all">Nanti Saja</button>
    `;
}
// === FIX: MENCEGAH CRASH SAAT KLIK KONFIRMASI ===
// === 1. FUNGSI YANG HILANG (Mencegah Crash Saat Bayar GoPay) ===
window.closeUniversalPopup = function () {
    const popup = document.getElementById('universal-popup');
    const content = document.getElementById('popup-content');
    if (content) {
        content.classList.remove('scale-100', 'opacity-100');
        content.classList.add('scale-50', 'opacity-0');
    }
    setTimeout(() => {
        if (popup) {
            popup.classList.add('hidden');
            popup.classList.remove('flex');
        }
    }, 300);
};

// === 2. FUNGSI KONFIRMASI (Ini yang bikin data MASUK ke Dashboard Admin) ===
window.confirmManualPayment = async function (orderId, finalAmount, method) {
    if (typeof closeUniversalPopup === 'function') closeUniversalPopup();

    // Pastikan QRIS modal juga tertutup kalau dari jalur QRIS
    const qrisModal = document.getElementById('qris-modal');
    if (qrisModal) qrisModal.classList.add('hidden');

    showToast("⏳ Mengirim data ke Admin...");

    try {
        // Hapus data pending biar gak dobel
        await window.supabaseClient.from('transactions').delete().eq('order_id', orderId);

        // Masukkan data SUCCESS
        const payload = cart.map(item => ({
            order_id: orderId,
            date: new Date().toISOString().split('T')[0],
            full_time: new Date().toLocaleString('id-ID'),
            name: item.name,
            type: 'in',
            qty: item.quantity,
            unit_price: item.price,
            unit_cost: item.cost || 0,
            total: item.price * item.quantity,
            method: method,
            payment_status: 'success', // <--- INI YANG DICARI ADMIN LU
            user_id: auth.currentUser ? auth.currentUser.uid : 'guest'
        }));

        const { error } = await window.supabaseClient.from('transactions').insert(payload);
        if (error) throw error;

        // Notif ke semua user & Tambah poin
        await window.insertAnnouncement(`🛒 ${(currentUser || 'Guest')} memesan via ${method}!`);
        if (auth.currentUser) {
            db.collection("users").doc(auth.currentUser.uid).update({
                points: firebase.firestore.FieldValue.increment(Math.floor(finalAmount / 1000))
            });
        }

        showToast("✅ Pembayaran Berhasil!");
        cart = [];
        renderCart();

        // Redirect ke Home
        showPage('home');

        // Opsional: Buka history setelah delay sedikit
        setTimeout(() => {
            // Bisa tampilkan notif atau apa pun
        }, 1000);
    } catch (e) {
        console.error(e);
        alert("❌ Gagal sinkronisasi: " + e.message);
    }
};

// === 3. FUNGSI PEMBAYARAN MIDTRANS ASLI (GoPay & QRIS Dinamis) ===
// === 3. FUNGSI PEMBAYARAN MIDTRANS CORE API (GoPay & QRIS) ===
window.processPayment = async function (method) {
    if (!auth.currentUser) return showToast("Login dulu ya, bb!");
    if (cart.length === 0) return showToast("Keranjang kosong!");

    // Generate Order ID Unik
    const orderId = 'FP-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    // Hitung Total (Bulatkan biar gak ada desimal)
    let subtotal = cart.reduce((a, b) => a + (Math.round(b.price) * Math.round(b.quantity)), 0);
    let potentialDiscount = window.activeVoucher ? Math.min(Math.round(window.activeVoucher.discount), subtotal) : 0;

    // Pastikan minimal bayar Rp 1 (Syarat Midtrans)
    let finalAmount = subtotal - potentialDiscount;
    if (finalAmount < 1) {
        finalAmount = 1;
        potentialDiscount = subtotal - 1; // Kurangi diskon biar total tetap 1
    }

    showToast('⏳ Menghubungkan ke Midtrans...');

    // PENTING: Karena generic 'qris' channel belum aktif, kita paksa pakai 'gopay'
    // GoPay Core API juga support QR Code (QRIS Dinamis GoPay)
    const paymentType = 'gopay';

    // Persiapkan Data untuk Backend (Edge Function Core API)
    const payloadData = {
        payment_type: paymentType,
        transaction_details: {
            order_id: orderId,
            gross_amount: finalAmount
        },
        item_details: cart.map(item => ({
            id: item.name.substring(0, 50),
            price: Math.round(item.price),
            quantity: item.quantity,
            name: item.name.substring(0, 50)
        })),
        customer_details: {
            first_name: (currentUser || "Customer").substring(0, 20),
            email: auth.currentUser.email,
            phone: (window.userPhone || "08111111111").replace(/[^0-9]/g, '')
        }
    };

    // Tambahkan item diskon jika ada
    if (potentialDiscount > 0) {
        payloadData.item_details.push({
            id: 'DISCOUNT',
            price: -potentialDiscount,
            quantity: 1,
            name: 'Voucher Diskon'
        });
    }

    try {
        const functionUrl = (typeof SB_URL !== 'undefined' ? SB_URL : '') + '/functions/v1/midtrans-snap';

        // Panggil Backend User (yang pakai /v2/charge)
        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (typeof SB_KEY !== 'undefined' ? SB_KEY : '') },
            body: JSON.stringify({ type: 'charge', payload: payloadData })
        });

        const data = await response.json();

        // Cek status code Midtrans (200 ok, 201 pending)
        // Kalo ada redirect_url, berarti sukses (Snap API)
        if (!data.redirect_url && (!response.ok || (data.status_code != '200' && data.status_code != '201'))) {
            let errorMsg = data.status_message || "Gagal memproses transaksi";
            if (data.validation_messages) {
                errorMsg += "\n" + data.validation_messages.join("\n");
            }
            throw new Error(errorMsg);
        }

        // Simpan transaksi status PENDING dulu
        await savePendingTransaction(orderId, method === 'other_qris' ? 'QRIS' : 'GO_PAY', finalAmount);

        // === HANDLING SNAP API RESPONSE (SAFE PRODUCTION) ===
        // Midtrans Snap mengembalikan 'redirect_url'
        if (data.redirect_url) {
            closePaymentModal();

            // Buka Halaman Pembayaran Midtrans (Aman & Pasti Support)
            // User akan melihat QRIS atau GoPay di halaman resmi Midtrans
            window.open(data.redirect_url, '_blank');

            showPaymentConfirmation(orderId, finalAmount, method === 'other_qris' ? 'QRIS' : 'GoPay');
            showToast("✅ Membuka halaman pembayaran...");
        } else {
            throw new Error("Link pembayaran tidak ditemukan (Snap Error).");
        }

    } catch (err) {
        console.error("Payment Error:", err);
        // Tampilkan pesan error detail dari Midtrans jika ada
        if (err.message && err.message.includes('Midtrans')) {
            alert("🚨 Gagal Bayar: " + err.message);
        } else {
            alert("🚨 Error: " + err.message);
        }
        showToast("❌ Pembayaran Gagal");
    }
};



// === 4. FUNGSI HUBUNGKAN GOPAY (Real Core API Linking) ===
window.bindGoPay = async function () {
    const user = auth.currentUser;
    if (!user) return showToast("Login dulu!");

    if (!window.userPhone) return alert("Lengkapi nomor HP dulu di profil (Wajib untuk GoPay)!");

    // Format nomor HP
    let cleanPhone = window.userPhone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('62')) cleanPhone = cleanPhone.substring(2);
    else if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);

    showToast('⏳ Menghubungkan akun GoPay...');

    try {
        const functionUrl = (typeof SB_URL !== 'undefined' ? SB_URL : '') + '/functions/v1/midtrans-snap';

        // Panggil Backend User (type: linking)
        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (typeof SB_KEY !== 'undefined' ? SB_KEY : '') },
            body: JSON.stringify({
                type: 'linking',
                payload: {
                    payment_type: "gopay",
                    gopay_partner: {
                        phone_number: cleanPhone,
                        country_code: "62",
                        redirect_url: window.location.origin
                    }
                }
            })
        });

        const data = await response.json();

        if (data.status_code == '200' || data.status_code == '201') {
            // Cari redirect url
            if (data.actions && data.actions.length > 0) {
                const linkAction = data.actions.find(a => a.name === 'redirect-url' || a.name === 'deeplink-redirect'); // Cek nama action yang bener
                if (linkAction) {
                    window.location.href = linkAction.url;
                    return;
                }
                // Fallback ambil action pertama
                window.location.href = data.actions[0].url;
            } else {
                throw new Error("Link aktivasi tidak ditemukan");
            }
        } else {
            throw new Error(data.status_message || "Gagal linking GoPay");
        }
    } catch (err) {
        console.error("Linking Error:", err);
        showToast("❌ Gagal menghubungkan: " + err.message);
    }
};

window.unbindGoPay = function () {
    if (!confirm("Putuskan akun GoPay?")) return;
    const user = auth.currentUser;
    if (user) {
        db.collection('users').doc(user.uid).update({
            isGopayLinked: firebase.firestore.FieldValue.delete(),
            gopayPhone: firebase.firestore.FieldValue.delete()
        }).then(() => {
            showToast("GoPay Terputus");
            location.reload();
        });
    }

}
