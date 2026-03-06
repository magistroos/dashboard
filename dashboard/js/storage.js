import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getDatabase, ref, onValue, set, get } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
import { showToast } from "./app.js";

const LOCAL_STORAGE_KEY = 'trojanHorseV2';

// ---------------------------------------------------------
// INITIAL DEFAULT STATE
// ---------------------------------------------------------
const defaultState = {
    version: 3,
    sprintStartDate: new Date().toISOString().split('T')[0],
    sprintEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    targets: { dms: 80, videos: 40, responses: 8, deals: 2 },
    editableTexts: {},
    metrics: {
        messagesSent: 0,
        responsesReceived: 0,
        videosRecorded: 0,
        dealsClosed: 0
    },
    dailyChecklist: {
        date: new Date().toISOString().split('T')[0],
        items: { videos: false, dms: false, followup: false, leads: false }
    },
    roadmap: {
        phase0: Array(7).fill(false),
        phase1: Array(11).fill(false),
        phase2: Array(8).fill(false),
        phase3: Array(8).fill(false)
    },
    leads: {
        count: 0,
        cities: ["Київ", "Львів", "Дніпро", "Одеса", "Харків"]
    },
    complimentsBank: [
        "чисто зроблено, стиків практично не видно",
        "блиск як з заводу, дуже акуратна робота",
        "гарний підворот на кантах, видно досвід",
        "керамікою дуже рівно покрили, без розводів",
        "PPF лягла ідеально, переходів не видно"
    ]
};

// ---------------------------------------------------------
// STORAGE MANAGER MODULE
// ---------------------------------------------------------
export const StorageManager = {
    firebaseApp: null,
    db: null,
    dbRef: null,
    isFirebaseActive: false,

    // The working copy of the data
    data: JSON.parse(JSON.stringify(defaultState)),

    // Callbacks to trigger when data updates (bound by other modules)
    listeners: [],

    async init() {
        this.cacheDOM();
        this.bindEvents();

        // 1. Setup Firebase Configuration Hardcoded explicitly for GitHub Pages Host
        this.setupFirebaseConfig();

        // 2. Try to init Firebase
        if (this.firebaseConfig && this.firebaseConfig.apiKey) {
            try {
                this.firebaseApp = initializeApp(this.firebaseConfig);
                this.db = getDatabase(this.firebaseApp);
                // Hardcoded path for this specific dashboard instance
                this.dbRef = ref(this.db, 'workspaces/trojan-horse');
                this.isFirebaseActive = true;

                this.setupFirebaseListener();
                this.updateSyncStatus('online');
                console.log("🔥 Firebase DB Connected");
            } catch (err) {
                console.error("Firebase init error:", err);
                this.fallbackToLocal();
            }
        } else {
            // No firebase config
            this.fallbackToLocal();
        }
    },

    fallbackToLocal() {
        this.isFirebaseActive = false;
        this.updateSyncStatus('offline');
        console.log("💾 Running in LocalStorage fallback mode");

        const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (localData) {
            try {
                this.data = { ...defaultState, ...JSON.parse(localData) };
                this.checkDailyReset();
                this.notifyListeners();
            } catch (e) {
                console.error("Local load error", e);
            }
        } else {
            // First time ever
            this.saveData();
        }
    },

    setupFirebaseListener() {
        if (!this.dbRef) return;

        // Listen for realtime changes
        onValue(this.dbRef, (snapshot) => {
            const val = snapshot.val();
            if (val) {
                this.data = { ...defaultState, ...val };
                this.checkDailyReset();
                this.notifyListeners(); // Tell UI to update
            } else {
                // DB is empty (first time), push current local data to it
                this.saveData();
            }
        }, (errorObject) => {
            console.error("Firebase read failed: " + errorObject.name);
            showToast("⚠️ Помилка синхронізації з базою");
            this.fallbackToLocal();
        });
    },

    // ---------------------------------------------------------
    // WRITE API
    // ---------------------------------------------------------
    async saveData() {
        // 1. Always save locally first for immediate responsiveness
        this.saveLocally();

        // 2. Notify local DOM listeners immediately so UI updates
        this.notifyListeners();

        // 3. Push to Firebase if active
        if (this.isFirebaseActive && this.dbRef) {
            try {
                await set(this.dbRef, this.data);
                // We don't need to notify listeners here because Firebase onValue will catch our own write and do it
            } catch (error) {
                console.error("Firebase write error", error);
                this.updateSyncStatus('offline');
                showToast("⚠️ Помилка запису в базу. Збережено локально.");
            }
        }
    },

    saveLocally() {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.data));
    },

    // ---------------------------------------------------------
    // HELPERS FOR UI MODULES
    // ---------------------------------------------------------
    onChange(callback) {
        this.listeners.push(callback);
        // Fire immediately for initial load
        if (this.data) callback(this.data);
    },

    notifyListeners() {
        this.listeners.forEach(cb => cb(this.data));
    },

    // ---------------------------------------------------------
    // DAILY RESET LOGIC
    // ---------------------------------------------------------
    checkDailyReset() {
        const today = new Date().toISOString().split('T')[0];
        if (this.data.dailyChecklist.date !== today) {
            // New day! Reset daily checklist
            this.data.dailyChecklist = {
                date: today,
                items: { videos: false, dms: false, followup: false, leads: false }
            };
            this.saveData();
        }
    },

    // ---------------------------------------------------------
    // SETTINGS / FIREBASE CONFIG LOGIC
    // ---------------------------------------------------------
    cacheDOM() {
        this.statusIndicator = document.getElementById('sync-status');
        this.statusText = this.statusIndicator?.querySelector('.status-text');

        // Settings form
        this.btnWipeData = document.getElementById('btn-wipe-data');
        this.btnSaveDate = document.getElementById('btn-save-date');
        this.btnSaveSheets = document.getElementById('btn-save-sheets');

        this.inStartDate = document.getElementById('input-start-date');
        this.inEndDate = document.getElementById('input-end-date');
    },

    bindEvents() {
        if (this.btnWipeData) this.btnWipeData.addEventListener('click', () => this.handleWipeData());
        if (this.btnSaveDate) this.btnSaveDate.addEventListener('click', () => {
            const startStr = this.inStartDate.value;
            const endStr = this.inEndDate.value;
            if (startStr && endStr) {
                this.data.sprintStartDate = startStr;
                this.data.sprintEndDate = endStr;
                this.saveData();
                showToast("✅ Дати оновлено");
            }
        });
    },

    updateSyncStatus(status) {
        if (!this.statusIndicator) return;
        this.statusIndicator.className = `sync-status status-${status}`;
        this.statusText.textContent = status === 'online' ? 'Синхронізовано (Firebase)' : 'Офлайн (Локально)';
    },

    setupFirebaseConfig() {
        this.firebaseConfig = {
            apiKey: "AIzaSyAoSUMH2r136FS9QKgid2V0XXjnqBmSkRE",
            authDomain: "trojan-horse-dashboard-efeb1.firebaseapp.com",
            databaseURL: "https://trojan-horse-dashboard-efeb1-default-rtdb.europe-west1.firebasedatabase.app",
            projectId: "trojan-horse-dashboard-efeb1",
            storageBucket: "trojan-horse-dashboard-efeb1.firebasestorage.app",
            messagingSenderId: "1036119799095",
            appId: "1:1036119799095:web:c3677c4ec2016a5c4996b2",
            measurementId: "G-490DGH9PW4"
        };
    },

    handleWipeData() {
        const confirm1 = confirm("⚠️ Ви впевнені? Це видалить всі ваші метрики, лічильники та чекбокси.");
        if (!confirm1) return;

        const confirm2 = confirm("Це остаточне рішення. Дані неможливо відновити. Видалити?");
        if (!confirm2) return;

        // Reset to default
        this.data = JSON.parse(JSON.stringify(defaultState));
        this.saveData();
        showToast("🗑️ Всі дані очищено");
    }
};

// Auto-init on load
document.addEventListener('DOMContentLoaded', () => {
    StorageManager.init();
});
