// app.js - Core Navigation and Navigation Logic

export const App = {
    init() {
        this.cacheDOM();
        this.bindEvents();
        this.createToastElement();

        // Setup current year in footer if exists
        const yearEl = document.getElementById('current-year');
        if (yearEl) yearEl.textContent = new Date().getFullYear();
    },

    cacheDOM() {
        this.navItems = document.querySelectorAll('.nav-item');
        this.tabSections = document.querySelectorAll('.tab-section');
        this.tabTitle = document.getElementById('current-tab-title');
    },

    bindEvents() {
        this.navItems.forEach(item => {
            item.addEventListener('click', (e) => this.switchTab(e.currentTarget));
        });
    },

    switchTab(clickedItem) {
        const tabId = clickedItem.getAttribute('data-tab');
        if (!tabId) return;

        // 1. Update Active Nav State
        this.navItems.forEach(btn => btn.classList.remove('active'));
        clickedItem.classList.add('active');

        // 2. Hide all tabs, show target tab
        this.tabSections.forEach(section => {
            section.classList.remove('active');
            if (section.id === `tab-${tabId}`) {
                section.classList.add('active');
            }
        });

        // 3. Update Title
        const tabName = clickedItem.textContent.trim();
        if (this.tabTitle) {
            this.tabTitle.textContent = tabName;
        }

        // Add small animation delay effect
        const targetSection = document.getElementById(`tab-${tabId}`);
        targetSection.style.animation = 'none';
        targetSection.offsetHeight; /* trigger reflow */
        targetSection.style.animation = null;
    },

    createToastElement() {
        const toast = document.createElement('div');
        toast.id = 'toast-notification';
        toast.className = 'toast';
        document.body.appendChild(toast);
        this.toastEl = toast;
    },

    showToast(message, duration = 3000) {
        if (!this.toastEl) return;

        this.toastEl.textContent = message;
        this.toastEl.classList.add('show');

        if (this.toastTimeout) clearTimeout(this.toastTimeout);

        this.toastTimeout = setTimeout(() => {
            this.toastEl.classList.remove('show');
        }, duration);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// Export functions for other modules to use
export const showToast = (msg) => App.showToast(msg);
