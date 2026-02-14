


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
window.isStoreOpen = true;
let defaultMarquee = `🔥 Fuel Your Day With a Perfect Blend! &nbsp;&nbsp; •  &nbsp;&nbsp; ☕ Folkpresso Open!`;
let communityGoal = 0;

// Variabel Modal Product (Cukup 1 kali deklarasi)
let currentProduct = null;
let currentSugar = 'Normal';
window.modalQty = 1;


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
    { name: "Americano", price: 15000, type: "classic", image: "img/biji kopi.png", mg: 120, cost: 9000 },
    { name: "Caffe Latte", price: 15000, type: "classic", image: "img/maciato.png", mg: 80, cost: 9000 },
    { name: "Caramel", price: 15000, type: "classic", image: "img/maciato.png", mg: 80, cost: 9000 },
    { name: "Butterscotch", price: 15000, type: "classic", image: "img/maciato.png", mg: 80, cost: 9000 },
    { name: "Hazelnut", price: 15000, type: "classic", image: "img/hazelnut.png", mg: 80, cost: 9000 },
    { name: "Vanilla", price: 15000, type: "classic", image: "img/vanilla.png", mg: 80, cost: 9000 },
    { name: "Rumbullion", price: 15000, type: "classic", image: "img/vanilla.png", mg: 80, cost: 9000 },
    { name: "Tiramisu", price: 15000, type: "classic", image: "img/tiramisu.png", mg: 80, cost: 9000 },
    { name: "Matcha Latte", price: 15000, type: "non-coffee", image: "img/matcha.png", mg: 0, cost: 9000 },
    { name: "Chocolate", price: 15000, type: "non-coffee", image: "img/coklat.png", mg: 5, cost: 9000 },
];
var products = manualProducts;

// === 3. STARTUP LOGIC (Consolidated) ===
window.addEventListener('load', async () => {
    // A. Start Banner
    if (typeof startBannerAutoSlide === 'function') startBannerAutoSlide();

    // B. Supabase Init Check
    if (!window.supabaseClient) {
        console.error("❌ Supabase Client not found!");
        return;
    }

    // C. Fetch Announcements & Store Status
    // fetchLatestAnnouncement removed as undefined
    await syncInitialStoreStatus();
    setupAnnouncementRealtime();

    // D. Initial Load
    loadPopularProducts();
    if (typeof renderMenuGrid === 'function') renderMenuGrid(products);

    communityGoal = parseInt(localStorage.getItem('folkpresso_community_goal')) || 0;
    updateGoalUI();

    // E. Handle Midtrans Return (The "JARING")
    handleMidtransReturn();

    // F. Register Service Worker (Fix SyntaxError & Hang issues)
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js', { type: 'module' })
            .then(reg => console.log('✅ SW Registered:', reg.scope))
            .catch(err => console.error('❌ SW Registration Failed:', err));
    }
});

// Merged with unified version around line 1400


function setupAnnouncementRealtime() {
    if (!window.supabaseClient) return;

    window.supabaseClient
        .channel('public:announcements')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'announcements' }, payload => {
            const msg = payload.new.message;
            const nid = "rt_" + payload.new.id;

            console.log("📢 Realtime Announcement received:", msg);

            // Masukkan ke antrian untuk tayang SEKALI LEWAT
            if (typeof window.displayMarqueeMessage === 'function') {
                window.displayMarqueeMessage(msg, Date.now(), nid);
            }

            // JANGAN overwrite defaultMarquee di sini, biarkan marquee balik ke status toko/info default
            // Kecuali admin mau bikin ini jadi loop selamanya (biasanya tidak u/ order/quest)
        })
        .subscribe();
}

async function loadPopularProducts() {
    try {
        if (!window.supabaseClient) return;
        // 1. Ambil data 5 besar dari SQL View
        const { data: popularData, error } = await window.supabaseClient
            .from('popular_products')
            .select('*');

        if (error) throw error;

        if (popularData && popularData.length > 0) {
            console.log("📊 Data Jualan Kopi dari DB:", popularData);

            const topProducts = popularData.map(soldItem => {
                const match = products.find(p => {
                    const dbName = soldItem.name.trim().toLowerCase();
                    const localName = p.name.trim().toLowerCase();
                    return dbName === localName || dbName.includes(localName) || localName.includes(dbName);
                });
                return match;
            }).filter(p => p !== undefined);

            renderProducts(topProducts);
        } else {
            renderProducts(products.slice(0, 5));
        }
    } catch (err) {
        console.error("❌ Error Sinkronisasi Produk Populer:", err);
        renderProducts(products.slice(0, 5));
    }
}

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
            updatePassportStatus(); // Tambahin update status paspor
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
    // Logika Ganti Tier & Progress Bar
    var pct = 0;
    var nextLimit = 300;

    // Bersihkan class lama cardBase biar ga numpuk 'member-card-bronze'
    var commonClass = 'shimmer-card rounded-[2rem] pt-10 px-6 pb-4 shadow-2xl relative h-52 flex flex-col justify-between transition-all duration-500 mb-6';

    // UPDATE TAMPILAN POIN (PENTING BIAR GAK 0)
    dispPoints.innerText = userPoints.toLocaleString();

    if (userPoints >= 801) {
        card.className = 'member-card-platinum ' + commonClass;
        newTier = 'FOLK PLATINUM 💎';
        pct = 100;
    } else if (userPoints >= 501) {
        card.className = 'member-card-gold ' + commonClass;
        newTier = 'FOLK GOLD 👑';
        // 501 - 800 (Range 300)
        pct = ((userPoints - 500) / 300) * 100;
    } else if (userPoints >= 301) {
        card.className = 'member-card-silver ' + commonClass;
        newTier = 'FOLK SILVER ⚔️';
        // 301 - 500 (Range 200)
        pct = ((userPoints - 300) / 200) * 100;
    } else {
        card.className = 'member-card-bronze ' + commonClass;
        newTier = 'FOLK BRONZE 🥉';
        // 0 - 300 (Range 300)
        pct = (userPoints / 300) * 100;
    }

    // Update Progress Bar
    bar.style.width = Math.min(Math.max(pct, 5), 100) + '%'; // Min 5% biar keliatan
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
    console.log("🖱️ Claim Quest Clicked");
    const user = auth.currentUser;
    if (!user) {
        alert("Login dulu bang biar dapet poin!");
        return;
    }

    const userRef = db.collection("users").doc(user.uid);
    const today = new Date().toDateString();

    console.log("⏳ Checking Quest Status for UID:", user.uid);
    userRef.get().then((doc) => {
        let canClaim = true;
        if (doc.exists) {
            const data = doc.data();
            console.log("📄 User Data Found:", data);
            if (data.lastQuestDate === today) {
                canClaim = false;
            }
        }

        if (!canClaim) {
            showToast("Sudah diklaim hari ini!");
        } else {
            console.log("🚀 Claiming Point...");
            const updateData = {
                points: firebase.firestore.FieldValue.increment(50),
                lastQuestDate: today,
                username: user.displayName || user.email.split('@')[0],
                email: user.email
            };

            const task = doc.exists ? userRef.update(updateData) : userRef.set(updateData, { merge: true });

            task.then(() => {
                console.log("✅ Point added to Firebase");
                showToast("🎉 +50 Poin Quest!");
                // BROADCAST GLOBAL
                if (window.insertAnnouncement) {
                    window.insertAnnouncement("⚔️ " + (currentUser || user.displayName || "User") + " berhasil menyelesaikan Daily Quest (+50 Poin)!");
                }
            }).catch(err => {
                console.error("❌ Gagal claim quest (Firestore):", err);
                alert("DATABASE ERROR: " + err.message);
            });
        }
    }).catch(err => {
        console.error("❌ Gagal ambil data user (Firestore):", err);
        alert("PULSA/KONEKSI ERROR: " + err.message);
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

async function grantTierVoucher(tierName) {
    var user = auth.currentUser;
    var tierVoucherMap = {
        'FOLK SILVER ⚔️': { discount: 3000, label: 'Silver Upgrade - Rp 3.000' },
        'FOLK GOLD 👑': { discount: 5000, label: 'Gold Upgrade - Rp 5.000' },
        'FOLK PLATINUM 💎': { discount: 8000, label: 'Platinum Upgrade - Rp 8.000' }
    };
    if (!user || !tierVoucherMap[tierName]) return;

    db.collection('users').doc(user.uid).get().then(async (doc) => {
        if (doc.exists) {
            var data = doc.data();
            var grantedTiers = data.grantedTiers || [];
            var grantedTiers = data.grantedTiers || [];
            if (grantedTiers.includes(tierName)) return;

            // BROADCAST GLOBAL TIER UP
            if (window.insertAnnouncement) {
                window.insertAnnouncement("👑 " + (currentUser || "User") + " naik level ke " + tierName + "!");
            }
            var v = tierVoucherMap[tierName];
            var voucher = { tier: tierName, discount: v.discount, label: v.label, used: false, createdAt: new Date().toISOString() };

            db.collection('users').doc(user.uid).collection('vouchers').add(voucher).then(function () {
                db.collection('users').doc(user.uid).update({ grantedTiers: firebase.firestore.FieldValue.arrayUnion(tierName) });
                showToast('🎫 Selamat! Kamu dapat voucher ' + v.label + '!');
            });
        }
    });
}

async function loadUserVouchers() {
    const user = auth.currentUser;
    if (!user || !window.supabaseClient) return;

    window.userVouchers = [];

    // 1. Ambil dari Firestore (Voucher Level Up/Quest)
    try {
        const fireSnap = await db.collection('users').doc(user.uid).collection('vouchers').where('used', '==', false).get();
        fireSnap.forEach(function (doc) {
            window.userVouchers.push({ id: doc.id, source: 'tierup', ...doc.data() });
        });
    } catch (e) {
        console.error("Firestore Vouchers Error:", e);
    }

    // 2. Ambil dari Supabase (Voucher buatan Admin di indexM.html)
    try {
        const now = new Date().toISOString().split('T')[0];
        const { data: sbVouchers, error } = await window.supabaseClient
            .from('vouchers')
            .select('*');

        if (!error && sbVouchers) {
            sbVouchers.forEach(v => {
                // Filter: 
                // - Target untuk 'all' atau cocok dengan UID
                // - Belum Expired
                // - Belum pernah dipakai sama user ini (cek used_by)
                // - Masih ada kuota (cek max_users)

                const isTargetFullfilled = v.target === 'all' || v.target === user.uid;
                const isNotExpired = !v.expiry_date || v.expiry_date >= now;

                // FIX LOGIKA KUOTA: Handle jika used_by masih null (belum ada yang pakai)
                const usedCount = (v.used_by && Array.isArray(v.used_by)) ? v.used_by.length : 0;
                const userAlreadyUsed = v.used_by && v.used_by.includes(user.uid);
                const hasQuota = !v.max_users || usedCount < v.max_users;

                if (isTargetFullfilled && isNotExpired && !userAlreadyUsed && hasQuota) {
                    window.userVouchers.push({
                        id: v.id,
                        label: v.label,
                        discount: parseInt(v.discount),
                        source: 'admin', // Tandai dari admin
                        supabase_id: v.id, // Simpan real ID buat dipake pas checkout
                        expiry: v.expiry_date,
                        max: v.max_users,
                        used: usedCount
                    });
                }
            });
        }
    } catch (e) {
        console.error("Supabase Vouchers Error:", e);
    }

    updateVoucherBtnBadge();
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

        let infoStr = `Diskon Rp ${v.discount.toLocaleString()}`;
        if (v.expiry) infoStr += ` • Exp: ${v.expiry.split('-').reverse().join('/')}`;
        if (v.max) infoStr += ` • Sisa: ${v.max - v.used} User`;

        return `
        <div class="flex items-center justify-between p-3 rounded-xl border ${btnClass} mb-2 transition-all">
            <div>
                <p class="text-xs font-bold">${v.label}</p>
                <p class="text-[10px] opacity-80">${infoStr}</p>
            </div>
            <button onclick="${isActive ? 'removeVoucher()' : `applyVoucher('${v.id}', ${v.discount}, '${v.label}', '${v.source}')`}" class="px-3 py-1.5 rounded-lg text-[10px] font-bold shadow-sm border border-slate-200">${isActive ? '❌ Batal' : 'Gunakan'}</button>
        </div>`;
    }).join('');
}

window.applyVoucher = function (id, discount, label, source) {
    const v = window.userVouchers.find(x => x.id == id);
    if (!v) return;
    window.activeVoucher = { ...v };
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

    // Cek dulu area pengiriman sebelum buka pembayaran
    showDeliveryPopup();
};

window.showDeliveryPopup = function () {
    const popup = document.getElementById('universal-popup');
    const content = document.getElementById('popup-content');
    if (!popup || !content) return openActualPaymentModal(); // Fallback

    document.getElementById('popup-icon').innerText = '🛵';
    document.getElementById('popup-title').innerText = 'Konfirmasi Area';

    // Info Area
    document.getElementById('popup-message').innerHTML = `
        <div class="text-left text-[11px] bg-blue-50 dark:bg-slate-800 p-4 rounded-2xl border border-blue-100 dark:border-slate-700 mb-4 leading-relaxed">
            <p class="font-bold text-blue-800 dark:text-blue-300 mb-1">📍 Area Pengiriman Standar:</p>
            <p class="mb-3 text-slate-600 dark:text-slate-300">• Parung, Depok, Pamulang<br>• Sawangan, Ciputat</p>
            
            <p class="font-bold text-orange-600 dark:text-orange-400 mb-1">⚠️ Luar Area Di Atas?</p>
            <p class="text-slate-600 dark:text-slate-300">Wajib Minimal Order <b class="text-slate-900 dark:text-white">10 Cup</b> ya kak! 😊</p>
        </div>
        <p class="font-black text-xs text-slate-800 dark:text-white">Apakah alamat kakak masuk dalam Area Standar?</p>
    `;

    document.getElementById('popup-actions').innerHTML = `
        <div class="flex flex-col gap-2 w-full mt-2">
            <button onclick="handleDeliveryConfirm(true)" class="bg-blue-600 text-white py-3.5 rounded-xl font-bold shadow-lg active:scale-95 transition-all text-xs">✅ YA, Area Tersebut</button>
            <button onclick="handleDeliveryConfirm(false)" class="bg-white dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700 py-3.5 rounded-xl font-bold active:scale-95 transition-all text-xs">❌ BUKAN (Luar Area)</button>
        </div>
    `;

    popup.classList.remove('hidden');
    popup.classList.add('flex');
    setTimeout(() => {
        content.classList.remove('scale-50', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 10);
};

window.handleDeliveryConfirm = function (isInside) {
    if (isInside) {
        // Dalam Area -> Lanjut
        if (typeof closeUniversalPopup === 'function') closeUniversalPopup();
        setTimeout(openActualPaymentModal, 300);
    } else {
        // Luar Area -> Cek Jumlah
        let totalQty = cart.reduce((a, b) => a + b.quantity, 0);
        if (totalQty >= 10) {
            if (typeof closeUniversalPopup === 'function') closeUniversalPopup();
            showToast("✅ Min. Order 10 Terpenuhi!");
            setTimeout(openActualPaymentModal, 300);
        } else {
            alert("⚠️ Maaf kak, untuk Luar Area wajib order minimal 10 item ya 🙏");
            // Popup tetap terbuka atau tutup terserah, user harus nambah order dulu
            if (typeof closeUniversalPopup === 'function') closeUniversalPopup();
        }
    }
};

window.openActualPaymentModal = function () {
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
        points: firebase.firestore.FieldValue.increment(totalOrder), // 1:1 Ratio for testing/general use
        caffeine: firebase.firestore.FieldValue.increment(totalCaffeine)
    });

    const payload = cart.map(item => ({
        order_id: "FOLK-LOCAL-" + Date.now() + "-" + Math.floor(Math.random() * 1000), // Generate Local ID
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
        user_id: user.uid,
        notes: item.note || '',
        customer_name: (currentUser || "Customer"),
        phone: (window.userPhone || ""),
        address: (window.userAddress || "")
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
    if (!user) {
        alert("❌ Error: User tidak terdeteksi (Login dulu)");
        return;
    }

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
        notes: item.note || '', // Simpan level gula ke kolom notes
        method: method,
        payment_status: 'pending',
        user_id: user.uid,
        // Snapshot Data Customer (Penting buat Admin)
        // Kita coba kirim lagi, kalau error "Column not found" berarti tabel belum diupdate
        customer_name: (currentUser || "Customer"),
        phone: (window.userPhone || ""),
        address: (window.userAddress || "")
    }));

    const { error } = await window.supabaseClient.from('transactions').insert(payload);
    if (error) {
        console.error("❌ Gagal simpan:", error.message);
        alert("DATABASE ERROR: " + error.message);
    }
}

// ==========================================
// 9. SUPABASE REALTIME & NOTIFICATIONS
// ==========================================
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
    if (!window.supabaseClient) {
        console.error("Supabase Client hilang!");
        // alert("SYSTEM ERROR: Supabase Client not found inside insertAnnouncement");
        return;
    }
    try {
        console.log("📤 Sending Announcement:", message);
        // Kita pake ID random biar bisa dilock di sisi client
        var tempId = "msg_" + Date.now() + "_" + Math.floor(Math.random() * 1000);

        // Optimistic UI: Tampil DULUAN di layar sendiri sebelum kirim database
        window.displayMarqueeMessage(message, Date.now(), tempId);

        // Hapus timestamp manual biar Supabase yang handle created_at otomatis
        // Ini menghindari error 400 Bad Request karena tipe data gak cocok
        var { error } = await window.supabaseClient
            .from('announcements')
            .insert([{ message: message }]);

        if (!error) {
            console.log("✅ Announcement Saved Successfully");
        } else {
            console.error("❌ Announcements Insert Error:", error);
        }
    } catch (e) { console.error(e); }
};

function renderMarqueeMessages() {
    var textEl = document.getElementById('marquee-text');
    if (!textEl) textEl = document.querySelector('.animate-marquee');
    if (!textEl) return;

    var container = textEl.parentElement;
    if (container.getAttribute('data-status') === 'playing') return;

    if (activeMessages.length > 0) {
        // --- MODE PESAN USER (SEKALI LEWAT) ---
        container.setAttribute('data-status', 'playing');
        activeMessages.sort(function (a, b) { return (a.timestamp || 0) - (b.timestamp || 0); });
        var msg = activeMessages.shift();

        // TAMPILKAN SEKALI LEWAT
        textEl.style.whiteSpace = 'nowrap'; // Pastikan satu baris panjang
        textEl.style.display = 'inline-block';
        textEl.innerHTML = `<span class="bg-yellow-400 text-blue-900 px-2 rounded-md font-black mr-2 uppercase">INFO 🔥</span> ${msg.message}`;
        textEl.classList.remove('animate-marquee'); // Matikan loop default

        // Reset posisi ke kanan layar
        textEl.style.transform = 'translateX(100vw)';

        // Animasi jalan ke kiri
        var duration = 15000; // 15 detik biar kebaca
        var anim = textEl.animate([
            { transform: 'translateX(100vw)' },
            { transform: 'translateX(-100%)' }
        ], {
            duration: duration,
            iterations: 1,
            easing: 'linear'
        });

        anim.onfinish = function () {
            anim.cancel();
            container.setAttribute('data-status', 'idle');
            // Cek antrian berikutnya
            renderMarqueeMessages();
        };
    } else {
        // --- MODE DEFAULT (LOOPING TERUS) ---
        textEl.innerHTML = window.isStoreOpen ? defaultMarquee : "🔴 MAAF, FOLKPRESSO SEDANG TUTUP • KEMBALI LAGI BESOK YA! 🔴";

        // Reset animasi CSS biar looping mulus dari awal
        textEl.classList.remove('animate-marquee');
        void textEl.offsetWidth; // Trigger Reflow (Penting!)
        textEl.classList.add('animate-marquee');

        textEl.style.transform = ''; // Hapus transform manual biar CSS yang handle
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

        // Listen for Broadcasts (Now handled by unified syncInitialStoreStatus & its listener)
        // loadOrderHistory still needed here?
        loadOrderHistory();

        loadOrderHistory();
    }
}, 2000);

// Popup Izin Notifikasi Web
window.handleSubscribe = async function () {
    const modal = document.getElementById('notif-modal');
    if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }

    if (!('serviceWorker' in navigator)) {
        return showToast('❌ Browser tidak didukung');
    }

    try {
        const user = auth.currentUser;
        const uid = user ? user.uid : 'Guest-' + Date.now();

        showToast('⏳ Memproses Notifikasi...');

        // Timeout biar gak hang kalo SW gagal
        const registration = await Promise.race([
            navigator.serviceWorker.ready,
            new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout Service Worker")), 5000))
        ]);

        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: (typeof PUBLIC_VAPID_KEY !== 'undefined' ? PUBLIC_VAPID_KEY : null)
        });

        const { error } = await window.supabaseClient.from('user_subscriptions').insert([{
            subscription: subscription,
            user_id: uid
        }]);

        if (error) throw error;
        showToast('✅ Notifikasi Aktif!');
    } catch (err) {
        console.error('Gagal daftar notif:', err);
        showToast('❌ Gagal: ' + err.message);
    }
}

window.closeNotifModal = function () {
    const modal = document.getElementById('notif-modal');
    if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
}

// ==========================================
// 10. WRAPPED & UI UTILS
// ==========================================
window.showWrapped = async function () {
    const user = auth.currentUser;
    if (!user) return showToast("Login dulu buat liat Wrapped!");

    showToast("✨ Merangkum kenangan kopimu...");

    try {
        // Ambil riwayat dari Supabase
        const { data: txs, error } = await window.supabaseClient
            .from('transactions')
            .select('name')
            .eq('user_id', user.uid)
            .eq('payment_status', 'success');

        if (error) throw error;

        // Hitung Menu Favorit
        const counts = {};
        (txs || []).forEach(t => {
            counts[t.name] = (counts[t.name] || 0) + 1;
        });

        let topMenu = "";
        let topCount = 0;
        for (const name in counts) {
            if (counts[name] > topCount) {
                topCount = counts[name];
                topMenu = name;
            }
        }

        // Handle No Orders Gracefully
        let favProduct;
        if (topCount > 0) {
            favProduct = products.find(p => p.name === topMenu) || { image: 'img/gula aren.png' };
            document.getElementById('wrap-fav-name').innerText = topMenu;
            document.getElementById('wrap-fav-stats').innerText = `Dipesan ${topCount} kali`;
        } else {
            favProduct = { image: 'img/gula aren.png' }; // Use coffee as default instead of logo
            document.getElementById('wrap-fav-name').innerText = "Belum Ada Riwayat";
            document.getElementById('wrap-fav-stats').innerText = "Yuk, cari kopi favoritmu!";
        }

        // Perhitungan Cups (Setiap 100mg kafein = 1 cup)
        const totalCups = Math.floor(userCaffeine / 100);

        // Update data ke Modal Wrapped
        document.getElementById('wrap-total-cups').innerText = totalCups || txs.length;
        document.getElementById('wrap-caffeine').innerText = userCaffeine.toLocaleString();
        document.getElementById('wrap-fav-img').src = favProduct.image;

        // Munculkan Modal Wrapped
        const modal = document.getElementById('wrapped-modal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            console.log("🎁 Wrapped Opened!");
        }
    } catch (e) {
        console.error("Wrapped Error:", e);
        showToast("Gagal memuat Wrapped :(");
    }
};

window.shareWrapped = function () {
    showToast("📸 Screenshot untuk dibagikan ke Story!");
    // Simulasi native share jika didukung
    if (navigator.share) {
        navigator.share({
            title: 'Folkpresso Wrapped 2026',
            text: `Aku sudah minum ${document.getElementById('wrap-total-cups').innerText} cup kopi di Folkpresso tahun ini!`,
            url: window.location.href
        }).catch(e => console.log('Share failed', e));
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
            const noteStr = tx.notes ? `<div class="text-[10px] text-slate-400 italic mt-0.5">Note: ${tx.notes}</div>` : '';
            container.innerHTML += `<div class="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl mb-2"><h5 class="font-bold text-xs dark:text-white">${tx.name} (${tx.qty}x)</h5>${noteStr}<span class="text-[11px] text-blue-600 font-bold">Rp ${(tx.total || 0).toLocaleString()}</span></div>`;
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
            } else {
                // Notifikasi reguler (Banner/Promo dll)
                if (window.displayMarqueeMessage) {
                    window.displayMarqueeMessage("📢 " + data.title + ": " + data.message, Date.now(), data.id);
                }
                showToast("📩 Pesan Baru: " + data.title);
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
    handleMidtransReturn(); // Cek status pembayaran saat reload

    // Cek Pending Announcement dari LocalStorage (Biar abis reload tetep muncul)
    const pendingMsg = localStorage.getItem('folkpresso_pending_msg');
    if (pendingMsg && window.insertAnnouncement) {
        // Delay dikit biar render UI kelar dulu
        setTimeout(() => {
            window.insertAnnouncement(pendingMsg);
            localStorage.removeItem('folkpresso_pending_msg'); // Hapus biar gak muncul terus2an
        }, 1500);
    }
});

// === PENANGKAP STATUS MIDTRANS (BARU & ROBUST) ===
async function handleMidtransReturn() {
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('order_id');
    const txStatus = urlParams.get('transaction_status');

    if (!orderId) return;

    // A. Handle Sukses
    if (txStatus === 'settlement' || txStatus === 'capture' || txStatus === 'success') {
        // (Optimistic Marquee dihapus di sini karena kita butuh detail produk dari DB dulu)

        // CEK APAKAH SUDAH PERNAH DI-PROSES (Biar gak dobel poin kalo refresh)
        const processed = localStorage.getItem('processed_' + orderId);
        if (processed) {
            window.history.replaceState({}, document.title, window.location.pathname);
            return;
        }

        auth.onAuthStateChanged(async (user) => {
            if (!user) return;

            try {
                const { data: txData, error: txError } = await window.supabaseClient.from('transactions').select('*').eq('order_id', orderId);
                if (txError) {
                    alert("❌ Error fetching transaction data: " + txError.message);
                    throw txError;
                }

                if (txData && txData.length > 0) {
                    const currentStatus = txData[0].payment_status;
                    console.log("🔍 Order Status Check:", currentStatus);

                    // Construct Message Detail
                    const itemsStr = txData.map(t => `${t.name} (${t.qty || t.quantity})`).join(', ');
                    const broadcastMsg = `🛒 ${currentUser || 'Guest'} baru saja memesan ${itemsStr} via Online Pay!`;

                    // BROADCAST DISINI (Setelah dapet detail)
                    if (window.insertAnnouncement) {
                        window.insertAnnouncement(broadcastMsg);
                    }

                    // Update status di Supabase biar sinkron
                    if (currentStatus === 'pending') {
                        await window.supabaseClient.from('transactions').update({ payment_status: 'success' }).eq('order_id', orderId);
                    }

                    // HITUNG POIN (Ratio 1:1)
                    let totalPoin = txData.reduce((sum, item) => sum + (item.total || 0), 0);

                    if (totalPoin > 0) {
                        try {
                            const userRef = db.collection("users").doc(user.uid);
                            const snap = await userRef.get();

                            let nameForBroadcast = currentUser;

                            if (!snap.exists) {
                                nameForBroadcast = user.displayName || user.email.split('@')[0];
                                await userRef.set({
                                    username: nameForBroadcast,
                                    email: user.email,
                                    points: totalPoin,
                                    photo: user.photoURL || "",
                                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                                });
                            } else {
                                const data = snap.data();
                                nameForBroadcast = data.customName || data.username || currentUser;
                                // FORCE UPDATE POIN & CAFFEINE
                                await userRef.update({
                                    points: firebase.firestore.FieldValue.increment(totalPoin),
                                    caffeine: firebase.firestore.FieldValue.increment(txData.reduce((s, i) => s + (i.mg || 0), 0))
                                });
                                console.log("🔥 Points & Caffeine Increment Success");
                            }

                            // BROADCAST PESANAN SUKSES KE MARQUEE (Udah di handle di awal biar cepet)

                            alert("✅ POIN BERHASIL DITAMBAH!\n\nOrder: " + orderId + "\nPoin: +" + totalPoin);
                        } catch (pointsError) {
                            console.error("Firebase Update Error:", pointsError);
                            alert("❌ Error Point: " + pointsError.message);
                        }
                    } else {
                        console.warn("⚠️ totalPoin is 0 for order:", orderId);
                    }

                    // Tandai sudah diproses
                    localStorage.setItem('processed_' + orderId, 'true');

                    window.history.replaceState({}, document.title, window.location.pathname);
                    showPage('profile');
                }
            } catch (err) {
                console.error("Return Handler Error:", err);
            }
        });
    }
    // B. Handle Batal
    else if (txStatus === 'cancel' || txStatus === 'deny') {
        showToast("❌ Pembayaran Dibatalkan");
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

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

    // Modif: Gak ada tombol 'Saya Sudah Bayar' manual lagi biar gak bingung
    // Kita kasih loading animation biar user tau sistem lagi nunggu
    document.getElementById('popup-actions').innerHTML = `
        <div class="flex flex-col items-center justify-center py-4">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
            <p class="text-xs text-slate-400">Menunggu info dari server...</p>
        </div>
    `;

    // === LIVE STATUS CHECKER (Polling) ===
    if (window.paymentPoll) clearInterval(window.paymentPoll);

    window.paymentPoll = setInterval(async () => {
        try {
            // Kita pakai .limit(1) aja biar gak error kalau barangnya banyak (Multi-rows)
            const { data, error } = await window.supabaseClient
                .from('transactions')
                .select('payment_status')
                .eq('order_id', orderId)
                .limit(1);

            if (data && data.length > 0) {
                const status = data[0].payment_status;

                if (status === 'paid' || status === 'success' || status === 'settlement') {
                    clearInterval(window.paymentPoll);
                    closeUniversalPopup();

                    // BROADCAST MARQUEE SEBELUM RELOAD & SET PENDING MSG
                    // Kita bisa ambil detail dari mana? Polling cuma balikin status. 
                    // TAPI di fungsi ini 'cart' masih ada karena halaman belum reload!
                    const orderDetails = cart.map(item => `${item.name} (${item.quantity})`).join(', ');
                    const msg = `🛒 ${(currentUser || 'Guest')} baru saja memesan ${orderDetails} via Online Pay!`;

                    if (window.insertAnnouncement) {
                        window.insertAnnouncement(msg);
                    }
                    // Simpan buat abis reload
                    localStorage.setItem('folkpresso_pending_msg', msg);

                    // === FIX POIN GA MASUK DI MODE POLLING ===
                    const pollUser = firebase.auth().currentUser;
                    if (pollUser) {
                        // let totalReal = cart.reduce((sum, i) => sum + (Number(i.price) * Number(i.quantity)), 0);
                        let totalMg = cart.reduce((sum, i) => sum + (Number(i.mg) * Number(i.quantity)), 0);

                        // USER REQUEST: Poin diset flat 50 dulu
                        let pEarned = 50;

                        // Update Local & Firebase
                        userPoints += pEarned;
                        userCaffeine += totalMg;
                        updateMemberUI();

                        db.collection("users").doc(pollUser.uid).set({
                            points: firebase.firestore.FieldValue.increment(pEarned),
                            caffeine: firebase.firestore.FieldValue.increment(totalMg)
                        }, { merge: true }).catch(err => console.error("Poll Point Error:", err));
                    }
                    // ==========================================

                    // alert("🎉 Pembayaran Diterima! Terima kasih.");

                    // Kasih jeda dikit biar proses insertAnnouncement sempet jalan networknya
                    setTimeout(() => {
                        window.location.reload();
                    }, 500);
                }
                if (status === 'failed') {
                    clearInterval(window.paymentPoll);
                    closeUniversalPopup();
                    alert("❌ Pembayaran Gagal / Kadaluarsa.");
                }
            }
        } catch (e) {
            console.log("Polling silent error:", e);
        }
    }, 4000); // Cek tiap 4 detik
}
// === FIX: MENCEGAH CRASH SAAT KLIK KONFIRMASI ===
// === 1. FUNGSI YANG HILANG (Mencegah Crash Saat Bayar GoPay) ===
// --- HELPER: Mark consumed voucher in DB ---
async function consumeActiveVoucher(orderId) {
    const user = auth.currentUser;
    if (!user || !window.activeVoucher) return;

    try {
        const v = window.activeVoucher;

        if (v.source === 'admin' && v.supabase_id) {
            // 1. Supabase Voucher (Admin)
            // Ambil data terbaru dulu buat dapetin array used_by lama
            const { data: curV } = await window.supabaseClient.from('vouchers').select('used_by').eq('id', v.supabase_id).single();
            const usedBy = curV?.used_by || [];
            if (!usedBy.includes(user.uid)) {
                usedBy.push(user.uid);
                await window.supabaseClient.from('vouchers').update({ used_by: usedBy }).eq('id', v.supabase_id);
                console.log("🎟️ Supabase Voucher Consumed:", v.label);
            }
        } else {
            // 2. Firestore Voucher (Tierup/Quest)
            await db.collection('users').doc(user.uid).collection('vouchers').doc(v.id).update({
                used: true,
                usedAt: new Date().toISOString(),
                usedInOrder: orderId
            });
            console.log("🎟️ Firestore Voucher Consumed:", v.label);
        }

        window.activeVoucher = null;
        if (typeof updateVoucherBtnBadge === 'function') updateVoucherBtnBadge();
        if (typeof loadUserVouchers === 'function') loadUserVouchers(); // Refresh list agar ilang
    } catch (e) {
        console.error("Gagal consume voucher:", e);
    }
}

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

    // OPTIMISTIC MARQUEE DENGAN DETAIL
    const orderDetails = cart.map(item => `${item.name} (${item.quantity})`).join(', ');
    const msg = `🛒 ${(currentUser || 'Guest')} baru saja memesan ${orderDetails} via ${method}!`;

    // SAFE MARQUEE: Dibungkus try-catch biar gak ngerusak logic poin
    try {
        if (typeof window.insertAnnouncement === 'function') {
            window.insertAnnouncement(msg);
        }
    } catch (marqueeErr) {
        console.warn("Marquee Error (Ignored):", marqueeErr);
    }
    // === PRIORITAS UTAMA: UPDATE POIN & UI (Biar User Seneng Dulu) ===
    const currentUserObj = firebase.auth().currentUser;
    console.log("DEBUG AUTH STATE:", currentUserObj);

    if (currentUserObj) {
        try {
            // HITUNG POIN (FIXED 50 POIN PER TRANSAKSI)
            // let totalReal = cart.reduce((sum, i) => sum + (Number(i.price) * Number(i.quantity)), 0);
            let totalMg = cart.reduce((sum, i) => sum + (Number(i.mg) * Number(i.quantity)), 0);

            // USER REQUEST: Poin diset flat 50 dulu (Dummy Price Issue)
            let pEarned = 50;
            let uid = currentUserObj.uid;

            console.log("💎 EARLY DEBUG POINTS:", { pEarned, totalMg, uid });

            if (pEarned > 0) {
                // 1. UPDATE LOKAL (OPTIMISTIC)
                userPoints += pEarned;
                userCaffeine += totalMg;
                updateMemberUI();

                // 2. UPDATE FIREBASE (BACKGROUND)
                db.collection("users").doc(uid).set({
                    points: firebase.firestore.FieldValue.increment(pEarned),
                    caffeine: firebase.firestore.FieldValue.increment(totalMg)
                }, { merge: true }).then(() => {
                    console.log("✅ Firebase Point Updated (Background)");
                }).catch(err => {
                    console.error("❌ Firebase Point Gagal:", err);
                });

                alert("✅ POIN DITAMBAH: +" + pEarned + "\n(Total Poin: " + userPoints + ")");
            }
        } catch (e) {
            console.error("❌ Error Hitung Poin Awal:", e);
        }
    } else {
        console.warn("⚠️ USER TIDAK TERDETEKSI LOGIN. POIN TIDAK DITAMBAH.");
        alert("⚠️ PERHATIAN: Poin tidak bertambah karena Anda tidak terdeteksi Login.\nSilakan Refresh atau Login ulang.");
    }
    // ================================================================

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
            payment_status: 'success',
            user_id: auth.currentUser ? auth.currentUser.uid : 'guest',
            notes: item.note || '', // Pastikan NOTES (Gula) masuk
            customer_name: (currentUser || "Customer"),
            phone: (window.userPhone || ""),
            address: (window.userAddress || "")
        }));

        const { error } = await window.supabaseClient.from('transactions').insert(payload);
        if (error) throw error;

        // Konsumsi voucher jika ada
        await consumeActiveVoucher(orderId);

        // Notif ke semua user & Tambah poin
        // Notif ke semua user & Tambah poin

        // (Lanjut ke reset cart & redirect)
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
// === HELPER: Simpan Transaksi Pending & Pakai Voucher (FIX ONE-TIME USE) ===
async function savePendingTransaction(orderId, method, total) {
    const user = auth.currentUser;
    if (!user) {
        alert("❌ Error: User tidak terdeteksi (Login dulu)");
        return;
    }

    // 1. Simpan ke Supabase (Status Pending)
    // 1. Simpan ke Supabase (Status Pending)
    // HITUNG DISKON PROPORTIONAL BIAR LAPORAN SESUAI BAYAR
    let cartTotal = cart.reduce((a, b) => a + (b.price * b.quantity), 0);
    let discountAmount = 0;
    let voucherLabel = "";

    if (window.activeVoucher && cartTotal > 0) {
        discountAmount = Math.min(window.activeVoucher.discount, cartTotal);
        // Format: (Voucher: PROMO - Potongan Rp 5,000)
        voucherLabel = ` (Voucher: ${window.activeVoucher.label} - Potongan Rp ${discountAmount.toLocaleString()})`;
    }

    // Ratio pembayaran (Misal Bayar 10k dari 15k, ratio = 0.66)
    // Kalau diskon 0, ratio = 1
    let payRatio = cartTotal > 0 ? (cartTotal - discountAmount) / cartTotal : 1;

    const payload = cart.map((item, index) => {
        let originalTotal = item.price * item.quantity;
        let finalItemTotal = Math.round(originalTotal * payRatio);

        // Catatan: Tambahin info voucher di item pertama aja biar ga spam, atau di semua gpp.
        // Di sini kita taruh di semua biar admin noticable per row.
        let finalNote = (item.note || '') + (discountAmount > 0 ? voucherLabel : '');

        return {
            order_id: orderId,
            date: new Date().toISOString().split('T')[0],
            full_time: new Date().toLocaleString('id-ID'),
            name: item.name,
            type: 'in',
            qty: item.quantity,
            unit_price: item.price, // Harga asli per item tetap dicatat
            unit_cost: item.cost || 0,
            total: finalItemTotal, // <--- INI HASIL DISKON (Sesuai Permintaan User)
            notes: finalNote,
            method: method,
            payment_status: 'pending',
            user_id: user.uid,
            customer_name: (currentUser || "Customer"),
            phone: (window.userPhone || ""),
            address: (window.userAddress || "")
        };
    });

    const { error } = await window.supabaseClient.from('transactions').insert(payload);
    if (error) {
        console.error("❌ Gagal simpan:", error.message);
        alert("DATABASE ERROR: " + error.message);
    }

    // 2. CONSUME VOUCHER (Biar Cuma Sekali Pakai)
    await consumeActiveVoucher(orderId);
}

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

    // KITA PAKAI SNAP POPUP (Gak butuh aktivasi Core API ribet)
    // Jadi requestedPaymentType kita set null biar backend manggil SNAP API
    let requestedPaymentType = null;
    let enabledPayments = ['gopay', 'shopeepay', 'qris', 'other_qris'];

    if (method && typeof method === 'string') {
        const m = method.toLowerCase();
        if (m.includes('gopay')) enabledPayments = ['gopay'];
        if (m.includes('qris')) enabledPayments = ['qris', 'other_qris'];
    }

    // Persiapkan Data untuk Backend (Edge Function Core API)
    const payloadData = {
        payment_type: null, // Paksa ke mode Snap biar dapet token
        enabled_payments: enabledPayments,
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
            email: auth.currentUser ? auth.currentUser.email : "guest@folkpresso.com",
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
        const paymentMethodLabel = method && method.toLowerCase().includes('qris') ? 'QRIS' : 'GO_PAY';
        await savePendingTransaction(orderId, paymentMethodLabel, finalAmount);

        // === HANDLING SNAP POPUP (NO REDIRECT) ===
        if (data.token) {
            closePaymentModal();
            window.snap.pay(data.token, {
                onSuccess: function (result) {
                    console.log('success', result);
                    // Polling bakal otomatis deteksi success via backend
                    showPaymentConfirmation(orderId, finalAmount, paymentMethodLabel);
                },
                onPending: function (result) {
                    console.log('pending', result);
                    showPaymentConfirmation(orderId, finalAmount, paymentMethodLabel);
                },
                onError: function (result) {
                    console.log('error', result);
                    alert("❌ Pembayaran gagal atau terjadi kesalahan.");
                },
                onClose: function () {
                    console.log('customer closed the popup without finishing the payment');
                    // Tampilkan lagi modal polling kalau dia gak sengaja tutup
                    showPaymentConfirmation(orderId, finalAmount, paymentMethodLabel);
                }
            });
            return;
        }

        // FALLBACK: Kalo token gak ada tapi ada redirect_url
        if (data.redirect_url) {
            closePaymentModal();
            window.location.href = data.redirect_url;
            showPaymentConfirmation(orderId, finalAmount, paymentMethodLabel);
        } else {
            throw new Error("Gagal mendapatkan akses pembayaran dari Midtrans.");
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

// ==========================================
// 12. FOLK'S PASSPORT LOGIC (DYNAMIC MENUS & REWARDS)
// ==========================================

window.checkPassportRewards = async function (collectedCount, totalMenus) {
    const user = auth.currentUser;
    if (!user) return;

    const userRef = db.collection('users').doc(user.uid);
    const doc = await userRef.get();
    if (!doc.exists) return;

    const data = doc.data();
    const claimedRewards = data.claimedPassportRewards || [];

    const milestones = [
        { id: 'explorer', target: 5, rewardType: 'points', value: 100, label: 'EXPLORER (5 Stamps)' },
        { id: 'junkie', target: 10, rewardType: 'points', value: 250, label: 'COFFEE JUNKIE (10 Stamps)' },
        { id: 'master', target: totalMenus, rewardType: 'voucher', value: 15000, label: 'MASTER OF FOLK' }
    ];

    for (const ms of milestones) {
        if (collectedCount >= ms.target && !claimedRewards.includes(ms.id)) {
            // GRANT REWARD
            try {
                if (ms.rewardType === 'points') {
                    await userRef.update({
                        points: firebase.firestore.FieldValue.increment(ms.value),
                        claimedPassportRewards: firebase.firestore.FieldValue.arrayUnion(ms.id)
                    });
                    showToast(`🎉 Milestone ${ms.label} Tercapai! +${ms.value} Poin!`);
                } else if (ms.rewardType === 'voucher') {
                    const voucher = {
                        label: '🏆 Master of Folk Reward',
                        discount: ms.value,
                        source: 'passport',
                        used: false,
                        createdAt: new Date().toISOString()
                    };
                    await userRef.collection('vouchers').add(voucher);
                    await userRef.update({
                        claimedPassportRewards: firebase.firestore.FieldValue.arrayUnion(ms.id)
                    });
                    showToast(`👑 WOW! Kamu Master of Folk! Voucher Rp 15rb ditambahkan!`);
                }

                // Global Announcement
                if (window.insertAnnouncement) {
                    window.insertAnnouncement(`🏆 ${currentUser} mencapai milestone Passport: ${ms.label}!`);
                }

                // Jika sudah dapet Master Reward, hilangkan section reward milestones UI biar kelihatan fresh?
                // Gak perlu, biar user bisa liat badge-nya nyala.
            } catch (err) { console.error("Reward Grant Error:", err); }
        }
    }
};

window.prestigeResetPassport = async function () {
    const user = auth.currentUser;
    if (!user) return;

    if (!confirm("⚠️ REBIRTH & RESET ⚠️\n\nPaspor kamu akan dikosongkan lagi, tapi level Prestige kamu akan naik!\nKamu bisa klaim ulang semua Milestone Reward.\n\nLanjutkan?")) return;

    try {
        const userRef = db.collection('users').doc(user.uid);

        await userRef.update({
            passportPrestigeLevel: firebase.firestore.FieldValue.increment(1),
            lastPassportReset: new Date().toISOString(),
            claimedPassportRewards: [] // RESET klaim biar bisa dapet poin lagi!
        });

        showToast("✨ REBIRTH SUCCESS! Paspor telah direset! ✨");

        if (window.insertAnnouncement) {
            window.insertAnnouncement(`👑 EPIC! ${currentUser} baru saja melakukan REBIRTH ke Prestige Level baru! 🔥`);
        }

        // Tutup modal dulu biar kerasa efek refreshnya
        document.getElementById('passport-modal').classList.add('hidden');
        setTimeout(() => {
            window.openPassport();
        }, 500);

    } catch (err) {
        console.error("Prestige Error:", err);
        alert("Gagal melakukan Rebirth: " + err.message);
    }
};

window.updatePassportStatus = async function () {
    if (!window.supabaseClient || !auth.currentUser) return;
    try {
        // Ambil Data User (untuk cek tanggal Reset Prestige)
        const userDoc = await db.collection('users').doc(auth.currentUser.uid).get();
        const userData = userDoc.exists ? userDoc.data() : {};
        const lastResetStr = userData.lastPassportReset || "2000-01-01"; // Default jauh ke masa lalu
        const prestigeLevel = userData.passportPrestigeLevel || 0;

        // Tampilkan Badge Prestige di UI
        const badgeEl = document.getElementById('prestige-badge');
        const levelEl = document.getElementById('prestige-level-text');
        if (badgeEl && levelEl) {
            if (prestigeLevel > 0) {
                badgeEl.classList.remove('hidden');
                levelEl.innerText = prestigeLevel;
            } else {
                badgeEl.classList.add('hidden');
            }
        }

        // Ambil Transaksi yang terjadi SESUDAH reset terakhir
        const { data } = await window.supabaseClient
            .from('transactions')
            .select('name, created_at')
            .eq('user_id', auth.currentUser.uid)
            .eq('payment_status', 'success')
            .gt('created_at', lastResetStr); // Filter Tanggal Reset!

        const purchasedNames = new Set((data || []).map(t => t.name.trim().toLowerCase()));
        const totalMenus = products.length;
        const collectedCount = products.filter(p => purchasedNames.has(p.name.trim().toLowerCase())).length;

        const statusEl = document.getElementById('passport-status');
        if (statusEl) statusEl.innerText = `${collectedCount} / ${totalMenus} Stamps`;

        return { purchasedNames, collectedCount, totalMenus, prestigeLevel };
    } catch (e) { console.error("Passport Sync Error:", e); return null; }
};

window.openPassport = async function () {
    const user = auth.currentUser;
    if (!user) return showToast("Login dulu buat liat Paspor!");

    const modal = document.getElementById('passport-modal');
    const list = document.getElementById('passport-list');
    const resetSection = document.getElementById('prestige-reset-section');
    if (!modal || !list) return;

    modal.classList.remove('hidden');
    list.innerHTML = '<div class="col-span-3 py-10 text-center text-xs text-slate-400 animate-pulse italic">Scanning orders...</div>';

    const data = await window.updatePassportStatus();
    if (!data) return;

    const { purchasedNames, collectedCount, totalMenus, prestigeLevel } = data;
    const progressPct = (collectedCount / totalMenus) * 100;

    // Cek Milestone Rewards
    await window.checkPassportRewards(collectedCount, totalMenus);

    // Update UI Header
    document.getElementById('passport-progress-bar').style.width = progressPct + '%';
    document.getElementById('passport-progress-text').innerText = `${collectedCount} / ${totalMenus} Menus Collected`;

    // Tampilkan tombol RESET jika sudah penuh
    if (collectedCount >= totalMenus && totalMenus > 0) {
        if (resetSection) resetSection.classList.remove('hidden');
    } else {
        if (resetSection) resetSection.classList.add('hidden');
    }

    // Milestones UI
    const msExplorer = document.getElementById('ms-explorer');
    const msJunkie = document.getElementById('ms-junkie');
    const msMaster = document.getElementById('ms-master');

    if (collectedCount >= 5) msExplorer.classList.remove('opacity-40');
    if (collectedCount >= 10) msJunkie.classList.remove('opacity-40');
    if (collectedCount >= totalMenus) msMaster.classList.remove('opacity-40');

    // Render Stamps (Premium Dark Theme - Blue Edition)
    list.innerHTML = '';
    products.forEach(p => {
        const isCollected = purchasedNames.has(p.name.trim().toLowerCase());
        const opacity = isCollected ? 'opacity-100' : 'opacity-10 grayscale';
        const stampOverlay = isCollected ? `
            <div class="absolute inset-0 flex items-center justify-center">
                <div class="w-12 h-12 border-2 border-blue-500/50 rounded-full flex items-center justify-center rotate-[-15deg] backdrop-blur-[1px]">
                    <div class="text-[6px] font-black text-blue-500 uppercase tracking-widest bg-slate-900 border border-blue-500/50 px-1">Verified</div>
                </div>
            </div>` : '';

        list.innerHTML += `
            <div class="relative flex flex-col items-center p-2 aspect-square justify-center transition-all duration-500 ${isCollected ? 'scale-110' : 'opacity-40 hover:opacity-100'}">
                <div class="w-20 h-20 flex items-center justify-center relative bg-transparent">
                    <img src="${p.image}" class="w-full h-full object-contain ${opacity} drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]" onerror="this.src='img/gula aren.png'">
                    ${stampOverlay}
                </div>
                <p class="text-[8px] font-black text-blue-100/30 mt-1 text-center leading-tight truncate w-full uppercase tracking-tighter">${p.name}</p>
            </div>
        `;
    });
};