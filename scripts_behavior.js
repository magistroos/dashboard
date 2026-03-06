import { StorageManager } from "./storage.js";
import { showToast } from "./app.js";

export const ScriptsBehavior = {
    init() {
        this.cacheDOM();
        this.bindEvents();

        StorageManager.onChange((data) => this.renderCompliments(data.complimentsBank));
    },

    cacheDOM() {
        this.copyBtns = document.querySelectorAll('.copy-btn');

        this.listEl = document.getElementById('compliments-list');
        this.inputNew = document.getElementById('new-compliment');
        this.btnAdd = document.getElementById('btn-add-compliment');

        this.tempChecks = document.querySelectorAll('.temp-check');
    },

    bindEvents() {
        // Copy Script Buttons
        this.copyBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetId = e.currentTarget.getAttribute('data-target');
                const targetEl = document.getElementById(targetId);

                if (targetEl) {
                    // Extract text content, stripping HTML tags (like <span class="highlight">)
                    // but keeping basic line breaks
                    let textToCopy = targetEl.innerHTML
                        .replace(/<br\s*[\/]?>/gi, '\n') // br to newline
                        .replace(/<[^>]+>/g, '')         // strip tags
                        .replace(/&nbsp;/g, ' ')         // decode spaces
                        .trim();

                    this.copyToClipboard(textToCopy);

                    // Visual feedback
                    const originalText = e.currentTarget.innerHTML;
                    e.currentTarget.innerHTML = '✅ Скопійовано';
                    e.currentTarget.classList.add('success');

                    setTimeout(() => {
                        e.currentTarget.innerHTML = originalText;
                        e.currentTarget.classList.remove('success');
                    }, 2000);
                }
            });
        });

        // Add new compliment
        if (this.btnAdd) {
            this.btnAdd.addEventListener('click', () => this.addCompliment());
        }
        if (this.inputNew) {
            this.inputNew.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.addCompliment();
            });
        }

        // Compliments List delegation (Click to Copy + Click to Delete)
        if (this.listEl) {
            this.listEl.addEventListener('click', (e) => {
                // Delete
                if (e.target.classList.contains('del-btn')) {
                    e.stopPropagation(); // prevent copy
                    const idx = e.target.getAttribute('data-idx');
                    StorageManager.data.complimentsBank.splice(idx, 1);
                    StorageManager.saveData();
                    return;
                }

                // Copy
                const item = e.target.closest('.compliment-item');
                if (item) {
                    const text = item.querySelector('.comp-text').textContent;
                    this.copyToClipboard(text);
                    showToast("✅ Комплімент скопійовано");
                }
            });
        }

        // Temp checks (just visual clear on double click)
        const checkContainers = document.querySelectorAll('.checklist.box-bg label');
        checkContainers.forEach(lbl => {
            lbl.addEventListener('dblclick', () => {
                // Clear all temp checks on double click of any
                this.tempChecks.forEach(c => c.checked = false);
                showToast("🧹 Чек-лист очищено для нового відео");
            });
        });
    },

    renderCompliments(bank) {
        if (!this.listEl || !bank) return;

        let html = '';
        bank.forEach((item, idx) => {
            html += `
                <div class="compliment-item">
                    <span class="comp-text">${item}</span>
                    <span class="del-btn" data-idx="${idx}">🗑️</span>
                </div>
            `;
        });
        this.listEl.innerHTML = html;
    },

    addCompliment() {
        const val = this.inputNew.value.trim();
        if (val) {
            StorageManager.data.complimentsBank.push(val);
            StorageManager.saveData();
            this.inputNew.value = '';
            showToast("✅ Додано в банк");
        }
    },

    copyToClipboard(text) {
        // Modern approach
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).catch(err => {
                console.error("Clipboard copy failed", err);
                this.fallbackCopyTextToClipboard(text);
            });
        } else {
            // Fallback for older browsers or non-HTTPS local dev
            this.fallbackCopyTextToClipboard(text);
        }
    },

    fallbackCopyTextToClipboard(text) {
        var textArea = document.createElement("textarea");
        textArea.value = text;

        // Avoid scrolling to bottom
        textArea.style.top = "0";
        textArea.style.left = "0";
        textArea.style.position = "fixed";

        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
            document.execCommand('copy');
        } catch (err) {
            console.error('Fallback: Oops, unable to copy', err);
        }

        document.body.removeChild(textArea);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    ScriptsBehavior.init();
});
