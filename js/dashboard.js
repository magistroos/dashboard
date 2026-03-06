import { StorageManager } from "./storage.js";

export const Dashboard = {
    init() {
        this.cacheDOM();
        this.bindEvents();

        // Listen to storage changes to update UI
        StorageManager.onChange((data) => this.render(data));
    },

    cacheDOM() {
        // Metrics
        this.valDms = document.getElementById('val-dms');
        this.valVideos = document.getElementById('val-videos');
        this.valResponses = document.getElementById('val-responses');
        this.valDeals = document.getElementById('val-deals');

        this.responseRate = document.getElementById('response-rate');
        this.closeRate = document.getElementById('close-rate');

        this.btnAdd = document.querySelectorAll('.btn-add');
        this.btnSub = document.querySelectorAll('.btn-sub');
        this.btnResetMetrics = document.getElementById('btn-reset-metrics');

        // Sprint Progress
        this.sprintFill = document.getElementById('sprint-progress-fill');
        this.sprintText = document.getElementById('sprint-progress-text');

        // Timer
        this.daysPassed = document.getElementById('days-passed');
        this.totalDaysEl = document.getElementById('total-days');
        this.timeFill = document.getElementById('time-progress-fill');
        this.dateStart = document.getElementById('date-start');
        this.dateEnd = document.getElementById('date-end');
        this.inputStartDate = document.getElementById('input-start-date');
        this.inputEndDate = document.getElementById('input-end-date');

        // Target editing
        this.targetEls = {
            'dms': document.getElementById('target-dms'),
            'videos': document.getElementById('target-videos'),
            'responses': document.getElementById('target-responses'),
            'deals': document.getElementById('target-deals')
        };
        this.sprintTargetDms = document.getElementById('sprint-target-dms');
        this.btnEditTargets = document.querySelectorAll('.edit-target');

        // Strategy inline editing
        this.btnToggleEditStrat = document.getElementById('btn-toggle-edit-strategy');
        this.editableTexts = document.querySelectorAll('[data-editable]');
        this.isEditingStrategy = false;

        // Daily Checklist
        this.dailyStatus = document.getElementById('daily-status');
        this.dailyInputs = document.querySelectorAll('#daily-checklist input[type="checkbox"]');
        this.confettiBox = document.getElementById('daily-confetti');

        // Quotes
        this.quoteEl = document.getElementById('daily-quote');
        this.quotes = [
            "Ваша ціль — не $500. Ваша ціль — один перший клієнт, який скаже «так».",
            "Дисципліна важить більше за мотивацію. Відправте наступні 5 повідомлень.",
            "Ніхто не купить, якщо ви не запропонуєте. Аутріч — це математика.",
            "Люди купують у людей. Зробіть це відео дійсно персональним.",
            "Відмова — це просто зворотний зв'язок. Шукайте тих, кому болить саме зараз."
        ];
        this.setDailyQuote();
    },

    bindEvents() {
        // +1 Buttons
        this.btnAdd.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const metric = e.currentTarget.getAttribute('data-metric');
                this.incrementMetric(metric);

                // Animate button click
                const valEl = document.getElementById(`val-${metric}`);
                valEl.classList.remove('count-up');
                void valEl.offsetWidth; // trigger reflow
                valEl.classList.add('count-up');
            });
        });

        // -1 Buttons
        this.btnSub.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const metric = e.currentTarget.getAttribute('data-metric');
                this.decrementMetric(metric);
            });
        });

        // Edit Targets
        this.btnEditTargets.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const metric = e.currentTarget.getAttribute('data-target');
                const curr = StorageManager.data.targets ? StorageManager.data.targets[metric] : 0;
                const p = prompt(`Введіть нову ціль:`, curr);
                if (p !== null && !isNaN(p) && p.trim() !== '') {
                    if (!StorageManager.data.targets) StorageManager.data.targets = {};
                    StorageManager.data.targets[metric] = parseInt(p, 10);
                    StorageManager.saveData();
                }
            });
        });

        // Edit Strategy Toggle
        if (this.btnToggleEditStrat) {
            this.btnToggleEditStrat.addEventListener('click', () => {
                this.isEditingStrategy = !this.isEditingStrategy;
                this.btnToggleEditStrat.classList.toggle('bg-accent', this.isEditingStrategy);
                this.btnToggleEditStrat.textContent = this.isEditingStrategy ? '💾 Зберегти зміни' : '✏️ Режим редагування';

                this.editableTexts.forEach(el => {
                    el.contentEditable = this.isEditingStrategy;
                    if (this.isEditingStrategy) {
                        el.style.border = '1px dashed var(--accent)';
                        el.style.padding = '4px';
                        el.style.borderRadius = '4px';
                    } else {
                        el.style.border = 'none';
                        el.style.padding = '0';

                        // Save changes on exit
                        const key = el.getAttribute('data-editable');
                        if (!StorageManager.data.editableTexts) StorageManager.data.editableTexts = {};
                        StorageManager.data.editableTexts[key] = el.innerHTML;
                    }
                });

                if (!this.isEditingStrategy) {
                    StorageManager.saveData();
                    // showToast available globally if implemented, else ignore
                    if (typeof showToast !== 'undefined') showToast('✅ Тексти стратегії оновлено');
                }
            });
        }

        // Reset Sprint Button
        if (this.btnResetMetrics) {
            this.btnResetMetrics.addEventListener('click', () => {
                if (confirm('Точно скинути метрики поточного спринту (DM, відео, угоди)?')) {
                    StorageManager.data.metrics = {
                        messagesSent: 0,
                        responsesReceived: 0,
                        videosRecorded: 0,
                        dealsClosed: 0
                    };
                    StorageManager.saveData();
                }
            });
        }

        // Daily Checklist
        this.dailyInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                const key = e.target.getAttribute('data-daily');
                StorageManager.data.dailyChecklist.items[key] = e.target.checked;
                StorageManager.saveData();
                this.checkDailyCompletion();
            });
        });
    },

    incrementMetric(metricMapKey) {
        // map button attributes to storage keys
        const map = {
            'dms': 'messagesSent',
            'videos': 'videosRecorded',
            'responses': 'responsesReceived',
            'deals': 'dealsClosed'
        };
        const key = map[metricMapKey];
        if (key && StorageManager.data.metrics[key] !== undefined) {
            StorageManager.data.metrics[key]++;
            StorageManager.saveData();
        }
    },

    decrementMetric(metricMapKey) {
        const map = {
            'dms': 'messagesSent',
            'videos': 'videosRecorded',
            'responses': 'responsesReceived',
            'deals': 'dealsClosed'
        };
        const key = map[metricMapKey];
        if (key && StorageManager.data.metrics[key] !== undefined && StorageManager.data.metrics[key] > 0) {
            StorageManager.data.metrics[key]--;
            StorageManager.saveData();
        }
    },

    render(data) {
        if (!data) return;

        // 0. Apply dynamic texts
        if (data.editableTexts) {
            this.editableTexts.forEach(el => {
                const key = el.getAttribute('data-editable');
                // Only replace if it exists and we are not currently editing it (prevents cursor jump)
                if (data.editableTexts[key] && !this.isEditingStrategy) {
                    el.innerHTML = data.editableTexts[key];
                }
            });
        }

        // Render targets
        if (data.targets) {
            for (let k in this.targetEls) {
                if (this.targetEls[k]) this.targetEls[k].textContent = data.targets[k];
            }
            if (this.sprintTargetDms) {
                this.sprintTargetDms.textContent = data.targets['dms'] || 80;
            }
        }

        // 1. Render Metrics
        const m = data.metrics;
        if (this.valDms) this.valDms.textContent = m.messagesSent;
        if (this.valVideos) this.valVideos.textContent = m.videosRecorded;
        if (this.valResponses) this.valResponses.textContent = m.responsesReceived;
        if (this.valDeals) this.valDeals.textContent = m.dealsClosed;

        // 2. Calculate Rates
        const rRate = m.messagesSent > 0 ? ((m.responsesReceived / m.messagesSent) * 100).toFixed(1) : 0;
        const cRate = m.responsesReceived > 0 ? ((m.dealsClosed / m.responsesReceived) * 100).toFixed(1) : 0;

        if (this.responseRate) this.responseRate.textContent = `Conv: ${rRate}%`;
        if (this.closeRate) this.closeRate.textContent = `Conv: ${cRate}%`;

        // 3. Sprint Progress (Based on DMs)
        const targetDMs = data.targets && data.targets.dms ? data.targets.dms : 80;
        const pctDms = Math.min(100, Math.round((m.messagesSent / targetDMs) * 100)) || 0;

        if (this.sprintFill) this.sprintFill.style.width = `${pctDms}%`;
        if (this.sprintText) this.sprintText.textContent = `${m.messagesSent} з ${targetDMs} лідів (${pctDms}%)`;

        // 4. Timer Logic
        this.renderTimer(data.sprintStartDate, data.sprintEndDate);

        // 5. Daily Checklist
        this.renderDailyChecklist(data.dailyChecklist);
    },

    renderTimer(startDateStr, endDateStr) {
        if (!startDateStr || !endDateStr || !this.daysPassed) return;

        // Update inputs in settings
        if (this.inputStartDate && !this.inputStartDate.value) {
            this.inputStartDate.value = startDateStr;
        }
        if (this.inputEndDate && !this.inputEndDate.value) {
            this.inputEndDate.value = endDateStr;
        }

        const start = new Date(startDateStr);
        const end = new Date(endDateStr);
        const today = new Date();

        // Ensure time is normalized to midnight
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);

        const diffTimeStart = today - start;
        const diffDays = Math.max(0, Math.floor(diffTimeStart / (1000 * 60 * 60 * 24)));

        const totalDiffTime = end - start;
        const sprintLengthDays = Math.max(1, Math.floor(totalDiffTime / (1000 * 60 * 60 * 24))); // minimum 1 day

        const timePct = Math.min(100, Math.round((diffDays / sprintLengthDays) * 100));

        this.daysPassed.textContent = diffDays;
        if (this.totalDaysEl) this.totalDaysEl.textContent = sprintLengthDays;
        this.timeFill.style.width = `${timePct}%`;

        // Format dates neatly
        const sFormatter = new Intl.DateTimeFormat('uk-UA', { month: 'long', day: 'numeric' });
        this.dateStart.textContent = `Старт: ${sFormatter.format(start)}`;
        this.dateEnd.textContent = `Фініш: ${sFormatter.format(end)}`;
    },

    renderDailyChecklist(daily) {
        if (!daily || !daily.items) return;

        let completed = 0;
        this.dailyInputs.forEach(input => {
            const key = input.getAttribute('data-daily');
            input.checked = daily.items[key] === true;
            if (input.checked) completed++;
        });

        if (this.dailyStatus) this.dailyStatus.textContent = `${completed}/4`;

        if (completed === 4) {
            this.dailyStatus.classList.add('success');
        } else {
            this.dailyStatus.classList.remove('success');
            // ensure confetti is clear if unchecked
            if (this.confettiBox) this.confettiBox.innerHTML = '';
        }
    },

    checkDailyCompletion() {
        let completed = 0;
        this.dailyInputs.forEach(input => {
            if (input.checked) completed++;
        });

        if (completed === 4) {
            this.fireConfetti();
        }
    },

    fireConfetti() {
        if (!this.confettiBox) return;

        const emojis = ['🎉', '💸', '🔥', '🚀', '⚡'];
        this.confettiBox.innerHTML = '';

        for (let i = 0; i < 30; i++) {
            const el = document.createElement('div');
            el.className = 'confetti';
            el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
            el.style.position = 'absolute';
            el.style.left = `${Math.random() * 100}%`;
            el.style.top = `${Math.random() * 100}%`;
            el.style.fontSize = `${12 + Math.random() * 20}px`;
            el.style.animationDelay = `${Math.random() * 0.5}s`;

            this.confettiBox.appendChild(el);
        }

        setTimeout(() => {
            if (this.confettiBox) this.confettiBox.innerHTML = '';
        }, 2000);
    },

    setDailyQuote() {
        // Use day of year to seed random
        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 0);
        const diff = now - start;
        const oneDay = 1000 * 60 * 60 * 24;
        const dayOfYear = Math.floor(diff / oneDay);

        const index = dayOfYear % this.quotes.length;
        if (this.quoteEl) this.quoteEl.textContent = `"${this.quotes[index]}"`;
    }
};

// Auto-init
document.addEventListener('DOMContentLoaded', () => {
    Dashboard.init();
});
