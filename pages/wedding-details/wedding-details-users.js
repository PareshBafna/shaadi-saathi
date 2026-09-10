import { supabase } from '../../database/js/api.js';
import { openModal } from '../../global/js/modal.js';
import { showSweetAlert } from '../../global/js/sweet-alert-message.js';
import { layoutDetailsModalFooter, convertToSearchableDropdown, broadcastWeddingDataUpdated } from './wedding-details-common.js';

export function buildWeddingUserListSection(wedding, wUsers, canConfig) {
    const section = document.createElement("div");
    section.className = "wedding-details-section";

    let searchQuery = '';

    const controlsRow = document.createElement("div");
    controlsRow.className = "wedding-details-section__control-bar";
    
    let btnHTML = canConfig ? `
        <button id="add-wedding-user-btn-trigger" class="wedding-action-btn-primary">
            <i data-lucide="plus"></i> Wedding User
        </button>
    ` : '<div></div>';

    controlsRow.innerHTML = `
        <div class="wedding-details-section__left-actions">${btnHTML}</div>
        <div class="wedding-details-section__right-actions">
            <div class="wedding-details-search-wrapper">
                <i data-lucide="search"></i>
                <input type="text" id="weddingUserSearchInput" placeholder="Search ..." class="wedding-details-search-input">
            </div>
        </div>
    `;
    section.appendChild(controlsRow);

    const content = document.createElement("div");
    section.appendChild(content);

    function renderWeddingUsers() {
        const filteredUsers = (wUsers || []).filter(u => {
            const query = searchQuery.toLowerCase();
            const nameMatch = (u.name || '').toLowerCase().includes(query);
            const phoneMatch = (u.phone || '').toLowerCase().includes(query);
            return nameMatch || phoneMatch;
        });

        const sortedUsers = filteredUsers.sort((a, b) => (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase()));

        if (!wUsers || wUsers.length === 0) {
            content.innerHTML = `<div class="wedding-details-empty-state">No wedding users assigned yet.</div>`;
            if (window.lucide) window.lucide.createIcons();
            return;
        }

        if (sortedUsers.length === 0) {
            content.innerHTML = `<div class="wedding-details-empty-state">No users match your search.</div>`;
            if (window.lucide) window.lucide.createIcons();
            return;
        }

        let listHTML = `
            <div class="wedding-details-table-container">
                <div class="wedding-details-table-inner--users">
                    <div class="users-table-grid wedding-details-table-header">
                        <div></div> 
                        <div>S.No</div>
                        <div>Name</div>
                        <div>Phone Number</div>
                    </div>
                    <div class="wedding-details-table-body-scroll">
        `;
        
        sortedUsers.forEach((u, index) => {
            const actionBtn = canConfig ? `
                <button class="edit-wedding-user-btn wedding-details-icon-btn" data-id="${u.id}" title="Edit">
                    <i data-lucide="edit-2" class="wedding-details-edit-icon"></i>
                </button>
            ` : `<div></div>`;

            listHTML += `
            <div class="wedding-details-table-row-wrap">
                <div class="users-table-grid">
                    ${actionBtn}
                    <div class="wedding-details-col-sno">${index + 1}</div>
                    <div class="guest-name-cell">
                        <h4 class="guest-name-text">${u.name || '-'}</h4>
                    </div>
                    <div class="guest-phone-cell">
                        <i data-lucide="phone"></i> <span>${u.phone || '-'}</span>
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
            const editBtns = content.querySelectorAll('.edit-wedding-user-btn');
            editBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openWeddingUserModal(btn.getAttribute('data-id'));
                });
            });

            if (window.lucide) window.lucide.createIcons();
        }, 0);
    }

    setTimeout(() => {
        renderWeddingUsers();
        const searchInput = section.querySelector('#weddingUserSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                searchQuery = e.target.value;
                renderWeddingUsers();
            });
        }
        if (canConfig) {
            const trigger = section.querySelector('#add-wedding-user-btn-trigger');
            if(trigger) {
                trigger.replaceWith(trigger.cloneNode(true));
                section.querySelector('#add-wedding-user-btn-trigger').addEventListener('click', () => openWeddingUserModal());
            }
        }
    }, 0);

    return section;
}

export async function openWeddingUserModal(existingRecordId = null) {
    const ctx = window.__weddingContext;
    if (!ctx || !ctx.canConfig) return;

    let existingRecord = null;
    if (existingRecordId) {
        try {
            const { data, error } = await supabase.from('wedding_users').select('*').eq('id', existingRecordId).single();
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
        <form id="weddingUserForm" novalidate class="wedding-details-modal-form" style="min-height: 250px; overflow: visible !important;">
            <div style="position: relative; width: 100%;">
                <label class="wedding-modal-label">Select Wedding User *</label>
                <select id="wUserId" required class="wedding-modal-input">
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
                    text: `Do you really want to remove this wedding user?`,
                    icon: 'question', 
                    showCancelButton: true,
                    confirmButtonColor: '#dc2626',
                    cancelButtonColor: '#6b7280',
                    confirmButtonText: 'Yes, remove them!'
                });

                if (result.isConfirmed) {
                    try {
                        const { error } = await supabase.from('wedding_users').delete().eq('id', existingRecord.id);
                        if (error) throw error;
                        
                        modal.close();
                        broadcastWeddingDataUpdated();
                        showSweetAlert('success', 'Removed!', `Wedding user has been removed.`);
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
            const selectEl = document.getElementById('wUserId');
            const selectedUserId = selectEl.value;

            if (!selectedUserId) {
                showSweetAlert('error', 'Missing Information', `Please fill out all mandatory fields. Missing: Wedding User`);
                return;
            }

            try {
                const payload = { wedding_id: ctx.weddingId, user_id: selectedUserId };

                if (existingRecord) {
                    const { error } = await supabase.from('wedding_users').update(payload).eq('id', existingRecord.id);
                    if (error) throw error;
                } else {
                    const { error } = await supabase.from('wedding_users').insert([payload]);
                    if (error) throw error;
                }

                modal.close();
                broadcastWeddingDataUpdated();
                showSweetAlert('success', existingRecord ? 'Updated!' : 'Added!', `Wedding user saved successfully.`);
            } catch (error) {
                showSweetAlert('error', 'Database Error', error.message);
            }
        }
    });

    const modal = openModal({
        title: existingRecord ? `Edit Wedding User` : `Add New Wedding User`,
        content: formHTML,
        actions: actions
    });

    setTimeout(() => {
        layoutDetailsModalFooter(!!existingRecord);
        convertToSearchableDropdown('wUserId');
    }, 50);
}