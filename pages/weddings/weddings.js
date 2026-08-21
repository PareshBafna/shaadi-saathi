import { supabase } from '../../database/js/api.js';
import { openModal } from '../../global/js/modal.js';
import { showSweetAlert } from '../../global/js/sweet-alert-message.js';

let allWeddings = [];

function getLocalTodayString() {
    const today = new Date();
    return today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
}

function startOfDay(date) {
    const copy = new Date(date);
    copy.setHours(0, 0, 0, 0);
    return copy;
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

function canEditWedding(wedding) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(wedding.end_date);
    end.setHours(0, 0, 0, 0);
    
    if (end.getTime() < today.getTime()) return false;

    const user = window.currentUser;
    if (!user) {
        showSweetAlert('error', 'Authentication Notice', 'Active session details (ss_user_id) are missing.');
        return false;
    }
    if (user.role === 'creator') return true;
    if (wedding.hosts && wedding.hosts.some(h => h.user_id === user.id)) return true;
    return false;
}

export function renderWeddings() {
    if (typeof window.checkSessionOrShowAlert === 'function' && !window.checkSessionOrShowAlert()) {
        const wrapper = document.createElement('section');
        wrapper.className = "weddings-page-wrapper weddings-page-wrapper--message";
        wrapper.textContent = "Please log in to view weddings.";
        return wrapper;
    }

    const wrapper = document.createElement('section');
    wrapper.className = "weddings-page-wrapper"; 

    const controls = document.createElement('div');
    controls.className = "weddings-control-bar";

    const leftContainer = document.createElement('div');
    leftContainer.className = "weddings-left-action";
    const user = window.currentUser || {};
    
    if (user.role === 'creator') {
        const createBtn = document.createElement("button");
        createBtn.id = "add-wedding-btn";
        createBtn.className = "weddings-add-btn";
        createBtn.innerHTML = `<i data-lucide="plus"></i> Wedding`;
        createBtn.addEventListener('click', () => window.openCreateWeddingModal());
        leftContainer.appendChild(createBtn);
    }

    const searchContainer = document.createElement('div');
    searchContainer.className = "weddings-search-container";
    searchContainer.innerHTML = `
        <div class="weddings-search-input-wrapper">
            <i data-lucide="search" class="weddings-search-icon"></i>
            <input type="text" id="weddingSearchInput" placeholder="Search ..." class="weddings-search-input">
        </div>
    `;

    controls.appendChild(leftContainer);
    controls.appendChild(searchContainer);
    wrapper.appendChild(controls);

    const sectionsContainer = document.createElement('div');
    sectionsContainer.id = "weddings-galleries-container";
    wrapper.appendChild(sectionsContainer);

    setTimeout(() => {
        loadWeddingsData(sectionsContainer);
        document.getElementById('weddingSearchInput')?.addEventListener('input', filterAndRenderGalleries);
        if (window.lucide) window.lucide.createIcons();
    }, 50);

    const updateHandler = () => {
        if (document.body.contains(wrapper)) {
            loadWeddingsData(sectionsContainer);
        } else {
            window.removeEventListener('weddingDataUpdated', updateHandler);
            window.removeEventListener('weddingsDataUpdated', updateHandler);
        }
    };
    window.addEventListener('weddingDataUpdated', updateHandler);
    window.addEventListener('weddingsDataUpdated', updateHandler);

    return wrapper;
}

async function loadWeddingsData(container) {
    const userRole = window.currentUser?.role || 'guest';
    const userPhone = window.currentUser?.phone || '';
    const userId = window.currentUser?.id || '';
    const isCreator = userRole === 'creator';

    const cleanedUserPhone = userPhone ? userPhone.replace(/[^0-9]/g, '') : null;
    const baseUserPhone = cleanedUserPhone ? cleanedUserPhone.slice(-10) : null;

    container.innerHTML = `<div class="weddings-loading-state">Loading weddings...</div>`;
    
    try {
        let accessibleWeddingIds = [];

        if (!isCreator) {
            const [hostRes, wUserRes, allGuestsRes] = await Promise.all([
                supabase.from('wedding_hosts').select('wedding_id').eq('user_id', userId),
                supabase.from('wedding_users').select('wedding_id').eq('user_id', userId),
                supabase.from('guests').select('id, wedding_id, phone') 
            ]);

            const hostIds = hostRes.data ? hostRes.data.map(h => h.wedding_id) : [];
            const wUserIds = wUserRes.data ? wUserRes.data.map(u => u.wedding_id) : [];
            
            const matchedGuests = (allGuestsRes.data || []).filter(g => {
                const cleanedGuestPhone = g.phone ? g.phone.replace(/[^0-9]/g, '') : null;
                return baseUserPhone && cleanedGuestPhone && cleanedGuestPhone.endsWith(baseUserPhone);
            });
            const guestIds = matchedGuests.map(g => g.wedding_id);

            accessibleWeddingIds = [...new Set([...hostIds, ...wUserIds, ...guestIds])];

            if (accessibleWeddingIds.length === 0) {
                allWeddings = [];
                filterAndRenderGalleries();
                return;
            }
        }

        let weddingsQuery = supabase.from('weddings').select('*');
        if (!isCreator) {
            weddingsQuery = weddingsQuery.in('id', accessibleWeddingIds);
        }
        
        const { data: rawWeddings, error } = await weddingsQuery;
        if (error) throw error;
        
        const { data: allSysUsers, error: sysUsersErr } = await supabase.from('users').select('id, name, phone');
        if (sysUsersErr) throw sysUsersErr;

        let hostsQuery = supabase.from('wedding_hosts').select('*');
        let wUsersQuery = supabase.from('wedding_users').select('*');
        let webInvitesQuery = supabase.from('wedding_web_invite').select('wedding_id');
        
        if (!isCreator) {
            hostsQuery = hostsQuery.in('wedding_id', accessibleWeddingIds);
            wUsersQuery = wUsersQuery.in('wedding_id', accessibleWeddingIds);
            webInvitesQuery = webInvitesQuery.in('wedding_id', accessibleWeddingIds);
        }

        const { data: hostsData, error: hostsError } = await hostsQuery;
        if (hostsError && hostsError.code !== '42P01') throw hostsError;

        const { data: wUsersData, error: wUsersError } = await wUsersQuery;
        if (wUsersError && wUsersError.code !== '42P01') throw wUsersError;

        const { data: webInvitesData } = await webInvitesQuery;
        
        let accessibleWeddings = [];

        for (let wedding of (rawWeddings || [])) {
            const rawHosts = hostsData ? hostsData.filter(h => h.wedding_id === wedding.id) : [];
            wedding.hosts = rawHosts.map(h => {
                const u = allSysUsers.find(u => u.id === h.user_id) || {};
                return { ...h, name: u.name, phone: u.phone };
            });

            wedding.wedding_users = wUsersData ? wUsersData.filter(u => u.wedding_id === wedding.id) : [];
            wedding.has_web_invite = (wedding.id === '00000000-0000-0000-0000-000000000000') || (webInvitesData ? webInvitesData.some(w => w.wedding_id === wedding.id) : false);

            let eventsQuery = supabase.from('wedding_events').select('*', { count: 'exact', head: true }).eq('wedding_id', wedding.id);
            
            const isHost = wedding.hosts.some(h => h.user_id === userId);
            const isWUser = wedding.wedding_users.some(u => u.user_id === userId);
            const canViewAll = isCreator || isHost || isWUser;

            if (!canViewAll) {
                const { data: weddingGuests } = await supabase.from('guests').select('id, phone').eq('wedding_id', wedding.id);
                const guestData = (weddingGuests || []).find(g => {
                     const cleanedGuestPhone = g.phone ? g.phone.replace(/[^0-9]/g, '') : null;
                     return baseUserPhone && cleanedGuestPhone && cleanedGuestPhone.endsWith(baseUserPhone);
                });

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
            accessibleWeddings.push(wedding);
        }

        allWeddings = accessibleWeddings;
        filterAndRenderGalleries();
    } catch (error) {
        console.error('[DEBUG ERROR] Failed to load weddings directory:', error);
        container.innerHTML = `<div class="weddings-error-state">Failed to load data: ${error.message}</div>`;
    }
}

function filterAndRenderGalleries() {
    const searchTerm = document.getElementById('weddingSearchInput')?.value.toLowerCase() || '';
    
    let filtered = allWeddings.filter(w => {
        const side = w.primary_side || 'bride';
        const full = side === 'groom' ? `${w.groom_name} & ${w.bride_name}`.toLowerCase() : `${w.bride_name} & ${w.groom_name}`.toLowerCase();
        return full.includes(searchTerm.replace(/\s+/g, '')) || w.bride_name.toLowerCase().includes(searchTerm) || w.groom_name.toLowerCase().includes(searchTerm);
    });

    filtered.sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

    const todayTime = startOfDay(new Date()).getTime();

    const inProgress = filtered.filter(w => {
        const start = startOfDay(new Date(w.start_date)).getTime();
        const end = startOfDay(new Date(w.end_date)).getTime();
        return todayTime >= start && todayTime <= end;
    });
    const upcoming = filtered.filter(w => startOfDay(new Date(w.start_date)).getTime() > todayTime);
    const archived = filtered.filter(w => startOfDay(new Date(w.end_date)).getTime() < todayTime);

    const container = document.getElementById('weddings-galleries-container');
    if (!container) return;

    if (filtered.length === 0) {
        container.innerHTML = `<div class="weddings-empty-state">No weddings match your search.</div>`;
        return;
    }

    container.innerHTML = `
        <div class="weddings-galleries-grid">
            ${buildGallerySection("In Progress", inProgress)}
            ${buildGallerySection("Upcoming", upcoming)}
            ${buildGallerySection("Archived", archived)}
        </div>
    `;

    container.querySelectorAll('.dashboard-wedding-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if(!e.target.closest('.dashboard-wedding-card__edit-btn') && !e.target.closest('a')) {
                const id = card.getAttribute('data-wedding-id');
                window.location.hash = `#wedding-details?id=${id}`;
            }
        });
    });

    container.querySelectorAll('.dashboard-wedding-card__edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const card = e.target.closest('.dashboard-wedding-card');
            const weddingId = card.getAttribute('data-wedding-id');
            const wedding = allWeddings.find(w => w.id === weddingId);
            
            if (window.openEditWeddingModal && wedding) {
                window.openEditWeddingModal(wedding);
            } else {
                showSweetAlert('info', 'Edit Mode', 'Edit Wedding Modal coming soon!');
            }
        });
    });

    if (window.lucide) window.lucide.createIcons();
}

function buildGallerySection(title, weddings) {
    if (!weddings || weddings.length === 0) return '';
    
    const listItems = weddings.map(wedding => {
        let editBtnHTML = '';

        if (canEditWedding(wedding)) {
            editBtnHTML = `
                <button class="dashboard-wedding-card__edit-btn" title="Edit Wedding">
                    <i data-lucide="edit-2"></i>
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
            <div class="dashboard-wedding-card__row">
                <i data-lucide="phone"></i> <span>${inlineHosts}</span>
            </div>`;
        } else {
            hostsHTML = `
            <div class="dashboard-wedding-card__row dashboard-wedding-card__row--empty">
                <i data-lucide="phone"></i> <span>No wedding hosts added</span>
            </div>`;
        }

        let webInviteHTML = '';
        if (wedding.has_web_invite || wedding.id === '00000000-0000-0000-0000-000000000000') {
            let inviteUrl = `/#web-invites-preview?id=${wedding.id}`;
            if (wedding.id === '00000000-0000-0000-0000-000000000000') {
                inviteUrl = `/#sample-web-invites-preview?id=sample-upcoming`;
            }

            webInviteHTML = `
            <div class="dashboard-wedding-card__invite-wrap">
                <a href="${inviteUrl}" target="_blank" onclick="event.stopPropagation();" class="dashboard-wedding-card__invite-btn">
                    <i data-lucide="external-link"></i> Wedding Invitation
                </a>
            </div>`;
        }

        return `
        <div class="dashboard-wedding-card" data-wedding-id="${wedding.id}">
            <div class="dashboard-wedding-card__header">
                <div class="dashboard-wedding-card__title-group">
                    <div class="dashboard-wedding-card__icon-badge">
                        <i data-lucide="heart"></i>
                    </div>
                    <div>
                        <h3 class="dashboard-wedding-card__names">${displayNames}</h3>
                        <p class="dashboard-wedding-card__dates"><i data-lucide="calendar"></i> ${formatWeddingDateRange(wedding.start_date, wedding.end_date)}</p>
                    </div>
                </div>
            </div>

            <div class="dashboard-wedding-card__details">
                ${wedding.family_name ? `<div class="dashboard-wedding-card__row"><i data-lucide="home"></i> <span>${wedding.family_name}</span></div>` : ''}
                ${wedding.family_details ? `<div class="dashboard-wedding-card__row"><i data-lucide="users"></i> <span>${wedding.family_details}</span></div>` : ''}
                ${hostsHTML}
                <div class="dashboard-wedding-card__row"><i data-lucide="calendar-days"></i> <span>${wedding.events_count || 0} Events</span></div>
                ${webInviteHTML}
            </div>

            ${editBtnHTML}
        </div>
        `;
    }).join('');

    return `
        <div class="dashboard-section">
            <h2 class="dashboard-section__heading">${title}</h2>
            <div class="dashboard-section__list">
                ${listItems}
            </div>
        </div>
    `;
}

function layoutModalFooter(isEditModal = false) {
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

export function openCreateWeddingModal() {
    const userRole = window.currentUser?.role || 'guest';
    
    if (userRole !== 'creator') {
        showSweetAlert('error', 'Access Denied', 'Only creators have permission to add new weddings.');
        return;
    }

    const todayStr = getLocalTodayString();

    const formHTML = `
        <form id="createWeddingForm" novalidate class="wedding-modal-form">
            <div>
                <label class="wedding-modal-label">Primary Side</label>
                <div class="wedding-modal-radios">
                    <label class="wedding-modal-radio-label">
                        <input type="radio" name="primarySide" value="bride" checked> Bride's Side
                    </label>
                    <label class="wedding-modal-radio-label">
                        <input type="radio" name="primarySide" value="groom"> Groom's Side
                    </label>
                </div>
            </div>

            <div class="wedding-modal-row">
                <div class="wedding-modal-col">
                    <label class="wedding-modal-label">Bride's Name *</label>
                    <input type="text" id="brideName" required class="wedding-modal-input wedding-modal-input--invalid">
                </div>
                <div class="wedding-modal-col">
                    <label class="wedding-modal-label">Groom's Name *</label>
                    <input type="text" id="groomName" required class="wedding-modal-input wedding-modal-input--invalid">
                </div>
            </div>

            <div class="wedding-modal-row">
                <div class="wedding-modal-col">
                    <label class="wedding-modal-label">Hashtag (Optional)</label>
                    <input type="text" id="weddingHashtag" placeholder="e.g., #SonalWedsKhuswanth" class="wedding-modal-input">
                </div>
                <div class="wedding-modal-col">
                    <label class="wedding-modal-label">Instagram (Optional)</label>
                    <input type="text" id="weddingInstagram" placeholder="Handle or URL" class="wedding-modal-input">
                </div>
            </div>

            <div class="wedding-modal-row">
                <div class="wedding-modal-col">
                    <label class="wedding-modal-label">Start Date *</label>
                    <input type="date" id="startDate" min="${todayStr}" onclick="try{this.showPicker()}catch(e){}" required class="wedding-modal-input wedding-modal-input--invalid" style="cursor: pointer;">
                </div>
                <div class="wedding-modal-col">
                    <label class="wedding-modal-label">End Date *</label>
                    <input type="date" id="endDate" disabled required class="wedding-modal-input wedding-modal-input--invalid" style="cursor: pointer;">
                </div>
            </div>

            <div>
                <label class="wedding-modal-label">Family Name *</label>
                <input type="text" id="familyName" required placeholder="e.g., Bafna Family" class="wedding-modal-input wedding-modal-input--invalid">
            </div>

            <div>
                <label class="wedding-modal-label">Family Details *</label>
                <textarea id="familyDetails" rows="3" required placeholder="e.g., The Bafna & Sharma Families" class="wedding-modal-input wedding-modal-input--invalid" style="resize: vertical;"></textarea>
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
                            el.classList.add('wedding-modal-input--invalid');
                            el.classList.remove('wedding-modal-input--valid');
                            isValid = false;
                            if (!firstEmptyField) firstEmptyField = field.name;
                        } else {
                            el.classList.remove('wedding-modal-input--invalid');
                            el.classList.add('wedding-modal-input--valid');
                        }
                    });

                    const startDate = document.getElementById('startDate').value;
                    const endDate = document.getElementById('endDate').value;
                    
                    if (startDate) {
                        const startOnlyDate = new Date(startDate + 'T00:00:00');
                        const todayOnlyDate = new Date(getLocalTodayString() + 'T00:00:00');
                        if (startOnlyDate < todayOnlyDate) {
                            document.getElementById('startDate').classList.add('wedding-modal-input--invalid');
                            showSweetAlert('error', 'Invalid Date', 'Start date cannot be in the past.');
                            return;
                        }
                    }

                    if (startDate && endDate) {
                        if (new Date(endDate) < new Date(startDate)) {
                            document.getElementById('endDate').classList.add('wedding-modal-input--invalid');
                            showSweetAlert('error', 'Invalid Dates', 'End date cannot be earlier than the start date.');
                            return;
                        }
                    }

                    if (!isValid) {
                        showSweetAlert('error', 'Missing Information', `Please fill out all mandatory fields. Missing: ${firstEmptyField}`);
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

                        showSweetAlert('success', 'Added!', 'The wedding has been successfully added.');
                    } catch (error) {
                        showSweetAlert('error', 'Database Error', 'Failed to add wedding: ' + error.message);
                    }
                }
            }
        ]
    });

    setTimeout(() => {
        layoutModalFooter(false);
        const requiredIds = ['brideName', 'groomName', 'startDate', 'endDate', 'familyName', 'familyDetails'];
        requiredIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                const updateValidity = () => {
                    if (el.value.trim() === '') {
                        el.classList.add('wedding-modal-input--invalid');
                        el.classList.remove('wedding-modal-input--valid');
                    } else {
                        el.classList.remove('wedding-modal-input--invalid');
                        el.classList.add('wedding-modal-input--valid');
                    }
                };
                updateValidity();
                el.addEventListener('input', updateValidity);
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
                    endEl.classList.add('wedding-modal-input--invalid');
                    endEl.classList.remove('wedding-modal-input--valid');
                } else {
                    endEl.disabled = true;
                    endEl.value = '';
                    endEl.classList.add('wedding-modal-input--invalid');
                    endEl.classList.remove('wedding-modal-input--valid');
                }
            });
            
            endEl.addEventListener('click', () => {
                if (!endEl.disabled) {
                    try{ endEl.showPicker(); } catch(err){}
                }
            });
        }

    }, 50);
}
window.openCreateWeddingModal = openCreateWeddingModal;

export function openEditWeddingModal(wedding) {
    const userRole = window.currentUser?.role || 'guest';
    
    if (!canEditWedding(wedding)) {
        showSweetAlert('error', 'Access Denied', 'You do not have permission to edit this wedding.');
        return;
    }

    const todayStr = getLocalTodayString();

    const formHTML = `
        <form id="editWeddingForm" novalidate class="wedding-modal-form">
            <div>
                <label class="wedding-modal-label">Primary Side</label>
                <div class="wedding-modal-radios">
                    <label class="wedding-modal-radio-label">
                        <input type="radio" name="editPrimarySide" value="bride" ${wedding.primary_side !== 'groom' ? 'checked' : ''}> Bride's Side
                    </label>
                    <label class="wedding-modal-radio-label">
                        <input type="radio" name="editPrimarySide" value="groom" ${wedding.primary_side === 'groom' ? 'checked' : ''}> Groom's Side
                    </label>
                </div>
            </div>

            <div class="wedding-modal-row">
                <div class="wedding-modal-col">
                    <label class="wedding-modal-label">Bride's Name *</label>
                    <input type="text" id="editBrideName" value="${(wedding.bride_name || '').replace(/"/g, '&quot;')}" required class="wedding-modal-input wedding-modal-input--valid">
                </div>
                <div class="wedding-modal-col">
                    <label class="wedding-modal-label">Groom's Name *</label>
                    <input type="text" id="editGroomName" value="${(wedding.groom_name || '').replace(/"/g, '&quot;')}" required class="wedding-modal-input wedding-modal-input--valid">
                </div>
            </div>

            <div class="wedding-modal-row">
                <div class="wedding-modal-col">
                    <label class="wedding-modal-label">Hashtag (Optional)</label>
                    <input type="text" id="editWeddingHashtag" value="${(wedding.hashtag || '').replace(/"/g, '&quot;')}" placeholder="e.g., #SonalWedsKhuswanth" class="wedding-modal-input">
                </div>
                <div class="wedding-modal-col">
                    <label class="wedding-modal-label">Instagram (Optional)</label>
                    <input type="text" id="editWeddingInstagram" value="${(wedding.instagram || '').replace(/"/g, '&quot;')}" placeholder="Handle or URL" class="wedding-modal-input">
                </div>
            </div>

            <div class="wedding-modal-row">
                <div class="wedding-modal-col">
                    <label class="wedding-modal-label">Start Date *</label>
                    <input type="date" id="editStartDate" value="${wedding.start_date}" min="${todayStr}" onclick="try{this.showPicker()}catch(e){}" required class="wedding-modal-input wedding-modal-input--valid" style="cursor: pointer;">
                </div>
                <div class="wedding-modal-col">
                    <label class="wedding-modal-label">End Date *</label>
                    <input type="date" id="editEndDate" value="${wedding.end_date}" min="${wedding.start_date || todayStr}" onclick="try{this.showPicker()}catch(e){}" required class="wedding-modal-input wedding-modal-input--valid" style="cursor: pointer;">
                </div>
            </div>

            <div>
                <label class="wedding-modal-label">Family Name *</label>
                <input type="text" id="editFamilyName" value="${(wedding.family_name || '').replace(/"/g, '&quot;')}" required placeholder="e.g., Bafna Family" class="wedding-modal-input wedding-modal-input--valid">
            </div>

            <div>
                <label class="wedding-modal-label">Family Details *</label>
                <textarea id="editFamilyDetails" rows="3" required placeholder="e.g., The Bafna & Sharma Families" class="wedding-modal-input wedding-modal-input--valid" style="resize: vertical;">${wedding.family_details || ''}</textarea>
            </div>
        </form>
    `;

    const modalActions = [];

    // 1. Cancel on Left
    modalActions.push({ label: "Cancel", variant: "ghost" });

    // 2. Delete in Center (if creator)
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
                        showSweetAlert('success', 'Deleted!', 'The wedding has been removed.');
                    } catch (error) {
                        showSweetAlert('error', 'Database Error', error.message);
                    }
                }
            }
        });
    }

    // 3. Edit on Right
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
                    el.classList.add('wedding-modal-input--invalid');
                    el.classList.remove('wedding-modal-input--valid');
                    isValid = false;
                    if (!firstEmptyField) firstEmptyField = field.name;
                } else {
                    el.classList.remove('wedding-modal-input--invalid');
                    el.classList.add('wedding-modal-input--valid');
                }
            });

            const startDate = document.getElementById('editStartDate').value;
            const endDate = document.getElementById('editEndDate').value;

            if (startDate) {
                const startOnlyDate = new Date(startDate + 'T00:00:00');
                const todayOnlyDate = new Date(getLocalTodayString() + 'T00:00:00');
                if (startOnlyDate < todayOnlyDate && startDate !== wedding.start_date) {
                    document.getElementById('editStartDate').classList.add('wedding-modal-input--invalid');
                    showSweetAlert('error', 'Invalid Date', 'Start date cannot be changed to a past date.');
                    return;
                }
            }

            if (startDate && endDate) {
                if (new Date(endDate) < new Date(startDate)) {
                    document.getElementById('editEndDate').classList.add('wedding-modal-input--invalid');
                    showSweetAlert('error', 'Invalid Dates', 'End date cannot be earlier than the start date.');
                    return;
                }
            }

            if (!isValid) {
                showSweetAlert('error', 'Missing Information', `Please fill out all mandatory fields. Missing: ${firstEmptyField}`);
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
                showSweetAlert('success', 'Updated!', 'Wedding details updated successfully.');
            } catch (error) {
                showSweetAlert('error', 'Database Error', error.message);
            }
        }
    });

    const modal = openModal({
        title: "Edit Wedding",
        content: formHTML,
        actions: modalActions
    });

    setTimeout(() => {
        layoutModalFooter(true);
        const requiredIds = ['editBrideName', 'editGroomName', 'editStartDate', 'editEndDate', 'editFamilyName', 'editFamilyDetails'];
        requiredIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                const updateValidity = () => {
                    if (el.value.trim() === '') {
                        el.classList.add('wedding-modal-input--invalid');
                        el.classList.remove('wedding-modal-input--valid');
                    } else {
                        el.classList.remove('wedding-modal-input--invalid');
                        el.classList.add('wedding-modal-input--valid');
                    }
                };
                updateValidity();
                el.addEventListener('input', updateValidity);
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
                    editEndEl.classList.add('wedding-modal-input--invalid');
                    editEndEl.classList.remove('wedding-modal-input--valid');
                } else {
                    editEndEl.disabled = true;
                    editEndEl.value = '';
                    editEndEl.classList.add('wedding-modal-input--invalid');
                    editEndEl.classList.remove('wedding-modal-input--valid');
                }
            });
        }

    }, 50);
}
window.openEditWeddingModal = openEditWeddingModal;