import { supabase } from '../../database/js/api.js';
import { openModal } from '../../global/js/modal.js';
import { showSweetAlert } from '../../global/js/sweet-alert-message.js';
import { formatWeddingDateRange } from '../weddings/weddings.js';

// ==========================================
// UTILITY HELPERS
// ==========================================
function generateInviteCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Debounced / Single-firing broadcast helper to prevent redundant re-renders
let broadcastTimer = null;
function broadcastWeddingDataUpdated() {
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

// Normalize phone numbers to catch variations like +919791146838 vs 9791146838 (compares last 10 digits)
function normalizePhone(phone) {
    if (!phone) return '';
    const digits = phone.replace(/[^0-9]/g, '');
    return digits.length > 10 ? digits.slice(-10) : digits;
}

// ==========================================
// DYNAMIC SCRIPT LOADER (ENSURES XLSX NEVER FAILS)
// ==========================================
function ensureXLSXLoaded() {
    return new Promise((resolve, reject) => {
        if (typeof XLSX !== 'undefined') {
            resolve(window.XLSX);
            return;
        }
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

// ==========================================
// MAIN RENDER FUNCTION
// ==========================================
export function renderWeddingDetails(weddingId) {
    const wrapper = document.createElement("div");
    wrapper.className = "wedding-details-wrapper"; 
    
    if (typeof window.checkSessionOrShowAlert === 'function' && !window.checkSessionOrShowAlert()) {
        wrapper.innerHTML = `<div style="padding: var(--space-8); text-align: center; color: var(--color-text-secondary);">Please log in to view wedding details.</div>`;
        return wrapper;
    }

    wrapper.innerHTML = `<div style="padding: var(--space-8); text-align: center; color: var(--color-text-secondary);">Loading wedding details...</div>`;

    loadWeddingData(wrapper, weddingId);

    window.__refreshCurrentWeddingDetails = () => {
        if (document.body.contains(wrapper)) {
            loadWeddingData(wrapper, weddingId);
        }
    };

    const updateHandler = () => {
        if (document.body.contains(wrapper)) {
            loadWeddingData(wrapper, weddingId);
        } else {
            window.removeEventListener('weddingDataUpdated', updateHandler);
            window.removeEventListener('weddingsDataUpdated', updateHandler);
        }
    };
    window.removeEventListener('weddingDataUpdated', updateHandler);
    window.removeEventListener('weddingsDataUpdated', updateHandler);
    window.addEventListener('weddingDataUpdated', updateHandler);
    window.addEventListener('weddingsDataUpdated', updateHandler);

    return wrapper;
}

// ==========================================
// ASYNC DATA FETCHER & PERMISSION HIERARCHY
// ==========================================
async function loadWeddingData(container, weddingId) {
    const dashboardWeddingsUrl = '#weddings';
    
    const showSwalError = (title, text) => {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'error',
                title: title,
                text: text,
                confirmButtonText: "Go Back to Weddings",
                allowOutsideClick: false,
                allowEscapeKey: false,
                confirmButtonColor: 'var(--color-primary)'
            }).then(() => {
                window.location.hash = dashboardWeddingsUrl;
            });
        } else {
            alert(title + "\n\n" + text);
            window.location.hash = dashboardWeddingsUrl;
        }
    };

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!weddingId || (!uuidRegex.test(weddingId) && weddingId !== '00000000-0000-0000-0000-000000000000')) {
        showSwalError("Invalid Link", "The wedding link is broken or invalid.");
        return;
    }

    try {
        const curUser = window.currentUser || { role: 'guest' };

        const { data: wedding, error: weddingError } = await supabase.from('weddings').select('*').eq('id', weddingId).maybeSingle();
        
        if (weddingError || !wedding) {
            showSwalError("Error", "Incorrect wedding details. Please contact Admin.");
            return;
        }

        const { data: webInvite } = await supabase.from('wedding_web_invite').select('id').eq('wedding_id', weddingId).maybeSingle();
        const hasWebInvite = !webInvite;

        const { data: allSysUsers, error: sysUsersErr } = await supabase.from('users').select('id, name, phone, role');
        if (sysUsersErr) throw sysUsersErr;

        const { data: rawHosts } = await supabase.from('wedding_hosts').select('*').eq('wedding_id', weddingId);
        const { data: rawWUsers } = await supabase.from('wedding_users').select('*').eq('wedding_id', weddingId);

        const hosts = (rawHosts || []).map(h => {
            const u = allSysUsers.find(u => u.id === h.user_id) || {};
            return { ...h, name: u.name, phone: u.phone };
        });
        
        const wUsers = (rawWUsers || []).map(w => {
            const u = allSysUsers.find(u => u.id === w.user_id) || {};
            return { ...w, name: u.name, phone: u.phone };
        });

        const isCreator = curUser.role === 'creator';
        const isHost = hosts.some(h => h.user_id === curUser.id);
        const isWeddingUser = wUsers.some(w => w.user_id === curUser.id);
        
        const todayTime = new Date();
        todayTime.setHours(0, 0, 0, 0);
        const endDateTime = new Date(wedding.end_date);
        endDateTime.setHours(0, 0, 0, 0);
        const isArchived = endDateTime.getTime() < todayTime.getTime();

        const canConfig = (isCreator || isHost) && !isArchived; 
        const canViewAll = isCreator || isHost || isWeddingUser; 

        window.__weddingContext = {
            weddingId,
            allSysUsers,
            assignedIds: new Set([...hosts.map(h => h.user_id), ...wUsers.map(w => w.user_id)]),
            canConfig,
            isCreator,
            curUserId: curUser.id
        };

        let eventsQuery = supabase.from('wedding_events').select('*').eq('wedding_id', weddingId);
        const { data: guests, error: guestsError } = await supabase.from('guests').select('*').eq('wedding_id', weddingId);
        if (guestsError) throw guestsError;

        const { data: eventGuests } = await supabase.from('event_guests').select('*');

        if (guests && eventGuests) {
            guests.forEach(g => {
                g.invited_events = eventGuests.filter(eg => eg.guest_id === g.id).map(eg => eg.event_id);
            });
        }

        let filteredEvents = [];
        const { data: allEvents, error: eventsError } = await eventsQuery;
        if (eventsError) throw eventsError;

        if (!canViewAll) { 
            const cleanedUserPhone = curUser.phone ? curUser.phone.replace(/[^0-9]/g, '') : null;
            const baseUserPhone = cleanedUserPhone ? cleanedUserPhone.slice(-10) : null;

            const currentGuest = guests?.find(g => {
                const cleanedGuestPhone = g.phone ? g.phone.replace(/[^0-9]/g, '') : null;
                return baseUserPhone && cleanedGuestPhone && cleanedGuestPhone.endsWith(baseUserPhone);
            });

            const invitedEventIds = currentGuest && currentGuest.invited_events ? currentGuest.invited_events : [];
            filteredEvents = allEvents ? allEvents.filter(e => invitedEventIds.includes(e.id)) : [];
        } else {
            filteredEvents = allEvents || []; 
        }

        const displayEventCount = canViewAll ? (allEvents?.length || 0) : filteredEvents.length;

        container.innerHTML = "";
        container.appendChild(buildSpecificHeader(wedding, hasWebInvite));
        
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
        showSwalError("Error", error?.message || "Failed to load wedding details.");
    }
}

// ==========================================
// 1. HEADER SECTION (INSTAGRAM FIRST, INVITE SECOND)
// ==========================================
function buildSpecificHeader(wedding, hasWebInvite = true) {
    const header = document.createElement("div");
    header.className = "wedding-details-header";
    
    const leftSide = document.createElement("div");
    leftSide.className = "wedding-details-header__left";
    
    const displayNames = wedding.primary_side === 'groom' 
        ? `${wedding.groom_name} & ${wedding.bride_name}` 
        : `${wedding.bride_name} & ${wedding.groom_name}`;

    let hashtagHTML = '';
    if (wedding.hashtag) {
        const formattedHashtag = wedding.hashtag.startsWith('#') ? wedding.hashtag : `#${wedding.hashtag}`;
        hashtagHTML = `<div style="margin-top: 4px;"><span class="wedding-details-header__hashtag">${formattedHashtag}</span></div>`;
    }

    leftSide.innerHTML = `
        <h1 class="wedding-details-header__title">${displayNames}</h1>
        <p class="wedding-details-header__date">Date: <strong>${formatWeddingDateRange(wedding.start_date, wedding.end_date)}</strong></p>
        ${hashtagHTML}
    `;

    const rightSide = document.createElement("div");
    rightSide.className = "wedding-details-header__right";

    let instagramHTML = '';
    if (wedding.instagram) {
        let igUrl = wedding.instagram.startsWith('http') ? wedding.instagram : `https://instagram.com/${wedding.instagram.replace('@', '')}`;
        let handle = wedding.instagram.trim();
        if (handle.includes('instagram.com/')) {
            handle = handle.split('instagram.com/')[1].replace(/\//g, '');
        }
        handle = handle.replace('@', ''); 

        instagramHTML = `
            <a href="${igUrl}" target="_blank" class="wedding-details-header__instagram-btn" title="Instagram">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M8 0C5.829 0 5.556.01 4.703.048 3.85.088 3.269.222 2.76.42a3.917 3.917 0 0 0-1.417.923A3.927 3.927 0 0 0 .42 2.76C.222 3.268.087 3.85.048 4.7.01 5.555 0 5.827 0 8.001c0 2.172.01 2.444.048 3.297.04.852.174 1.433.372 1.942.205.526.478.972.923 1.417.444.445.89.719 1.416.923.51.198 1.09.333 1.942.372C5.555 15.99 5.827 16 8 16s2.444-.01 3.298-.048c.851-.04 1.434-.174 1.943-.372a3.916 3.916 0 0 0 1.416-.923c.445-.445.718-.891.923-1.417.197-.509.332-1.09.372-1.942C15.99 10.445 16 10.173 16 8s-.01-2.445-.048-3.299c-.04-.851-.175-1.433-.372-1.941a3.926 3.926 0 0 0-.923-1.417A3.911 3.911 0 0 0 13.24.42c-.51-.198-1.092-.333-1.943-.372C10.443.01 10.172 0 7.998 0h.003zm-.717 1.442h.718c2.136 0 2.389.007 3.232.046.78.035 1.204.166 1.486.275.373.145.64.319.92.599.28.28.453.546.598.92.11.281.24.705.275 1.485.039.843.047 1.096.047 3.231s-.008 2.389-.047 3.232c-.035.78-.166 1.203-.275 1.485a2.47 2.47 0 0 1-.599.919c-.28.28-.546.453-.92.598-.282.11-.705.24-1.485.276-.843.038-1.096.047-3.232.047s-2.39-.009-3.233-.047c-.78-.036-1.203-.166-1.485-.276a2.478 2.478 0 0 1-.92-.598 2.48 2.48 0 0 1-.6-.92c-.109-.281-.24-.705-.275-1.485-.038-.843-.046-1.096-.046-3.233 0-2.136.008-2.388.046-3.231.036-.78.166-1.204.276-1.486.145-.373.319-.64.599-.92.28-.28.546-.453.92-.598.282-.11.705-.24 1.485-.276.738-.034 1.024-.044 2.515-.045v.002zm4.988 1.328a.96.96 0 1 0 0 1.92.96.96 0 0 0 0-1.92zm-4.27 1.122a4.109 4.109 0 1 0 0 8.217 4.109 4.109 0 0 0 0-8.217zm0 1.441a2.667 2.667 0 1 1 0 5.334 2.667 2.667 0 0 1 0-5.334z"/>
                </svg>
                ${handle}
            </a>
        `;
    }

    let webInviteHTML = '';
    if (hasWebInvite || wedding.id === '00000000-0000-0000-0000-000000000000') {
        let inviteUrl = `${window.location.origin}/invite.html?id=${wedding.id}`;
        if (wedding.id === '00000000-0000-0000-0000-000000000000') {
            inviteUrl = `${window.location.origin}/sample-invite.html`;
        }
        webInviteHTML = `
            <a href="${inviteUrl}" target="_blank" class="wedding-details-header__invite-btn">
                <i data-lucide="external-link" style="width: 14px; height: 14px;"></i> Wedding Invitation
            </a>`;
    }

    rightSide.innerHTML = `
        ${instagramHTML}
        ${webInviteHTML}
    `;

    header.appendChild(leftSide);
    header.appendChild(rightSide);
    
    return header;
}

// ==========================================
// 2. STATS SECTION 
// ==========================================
function buildSpecificStats(wedding, eventsCount = 0, guestsCount = 0, hosts = [], canViewAll) {
    const formatWithNewlines = (text) => text ? text.replace(/[,;]\s*/g, '<br>') : '';

    const container = document.createElement("div");
    container.className = "wedding-details-stats";

    if (wedding.family_name || wedding.family_details) {
        const topRow = document.createElement("div");
        topRow.className = "wedding-details-stats__top-row";
        
        let topCardsHTML = '';

        if (wedding.family_name) {
            topCardsHTML += `
            <div class="wedding-details-stat-card" style="flex: 1; min-width: 250px;">
                <div>
                    <p class="wedding-details-stat-card__subtitle">Family Name</p>
                    <p class="wedding-details-stat-card__title wedding-details-stat-card__title--md">${wedding.family_name}</p>
                </div>
                <div class="wedding-details-stat-card__icon-badge">
                    <i data-lucide="home"></i>
                </div>
            </div>`;
        }

        if (wedding.family_details) {
            topCardsHTML += `
            <div class="wedding-details-stat-card" style="flex: 2; min-width: 300px;">
                <div>
                    <p class="wedding-details-stat-card__subtitle">Family Details</p>
                    <p class="wedding-details-stat-card__title wedding-details-stat-card__title--md" style="line-height: 1.4;">${formatWithNewlines(wedding.family_details)}</p>
                </div>
                <div class="wedding-details-stat-card__icon-badge">
                    <i data-lucide="users"></i>
                </div>
            </div>`;
        }

        topRow.innerHTML = topCardsHTML;
        container.appendChild(topRow);
    }

    const bottomGrid = document.createElement("div");
    bottomGrid.className = "wedding-details-stats__grid";

    let bottomCardsHTML = '';
    let hostRowsHTML = '';

    if (hosts && hosts.length > 0) {
        const sortedHosts = [...hosts].sort((a, b) => (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase()));
        hostRowsHTML = sortedHosts.map(host => {
            const cleanNum = host.phone ? host.phone.replace(/[^0-9+]/g, '') : '';
            return `
            <div class="wedding-details-host-row">
                <span class="wedding-details-host-row__text">${host.name} - ${host.phone}</span>
                <a href="tel:${cleanNum}" class="wedding-details-host-row__call-btn" title="Call ${host.name}">
                    <i data-lucide="phone" style="width: 18px; height: 18px;"></i>
                </a>
            </div>`;
        }).join('');
    } else {
        hostRowsHTML = `<div style="margin-top: var(--space-3); padding-top: var(--space-3); color: var(--color-text-secondary); font-size: var(--font-size-sm); font-style: italic;">No wedding hosts added yet.</div>`;
    }

    bottomCardsHTML += `
    <div class="wedding-details-stat-card wedding-details-stat-card--column">
        <p class="wedding-details-stat-card__subtitle">Wedding Host Details</p>
        ${hostRowsHTML}
    </div>`;

    if (canViewAll) {
        bottomCardsHTML += `
        <div class="wedding-details-stat-card">
            <div>
                <p class="wedding-details-stat-card__subtitle">Total Guests</p>
                <p class="wedding-details-stat-card__title">${guestsCount}</p>
            </div>
            <div class="wedding-details-stat-card__icon-badge">
                <i data-lucide="users"></i>
            </div>
        </div>`;
    }

    bottomCardsHTML += `
    <div class="wedding-details-stat-card">
        <div>
            <p class="wedding-details-stat-card__subtitle">Total Events</p>
            <p class="wedding-details-stat-card__title">${eventsCount}</p>
        </div>
        <div class="wedding-details-stat-card__icon-badge">
            <i data-lucide="calendar"></i>
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
    section.className = "wedding-details-section";

    const headerRow = document.createElement("div");
    headerRow.className = "wedding-details-section__control-bar";

    let leftHTML = canConfig ? `
        <button id="add-event-main-btn" class="wedding-action-btn-primary">
            <i data-lucide="plus"></i> Event
        </button>
    ` : '<div></div>';
    
    let rightHTML = events && events.length > 0 ? `
        <button id="add-to-calendar-btn" class="wedding-action-btn-primary">
            <i data-lucide="calendar-plus"></i> Add To Calendar
        </button>
    ` : '';
    
    headerRow.innerHTML = `
        <div class="wedding-details-section__left-actions">${leftHTML}</div>
        <div class="wedding-details-section__right-actions">${rightHTML}</div>
    `;
    section.appendChild(headerRow);

    const content = document.createElement("div");
    section.appendChild(content);

    const formatTime = (timeStr) => {
        if (!timeStr) return '';
        const timePart = timeStr.includes('T') ? timeStr.split('T')[1] : timeStr;
        const [hoursStr, minutesStr] = timePart.split(':');
        let h = parseInt(hoursStr, 10);
        if (isNaN(h)) return timeStr;
        const m = minutesStr || '00';
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
    };

    function renderEventsView() {
        if (!events || events.length === 0) {
            content.innerHTML = `<div style="text-align: center; padding: var(--space-6); color: var(--color-text-muted); border: 1px dashed var(--color-border); border-radius: var(--radius-sm);">No events scheduled yet.</div>`;
            return;
        }
        
        const sortedEvents = [...events].sort((a, b) => {
            const timeA = a.time || '00:00:00';
            const timeB = b.time || '00:00:00';
            return new Date(`${a.date}T${timeA.length === 5 ? timeA + ':00' : timeA}`).getTime() - 
                   new Date(`${b.date}T${timeB.length === 5 ? timeB + ':00' : timeB}`).getTime();
        });

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
                const editIcon = canConfig ? `<button class="edit-event-btn" data-id="${ev.id}" style="background:none; border:none; padding:4px; cursor:pointer; margin-left:auto; color: var(--color-text-muted);" onmouseover="this.style.color='var(--color-primary)'" onmouseout="this.style.color='var(--color-text-muted)'"><i data-lucide="edit-2" style="width: 14px; height: 14px; color: currentColor;"></i></button>` : '';
                
                const venueHTML = ev.venue_map_link 
                    ? `<a href="${ev.venue_map_link}" target="_blank" style="line-height: 1.4; color: var(--color-primary); font-weight: 500; text-decoration: underline; text-underline-offset: 2px; transition: color 0.2s;" onmouseover="this.style.color='var(--color-text-primary)'" onmouseout="this.style.color='var(--color-primary)'">${ev.venue}</a>`
                    : `<span style="line-height: 1.4;">${ev.venue}</span>`;

                const eventHeading = ev.event_name || 'Untitled Event';

                htmlContent += `
                    <div class="timeline-event-card">
                        <div style="position: absolute; left: -24px; top: 22px; width: 8px; height: 8px; border-radius: 50%; background: var(--color-border); border: 2px solid var(--color-white); z-index: 2;"></div>
                        
                        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                            <div style="display: flex; align-items: baseline; gap: 8px;">
                                <h4 style="margin: 0; font-size: 1.05rem; font-weight: var(--font-weight-bold); color: var(--color-text-primary);">${eventHeading}</h4>
                            </div>
                            ${editIcon}
                        </div>
                        
                        <div style="display: flex; gap: 16px; color: var(--color-text-secondary); font-size: var(--font-size-sm); flex-wrap: wrap;">
                            <div style="display: flex; align-items: center; gap: 6px;">
                                <i data-lucide="clock" style="width: 14px; height: 14px;"></i> ${formatTime(ev.time)}
                            </div>
                            <div style="display: flex; align-items: center; gap: 6px;">
                                <i data-lucide="map-pin" style="width: 14px; height: 14px;"></i> ${venueHTML}
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
                    const eventId = btn.getAttribute('data-id');
                    window.openEditEventModal(wedding.id, wedding.start_date, wedding.end_date, eventId);
                });
            });
        }

        if (window.lucide) window.lucide.createIcons();
    }

    setTimeout(() => {
        renderEventsView();
        
        if (canConfig) {
            const addEventMainBtn = section.querySelector('#add-event-main-btn');
            if (addEventMainBtn) {
                addEventMainBtn.replaceWith(addEventMainBtn.cloneNode(true));
                section.querySelector('#add-event-main-btn').addEventListener('click', () => window.openEventModal(wedding.id, wedding.start_date, wedding.end_date));
            }
        }
        
        const addToCalBtn = section.querySelector('#add-to-calendar-btn');
        if (addToCalBtn) {
            addToCalBtn.replaceWith(addToCalBtn.cloneNode(true));
            section.querySelector('#add-to-calendar-btn').addEventListener('click', () => {
                downloadICS(wedding, events);
            });
        }
        
    }, 0);

    return section;
}

// ==========================================
// ICS DOWNLOAD HELPER
// ==========================================
window.downloadICS = function(wedding, events) {
    if (!events || events.length === 0) return;

    let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Shaadi Saathi//Wedding Events//EN\n";

    const displayNames = wedding.primary_side === 'groom' 
        ? `${wedding.groom_name} & ${wedding.bride_name}` 
        : `${wedding.bride_name} & ${wedding.groom_name}`;

    events.forEach(ev => {
        const startDate = new Date(`${ev.date}T${ev.time || '00:00'}`);
        if (isNaN(startDate.getTime())) return; 

        const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); 

        const formatICSDate = (d) => {
            return d.getFullYear().toString() +
                   (d.getMonth() + 1).toString().padStart(2, '0') +
                   d.getDate().toString().padStart(2, '0') + 'T' +
                   d.getHours().toString().padStart(2, '0') +
                   d.getMinutes().toString().padStart(2, '0') +
                   d.getSeconds().toString().padStart(2, '0');
        };

        const summary = `${ev.event_name || ev.title} - ${displayNames} Wedding`;
        const description = ev.description || ev.one_liner || '';
        const location = ev.venue || '';

        icsContent += "BEGIN:VEVENT\n";
        icsContent += `DTSTART:${formatICSDate(startDate)}\n`;
        icsContent += `DTEND:${formatICSDate(endDate)}\n`;
        icsContent += `SUMMARY:${summary}\n`;
        icsContent += `DESCRIPTION:${description}\n`;
        icsContent += `LOCATION:${location}\n`;
        icsContent += "END:VEVENT\n";
    });

    icsContent += "END:VCALENDAR";

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `${displayNames.replace(/ & /g, '_')}_Wedding_Events.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// ==========================================
// 4. HOST SECTION LOGIC
// ==========================================
function buildHostListSection(wedding, hosts, canConfig, isCreator, curUserId) {
    const section = document.createElement("div");
    section.className = "wedding-details-section";

    let currentPage = 1;
    const itemsPerPage = 10;
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

        const totalPages = Math.ceil(sortedHosts.length / itemsPerPage) || 1;
        if (currentPage > totalPages) currentPage = totalPages;

        const startIndex = (currentPage - 1) * itemsPerPage;
        const paginatedHosts = sortedHosts.slice(startIndex, startIndex + itemsPerPage);

        if (!hosts || hosts.length === 0) {
            content.innerHTML = `<div style="text-align: center; padding: var(--space-6); color: var(--color-text-muted); border: 1px dashed var(--color-border); border-radius: var(--radius-sm);">No wedding hosts assigned yet.</div>`;
            if (window.lucide) window.lucide.createIcons();
            return;
        }

        if (paginatedHosts.length === 0) {
            content.innerHTML = `<div style="text-align: center; padding: var(--space-6); color: var(--color-text-muted); border: 1px dashed var(--color-border); border-radius: var(--radius-sm);">No hosts match your search.</div>`;
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
        `;
        
        paginatedHosts.forEach((host, index) => {
            const globalIndex = startIndex + index + 1;
            const canEditThisHost = canConfig && (isCreator || host.user_id !== curUserId);
            
            const actionBtn = canEditThisHost ? `
                <button class="edit-host-btn" data-id="${host.id}" style="background: none; border: none; cursor: pointer; color: var(--color-text-muted); padding: 4px; display: flex; align-items: center; justify-content: center;" onmouseover="this.style.color='var(--color-primary)'" onmouseout="this.style.color='var(--color-text-muted)'" title="Edit">
                    <i data-lucide="edit-2" style="width: 16px; height: 16px;"></i>
                </button>
            ` : `<div></div>`;

            listHTML += `
            <div class="wedding-details-table-row-wrap">
                <div class="hosts-table-grid" style="transition: background 0.2s ease;" onmouseover="this.style.background='var(--color-border)';" onmouseout="this.style.background='transparent';">
                    ${actionBtn}
                    <div class="wedding-details-col-sno">${globalIndex}</div>
                    <div class="guest-name-cell">
                        <h4 class="guest-name-text">${host.name || '-'}</h4>
                    </div>
                    <div class="guest-phone-cell">
                        <i data-lucide="phone" style="width: 14px; height: 14px; flex-shrink: 0;"></i> <span>${host.phone || '-'}</span>
                    </div>
                </div>
            </div>`;
        });

        listHTML += `
                </div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding-top: var(--space-4); margin-top: var(--space-4); border-top: 1px solid var(--color-border);">
                <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">
                    Showing ${startIndex + 1} to ${Math.min(startIndex + itemsPerPage, sortedHosts.length)} of ${sortedHosts.length} hosts
                </div>
        `;

        if (totalPages > 1) {
            listHTML += `
                <div style="display: flex; gap: 8px; align-items: center;">
                    <button class="host-pagination-btn" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''} style="background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-sm); padding: 4px 8px; cursor: ${currentPage === 1 ? 'not-allowed' : 'pointer'}; opacity: ${currentPage === 1 ? '0.5' : '1'}; color: var(--color-text-primary); display: flex; align-items: center;"><i data-lucide="chevron-left" style="width: 16px; height: 16px;"></i></button>
                    <span style="font-size: var(--font-size-sm); color: var(--color-text-primary); font-weight: var(--font-weight-medium); padding: 0 8px;">Page ${currentPage} of ${totalPages}</span>
                    <button class="host-pagination-btn" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''} style="background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-sm); padding: 4px 8px; cursor: ${currentPage === totalPages ? 'not-allowed' : 'pointer'}; opacity: ${currentPage === totalPages ? '0.5' : '1'}; color: var(--color-text-primary); display: flex; align-items: center;"><i data-lucide="chevron-right" style="width: 16px; height: 16px;"></i></button>
                </div>
            `;
        } else {
            listHTML += `<div></div>`; 
        }
        listHTML += `</div>`;
        
        content.innerHTML = listHTML;

        setTimeout(() => {
            const editBtns = content.querySelectorAll('.edit-host-btn');
            editBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    window.openSystemUserModal('host', btn.getAttribute('data-id'));
                });
            });

            const pageBtns = content.querySelectorAll('.host-pagination-btn');
            pageBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    if (btn.hasAttribute('disabled')) return;
                    currentPage = parseInt(btn.getAttribute('data-page'));
                    renderHosts();
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
                currentPage = 1; 
                renderHosts();
            });
        }
        if (canConfig) {
            const trigger = section.querySelector('#add-host-btn-trigger');
            if(trigger) {
                trigger.replaceWith(trigger.cloneNode(true));
                section.querySelector('#add-host-btn-trigger').addEventListener('click', () => window.openSystemUserModal('host'));
            }
        }
    }, 0);

    return section;
}

// ==========================================
// 5. WEDDING USERS SECTION
// ==========================================
function buildWeddingUserListSection(wedding, wUsers, canConfig) {
    const section = document.createElement("div");
    section.className = "wedding-details-section";

    let currentPage = 1;
    const itemsPerPage = 10;
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

        const totalPages = Math.ceil(sortedUsers.length / itemsPerPage) || 1;
        if (currentPage > totalPages) currentPage = totalPages;

        const startIndex = (currentPage - 1) * itemsPerPage;
        const paginatedUsers = sortedUsers.slice(startIndex, startIndex + itemsPerPage);

        if (!wUsers || wUsers.length === 0) {
            content.innerHTML = `<div style="text-align: center; padding: var(--space-6); color: var(--color-text-muted); border: 1px dashed var(--color-border); border-radius: var(--radius-sm);">No wedding users assigned yet.</div>`;
            if (window.lucide) window.lucide.createIcons();
            return;
        }

        if (paginatedUsers.length === 0) {
            content.innerHTML = `<div style="text-align: center; padding: var(--space-6); color: var(--color-text-muted); border: 1px dashed var(--color-border); border-radius: var(--radius-sm);">No users match your search.</div>`;
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
        `;
        
        paginatedUsers.forEach((u, index) => {
            const globalIndex = startIndex + index + 1;
            
            const actionBtn = canConfig ? `
                <button class="edit-wedding-user-btn" data-id="${u.id}" style="background: none; border: none; cursor: pointer; color: var(--color-text-muted); padding: 4px; display: flex; align-items: center; justify-content: center;" onmouseover="this.style.color='var(--color-primary)'" onmouseout="this.style.color='var(--color-text-muted)'" title="Edit">
                    <i data-lucide="edit-2" style="width: 16px; height: 16px;"></i>
                </button>
            ` : `<div></div>`;

            listHTML += `
            <div class="wedding-details-table-row-wrap">
                <div class="users-table-grid" style="transition: background 0.2s ease;" onmouseover="this.style.background='var(--color-border)';" onmouseout="this.style.background='transparent';">
                    ${actionBtn}
                    <div class="wedding-details-col-sno">${globalIndex}</div>
                    <div class="guest-name-cell">
                        <h4 class="guest-name-text">${u.name || '-'}</h4>
                    </div>
                    <div class="guest-phone-cell">
                        <i data-lucide="phone" style="width: 14px; height: 14px; flex-shrink: 0;"></i> <span>${u.phone || '-'}</span>
                    </div>
                </div>
            </div>`;
        });

        listHTML += `
                </div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding-top: var(--space-4); margin-top: var(--space-4); border-top: 1px solid var(--color-border);">
                <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">
                    Showing ${startIndex + 1} to ${Math.min(startIndex + itemsPerPage, sortedUsers.length)} of ${sortedUsers.length} users
                </div>
        `;

        if (totalPages > 1) {
            listHTML += `
                <div style="display: flex; gap: 8px; align-items: center;">
                    <button class="wedding-user-pagination-btn" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''} style="background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-sm); padding: 4px 8px; cursor: ${currentPage === 1 ? 'not-allowed' : 'pointer'}; opacity: ${currentPage === 1 ? '0.5' : '1'}; color: var(--color-text-primary); display: flex; align-items: center;"><i data-lucide="chevron-left" style="width: 16px; height: 16px;"></i></button>
                    <span style="font-size: var(--font-size-sm); color: var(--color-text-primary); font-weight: var(--font-weight-medium); padding: 0 8px;">Page ${currentPage} of ${totalPages}</span>
                    <button class="wedding-user-pagination-btn" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''} style="background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-sm); padding: 4px 8px; cursor: ${currentPage === totalPages ? 'not-allowed' : 'pointer'}; opacity: ${currentPage === totalPages ? '0.5' : '1'}; color: var(--color-text-primary); display: flex; align-items: center;"><i data-lucide="chevron-right" style="width: 16px; height: 16px;"></i></button>
                </div>
            `;
        } else {
            listHTML += `<div></div>`; 
        }
        listHTML += `</div>`;
        
        content.innerHTML = listHTML;

        setTimeout(() => {
            const editBtns = content.querySelectorAll('.edit-wedding-user-btn');
            editBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    window.openSystemUserModal('wedding_user', btn.getAttribute('data-id'));
                });
            });

            const pageBtns = content.querySelectorAll('.wedding-user-pagination-btn');
            pageBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    if (btn.hasAttribute('disabled')) return;
                    currentPage = parseInt(btn.getAttribute('data-page'));
                    renderWeddingUsers();
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
                currentPage = 1; 
                renderWeddingUsers();
            });
        }
        if (canConfig) {
            const trigger = section.querySelector('#add-wedding-user-btn-trigger');
            if(trigger) {
                trigger.replaceWith(trigger.cloneNode(true));
                section.querySelector('#add-wedding-user-btn-trigger').addEventListener('click', () => window.openSystemUserModal('wedding_user'));
            }
        }
    }, 0);

    return section;
}

function layoutDetailsModalFooter(isEditModal = false) {
    const allBtns = Array.from(document.querySelectorAll('button'));
    const cancelBtn = allBtns.find(b => b.textContent.trim() === 'Cancel');
    const closeBtn = allBtns.find(b => b.textContent.trim() === 'Close');
    const deleteBtn = allBtns.find(b => b.textContent.trim() === 'Delete');
    const primaryBtn = allBtns.find(b => ['Add', 'Edit', 'Update'].includes(b.textContent.trim()));

    if (cancelBtn) {
        cancelBtn.classList.add('modal-btn-cancel');
        cancelBtn.style.order = '1';
        cancelBtn.style.flexShrink = '0';
        cancelBtn.style.marginRight = isEditModal ? '0' : '0';
    }

    if (closeBtn) {
        closeBtn.classList.remove('modal-btn-cancel');
        closeBtn.classList.add('wedding-action-btn-primary');
        closeBtn.style.order = '3';
        closeBtn.style.flexShrink = '0';
        closeBtn.style.marginLeft = 'auto';
        closeBtn.style.whiteSpace = 'nowrap';
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

    const container = (cancelBtn || closeBtn || primaryBtn)?.parentElement;
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

// ==========================================
// SEARCHABLE DROPDOWN
// ==========================================
function convertToSearchableDropdown(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;

    select.style.display = 'none';

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'position: relative; width: 100%; text-align: left; font-family: inherit; box-sizing: border-box;';
    select.parentNode.insertBefore(wrapper, select);

    const initialValid = select.value !== "";
    const displayBorder = initialValid ? '1px solid #16a34a' : '1px solid #dc2626';

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
    dropdownMenu.style.cssText = 'width: 100%; background: var(--color-bg, #0c0a09); border: 1px solid var(--color-border, #292524); border-radius: var(--radius-sm, 4px); display: none; box-shadow: 0 4px 12px rgba(0,0,0,0.3); margin-top: 6px; padding: 8px; flex-direction: column; gap: 8px; box-sizing: border-box;';
    
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search...';
    searchInput.style.cssText = 'width: 100%; height: 34px; padding: 6px 10px; border: 1px solid var(--color-border, #292524); border-radius: var(--radius-sm, 4px); box-sizing: border-box; background: var(--color-white, #1c1917); color: var(--color-text-primary, #ffffff); outline: none; font-size: var(--font-size-sm, 0.875rem);';
    
    const optionsList = document.createElement('div');
    optionsList.style.cssText = 'max-height: 140px; overflow-y: auto; display: flex; flex-direction: column; scrollbar-gutter: stable; padding-right: 2px;';

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
            displayText.textContent = '-- Select --';
            displayText.style.color = 'var(--color-text-secondary, #a1a1aa)';
            displayBox.style.borderColor = select.hasAttribute('required') ? '#dc2626' : 'var(--color-border, #292524)';
        }
    }

    function renderList(filter = '') {
        optionsList.innerHTML = '';
        const filtered = options.filter(opt => opt.value !== "" && opt.text.toLowerCase().includes(filter.toLowerCase()));

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

// ==========================================
// SYSTEM USER MODAL
// ==========================================
window.openSystemUserModal = async function(type, existingRecordId = null) {
    const ctx = window.__weddingContext;
    if (!ctx || !ctx.canConfig) return;

    const isHost = type === 'host';
    const tableName = isHost ? 'wedding_hosts' : 'wedding_users';
    const titleType = isHost ? 'Wedding Host' : 'Wedding User';

    let existingRecord = null;
    if (existingRecordId) {
        try {
            const { data, error } = await supabase.from(tableName).select('*').eq('id', existingRecordId).single();
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
        <form id="sysUserForm" novalidate class="wedding-details-modal-form">
            <div>
                <label class="wedding-modal-label">Select ${titleType} *</label>
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
                        broadcastWeddingDataUpdated();
                        showSweetAlert('success', 'Removed!', `${titleType} has been removed.`);
                    } catch (error) {
                        showSweetAlert('error', 'Database Error', error.message);
                    }
                }
            }
        });
    }

    actions.push({ 
        label: existingRecord ? "Update" : "Add", 
        variant: "primary", 
        closesModal: false,
        onClick: async () => {
            const selectEl = document.getElementById('sysUserId');
            const selectedUserId = selectEl.value;

            if (!selectedUserId) {
                showSweetAlert('error', 'Missing Information', `Please fill out all mandatory fields. Missing: ${titleType}`);
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
                broadcastWeddingDataUpdated();
                showSweetAlert('success', existingRecord ? 'Updated!' : 'Added!', `${titleType} saved successfully.`);
            } catch (error) {
                showSweetAlert('error', 'Database Error', error.message);
            }
        }
    });

    const modal = openModal({
        title: existingRecord ? `Edit ${titleType}` : `Add New ${titleType}`,
        content: formHTML,
        actions: actions
    });

    setTimeout(() => {
        layoutDetailsModalFooter(!!existingRecord);
        convertToSearchableDropdown('sysUserId');
    }, 50);
};

// ==========================================
// 6. GUEST LIST SECTION (CONFIG: 7 COLS / READONLY: 5 COLS)
// ==========================================
function buildGuestListSection(wedding, guests, events, canConfig) {
    window.__currentEvents = events || [];

    const section = document.createElement("div");
    section.className = "wedding-details-section";

    let currentPage = 1;
    const itemsPerPage = 10; 
    let searchQuery = '';

    const controlsRow = document.createElement("div");
    controlsRow.className = "wedding-details-section__control-bar";
    
    let leftActions = canConfig ? `
        <button id="importSampleTriggerBtn" class="wedding-action-btn-primary" onclick="openImportModal('${wedding.id}')">
            <i data-lucide="upload"></i> Import / Sample
        </button>
    ` : '<div></div>';

    let middleActions = canConfig ? `
        <button id="addGuestBtnTrigger" class="wedding-action-btn-primary">
            <i data-lucide="plus"></i> Guest
        </button>
    ` : '';

    controlsRow.innerHTML = `
        <div class="wedding-details-section__left-actions">${leftActions}</div>
        <div class="wedding-details-section__middle-actions">${middleActions}</div>
        <div class="wedding-details-section__right-actions">
            <div class="wedding-details-search-wrapper">
                <i data-lucide="search"></i>
                <input type="text" id="guestSearchInput" placeholder="Search ..." class="wedding-details-search-input">
            </div>
        </div>
    `;
    section.appendChild(controlsRow);

    const content = document.createElement("div");
    section.appendChild(content);

    function renderGuests() {
        const filteredGuests = (guests || []).filter(g => {
            const query = searchQuery.toLowerCase();
            return (g.name || '').toLowerCase().includes(query) || (g.phone || '').includes(query);
        });

        const sortedGuests = filteredGuests.sort((a, b) => (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase()));

        const totalPages = Math.ceil(sortedGuests.length / itemsPerPage) || 1;
        if (currentPage > totalPages) currentPage = totalPages;

        const startIndex = (currentPage - 1) * itemsPerPage;
        const paginatedGuests = sortedGuests.slice(startIndex, startIndex + itemsPerPage);

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

        const gridClass = canConfig ? "guests-table-grid--config" : "guests-table-grid--readonly";

        let listHTML = `
            <div class="wedding-details-table-container">
                <div class="wedding-details-table-inner--guests">
                    <div class="${gridClass} wedding-details-table-header">
                        <div></div> 
                        ${canConfig ? '<div></div>' : ''}
                        <div>S.No</div>
                        <div>Name</div>
                        <div>Phone Number</div>
                        <div style="text-align: center;">Events</div>
                        ${canConfig ? '<div style="text-align: center;">WA</div>' : ''}
                    </div>
        `;

        listHTML += paginatedGuests.map((guest, index) => {
            const globalIndex = startIndex + index + 1;
            const guestEvents = events ? events.filter(e => guest.invited_events?.includes(e.id)) : [];
            const eventsTags = guestEvents.length > 0 
                ? guestEvents.map(e => `<span style="background: var(--color-border); padding: 4px 10px; border-radius: 16px; font-size: 0.75rem; color: var(--color-text-primary); font-weight: var(--font-weight-medium); display: inline-flex; align-items: center; gap: 4px;"><i data-lucide="calendar" style="width:12px; height:12px;"></i> ${e.event_name || e.title}</span>`).join('')
                : `<span style="color: var(--color-text-muted); font-size: 0.8rem; font-style: italic;">No events assigned</span>`;

            const cleanPhone = guest.phone ? guest.phone.replace(/[^0-9+]/g, '') : '';
            const hasInvitedEvents = guest.invited_events && guest.invited_events.length > 0;
            
            let waCellContent = '';
            
            if (guest.phone && hasInvitedEvents) {
                const displayNames = wedding.primary_side === 'groom' ? `${wedding.groom_name} & ${wedding.bride_name}` : `${wedding.bride_name} & ${wedding.groom_name}`;
                const weddingUrl = `https://shaadi-saathi.pages.dev/#wedding-details?id=${wedding.id}`;
                const sortedGuestEvents = [...guestEvents].sort((a, b) => {
                    const timeA = a.time || '00:00:00';
                    const timeB = b.time || '00:00:00';
                    return new Date(`${a.date}T${timeA.length === 5 ? timeA + ':00' : timeA}`).getTime() - 
                           new Date(`${b.date}T${timeB.length === 5 ? timeB + ':00' : timeB}`).getTime();
                });
                
                const eventsListText = sortedGuestEvents.map(ev => {
                    const evDate = new Date(ev.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    return `• ${ev.event_name || ev.title} (${evDate})`;
                }).join('\n');

                const waMessage = `Jai Jinendra,\n\n*${(guest.name || '').toUpperCase()}*,\n\n*${(wedding.family_name || '').toUpperCase()}* Family has sent you an invitation for the wedding of *${displayNames}* on *_Shaadi Saathi_*.\n\nYou are cordially invited to the following events:\n${eventsListText}\n\nClick the link below to view the complete invitation and event details:\n${weddingUrl}\n\nAwaiting your gracious presence.\n\nRegards,\n*${wedding.family_details || ''}*\n\n*_Shaadi Saathi_*`;
                const encodedMessage = encodeURIComponent(waMessage);

                waCellContent = `
                    <a href="https://wa.me/${cleanPhone}?text=${encodedMessage}" target="_blank" onclick="event.stopPropagation();" style="display:flex; align-items:center; justify-content:center; width:26px; height:26px; background:#25D366; color:white; border-radius:50%; text-decoration:none; transition:opacity 0.2s; margin: 0 auto;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'" title="WhatsApp">
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                    </a>
                `;
            } else if (!guest.phone) {
                waCellContent = `<div style="text-align: center; color: var(--color-danger); font-size: 0.65rem; font-weight: var(--font-weight-medium); line-height: 1.2;">No Phone</div>`;
            } else {
                waCellContent = `<div style="text-align: center; color: var(--color-danger); font-size: 0.65rem; font-weight: var(--font-weight-medium); line-height: 1.2;">No Events</div>`;
            }

            const editCol = canConfig ? `
                <button class="edit-guest-btn" data-id="${guest.id}" style="background: none; border: none; cursor: pointer; color: var(--color-text-muted); padding: 4px; display: flex; align-items: center; justify-content: center;" onmouseover="this.style.color='var(--color-primary)'" onmouseout="this.style.color='var(--color-text-muted)'">
                    <i data-lucide="edit-2" style="width: 16px; height: 16px;"></i>
                </button>
            ` : '';
                
            return `
            <div class="wedding-details-table-row-wrap">
                <div class="${gridClass}" style="transition: background 0.2s ease;" onmouseover="this.style.background='var(--color-border)';" onmouseout="this.style.background='transparent';">
                    
                    <button class="toggle-events-btn" data-target="child-${guest.id}" style="background: none; border: none; cursor: pointer; color: var(--color-text-muted); padding: 4px; display: flex; align-items: center; justify-content: center;" onmouseover="this.style.color='var(--color-primary)'" onmouseout="this.style.color='var(--color-text-muted)'">
                        <i data-lucide="chevron-right" style="width: 18px; height: 18px; transition: transform 0.2s;"></i>
                    </button>

                    ${editCol}

                    <div class="wedding-details-col-sno">${globalIndex}</div>
                    
                    <div class="guest-name-cell">
                        <h4 class="guest-name-text">${guest.name || '-'}</h4>
                    </div>
                    
                    <div class="guest-phone-cell">
                        <i data-lucide="phone" style="width: 13px; height: 13px; flex-shrink: 0;"></i> <span>${guest.phone || '-'}</span>
                    </div>
                    
                    <div style="display: flex; align-items: center; justify-content: center; color: var(--color-text-secondary); font-size: var(--font-size-sm); min-width: 0; font-weight: var(--font-weight-medium);">
                        ${guest.invited_events?.length || 0}
                    </div>

                    ${canConfig ? `<div>${waCellContent}</div>` : ''}
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
                </div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding-top: var(--space-4); margin-top: var(--space-4); border-top: 1px solid var(--color-border);">
                <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">
                    Showing ${startIndex + 1} to ${Math.min(startIndex + itemsPerPage, sortedGuests.length)} of ${sortedGuests.length} guests
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
                        window.openEditGuestModal(wedding.id, btn.getAttribute('data-id'));
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
        const searchInput = section.querySelector('#guestSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                searchQuery = e.target.value;
                currentPage = 1; 
                renderGuests();
            });
        }
        if (canConfig) {
            const trigger = section.querySelector('#addGuestBtnTrigger');
            if(trigger) {
                trigger.replaceWith(trigger.cloneNode(true));
                section.querySelector('#addGuestBtnTrigger').addEventListener('click', () => window.openGuestModal(wedding.id, events));
            }
        }
    }, 0);

    return section;
}

// ==========================================
// EVENTS MODALS
// ==========================================
window.openEventModal = async function(weddingId, minDate, maxDate) {
    let templates = [];
    try {
        const { data } = await supabase.from('events').select('*');
        templates = data || [];
    } catch (e) {
        console.error("Failed to load templates", e);
    }

    let templateOptions = `<option value="">-- Custom Event --</option>`;
    templates.forEach(t => {
        templateOptions += `<option value="${t.id}">${t.event_name}</option>`;
    });

    const formHTML = `
        <form id="createEventForm" novalidate class="wedding-details-modal-form">
            <div style="margin-bottom: 4px;">
                <label class="wedding-modal-label">Apply Template (Optional)</label>
                <select id="eventTemplateSelect" class="wedding-modal-input">
                    ${templateOptions}
                </select>
            </div>

            <div class="wedding-modal-row">
                <div class="wedding-modal-col">
                    <label class="wedding-modal-label">Event Name *</label>
                    <input type="text" id="eventName" required placeholder="e.g., Grithpaan" class="wedding-modal-input wedding-modal-input--invalid">
                </div>
                <div class="wedding-modal-col">
                    <label class="wedding-modal-label">Display Title *</label>
                    <input type="text" id="eventDisplayTitle" required placeholder="e.g., Blessings & Beginnings" class="wedding-modal-input wedding-modal-input--invalid">
                </div>
            </div>

            <div>
                <label class="wedding-modal-label">One Liner Quote *</label>
                <input type="text" id="eventOneLiner" required placeholder="e.g., Golden ghee, elders blessings..." class="wedding-modal-input wedding-modal-input--invalid">
            </div>

            <div>
                <label class="wedding-modal-label">Description *</label>
                <textarea id="eventDescription" rows="3" required placeholder="An auspicious start to our wedding celebrations..." class="wedding-modal-input wedding-modal-input--invalid" style="resize: vertical;"></textarea>
            </div>
            
            <div class="wedding-modal-row">
                <div class="wedding-modal-col">
                    <label class="wedding-modal-label">Date *</label>
                    <input type="date" id="eventDate" min="${minDate}" max="${maxDate}" 
                        onclick="try{this.showPicker()}catch(e){}" 
                        onkeydown="if(event.key !== 'Tab' && event.key !== 'Shift') event.preventDefault();" 
                        onpaste="return false;" 
                        required class="wedding-modal-input wedding-modal-input--invalid" style="cursor:pointer;">
                </div>
                <div class="wedding-modal-col">
                    <label class="wedding-modal-label">Time *</label>
                    <input type="time" id="eventTime" onclick="try{this.showPicker()}catch(e){}" required class="wedding-modal-input wedding-modal-input--invalid" style="cursor:pointer;">
                </div>
            </div>

            <div>
                <label class="wedding-modal-label">Venue *</label>
                <input type="text" id="eventVenue" required placeholder="e.g., The Grand Hotel" class="wedding-modal-input wedding-modal-input--invalid">
            </div>

            <div>
                <label class="wedding-modal-label">Venue Location (Maps Link) *</label>
                <input type="url" id="eventVenueMapLink" required placeholder="e.g., https://maps.google.com/..." class="wedding-modal-input wedding-modal-input--invalid">
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
                        { id: 'eventDisplayTitle', name: "Display Title" },
                        { id: 'eventOneLiner', name: "One Liner Quote" },
                        { id: 'eventDescription', name: "Description" },
                        { id: 'eventDate', name: "Date" },
                        { id: 'eventTime', name: "Time" },
                        { id: 'eventVenue', name: "Venue" },
                        { id: 'eventVenueMapLink', name: "Venue Location (Maps Link)" }
                    ];

                    let isValid = true;
                    let firstEmpty = null;

                    requiredFields.forEach(field => {
                        const el = document.getElementById(field.id);
                        if (!el.value.trim()) { 
                            el.classList.add('wedding-modal-input--invalid');
                            el.classList.remove('wedding-modal-input--valid');
                            isValid = false; 
                            if(!firstEmpty) firstEmpty = field.name; 
                        } else { 
                            el.classList.remove('wedding-modal-input--invalid');
                            el.classList.add('wedding-modal-input--valid');
                        }
                    });

                    const selectedDate = document.getElementById('eventDate').value;
                    const selectedTime = document.getElementById('eventTime').value;

                    if (selectedDate && (selectedDate < minDate || selectedDate > maxDate)) {
                        isValid = false;
                        document.getElementById('eventDate').classList.add('wedding-modal-input--invalid');
                        showSweetAlert('error', 'Invalid Date', `Event date must be between ${minDate} and ${maxDate}.`);
                        return;
                    }

                    if (!isValid) {
                        showSweetAlert('error', 'Missing Information', `Please fill out all mandatory fields. Missing: ${firstEmpty}`);
                        return;
                    }

                    try {
                        const { error } = await supabase.from('wedding_events').insert([{ 
                            wedding_id: weddingId,
                            event_name: document.getElementById('eventName').value.trim(),
                            title: document.getElementById('eventDisplayTitle').value.trim(),
                            one_liner: document.getElementById('eventOneLiner').value.trim(),
                            description: document.getElementById('eventDescription').value.trim(),
                            date: selectedDate,
                            time: selectedTime,
                            venue: document.getElementById('eventVenue').value.trim(),
                            venue_map_link: document.getElementById('eventVenueMapLink').value.trim()
                        }]);
                        if (error) throw error;
                        
                        modal.close();
                        broadcastWeddingDataUpdated();
                        showSweetAlert('success', 'Added!', 'Event saved successfully.');
                    } catch (error) {
                        showSweetAlert('error', 'Database Error', error.message);
                    }
                }
            }
        ]
    });

    setTimeout(() => {
        layoutDetailsModalFooter(false);
        convertToSearchableDropdown('eventTemplateSelect');
        
        const templateSelect = document.getElementById('eventTemplateSelect');
        if (templateSelect) {
            templateSelect.addEventListener('change', (e) => {
                const selectedId = e.target.value;
                if (!selectedId) return;
                const template = templates.find(t => t.id === selectedId);
                if (!template) return;
                
                ['eventName', 'eventDisplayTitle', 'eventOneLiner', 'eventDescription'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) {
                        if (id === 'eventName') el.value = template.event_name || '';
                        if (id === 'eventDisplayTitle') el.value = template.display_title || '';
                        if (id === 'eventOneLiner') el.value = template.one_liner || '';
                        if (id === 'eventDescription') el.value = template.description || '';
                        
                        if (el.value.trim() === '') {
                            el.classList.add('wedding-modal-input--invalid');
                            el.classList.remove('wedding-modal-input--valid');
                        } else {
                            el.classList.remove('wedding-modal-input--invalid');
                            el.classList.add('wedding-modal-input--valid');
                        }
                    }
                });
            });
        }

        ['eventName', 'eventDisplayTitle', 'eventOneLiner', 'eventDescription', 'eventDate', 'eventTime', 'eventVenue', 'eventVenueMapLink'].forEach(id => {
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
                el.addEventListener('change', updateValidity);
            }
        });
    }, 50);
};

window.openEditEventModal = async function(weddingId, minDate, maxDate, eventId) {
    let ev = null;
    let templates = [];
    
    try {
        const [evRes, tplRes] = await Promise.all([
            supabase.from('wedding_events').select('*').eq('id', eventId).single(),
            supabase.from('events').select('*')
        ]);
        if (evRes.error) throw evRes.error;
        ev = evRes.data;
        templates = tplRes.data || [];
    } catch (e) {
        showSweetAlert('error', 'Error', 'Failed to load event data.');
        return;
    }

    let templateOptions = `<option value="">-- Apply a Template --</option>`;
    templates.forEach(t => {
        templateOptions += `<option value="${t.id}">${t.event_name}</option>`;
    });

    let timeValue = '';
    if (ev.time) {
        const timePart = ev.time.includes('T') ? ev.time.split('T')[1] : ev.time;
        const [hours, minutes] = timePart.split(':');
        timeValue = `${hours}:${minutes}`;
    }

    const formHTML = `
        <form id="editEventForm" novalidate class="wedding-details-modal-form">
            <div style="margin-bottom: 4px;">
                <label class="wedding-modal-label">Apply Template (Optional Overwrite)</label>
                <select id="editTemplateSelect" class="wedding-modal-input">
                    ${templateOptions}
                </select>
            </div>

            <div class="wedding-modal-row">
                <div class="wedding-modal-col">
                    <label class="wedding-modal-label">Event Name *</label>
                    <input type="text" id="editEventName" value="${ev.event_name || ev.title || ''}" required class="wedding-modal-input wedding-modal-input--valid">
                </div>
                <div class="wedding-modal-col">
                    <label class="wedding-modal-label">Display Title *</label>
                    <input type="text" id="editEventDisplayTitle" value="${ev.title || ev.display_title || ''}" required class="wedding-modal-input wedding-modal-input--valid">
                </div>
            </div>

            <div>
                <label class="wedding-modal-label">One Liner Quote *</label>
                <input type="text" id="editEventOneLiner" value="${ev.one_liner || ''}" required class="wedding-modal-input wedding-modal-input--valid">
            </div>

            <div>
                <label class="wedding-modal-label">Description *</label>
                <textarea id="editEventDescription" rows="3" required class="wedding-modal-input wedding-modal-input--valid" style="resize: vertical;">${ev.description || ''}</textarea>
            </div>
            
            <div class="wedding-modal-row">
                <div class="wedding-modal-col">
                    <label class="wedding-modal-label">Date *</label>
                    <input type="date" id="editEventDate" value="${ev.date}" min="${minDate}" max="${maxDate}" 
                        onclick="try{this.showPicker()}catch(e){}" 
                        onkeydown="if(event.key !== 'Tab' && event.key !== 'Shift') event.preventDefault();" 
                        onpaste="return false;" 
                        required class="wedding-modal-input wedding-modal-input--valid" style="cursor:pointer;">
                </div>
                <div class="wedding-modal-col">
                    <label class="wedding-modal-label">Time *</label>
                    <input type="time" id="editEventTime" value="${timeValue}" onclick="try{this.showPicker()}catch(e){}" required class="wedding-modal-input wedding-modal-input--valid" style="cursor:pointer;">
                </div>
            </div>

            <div>
                <label class="wedding-modal-label">Venue *</label>
                <input type="text" id="editEventVenue" value="${ev.venue || ''}" required placeholder="e.g., The Grand Hotel" class="wedding-modal-input wedding-modal-input--valid">
            </div>

            <div>
                <label class="wedding-modal-label">Venue Location (Maps Link) *</label>
                <input type="url" id="editEventVenueMapLink" value="${ev.venue_map_link || ''}" required placeholder="e.g., https://maps.google.com/..." class="wedding-modal-input wedding-modal-input--valid">
            </div>
        </form>
    `;

    const modal = openModal({
        title: "Edit Event",
        content: formHTML,
        actions: [            
            { label: "Cancel", variant: "ghost" },
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
                            const { error } = await supabase.from('wedding_events').delete().eq('id', ev.id);
                            if (error) throw error;
                            
                            modal.close();
                            broadcastWeddingDataUpdated();
                            showSweetAlert('success', 'Deleted!', 'Event has been removed.');
                        } catch (error) {
                            showSweetAlert('error', 'Database Error', error.message);
                        }
                    }
                }
            },
            { 
                label: "Edit", 
                variant: "primary", 
                closesModal: false,
                onClick: async () => {
                    const requiredFields = [
                        { id: 'editEventName', name: "Event Name" },
                        { id: 'editEventDisplayTitle', name: "Display Title" },
                        { id: 'editEventOneLiner', name: "One Liner Quote" },
                        { id: 'editEventDescription', name: "Description" },
                        { id: 'editEventDate', name: "Date" },
                        { id: 'editEventTime', name: "Time" },
                        { id: 'editEventVenue', name: "Venue" },
                        { id: 'editEventVenueMapLink', name: "Venue Location (Maps Link)" }
                    ];

                    let isValid = true;
                    let firstEmpty = null;

                    requiredFields.forEach(field => {
                        const el = document.getElementById(field.id);
                        if (!el.value.trim()) { 
                            el.classList.add('wedding-modal-input--invalid');
                            el.classList.remove('wedding-modal-input--valid');
                            isValid = false; 
                            if(!firstEmpty) firstEmpty = field.name; 
                        } else { 
                            el.classList.remove('wedding-modal-input--invalid');
                            el.classList.add('wedding-modal-input--valid');
                        }
                    });

                    const selectedDate = document.getElementById('editEventDate').value;
                    const selectedTime = document.getElementById('editEventTime').value;

                    if (selectedDate && (selectedDate < minDate || selectedDate > maxDate)) {
                        isValid = false;
                        document.getElementById('editEventDate').classList.add('wedding-modal-input--invalid');
                        showSweetAlert('error', 'Invalid Date', `Event date must be between ${minDate} and ${maxDate}.`);
                        return;
                    }

                    if (!isValid) {
                        showSweetAlert('error', 'Missing Information', `Please fill out all mandatory fields. Missing: ${firstEmpty}`);
                        return;
                    }

                    try {
                        const { error } = await supabase.from('wedding_events').update({ 
                            event_name: document.getElementById('editEventName').value.trim(),
                            title: document.getElementById('editEventDisplayTitle').value.trim(),
                            one_liner: document.getElementById('editEventOneLiner').value.trim(),
                            description: document.getElementById('editEventDescription').value.trim(),
                            date: selectedDate,
                            time: selectedTime,
                            venue: document.getElementById('editEventVenue').value.trim(),
                            venue_map_link: document.getElementById('editEventVenueMapLink').value.trim()
                        }).eq('id', ev.id);
                        
                        if (error) throw error;
                        
                        modal.close();
                        broadcastWeddingDataUpdated();
                        showSweetAlert('success', 'Updated!', 'Event details updated successfully.');
                    } catch (error) {
                        showSweetAlert('error', 'Database Error', error.message);
                    }
                }
            }
        ]
    });

    setTimeout(() => {
        layoutDetailsModalFooter(true);
        convertToSearchableDropdown('editTemplateSelect');

        if (ev) {
            document.getElementById('editEventName').value = ev.event_name || ev.title || '';
            document.getElementById('editEventDisplayTitle').value = ev.title || ev.display_title || '';
            document.getElementById('editEventOneLiner').value = ev.one_liner || '';
            document.getElementById('editEventDescription').value = ev.description || '';
            document.getElementById('editEventVenue').value = ev.venue || '';
            document.getElementById('editEventVenueMapLink').value = ev.venue_map_link || '';
        }

        const templateSelect = document.getElementById('editTemplateSelect');
        if (templateSelect) {
            templateSelect.addEventListener('change', (e) => {
                const selectedId = e.target.value;
                if (!selectedId) return;
                const template = templates.find(t => t.id === selectedId);
                if (!template) return;
                
                ['editEventName', 'editEventDisplayTitle', 'editEventOneLiner', 'editEventDescription'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) {
                        if (id === 'editEventName') el.value = template.event_name || '';
                        if (id === 'editEventDisplayTitle') el.value = template.display_title || '';
                        if (id === 'editEventOneLiner') el.value = template.one_liner || '';
                        if (id === 'editEventDescription') el.value = template.description || '';
                        
                        if (el.value.trim() === '') {
                            el.classList.add('wedding-modal-input--invalid');
                            el.classList.remove('wedding-modal-input--valid');
                        } else {
                            el.classList.remove('wedding-modal-input--invalid');
                            el.classList.add('wedding-modal-input--valid');
                        }
                    }
                });
            });
        }

        ['editEventName', 'editEventDisplayTitle', 'editEventOneLiner', 'editEventDescription', 'editEventDate', 'editEventTime', 'editEventVenue', 'editEventVenueMapLink'].forEach(id => {
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
                el.addEventListener('change', updateValidity);
            }
        });
    }, 50);
};

// ==========================================
// GUESTS MODALS
// ==========================================
window.openGuestModal = function(weddingId, events = []) {
    const sortedModalEvents = [...events].sort((a, b) => {
        const timeA = a.time || '00:00:00';
        const timeB = b.time || '00:00:00';
        return new Date(`${a.date}T${timeA.length === 5 ? timeA + ':00' : timeA}`).getTime() - 
               new Date(`${b.date}T${timeB.length === 5 ? timeB + ':00' : timeB}`).getTime();
    });
    
    const eventCheckboxes = sortedModalEvents.length > 0 ? sortedModalEvents.map(ev => `
        <label style="display: flex; align-items: center; gap: 8px; font-size: var(--font-size-sm); color: var(--color-text-primary); cursor: pointer;">
            <input type="checkbox" name="guest_events" value="${ev.id}" style="accent-color: var(--color-primary); cursor: pointer;">
            ${ev.event_name || ev.title} (${new Date(ev.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})
        </label>
    `).join('') : `<div style="color: var(--color-text-muted); font-size: var(--font-size-xs);">No events available yet.</div>`;

    const formHTML = `
        <form id="createGuestForm" novalidate class="wedding-details-modal-form">
            <div>
                <label class="wedding-modal-label">Guest Name *</label>
                <input type="text" id="guestName" required class="wedding-modal-input wedding-modal-input--invalid">
            </div>
            <div>
                <label class="wedding-modal-label">Phone Number *</label>
                <input type="text" id="guestPhone" required class="wedding-modal-input wedding-modal-input--invalid">
            </div>
            <div style="margin-top: var(--space-2);">
                <label class="wedding-modal-label" style="margin-bottom:8px;">Invite to Events</label>
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
                            el.classList.add('wedding-modal-input--invalid');
                            el.classList.remove('wedding-modal-input--valid');
                            isValid = false; 
                            if(!firstEmpty) firstEmpty = field.name; 
                        } else { 
                            el.classList.remove('wedding-modal-input--invalid');
                            el.classList.add('wedding-modal-input--valid');
                        }
                    });

                    if (!isValid) {
                        showSweetAlert('error', 'Missing Information', `Please fill out all mandatory fields. Missing: ${firstEmpty}`);
                        return;
                    }

                    const phoneInput = document.getElementById('guestPhone').value.trim();
                    const cleanedInputNormalized = normalizePhone(phoneInput);

                    try {
                        const { data: existingGuests, error: fetchErr } = await supabase.from('guests').select('*').eq('wedding_id', weddingId);
                        if (fetchErr) throw fetchErr;

                        const matchingGuest = existingGuests.find(g => normalizePhone(g.phone) === cleanedInputNormalized);

                        let targetGuestId;

                        if (matchingGuest) {
                            const { error: updateErr } = await supabase
                                .from('guests')
                                .update({
                                    name: document.getElementById('guestName').value.trim(),
                                    phone: phoneInput
                                })
                                .eq('id', matchingGuest.id);
                            if (updateErr) throw updateErr;

                            targetGuestId = matchingGuest.id;
                            await supabase.from('event_guests').delete().eq('guest_id', targetGuestId);
                        } else {
                            const { data: newGuestData, error: insertError } = await supabase.from('guests').insert([{ 
                                wedding_id: weddingId,
                                name: document.getElementById('guestName').value.trim(),
                                phone: phoneInput,
                                invite_code: generateInviteCode()
                            }]).select().single();
                            
                            if (insertError) throw insertError;
                            targetGuestId = newGuestData.id;
                        }

                        const selectedEvents = Array.from(document.getElementById('createGuestForm').querySelectorAll('input[name="guest_events"]:checked')).map(cb => ({
                            event_id: cb.value,
                            guest_id: targetGuestId
                        }));

                        if (selectedEvents.length > 0) {
                            const { error: mappingError } = await supabase.from('event_guests').insert(selectedEvents);
                            if (mappingError && mappingError.code !== '42P01') throw mappingError; 
                        }

                        modal.close();
                        broadcastWeddingDataUpdated();
                        showSweetAlert('success', matchingGuest ? 'Updated!' : 'Added!', `Guest ${matchingGuest ? 'updated' : 'saved'} successfully.`);
                    } catch (error) {
                        showSweetAlert('error', 'Database Error', error.message);
                    }
                }
            }
        ]
    });

    setTimeout(() => {
        layoutDetailsModalFooter(false);
        ['guestName', 'guestPhone'].forEach(id => {
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
    }, 50);
};

window.openEditGuestModal = async function(weddingId, guestId) {
    let guest = null;
    let events = [];
    
    try {
        const [guestRes, eventsRes] = await Promise.all([
            supabase.from('guests').select('*').eq('id', guestId).single(),
            supabase.from('wedding_events').select('*').eq('wedding_id', weddingId)
        ]);
        if (guestRes.error) throw guestRes.error;
        guest = guestRes.data;
        events = eventsRes.data || [];
        
        const { data: eventGuests } = await supabase.from('event_guests').select('event_id').eq('guest_id', guestId);
        guest.invited_events = eventGuests ? eventGuests.map(eg => eg.event_id) : [];
    } catch (e) {
        showSweetAlert('error', 'Error', 'Failed to load guest data.');
        return;
    }

    const invitedList = guest.invited_events || [];
    const sortedModalEvents = [...events].sort((a, b) => {
        const timeA = a.time || '00:00:00';
        const timeB = b.time || '00:00:00';
        return new Date(`${a.date}T${timeA.length === 5 ? timeA + ':00' : timeA}`).getTime() - 
               new Date(`${b.date}T${timeB.length === 5 ? timeB + ':00' : timeB}`).getTime();
    });
    
    const eventCheckboxes = sortedModalEvents.length > 0 ? sortedModalEvents.map(ev => `
        <label style="display: flex; align-items: center; gap: 8px; font-size: var(--font-size-sm); color: var(--color-text-primary); cursor: pointer;">
            <input type="checkbox" name="guest_events" value="${ev.id}" ${invitedList.includes(ev.id) ? 'checked' : ''} style="accent-color: var(--color-primary); cursor: pointer;">
            ${ev.event_name || ev.title} (${new Date(ev.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})
        </label>
    `).join('') : `<div style="color: var(--color-text-muted); font-size: var(--font-size-xs);">No events available yet.</div>`;

    const formHTML = `
        <form id="editGuestForm" novalidate class="wedding-details-modal-form">
            <div>
                <label class="wedding-modal-label">Guest Name *</label>
                <input type="text" id="editGuestName" value="${guest.name || ''}" required class="wedding-modal-input wedding-modal-input--valid">
            </div>
            <div>
                <label class="wedding-modal-label">Phone Number *</label>
                <input type="text" id="editGuestPhone" value="${guest.phone || ''}" required class="wedding-modal-input wedding-modal-input--valid">
            </div>
            <div style="margin-top: var(--space-2);">
                <label class="wedding-modal-label" style="margin-bottom:8px;">Invite to Events</label>
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
            { label: "Cancel", variant: "ghost" },
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
                            broadcastWeddingDataUpdated();
                            showSweetAlert('success', 'Removed!', 'Guest has been removed.');
                        } catch (error) {
                            showSweetAlert('error', 'Database Error', error.message);
                        }
                    }
                }
            },
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
                            el.classList.add('wedding-modal-input--invalid');
                            el.classList.remove('wedding-modal-input--valid');
                            isValid = false; 
                            if(!firstEmpty) firstEmpty = field.name; 
                        } else { 
                            el.classList.remove('wedding-modal-input--invalid');
                            el.classList.add('wedding-modal-input--valid');
                        }
                    });

                    if (!isValid) {
                        showSweetAlert('error', 'Missing Information', `Please fill out all mandatory fields. Missing: ${firstEmpty}`);
                        return;
                    }

                    const phoneInput = document.getElementById('editGuestPhone').value.trim();
                    const cleanedEditNormalized = normalizePhone(phoneInput);

                    try {
                        const { data: existingGuests, error: fetchErr } = await supabase.from('guests').select('*').eq('wedding_id', weddingId);
                        if (fetchErr) throw fetchErr;

                        if (existingGuests.some(g => normalizePhone(g.phone) === cleanedEditNormalized && g.id !== guest.id)) {
                            document.getElementById('editGuestPhone').classList.add('wedding-modal-input--invalid');
                            showSweetAlert('warning', 'Duplicate Warning', 'Phone number is already in use.');
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
                        broadcastWeddingDataUpdated();
                        showSweetAlert('success', 'Updated!', 'Guest details updated successfully.');
                    } catch (error) {
                        showSweetAlert('error', 'Database Error', error.message);
                    }
                }
            }
        ]
    });

    setTimeout(() => {
        layoutDetailsModalFooter(true);
        
        if (guest) {
            document.getElementById('editGuestName').value = guest.name || '';
            document.getElementById('editGuestPhone').value = guest.phone || '';
        }

        ['editGuestName', 'editGuestPhone'].forEach(id => {
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
    }, 50);
};

// ==========================================
// IMPORT & SAMPLE MODAL
// ==========================================
window.openImportModal = function(weddingId) {
    const dialogHTML = `
        <div style="display: flex; flex-direction: column; gap: 14px; padding: 6px 2px 10px 2px;">
            <p style="margin: 0; color: var(--color-text-secondary); font-size: var(--font-size-sm); line-height: 1.4;">
                Upload an Excel file (<code style="color: var(--color-primary);">.xlsx, .xls</code>) to batch add or update your guest list, or download our ready-made sample template.
            </p>
            <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 4px;">
                <button id="modalDownloadSampleBtn" class="wedding-action-btn-primary" style="padding: 10px 14px; font-size: var(--font-size-sm); font-weight: 600; width: 100%; justify-content: center;">
                    <i data-lucide="download" style="width: 16px; height: 16px;"></i> Download Sample Excel (.xlsx)
                </button>
                <button id="modalSelectFileBtn" class="wedding-action-btn-primary" style="padding: 10px 14px; font-size: var(--font-size-sm); font-weight: 600; width: 100%; justify-content: center;">
                    <i data-lucide="upload" style="width: 16px; height: 16px;"></i> Select Excel File to Import
                </button>
            </div>
        </div>
    `;

    const modal = openModal({
        title: "Guest Import & Sample",
        content: dialogHTML,
        actions: [
            { label: "Cancel", variant: "ghost" }
        ]
    });

    setTimeout(() => {
        layoutDetailsModalFooter(false);
        if (window.lucide) window.lucide.createIcons();
        const sampleBtn = document.getElementById('modalDownloadSampleBtn');
        const selectFileBtn = document.getElementById('modalSelectFileBtn');

        if (sampleBtn) {
            sampleBtn.addEventListener('click', () => {
                window.downloadSampleExcel();
            });
        }

        if (selectFileBtn) {
            selectFileBtn.addEventListener('click', () => {
                modal.close();
                window.triggerCSVImport(weddingId);
            });
        }
    }, 50);
};

window.downloadSampleExcel = async function() {
    try {
        const XLSX = await ensureXLSXLoaded();

        const events = window.__currentEvents || [];
        
        const sortedEvents = [...events].sort((a, b) => {
            const timeA = a.time || '00:00:00';
            const timeB = b.time || '00:00:00';
            return new Date(`${a.date}T${timeA.length === 5 ? timeA + ':00' : timeA}`).getTime() - 
                   new Date(`${b.date}T${timeB.length === 5 ? timeB + ':00' : timeB}`).getTime();
        });
        
        const eventTitles = sortedEvents.map(e => e.event_name || e.title);
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

        ws['!cols'] = [
            { wch: 25 },
            { wch: 15 },
            ...sortedEvents.map(() => ({ wch: 18 }))
        ];

        XLSX.utils.book_append_sheet(wb, ws, "Guest List");
        XLSX.writeFile(wb, "Sample_Guest_Import_50.xlsx");

    } catch (err) {
        console.error("Error creating sample Excel:", err);
        showSweetAlert('error', 'Export Error', err.message || 'Failed to generate sample file.');
    }
};

window.triggerCSVImport = function(weddingId) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx, .xls';
    
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const XLSX = await ensureXLSXLoaded();
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

                    const seenNormalizedPhones = new Set();

                    for (const row of rows) {
                        const name = row['Name']?.toString().trim();
                        let phone = row['Phone Number']?.toString().trim();
                        
                        if (!name || !phone) continue; 

                        const cleanedNormalized = normalizePhone(phone);
                        if (!cleanedNormalized) continue;

                        if (seenNormalizedPhones.has(cleanedNormalized)) continue;
                        seenNormalizedPhones.add(cleanedNormalized);

                        let guestId;
                        const existingGuest = existingGuests.find(g => normalizePhone(g.phone) === cleanedNormalized);

                        if (existingGuest) {
                            const { error: updErr } = await supabase.from('guests').update({ 
                                name: name,
                                phone: phone
                            }).eq('id', existingGuest.id);
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
                            const colKey = ev.event_name || ev.title;
                            const val = row[colKey]?.toString().trim().toUpperCase();
                            if (val === 'Y' || val === 'YES') {
                                eventMappings.push({ event_id: ev.id, guest_id: guestId });
                            }
                        }

                        if (eventMappings.length > 0) {
                            const { error: mapErr } = await supabase.from('event_guests').insert(eventMappings);
                            if (mapErr && mapErr.code !== '42P01') throw mapErr;
                        }
                    }

                    broadcastWeddingDataUpdated();
                    showSweetAlert('success', 'Import Complete!', 'Guests have been successfully updated and imported.');

                } catch (err) {
                    showSweetAlert('error', 'Import Failed', err.message);
                }
            };
            reader.readAsArrayBuffer(file);

        } catch (err) {
            showSweetAlert('error', 'Import Error', err.message);
        }
    };
    input.click();
};