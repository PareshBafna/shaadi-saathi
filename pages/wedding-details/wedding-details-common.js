import { supabase } from '../../database/js/api.js';
import { showSweetAlert } from '../../global/js/sweet-alert-message.js';

export function normalizePhone(phone) {
    if (!phone) return '';
    const digits = phone.replace(/[^0-9]/g, '');
    return digits.length > 10 ? digits.slice(-10) : digits;
}

export function generateInviteCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

let broadcastTimer = null;
export function broadcastWeddingDataUpdated() {
    if (broadcastTimer) return;
    broadcastTimer = setTimeout(() => {
        broadcastTimer = null;
        window.dispatchEvent(new Event('weddingDataUpdated'));
        window.dispatchEvent(new Event('weddingsDataUpdated'));
        if (typeof window.__refreshCurrentWeddingDetails === 'function') {
            window.__refreshCurrentWeddingDetails();
        }
    }, 150);
}

export function ensureXLSXLoaded() {
    return new Promise((resolve, reject) => {
        if (typeof XLSX !== 'undefined') return resolve(window.XLSX);
        const existingScript = document.getElementById('xlsx-script-cdn');
        if (existingScript) {
            existingScript.addEventListener('load', () => resolve(window.XLSX));
            return;
        }
        const script = document.createElement('script');
        script.id = 'xlsx-script-cdn';
        script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
        script.onload = () => resolve(window.XLSX);
        script.onerror = () => reject(new Error('Failed to load Excel export/import engine.'));
        document.head.appendChild(script);
    });
}

export function layoutDetailsModalFooter(isEditModal = false) {
    const allBtns = Array.from(document.querySelectorAll('button'));
    const cancelBtn = allBtns.find(b => b.textContent.trim() === 'Cancel');
    const closeBtn = allBtns.find(b => b.textContent.trim() === 'Close');
    const deleteBtn = allBtns.find(b => b.textContent.trim() === 'Delete');
    const primaryBtn = allBtns.find(b => ['Add', 'Edit', 'Update', 'Create', 'Apply Variant'].includes(b.textContent.trim()));

    if (cancelBtn) {
        cancelBtn.classList.add('modal-btn-cancel');
        cancelBtn.style.order = '1';
        cancelBtn.style.flexShrink = '0';
        cancelBtn.style.margin = '0';
    }

    if (closeBtn) {
        closeBtn.classList.remove('modal-btn-cancel');
        closeBtn.classList.add('wedding-action-btn-primary');
        closeBtn.style.order = '1';
        closeBtn.style.marginLeft = 'auto';
    }

    if (deleteBtn) {
        deleteBtn.classList.add('modal-btn-delete');
        deleteBtn.style.order = '2';
        deleteBtn.style.flexShrink = '0';
        deleteBtn.style.margin = '0 auto';
    }

    if (primaryBtn) {
        primaryBtn.style.order = '3';
        primaryBtn.style.flexShrink = '0';
        primaryBtn.style.marginLeft = (isEditModal && deleteBtn) ? '0' : 'auto';
        primaryBtn.style.whiteSpace = 'nowrap';
    }

    const container = cancelBtn?.parentElement || closeBtn?.parentElement;
    if (container) {
        container.style.display = 'flex';
        container.style.flexDirection = 'row';
        container.style.flexWrap = 'nowrap';
        container.style.width = '100%';
        container.style.justifyContent = 'space-between';
        container.style.alignItems = 'center';
        container.style.gap = '8px';
        container.style.boxSizing = 'border-box';
    }
}

export function convertToSearchableDropdown(selectId, onSelectCallback = null) {
    const select = document.getElementById(selectId);
    if (!select) return;

    const existingWrapper = select.parentElement?.querySelector('.searchable-dropdown-wrapper');
    if (existingWrapper) {
        existingWrapper.remove();
    }

    select.style.display = 'none';

    const wrapper = document.createElement('div');
    wrapper.className = 'searchable-dropdown-wrapper';
    wrapper.style.cssText = 'position: relative; width: 100%; text-align: left; font-family: inherit; box-sizing: border-box;';
    select.parentNode.insertBefore(wrapper, select);

    const initialValid = select.value !== "";
    const displayBorder = initialValid ? '1px solid #16a34a' : (select.hasAttribute('required') ? '1px solid #dc2626' : '1px solid var(--color-border, #292524)');

    const displayBox = document.createElement('div');
    displayBox.style.cssText = `width: 100%; min-height: 38px; height: 38px; padding: 0 32px 0 10px; border: ${displayBorder}; border-radius: var(--radius-sm, 4px); box-sizing: border-box; background: var(--color-bg, #0c0a09); color: var(--color-text-primary, #ffffff); cursor: pointer; display: flex; align-items: center; transition: border-color 0.2s;`;
    
    const displayText = document.createElement('span');
    displayText.style.cssText = 'overflow: hidden; white-space: nowrap; text-overflow: ellipsis; flex-grow: 1; font-size: var(--font-size-sm, 0.875rem); line-height: 1;';
    displayBox.appendChild(displayText);

    const chevron = document.createElement('div');
    chevron.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`;
    chevron.style.cssText = 'position: absolute; right: 10px; top: 50%; transform: translateY(-50%); pointer-events: none; color: var(--color-text-secondary, #a1a1aa); display: flex; align-items: center;';
    
    wrapper.appendChild(displayBox);
    wrapper.appendChild(chevron);

    const dropdownMenu = document.createElement('div');
    dropdownMenu.style.cssText = 'width: 100%; background: var(--color-bg, #0c0a09); border: 1px solid var(--color-border, #292524); border-radius: var(--radius-sm, 4px); display: none; box-shadow: 0 4px 12px rgba(0,0,0,0.5); margin-top: 6px; padding: 8px; flex-direction: column; gap: 8px; box-sizing: border-box; position: absolute; z-index: 10000; top: 100%; left: 0;';
    
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search...';
    searchInput.style.cssText = 'width: 100%; height: 34px; padding: 6px 10px; border: 1px solid var(--color-border, #292524); border-radius: var(--radius-sm, 4px); box-sizing: border-box; background: var(--color-white, #1c1917); color: var(--color-text-primary, #ffffff); outline: none; font-size: var(--font-size-sm, 0.875rem);';
    
    const optionsList = document.createElement('div');
    optionsList.style.cssText = 'max-height: 150px; overflow-y: auto; display: flex; flex-direction: column; scrollbar-gutter: stable; padding-right: 2px;';

    dropdownMenu.appendChild(searchInput);
    dropdownMenu.appendChild(optionsList);
    wrapper.appendChild(dropdownMenu);

    const options = Array.from(select.options);
    
    function updateDisplay() {
        const selectedOpt = options.find(o => o.value === select.value);
        if (selectedOpt && select.value !== "") {
            displayText.textContent = selectedOpt.text;
            displayText.style.color = 'var(--color-text-primary, #ffffff)';
            displayBox.style.borderColor = '#16a34a';
        } else {
            displayText.textContent = options[0]?.text || '-- Select --';
            displayText.style.color = 'var(--color-text-secondary, #a1a1aa)';
            displayBox.style.borderColor = select.hasAttribute('required') ? '#dc2626' : 'var(--color-border, #292524)';
        }
    }

    function renderList(filter = '') {
        optionsList.innerHTML = '';
        const filtered = options.filter(opt => opt.text.toLowerCase().includes(filter.toLowerCase()));

        if (filtered.length === 0) {
            const noRes = document.createElement('div');
            noRes.style.cssText = 'padding: 8px; color: var(--color-text-muted, #71717a); font-size: 0.85rem; text-align: center;';
            noRes.textContent = 'No results found';
            optionsList.appendChild(noRes);
            return;
        }

        filtered.forEach(opt => {
            const item = document.createElement('div');
            const isSelected = select.value === opt.value;
            item.style.cssText = `padding: 7px 10px; cursor: pointer; border-radius: 4px; font-size: var(--font-size-sm, 0.875rem); color: var(--color-text-primary, #ffffff); transition: background 0.15s; margin-bottom: 2px; ${isSelected ? 'background: var(--color-border, #292524); font-weight: 600;' : ''}`;
            item.textContent = opt.text;
            
            item.addEventListener('mouseover', () => { if(select.value !== opt.value) item.style.background = 'rgba(255,255,255,0.06)'; });
            item.addEventListener('mouseout', () => { if(select.value !== opt.value) item.style.background = 'transparent'; });
            
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                select.value = opt.value;
                updateDisplay();
                dropdownMenu.style.display = 'none';
                select.dispatchEvent(new Event('change'));
                if (typeof onSelectCallback === 'function') {
                    onSelectCallback(opt.value);
                }
            });
            optionsList.appendChild(item);
        });
    }

    displayBox.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = dropdownMenu.style.display === 'flex';
        
        document.querySelectorAll('.searchable-dropdown-menu').forEach(el => {
            el.style.display = 'none';
        });

        if (!isOpen) {
            dropdownMenu.style.display = 'flex';
            dropdownMenu.classList.add('searchable-dropdown-menu');
            searchInput.value = '';
            renderList('');
            setTimeout(() => searchInput.focus(), 20);
        } else {
            dropdownMenu.style.display = 'none';
        }
    });

    searchInput.addEventListener('input', (e) => {
        renderList(e.target.value);
    });

    document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) {
            dropdownMenu.style.display = 'none';
        }
    });

    updateDisplay();
}