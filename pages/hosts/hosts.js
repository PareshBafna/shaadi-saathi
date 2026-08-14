import { supabase } from '../../database/js/api.js';
import { openModal } from '../../global/js/modal.js';
import { showAlert } from '../../global/js/alerts.js';

let allSystemUsers = [];
let allWeddings = [];
let allWeddingHosts = [];
let hostUsersData = []; 

export function renderHosts() {
    const section = document.createElement("div");
    section.style.cssText = "width: 100%; max-width: 1300px; margin: 0 auto; padding-bottom: var(--space-8);";

    // Add the Card Wrapper
    const cardContainer = document.createElement("div");
    cardContainer.style.cssText = "background: var(--color-white); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-5);";

    // Top Controls Row (Matching Users Page Layout: Center Button, Right Search)
    const controlsRow = document.createElement("div");
    controlsRow.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-4); padding-bottom: var(--space-5); border-bottom: 1px solid var(--color-border); flex-wrap: wrap; gap: 16px;";

    controlsRow.innerHTML = `
        <div style="flex: 1;"></div>
        <div style="display: flex; justify-content: center;">
            <button id="add-host-btn" style="background: var(--color-primary); color: var(--color-text-on-accent); border: none; padding: 0.5rem 1.25rem; border-radius: var(--radius-sm); font-weight: var(--font-weight-semibold); cursor: pointer; font-size: var(--font-size-sm); display: flex; align-items: center; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
                <i data-lucide="plus" style="width:16px; height:16px; margin-right:4px;"></i> Host
            </button>
        </div>
        <div style="flex: 1; display: flex; justify-content: flex-end;">
            <div style="position: relative; display: flex; align-items: center; width: 100%; max-width: 300px;">
                <i data-lucide="search" style="position: absolute; left: 10px; width: 16px; height: 16px; color: var(--color-text-muted);"></i>
                <input type="text" id="hostSearchInput" placeholder="Search by name or phone..." style="width: 100%; padding: 0.5rem 0.5rem 0.5rem 32px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); font-size: var(--font-size-sm); background: var(--color-bg); color: var(--color-text-primary); outline: none; transition: border-color 0.2s;">
            </div>
        </div>
    `;

    const listContainer = document.createElement("div");
    listContainer.id = "hosts-list-container";
    listContainer.style.cssText = "background: transparent;";

    // Append to card instead of directly to section
    cardContainer.appendChild(controlsRow);
    cardContainer.appendChild(listContainer);
    section.appendChild(cardContainer);

    listContainer.innerHTML = `<div style="text-align: center; padding: var(--space-8); color: var(--color-text-secondary);">Loading hosts...</div>`;

    setTimeout(() => {
        loadHostsData();
    }, 0);

    const updateHandler = () => {
        if (document.body.contains(section)) {
            loadHostsData();
        } else {
            window.removeEventListener('hostsDataUpdated', updateHandler);
        }
    };
    window.addEventListener('hostsDataUpdated', updateHandler);

    return section;
}

async function loadHostsData() {
    try {
        const [usersRes, weddingsRes, hostsRes] = await Promise.all([
            supabase.from('users').select('*'),
            supabase.from('weddings').select('*'),
            supabase.from('wedding_hosts').select('*')
        ]);

        if (usersRes.error) throw usersRes.error;
        if (weddingsRes.error) throw weddingsRes.error;
        if (hostsRes.error && hostsRes.error.code !== '42P01') throw hostsRes.error;

        allSystemUsers = usersRes.data || [];
        allWeddings = weddingsRes.data || [];
        allWeddingHosts = hostsRes.data || [];

        const uniqueHostIds = [...new Set(allWeddingHosts.map(h => h.user_id))];
        
        hostUsersData = uniqueHostIds.map(userId => {
            const user = allSystemUsers.find(u => u.id === userId) || { id: userId, name: 'Unknown', phone: 'Unknown' };
            const assignedWeddingIds = allWeddingHosts.filter(h => h.user_id === userId).map(h => h.wedding_id);
            const assignedWeddings = allWeddings.filter(w => assignedWeddingIds.includes(w.id));
            
            return {
                ...user,
                assigned_weddings: assignedWeddings
            };
        });

        renderHostsList();

    } catch (error) {
        console.error("Error loading hosts:", error);
        document.getElementById("hosts-list-container").innerHTML = `<div style="color: var(--color-danger); text-align: center; padding: var(--space-8);">Failed to load hosts: ${error.message}</div>`;
    }
}

let currentPage = 1;
const itemsPerPage = 10;
let searchQuery = '';

function renderHostsList() {
    const container = document.getElementById("hosts-list-container");
    if (!container) return;

    const filteredHosts = hostUsersData.filter(h => {
        const query = searchQuery.toLowerCase();
        const nameMatch = (h.name || '').toLowerCase().includes(query);
        const phoneMatch = (h.phone || '').toLowerCase().includes(query);
        return nameMatch || phoneMatch;
    });

    const sortedHosts = filteredHosts.sort((a, b) => (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase()));

    const totalPages = Math.ceil(sortedHosts.length / itemsPerPage) || 1;
    if (currentPage > totalPages) currentPage = totalPages;

    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedHosts = sortedHosts.slice(startIndex, startIndex + itemsPerPage);

    if (hostUsersData.length === 0) {
        container.innerHTML = `<div style="text-align: center; padding: var(--space-8); background: var(--color-white); border: 1px dashed var(--color-border); border-radius: var(--radius-lg); color: var(--color-text-muted);">No hosts have been assigned to any weddings yet.</div>`;
        bindStaticListeners();
        return;
    }

    if (paginatedHosts.length === 0) {
        container.innerHTML = `<div style="text-align: center; padding: var(--space-8); background: var(--color-white); border: 1px dashed var(--color-border); border-radius: var(--radius-lg); color: var(--color-text-muted);">No hosts match your search criteria.</div>`;
        bindStaticListeners();
        return;
    }

    // 1. Updated Grid Template (6 columns)
    const gridTemplate = "32px 32px 50px 1.5fr 1fr 130px"; 

    let listHTML = `
        <div style="display: grid; grid-template-columns: ${gridTemplate}; align-items: center; padding: 0 var(--space-4) var(--space-2) var(--space-4); border-bottom: 1px solid var(--color-border); margin-bottom: var(--space-2); color: var(--color-text-secondary); font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold); gap: 12px;">
            <div></div> 
            <div></div> 
            <div>S.No</div>
            <div>Name</div>
            <div>Phone Number</div>
            <div>Weddings Count</div>
        </div>
    `;

    paginatedHosts.forEach((host, index) => {
        const globalIndex = startIndex + index + 1;
        
        const sortedWeddings = [...host.assigned_weddings].sort((a, b) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime());
        const weddingTags = sortedWeddings.length > 0 
            ? sortedWeddings.map(w => {
                const displayNames = w.primary_side === 'groom' ? `${w.groom_name} & ${w.bride_name}` : `${w.bride_name} & ${w.groom_name}`;
                return `<span style="background: var(--color-border); padding: 4px 10px; border-radius: 16px; font-size: 0.75rem; color: var(--color-text-primary); font-weight: var(--font-weight-medium); display: inline-flex; align-items: center; gap: 4px;"><i data-lucide="heart" style="width:12px; height:12px; color: var(--color-primary);"></i> ${displayNames}</span>`;
            }).join('')
            : `<span style="color: var(--color-text-muted); font-size: 0.8rem; font-style: italic;">No active assignments</span>`;

        // FIXED: Using data-id instead of JSON stringification
        listHTML += `
        <div style="border: 1px solid var(--color-border); border-radius: var(--radius-sm); margin-bottom: var(--space-2); background: var(--color-bg); overflow: hidden;">
            <div style="display: grid; grid-template-columns: ${gridTemplate}; align-items: center; padding: var(--space-3) var(--space-4); transition: background 0.2s ease; gap: 12px;" onmouseover="this.style.background='var(--color-border)';" onmouseout="this.style.background='transparent';">
                
                <button class="toggle-weddings-btn" data-target="child-host-${host.id}" style="background: none; border: none; cursor: pointer; color: var(--color-text-muted); padding: 4px; display: flex; align-items: center; justify-content: center;" onmouseover="this.style.color='var(--color-primary)'" onmouseout="this.style.color='var(--color-text-muted)'">
                    <i data-lucide="chevron-right" style="width: 16px; height: 16px; transition: transform 0.2s;"></i>
                </button>

                <!-- Edit Icon Moved to the Left -->
                <button class="edit-host-btn" data-id="${host.id}" style="background: none; border: none; cursor: pointer; color: var(--color-text-muted); padding: 4px; display: flex; align-items: center; justify-content: center;" onmouseover="this.style.color='var(--color-primary)'" onmouseout="this.style.color='var(--color-text-muted)'" title="Edit Host">
                    <i data-lucide="edit-2" style="width: 16px; height: 16px;"></i>
                </button>

                <div style="color: var(--color-text-secondary); font-size: var(--font-size-sm); font-weight: var(--font-weight-medium);">${globalIndex}</div>
                
                <div style="display: flex; align-items: center; overflow: hidden;">
                    <h4 style="margin: 0; font-size: 0.95rem; font-weight: var(--font-weight-medium); color: var(--color-text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${host.name}</h4>
                </div>
                
                <div style="display: flex; align-items: center; gap: 6px; color: var(--color-text-secondary); font-size: var(--font-size-sm); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    <i data-lucide="phone" style="width: 14px; height: 14px; flex-shrink: 0;"></i> ${host.phone}
                </div>
                
                <div style="font-size: var(--font-size-sm); font-weight: var(--font-weight-medium); color: var(--color-text-primary);">
                    ${host.assigned_weddings.length}
                </div>
            </div>

            <!-- Adjusted padding-left to align with the Name column perfectly -->
            <div id="child-host-${host.id}" style="display: none; padding: var(--space-4) var(--space-4) var(--space-4) 150px; background: var(--color-white); border-top: 1px dashed var(--color-border);">
                <div style="font-size: 0.75rem; color: var(--color-text-secondary); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: var(--font-weight-semibold);">Assigned Weddings:</div>
                <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                    ${weddingTags}
                </div>
            </div>
        </div>`;
    });

    listHTML += `
        <div style="display: flex; justify-content: space-between; align-items: center; padding-top: var(--space-4); margin-top: var(--space-4); border-top: 1px solid var(--color-border);">
            <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">
                Showing ${startIndex + 1} to ${Math.min(startIndex + itemsPerPage, sortedHosts.length)} of ${sortedHosts.length} hosts
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
    container.innerHTML = listHTML;

    bindStaticListeners();

    const toggleBtns = container.querySelectorAll('.toggle-weddings-btn');
    toggleBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const targetId = btn.getAttribute('data-target');
            const childRow = document.getElementById(targetId);
            const icon = btn.querySelector('i');
            
            if (childRow.style.display === 'none') {
                childRow.style.display = 'block';
                icon.style.transform = 'rotate(90deg)';
                btn.style.color = 'var(--color-primary)';
            } else {
                childRow.style.display = 'none';
                icon.style.transform = 'rotate(0deg)';
                btn.style.color = 'var(--color-text-muted)';
            }
        });
    });

    // FIXED: Uses ID lookup instead of JSON parsing
    const editBtns = container.querySelectorAll('.edit-host-btn');
    editBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const hostId = btn.getAttribute('data-id');
            const hostData = hostUsersData.find(h => h.id === hostId);
            if (hostData) {
                openHostModal(hostData);
            }
        });
    });

    const pageBtns = container.querySelectorAll('.pagination-btn');
    pageBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.hasAttribute('disabled')) return;
            currentPage = parseInt(btn.getAttribute('data-page'));
            renderHostsList();
        });
    });

    if (window.lucide) window.lucide.createIcons();
}

function bindStaticListeners() {
    const searchInput = document.getElementById('hostSearchInput');
    if (searchInput && !searchInput.hasAttribute('data-bound')) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value;
            currentPage = 1; 
            renderHostsList();
        });
        searchInput.setAttribute('data-bound', 'true');
    }

    const addBtn = document.getElementById('add-host-btn');
    if (addBtn && !addBtn.hasAttribute('data-bound')) {
        addBtn.addEventListener('click', () => openHostModal());
        addBtn.setAttribute('data-bound', 'true');
    }
}

// ==========================================
// HOST MODAL LOGIC
// ==========================================
function openHostModal(existingHost = null) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const activeWeddings = allWeddings.filter(w => {
        const endDate = new Date(w.end_date);
        endDate.setHours(0, 0, 0, 0);
        return endDate.getTime() >= today.getTime();
    }).sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

    let preSelectedWeddingIds = [];
    if (existingHost) {
        preSelectedWeddingIds = allWeddingHosts.filter(h => h.user_id === existingHost.id).map(h => h.wedding_id);
        
        const pastAssignedIds = preSelectedWeddingIds.filter(id => !activeWeddings.some(aw => aw.id === id));
        pastAssignedIds.forEach(id => {
            const pastW = allWeddings.find(w => w.id === id);
            if (pastW) activeWeddings.push(pastW);
        });
    }

    const weddingCheckboxes = activeWeddings.length > 0 ? activeWeddings.map(w => {
        const displayNames = w.primary_side === 'groom' ? `${w.groom_name} & ${w.bride_name}` : `${w.bride_name} & ${w.groom_name}`;
        const isPast = new Date(w.end_date).getTime() < today.getTime();
        const pastLabel = isPast ? `<span style="font-size: 0.7rem; background: var(--color-danger); color: white; padding: 2px 6px; border-radius: 4px; margin-left: 6px;">Past</span>` : '';
        
        return `
        <label style="display: flex; align-items: center; gap: 8px; font-size: var(--font-size-sm); color: var(--color-text-primary); cursor: pointer; padding: 6px 0;">
            <input type="checkbox" name="host_weddings" value="${w.id}" ${preSelectedWeddingIds.includes(w.id) ? 'checked' : ''} style="accent-color: var(--color-primary); cursor: pointer; width: 16px; height: 16px;">
            ${displayNames} (${new Date(w.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}) ${pastLabel}
        </label>
    `}).join('') : `<div style="color: var(--color-text-muted); font-size: var(--font-size-xs); padding: 8px 0;">No upcoming weddings available.</div>`;

    let userSelectionHTML = '';

    if (existingHost) {
        userSelectionHTML = `
            <div>
                <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:4px;">Host Name</label>
                <input type="text" id="hostDisplayInput" disabled style="width:100%; background:var(--color-border); border:1px solid var(--color-border); color:var(--color-text-primary); padding:var(--space-2); border-radius:var(--radius-sm); outline:none; opacity: 0.7;">
                <input type="hidden" id="sysUserId" value="${existingHost.id}">
            </div>
        `;
    } else {
        const currentHostIds = [...new Set(allWeddingHosts.map(h => h.user_id))];
        const eligibleUsers = allSystemUsers.filter(u => !currentHostIds.includes(u.id) && u.role !== 'creator');
        
        eligibleUsers.sort((a, b) => (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase()));

        let optionsHtml = eligibleUsers.map(u => `<option value="${u.id}">${u.name} - ${u.phone}</option>`).join('');

        if (!optionsHtml) {
            optionsHtml = `<option value="" disabled>No eligible users available</option>`;
        }

        userSelectionHTML = `
            <div>
                <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:4px;">Select User *</label>
                <select id="sysUserId" required style="width:100%; background:var(--color-bg); border:1px solid var(--color-border); color:var(--color-text-primary); padding:var(--space-2); border-radius:var(--radius-sm); outline:none; transition: border-color 0.2s;">
                    <option value="" disabled selected>-- Select a User --</option>
                    ${optionsHtml}
                </select>
            </div>
        `;
    }

    const formHTML = `
        <form id="hostForm" novalidate style="display:flex; flex-direction:column; gap:var(--space-4); ${!existingHost ? 'padding-bottom: 200px;' : ''}">
            ${userSelectionHTML}
            <div style="margin-top: var(--space-2);">
                <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:8px;">Assign to Weddings</label>
                <div style="display: flex; flex-direction: column; max-height: 200px; overflow-y: auto; border: 1px solid var(--color-border); padding: var(--space-3); border-radius: var(--radius-sm); background: var(--color-bg);">
                    ${weddingCheckboxes}
                </div>
            </div>
        </form>
    `;

    const actions = [
        { label: "Cancel", variant: "ghost" },
        { 
            label: existingHost ? "Update" : "Add Host", 
            variant: "primary", 
            closesModal: false,
            onClick: async () => {
                const userId = document.getElementById('sysUserId').value;
                if (!userId) {
                    showAlert({ icon: 'warning', title: 'Missing Selection', text: 'Please select a user to become a host.' });
                    return;
                }

                const selectedWeddings = Array.from(document.getElementById('hostForm').querySelectorAll('input[name="host_weddings"]:checked')).map(cb => cb.value);

                if (selectedWeddings.length === 0) {
                    showAlert({ icon: 'warning', title: 'Missing Selection', text: 'Please assign the host to at least one wedding.' });
                    return;
                }

                try {
                    const { error: delErr } = await supabase.from('wedding_hosts').delete().eq('user_id', userId);
                    if (delErr) throw delErr;

                    if (selectedWeddings.length > 0) {
                        const insertPayload = selectedWeddings.map(wId => ({
                            user_id: userId,
                            wedding_id: wId
                        }));
                        const { error: insErr } = await supabase.from('wedding_hosts').insert(insertPayload);
                        if (insErr && insErr.code !== '42P01') throw insErr;
                    }

                    modal.close();
                    window.dispatchEvent(new Event('hostsDataUpdated')); 
                    showAlert({ icon: 'success', title: existingHost ? 'Updated!' : 'Added!', text: 'Host assignments saved successfully.', timer: 2000 });
                } catch (error) {
                    showAlert({ icon: 'error', title: 'Database Error', text: error.message });
                }
            }
        }
    ];

    if (existingHost) {
        actions.unshift({
            label: "Delete",
            variant: "danger", 
            closesModal: false,
            onClick: async () => {
                const result = await Swal.fire({
                    title: 'Remove Host?',
                    text: `This will remove the host from ALL assigned weddings. Continue?`,
                    icon: 'warning', 
                    showCancelButton: true,
                    confirmButtonColor: '#dc2626',
                    cancelButtonColor: '#6b7280',
                    confirmButtonText: 'Yes, remove them!'
                });

                if (result.isConfirmed) {
                    try {
                        const { error } = await supabase.from('wedding_hosts').delete().eq('user_id', existingHost.id);
                        if (error) throw error;
                        
                        modal.close();
                        window.dispatchEvent(new Event('hostsDataUpdated')); 
                        showAlert({ icon: 'success', title: 'Removed!', text: 'Host has been removed from all weddings.', timer: 2000 });
                    } catch (error) {
                        showAlert({ icon: 'error', title: 'Database Error', text: error.message });
                    }
                }
            }
        });
    }

    const modal = openModal({
        title: existingHost ? `Edit Host Assignments` : `Add New Host`,
        content: formHTML,
        actions: actions
    });

    setTimeout(() => {
        // Safe injection of values
        if (existingHost) {
            const hostDisplayInput = document.getElementById('hostDisplayInput');
            if (hostDisplayInput) hostDisplayInput.value = existingHost.name || '';
        }

        const btns = Array.from(document.querySelectorAll('button'));
        btns.forEach(btn => {
            const txt = btn.textContent.trim();
            if (txt === 'Cancel' && !btn.hasAttribute('data-styled')) {
                btn.style.cssText = 'background: #6b7280; color: #ffffff; border: 1px solid #6b7280; padding: 0.5rem 1.25rem; border-radius: var(--radius-sm); font-weight: var(--font-weight-medium); cursor: pointer; transition: opacity 0.2s;';
                btn.onmouseover = () => btn.style.opacity = '0.85';
                btn.onmouseout = () => btn.style.opacity = '1';
                btn.setAttribute('data-styled', 'true');
            } else if (txt === 'Delete' && !btn.hasAttribute('data-styled')) {
                btn.style.cssText = 'background: #dc2626; color: #ffffff; border: 1px solid #dc2626; padding: 0.5rem 1.25rem; border-radius: var(--radius-sm); font-weight: var(--font-weight-semibold); cursor: pointer; transition: opacity 0.2s; margin-right: auto;';
                if (btn.parentElement) {
                    btn.parentElement.style.display = 'flex';
                    btn.parentElement.style.width = '100%';
                }
                btn.onmouseover = () => btn.style.opacity = '0.85';
                btn.onmouseout = () => btn.style.opacity = '1';
                btn.setAttribute('data-styled', 'true');
            }
        });

        if (!existingHost) {
            convertToSearchableDropdown('sysUserId');
        }
    }, 50);
}

// ==========================================
// SEARCHABLE DROPDOWN UTILITY
// ==========================================
function convertToSearchableDropdown(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;

    select.style.display = 'none';

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'position: relative; width: 100%; text-align: left;';
    select.parentNode.insertBefore(wrapper, select);

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Search...';
    input.className = select.className; 
    input.style.cssText = 'width: 100%; padding: var(--space-2); border: 1px solid var(--color-border); border-radius: var(--radius-sm); box-sizing: border-box; background: var(--color-bg); color: var(--color-text-primary); outline: none; transition: border-color 0.2s;';
    wrapper.appendChild(input);

    const list = document.createElement('div');
    list.style.cssText = 'position: absolute; top: 100%; left: 0; right: 0; max-height: 200px; overflow-y: auto; background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-sm); z-index: 9999; display: none; box-shadow: 0 4px 6px rgba(0,0,0,0.3); margin-top: 4px;';
    wrapper.appendChild(list);

    const options = Array.from(select.options);
    
    function renderList(filter = '') {
        list.innerHTML = '';
        const filtered = options.filter(opt => opt.text.toLowerCase().includes(filter.toLowerCase()) && opt.value !== "");
        
        if (filtered.length === 0) {
            const noRes = document.createElement('div');
            noRes.style.cssText = 'padding: 10px; color: var(--color-text-muted); font-size: 0.9rem; text-align: center;';
            noRes.textContent = 'No results found';
            list.appendChild(noRes);
            return;
        }

        filtered.forEach(opt => {
            const item = document.createElement('div');
            item.style.cssText = 'padding: 10px; cursor: pointer; border-bottom: 1px solid var(--color-border); font-size: 0.9rem; color: var(--color-text-primary); transition: background 0.2s;';
            item.textContent = opt.text;
            
            item.addEventListener('mouseover', () => item.style.background = 'var(--color-border)');
            item.addEventListener('mouseout', () => item.style.background = 'transparent');
            
            item.addEventListener('click', () => {
                select.value = opt.value;
                input.value = opt.text;
                list.style.display = 'none';
                select.dispatchEvent(new Event('change')); 
            });
            list.appendChild(item);
        });
    }

    input.addEventListener('focus', () => {
        input.value = ''; 
        renderList('');
        list.style.display = 'block';
    });

    input.addEventListener('input', (e) => {
        renderList(e.target.value);
        list.style.display = 'block';
    });

    document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) {
            list.style.display = 'none';
            const selectedOpt = options.find(o => o.value === select.value);
            if (selectedOpt && select.value !== "") {
                input.value = selectedOpt.text;
            } else {
                input.value = '';
            }
        }
    });

    const initialOpt = options.find(o => o.value === select.value);
    if (initialOpt && select.value !== "") {
        input.value = initialOpt.text;
    }
}