import { StorageManager } from "./storage.js";
import { showToast } from "./app.js";

const roadmapDefine = [
    {
        phase: 'phase0',
        items: [
            "Зробити демо-лендінг з робочою формою запису",
            "Налаштувати Telegram-бот (миттєві сповіщення адміну)",
            "Протестувати зв'язку: форма → бот → Telegram",
            "Підготувати Instagram профіль (шапка, фото, 2–3 пости)",
            "Створити Loom акаунт і перевірити запис",
            "Підготувати шаблон міні-сторінки для демонстрації",
            "Зберегти банк компліментів (5+ фраз)"
        ]
    },
    {
        phase: 'phase1',
        items: [
            "Зібрати 30 лідів через Google Maps",
            "Зібрати ще 20 лідів (всього 50)",
            "Переглянути і кваліфікувати кожного (3 Red Flags)",
            "Підписатись на перших 10 (прогрівання)",
            "Лайкнути по 2–3 пости кожному",
            "Залишити 1 коментар кожному (по суті)",
            "Зачекати 24–48 годин",
            "Записати перші 5 відео (персоналізованих)",
            "Надіслати перші 5 DM",
            "Обробити відповіді",
            "Фоллоу-ап тим, хто не відповів через 48 год (Telegram)"
        ]
    },
    {
        phase: 'phase2',
        items: [
            "Довести базу до 80 лідів",
            "Прогрівання наступної партії (підписка + лайки)",
            "Записати ще 10 відео",
            "Надіслати 15+ DM",
            "Обробити всі відповіді",
            "Провести перші переговори (деталі, ціна)",
            "Показати демо-лендінг зацікавленим",
            "Зафіксувати основні заперечення"
        ]
    },
    {
        phase: 'phase3',
        items: [
            "Закрити першу угоду ($250)",
            "Доставити продукт за 48 годин",
            "Отримати відгук від першого клієнта",
            "Зробити скріншот кейсу (було → стало)",
            "Закрити другу угоду",
            "Провести ретроспективу: що працювало, що ні",
            "Оновити скрипти на основі зворотного зв'язку",
            "Вирішити: масштабувати чи пробувати іншу нішу"
        ]
    }
];

export const Roadmap = {
    init() {
        this.cacheDOM();
        this.renderChecklistStructure();
        this.bindEvents();

        StorageManager.onChange((data) => this.updateUI(data.roadmap));
    },

    cacheDOM() {
        this.lists = {
            phase0: document.getElementById('list-phase0'),
            phase1: document.getElementById('list-phase1'),
            phase2: document.getElementById('list-phase2'),
            phase3: document.getElementById('list-phase3')
        };

        this.bars = {
            phase0: document.getElementById('phase0-bar'),
            phase1: document.getElementById('phase1-bar'),
            phase2: document.getElementById('phase2-bar'),
            phase3: document.getElementById('phase3-bar')
        };

        this.pcts = {
            phase0: document.getElementById('phase0-pct'),
            phase1: document.getElementById('phase1-pct'),
            phase2: document.getElementById('phase2-pct'),
            phase3: document.getElementById('phase3-pct')
        };

        this.btnReset = document.getElementById('btn-reset-roadmap');
    },

    renderChecklistStructure() {
        roadmapDefine.forEach(def => {
            const container = this.lists[def.phase];
            if (!container) return;

            let html = '';
            def.items.forEach((text, index) => {
                html += `
                    <label class="checkbox-item roadmap-item">
                        <input type="checkbox" data-phase="${def.phase}" data-index="${index}">
                        <span class="checkmark"></span>
                        <span class="label-text">${text}</span>
                    </label>
                `;
            });
            container.innerHTML = html;
        });
    },

    bindEvents() {
        // Delegate change event for all dynamically created checkboxes
        const containers = document.querySelectorAll('.roadmap-item input[type="checkbox"]');
        containers.forEach(chk => {
            chk.addEventListener('change', (e) => {
                const phase = e.target.getAttribute('data-phase');
                const idx = parseInt(e.target.getAttribute('data-index'));

                // Update Storage
                StorageManager.data.roadmap[phase][idx] = e.target.checked;
                StorageManager.saveData();
                // Note: The UI progresses will be updated via the onChange callback
            });
        });

        // Reset Roadmap button
        if (this.btnReset) {
            this.btnReset.addEventListener('click', () => {
                if (confirm("Точно скинути весь план дій?")) {
                    StorageManager.data.roadmap = {
                        phase0: Array(7).fill(false),
                        phase1: Array(11).fill(false),
                        phase2: Array(8).fill(false),
                        phase3: Array(8).fill(false)
                    };
                    StorageManager.saveData();
                    showToast("✅ План скинуто");
                }
            });
        }
    },

    updateUI(roadmapData) {
        if (!roadmapData) return;

        // Update Checkboxes and Progress Bars
        roadmapDefine.forEach(def => {
            const phaseKey = def.phase;
            if (!roadmapData[phaseKey]) return;

            const storedChecks = roadmapData[phaseKey];
            let checkedCount = 0;
            const totalCount = def.items.length;

            // 1. Update visual checked state
            const inputs = this.lists[phaseKey].querySelectorAll('input[type="checkbox"]');
            inputs.forEach((input, idx) => {
                const isChecked = storedChecks[idx] === true;
                input.checked = isChecked;
                if (isChecked) checkedCount++;
            });

            // 2. Update Progress Bar
            const pct = Math.round((checkedCount / totalCount) * 100);

            if (this.bars[phaseKey]) {
                this.bars[phaseKey].style.width = `${pct}%`;
            }
            if (this.pcts[phaseKey]) {
                this.pcts[phaseKey].textContent = `${pct}%`;

                // Colorize badge if 100%
                if (pct === 100) {
                    this.pcts[phaseKey].classList.add('success');
                } else {
                    this.pcts[phaseKey].classList.remove('success');
                }
            }

            // 3. Update Timeline Nodes and Lines
            const node = document.getElementById(`node-${phaseKey}`);
            const lineFill = document.getElementById(`line-fill-${phaseKey}`);

            if (node) {
                node.classList.remove('active', 'completed');
                if (pct > 0 && pct < 100) {
                    node.classList.add('active');
                } else if (pct === 100) {
                    node.classList.add('completed');
                }
            }

            if (lineFill) {
                lineFill.style.height = `${pct}%`;
                if (pct === 100) {
                    lineFill.classList.add('completed');
                } else {
                    lineFill.classList.remove('completed');
                }
            }
        });
    }
};

document.addEventListener('DOMContentLoaded', () => {
    Roadmap.init();
});
