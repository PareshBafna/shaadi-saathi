import { supabase } from '../../database/js/api.js';
import { openModal } from '../../global/components/js/modal.js';
import { showAlert } from '../../global/components/js/alerts.js';

// ==========================================
// MAIN RENDER FUNCTION
// ==========================================
export function renderWeddingDetails(weddingId) {
    const wrapper = document.createElement("div");
    wrapper.className = "wedding-details-wrapper"; 
    wrapper.style.cssText = "width: 100%; box-sizing: border-box; padding-bottom: var(--space-8);";
    wrapper.innerHTML = `<div style="padding: var(--space-8); text-align: center; color: var(--color-text-secondary);">Loading wedding details...</div>`;

    loadCommandCenterData(wrapper, weddingId);

    const updateHandler = () => {
        if (document.body.contains(wrapper)) {
            loadCommandCenterData(wrapper, weddingId);
        } else {
            window.removeEventListener('weddingDataUpdated', updateHandler);
        }
    };
    window.addEventListener('weddingDataUpdated', updateHandler);

    return wrapper;
}

// ==========================================
// ASYNC DATA FETCHER & PERMISSION HIERARCHY
// ==========================================
async function loadCommandCenterData(container, weddingId) {
    try {
        const curUser = window.currentUser || { role: 'guest' };

        // 1. Fetch Core Wedding Data
        const { data: wedding, error: weddingError } = await supabase.from('weddings').select('*').eq('id', weddingId).single();
        if (weddingError) throw weddingError;

        // 2. Fetch All System Users for Dropdowns
        const { data: allSysUsers, error: sysUsersErr } = await supabase.from('users').select('id, name, phone, role');
        if (sysUsersErr) throw sysUsersErr;

        // 3. Fetch Assigned Hosts & Wedding Users
        const { data: rawHosts } = await supabase.from('wedding_hosts').select('*').eq('wedding_id', weddingId);
        const { data: rawWUsers } = await supabase.from('wedding_users').select('*').eq('wedding_id', weddingId);

        // Map user details into the hosts/wedding_users arrays
        const hosts = (rawHosts || []).map(h => {
            const u = allSysUsers.find(u => u.id === h.user_id) || {};
            return { ...h, name: u.name, phone: u.phone };
        });
        
        const wUsers = (rawWUsers || []).map(w => {
            const u = allSysUsers.find(u => u.id === w.user_id) || {};
            return { ...w, name: u.name, phone: u.phone };
        });

        // 4. PERMISSION HIERARCHY CHECK
        const isCreator = curUser.role === 'creator';
        const isHost = hosts.some(h => h.user_id === curUser.id);
        const isWeddingUser = wUsers.some(w => w.user_id === curUser.id);
        
        const canConfig = isCreator || isHost; // Can Add/Edit/Delete (Hosts handle everything except themselves)
        const canViewAll = isCreator || isHost || isWeddingUser; // Can view all guests, all events, full stats

        // Store context globally for modal operations
        window.__weddingContext = {
            weddingId,
            allSysUsers,
            assignedIds: new Set([...hosts.map(h => h.user_id), ...wUsers.map(w => w.user_id)]),
            canConfig,
            isCreator,
            curUserId: curUser.id
        };

        // 5. Fetch Events & Guests
        let eventsQuery = supabase.from('events').select('*').eq('wedding_id', weddingId);
        const { data: guests, error: guestsError } = await supabase.from('guests').select('*').eq('wedding_id', weddingId);
        if (guestsError) throw guestsError;

        const { data: eventGuests } = await supabase.from('event_guests').select('*');

        if (guests && eventGuests) {
            guests.forEach(g => {
                g.invited_events = eventGuests.filter(eg => eg.guest_id === g.id).map(eg => eg.event_id);
            });
        }

        // Filter events based on permissions
        let filteredEvents = [];
        const { data: allEvents, error: eventsError } = await eventsQuery;
        if (eventsError) throw eventsError;

        if (!canViewAll) { // Physical Guest
            const currentGuest = guests?.find(g => g.phone === curUser.phone);
            const invitedEventIds = currentGuest ? currentGuest.invited_events : [];
            filteredEvents = allEvents ? allEvents.filter(e => invitedEventIds.includes(e.id)) : [];
        } else {
            filteredEvents = allEvents || []; // Creators, Hosts, and Wedding Users see all events
        }

        const displayEventCount = canViewAll ? (allEvents?.length || 0) : filteredEvents.length;

        // 6. Render UI Components
        container.innerHTML = "";
        container.appendChild(buildSpecificHeader(wedding));
        
        const statsSection = buildSpecificStats(wedding, displayEventCount, guests?.length || 0, hosts, canViewAll);
        if (statsSection) container.appendChild(statsSection);
        
        container.appendChild(buildEventItinerarySection(wedding, filteredEvents, canConfig));

        if (canViewAll) {
            container.appendChild(buildHostListSection(wedding, hosts, canConfig, isCreator, curUser.id));
            container.appendChild(buildWeddingUserListSection(wedding, wUsers, canConfig));
            const guestSection = buildGuestListSection(wedding, guests, allEvents, canConfig);
            if (guestSection) container.appendChild(guestSection);
        }

        if (window.lucide) window.lucide.createIcons();

    } catch (error) {
        console.error("Error loading wedding details:", error);
        container.innerHTML = `<div style="color: var(--color-danger); padding: var(--space-8); text-align: center;">Failed to load wedding details: ${error.message}</div>`;
    }
}

// ==========================================
// 1. HEADER SECTION
// ==========================================
function buildSpecificHeader(wedding) {
    const header = document.createElement("div");
    header.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-8);";
    
    const displayNames = wedding.primary_side === 'groom' 
        ? `${wedding.groom_name} & ${wedding.bride_name}` 
        : `${wedding.bride_name} & ${wedding.groom_name}`;

    let hashtagHTML = '';
    if (wedding.hashtag) {
        const formattedHashtag = wedding.hashtag.startsWith('#') ? wedding.hashtag : `#${wedding.hashtag}`;
        hashtagHTML = `<span style="background: var(--color-primary); color: var(--color-text-on-accent); padding: 4px 12px; border-radius: 16px; font-size: var(--font-size-sm); font-weight: var(--font-weight-medium); letter-spacing: 0.5px;">${formattedHashtag}</span>`;
    }

    let instagramHTML = '';
    if (wedding.instagram) {
        let igUrl = wedding.instagram.startsWith('http') ? wedding.instagram : `https://instagram.com/${wedding.instagram.replace('@', '')}`;
        instagramHTML = `
            <a href="${igUrl}" target="_blank" style="display: inline-flex; align-items: center; justify-content: center; text-decoration: none; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'" title="Instagram">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" fill="url(#ig-grad)"></rect>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></line>
                    <defs>
                        <radialGradient id="ig-grad" cx="30%" cy="107%" r="150%" fx="30%" fy="107%">
                            <stop offset="0%" stop-color="#fdf497" />
                            <stop offset="5%" stop-color="#fdf497" />
                            <stop offset="45%" stop-color="#fd5949" />
                            <stop offset="60%" stop-color="#d6249f" />
                            <stop offset="90%" stop-color="#285AEB" />
                        </radialGradient>
                    </defs>
                </svg>
            </a>
        `;
    }

    header.innerHTML = `
        <div>
            <h1 style="font-size: var(--font-size-3xl); font-weight: var(--font-weight-bold); color: var(--color-text-primary); margin: 0;">${displayNames}</h1>
            <p style="color: var(--color-text-secondary); margin: var(--space-2) 0 0 0; font-size: var(--font-size-base);">Date: <strong style="color: var(--color-primary);">${formatWeddingDateRange(wedding.start_date, wedding.end_date)}</strong></p>
            <div style="display: flex; align-items: center; gap: 8px; margin-top: var(--space-3);">
                ${hashtagHTML}
                ${instagramHTML}
            </div>
        </div>
    `;
    return header;
}

// ==========================================
// 2. STATS SECTION 
// ==========================================
function buildSpecificStats(wedding, eventsCount = 0, guestsCount = 0, hosts = [], canViewAll) {
    const formatWithNewlines = (text) => text ? text.replace(/[,;]\s*/g, '<br>') : '';

    const container = document.createElement("div");
    container.style.cssText = "display: flex; flex-direction: column; gap: var(--space-6); margin-bottom: var(--space-8);";

    // Top Row: Family Name & Details
    if (wedding.family_name || wedding.family_details) {
        const topRow = document.createElement("div");
        topRow.style.cssText = "display: flex; gap: var(--space-6); width: 100%; flex-wrap: wrap;";
        
        let topCardsHTML = '';

        if (wedding.family_name) {
            topCardsHTML += `
            <div class="stat-card" style="flex: 1; min-width: 250px; padding: var(--space-5); display: flex; align-items: center; justify-content: space-between; background: var(--color-white); border: 1px solid var(--color-border); border-radius: var(--radius-lg);">
                <div>
                    <p style="color: var(--color-text-secondary); font-size: var(--font-size-sm); margin: 0; font-weight: var(--font-weight-medium);">Family Name</p>
                    <p style="color: var(--color-text-primary); font-size: var(--font-size-lg); font-weight: var(--font-weight-bold); margin: 4px 0 0 0;">${wedding.family_name}</p>
                </div>
                <div style="background: var(--color-border); color: var(--color-primary); width: 40px; height: 40px; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <i data-lucide="home" style="width: 20px; height: 20px;"></i>
                </div>
            </div>`;
        }

        if (wedding.family_details) {
            topCardsHTML += `
            <div class="stat-card" style="flex: 2; min-width: 300px; padding: var(--space-5); display: flex; align-items: center; justify-content: space-between; background: var(--color-white); border: 1px solid var(--color-border); border-radius: var(--radius-lg);">
                <div>
                    <p style="color: var(--color-text-secondary); font-size: var(--font-size-sm); margin: 0; font-weight: var(--font-weight-medium);">Family Details</p>
                    <p style="color: var(--color-text-primary); font-size: var(--font-size-lg); font-weight: var(--font-weight-bold); margin: 4px 0 0 0; line-height: 1.4;">${formatWithNewlines(wedding.family_details)}</p>
                </div>
                <div style="background: var(--color-border); color: var(--color-primary); width: 40px; height: 40px; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <i data-lucide="users" style="width: 20px; height: 20px;"></i>
                </div>
            </div>`;
        }

        topRow.innerHTML = topCardsHTML;
        container.appendChild(topRow);
    }

    const bottomGrid = document.createElement("div");
    bottomGrid.style.cssText = "display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: var(--space-6);";

    let bottomCardsHTML = '';
    let hostRowsHTML = '';

    if (hosts && hosts.length > 0) {
        const sortedHosts = [...hosts].sort((a, b) => (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase()));
        hostRowsHTML = sortedHosts.map(host => {
            const cleanNum = host.phone ? host.phone.replace(/[^0-9+]/g, '') : '';
            return `
            <div style="display: flex; align-items: center; justify-content: space-between; margin-top: var(--space-3); padding-top: var(--space-3); border-top: 1px solid var(--color-border);">
                <span style="color: var(--color-text-primary); font-size: var(--font-size-lg); font-weight: var(--font-weight-bold);">${host.name} - ${host.phone}</span>
                <a href="tel:${cleanNum}" style="background: var(--color-border); color: var(--color-primary); width: 36px; height: 36px; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; text-decoration: none; flex-shrink: 0; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'" title="Call ${host.name}">
                    <i data-lucide="phone" style="width: 18px; height: 18px;"></i>
                </a>
            </div>`;
        }).join('');
    } else {
        hostRowsHTML = `<div style="margin-top: var(--space-3); padding-top: var(--space-3); color: var(--color-text-secondary); font-size: var(--font-size-sm);">No wedding hosts added yet.</div>`;
    }

    bottomCardsHTML += `
    <div class="stat-card" style="padding: var(--space-5); display: flex; flex-direction: column; justify-content: center; background: var(--color-white); border: 1px solid var(--color-border); border-radius: var(--radius-lg);">
        <p style="color: var(--color-text-secondary); font-size: var(--font-size-sm); margin: 0; font-weight: var(--font-weight-medium);">Wedding Host Details</p>
        ${hostRowsHTML}
    </div>`;

    if (canViewAll) {
        bottomCardsHTML += `
        <div class="stat-card" style="padding: var(--space-5); display: flex; align-items: center; justify-content: space-between; background: var(--color-white); border: 1px solid var(--color-border); border-radius: var(--radius-lg);">
            <div>
                <p style="color: var(--color-text-secondary); font-size: var(--font-size-sm); margin: 0; font-weight: var(--font-weight-medium);">Total Guests</p>
                <p style="color: var(--color-text-primary); font-size: var(--font-size-2xl); font-weight: var(--font-weight-bold); margin: 4px 0 0 0;">${guestsCount}</p>
            </div>
            <div style="background: var(--color-border); color: var(--color-primary); width: 40px; height: 40px; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                <i data-lucide="users" style="width: 20px; height: 20px;"></i>
            </div>
        </div>`;
    }

    bottomCardsHTML += `
    <div class="stat-card" style="padding: var(--space-5); display: flex; align-items: center; justify-content: space-between; background: var(--color-white); border: 1px solid var(--color-border); border-radius: var(--radius-lg);">
        <div>
            <p style="color: var(--color-text-secondary); font-size: var(--font-size-sm); margin: 0; font-weight: var(--font-weight-medium);">Total Events</p>
            <p style="color: var(--color-text-primary); font-size: var(--font-size-2xl); font-weight: var(--font-weight-bold); margin: 4px 0 0 0;">${eventsCount}</p>
        </div>
        <div style="background: var(--color-border); color: var(--color-primary); width: 40px; height: 40px; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <i data-lucide="calendar" style="width: 20px; height: 20px;"></i>
        </div>
    </div>`;

    bottomGrid.innerHTML = bottomCardsHTML;
    container.appendChild(bottomGrid);

    return container;
}

// ==========================================
// 3. EVENT ITINERARY SECTION
// ==========================================
function buildEventItinerarySection(wedding, events, canConfig) {
    const section = document.createElement("div");
    section.style.cssText = "background: var(--color-white); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-5); margin-bottom: var(--space-6);";

    const headerRow = document.createElement("div");
    headerRow.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-5); border-bottom: 1px solid var(--color-border); padding-bottom: var(--space-4); flex-wrap: wrap; gap: 12px;";

    let centerHTML = canConfig ? `
        <button id="add-event-main-btn" style="background: var(--color-primary); color: var(--color-text-on-accent); border: none; padding: 0.5rem 1.25rem; border-radius: var(--radius-sm); font-weight: var(--font-weight-semibold); cursor: pointer; font-size: var(--font-size-sm); display: flex; align-items: center;">
            <i data-lucide="plus" style="width:16px; height:16px; margin-right:4px;"></i> Event
        </button>
    ` : '';
    
    headerRow.innerHTML = `
        <div style="flex: 1 1 0; display: flex; justify-content: flex-start; min-width: 150px;"></div>
        <div style="flex: 1 1 0; display: flex; justify-content: center; min-width: 150px;">${centerHTML}</div>
        <div style="flex: 1 1 0; display: flex; justify-content: flex-end; min-width: 150px;"></div>
    `;
    section.appendChild(headerRow);

    const content = document.createElement("div");
    section.appendChild(content);

    const formatTime = (timeStr) => {
        if (!timeStr) return '';
        const d = new Date(timeStr);
        if (!isNaN(d)) {
            let h = d.getHours();
            const m = String(d.getMinutes()).padStart(2, '0');
            const ampm = h >= 12 ? 'PM' : 'AM';
            h = h % 12 || 12;
            return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
        } else {
            const timePart = timeStr.includes('T') ? timeStr.split('T')[1] : timeStr;
            const [hoursStr, minutesStr] = timePart.split(':');
            let h = parseInt(hoursStr, 10);
            const m = minutesStr || '00';
            const ampm = h >= 12 ? 'PM' : 'AM';
            h = h % 12 || 12;
            return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
        }
    };

    function renderEventsView() {
        if (!events || events.length === 0) {
            content.innerHTML = `<div style="text-align: center; padding: var(--space-6); color: var(--color-text-muted); border: 1px dashed var(--color-border); border-radius: var(--radius-sm);">No events scheduled yet.</div>`;
            return;
        }
        
        const sortedEvents = [...events].sort((a, b) => new Date(a.start_time || a.date).getTime() - new Date(b.start_time || b.date).getTime());
        const groupedEvents = sortedEvents.reduce((groups, ev) => {
            const dateObj = new Date(ev.date);
            const dateString = isNaN(dateObj) ? ev.date : dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
            if (!groups[dateString]) groups[dateString] = [];
            groups[dateString].push(ev);
            return groups;
        }, {});

        let htmlContent = `<div style="display: flex; flex-direction: column; position: relative; padding-left: 12px; margin-top: 12px;">`;
        htmlContent += `<div style="position: absolute; left: 16px; top: 12px; bottom: 20px; width: 2px; background: var(--color-border);"></div>`;
        
        Object.entries(groupedEvents).forEach(([dateLabel, dayEvents], groupIdx) => {
            htmlContent += `
                <div style="position: relative; margin-top: ${groupIdx === 0 ? '0' : '24px'}; margin-bottom: 16px; display: flex; align-items: center;">
                    <div style="position: absolute; left: -1.5px; width: 10px; height: 10px; border-radius: 50%; background: var(--color-primary); border: 2px solid var(--color-white); z-index: 2;"></div>
                    <h3 style="font-size: 1.05rem; font-weight: var(--font-weight-bold); color: var(--color-primary); margin: 0 0 0 24px;">
                        ${dateLabel}
                    </h3>
                </div>
            `;
            
            dayEvents.forEach(ev => {
                const editIcon = canConfig ? `<button class="edit-event-btn" data-event-id="${ev.id}" style="background:none; border:none; padding:4px; cursor:pointer; margin-left:auto; color: var(--color-text-muted);" onmouseover="this.style.color='var(--color-primary)'" onmouseout="this.style.color='var(--color-text-muted)'"><i data-lucide="edit-2" style="width: 14px; height: 14px; color: currentColor;"></i></button>` : '';
                
                htmlContent += `
                    <div class="timeline-event-card" style="position: relative; margin-left: 24px; padding: 16px; margin-bottom: 12px; background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-md); display: flex; flex-direction: column; gap: 8px;">
                        <div style="position: absolute; left: -24px; top: 22px; width: 8px; height: 8px; border-radius: 50%; background: var(--color-border); border: 2px solid var(--color-white); z-index: 2;"></div>
                        
                        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                            <h4 style="margin: 0; font-size: 1.05rem; font-weight: var(--font-weight-bold); color: var(--color-text-primary);">${ev.title}</h4>
                            ${editIcon}
                        </div>
                        
                        <div style="display: flex; gap: 16px; color: var(--color-text-secondary); font-size: var(--font-size-sm); flex-wrap: wrap;">
                            <div style="display: flex; align-items: center; gap: 6px;">
                                <i data-lucide="clock" style="width: 14px; height: 14px;"></i> ${formatTime(ev.start_time)}
                            </div>
                            <div style="display: flex; align-items: center; gap: 6px;">
                                <i data-lucide="map-pin" style="width: 14px; height: 14px;"></i> <span style="line-height: 1.4;">${ev.venue}</span>
                            </div>
                        </div>
                    </div>
                `;
            });
        });
        htmlContent += `</div>`;

        content.innerHTML = htmlContent;

        if (canConfig) {
            const editBtns = content.querySelectorAll('.edit-event-btn');
            editBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const eventId = btn.getAttribute('data-event-id');
                    const ev = events.find(e => e.id === eventId);
                    if(ev) window.openEditEventModal(wedding.id, wedding.start_date, wedding.end_date, ev);
                });
            });
        }

        if (window.lucide) window.lucide.createIcons();
    }

    setTimeout(() => {
        renderEventsView();
        if (canConfig) {
            const addEventMainBtn = document.getElementById('add-event-main-btn');
            if (addEventMainBtn) {
                addEventMainBtn.addEventListener('click', () => window.openEventModal(wedding.id, wedding.start_date, wedding.end_date));
            }
        }
    }, 0);

    return section;
}

// ==========================================
// 4. HOST SECTION LOGIC (DROPDOWN BASED)
// ==========================================
function buildHostListSection(wedding, hosts, canConfig, isCreator, curUserId) {
    const section = document.createElement("div");
    section.style.cssText = "background: var(--color-white); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-5); margin-bottom: var(--space-6);";

    const header = document.createElement("div");
    header.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-4); border-bottom: 1px solid var(--color-border); padding-bottom: var(--space-4); flex-wrap: wrap; gap: 12px;";
    
    let btnHTML = canConfig ? `
        <button onclick="openSystemUserModal('host')" style="background: var(--color-primary); color: var(--color-text-on-accent); border: none; padding: 0.5rem 1.5rem; border-radius: var(--radius-sm); font-weight: var(--font-weight-semibold); cursor: pointer; font-size: var(--font-size-sm); display: flex; align-items: center; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
            <i data-lucide="plus" style="width:16px; height:16px; margin-right:4px;"></i> Wedding Host
        </button>
    ` : '';

    header.innerHTML = `
        <div style="flex: 1 1 0; display: flex; justify-content: flex-start; min-width: 150px;"></div>
        <div style="flex: 1 1 0; display: flex; justify-content: center; min-width: 150px;">${btnHTML}</div>
        <div style="flex: 1 1 0; display: flex; justify-content: flex-end; min-width: 150px;"></div>
    `;
    section.appendChild(header);

    const content = document.createElement("div");

    if (!hosts || hosts.length === 0) {
        content.innerHTML = `<div style="text-align: center; padding: var(--space-6); color: var(--color-text-muted); border: 1px dashed var(--color-border); border-radius: var(--radius-sm);">No wedding hosts assigned yet.</div>`;
    } else {
        let listHTML = `
            <div style="display: grid; grid-template-columns: 32px 50px 1.5fr 1fr; align-items: center; padding: 0 var(--space-4) var(--space-2) var(--space-4); border-bottom: 1px solid var(--color-border); margin-bottom: var(--space-2); color: var(--color-text-secondary); font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold); gap: 12px;">
                <div></div> 
                <div>S.No</div>
                <div>Name</div>
                <div>Phone Number</div>
            </div>
        `;
        
        const sortedHosts = [...hosts].sort((a, b) => (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase()));
        
        sortedHosts.forEach((host, index) => {
            const hostJson = JSON.stringify(host).replace(/'/g, "&apos;").replace(/"/g, "&quot;");
            
            // Hosts cannot edit themselves unless they are a creator
            const canEditThisHost = canConfig && (isCreator || host.user_id !== curUserId);
            
            const actionBtn = canEditThisHost ? `
                <button onclick="openSystemUserModal('host', JSON.parse('${hostJson}'))" style="background: none; border: none; cursor: pointer; color: var(--color-text-muted); padding: 4px; display: flex; align-items: center; justify-content: center;" onmouseover="this.style.color='var(--color-primary)'" onmouseout="this.style.color='var(--color-text-muted)'" title="Edit">
                    <i data-lucide="edit-2" style="width: 16px; height: 16px;"></i>
                </button>
            ` : `<div></div>`;

            listHTML += `
            <div style="border: 1px solid var(--color-border); border-radius: var(--radius-sm); margin-bottom: var(--space-2); background: var(--color-bg); overflow: hidden;">
                <div style="display: grid; grid-template-columns: 32px 50px 1.5fr 1fr; align-items: center; padding: var(--space-3) var(--space-4); transition: background 0.2s ease; gap: 12px;" onmouseover="this.style.background='var(--color-border)';" onmouseout="this.style.background='transparent';">
                    ${actionBtn}
                    <div style="color: var(--color-text-secondary); font-size: var(--font-size-sm); font-weight: var(--font-weight-medium);">${index + 1}</div>
                    <div style="display: flex; align-items: center; overflow: hidden;">
                        <h4 style="margin: 0; font-size: 0.95rem; font-weight: var(--font-weight-medium); color: var(--color-text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${host.name}</h4>
                    </div>
                    <div style="display: flex; align-items: center; gap: 6px; color: var(--color-text-secondary); font-size: var(--font-size-sm); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        <i data-lucide="phone" style="width: 14px; height: 14px; flex-shrink: 0;"></i> ${host.phone}
                    </div>
                </div>
            </div>`;
        });
        content.innerHTML = listHTML;
    }
    section.appendChild(content);

    return section;
}

// ==========================================
// 5. WEDDING USERS SECTION (DROPDOWN BASED)
// ==========================================
function buildWeddingUserListSection(wedding, wUsers, canConfig) {
    const section = document.createElement("div");
    section.style.cssText = "background: var(--color-white); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-5); margin-bottom: var(--space-6);";

    const header = document.createElement("div");
    header.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-4); border-bottom: 1px solid var(--color-border); padding-bottom: var(--space-4); flex-wrap: wrap; gap: 12px;";
    
    let btnHTML = canConfig ? `
        <button onclick="openSystemUserModal('wedding_user')" style="background: var(--color-primary); color: var(--color-text-on-accent); border: none; padding: 0.5rem 1.5rem; border-radius: var(--radius-sm); font-weight: var(--font-weight-semibold); cursor: pointer; font-size: var(--font-size-sm); display: flex; align-items: center; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
            <i data-lucide="plus" style="width:16px; height:16px; margin-right:4px;"></i> Wedding User
        </button>
    ` : '';

    header.innerHTML = `
        <div style="flex: 1 1 0; display: flex; justify-content: flex-start; min-width: 150px;"></div>
        <div style="flex: 1 1 0; display: flex; justify-content: center; min-width: 150px;">${btnHTML}</div>
        <div style="flex: 1 1 0; display: flex; justify-content: flex-end; min-width: 150px;"></div>
    `;
    section.appendChild(header);

    const content = document.createElement("div");

    if (!wUsers || wUsers.length === 0) {
        content.innerHTML = `<div style="text-align: center; padding: var(--space-6); color: var(--color-text-muted); border: 1px dashed var(--color-border); border-radius: var(--radius-sm);">No wedding users assigned yet.</div>`;
    } else {
        let listHTML = `
            <div style="display: grid; grid-template-columns: 32px 50px 1.5fr 1fr; align-items: center; padding: 0 var(--space-4) var(--space-2) var(--space-4); border-bottom: 1px solid var(--color-border); margin-bottom: var(--space-2); color: var(--color-text-secondary); font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold); gap: 12px;">
                <div></div> 
                <div>S.No</div>
                <div>Name</div>
                <div>Phone Number</div>
            </div>
        `;
        
        const sortedUsers = [...wUsers].sort((a, b) => (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase()));
        
        sortedUsers.forEach((u, index) => {
            const uJson = JSON.stringify(u).replace(/'/g, "&apos;").replace(/"/g, "&quot;");
            const actionBtn = canConfig ? `
                <button onclick="openSystemUserModal('wedding_user', JSON.parse('${uJson}'))" style="background: none; border: none; cursor: pointer; color: var(--color-text-muted); padding: 4px; display: flex; align-items: center; justify-content: center;" onmouseover="this.style.color='var(--color-primary)'" onmouseout="this.style.color='var(--color-text-muted)'" title="Edit">
                    <i data-lucide="edit-2" style="width: 16px; height: 16px;"></i>
                </button>
            ` : `<div></div>`;

            listHTML += `
            <div style="border: 1px solid var(--color-border); border-radius: var(--radius-sm); margin-bottom: var(--space-2); background: var(--color-bg); overflow: hidden;">
                <div style="display: grid; grid-template-columns: 32px 50px 1.5fr 1fr; align-items: center; padding: var(--space-3) var(--space-4); transition: background 0.2s ease; gap: 12px;" onmouseover="this.style.background='var(--color-border)';" onmouseout="this.style.background='transparent';">
                    ${actionBtn}
                    <div style="color: var(--color-text-secondary); font-size: var(--font-size-sm); font-weight: var(--font-weight-medium);">${index + 1}</div>
                    <div style="display: flex; align-items: center; overflow: hidden;">
                        <h4 style="margin: 0; font-size: 0.95rem; font-weight: var(--font-weight-medium); color: var(--color-text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${u.name}</h4>
                    </div>
                    <div style="display: flex; align-items: center; gap: 6px; color: var(--color-text-secondary); font-size: var(--font-size-sm); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        <i data-lucide="phone" style="width: 14px; height: 14px; flex-shrink: 0;"></i> ${u.phone}
                    </div>
                </div>
            </div>`;
        });
        content.innerHTML = listHTML;
    }
    section.appendChild(content);

    return section;
}

// Global System Modal for Hosts & Wedding Users
window.openSystemUserModal = async function(type, existingRecord = null) {
    const ctx = window.__weddingContext;
    if (!ctx || !ctx.canConfig) return;

    const isHost = type === 'host';
    const tableName = isHost ? 'wedding_hosts' : 'wedding_users';
    const titleType = isHost ? 'Wedding Host' : 'Wedding User';

    // Build eligible users list: Exclude assigned users and exclude creators
    let eligibleUsers = ctx.allSysUsers.filter(u => !ctx.assignedIds.has(u.id) && u.role !== 'creator');
    
    // If editing, push the current user back into the options so it displays
    if (existingRecord) {
        const currentSysUser = ctx.allSysUsers.find(u => u.id === existingRecord.user_id);
        if (currentSysUser && !eligibleUsers.some(u => u.id === currentSysUser.id)) {
            eligibleUsers.push(currentSysUser);
        }
    }

    let optionsHtml = eligibleUsers.map(u => 
        `<option value="${u.id}" ${existingRecord && existingRecord.user_id === u.id ? 'selected' : ''}>${u.name} - ${u.phone}</option>`
    ).join('');

    if (!optionsHtml) {
        optionsHtml = `<option value="" disabled>No eligible users available</option>`;
    }

    const formHTML = `
        <form id="sysUserForm" novalidate style="display:flex; flex-direction:column; gap:var(--space-3);">
            <div>
                <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:4px;">Select ${titleType} *</label>
                <select id="sysUserId" required style="width:100%; background:var(--color-bg); border:1px solid var(--color-border); color:var(--color-text-primary); padding:var(--space-2); border-radius:var(--radius-sm); outline:none; transition: border-color 0.2s;">
                    ${existingRecord ? '' : `<option value="" disabled selected>-- Select --</option>`}
                    ${optionsHtml}
                </select>
            </div>
        </form>
    `;

    const actions = [
        { label: "Cancel", variant: "ghost" },
        { 
            label: existingRecord ? "Update" : "Add", 
            variant: "primary", 
            closesModal: false,
            onClick: async () => {
                const selectEl = document.getElementById('sysUserId');
                const selectedUserId = selectEl.value;

                if (!selectedUserId) {
                    selectEl.style.borderColor = "red";
                    showAlert({ icon: 'warning', title: 'Missing Selection', text: `Please select a ${titleType.toLowerCase()}.` });
                    return;
                }

                try {
                    const payload = { wedding_id: ctx.weddingId, user_id: selectedUserId };

                    if (existingRecord) {
                        const { error } = await supabase.from(tableName).update(payload).eq('id', existingRecord.id);
                        if (error) throw error;
                    } else {
                        const { error } = await supabase.from(tableName).insert([payload]);
                        if (error) throw error;
                    }

                    modal.close();
                    window.dispatchEvent(new Event('weddingDataUpdated')); 
                    showAlert({ icon: 'success', title: existingRecord ? 'Updated!' : 'Added!', text: `${titleType} saved successfully.`, timer: 2000 });
                } catch (error) {
                    showAlert({ icon: 'error', title: 'Database Error', text: error.message });
                }
            }
        }
    ];

    if (existingRecord) {
        actions.unshift({
            label: "Delete",
            variant: "danger", 
            closesModal: false,
            onClick: async () => {
                const result = await Swal.fire({
                    title: 'Are you sure?',
                    text: `Do you really want to remove this ${titleType.toLowerCase()}?`,
                    icon: 'question', 
                    showCancelButton: true,
                    confirmButtonColor: '#dc2626',
                    cancelButtonColor: '#6b7280',
                    confirmButtonText: 'Yes, remove them!'
                });

                if (result.isConfirmed) {
                    try {
                        const { error } = await supabase.from(tableName).delete().eq('id', existingRecord.id);
                        if (error) throw error;
                        
                        modal.close();
                        window.dispatchEvent(new Event('weddingDataUpdated')); 
                        showAlert({ icon: 'success', title: 'Removed!', text: `${titleType} has been removed.`, timer: 2000 });
                    } catch (error) {
                        showAlert({ icon: 'error', title: 'Database Error', text: error.message });
                    }
                }
            }
        });
    }

    const modal = openModal({
        title: existingRecord ? `Edit ${titleType}` : `Add New ${titleType}`,
        content: formHTML,
        actions: actions
    });

    setTimeout(() => forceStyleModalButtons(), 50);
};

// ==========================================
// 6. GUEST LIST SECTION (Physical Guests)
// ==========================================
function buildGuestListSection(wedding, guests, events, canConfig) {
    window.__currentEvents = events || [];

    const section = document.createElement("div");
    section.style.cssText = "background: var(--color-white); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-5); margin-bottom: var(--space-6);";

    let currentPage = 1;
    const guestsPerPage = 10; 
    let searchQuery = '';

    const controlsRow = document.createElement("div");
    controlsRow.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-5); border-bottom: 1px solid var(--color-border); padding-bottom: var(--space-4); flex-wrap: wrap; gap: 12px;";
    
    let leftActions = canConfig ? `
        <button onclick="downloadSampleExcel()" style="background: var(--color-primary); color: var(--color-text-on-accent); border: none; padding: 0.5rem 1rem; border-radius: var(--radius-sm); cursor: pointer; font-size: var(--font-size-sm); display: flex; align-items: center; font-weight: var(--font-weight-medium); transition: opacity 0.2s;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
            <i data-lucide="download" style="width:16px; height:16px; margin-right:4px;"></i> Sample
        </button>
        <button onclick="triggerCSVImport('${wedding.id}')" style="background: var(--color-primary); color: var(--color-text-on-accent); border: none; padding: 0.5rem 1rem; border-radius: var(--radius-sm); cursor: pointer; font-size: var(--font-size-sm); display: flex; align-items: center; font-weight: var(--font-weight-medium); transition: opacity 0.2s;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
            <i data-lucide="upload" style="width:16px; height:16px; margin-right:4px;"></i> Import
        </button>
    ` : `<div></div>`;

    let centerAction = canConfig ? `
        <button id="addGuestBtnTrigger" style="background: var(--color-primary); color: var(--color-text-on-accent); border: none; padding: 0.5rem 1.5rem; border-radius: var(--radius-sm); font-weight: var(--font-weight-semibold); cursor: pointer; font-size: var(--font-size-sm); display: flex; align-items: center; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
            <i data-lucide="plus" style="width:16px; height:16px; margin-right:4px;"></i> Guest
        </button>
    ` : `<div></div>`;

    controlsRow.innerHTML = `
        <div style="flex: 1 1 0; display: flex; gap: 8px; min-width: 200px;">${leftActions}</div>
        <div style="flex: 1 1 0; display: flex; justify-content: center; min-width: 150px;">${centerAction}</div>
        <div style="flex: 1 1 0; display: flex; justify-content: flex-end; min-width: 200px;">
            <div style="position: relative; display: flex; align-items: center; width: 100%; max-width: 300px;">
                <i data-lucide="search" style="position: absolute; left: 10px; width: 16px; height: 16px; color: var(--color-text-muted);"></i>
                <input type="text" id="guestSearchInput" placeholder="Search by name or phone..." style="width: 100%; padding: 0.5rem 0.5rem 0.5rem 32px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); font-size: var(--font-size-sm); background: var(--color-bg); color: var(--color-text-primary); outline: none; transition: border-color 0.2s;">
            </div>
        </div>
    `;
    section.appendChild(controlsRow);

    const content = document.createElement("div");
    section.appendChild(content);

    function renderGuests() {
        const filteredGuests = (guests || []).filter(g => {
            const query = searchQuery.toLowerCase();
            const nameMatch = (g.name || '').toLowerCase().includes(query);
            const phoneMatch = (g.phone || '').toLowerCase().includes(query);
            return nameMatch || phoneMatch;
        });

        const sortedGuests = filteredGuests.sort((a, b) => (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase()));

        const totalPages = Math.ceil(sortedGuests.length / guestsPerPage) || 1;
        if (currentPage > totalPages) currentPage = totalPages;

        const startIndex = (currentPage - 1) * guestsPerPage;
        const paginatedGuests = sortedGuests.slice(startIndex, startIndex + guestsPerPage);

        if (!guests || guests.length === 0) {
            content.innerHTML = `<div style="text-align: center; padding: var(--space-6); color: var(--color-text-muted); border: 1px dashed var(--color-border); border-radius: var(--radius-sm);">No guests added yet.</div>`;
            if (window.lucide) window.lucide.createIcons();
            return;
        }

        if (paginatedGuests.length === 0) {
            content.innerHTML = `<div style="text-align: center; padding: var(--space-6); color: var(--color-text-muted); border: 1px dashed var(--color-border); border-radius: var(--radius-sm);">No guests match your search.</div>`;
            if (window.lucide) window.lucide.createIcons();
            return;
        }

        const gridTemplate = canConfig ? "32px 32px 50px 1.5fr 1fr 1fr 60px" : "32px 50px 1.5fr 1fr 1fr 60px"; 

        let listHTML = `
            <div style="display: grid; grid-template-columns: ${gridTemplate}; align-items: center; padding: 0 var(--space-4) var(--space-2) var(--space-4); border-bottom: 1px solid var(--color-border); margin-bottom: var(--space-2); color: var(--color-text-secondary); font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold); gap: 12px;">
                <div></div> 
                ${canConfig ? '<div></div>' : ''}
                <div>S.No</div>
                <div>Name</div>
                <div>Phone Number</div>
                <div>Events Count</div>
                <div style="text-align: center;">WhatsApp</div>
            </div>
        `;

        listHTML += paginatedGuests.map((guest, index) => {
            const globalIndex = startIndex + index + 1;
            const guestEvents = events ? events.filter(e => guest.invited_events?.includes(e.id)) : [];
            const eventsTags = guestEvents.length > 0 
                ? guestEvents.map(e => `<span style="background: var(--color-border); padding: 4px 10px; border-radius: 16px; font-size: 0.75rem; color: var(--color-text-primary); font-weight: var(--font-weight-medium); display: inline-flex; align-items: center; gap: 4px;"><i data-lucide="calendar" style="width:12px; height:12px;"></i> ${e.title}</span>`).join('')
                : `<span style="color: var(--color-text-muted); font-size: 0.8rem; font-style: italic;">No events assigned</span>`;

            const cleanPhone = guest.phone ? guest.phone.replace(/[^0-9+]/g, '') : '';
            const hasInvitedEvents = guest.invited_events && guest.invited_events.length > 0;
            
            let waCellContent = '';
            
            if (guest.phone && hasInvitedEvents) {
                const displayNames = wedding.primary_side === 'groom' ? `${wedding.groom_name} & ${wedding.bride_name}` : `${wedding.bride_name} & ${wedding.groom_name}`;
                const weddingUrl = `https://shaadi-saathi.pages.dev/#wedding-details?id=${wedding.id}`;
                const sortedGuestEvents = [...guestEvents].sort((a, b) => new Date(a.start_time || a.date).getTime() - new Date(b.start_time || b.date).getTime());
                const eventsListText = sortedGuestEvents.map(ev => {
                    const evDate = new Date(ev.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    return `• ${ev.title} (${evDate})`;
                }).join('\n');

                const waMessage = `Jai Jinendra,\n\n*${(guest.name || '').toUpperCase()}*,\n\n*${(wedding.family_name || '').toUpperCase()}* Family has sent you an invitation for the wedding of *${displayNames}* on *_Shaadi Saathi_*.\n\nYou are cordially invited to the following events:\n${eventsListText}\n\nClick the link below to view the complete invitation and event details:\n${weddingUrl}\n\nAwaiting your gracious presence.\n\nRegards,\n*${wedding.family_details || ''}*\n\n*_Shaadi Saathi_*`;
                const encodedMessage = encodeURIComponent(waMessage);

                waCellContent = `
                    <a href="https://wa.me/${cleanPhone}?text=${encodedMessage}" target="_blank" onclick="event.stopPropagation();" style="display:flex; align-items:center; justify-content:center; width:28px; height:28px; background:#25D366; color:white; border-radius:50%; text-decoration:none; transition:opacity 0.2s; margin: 0 auto;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'" title="WhatsApp">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                    </a>
                `;
            } else if (!guest.phone) {
                waCellContent = `<div style="text-align: center; color: var(--color-danger); font-size: 0.65rem; font-weight: var(--font-weight-medium); line-height: 1.2;">No Phone<br>Number</div>`;
            } else {
                waCellContent = `<div style="text-align: center; color: var(--color-danger); font-size: 0.65rem; font-weight: var(--font-weight-medium); line-height: 1.2;">No Events<br>Invited</div>`;
            }

            const editCol = canConfig ? `
                <button class="edit-guest-btn" data-guest-id="${guest.id}" style="background: none; border: none; cursor: pointer; color: var(--color-text-muted); padding: 4px; display: flex; align-items: center; justify-content: center;" onmouseover="this.style.color='var(--color-primary)'" onmouseout="this.style.color='var(--color-text-muted)'">
                    <i data-lucide="edit-2" style="width: 16px; height: 16px;"></i>
                </button>
            ` : '';
                
            return `
            <div style="border: 1px solid var(--color-border); border-radius: var(--radius-sm); margin-bottom: var(--space-2); background: var(--color-bg); overflow: hidden;">
                <div style="display: grid; grid-template-columns: ${gridTemplate}; align-items: center; padding: var(--space-3) var(--space-4); transition: background 0.2s ease; gap: 12px;" onmouseover="this.style.background='var(--color-border)';" onmouseout="this.style.background='transparent';">
                    
                    <button class="toggle-events-btn" data-target="child-${guest.id}" style="background: none; border: none; cursor: pointer; color: var(--color-text-muted); padding: 4px; display: flex; align-items: center; justify-content: center;" onmouseover="this.style.color='var(--color-primary)'" onmouseout="this.style.color='var(--color-text-muted)'">
                        <i data-lucide="chevron-right" style="width: 18px; height: 18px; transition: transform 0.2s;"></i>
                    </button>

                    ${editCol}

                    <div style="color: var(--color-text-secondary); font-size: var(--font-size-sm); font-weight: var(--font-weight-medium);">${globalIndex}</div>
                    
                    <div style="display: flex; align-items: center; overflow: hidden;">
                        <h4 style="margin: 0; font-size: 0.95rem; font-weight: var(--font-weight-medium); color: var(--color-text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${guest.name}</h4>
                    </div>
                    
                    <div style="display: flex; align-items: center; gap: 6px; color: var(--color-text-secondary); font-size: var(--font-size-sm); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        <i data-lucide="phone" style="width: 14px; height: 14px; flex-shrink: 0;"></i> ${guest.phone}
                    </div>
                    
                    <div style="display: flex; align-items: center; gap: 6px; color: var(--color-text-secondary); font-size: var(--font-size-sm);">
                        ${guest.invited_events?.length || 0} Invited
                    </div>

                    <div>${waCellContent}</div>
                </div>

                <div id="child-${guest.id}" style="display: none; padding: var(--space-4) var(--space-4) var(--space-4) ${canConfig ? '74px' : '42px'}; background: var(--color-white); border-top: 1px dashed var(--color-border);">
                    <div style="font-size: 0.75rem; color: var(--color-text-secondary); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: var(--font-weight-semibold);">Events Invited To:</div>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                        ${eventsTags}
                    </div>
                </div>
            </div>`;
        }).join('');

        listHTML += `
            <div style="display: flex; justify-content: space-between; align-items: center; padding-top: var(--space-4); margin-top: var(--space-4); border-top: 1px solid var(--color-border);">
                <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">
                    Showing ${startIndex + 1} to ${Math.min(startIndex + guestsPerPage, sortedGuests.length)} of ${sortedGuests.length} guests
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
            if (canConfig) {
                const editBtns = content.querySelectorAll('.edit-guest-btn');
                editBtns.forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const guestId = btn.getAttribute('data-guest-id');
                        const guestData = guests.find(g => g.id === guestId);
                        if(guestData) window.openEditGuestModal(wedding.id, guestData, events);
                    });
                });
            }

            const toggleBtns = content.querySelectorAll('.toggle-events-btn');
            toggleBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const targetId = btn.getAttribute('data-target');
                    const childRow = document.getElementById(targetId);
                    const icon = btn.querySelector('i');
                    
                    if (childRow.style.display === 'none') {
                        childRow.style.display = 'block';
                        icon.style.transform = 'rotate(90deg)';
                    } else {
                        childRow.style.display = 'none';
                        icon.style.transform = 'rotate(0deg)';
                    }
                });
            });

            const pageBtns = content.querySelectorAll('.pagination-btn');
            pageBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    if (btn.hasAttribute('disabled')) return;
                    currentPage = parseInt(btn.getAttribute('data-page'));
                    renderGuests();
                });
            });

            if (window.lucide) window.lucide.createIcons();
        }, 0);
    }
    
    setTimeout(() => {
        renderGuests();
        const searchInput = document.getElementById('guestSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                searchQuery = e.target.value;
                currentPage = 1; 
                renderGuests();
            });
        }
        if (canConfig) {
            const trigger = document.getElementById('addGuestBtnTrigger');
            if(trigger) trigger.addEventListener('click', () => window.openGuestModal(wedding.id, events));
        }
    }, 0);

    return section;
}

// ==========================================
// GLOBALS: UTILITIES, MODALS, & IMPORT/EXPORT
// ==========================================

function generateInviteCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

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

window.openEventModal = function(weddingId, minDate, maxDate) {
    const formHTML = `
        <form id="createEventForm" novalidate style="display:flex; flex-direction:column; gap:var(--space-3);">
            <div>
                <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:4px;">Event Name *</label>
                <input type="text" id="eventName" required style="width:100%; background:var(--color-bg); border:1px solid var(--color-border); color:var(--color-text-primary); padding:var(--space-2); border-radius:var(--radius-sm); outline:none; transition: border-color 0.2s;">
            </div>
            
            <div style="display: flex; gap: var(--space-3);">
                <div style="flex: 1;">
                    <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:4px;">Date *</label>
                    <input type="date" id="eventDate" min="${minDate}" max="${maxDate}" 
                        onclick="try{this.showPicker()}catch(e){}" 
                        onkeydown="if(event.key !== 'Tab' && event.key !== 'Shift') event.preventDefault();" 
                        onpaste="return false;" 
                        required style="width:100%; background:var(--color-bg); border:1px solid var(--color-border); color:var(--color-text-primary); padding:var(--space-2); border-radius:var(--radius-sm); cursor:pointer; outline:none; transition: border-color 0.2s;">
                </div>
                <div style="flex: 1;">
                    <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:4px;">Time *</label>
                    <input type="time" id="eventTime" onclick="try{this.showPicker()}catch(e){}" required style="width:100%; background:var(--color-bg); border:1px solid var(--color-border); color:var(--color-text-primary); padding:var(--space-2); border-radius:var(--radius-sm); cursor:pointer; outline:none; transition: border-color 0.2s;">
                </div>
            </div>

            <div>
                <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:4px;">Venue *</label>
                <input type="text" id="eventVenue" required placeholder="e.g., The Grand Hotel" style="width:100%; background:var(--color-bg); border:1px solid var(--color-border); color:var(--color-text-primary); padding:var(--space-2); border-radius:var(--radius-sm); outline:none; transition: border-color 0.2s;">
            </div>
        </form>
    `;

    const modal = openModal({
        title: "Add New Event",
        content: formHTML,
        actions: [
            { label: "Cancel", variant: "ghost" },
            { 
                label: "Add", 
                variant: "primary", 
                closesModal: false,
                onClick: async () => {
                    const requiredFields = [
                        { id: 'eventName', name: "Event Name" },
                        { id: 'eventDate', name: "Date" },
                        { id: 'eventTime', name: "Time" },
                        { id: 'eventVenue', name: "Venue" }
                    ];

                    let isValid = true;
                    let firstEmpty = null;

                    requiredFields.forEach(field => {
                        const el = document.getElementById(field.id);
                        if (!el.value.trim()) { 
                            el.style.borderColor = "red"; 
                            isValid = false; 
                            if(!firstEmpty) firstEmpty = field.name; 
                        } else { 
                            el.style.borderColor = "green"; 
                        }
                    });

                    const selectedDate = document.getElementById('eventDate').value;
                    const selectedTime = document.getElementById('eventTime').value;

                    if (selectedDate && (selectedDate < minDate || selectedDate > maxDate)) {
                        isValid = false;
                        document.getElementById('eventDate').style.borderColor = "red";
                        showAlert({ icon: 'error', title: 'Invalid Date', text: `Event date must be between ${minDate} and ${maxDate}.` });
                        return;
                    }

                    if (!isValid) {
                        showAlert({ icon: 'warning', title: 'Missing Information', text: `Please fill out: ${firstEmpty}` });
                        return;
                    }

                    const timezoneOffset = new Date().getTimezoneOffset();
                    const sign = timezoneOffset > 0 ? '-' : '+';
                    const absOffset = Math.abs(timezoneOffset);
                    const offsetHours = String(Math.floor(absOffset / 60)).padStart(2, '0');
                    const offsetMinutes = String(absOffset % 60).padStart(2, '0');
                    const formattedOffset = `${sign}${offsetHours}:${offsetMinutes}`;

                    const fullStartTimestamp = `${selectedDate}T${selectedTime}:00${formattedOffset}`;

                    try {
                        const { error } = await supabase.from('events').insert([{ 
                            wedding_id: weddingId,
                            title: document.getElementById('eventName').value.trim(),
                            date: selectedDate,
                            start_time: fullStartTimestamp,
                            venue: document.getElementById('eventVenue').value.trim()
                        }]);
                        if (error) throw error;
                        
                        modal.close();
                        window.dispatchEvent(new Event('weddingDataUpdated')); 
                        showAlert({ icon: 'success', title: 'Added!', text: 'Event saved successfully.', timer: 2000 });
                    } catch (error) {
                        showAlert({ icon: 'error', title: 'Database Error', text: error.message });
                    }
                }
            }
        ]
    });

    setTimeout(() => {
        forceStyleModalButtons();
        ['eventName', 'eventDate', 'eventTime', 'eventVenue'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.style.borderColor = el.value.trim() === '' ? 'red' : 'green';
                el.addEventListener('input', () => {
                    el.style.borderColor = el.value.trim() === '' ? 'red' : 'green';
                });
            }
        });
    }, 50);
};

window.openEditEventModal = function(weddingId, minDate, maxDate, ev) {
    let timeValue = '';
    if (ev.start_time) {
        const d = new Date(ev.start_time);
        if (!isNaN(d)) {
            const hours = String(d.getHours()).padStart(2, '0');
            const minutes = String(d.getMinutes()).padStart(2, '0');
            timeValue = `${hours}:${minutes}`;
        } else {
            const timePart = ev.start_time.includes('T') ? ev.start_time.split('T')[1] : ev.start_time;
            const [hours, minutes] = timePart.split(':');
            timeValue = `${hours}:${minutes}`;
        }
    }

    const formHTML = `
        <form id="editEventForm" novalidate style="display:flex; flex-direction:column; gap:var(--space-3);">
            <div>
                <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:4px;">Event Name *</label>
                <input type="text" id="editEventName" value="${ev.title.replace(/"/g, '&quot;')}" required style="width:100%; background:var(--color-bg); border:1px solid var(--color-border); color:var(--color-text-primary); padding:var(--space-2); border-radius:var(--radius-sm); outline:none; transition: border-color 0.2s;">
            </div>
            
            <div style="display: flex; gap: var(--space-3);">
                <div style="flex: 1;">
                    <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:4px;">Date *</label>
                    <input type="date" id="editEventDate" value="${ev.date}" min="${minDate}" max="${maxDate}" 
                        onclick="try{this.showPicker()}catch(e){}" 
                        onkeydown="if(event.key !== 'Tab' && event.key !== 'Shift') event.preventDefault();" 
                        onpaste="return false;" 
                        required style="width:100%; background:var(--color-bg); border:1px solid var(--color-border); color:var(--color-text-primary); padding:var(--space-2); border-radius:var(--radius-sm); cursor:pointer; outline:none; transition: border-color 0.2s;">
                </div>
                <div style="flex: 1;">
                    <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:4px;">Time *</label>
                    <input type="time" id="editEventTime" value="${timeValue}" onclick="try{this.showPicker()}catch(e){}" required style="width:100%; background:var(--color-bg); border:1px solid var(--color-border); color:var(--color-text-primary); padding:var(--space-2); border-radius:var(--radius-sm); cursor:pointer; outline:none; transition: border-color 0.2s;">
                </div>
            </div>

            <div>
                <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:4px;">Venue *</label>
                <input type="text" id="editEventVenue" value="${ev.venue.replace(/"/g, '&quot;')}" required placeholder="e.g., The Grand Hotel" style="width:100%; background:var(--color-bg); border:1px solid var(--color-border); color:var(--color-text-primary); padding:var(--space-2); border-radius:var(--radius-sm); outline:none; transition: border-color 0.2s;">
            </div>
        </form>
    `;

    const modal = openModal({
        title: "Edit Event",
        content: formHTML,
        actions: [            
            {
                label: "Delete",
                variant: "danger", 
                closesModal: false,
                onClick: async () => {
                    const result = await Swal.fire({
                        title: 'Are you sure?',
                        text: "Do you really want to delete this event? This action cannot be undone.",
                        icon: 'question', 
                        showCancelButton: true,
                        confirmButtonColor: '#dc2626',
                        cancelButtonColor: '#6b7280',
                        confirmButtonText: 'Yes, delete it!'
                    });

                    if (result.isConfirmed) {
                        try {
                            const { error } = await supabase.from('events').delete().eq('id', ev.id);
                            if (error) throw error;
                            
                            modal.close();
                            window.dispatchEvent(new Event('weddingDataUpdated')); 
                            showAlert({ icon: 'success', title: 'Deleted!', text: 'Event has been removed.', timer: 2000 });
                        } catch (error) {
                            showAlert({ icon: 'error', title: 'Database Error', text: error.message });
                        }
                    }
                }
            },
            { label: "Cancel", variant: "ghost" },
            { 
                label: "Edit", 
                variant: "primary", 
                closesModal: false,
                onClick: async () => {
                    const requiredFields = [
                        { id: 'editEventName', name: "Event Name" },
                        { id: 'editEventDate', name: "Date" },
                        { id: 'editEventTime', name: "Time" },
                        { id: 'editEventVenue', name: "Venue" }
                    ];

                    let isValid = true;
                    let firstEmpty = null;

                    requiredFields.forEach(field => {
                        const el = document.getElementById(field.id);
                        if (!el.value.trim()) { 
                            el.style.borderColor = "red"; 
                            isValid = false; 
                            if(!firstEmpty) firstEmpty = field.name; 
                        } else { 
                            el.style.borderColor = "green"; 
                        }
                    });

                    const selectedDate = document.getElementById('editEventDate').value;
                    const selectedTime = document.getElementById('editEventTime').value;

                    if (selectedDate && (selectedDate < minDate || selectedDate > maxDate)) {
                        isValid = false;
                        document.getElementById('editEventDate').style.borderColor = "red";
                        showAlert({ icon: 'error', title: 'Invalid Date', text: `Event date must be between ${minDate} and ${maxDate}.` });
                        return;
                    }

                    if (!isValid) {
                        showAlert({ icon: 'warning', title: 'Missing Information', text: `Please fill out: ${firstEmpty}` });
                        return;
                    }

                    const timezoneOffset = new Date().getTimezoneOffset();
                    const sign = timezoneOffset > 0 ? '-' : '+';
                    const absOffset = Math.abs(timezoneOffset);
                    const offsetHours = String(Math.floor(absOffset / 60)).padStart(2, '0');
                    const offsetMinutes = String(absOffset % 60).padStart(2, '0');
                    const formattedOffset = `${sign}${offsetHours}:${offsetMinutes}`;

                    const fullStartTimestamp = `${selectedDate}T${selectedTime}:00${formattedOffset}`;

                    try {
                        const { error } = await supabase.from('events').update({ 
                            title: document.getElementById('editEventName').value.trim(),
                            date: selectedDate,
                            start_time: fullStartTimestamp,
                            venue: document.getElementById('editEventVenue').value.trim()
                        }).eq('id', ev.id);
                        
                        if (error) throw error;
                        
                        modal.close();
                        window.dispatchEvent(new Event('weddingDataUpdated')); 
                        showAlert({ icon: 'success', title: 'Updated!', text: 'Event details updated successfully.', timer: 2000 });
                    } catch (error) {
                        showAlert({ icon: 'error', title: 'Database Error', text: error.message });
                    }
                }
            }
        ]
    });

    setTimeout(() => {
        forceStyleModalButtons();
        ['editEventName', 'editEventDate', 'editEventTime', 'editEventVenue'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.style.borderColor = el.value.trim() === '' ? 'red' : 'green';
                el.addEventListener('input', () => {
                    el.style.borderColor = el.value.trim() === '' ? 'red' : 'green';
                });
            }
        });
    }, 50);
};

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

window.openGuestModal = function(weddingId, events = []) {
    const sortedModalEvents = [...events].sort((a, b) => new Date(a.start_time || a.date).getTime() - new Date(b.start_time || b.date).getTime());
    
    const eventCheckboxes = sortedModalEvents.length > 0 ? sortedModalEvents.map(ev => `
        <label style="display: flex; align-items: center; gap: 8px; font-size: var(--font-size-sm); color: var(--color-text-primary); cursor: pointer;">
            <input type="checkbox" name="guest_events" value="${ev.id}" style="accent-color: var(--color-primary); cursor: pointer;">
            ${ev.title} (${new Date(ev.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})
        </label>
    `).join('') : `<div style="color: var(--color-text-muted); font-size: var(--font-size-xs);">No events available yet.</div>`;

    const formHTML = `
        <form id="createGuestForm" novalidate style="display:flex; flex-direction:column; gap:var(--space-3);">
            <div>
                <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:4px;">Guest Name *</label>
                <input type="text" id="guestName" required style="width:100%; background:var(--color-bg); border:1px solid var(--color-border); color:var(--color-text-primary); padding:var(--space-2); border-radius:var(--radius-sm); outline:none; transition: border-color 0.2s;">
            </div>
            <div>
                <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:4px;">Phone Number *</label>
                <input type="text" id="guestPhone" required style="width:100%; background:var(--color-bg); border:1px solid var(--color-border); color:var(--color-text-primary); padding:var(--space-2); border-radius:var(--radius-sm); outline:none; transition: border-color 0.2s;">
            </div>
            <div style="margin-top: var(--space-2);">
                <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:8px;">Invite to Events</label>
                <div style="display: flex; flex-direction: column; gap: 8px; max-height: 150px; overflow-y: auto; border: 1px solid var(--color-border); padding: var(--space-3); border-radius: var(--radius-sm); background: var(--color-bg);">
                    ${eventCheckboxes}
                </div>
            </div>
        </form>
    `;

    const modal = openModal({
        title: "Add New Guest",
        content: formHTML,
        actions: [
            { label: "Cancel", variant: "ghost" },
            { 
                label: "Add", 
                variant: "primary", 
                closesModal: false,
                onClick: async () => {
                    const requiredFields = [
                        { id: 'guestName', name: "Guest Name" },
                        { id: 'guestPhone', name: "Phone Number" }
                    ];

                    let isValid = true; 
                    let firstEmpty = null;

                    requiredFields.forEach(field => {
                        const el = document.getElementById(field.id);
                        if (!el.value.trim()) { 
                            el.style.borderColor = "red"; 
                            isValid = false; 
                            if(!firstEmpty) firstEmpty = field.name; 
                        } else { 
                            el.style.borderColor = "green"; 
                        }
                    });

                    if (!isValid) {
                        showAlert({ icon: 'warning', title: 'Missing Information', text: `Please fill out: ${firstEmpty}` });
                        return;
                    }

                    const phoneInput = document.getElementById('guestPhone').value.trim();
                    const cleanedPhone = phoneInput.replace(/[^0-9+]/g, '');

                    try {
                        const { data: existingGuests, error: fetchErr } = await supabase.from('guests').select('*').eq('wedding_id', weddingId);
                        if (fetchErr) throw fetchErr;

                        if (existingGuests.some(g => g.phone === cleanedPhone)) {
                            showAlert({ icon: 'error', title: 'Duplicate Phone', text: 'Phone number is already in use' });
                            return;
                        }

                        const { data: newGuestData, error: insertError } = await supabase.from('guests').insert([{ 
                            wedding_id: weddingId,
                            name: document.getElementById('guestName').value.trim(),
                            phone: phoneInput,
                            invite_code: generateInviteCode()
                        }]).select().single();
                        
                        if (insertError) throw insertError;

                        const selectedEvents = Array.from(document.getElementById('createGuestForm').querySelectorAll('input[name="guest_events"]:checked')).map(cb => ({
                            event_id: cb.value,
                            guest_id: newGuestData.id
                        }));

                        if (selectedEvents.length > 0) {
                            const { error: mappingError } = await supabase.from('event_guests').insert(selectedEvents);
                            if (mappingError && mappingError.code !== '42P01') throw mappingError; 
                        }

                        modal.close();
                        window.dispatchEvent(new Event('weddingDataUpdated')); 
                        showAlert({ icon: 'success', title: 'Added!', text: 'Guest saved successfully.', timer: 2000 });
                    } catch (error) {
                        showAlert({ icon: 'error', title: 'Database Error', text: error.message });
                    }
                }
            }
        ]
    });

    setTimeout(() => {
        forceStyleModalButtons();
        ['guestName', 'guestPhone'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.style.borderColor = el.value.trim() === '' ? 'red' : 'green';
                el.addEventListener('input', () => {
                    el.style.borderColor = el.value.trim() === '' ? 'red' : 'green';
                });
            }
        });
    }, 50);
};

window.openEditGuestModal = function(weddingId, guest, events = []) {
    const invitedList = guest.invited_events || [];
    const sortedModalEvents = [...events].sort((a, b) => new Date(a.start_time || a.date).getTime() - new Date(b.start_time || b.date).getTime());
    
    const eventCheckboxes = sortedModalEvents.length > 0 ? sortedModalEvents.map(ev => `
        <label style="display: flex; align-items: center; gap: 8px; font-size: var(--font-size-sm); color: var(--color-text-primary); cursor: pointer;">
            <input type="checkbox" name="guest_events" value="${ev.id}" ${invitedList.includes(ev.id) ? 'checked' : ''} style="accent-color: var(--color-primary); cursor: pointer;">
            ${ev.title} (${new Date(ev.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})
        </label>
    `).join('') : `<div style="color: var(--color-text-muted); font-size: var(--font-size-xs);">No events available yet.</div>`;

    const formHTML = `
        <form id="editGuestForm" novalidate style="display:flex; flex-direction:column; gap:var(--space-3);">
            <div>
                <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:4px;">Guest Name *</label>
                <input type="text" id="editGuestName" value="${guest.name.replace(/"/g, '&quot;')}" required style="width:100%; background:var(--color-bg); border:1px solid var(--color-border); color:var(--color-text-primary); padding:var(--space-2); border-radius:var(--radius-sm); outline:none; transition: border-color 0.2s;">
            </div>
            <div>
                <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:4px;">Phone Number *</label>
                <input type="text" id="editGuestPhone" value="${guest.phone.replace(/"/g, '&quot;')}" required style="width:100%; background:var(--color-bg); border:1px solid var(--color-border); color:var(--color-text-primary); padding:var(--space-2); border-radius:var(--radius-sm); outline:none; transition: border-color 0.2s;">
            </div>
            <div style="margin-top: var(--space-2);">
                <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:8px;">Invite to Events</label>
                <div style="display: flex; flex-direction: column; gap: 8px; max-height: 150px; overflow-y: auto; border: 1px solid var(--color-border); padding: var(--space-3); border-radius: var(--radius-sm); background: var(--color-bg);">
                    ${eventCheckboxes}
                </div>
            </div>
        </form>
    `;

    const modal = openModal({
        title: "Edit Guest",
        content: formHTML,
        actions: [            
            {
                label: "Delete",
                variant: "danger", 
                closesModal: false,
                onClick: async () => {
                    const result = await Swal.fire({
                        title: 'Are you sure?',
                        text: "Do you really want to remove this guest?",
                        icon: 'question', 
                        showCancelButton: true,
                        confirmButtonColor: '#dc2626',
                        cancelButtonColor: '#6b7280',
                        confirmButtonText: 'Yes, remove them!'
                    });

                    if (result.isConfirmed) {
                        try {
                            const { error } = await supabase.from('guests').delete().eq('id', guest.id);
                            if (error) throw error;
                            
                            modal.close();
                            window.dispatchEvent(new Event('weddingDataUpdated')); 
                            showAlert({ icon: 'success', title: 'Removed!', text: 'Guest has been removed.', timer: 2000 });
                        } catch (error) {
                            showAlert({ icon: 'error', title: 'Database Error', text: error.message });
                        }
                    }
                }
            },
            { label: "Cancel", variant: "ghost" },
            { 
                label: "Edit", 
                variant: "primary", 
                closesModal: false,
                onClick: async () => {
                    const requiredFields = [
                        { id: 'editGuestName', name: "Guest Name" },
                        { id: 'editGuestPhone', name: "Phone Number" }
                    ];

                    let isValid = true; 
                    let firstEmpty = null;

                    requiredFields.forEach(field => {
                        const el = document.getElementById(field.id);
                        if (!el.value.trim()) { 
                            el.style.borderColor = "red"; 
                            isValid = false; 
                            if(!firstEmpty) firstEmpty = field.name; 
                        } else { 
                            el.style.borderColor = "green"; 
                        }
                    });

                    if (!isValid) {
                        showAlert({ icon: 'warning', title: 'Missing Information', text: `Please fill out: ${firstEmpty}` });
                        return;
                    }

                    const phoneInput = document.getElementById('editGuestPhone').value.trim();
                    const cleanedPhone = phoneInput.replace(/[^0-9+]/g, '');

                    try {
                        const { data: existingGuests, error: fetchErr } = await supabase.from('guests').select('*').eq('wedding_id', weddingId);
                        if (fetchErr) throw fetchErr;

                        if (existingGuests.some(g => g.phone === cleanedPhone && g.id !== guest.id)) {
                            showAlert({ icon: 'error', title: 'Duplicate Phone', text: 'Phone number is already in use' });
                            return;
                        }

                        const { error } = await supabase.from('guests').update({ 
                            name: document.getElementById('editGuestName').value.trim(),
                            phone: phoneInput
                        }).eq('id', guest.id);
                        
                        if (error) throw error;

                        const { error: deleteError } = await supabase.from('event_guests').delete().eq('guest_id', guest.id);
                        if (deleteError) throw deleteError;

                        const selectedEvents = Array.from(document.getElementById('editGuestForm').querySelectorAll('input[name="guest_events"]:checked')).map(cb => ({
                            event_id: cb.value,
                            guest_id: guest.id
                        }));

                        if (selectedEvents.length > 0) {
                            const { error: mappingError } = await supabase.from('event_guests').insert(selectedEvents);
                            if (mappingError && mappingError.code !== '42P01') throw mappingError; 
                        }

                        modal.close();
                        window.dispatchEvent(new Event('weddingDataUpdated')); 
                        showAlert({ icon: 'success', title: 'Updated!', text: 'Guest details updated successfully.', timer: 2000 });
                    } catch (error) {
                        showAlert({ icon: 'error', title: 'Database Error', text: error.message });
                    }
                }
            }
        ]
    });

    setTimeout(() => {
        forceStyleModalButtons();
        ['editGuestName', 'editGuestPhone'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.style.borderColor = el.value.trim() === '' ? 'red' : 'green';
                el.addEventListener('input', () => {
                    el.style.borderColor = el.value.trim() === '' ? 'red' : 'green';
                });
            }
        });
    }, 50);
};

window.downloadSampleExcel = function() {
    if (typeof XLSX === 'undefined') {
        showAlert({ icon: 'error', title: 'Library Missing', text: 'Excel library failed to load. Please refresh the page.' });
        return;
    }

    const events = window.__currentEvents || [];
    
    const sortedEvents = [...events].sort((a, b) => new Date(a.start_time || a.date).getTime() - new Date(b.start_time || b.date).getTime());
    const eventTitles = sortedEvents.map(e => e.title);
    
    const headers = ["Name", "Phone Number", ...eventTitles];
    
    const sampleRows = [];
    const firstNames = ["Aarav", "Vihaan", "Aditya", "Sai", "Arjun", "Siddharth", "Rohan", "Kabir", "Dhruv", "Aryan", "Ananya", "Diya", "Isha", "Kavya", "Mira", "Neha", "Pooja", "Riya", "Sanya", "Tara", "Rahul", "Sonal", "Darshana", "Chandra", "Amit", "Sumit", "Vikram", "Sneha", "Karan", "Priya", "Anjali", "Ravi", "Suresh", "Ramesh", "Deepa", "Prakash", "Anita", "Sunil", "Geeta", "Mohit"];
    const lastNames = ["Bafna", "Jain", "Shah", "Patel", "Mehta", "Desai", "Parekh", "Kothari", "Doshi", "Gandhi", "Sharma", "Verma", "Gupta", "Malhotra", "Singh", "Chopra"];
    
    const usedPhones = new Set();

    for (let i = 0; i < 50; i++) {
        const fName = firstNames[Math.floor(Math.random() * firstNames.length)];
        const lName = lastNames[Math.floor(Math.random() * lastNames.length)];
        const name = `${fName} ${lName}`;
        
        let phone;
        do {
            phone = "9" + Math.floor(100000000 + Math.random() * 900000000).toString();
        } while (usedPhones.has(phone));
        usedPhones.add(phone);

        const row = [name, phone];
        
        const invType = Math.random();
        let selectedIndexes = [];
        
        if (invType < 0.33) {
            selectedIndexes = sortedEvents.map((_, idx) => idx);
        } else if (invType < 0.66) {
            if (sortedEvents.length > 0) {
                selectedIndexes = [Math.floor(Math.random() * sortedEvents.length)];
            }
        } else {
            if (sortedEvents.length > 0) {
                let count = Math.min(2, sortedEvents.length);
                while (selectedIndexes.length < count) {
                    let r = Math.floor(Math.random() * sortedEvents.length);
                    if (!selectedIndexes.includes(r)) selectedIndexes.push(r);
                }
            }
        }

        sortedEvents.forEach((_, idx) => {
            row.push(selectedIndexes.includes(idx) ? "Y" : "");
        });

        sampleRows.push(row);
    }

    const excelData = [headers, ...sampleRows];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(excelData);

    const range = XLSX.utils.decode_range(ws['!ref']);
    
    ws['!cols'] = [
        { wch: 25 },
        { wch: 15 },
        ...sortedEvents.map(() => ({ wch: 18 }))
    ];

    for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellRef = XLSX.utils.encode_cell({c: C, r: 0});
        if (!ws[cellRef]) continue;
        
        ws[cellRef].s = {
            fill: { fgColor: { rgb: "FFF2CC" } },
            font: { bold: true, color: { rgb: "000000" } }
        };
    }

    XLSX.utils.book_append_sheet(wb, ws, "Guest List");
    XLSX.writeFile(wb, "Sample_Guest_Import_50.xlsx");
};

window.triggerCSVImport = function(weddingId) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx, .xls';
    
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                
                const rows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

                if (rows.length === 0) throw new Error("The Excel file is empty.");

                Swal.fire({ 
                    title: 'Importing Guests...', 
                    text: 'Please wait while we sync your guests with the database.', 
                    allowOutsideClick: false, 
                    didOpen: () => Swal.showLoading() 
                });

                const events = window.__currentEvents || [];
                
                const { data: existingGuests, error: fetchErr } = await supabase.from('guests').select('*').eq('wedding_id', weddingId);
                if (fetchErr) throw fetchErr;

                const seenPhones = new Set();

                for (const row of rows) {
                    const name = row['Name']?.toString().trim();
                    let phone = row['Phone Number']?.toString().trim();
                    
                    if (!name || !phone) continue; 

                    phone = phone.replace(/[^0-9+]/g, '');

                    if (seenPhones.has(phone)) continue;
                    seenPhones.add(phone);

                    let guestId;
                    const existingGuest = existingGuests.find(g => g.phone === phone);

                    if (existingGuest) {
                        const { error: updErr } = await supabase.from('guests').update({ name: name }).eq('id', existingGuest.id);
                        if (updErr) throw updErr;
                        guestId = existingGuest.id;
                        
                        await supabase.from('event_guests').delete().eq('guest_id', guestId);
                    } else {
                        const { data: newGuest, error: insErr } = await supabase.from('guests').insert([{ 
                            wedding_id: weddingId, 
                            name: name, 
                            phone: phone, 
                            invite_code: generateInviteCode() 
                        }]).select().single();
                        if (insErr) throw insErr;
                        guestId = newGuest.id;
                    }

                    const eventMappings = [];
                    for (const ev of events) {
                        const val = row[ev.title]?.toString().trim().toUpperCase();
                        if (val === 'Y' || val === 'YES') {
                            eventMappings.push({ event_id: ev.id, guest_id: guestId });
                        }
                    }

                    if (eventMappings.length > 0) {
                        const { error: mapErr } = await supabase.from('event_guests').insert(eventMappings);
                        if (mapErr && mapErr.code !== '42P01') throw mapErr;
                    }
                }

                Swal.fire({ icon: 'success', title: 'Import Complete!', text: 'Guests have been successfully updated and imported.' }).then(() => {
                    window.dispatchEvent(new Event('weddingDataUpdated'));
                });

            } catch (err) {
                Swal.fire({ icon: 'error', title: 'Import Failed', text: err.message });
            }
        };
        reader.readAsArrayBuffer(file);
    };
    input.click();
};