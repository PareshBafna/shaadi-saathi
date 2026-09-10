import { supabase } from '../../database/js/api.js';
import { openModal } from '../../global/js/modal.js';
import { showSweetAlert } from '../../global/js/sweet-alert-message.js';
import { layoutDetailsModalFooter, convertToSearchableDropdown, broadcastWeddingDataUpdated } from './wedding-details-common.js';

export function buildHostListSection(wedding, hosts, canConfig, isCreator, curUserId) {
    const section = document.createElement("div");
    section.className = "wedding-details-section";

    let searchQuery = '';

    const controlsRow = document.createElement("div");
    controlsRow.className = "wedding-details-section__control-bar";
    
    let btnHTML = canConfig ? `
        <button id="add-host-btn-trigger" class="wedding-action-btn-primary">
            <i data-lucide="plus"></i> Wedding Host
        </button>
    ` : '<div></div>';

    controlsRow.innerHTML = `
        <div class="wedding-details-section__left-actions">${btnHTML}</div>
        <div class="wedding-details-section__right-actions">
            <div class="wedding-details-search-wrapper">
                <i data-lucide="search"></i>
                <input type="text" id="hostSearchInput" placeholder="Search ..." class="wedding-details-search-input">
            </div>
        </div>
    `;
    section.appendChild(controlsRow);

    const content = document.createElement("div");
    section.appendChild(content);

    function renderHosts() {
        const filteredHosts = (hosts || []).filter(h => {
            const query = searchQuery.toLowerCase();
            const nameMatch = (h.name || '').toLowerCase().includes(query);
            const phoneMatch = (h.phone || '').toLowerCase().includes(query);
            return nameMatch || phoneMatch;
        });

        const sortedHosts = filteredHosts.sort((a, b) => (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase()));

        if (!hosts || hosts.length === 0) {
            content.innerHTML = `<div class="wedding-details-empty-state">No wedding hosts assigned yet.</div>`;
            if (window.lucide) window.lucide.createIcons();
            return;
        }

        if (sortedHosts.length === 0) {
            content.innerHTML = `<div class="wedding-details-empty-state">No hosts match your search.</div>`;
            if (window.lucide) window.lucide.createIcons();
            return;
        }

        let listHTML = `
            <div class="wedding-details-table-container">
                <div class="wedding-details-table-inner--hosts">
                    <div class="hosts-table-grid wedding-details-table-header">
                        <div></div> 
                        <div>S.No</div>
                        <div>Name</div>
                        <div>Phone Number</div>
                    </div>
                    <div class="wedding-details-table-body-scroll">
        `;
        
        sortedHosts.forEach((host, index) => {
            const canEditThisHost = canConfig && (isCreator || host.user_id !== curUserId);
            
            const actionBtn = canEditThisHost ? `
                <button class="edit-host-btn wedding-details-icon-btn" data-id="${host.id}" title="Edit">
                    <i data-lucide="edit-2" class="wedding-details-edit-icon"></i>
                </button>
            ` : `<div></div>`;

            listHTML += `
            <div class="wedding-details-table-row-wrap">
                <div class="hosts-table-grid">
                    ${actionBtn}
                    <div class="wedding-details-col-sno">${index + 1}</div>
                    <div class="guest-name-cell">
                        <h4 class="guest-name-text">${host.name || '-'}</h4>
                    </div>
                    <div class="guest-phone-cell">
                        <i data-lucide="phone"></i> <span>${host.phone || '-'}</span>
                    </div>
                </div>
            </div>`;
        });

        listHTML += `
                    </div>
                </div>
            </div>
        `;
        
        content.innerHTML = listHTML;

        setTimeout(() => {
            const editBtns = content.querySelectorAll('.edit-host-btn');
            editBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openHostModal(btn.getAttribute('data-id'));
                });
            });

            if (window.lucide) window.lucide.createIcons();
        }, 0);
    }

    setTimeout(() => {
        renderHosts();
        const searchInput = section.querySelector('#hostSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                searchQuery = e.target.value;
                renderHosts();
            });
        }
        if (canConfig) {
            const trigger = section.querySelector('#add-host-btn-trigger');
            if(trigger) {
                trigger.replaceWith(trigger.cloneNode(true));
                section.querySelector('#add-host-btn-trigger').addEventListener('click', () => openHostModal());
            }
        }
    }, 0);

    return section;
}

export async function openHostModal(existingRecordId = null) {
    const ctx = window.__weddingContext;
    if (!ctx || !ctx.canConfig) return;

    let existingRecord = null;
    if (existingRecordId) {
        try {
            const { data, error } = await supabase.from('wedding_hosts').select('*').eq('id', existingRecordId).single();
            if (error) throw error;
            existingRecord = data;
        } catch (e) {
            showSweetAlert('error', 'Error', 'Failed to load record details.');
            return;
        }
    }

    let eligibleUsers = ctx.allSysUsers.filter(u => !ctx.assignedIds.has(u.id) && u.role !== 'creator');
    
    if (existingRecord) {
        const currentSysUser = ctx.allSysUsers.find(u => u.id === existingRecord.user_id);
        if (currentSysUser && !eligibleUsers.some(u => u.id === currentSysUser.id)) {
            eligibleUsers.push(currentSysUser);
        }
    }

    eligibleUsers.sort((a, b) => (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase()));

    let optionsHtml = eligibleUsers.map(u => 
        `<option value="${u.id}" ${existingRecord && existingRecord.user_id === u.id ? 'selected' : ''}>${u.name} - ${u.phone}</option>`
    ).join('');

    if (!optionsHtml) {
        optionsHtml = `<option value="" disabled>No eligible users available</option>`;
    }

    const formHTML = `
        <form id="sysUserForm" novalidate class="wedding-details-modal-form" style="min-height: 250px; overflow: visible !important;">
            <div style="position: relative; width: 100%;">
                <label class="wedding-modal-label">Select Wedding Host *</label>
                <select id="sysUserId" required class="wedding-modal-input">
                    ${existingRecord ? '' : `<option value="" disabled selected>-- Select --</option>`}
                    ${optionsHtml}
                </select>
            </div>
        </form>
    `;

    const actions = [];
    actions.push({ label: "Cancel", variant: "ghost" });

    if (existingRecord) {
        actions.push({
            label: "Delete",
            variant: "danger", 
            closesModal: false,
            onClick: async () => {
                const result = await Swal.fire({
                    title: 'Are you sure?',
                    text: `Do you really want to remove this wedding host?`,
                    icon: 'question', 
                    showCancelButton: true,
                    confirmButtonColor: '#dc2626',
                    cancelButtonColor: '#6b7280',
                    confirmButtonText: 'Yes, remove them!'
                });

                if (result.isConfirmed) {
                    try {
                        const { error } = await supabase.from('wedding_hosts').delete().eq('id', existingRecord.id);
                        if (error) throw error;
                        
                        modal.close();
                        broadcastWeddingDataUpdated();
                        showSweetAlert('success', 'Removed!', `Wedding Host has been removed.`);
                    } catch (error) {
                        showSweetAlert('error', 'Database Error', error.message);
                    }
                }
            }
        });
    }

    actions.push({ 
        label: existingRecord ? "Edit" : "Add", 
        variant: "primary", 
        closesModal: false,
        onClick: async () => {
            const selectEl = document.getElementById('sysUserId');
            const selectedUserId = selectEl.value;

            if (!selectedUserId) {
                showSweetAlert('error', 'Missing Information', `Please fill out all mandatory fields. Missing: Wedding Host`);
                return;
            }

            try {
                const payload = { wedding_id: ctx.weddingId, user_id: selectedUserId };

                if (existingRecord) {
                    const { error } = await supabase.from('wedding_hosts').update(payload).eq('id', existingRecord.id);
                    if (error) throw error;
                } else {
                    const { error } = await supabase.from('wedding_hosts').insert([payload]);
                    if (error) throw error;
                }

                modal.close();
                broadcastWeddingDataUpdated();
                showSweetAlert('success', existingRecord ? 'Updated!' : 'Added!', `Wedding Host saved successfully.`);
            } catch (error) {
                showSweetAlert('error', 'Database Error', error.message);
            }
        }
    });

    const modal = openModal({
        title: existingRecord ? `Edit Wedding Host` : `Add New Wedding Host`,
        content: formHTML,
        actions: actions
    });

    setTimeout(() => {
        layoutDetailsModalFooter(!!existingRecord);
        convertToSearchableDropdown('sysUserId');
    }, 50);
}