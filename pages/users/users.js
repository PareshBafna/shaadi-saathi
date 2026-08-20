import { supabase } from '../../database/js/api.js';
import { openModal } from '../../global/js/modal.js';
import { showSweetAlert } from '../../global/js/sweet-alert-message.js';

let currentPage = 1;
const usersPerPage = 10;
let searchQuery = '';
let allUsersData = [];

export function renderUsers() {
    if (typeof window.checkSessionOrShowAlert === 'function' && !window.checkSessionOrShowAlert()) {
        const errSec = document.createElement("section");
        errSec.className = "users-auth-message";
        errSec.textContent = "Please log in to manage users.";
        return errSec;
    }

    const section = document.createElement("section");
    section.className = "users-page-wrapper";

    const controls = document.createElement('div');
    controls.className = "users-control-bar";

    const leftContainer = document.createElement('div');
    leftContainer.className = "users-left-action";
    const createBtn = document.createElement("button");
    createBtn.id = "add-user-btn";
    createBtn.className = "users-add-btn";
    createBtn.innerHTML = `<i data-lucide="plus"></i> User`;
    createBtn.addEventListener('click', () => openUserModal());
    leftContainer.appendChild(createBtn);

    const searchContainer = document.createElement('div');
    searchContainer.className = "users-search-container";
    searchContainer.innerHTML = `
        <div class="users-search-input-wrapper">
            <i data-lucide="search" class="users-search-icon"></i>
            <input type="text" id="userSearchInput" placeholder="Search by name or phone..." class="users-search-input">
        </div>
    `;

    controls.appendChild(leftContainer);
    controls.appendChild(searchContainer);
    section.appendChild(controls);

    const cardContainer = document.createElement("div");
    cardContainer.className = "users-card-container";

    const content = document.createElement("div");
    content.id = "users-content";
    cardContainer.appendChild(content);
    section.appendChild(cardContainer);

    setTimeout(() => {
        const searchInput = document.getElementById('userSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                searchQuery = e.target.value;
                currentPage = 1;
                renderUsersList();
            });
        }
        loadUsersData();
        if (window.lucide) window.lucide.createIcons();
    }, 50);

    const updateHandler = () => {
        if (document.body.contains(section)) {
            loadUsersData();
        } else {
            window.removeEventListener('systemUsersUpdated', updateHandler);
            window.removeEventListener('hashchange', hashChangeCleanup);
        }
    };

    const hashChangeCleanup = () => {
        const modalBackdrops = document.querySelectorAll('.modal-backdrop, .swal2-container');
        modalBackdrops.forEach(b => b.remove());
        window.removeEventListener('hashchange', hashChangeCleanup);
    };

    window.removeEventListener('systemUsersUpdated', updateHandler);
    window.addEventListener('systemUsersUpdated', updateHandler);
    window.addEventListener('hashchange', hashChangeCleanup);

    return section;
}

async function loadUsersData() {
    const content = document.getElementById("users-content");
    if (!content) return;
    content.innerHTML = `<div class="users-loading-state">Loading users...</div>`;

    try {
        const { data: users, error: usersErr } = await supabase.from('users').select('*');
        if (usersErr) throw usersErr;

        const { data: hosts, error: hostsErr } = await supabase.from('wedding_hosts').select('*');
        if (hostsErr && hostsErr.code !== '42P01') throw hostsErr;

        const { data: wUsers, error: wUsersErr } = await supabase.from('wedding_users').select('*');
        if (wUsersErr && wUsersErr.code !== '42P01') throw wUsersErr;

        const { data: guests, error: guestsErr } = await supabase.from('guests').select('*');
        if (guestsErr && guestsErr.code !== '42P01') throw guestsErr;

        const { data: weddings, error: weddingsErr } = await supabase.from('weddings').select('*');
        if (weddingsErr) throw weddingsErr;

        allUsersData = (users || []).map(u => {
            let roles = new Set();
            let hostWeddings = [];
            let userWeddings = [];
            let guestWeddings = [];

            const cleanedUserPhone = u.phone ? u.phone.replace(/[^0-9]/g, '') : null;
            const baseUserPhone = cleanedUserPhone ? cleanedUserPhone.slice(-10) : null;
            
            (hosts || []).forEach(h => {
                if (h.user_id === u.id) {
                    roles.add('Host');
                    const w = (weddings || []).find(x => x.id === h.wedding_id);
                    if (w) hostWeddings.push(w);
                }
            });

            (wUsers || []).forEach(wu => {
                if (wu.user_id === u.id) {
                    roles.add('User');
                    const w = (weddings || []).find(x => x.id === wu.wedding_id);
                    if (w) userWeddings.push(w);
                }
            });

            (guests || []).forEach(g => {
                const cleanedGuestPhone = g.phone ? g.phone.replace(/[^0-9]/g, '') : null;
                if (baseUserPhone && cleanedGuestPhone && cleanedGuestPhone.endsWith(baseUserPhone)) {
                    roles.add('Guest');
                    const w = (weddings || []).find(x => x.id === g.wedding_id);
                    if (w) guestWeddings.push(w);
                }
            });

            return { 
                ...u, 
                wedding_role: Array.from(roles).join(', ') || '-',
                host_weddings: hostWeddings,
                user_weddings: userWeddings,
                guest_weddings: guestWeddings
            };
        });

        renderUsersList();
    } catch (error) {
        content.innerHTML = `<div class="users-error-state">Error loading users: ${error.message}</div>`;
    }
}

function renderUsersList() {
    const content = document.getElementById("users-content");
    if (!content) return;

    const filteredUsers = allUsersData.filter(u => {
        const query = searchQuery.toLowerCase();
        const nameMatch = (u.name || '').toLowerCase().includes(query);
        const phoneMatch = (u.phone || '').toLowerCase().includes(query);
        return nameMatch || phoneMatch;
    });

    filteredUsers.sort((a, b) => (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase()));

    const totalPages = Math.ceil(filteredUsers.length / usersPerPage) || 1;
    if (currentPage > totalPages) currentPage = totalPages;

    const startIndex = (currentPage - 1) * usersPerPage;
    const paginatedUsers = filteredUsers.slice(startIndex, startIndex + usersPerPage);

    if (filteredUsers.length === 0) {
        content.innerHTML = `<div class="users-empty-state">No users match your search.</div>`;
        if (window.lucide) window.lucide.createIcons();
        return;
    }

    let listHTML = `
        <div class="users-table-scroll-container">
            <div class="users-table-inner">
                <div class="users-table-header">
                    <div></div>
                    <div></div>
                    <div>Name</div>
                    <div>Phone Number</div>
                    <div>PIN</div>
                    <div>User Role</div>
                    <div>Wedding Role</div>
                    <div>Verification</div>
                    <div class="users-table-header__action">Action</div>
                    <div></div>
                </div>
    `;

    paginatedUsers.forEach(u => {
        const verifiedBadge = u.is_verified 
            ? `<span class="users-badge-verified">Verified</span>` 
            : `<button class="verify-user-btn users-btn-verify" data-id="${u.id}">Verify</button>`;

        const toggleBtn = `
            <button class="toggle-weddings-btn users-icon-btn users-toggle-btn" data-target="child-user-${u.id}">
                <i data-lucide="chevron-right"></i>
            </button>
        `;

        const editBtn = !u.is_verified ? `
            <button class="edit-sys-user-btn users-icon-btn users-edit-btn" data-id="${u.id}" title="Edit">
                <i data-lucide="edit-2"></i>
            </button>
        ` : `<div></div>`;
        
        const renderWeddingsList = (title, weds) => {
            if (!weds || weds.length === 0) return '';
            const uniqueWeds = [];
            const seenIds = new Set();
            for (const w of weds) {
                if (!seenIds.has(w.id)) { seenIds.add(w.id); uniqueWeds.push(w); }
            }
            const wNames = uniqueWeds.map(w => {
                const names = w.primary_side === 'groom' ? `${w.groom_name} & ${w.bride_name}` : `${w.bride_name} & ${w.groom_name}`;
                return `<span class="users-wedding-tag"><i data-lucide="heart"></i> ${names}</span>`;
            }).join('');
            return `<div class="users-child-group">
                        <div class="users-child-group__title">${title}:</div>
                        <div class="users-child-group__list">${wNames}</div>
                    </div>`;
        };

        const idHTML = `
            <div class="users-child-group">
                <div class="users-child-group__title">User ID:</div>
                <div class="users-child-id-box">${u.id}</div>
            </div>
        `;

        const hostHTML = renderWeddingsList('Host', u.host_weddings);
        const userHTML = renderWeddingsList('User', u.user_weddings);
        const guestHTML = renderWeddingsList('Guest', u.guest_weddings);

        let childContent = idHTML + hostHTML + userHTML + guestHTML;

        listHTML += `
        <div class="users-table-row-wrapper">
            <div class="users-table-row">
                ${toggleBtn}
                ${editBtn}
                
                <div class="users-name-col">
                    <h4>${u.name || '-'}</h4>
                </div>

                <div class="users-phone-col">
                    <i data-lucide="phone"></i> <span>${u.phone || '-'}</span>
                </div>

                <div>
                    <span class="users-pin-col" data-pin="${u.pin || '------'}" data-hidden="true" title="Click to reveal PIN">
                        ••••••
                    </span>
                </div>

                <div class="users-role-col">${u.role}</div>

                <div class="users-wedding-role-col">${u.wedding_role || '-'}</div>

                <div class="users-status-col">${verifiedBadge}</div>

                <div class="users-action-col">
                    <button onclick="imitateUser('${u.id}', '${(u.name || '').replace(/'/g, "\\'")}')" class="users-btn-imitate">
                        Imitate
                    </button>
                </div>
                <div></div>
            </div>

            <div id="child-user-${u.id}" class="users-child-row">
                ${childContent}
            </div>
        </div>`;
    });

    listHTML += `
            </div>
        </div>
        <div class="users-pagination-bar">
            <div class="users-pagination-info">
                Showing ${startIndex + 1} to ${Math.min(startIndex + usersPerPage, filteredUsers.length)} of ${filteredUsers.length} users
            </div>
    `;

    if (totalPages > 1) {
        listHTML += `
            <div class="users-pagination-controls">
                <button class="pagination-btn users-page-btn" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}><i data-lucide="chevron-left"></i></button>
                <span class="users-page-indicator">Page ${currentPage} of ${totalPages}</span>
                <button class="pagination-btn users-page-btn" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}><i data-lucide="chevron-right"></i></button>
            </div>
        `;
    } else {
        listHTML += `<div></div>`; 
    }

    listHTML += `</div>`;
    content.innerHTML = listHTML;

    setTimeout(() => {
        content.querySelectorAll('.users-pin-col').forEach(pinEl => {
            pinEl.addEventListener('click', (e) => {
                e.stopPropagation();
                const isHidden = pinEl.getAttribute('data-hidden') === 'true';
                const actualPin = pinEl.getAttribute('data-pin');
                if (isHidden) {
                    pinEl.textContent = actualPin;
                    pinEl.setAttribute('data-hidden', 'false');
                    pinEl.setAttribute('title', 'Click to hide PIN');
                } else {
                    pinEl.textContent = '••••••';
                    pinEl.setAttribute('data-hidden', 'true');
                    pinEl.setAttribute('title', 'Click to reveal PIN');
                }
            });
        });

        content.querySelectorAll('.edit-sys-user-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const userId = btn.getAttribute('data-id');
                try {
                    const { data: userData, error } = await supabase.from('users').select('*').eq('id', userId).single();
                    if (error) throw error;
                    openUserModal(userData);
                } catch (err) {
                    showSweetAlert('error', 'Error', 'Could not fetch user details.');
                }
            });
        });

        const pageBtns = content.querySelectorAll('.pagination-btn');
        pageBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.hasAttribute('disabled')) return;
                currentPage = parseInt(btn.getAttribute('data-page'));
                renderUsersList();
            });
        });

        const toggleBtns = content.querySelectorAll('.toggle-weddings-btn');
        toggleBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const targetId = btn.getAttribute('data-target');
                const childRow = document.getElementById(targetId);
                const icon = btn.querySelector('i, svg');
                
                if (childRow.style.display === 'none' || !childRow.style.display) {
                    childRow.style.display = 'block';
                    if (icon) icon.style.transform = 'rotate(90deg)';
                } else {
                    childRow.style.display = 'none';
                    if (icon) icon.style.transform = 'rotate(0deg)';
                }
            });
        });

        const verifyBtns = content.querySelectorAll('.verify-user-btn');
        verifyBtns.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const userId = btn.getAttribute('data-id');
                try {
                    const { error } = await supabase.from('users').update({ is_verified: true }).eq('id', userId);
                    if (error) throw error;
                    showSweetAlert('success', 'Verified!', 'User has been successfully verified.');
                    loadUsersData();
                } catch (error) {
                    showSweetAlert('error', 'Verification Failed', error.message);
                }
            });
        });

        if (window.lucide) window.lucide.createIcons();
    }, 0);
}

function layoutUserModalFooter(isEditModal = false) {
    const allBtns = Array.from(document.querySelectorAll('button'));
    const cancelBtn = allBtns.find(b => b.textContent.trim() === 'Cancel');
    const deleteBtn = allBtns.find(b => b.textContent.trim() === 'Delete');
    const primaryBtn = allBtns.find(b => ['Add', 'Edit', 'Update'].includes(b.textContent.trim()));

    if (cancelBtn) {
        cancelBtn.classList.add('modal-btn-cancel');
        cancelBtn.style.order = '1';
        cancelBtn.style.flexShrink = '0';
        cancelBtn.style.marginRight = isEditModal ? '0' : '0';
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
        primaryBtn.style.marginLeft = isEditModal ? '0' : 'auto';
        primaryBtn.style.whiteSpace = 'nowrap';
    }

    const container = cancelBtn?.parentElement;
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

window.openUserModal = async function(userOrId = null) {
    let user = null;

    if (typeof userOrId === 'string') {
        try {
            const { data, error } = await supabase.from('users').select('*').eq('id', userOrId).single();
            if (error) throw error;
            user = data;
        } catch (error) {
            showSweetAlert('error', 'Data Error', 'Could not fetch user details.');
            return;
        }
    } else if (typeof userOrId === 'object') {
        user = userOrId;
    }

    const formHTML = `
        <form id="sysUserForm" novalidate class="sys-user-form">
            <div>
                <label class="sys-user-label">Full Name *</label>
                <input type="text" id="sysUserName" required class="sys-user-input ${user?.name ? 'sys-user-input--valid' : 'sys-user-input--invalid'}">
            </div>
            <div>
                <label class="sys-user-label">Phone Number *</label>
                <input type="tel" id="sysUserPhone" oninput="this.value = this.value.replace(/[^0-9]/g, '');" required class="sys-user-input ${user?.phone ? 'sys-user-input--valid' : 'sys-user-input--invalid'}">
            </div>
            <div>
                <label class="sys-user-label">6-Digit PIN *</label>
                <input type="password" id="sysUserPin" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" placeholder="Enter 6-digit PIN" oninput="this.value = this.value.replace(/[^0-9]/g, '');" required class="sys-user-input ${user?.pin ? 'sys-user-input--valid' : 'sys-user-input--invalid'}">
            </div>
        </form>
    `;

    const actions = [
        { label: "Cancel", variant: "ghost" },
        ...(user ? [{
            label: "Delete",
            variant: "danger", 
            closesModal: false,
            onClick: async () => {
                const result = await Swal.fire({
                    title: 'Are you sure?', 
                    text: `Do you really want to permanently delete this user?`, 
                    icon: 'question', 
                    showCancelButton: true, 
                    confirmButtonColor: '#dc2626', 
                    cancelButtonColor: '#6b7280',
                    confirmButtonText: 'Yes, delete!'
                });

                if (result.isConfirmed) {
                    try {
                        const { error } = await supabase.from('users').delete().eq('id', user.id);
                        if (error) throw error;
                        
                        modal.close();
                        window.dispatchEvent(new Event('systemUsersUpdated')); 
                        showSweetAlert('success', 'Deleted!', 'User has been removed.');
                    } catch (error) {
                        showSweetAlert('error', 'Database Error', error.message);
                    }
                }
            }
        }] : []),
        { 
            label: user ? "Update" : "Add", 
            variant: "primary", 
            closesModal: false,
            onClick: async () => {
                const requiredFields = [
                    { id: 'sysUserName', name: "Full Name" },
                    { id: 'sysUserPhone', name: "Phone Number" },
                    { id: 'sysUserPin', name: "6-Digit PIN" }
                ];

                let isValid = true;
                let firstEmpty = null;

                requiredFields.forEach(field => {
                    const el = document.getElementById(field.id);
                    if (!el.value.trim()) {
                        el.classList.add('sys-user-input--invalid');
                        el.classList.remove('sys-user-input--valid');
                        isValid = false;
                        if (!firstEmpty) firstEmpty = field.name;
                    } else {
                        el.classList.remove('sys-user-input--invalid');
                        el.classList.add('sys-user-input--valid');
                    }
                });

                if (!isValid) {
                    showSweetAlert('error', 'Missing Information', `Please fill out all mandatory fields. Missing: ${firstEmpty}`);
                    return;
                }

                const pinInput = document.getElementById('sysUserPin');
                if (!/^\d{6}$/.test(pinInput.value.trim())) {
                    pinInput.classList.add('sys-user-input--invalid');
                    pinInput.classList.remove('sys-user-input--valid');
                    showSweetAlert('error', 'Invalid PIN', 'PIN must be exactly 6 digits.');
                    return;
                }

                const name = document.getElementById('sysUserName').value.trim();
                const phoneInput = document.getElementById('sysUserPhone').value.trim();
                const pin = pinInput.value.trim();
                const cleanedPhone = phoneInput.replace(/[^0-9+]/g, '');

                try {
                    const { data: existing } = await supabase.from('users').select('id, phone').eq('phone', cleanedPhone);
                    if (existing && existing.length > 0) {
                        const duplicate = existing.find(e => !user || e.id !== user.id);
                        if (duplicate) {
                            document.getElementById('sysUserPhone').classList.add('sys-user-input--invalid');
                            document.getElementById('sysUserPhone').classList.remove('sys-user-input--valid');
                            showSweetAlert('warning', 'Duplicate Warning', 'This phone number is already registered to another user.');
                            return;
                        }
                    }

                    const payload = { name, phone: cleanedPhone, pin };
                    if (!user) {
                        payload.role = 'guest'; 
                    }

                    if (user) {
                        const { error } = await supabase.from('users').update(payload).eq('id', user.id);
                        if (error) throw error;
                    } else {
                        const { error } = await supabase.from('users').insert([payload]);
                        if (error) throw error;
                    }

                    modal.close();
                    window.dispatchEvent(new Event('systemUsersUpdated')); 
                    showSweetAlert('success', user ? 'Updated!' : 'Added!', 'User saved successfully.');
                } catch (error) {
                    showSweetAlert('error', 'Database Error', error.message);
                }
            }
        }
    ];

    const modal = openModal({ title: user ? "Edit User" : "Add New User", content: formHTML, actions: actions });

    setTimeout(() => {
        layoutUserModalFooter(!!user);

        if (user) {
            document.getElementById('sysUserName').value = user.name || '';
            document.getElementById('sysUserPhone').value = user.phone || '';
            document.getElementById('sysUserPin').value = user.pin || '';
        }

        ['sysUserName', 'sysUserPhone', 'sysUserPin'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                const updateValidationClass = () => {
                    if (el.value.trim() === '') {
                        el.classList.add('sys-user-input--invalid');
                        el.classList.remove('sys-user-input--valid');
                    } else {
                        el.classList.remove('sys-user-input--invalid');
                        el.classList.add('sys-user-input--valid');
                    }
                };
                updateValidationClass();
                el.addEventListener('input', updateValidationClass);
            }
        });
    }, 50);
};

window.imitateUser = function(id, name) {
    Swal.fire({
        title: 'Imitate User?',
        html: `You are about to switch your session to act as <b>${name}</b>?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: 'var(--color-primary)',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Yes, Imitate'
    }).then((result) => {
        if (result.isConfirmed) {
            localStorage.setItem('ss_user_id', id);
            
            const targetUser = allUsersData.find(u => u.id === id);
            let targetHash = '#calendar'; 
            
            if (targetUser) {
                if (targetUser.role === 'creator') {
                    targetHash = '#dashboard';
                } else if (targetUser.wedding_role === 'Host' || targetUser.wedding_role === 'User') {
                    targetHash = '#weddings';
                }
            }
            
            window.location.hash = targetHash;
            window.location.reload();
        }
    });
};