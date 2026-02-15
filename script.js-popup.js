
window.openUniversalPopup = function (title, message, icon = '✨', actionLabel = "Oke", actionCallback = null) {
    const popup = document.getElementById('universal-popup');
    const content = document.getElementById('popup-content');
    const iconEl = document.getElementById('popup-icon');
    const titleEl = document.getElementById('popup-title');
    const msgEl = document.getElementById('popup-message');
    const actions = document.getElementById('popup-actions');

    if (!popup || !content) return;

    iconEl.innerText = icon;
    titleEl.innerText = title;
    msgEl.innerText = message;

    actions.innerHTML = `
        <button id="popup-confirm-btn" class="w-full bg-blue-600 text-white py-3.5 rounded-2xl font-bold shadow-lg active:scale-95 transition-all">
            ${actionLabel}
        </button>
    `;

    const btn = document.getElementById('popup-confirm-btn');
    btn.onclick = () => {
        if (actionCallback) actionCallback();
        window.closeUniversalPopup();
    };

    popup.classList.remove('hidden');
    popup.classList.add('flex');

    setTimeout(() => {
        content.classList.remove('scale-50', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 50);
};

window.closeUniversalPopup = function () {
    const popup = document.getElementById('universal-popup');
    const content = document.getElementById('popup-content');

    if (!popup || !content) return;

    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-50', 'opacity-0');

    setTimeout(() => {
        popup.classList.add('hidden');
        popup.classList.remove('flex');
    }, 300);
};
