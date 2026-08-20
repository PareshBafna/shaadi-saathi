import { supabase } from '../../database/js/api.js';
import { openModal } from '../../global/js/modal.js';
import { showSweetAlert } from '../../global/js/sweet-alert-message.js';

let allSystemUsers = [];
let allWeddings = [];
let allWeddingHosts = [];
let hostUsersData = []; 

let currentPage = 1;
const itemsPerPage = 10;
let searchQuery = '';

export function renderHosts() {
    if (typeof window.checkSessionOrShowAlert === 'function' && !window.checkSessionOrShowAlert()) {
        const errSec = document.createElement("section");
        errSec.className = "hosts-auth-message";
        errSec.textContent = "Please log in to manage hosts.";
        return errSec;
    }

    const section = document.createElement("section");
    section.className = "hosts-page-wrapper";

    const controls = document.createElement('div');
    controls.className = "hosts-control-bar";

    const leftContainer = document.createElement('div');
    leftContainer.className = "hosts-left-action";
    const createBtn = document.createElement("button");
    createBtn.id = "add-host-btn";
    createBtn.className = "hosts-add-btn";
    createBtn.innerHTML = `<i data-lucide="plus"></i> Host`;
    createBtn.addEventListener('click', () => openHostModal());
    leftContainer.appendChild(createBtn);

    const searchContainer = document.createElement('div');
    searchContainer.className = "hosts-search-container";
    searchContainer.innerHTML = `
        <div class="hosts-search-input-wrapper">
            <i data-lucide="search" class="hosts-search-icon"></i>
            <input type="text" id="hostSearchInput" placeholder="Search by name or phone..." class="hosts-search-input">
        </div>
    `;

    controls.appendChild(leftContainer);
    controls.appendChild(searchContainer);
    section.appendChild(controls);

    const cardContainer = document.createElement("div");
    cardContainer.className = "hosts-card-container";

    const listContainer = document.createElement("div");
    listContainer.id = "hosts-list-container";

    cardContainer.appendChild(listContainer);
    section.appendChild(cardContainer);

    listContainer.innerHTML = `<div class="hosts-loading-state">Loading hosts...</div>`;

    setTimeout(() => {
        loadHostsData();
        if (window.lucide) window.lucide.createIcons();
    }, 0);

    const updateHandler = () => {
        if (document.body.contains(section)) {
            loadHostsData();
        } else {
            window.removeEventListener('hostsDataUpdated', updateHandler);
            window.removeEventListener('hashchange', hashChangeCleanup);
        }
    };

    const hashChangeCleanup = () => {
        const modalBackdrops = document.querySelectorAll('.modal-backdrop, .swal2-container');
        modalBackdrops.forEach(b => b.remove());
        window.removeEventListener('hashchange', hashChangeCleanup);
    };

    window.removeEventListener('hostsDataUpdated', updateHandler);
    window.addEventListener('hostsDataUpdated', updateHandler);
    window.addEventListener('hashchange', hashChangeCleanup);

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
        const container = document.getElementById("hosts-list-container");
        if (container) {
            container.innerHTML = `<div class="hosts-error-state">Failed to load hosts: ${error.message}</div>`;
        }
    }
}

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
        container.innerHTML = `<div class="hosts-empty-state">No hosts have been assigned to any weddings yet.</div>`;
        bindStaticListeners();
        return;
    }

    if (paginatedHosts.length === 0) {
        container.innerHTML = `<div class="hosts-empty-state">No hosts match your search criteria.</div>`;
        bindStaticListeners();
        return;
    }

    let listHTML = `
        <div class="hosts-table-scroll-container">
            <div class="hosts-table-inner">
                <div class="hosts-table-header">
                    <div></div> 
                    <div></div> 
                    <div>Name</div>
                    <div>Phone Number</div>
                    <div>Weddings Count</div>
                    <div></div>
                </div>
    `;

    paginatedHosts.forEach((host) => {
        const sortedWeddings = [...host.assigned_weddings].sort((a, b) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime());
        const weddingTags = sortedWeddings.length > 0 
            ? sortedWeddings.map(w => {
                const displayNames = w.primary_side === 'groom' ? `${w.groom_name} & ${w.bride_name}` : `${w.bride_name} & ${w.groom_name}`;
                return `<span class="hosts-wedding-tag"><i data-lucide="heart"></i> ${displayNames}</span>`;
            }).join('')
            : `<span class="hosts-child-empty">No active assignments</span>`;

        listHTML += `
        <div class="hosts-table-row-wrapper">
            <div class="hosts-table-row">
                
                <button class="toggle-weddings-btn hosts-icon-btn hosts-toggle-btn" data-target="child-host-${host.id}">
                    <i data-lucide="chevron-right"></i>
                </button>

                <button class="edit-host-btn hosts-icon-btn hosts-edit-btn" data-id="${host.id}" title="Edit Host">
                    <i data-lucide="edit-2"></i>
                </button>
                
                <div class="hosts-name-col">
                    <h4>${host.name}</h4>
                </div>
                
                <div class="hosts-phone-col">
                    <i data-lucide="phone"></i> <span>${host.phone}</span>
                </div>
                
                <div class="hosts-count-col">
                    ${host.assigned_weddings.length}
                </div>
                <div></div>
            </div>

            <div id="child-host-${host.id}" class="hosts-child-row">
                <div class="hosts-child-title">Assigned Weddings:</div>
                <div class="hosts-child-tags">
                    ${weddingTags}
                </div>
            </div>
        </div>`;
    });

    listHTML += `
            </div>
        </div>
        <div class="hosts-pagination-bar">
            <div class="hosts-pagination-info">
                Showing ${startIndex + 1} to ${Math.min(startIndex + itemsPerPage, sortedHosts.length)} of ${sortedHosts.length} hosts
            </div>
    `;

    if (totalPages > 1) {
        listHTML += `
            <div class="hosts-pagination-controls">
                <button class="pagination-btn hosts-page-btn" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}><i data-lucide="chevron-left"></i></button>
                <span class="hosts-page-indicator">Page ${currentPage} of ${totalPages}</span>
                <button class="pagination-btn hosts-page-btn" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}><i data-lucide="chevron-right"></i></button>
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
            const icon = btn.querySelector('i, svg');
            
            if (childRow.style.display === 'none' || !childRow.style.display) {
                childRow.style.display = 'block';
                if (icon) icon.style.transform = 'rotate(90deg)';
                btn.style.color = 'var(--color-primary)';
            } else {
                childRow.style.display = 'none';
                if (icon) icon.style.transform = 'rotate(0deg)';
                btn.style.color = 'var(--color-text-muted)';
            }
        });
    });

    const editBtns = container.querySelectorAll('.edit-host-btn');
    editBtns.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const hostId = btn.getAttribute('data-id');
            try {
                const { data: userData, error } = await supabase.from('users').select('*').eq('id', hostId).single();
                if (error) throw error;
                const hostData = hostUsersData.find(h => h.id === hostId) || userData;
                if (hostData) {
                    openHostModal(hostData);
                }
            } catch (err) {
                showSweetAlert('error', 'Error', 'Could not fetch host details.');
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
}

function layoutHostModalFooter(isEditModal = false) {
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
        const pastLabel = isPast ? `<span class="host-past-badge">Past</span>` : '';
        
        return `
        <label class="host-checkbox-item">
            <input type="checkbox" name="host_weddings" value="${w.id}" ${preSelectedWeddingIds.includes(w.id) ? 'checked' : ''}>
            ${displayNames} (${new Date(w.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}) ${pastLabel}
        </label>
    `}).join('') : `<div class="hosts-child-empty">No upcoming weddings available.</div>`;

    let userSelectionHTML = '';

    if (existingHost) {
        userSelectionHTML = `
            <div>
                <label class="host-label">Host Name</label>
                <input type="text" id="hostDisplayInput" disabled class="host-input">
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
                <label class="host-label">Select User *</label>
                <select id="sysUserId" required class="host-input host-input--invalid">
                    <option value="" disabled selected>-- Select a User --</option>
                    ${optionsHtml}
                </select>
            </div>
        `;
    }

    const formHTML = `
        <form id="hostForm" novalidate class="host-form">
            ${userSelectionHTML}
            <div>
                <label class="host-label">Assign to Weddings *</label>
                <div id="weddingCheckboxContainer" class="host-checkbox-box ${preSelectedWeddingIds.length > 0 ? 'host-input--valid' : 'host-input--invalid'}">
                    ${weddingCheckboxes}
                </div>
            </div>
        </form>
    `;

    const actions = [
        { label: "Cancel", variant: "ghost" },
        { 
            label: existingHost ? "Edit" : "Add", 
            variant: "primary", 
            closesModal: false,
            onClick: async () => {
                const userIdEl = document.getElementById('sysUserId');
                const userId = userIdEl.value;
                const containerEl = document.getElementById('weddingCheckboxContainer');

                let targetInputEl = userIdEl;
                if (!existingHost && userIdEl.style.display === 'none') {
                    const wrapper = userIdEl.previousElementSibling;
                    if (wrapper) targetInputEl = wrapper.querySelector('input') || userIdEl;
                }

                if (!userId) {
                    targetInputEl.classList.add('host-input--invalid');
                    targetInputEl.classList.remove('host-input--valid');
                    showSweetAlert('error', 'Missing Information', 'Please fill out all mandatory fields. Missing: User Selection');
                    return;
                } else {
                    targetInputEl.classList.remove('host-input--invalid');
                    targetInputEl.classList.add('host-input--valid');
                }

                const selectedWeddings = Array.from(document.getElementById('hostForm').querySelectorAll('input[name="host_weddings"]:checked')).map(cb => cb.value);

                if (selectedWeddings.length === 0) {
                    if (containerEl) {
                        containerEl.classList.add('host-input--invalid');
                        containerEl.classList.remove('host-input--valid');
                    }
                    showSweetAlert('error', 'Missing Information', 'Please fill out all mandatory fields. Missing: Assigned Weddings');
                    return;
                } else {
                    if (containerEl) {
                        containerEl.classList.remove('host-input--invalid');
                        containerEl.classList.add('host-input--valid');
                    }
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
                    showSweetAlert('success', existingHost ? 'Updated!' : 'Added!', 'Host assignments saved successfully.');
                } catch (error) {
                    showSweetAlert('error', 'Database Error', error.message);
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
                    icon: 'question', 
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
                        showSweetAlert('success', 'Removed!', 'Host has been removed from all weddings.');
                    } catch (error) {
                        showSweetAlert('error', 'Database Error', error.message);
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
        layoutHostModalFooter(!!existingHost);

        if (existingHost) {
            const hostDisplayInput = document.getElementById('hostDisplayInput');
            if (hostDisplayInput) hostDisplayInput.value = existingHost.name || '';
        }

        const containerEl = document.getElementById('weddingCheckboxContainer');
        if (containerEl) {
            const checkboxes = containerEl.querySelectorAll('input[name="host_weddings"]');
            checkboxes.forEach(cb => {
                cb.addEventListener('change', () => {
                    const anyChecked = containerEl.querySelectorAll('input[name="host_weddings"]:checked').length > 0;
                    if (anyChecked) {
                        containerEl.classList.remove('host-input--invalid');
                        containerEl.classList.add('host-input--valid');
                    } else {
                        containerEl.classList.remove('host-input--valid');
                        containerEl.classList.add('host-input--invalid');
                    }
                });
            });
        }

        if (!existingHost) {
            convertToSearchableDropdown('sysUserId');
            const selectEl = document.getElementById('sysUserId');
            if (selectEl) {
                selectEl.addEventListener('change', (e) => {
                    const wrapper = selectEl.previousElementSibling;
                    if (wrapper) {
                        const input = wrapper.querySelector('input');
                        if (input) {
                            if (e.target.value) {
                                input.classList.remove('host-input--invalid');
                                input.classList.add('host-input--valid');
                            } else {
                                input.classList.remove('host-input--valid');
                                input.classList.add('host-input--invalid');
                            }
                        }
                    }
                });
            }
        }
    }, 50);
}

function convertToSearchableDropdown(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;

    select.style.display = 'none';

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'position: relative; width: 100%; text-align: left;';
    select.parentNode.insertBefore(wrapper, select);

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Search user...';
    input.className = 'host-input host-input--invalid';
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
                input.classList.remove('host-input--invalid');
                input.classList.add('host-input--valid');
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
                input.classList.remove('host-input--invalid');
                input.classList.add('host-input--valid');
            } else {
                input.value = '';
                input.classList.remove('host-input--valid');
                input.classList.add('host-input--invalid');
            }
        }
    });

    const initialOpt = options.find(o => o.value === select.value);
    if (initialOpt && select.value !== "") {
        input.value = initialOpt.text;
        input.classList.remove('host-input--invalid');
        input.classList.add('host-input--valid');
    }
}