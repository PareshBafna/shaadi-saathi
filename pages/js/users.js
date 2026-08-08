import { supabase } from '../../database/js/api.js';
import { openModal } from '../../global/components/js/modal.js';
import { showAlert } from '../../global/components/js/alerts.js';

let currentPage = 1;
const usersPerPage = 10;
let searchQuery = '';
let allUsersData = [];

export function renderUsers() {
    const section = document.createElement("div");
    section.style.cssText = "background: var(--color-white); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-5); margin-bottom: var(--space-6);";

    const controlsRow = document.createElement("div");
    controlsRow.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-5); border-bottom: 1px solid var(--color-border); padding-bottom: var(--space-4); flex-wrap: wrap; gap: 12px;";

    controlsRow.innerHTML = `
        <div style="flex: 1 1 0; display: flex; gap: 8px; min-width: 200px;"></div>
        <div style="flex: 1 1 0; display: flex; justify-content: center; min-width: 150px;">
            <button id="add-user-btn" style="background: var(--color-primary); color: var(--color-text-on-accent); border: none; padding: 0.5rem 1.5rem; border-radius: var(--radius-sm); font-weight: var(--font-weight-semibold); cursor: pointer; font-size: var(--font-size-sm); display: flex; align-items: center; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
                <i data-lucide="plus" style="width:16px; height:16px; margin-right:4px;"></i> User
            </button>
        </div>
        <div style="flex: 1 1 0; display: flex; justify-content: flex-end; min-width: 200px;">
            <div style="position: relative; display: flex; align-items: center; width: 100%; max-width: 300px;">
                <i data-lucide="search" style="position: absolute; left: 10px; width: 16px; height: 16px; color: var(--color-text-muted);"></i>
                <input type="text" id="userSearchInput" placeholder="Search by name or phone..." style="width: 100%; padding: 0.5rem 0.5rem 0.5rem 32px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); font-size: var(--font-size-sm); background: var(--color-bg); color: var(--color-text-primary); outline: none; transition: border-color 0.2s;">
            </div>
        </div>
    `;
    section.appendChild(controlsRow);

    const content = document.createElement("div");
    content.id = "users-content";
    section.appendChild(content);

    setTimeout(() => {
        document.getElementById('add-user-btn').addEventListener('click', () => openUserModal());
        const searchInput = document.getElementById('userSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                searchQuery = e.target.value;
                currentPage = 1;
                renderUsersList();
            });
        }
        loadUsersData();
    }, 0);

    const updateHandler = () => {
        if (document.body.contains(section)) loadUsersData();
        else window.removeEventListener('systemUsersUpdated', updateHandler);
    };
    window.addEventListener('systemUsersUpdated', updateHandler);

    return section;
}

async function loadUsersData() {
    const content = document.getElementById("users-content");
    if (!content) return;
    content.innerHTML = `<div style="text-align: center; padding: var(--space-8); color: var(--color-text-secondary);">Loading users...</div>`;

    try {
        const { data: users, error: usersErr } = await supabase.from('users').select('*');
        if (usersErr) throw usersErr;

        const { data: hosts, error: hostsErr } = await supabase.from('wedding_hosts').select('*');
        if (hostsErr && hostsErr.code !== '42P01') throw hostsErr;

        const { data: wUsers, error: wUsersErr } = await supabase.from('wedding_users').select('*');
        if (wUsersErr && wUsersErr.code !== '42P01') throw wUsersErr;

        const { data: weddings, error: weddingsErr } = await supabase.from('weddings').select('id, end_date');
        if (weddingsErr) throw weddingsErr;

        const todayTime = new Date();
        todayTime.setHours(0, 0, 0, 0);

        const activeWeddingIds = (weddings || []).filter(w => {
            const end = new Date(w.end_date);
            end.setHours(0, 0, 0, 0);
            return end.getTime() >= todayTime.getTime();
        }).map(w => w.id);

        allUsersData = (users || []).map(u => {
            let wRole = '';
            const isHost = (hosts || []).some(h => h.user_id === u.id && activeWeddingIds.includes(h.wedding_id));
            if (isHost) {
                wRole = 'Host';
            } else {
                const isWUser = (wUsers || []).some(wu => wu.user_id === u.id && activeWeddingIds.includes(wu.wedding_id));
                if (isWUser) wRole = 'User';
            }
            return { ...u, wedding_role: wRole };
        });

        renderUsersList();
    } catch (error) {
        content.innerHTML = `<div style="color: var(--color-danger); padding: var(--space-5); text-align: center;">Error loading users: ${error.message}</div>`;
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
        content.innerHTML = `<div style="text-align: center; padding: var(--space-6); color: var(--color-text-muted); border: 1px dashed var(--color-border); border-radius: var(--radius-sm);">No users match your search.</div>`;
        if (window.lucide) window.lucide.createIcons();
        return;
    }

    const gridTemplate = "32px 280px 200px 1fr 60px 80px 100px 70px 110px";

    let listHTML = `
        <div style="display: grid; grid-template-columns: ${gridTemplate}; align-items: center; padding: 0 var(--space-4) var(--space-2) var(--space-4); border-bottom: 1px solid var(--color-border); margin-bottom: var(--space-2); color: var(--color-text-secondary); font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold); gap: 12px;">
            <div></div>
            <div>ID</div>
            <div>Name</div>
            <div>Phone Number</div>
            <div>PIN</div>
            <div>User Role</div>
            <div>Wedding Role</div>
            <div>Verified</div>
            <div style="text-align: right;">Action</div>
        </div>
    `;

    paginatedUsers.forEach(u => {
        const uJson = JSON.stringify(u).replace(/'/g, "&apos;").replace(/"/g, "&quot;");
        
        const verifiedBadge = u.is_verified 
            ? `<span style="color: #10b981; font-weight: bold;">Yes</span>` 
            : `<span style="color: #ef4444; font-weight: bold;">No</span>`;

        const editBtn = !u.is_verified ? `
            <button onclick="openUserModal(JSON.parse('${uJson}'))" style="background: none; border: none; cursor: pointer; color: var(--color-text-muted); padding: 4px; display: flex; align-items: center; justify-content: center;" onmouseover="this.style.color='var(--color-primary)'" onmouseout="this.style.color='var(--color-text-muted)'" title="Edit">
                <i data-lucide="edit-2" style="width: 16px; height: 16px;"></i>
            </button>
        ` : `<div></div>`;
        
        listHTML += `
        <div style="border: 1px solid var(--color-border); border-radius: var(--radius-sm); margin-bottom: var(--space-2); background: var(--color-bg); overflow: hidden;">
            <div style="display: grid; grid-template-columns: ${gridTemplate}; align-items: center; padding: var(--space-3) var(--space-4); transition: background 0.2s ease; gap: 12px;" onmouseover="this.style.background='var(--color-border)';" onmouseout="this.style.background='transparent';">
                
                ${editBtn}
                
                <div style="font-family: monospace; color: var(--color-text-muted); font-size: 0.75rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${u.id}">${u.id}</div>
                
                <div style="display: flex; align-items: center; overflow: hidden;">
                    <h4 style="margin: 0; font-size: 0.95rem; font-weight: var(--font-weight-medium); color: var(--color-text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${u.name || '-'}</h4>
                </div>

                <div style="display: flex; align-items: center; gap: 6px; color: var(--color-text-secondary); font-size: var(--font-size-sm); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    <i data-lucide="phone" style="width: 14px; height: 14px; flex-shrink: 0;"></i> ${u.phone || '-'}
                </div>

                <div style="font-family: monospace; letter-spacing: 1px; color: var(--color-text-primary);">${u.pin || '----'}</div>

                <div style="text-transform: capitalize; color: var(--color-text-secondary); font-size: var(--font-size-sm);">${u.role}</div>

                <div style="color: var(--color-text-secondary); font-size: var(--font-size-sm); font-weight: var(--font-weight-medium);">${u.wedding_role || '-'}</div>

                <div style="font-size: var(--font-size-sm);">${verifiedBadge}</div>

                <div style="text-align: right;">
                    <button onclick="imitateUser('${u.id}', '${(u.name || '').replace(/'/g, "\\'")}')" style="background: var(--color-primary); color: var(--color-text-on-accent); border: none; padding: 4px 10px; border-radius: var(--radius-sm); font-size: 0.75rem; font-weight: var(--font-weight-medium); cursor: pointer; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
                        Imitate User
                    </button>
                </div>
            </div>
        </div>`;
    });

    listHTML += `
        <div style="display: flex; justify-content: space-between; align-items: center; padding-top: var(--space-4); margin-top: var(--space-4); border-top: 1px solid var(--color-border);">
            <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">
                Showing ${startIndex + 1} to ${Math.min(startIndex + usersPerPage, filteredUsers.length)} of ${filteredUsers.length} users
            </div>
    `;

    if (totalPages > 1) {
        listHTML += `
            <div style="display: flex; gap: 8px; align-items: center;">
                <button class="pagination-btn" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''} style="background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-sm); padding: 4px 8px; cursor: ${currentPage === 1 ? 'not-allowed' : 'pointer'}; opacity: ${currentPage === 1 ? '0.5' : '1'}; color: var(--color-text-primary); display: flex; align-items: center;"><i data-lucide="chevron-left" style="width: 16px; height: 16px;"></i></button>
                <span style="font-size: var(--font-size-sm); color: var(--color-text-primary); font-weight: var(--font-weight-medium); padding: 0 8px;">Page ${currentPage} of ${totalPages}</span>
                <button class="pagination-btn" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''} style="background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-sm); padding: 4px 8px; cursor: ${currentPage === totalPages ? 'not-allowed' : 'pointer'}; opacity: ${currentPage === totalPages ? '0.5' : '1'}; color: var(--color-text-primary); display: flex; align-items: center;"><i data-lucide="chevron-right" style="width: 16px; height: 16px;"></i></button>
            </div>
        `;
    } else {
        listHTML += `<div></div>`; 
    }

    listHTML += `</div>`;
    content.innerHTML = listHTML;

    setTimeout(() => {
        const pageBtns = content.querySelectorAll('.pagination-btn');
        pageBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.hasAttribute('disabled')) return;
                currentPage = parseInt(btn.getAttribute('data-page'));
                renderUsersList();
            });
        });
        if (window.lucide) window.lucide.createIcons();
    }, 0);
}

// Attach globally for inline HTML handlers
window.openUserModal = function(user = null) {
    const formHTML = `
        <form id="sysUserForm" novalidate style="display:flex; flex-direction:column; gap:var(--space-3);">
            <div>
                <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:4px;">Full Name *</label>
                <input type="text" id="sysUserName" value="${user ? user.name.replace(/"/g, '&quot;') : ''}" required style="width:100%; background:var(--color-bg); border:1px solid var(--color-border); color:var(--color-text-primary); padding:var(--space-2); border-radius:var(--radius-sm); outline:none;">
            </div>
            <div>
                <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:4px;">Phone Number *</label>
                <input type="text" id="sysUserPhone" value="${user ? user.phone : ''}" required style="width:100%; background:var(--color-bg); border:1px solid var(--color-border); color:var(--color-text-primary); padding:var(--space-2); border-radius:var(--radius-sm); outline:none;">
            </div>
            <div style="display: flex; gap: var(--space-3);">
                <div style="flex: 1;">
                    <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:4px;">User Role *</label>
                    <select id="sysUserRole" required style="width:100%; background:var(--color-bg); border:1px solid var(--color-border); color:var(--color-text-primary); padding:var(--space-2); border-radius:var(--radius-sm); outline:none;">
                        <option value="guest" ${user && user.role === 'guest' ? 'selected' : ''}>Guest</option>
                        <option value="creator" ${user && user.role === 'creator' ? 'selected' : ''}>Creator</option>
                    </select>
                </div>
                <div style="flex: 1;">
                    <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:4px;">PIN *</label>
                    <input type="text" id="sysUserPin" value="${user && user.pin ? user.pin : ''}" maxlength="4" placeholder="4 Digits" required style="width:100%; background:var(--color-bg); border:1px solid var(--color-border); color:var(--color-text-primary); padding:var(--space-2); border-radius:var(--radius-sm); outline:none;">
                </div>
            </div>
            <div style="margin-top: 8px;">
                <label style="display:flex; align-items:center; gap:8px; font-size:var(--font-size-sm); color:var(--color-text-primary); cursor:pointer;">
                    <input type="checkbox" id="sysUserVerified" ${user && user.is_verified ? 'checked' : ''} style="accent-color: var(--color-primary); width: 16px; height: 16px;"> 
                    User is Verified
                </label>
            </div>
        </form>
    `;

    const actions = [
        { label: "Cancel", variant: "ghost" },
        { 
            label: user ? "Update" : "Add", 
            variant: "primary", 
            closesModal: false,
            onClick: async () => {
                const name = document.getElementById('sysUserName').value.trim();
                const phoneInput = document.getElementById('sysUserPhone').value.trim();
                const role = document.getElementById('sysUserRole').value;
                const pin = document.getElementById('sysUserPin').value.trim();
                const isVerified = document.getElementById('sysUserVerified').checked;

                if (!name || !phoneInput || !pin) {
                    showAlert({ icon: 'warning', title: 'Missing Information', text: `Please fill out Name, Phone, and PIN.` });
                    return;
                }

                const cleanedPhone = phoneInput.replace(/[^0-9+]/g, '');

                try {
                    // Check for duplicate phone
                    const { data: existing } = await supabase.from('users').select('id, phone').eq('phone', cleanedPhone);
                    if (existing && existing.length > 0) {
                        const duplicate = existing.find(e => !user || e.id !== user.id);
                        if (duplicate) {
                            showAlert({ icon: 'error', title: 'Duplicate Phone', text: 'This phone number is already registered to another user.' });
                            return;
                        }
                    }

                    const payload = { name, phone: cleanedPhone, role, pin, is_verified: isVerified };

                    if (user) {
                        const { error } = await supabase.from('users').update(payload).eq('id', user.id);
                        if (error) throw error;
                    } else {
                        const { error } = await supabase.from('users').insert([payload]);
                        if (error) throw error;
                    }

                    modal.close();
                    window.dispatchEvent(new Event('systemUsersUpdated')); 
                    showAlert({ icon: 'success', title: user ? 'Updated!' : 'Added!', text: `User saved successfully.`, timer: 2000 });
                } catch (error) {
                    showAlert({ icon: 'error', title: 'Database Error', text: error.message });
                }
            }
        }
    ];

    if (user) {
        actions.unshift({
            label: "Delete",
            variant: "danger", 
            closesModal: false,
            onClick: async () => {
                const result = await Swal.fire({
                    title: 'Are you sure?', text: `Do you really want to permanently delete ${user.name}?`, icon: 'warning', 
                    showCancelButton: true, confirmButtonColor: '#dc2626', confirmButtonText: 'Yes, delete!'
                });

                if (result.isConfirmed) {
                    try {
                        const { error } = await supabase.from('users').delete().eq('id', user.id);
                        if (error) throw error;
                        
                        modal.close();
                        window.dispatchEvent(new Event('systemUsersUpdated')); 
                        showAlert({ icon: 'success', title: 'Deleted!', text: `User has been removed.`, timer: 2000 });
                    } catch (error) {
                        showAlert({ icon: 'error', title: 'Database Error', text: error.message });
                    }
                }
            }
        });
    }

    const modal = openModal({ title: user ? "Edit User" : "Add New User", content: formHTML, actions: actions });

    setTimeout(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        btns.forEach(btn => {
            const txt = btn.textContent.trim();
            if (txt === 'Cancel' && !btn.hasAttribute('data-styled')) {
                btn.style.cssText = 'background: #6b7280; color: #ffffff; border: 1px solid #6b7280; padding: 0.5rem 1.25rem; border-radius: var(--radius-sm); font-weight: var(--font-weight-medium); cursor: pointer; transition: opacity 0.2s;';
                btn.setAttribute('data-styled', 'true');
            } else if (txt === 'Delete' && !btn.hasAttribute('data-styled')) {
                btn.style.cssText = 'background: #dc2626; color: #ffffff; border: 1px solid #dc2626; padding: 0.5rem 1.25rem; border-radius: var(--radius-sm); font-weight: var(--font-weight-semibold); cursor: pointer; transition: opacity 0.2s; margin-right: auto;';
                if (btn.parentElement) { btn.parentElement.style.display = 'flex'; btn.parentElement.style.width = '100%'; }
                btn.setAttribute('data-styled', 'true');
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
        confirmButtonText: 'Yes, Imitate'
    }).then((result) => {
        if (result.isConfirmed) {
            localStorage.setItem('ss_user_id', id);
            
            const targetUser = allUsersData.find(u => u.id === id);
            let targetHash = '#calendar'; // Default for Guests
            
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