import { supabase } from '../../database/js/api.js';
import { openModal } from '../../global/components/js/modal.js';
import { showAlert } from '../../global/components/js/alerts.js';

let allWeddings = [];

function getLocalTodayString() {
    const today = new Date();
    return today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
}

// Helper to strictly determine if the current user can edit a specific wedding
function canEditWedding(wedding) {
    const user = window.currentUser;
    if (!user) return false;
    if (user.role === 'creator') return true;
    if (user.role === 'host') {
        // Check if the current user's ID exists in the wedding's hosts list
        return wedding.hosts && wedding.hosts.some(h => h.user_id === user.id);
    }
    return false;
}

export function renderWeddings() {
    const userRole = window.currentUser?.role || 'guest';

    const wrapper = document.createElement('section');
    wrapper.className = "weddings-page-wrapper"; 
    wrapper.style.cssText = "width: 100%; box-sizing: border-box;";

    // ==========================================
    // 1. CONTROL BAR
    // ==========================================
    const controls = document.createElement('div');
    controls.className = "weddings-control-bar";
    controls.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-6); background: var(--color-white); padding: var(--space-4); border-radius: var(--radius-lg); border: 1px solid var(--color-border);";

    const sortContainer = document.createElement('div');
    sortContainer.innerHTML = `
        <div style="display: flex; align-items: center; gap: var(--space-2);">
            <span style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">Sort by:</span>
            <select id="sortWeddings" style="background: var(--color-bg); border: 1px solid var(--color-border); color: var(--color-text-primary); padding: var(--space-2) var(--space-3); border-radius: var(--radius-sm); font-size: var(--font-size-sm); cursor: pointer; outline: none;">
                <option value="date-asc">Date (Earliest first)</option>
                <option value="date-desc">Date (Latest first)</option>
                <option value="name-asc">Couple Names (A-Z)</option>
            </select>
        </div>
    `;

    const centerContainer = document.createElement('div');
    
    // STRICT RULE: Only Creators can add weddings
    if (userRole === 'creator') {
        const createBtn = document.createElement("button");
        createBtn.innerHTML = `<i data-lucide="plus" style="width:16px; height:16px; margin-right:4px; vertical-align:middle;"></i> Wedding`;
        createBtn.style.cssText = "background: var(--color-primary); color: var(--color-text-on-accent); border: none; padding: 0.5rem 1.25rem; border-radius: var(--radius-sm); font-weight: var(--font-weight-semibold); cursor: pointer; font-size: var(--font-size-sm); display:flex; align-items:center; transition: opacity 0.2s;";
        createBtn.addEventListener('click', openCreateWeddingModal);
        centerContainer.appendChild(createBtn);
    }

    const searchContainer = document.createElement('div');
    searchContainer.innerHTML = `
        <div style="position: relative;">
            <i data-lucide="search" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); width: 16px; height: 16px; color: var(--color-text-secondary);"></i>
            <input type="text" id="searchWeddings" placeholder="Search weddings..." style="background: var(--color-bg); border: 1px solid var(--color-border); color: var(--color-text-primary); padding: var(--space-2) var(--space-3) var(--space-2) 32px; border-radius: var(--radius-sm); font-size: var(--font-size-sm); width: 250px; outline: none;">
        </div>
    `;

    controls.appendChild(sortContainer);
    controls.appendChild(centerContainer);
    controls.appendChild(searchContainer);
    wrapper.appendChild(controls);

    // ==========================================
    // 2. GALLERIES CONTAINER
    // ==========================================
    const sectionsContainer = document.createElement('div');
    sectionsContainer.id = "weddings-galleries";
    wrapper.appendChild(sectionsContainer);

    loadWeddingsData(sectionsContainer);

    window.addEventListener('weddingDataUpdated', () => {
        if (document.getElementById('weddings-galleries')) {
            loadWeddingsData(document.getElementById('weddings-galleries'));
        }
    });

    setTimeout(() => {
        document.getElementById('searchWeddings')?.addEventListener('input', () => filterAndRenderGalleries());
        document.getElementById('sortWeddings')?.addEventListener('change', () => filterAndRenderGalleries());
        if (window.lucide) window.lucide.createIcons();
    }, 0);

    return wrapper;
}

function startOfDay(date) {
    const copy = new Date(date);
    copy.setHours(0, 0, 0, 0);
    return copy;
}

async function loadWeddingsData(container) {
    const userRole = window.currentUser?.role || 'guest';
    const userPhone = window.currentUser?.phone || '';

    container.innerHTML = `<div style="text-align: center; padding: var(--space-8); color: var(--color-text-secondary);">Loading weddings...</div>`;
    try {
        const { data, error } = await supabase.from('weddings').select('*');
        if (error) throw error;
        
        const { data: hostsData, error: hostsError } = await supabase.from('wedding_hosts').select('*');
        if (hostsError && hostsError.code !== '42P01') throw hostsError;
        
        allWeddings = data || [];

        for (let wedding of allWeddings) {
            wedding.hosts = hostsData ? hostsData.filter(h => h.wedding_id === wedding.id) : [];

            let eventsQuery = supabase.from('events').select('*', { count: 'exact' }).eq('wedding_id', wedding.id);
            
            if (userRole === 'guest') {
                const { data: guestData } = await supabase.from('guests').select('id').eq('wedding_id', wedding.id).eq('phone', userPhone).single();
                if (guestData) {
                    const { data: eventGuests } = await supabase.from('event_guests').select('event_id').eq('guest_id', guestData.id);
                    const invitedEventIds = eventGuests ? eventGuests.map(eg => eg.event_id) : [];
                    if (invitedEventIds.length > 0) {
                        eventsQuery = eventsQuery.in('id', invitedEventIds);
                    } else {
                        eventsQuery = eventsQuery.eq('id', '00000000-0000-0000-0000-000000000000');
                    }
                } else {
                    eventsQuery = eventsQuery.eq('id', '00000000-0000-0000-0000-000000000000');
                }
            }

            const { count: eventsCount } = await eventsQuery;
            wedding.events_count = eventsCount || 0;
        }

        filterAndRenderGalleries();
    } catch (error) {
        console.error('[DEBUG ERROR] Failed to load weddings directory:', error);
        container.innerHTML = `<div style="color: var(--color-danger); text-align: center; padding: var(--space-8);">Failed to load data: ${error.message}</div>`;
    }
}

function filterAndRenderGalleries() {
    const searchTerm = document.getElementById('searchWeddings')?.value.toLowerCase() || '';
    const sortValue = document.getElementById('sortWeddings')?.value || 'date-asc';
    
    let filtered = allWeddings.filter(w => {
        const side = w.primary_side || 'bride';
        const full = side === 'groom' ? `${w.groom_name} & ${w.bride_name}`.toLowerCase() : `${w.bride_name} & ${w.groom_name}`.toLowerCase();
        return full.includes(searchTerm.replace(/\s+/g, '')) || w.bride_name.toLowerCase().includes(searchTerm) || w.groom_name.toLowerCase().includes(searchTerm);
    });

    filtered.sort((a, b) => {
        if (sortValue === 'date-asc') return new Date(a.start_date) - new Date(b.start_date);
        if (sortValue === 'date-desc') return new Date(b.start_date) - new Date(a.start_date);
        if (sortValue === 'name-asc') {
            const nameA = a.primary_side === 'groom' ? `${a.groom_name} & ${a.bride_name}` : `${a.bride_name} & ${a.groom_name}`;
            const nameB = b.primary_side === 'groom' ? `${b.groom_name} & ${b.bride_name}` : `${b.bride_name} & ${b.groom_name}`;
            return nameA.localeCompare(nameB);
        }
        return 0;
    });

    const todayTime = startOfDay(new Date()).getTime();

    const inProgress = filtered.filter(w => {
        const start = startOfDay(new Date(w.start_date)).getTime();
        const end = startOfDay(new Date(w.end_date)).getTime();
        return todayTime >= start && todayTime <= end;
    });
    const upcoming = filtered.filter(w => startOfDay(new Date(w.start_date)).getTime() > todayTime);
    const archived = filtered.filter(w => startOfDay(new Date(w.end_date)).getTime() < todayTime);

    const container = document.getElementById('weddings-galleries');
    if (!container) return;

    if (filtered.length === 0) {
        container.innerHTML = `<div style="text-align: center; padding: var(--space-8); color: var(--color-text-muted); background: var(--color-white); border-radius: var(--radius-lg); border: 1px solid var(--color-border);">No weddings match your search.</div>`;
        return;
    }

    container.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: var(--space-6); width: 100%; align-items: start;">
            ${buildGallerySection("In Progress", inProgress)}
            ${buildGallerySection("Upcoming", upcoming)}
            ${buildGallerySection("Archived", archived)}
        </div>
    `;

    container.querySelectorAll('.gallery-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if(!e.target.closest('.edit-wedding-btn')) {
                const id = card.getAttribute('data-wedding-id');
                window.location.hash = `#wedding-details?id=${id}`;
            }
        });
    });

    // Attach edit listeners to any generated edit buttons
    container.querySelectorAll('.edit-wedding-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const card = e.target.closest('.gallery-card');
            const weddingId = card.getAttribute('data-wedding-id');
            const wedding = allWeddings.find(w => w.id === weddingId);
            
            if (window.openEditWeddingModal && wedding) {
                window.openEditWeddingModal(wedding);
            } else {
                showAlert({ icon: 'info', title: 'Edit Mode', text: 'Edit Wedding Modal coming soon!' });
            }
        });
    });

    if (window.lucide) window.lucide.createIcons();
}

function buildGallerySection(title, weddings) {
    if (!weddings || weddings.length === 0) return '';
    
    const listItems = weddings.map(wedding => {
        let editBtnHTML = '';

        // Only show edit button if the user has permission for THIS specific wedding
        if (canEditWedding(wedding)) {
            editBtnHTML = `
                <button class="edit-wedding-btn" style="position: absolute; right: var(--space-3); top: 1.25rem; background: none; border: none; cursor: pointer; color: var(--color-text-muted); padding: 4px;" onmouseover="this.style.color='var(--color-primary)'" onmouseout="this.style.color='var(--color-text-muted)'">
                    <i data-lucide="edit-2" style="width: 16px; height: 16px;"></i>
                </button>
            `;
        }

        const displayNames = wedding.primary_side === 'groom' 
            ? `${wedding.groom_name} & ${wedding.bride_name}` 
            : `${wedding.bride_name} & ${wedding.groom_name}`;

        let hostsHTML = '';
        if (wedding.hosts && wedding.hosts.length > 0) {
            const sortedHosts = [...wedding.hosts].sort((a, b) => (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase()));
            const inlineHosts = sortedHosts.map(h => `${h.name} - ${h.phone}`).join(', ');
            
            hostsHTML = `
            <div style="display:flex; align-items:center; gap:6px; font-size:var(--font-size-xs); color:var(--color-text-secondary); margin-bottom: 6px; flex-wrap: wrap;">
                <i data-lucide="phone" style="width:14px; height:14px; flex-shrink: 0;"></i> <span>${inlineHosts}</span>
            </div>`;
        } else {
            hostsHTML = `
            <div style="display:flex; align-items:center; gap:6px; font-size:var(--font-size-xs); color:var(--color-text-secondary); margin-bottom: 6px; flex-wrap: wrap;">
                <i data-lucide="phone" style="width:14px; height:14px; flex-shrink: 0;"></i> <span style="font-style: italic;">No hosts added</span>
            </div>`;
        }

        return `
        <div class="stat-card gallery-card" data-wedding-id="${wedding.id}" style="position: relative; cursor: pointer; padding: 1rem 1.25rem; display: flex; flex-direction: column; gap: 8px; transition: all 0.2s ease;">
            
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <div style="background: var(--color-border); color: var(--color-primary); width: 32px; height: 32px; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                        <i data-lucide="heart" style="width: 16px; height: 16px;"></i>
                    </div>
                    <div>
                        <h3 style="margin: 0; font-size: 0.95rem; font-weight: var(--font-weight-bold); color: var(--color-text-primary);">${displayNames}</h3>
                        <p style="margin: 4px 0 0 0; font-size: 0.8rem; color: var(--color-text-secondary);"><i data-lucide="calendar" style="width:12px; height:12px; vertical-align:middle; margin-right:4px;"></i> ${formatWeddingDateRange(wedding.start_date, wedding.end_date)}</p>
                    </div>
                </div>
            </div>

            <div style="border-top: 1px solid var(--color-border); margin-top: 4px; padding-top: 8px;">
                ${wedding.family_name ? `<div style="display:flex; align-items:center; gap:6px; font-size:var(--font-size-xs); color:var(--color-text-secondary); margin-bottom: 6px;"><i data-lucide="home" style="width:14px; height:14px;"></i> ${wedding.family_name}</div>` : ''}

                ${wedding.family_details ? `<div style="display:flex; align-items:center; gap:6px; font-size:var(--font-size-xs); color:var(--color-text-secondary); margin-bottom: 6px;"><i data-lucide="users" style="width:14px; height:14px;"></i> ${wedding.family_details}</div>` : ''}
                
                ${hostsHTML}

                <div style="display:flex; align-items:center; gap:6px; font-size:var(--font-size-xs); color:var(--color-text-secondary);"><i data-lucide="calendar-days" style="width:14px; height:14px;"></i> ${wedding.events_count || 0} Events</div>
            </div>

            ${editBtnHTML}
        </div>
        `;
    }).join('');

    return `
        <div style="background: var(--color-white); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-5); display: flex; flex-direction: column; gap: var(--space-4);">
            <h2 style="font-size: 1.25rem; font-weight: var(--font-weight-bold); color: var(--color-text-primary); margin: 0;">${title}</h2>
            <div style="display: flex; flex-direction: column; gap: var(--space-3);">
                ${listItems}
            </div>
        </div>
    `;
}

// ==========================================
// GLOBALS: MODALS & BUTTON STYLER
// ==========================================
function forceStyleModalButtons() {
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
}

export function openCreateWeddingModal() {
    const userRole = window.currentUser?.role || 'guest';
    
    // STRICT RULE: Only Creators can add weddings
    if (userRole !== 'creator') {
        showAlert({ icon: 'error', title: 'Access Denied', text: 'Only creators have permission to add new weddings.' });
        return;
    }

    const todayStr = getLocalTodayString();

    const formHTML = `
        <form id="createWeddingForm" novalidate style="display:flex; flex-direction:column; gap:var(--space-3); overflow-y: auto; max-height: 60vh; padding-right: 5px;">
            <div>
                <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:8px;">Primary Side</label>
                <div style="display: flex; gap: var(--space-4); align-items: center;">
                    <label style="display: flex; align-items: center; gap: 4px; color: var(--color-text-primary); font-size: var(--font-size-sm); cursor: pointer;">
                        <input type="radio" name="primarySide" value="bride" checked style="accent-color: var(--color-primary); cursor: pointer;"> Bride's Side
                    </label>
                    <label style="display: flex; align-items: center; gap: 4px; color: var(--color-text-primary); font-size: var(--font-size-sm); cursor: pointer;">
                        <input type="radio" name="primarySide" value="groom" style="accent-color: var(--color-primary); cursor: pointer;"> Groom's Side
                    </label>
                </div>
            </div>

            <div style="display: flex; gap: var(--space-3); flex-wrap: wrap;">
                <div style="flex: 1; min-width: 140px;">
                    <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:4px;">Bride's Name *</label>
                    <input type="text" id="brideName" required style="width:100%; background:var(--color-bg); border:1px solid var(--color-border); color:var(--color-text-primary); padding:var(--space-2); border-radius:var(--radius-sm); box-sizing:border-box; outline:none; transition: border-color 0.2s;">
                </div>
                <div style="flex: 1; min-width: 140px;">
                    <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:4px;">Groom's Name *</label>
                    <input type="text" id="groomName" required style="width:100%; background:var(--color-bg); border:1px solid var(--color-border); color:var(--color-text-primary); padding:var(--space-2); border-radius:var(--radius-sm); box-sizing:border-box; outline:none; transition: border-color 0.2s;">
                </div>
            </div>

            <div style="display: flex; gap: var(--space-3); flex-wrap: wrap;">
                <div style="flex: 1; min-width: 140px;">
                    <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:4px;">Hashtag (Optional)</label>
                    <input type="text" id="weddingHashtag" placeholder="e.g., #SonalWedsKhuswanth" style="width:100%; background:var(--color-bg); border:1px solid var(--color-border); color:var(--color-text-primary); padding:var(--space-2); border-radius:var(--radius-sm); box-sizing:border-box; outline:none; transition: border-color 0.2s;">
                </div>
                <div style="flex: 1; min-width: 140px;">
                    <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:4px;">Instagram (Optional)</label>
                    <input type="text" id="weddingInstagram" placeholder="Handle or URL" style="width:100%; background:var(--color-bg); border:1px solid var(--color-border); color:var(--color-text-primary); padding:var(--space-2); border-radius:var(--radius-sm); box-sizing:border-box; outline:none; transition: border-color 0.2s;">
                </div>
            </div>

            <div style="display: flex; gap: var(--space-3); flex-wrap: wrap;">
                <div style="flex: 1; min-width: 140px;">
                    <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:4px;">Start Date *</label>
                    <input type="date" id="startDate" min="${todayStr}" onclick="try{this.showPicker()}catch(e){}" required style="width:100%; background:var(--color-bg); border:1px solid var(--color-border); color:var(--color-text-primary); padding:var(--space-2); border-radius:var(--radius-sm); box-sizing:border-box; cursor:pointer; outline:none; transition: border-color 0.2s;">
                </div>
                <div style="flex: 1; min-width: 140px;">
                    <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:4px;">End Date *</label>
                    <input type="date" id="endDate" disabled required style="width:100%; background:var(--color-bg); border:1px solid var(--color-border); color:var(--color-text-primary); padding:var(--space-2); border-radius:var(--radius-sm); box-sizing:border-box; cursor:pointer; outline:none; transition: border-color 0.2s;">
                </div>
            </div>

            <div>
                <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:4px;">Family Name *</label>
                <input type="text" id="familyName" required placeholder="e.g., Bafna Family" style="width:100%; background:var(--color-bg); border:1px solid var(--color-border); color:var(--color-text-primary); padding:var(--space-2); border-radius:var(--radius-sm); box-sizing:border-box; outline:none; transition: border-color 0.2s;">
            </div>

            <div>
                <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:4px;">Family Details *</label>
                <input type="text" id="familyDetails" required placeholder="e.g., The Bafna & Sharma Families" style="width:100%; background:var(--color-bg); border:1px solid var(--color-border); color:var(--color-text-primary); padding:var(--space-2); border-radius:var(--radius-sm); box-sizing:border-box; outline:none; transition: border-color 0.2s;">
            </div>
        </form>
    `;

    const modal = openModal({
        title: "Add New Wedding",
        content: formHTML,
        actions: [
            { label: "Cancel", variant: "ghost" },
            { 
                label: "Add", 
                variant: "primary", 
                closesModal: false,
                onClick: async () => {
                    const fields = [
                        { id: 'brideName', name: "Bride's Name" },
                        { id: 'groomName', name: "Groom's Name" },
                        { id: 'startDate', name: "Start Date" },
                        { id: 'endDate', name: "End Date" },
                        { id: 'familyName', name: "Family Name" },
                        { id: 'familyDetails', name: "Family Details" }
                    ];

                    let isValid = true;
                    let firstEmptyField = null;

                    fields.forEach(field => {
                        const el = document.getElementById(field.id);
                        if (!el.value.trim()) {
                            el.style.borderColor = "red";
                            isValid = false;
                            if (!firstEmptyField) firstEmptyField = field.name;
                        } else {
                            el.style.borderColor = "green";
                        }
                    });

                    const startDate = document.getElementById('startDate').value;
                    const endDate = document.getElementById('endDate').value;
                    
                    if (startDate) {
                        const startOnlyDate = new Date(startDate + 'T00:00:00');
                        const todayOnlyDate = new Date(getLocalTodayString() + 'T00:00:00');
                        if (startOnlyDate < todayOnlyDate) {
                            document.getElementById('startDate').style.borderColor = "red";
                            showAlert({ icon: 'error', title: 'Invalid Date', text: 'Start date cannot be in the past.' });
                            return;
                        }
                    }

                    if (startDate && endDate) {
                        if (new Date(endDate) < new Date(startDate)) {
                            document.getElementById('endDate').style.borderColor = "red";
                            showAlert({ icon: 'error', title: 'Invalid Dates', text: 'End date cannot be earlier than the start date.' });
                            return;
                        }
                    }

                    if (!isValid) {
                        showAlert({ icon: 'warning', title: 'Missing Information', text: `Please fill out all mandatory fields. Missing: ${firstEmptyField}` });
                        return;
                    }

                    const primarySide = document.querySelector('input[name="primarySide"]:checked').value;
                    const brideName = document.getElementById('brideName').value.trim();
                    const groomName = document.getElementById('groomName').value.trim();
                    const familyName = document.getElementById('familyName').value.trim();
                    const familyDetails = document.getElementById('familyDetails').value.trim();
                    
                    const hashtagVal = document.getElementById('weddingHashtag').value.trim();
                    const instagramVal = document.getElementById('weddingInstagram').value.trim();

                    try {
                        const { error } = await supabase.from('weddings').insert([{ 
                            primary_side: primarySide,
                            bride_name: brideName,
                            groom_name: groomName, 
                            start_date: startDate,
                            end_date: endDate,
                            family_name: familyName,
                            family_details: familyDetails,
                            hashtag: hashtagVal,
                            instagram: instagramVal
                        }]);
                        
                        if (error) throw error;
                        
                        modal.close();
                        window.dispatchEvent(new Event('weddingDataUpdated'));

                        showAlert({ icon: 'success', title: 'Added!', text: 'The wedding has been successfully added.', timer: 2000 });
                    } catch (error) {
                        showAlert({ icon: 'error', title: 'Database Error', text: 'Failed to add wedding: ' + error.message });
                    }
                }
            }
        ]
    });

    setTimeout(() => {
        forceStyleModalButtons();
        const requiredIds = ['brideName', 'groomName', 'startDate', 'endDate', 'familyName', 'familyDetails'];
        requiredIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.style.borderColor = el.value.trim() === '' ? 'red' : 'green';
                el.addEventListener('input', () => { el.style.borderColor = el.value.trim() === '' ? 'red' : 'green'; });
            }
        });

        const startEl = document.getElementById('startDate');
        const endEl = document.getElementById('endDate');
        if (startEl && endEl) {
            startEl.addEventListener('change', () => {
                if (startEl.value) {
                    endEl.disabled = false;
                    endEl.min = startEl.value;
                    endEl.value = ''; 
                    endEl.style.borderColor = 'red';
                } else {
                    endEl.disabled = true;
                    endEl.value = '';
                    endEl.style.borderColor = 'red';
                }
            });
            
            endEl.addEventListener('click', (e) => {
                if (!endEl.disabled) {
                    try{ endEl.showPicker(); } catch(err){}
                }
            });
        }

    }, 50);
}

window.openEditWeddingModal = function(wedding) {
    const userRole = window.currentUser?.role || 'guest';
    
    // Check if user is a creator OR explicitly assigned as a host to this wedding
    if (!canEditWedding(wedding)) {
        showAlert({ icon: 'error', title: 'Access Denied', text: 'You do not have permission to edit this wedding.' });
        return;
    }

    const todayStr = getLocalTodayString();

    const formHTML = `
        <form id="editWeddingForm" novalidate style="display:flex; flex-direction:column; gap:var(--space-3); overflow-y: auto; max-height: 60vh; padding-right: 5px;">
            <div>
                <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:8px;">Primary Side</label>
                <div style="display: flex; gap: var(--space-4); align-items: center;">
                    <label style="display: flex; align-items: center; gap: 4px; color: var(--color-text-primary); font-size: var(--font-size-sm); cursor: pointer;">
                        <input type="radio" name="editPrimarySide" value="bride" ${wedding.primary_side !== 'groom' ? 'checked' : ''} style="accent-color: var(--color-primary); cursor: pointer;"> Bride's Side
                    </label>
                    <label style="display: flex; align-items: center; gap: 4px; color: var(--color-text-primary); font-size: var(--font-size-sm); cursor: pointer;">
                        <input type="radio" name="editPrimarySide" value="groom" ${wedding.primary_side === 'groom' ? 'checked' : ''} style="accent-color: var(--color-primary); cursor: pointer;"> Groom's Side
                    </label>
                </div>
            </div>

            <div style="display: flex; gap: var(--space-3); flex-wrap: wrap;">
                <div style="flex: 1; min-width: 140px;">
                    <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:4px;">Bride's Name *</label>
                    <input type="text" id="editBrideName" value="${(wedding.bride_name || '').replace(/"/g, '&quot;')}" required style="width:100%; background:var(--color-bg); border:1px solid var(--color-border); color:var(--color-text-primary); padding:var(--space-2); border-radius:var(--radius-sm); box-sizing:border-box; outline:none; transition: border-color 0.2s;">
                </div>
                <div style="flex: 1; min-width: 140px;">
                    <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:4px;">Groom's Name *</label>
                    <input type="text" id="editGroomName" value="${(wedding.groom_name || '').replace(/"/g, '&quot;')}" required style="width:100%; background:var(--color-bg); border:1px solid var(--color-border); color:var(--color-text-primary); padding:var(--space-2); border-radius:var(--radius-sm); box-sizing:border-box; outline:none; transition: border-color 0.2s;">
                </div>
            </div>

            <div style="display: flex; gap: var(--space-3); flex-wrap: wrap;">
                <div style="flex: 1; min-width: 140px;">
                    <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:4px;">Hashtag (Optional)</label>
                    <input type="text" id="editWeddingHashtag" value="${(wedding.hashtag || '').replace(/"/g, '&quot;')}" placeholder="e.g., #SonalWedsKhuswanth" style="width:100%; background:var(--color-bg); border:1px solid var(--color-border); color:var(--color-text-primary); padding:var(--space-2); border-radius:var(--radius-sm); box-sizing:border-box; outline:none; transition: border-color 0.2s;">
                </div>
                <div style="flex: 1; min-width: 140px;">
                    <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:4px;">Instagram (Optional)</label>
                    <input type="text" id="editWeddingInstagram" value="${(wedding.instagram || '').replace(/"/g, '&quot;')}" placeholder="Handle or URL" style="width:100%; background:var(--color-bg); border:1px solid var(--color-border); color:var(--color-text-primary); padding:var(--space-2); border-radius:var(--radius-sm); box-sizing:border-box; outline:none; transition: border-color 0.2s;">
                </div>
            </div>

            <div style="display: flex; gap: var(--space-3); flex-wrap: wrap;">
                <div style="flex: 1; min-width: 140px;">
                    <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:4px;">Start Date *</label>
                    <input type="date" id="editStartDate" value="${wedding.start_date}" min="${todayStr}" onclick="try{this.showPicker()}catch(e){}" required style="width:100%; background:var(--color-bg); border:1px solid var(--color-border); color:var(--color-text-primary); padding:var(--space-2); border-radius:var(--radius-sm); box-sizing:border-box; cursor:pointer; outline:none; transition: border-color 0.2s;">
                </div>
                <div style="flex: 1; min-width: 140px;">
                    <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:4px;">End Date *</label>
                    <input type="date" id="editEndDate" value="${wedding.end_date}" min="${wedding.start_date || todayStr}" onclick="try{this.showPicker()}catch(e){}" required style="width:100%; background:var(--color-bg); border:1px solid var(--color-border); color:var(--color-text-primary); padding:var(--space-2); border-radius:var(--radius-sm); box-sizing:border-box; cursor:pointer; outline:none; transition: border-color 0.2s;">
                </div>
            </div>

            <div>
                <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:4px;">Family Name *</label>
                <input type="text" id="editFamilyName" value="${(wedding.family_name || '').replace(/"/g, '&quot;')}" required placeholder="e.g., Bafna Family" style="width:100%; background:var(--color-bg); border:1px solid var(--color-border); color:var(--color-text-primary); padding:var(--space-2); border-radius:var(--radius-sm); box-sizing:border-box; outline:none; transition: border-color 0.2s;">
            </div>

            <div>
                <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:4px;">Family Details *</label>
                <input type="text" id="editFamilyDetails" value="${(wedding.family_details || '').replace(/"/g, '&quot;')}" required placeholder="e.g., The Bafna & Sharma Families" style="width:100%; background:var(--color-bg); border:1px solid var(--color-border); color:var(--color-text-primary); padding:var(--space-2); border-radius:var(--radius-sm); box-sizing:border-box; outline:none; transition: border-color 0.2s;">
            </div>
        </form>
    `;

    // Dynamically build actions based on role
    const modalActions = [];

    // STRICT RULE: Only Creators can delete
    if (userRole === 'creator') {
        modalActions.push({
            label: "Delete",
            variant: "danger",
            closesModal: false,
            onClick: async () => {
                const result = await Swal.fire({
                    title: 'Are you sure?',
                    text: "Do you really want to delete this wedding? All events and guests will be permanently removed.",
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonColor: '#dc2626',
                    cancelButtonColor: '#6b7280',
                    confirmButtonText: 'Yes, delete it!'
                });

                if (result.isConfirmed) {
                    try {
                        const { error } = await supabase.from('weddings').delete().eq('id', wedding.id);
                        if (error) throw error;
                        
                        modal.close();
                        window.dispatchEvent(new Event('weddingDataUpdated')); 
                        showAlert({ icon: 'success', title: 'Deleted!', text: 'The wedding has been removed.', timer: 2000 });
                    } catch (error) {
                        showAlert({ icon: 'error', title: 'Database Error', text: error.message });
                    }
                }
            }
        });
    }

    modalActions.push({ label: "Cancel", variant: "ghost" });
    
    modalActions.push({ 
        label: "Edit", 
        variant: "primary", 
        closesModal: false,
        onClick: async () => {
            const fields = [
                { id: 'editBrideName', name: "Bride's Name" },
                { id: 'editGroomName', name: "Groom's Name" },
                { id: 'editStartDate', name: "Start Date" },
                { id: 'editEndDate', name: "End Date" },
                { id: 'editFamilyName', name: "Family Name" },
                { id: 'editFamilyDetails', name: "Family Details" }
            ];

            let isValid = true;
            let firstEmptyField = null;

            fields.forEach(field => {
                const el = document.getElementById(field.id);
                if (!el.value.trim()) {
                    el.style.borderColor = "red";
                    isValid = false;
                    if (!firstEmptyField) firstEmptyField = field.name;
                } else {
                    el.style.borderColor = "green";
                }
            });

            const startDate = document.getElementById('editStartDate').value;
            const endDate = document.getElementById('editEndDate').value;

            if (startDate) {
                const startOnlyDate = new Date(startDate + 'T00:00:00');
                const todayOnlyDate = new Date(getLocalTodayString() + 'T00:00:00');
                if (startOnlyDate < todayOnlyDate && startDate !== wedding.start_date) {
                    document.getElementById('editStartDate').style.borderColor = "red";
                    showAlert({ icon: 'error', title: 'Invalid Date', text: 'Start date cannot be changed to a past date.' });
                    return;
                }
            }

            if (startDate && endDate) {
                if (new Date(endDate) < new Date(startDate)) {
                    document.getElementById('editEndDate').style.borderColor = "red";
                    showAlert({ icon: 'error', title: 'Invalid Dates', text: 'End date cannot be earlier than the start date.' });
                    return;
                }
            }

            if (!isValid) {
                showAlert({ icon: 'warning', title: 'Missing Information', text: `Please fill out all mandatory fields. Missing: ${firstEmptyField}` });
                return;
            }

            const hashtagVal = document.getElementById('editWeddingHashtag').value.trim();
            const instagramVal = document.getElementById('editWeddingInstagram').value.trim();

            try {
                const { error } = await supabase.from('weddings').update({
                    primary_side: document.querySelector('input[name="editPrimarySide"]:checked').value,
                    bride_name: document.getElementById('editBrideName').value.trim(),
                    groom_name: document.getElementById('editGroomName').value.trim(),
                    start_date: startDate,
                    end_date: endDate,
                    family_name: document.getElementById('editFamilyName').value.trim(),
                    family_details: document.getElementById('editFamilyDetails').value.trim(),
                    hashtag: hashtagVal,
                    instagram: instagramVal
                }).eq('id', wedding.id);
                
                if (error) throw error;
                
                modal.close();
                window.dispatchEvent(new Event('weddingDataUpdated'));
                showAlert({ icon: 'success', title: 'Updated!', text: 'Wedding details updated successfully.', timer: 2000 });
            } catch (error) {
                showAlert({ icon: 'error', title: 'Database Error', text: error.message });
            }
        }
    });

    const modal = openModal({
        title: "Edit Wedding",
        content: formHTML,
        actions: modalActions
    });

    setTimeout(() => {
        forceStyleModalButtons();
        const requiredIds = ['editBrideName', 'editGroomName', 'editStartDate', 'editEndDate', 'editFamilyName', 'editFamilyDetails'];
        requiredIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.style.borderColor = el.value.trim() === '' ? 'red' : 'green';
                el.addEventListener('input', () => { el.style.borderColor = el.value.trim() === '' ? 'red' : 'green'; });
            }
        });

        const editStartEl = document.getElementById('editStartDate');
        const editEndEl = document.getElementById('editEndDate');
        if (editStartEl && editEndEl) {
            editStartEl.addEventListener('change', () => {
                if (editStartEl.value) {
                    editEndEl.disabled = false;
                    editEndEl.min = editStartEl.value;
                    editEndEl.value = ''; 
                    editEndEl.style.borderColor = 'red';
                } else {
                    editEndEl.disabled = true;
                    editEndEl.value = '';
                    editEndEl.style.borderColor = 'red';
                }
            });
        }

    }, 50);
}

export function formatWeddingDateRange(startIso, endIso) {
    if (!startIso || !endIso) return "Dates TBD";
    const start = new Date(startIso);
    const end = new Date(endIso);
    
    const sDay = start.getDate();
    const eDay = end.getDate();
    
    const getSuffix = (day) => {
        if (day > 3 && day < 21) return 'th';
        switch (day % 10) {
            case 1: return "st";
            case 2: return "nd";
            case 3: return "rd";
            default: return "th";
        }
    };

    const sMonth = start.toLocaleString("en-IN", { month: "short" });
    const eMonth = end.toLocaleString("en-IN", { month: "short" });
    const year = start.getFullYear();

    if (startIso === endIso) {
        return `${sDay}${getSuffix(sDay)} ${start.toLocaleString("en-IN", { month: "long" })}, ${year}`;
    }
    
    if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
        return `${sDay}${getSuffix(sDay)} - ${eDay}${getSuffix(eDay)} ${start.toLocaleString("en-IN", { month: "long" })}, ${year}`;
    }
    
    return `${sDay}${getSuffix(sDay)} ${sMonth} - ${eDay}${getSuffix(eDay)} ${eMonth}, ${year}`;
}