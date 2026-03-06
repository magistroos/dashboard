import { StorageManager } from "./storage.js";
import { showToast } from "./app.js";

export const Leads = {
    init() {
        this.cacheDOM();
        this.bindEvents();

        StorageManager.onChange((data) => this.updateUI(data.leads));
    },

    cacheDOM() {
        // Counter
        this.valCount = document.getElementById('val-leads-count');
        this.btnMinus = document.getElementById('btn-lead-minus');
        this.btnPlus = document.getElementById('btn-lead-plus');
        this.progressFill = document.getElementById('lead-progress-fill');

        // Cities
        this.citiesContainer = document.getElementById('cities-container');
        this.newCityInput = document.getElementById('new-city');
        this.btnAddCity = document.getElementById('btn-add-city');

        // Filter
        this.radios = document.querySelectorAll('.radio-group input[type="radio"]');
        this.filterResult = document.getElementById('filter-result');
        this.btnResetFilter = document.getElementById('btn-reset-filter');
    },

    bindEvents() {
        // COUNTER
        if (this.btnMinus) this.btnMinus.addEventListener('click', () => {
            if (StorageManager.data.leads.count > 0) {
                StorageManager.data.leads.count--;
                StorageManager.saveData();
            }
        });
        if (this.btnPlus) this.btnPlus.addEventListener('click', () => {
            StorageManager.data.leads.count++;
            StorageManager.saveData();
        });

        // CITIES
        if (this.btnAddCity) this.btnAddCity.addEventListener('click', () => this.addCity());
        if (this.newCityInput) this.newCityInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addCity();
        });

        // Use event delegation for deleting cities
        if (this.citiesContainer) {
            this.citiesContainer.addEventListener('click', (e) => {
                if (e.target.classList.contains('del-city')) {
                    const idx = e.target.getAttribute('data-idx');
                    StorageManager.data.leads.cities.splice(idx, 1);
                    StorageManager.saveData();
                }
            });
        }

        // FILTER
        this.radios.forEach(radio => {
            radio.addEventListener('change', () => this.evaluateFilter());
        });

        if (this.btnResetFilter) {
            this.btnResetFilter.addEventListener('click', () => {
                this.radios.forEach(r => r.checked = false);
                this.evaluateFilter(); // Will reset UI
            });
        }
    },

    updateUI(leadsData) {
        if (!leadsData) return;

        // 1. Counter Updates
        if (this.valCount) this.valCount.textContent = leadsData.count;
        if (this.progressFill) {
            const target = 80;
            const pct = Math.min(100, Math.round((leadsData.count / target) * 100));
            this.progressFill.style.width = `${pct}%`;

            if (pct >= 100) this.progressFill.classList.add('bg-success');
            else this.progressFill.classList.remove('bg-success');
        }

        // 2. Render Cities
        if (this.citiesContainer) {
            let html = '';
            leadsData.cities.forEach((city, index) => {
                html += `
                    <div class="chip active">
                        ✓ ${city}
                        <span class="del-city" data-idx="${index}">&times;</span>
                    </div>
                `;
            });
            this.citiesContainer.innerHTML = html;
        }
    },

    addCity() {
        const val = this.newCityInput.value.trim();
        if (val) {
            StorageManager.data.leads.cities.push(val);
            StorageManager.saveData();
            this.newCityInput.value = '';
            showToast(`Місто ${val} додано`);
        }
    },

    evaluateFilter() {
        if (!this.filterResult) return;

        const q1 = document.querySelector('input[name="q1"]:checked')?.value;
        const q2 = document.querySelector('input[name="q2"]:checked')?.value;
        const q3 = document.querySelector('input[name="q3"]:checked')?.value;

        if (!q1 && !q2 && !q3) {
            this.filterResult.className = 'filter-result mt-4';
            this.filterResult.innerHTML = '<div class="text-center text-secondary py-3">Оберіть всі відповіді...</div>';
            return;
        }

        if (q1 === 'no' || q2 === 'no' || q3 === 'no') {
            // RED FLAG TRIGGERED
            this.filterResult.className = 'filter-result mt-4 border-danger box-bg';
            this.filterResult.innerHTML = `
                <div class="flex-align gap-3 text-danger mb-2">
                    <span style="font-size:32px">❌</span>
                    <h3>ПРОПУСКАЄМО</h3>
                </div>
                <p class="text-secondary text-small">Лід має один з রেড-флагів. Не витрачайте час на прогрівання і відео, йдемо далі.</p>
            `;
        } else if (q1 === 'yes' && q2 === 'yes' && q3 === 'yes') {
            // ALL GREEN
            this.filterResult.className = 'filter-result mt-4 box-bg';
            this.filterResult.style.borderColor = 'var(--success)';
            this.filterResult.innerHTML = `
                <div class="flex-align gap-3 text-success mb-2">
                    <span style="font-size:32px">✅</span>
                    <h3>ІДЕАЛЬНО ПІДХОДИТЬ</h3>
                </div>
                <p class="text-secondary text-small">Пройшов фільтр. Додавай у Таблицю і починай <strong>Протокол Прогрівання</strong> (Лайки + Коменти).</p>
            `;
        } else {
            // INCOMPLETE
            this.filterResult.className = 'filter-result mt-4';
            this.filterResult.innerHTML = '<div class="text-center text-secondary py-3">Закінчіть оцінку...</div>';
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    Leads.init();
});
