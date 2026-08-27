import { supabase } from '../../database/js/api.js';
import { openModal } from '../../global/js/modal.js';
import { showSweetAlert } from '../../global/js/sweet-alert-message.js';
import { formatWeddingDateRange } from '../weddings/weddings.js';
import { getWebInvitePreviewUrl, getSampleWebInvitePreviewUrl, getWebInvitePublicPreviewUrl } from '../../global/js/env-config.js';

// ==========================================
// UTILITY HELPERS
// ==========================================
function generateInviteCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

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

function normalizePhone(phone) {
    if (!phone) return '';
    const digits = phone.replace(/[^0-9]/g, '');
    return digits.length > 10 ? digits.slice(-10) : digits;
}

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
    document.body.style.overflowX = 'hidden';

    const wrapper = document.createElement("div");
    wrapper.className = "wedding-details-wrapper"; 
    
    if (typeof window.checkSessionOrShowAlert === 'function' && !window.checkSessionOrShowAlert()) {
        wrapper.innerHTML = `
            <div class="wedding-details-section">
                <div class="wedding-details-loading-state">Please log in to view wedding details.</div>
            </div>
        `;
        return wrapper;
    }

    wrapper.innerHTML = `
        <div class="wedding-details-section">
            <div class="wedding-details-loading-state">Loading wedding details...</div>
        </div>
    `;

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
    
    const showSwalError = async (title, text) => {
        if (typeof Swal === 'undefined') {
            await new Promise((resolve) => {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11';
                script.onload = resolve;
                document.head.appendChild(script);
            });
        }

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
        const hasWebInvite = !!webInvite;

        const { data: variantsData } = await supabase.from('invite_variants').select('*').eq('wedding_id', weddingId);
        const variants = (variantsData || []).sort((a, b) => {
            const countA = a.selected_event_ids?.length || 0;
            const countB = b.selected_event_ids?.length || 0;
            if (countB !== countA) {
                return countB - countA;
            }
            return (a.variant_name || '').localeCompare(b.variant_name || '');
        });

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
        const isWebInviteOnly = wedding.invitation_type === 'web_invite_only';
        const allowsVariants = isWebInviteOnly ? (wedding.allow_variants !== false) : true;

        window.__weddingContext = {
            weddingId,
            wedding,
            allSysUsers,
            assignedIds: new Set([...hosts.map(h => h.user_id), ...wUsers.map(w => w.user_id)]),
            canConfig,
            isCreator,
            curUserId: curUser.id,
            variants
        };

        const { data: allEvents, error: eventsError } = await supabase.from('wedding_events').select('*').eq('wedding_id', weddingId).order('date', { ascending: true }).order('time', { ascending: true });
        if (eventsError) throw eventsError;

        const { data: guests, error: guestsError } = await supabase.from('guests').select('*').eq('wedding_id', weddingId);
        if (guestsError && !isWebInviteOnly) throw guestsError;

        if (guests) {
            guests.forEach(g => {
                if (g.variant_id) {
                    const matchedVar = variants.find(v => v.id === g.variant_id);
                    if (matchedVar) {
                        g.variant_name = matchedVar.variant_name;
                        g.invited_events = matchedVar.selected_event_ids || [];
                    } else {
                        g.variant_name = 'No Variant Assigned';
                        g.invited_events = [];
                    }
                } else {
                    g.variant_name = 'No Variant Assigned';
                    g.invited_events = [];
                }
            });
        }

        let filteredEvents = [];
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
        container.appendChild(buildSpecificHeader(wedding, hasWebInvite, variants));
        
        const statsSection = buildSpecificStats(wedding, displayEventCount, guests?.length || 0, hosts, canViewAll && !isWebInviteOnly, isWebInviteOnly);
        if (statsSection) container.appendChild(statsSection);
        
        container.appendChild(buildEventItinerarySection(wedding, filteredEvents, canConfig));

        if (allowsVariants && canViewAll) {
            container.appendChild(buildVariantsSection(wedding, variants, allEvents, guests, canConfig));
        }

        if (canViewAll && !isWebInviteOnly) {
            container.appendChild(buildHostListSection(wedding, hosts, canConfig, isCreator, curUser.id));
            container.appendChild(buildWeddingUserListSection(wedding, wUsers, canConfig));
            const guestSection = buildGuestListSection(wedding, guests, allEvents, variants, canConfig);
            if (guestSection) container.appendChild(guestSection);
        }

        if (window.lucide) window.lucide.createIcons();

    } catch (error) {
        console.error("Error loading wedding details:", error);
        showSwalError("Error", error?.message || "Failed to load wedding details.");
    }
}

// ==========================================
// 1. HEADER SECTION
// ==========================================
function buildSpecificHeader(wedding, hasWebInvite = true, variants = []) {
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
        hashtagHTML = `<div class="wedding-details-header__hashtag-wrap"><span class="wedding-details-header__hashtag">${formattedHashtag}</span></div>`;
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
        const isWebInviteOnly = wedding.invitation_type === 'web_invite_only';
        const firstVariant = (variants && variants.length > 0) ? variants[0] : null;

        let inviteUrl = getWebInvitePreviewUrl(wedding.id);
        
        if (isWebInviteOnly) {
            inviteUrl = firstVariant ? getWebInvitePublicPreviewUrl(firstVariant.id) : `javascript:void(0);`;
        }

        if (wedding.id === '00000000-0000-0000-0000-000000000000') {
            inviteUrl = getSampleWebInvitePreviewUrl('sample-upcoming');
        }

        webInviteHTML = `
            <a href="${inviteUrl}" ${isWebInviteOnly && !firstVariant ? `onclick="showSweetAlert('info', 'Variant Required', 'Please create at least one variant in the Variants section.'); return false;"` : 'target="_blank"'} class="wedding-details-header__invite-btn">
                <i data-lucide="external-link"></i> Wedding Invitation
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
function buildSpecificStats(wedding, eventsCount = 0, guestsCount = 0, hosts = [], canViewAll = true, isWebInviteOnly = false) {
    const formatWithNewlines = (text) => text ? text.replace(/[,;]\s*/g, '<br>') : '';

    const container = document.createElement("div");
    container.className = "wedding-details-stats";

    if (wedding.family_name || wedding.family_details) {
        const topRow = document.createElement("div");
        topRow.className = "wedding-details-stats__top-row";
        
        let topCardsHTML = '';

        if (wedding.family_name) {
            topCardsHTML += `
            <div class="wedding-details-stat-card wedding-details-stat-card--flex1">
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
            <div class="wedding-details-stat-card wedding-details-stat-card--flex2">
                <div>
                    <p class="wedding-details-stat-card__subtitle">Family Details</p>
                    <p class="wedding-details-stat-card__title wedding-details-stat-card__title--md wedding-details-stat-card__title--details">${formatWithNewlines(wedding.family_details)}</p>
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

    if (!isWebInviteOnly) {
        if (hosts && hosts.length > 0) {
            const sortedHosts = [...hosts].sort((a, b) => (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase()));
            hostRowsHTML = sortedHosts.map(host => {
                const cleanNum = host.phone ? host.phone.replace(/[^0-9+]/g, '') : '';
                return `
                <div class="wedding-details-host-row">
                    <span class="wedding-details-host-row__text">${host.name} - ${host.phone}</span>
                    <a href="tel:${cleanNum}" class="wedding-details-host-row__call-btn" title="Call ${host.name}">
                        <i data-lucide="phone"></i>
                    </a>
                </div>`;
            }).join('');
        } else {
            hostRowsHTML = `<div class="wedding-details-host-empty">No wedding hosts added yet.</div>`;
        }

        bottomCardsHTML += `
        <div class="wedding-details-stat-card wedding-details-stat-card--column">
            <p class="wedding-details-stat-card__subtitle">Wedding Host Details</p>
            ${hostRowsHTML}
        </div>`;
    }

    if (canViewAll && !isWebInviteOnly) {
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
            <i data-lucide="calendar"></i> Calendar
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
            content.innerHTML = `<div class="wedding-details-empty-state">No events scheduled yet.</div>`;
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

        let htmlContent = `<div class="wedding-details-timeline-wrap">`;
        htmlContent += `<div class="wedding-details-timeline-line"></div>`;
        
        Object.entries(groupedEvents).forEach(([dateLabel, dayEvents], groupIdx) => {
            htmlContent += `
                <div class="wedding-details-timeline-day ${groupIdx > 0 ? 'wedding-details-timeline-day--subsequent' : ''}">
                    <div class="wedding-details-timeline-dot"></div>
                    <h3 class="wedding-details-timeline-day-title">
                        ${dateLabel}
                    </h3>
                </div>
            `;
            
            dayEvents.forEach(ev => {
                const editIcon = canConfig ? `<button class="edit-event-btn timeline-event-card__edit-btn" data-id="${ev.id}"><i data-lucide="edit-2" class="wedding-details-edit-icon"></i></button>` : '';
                
                const venueHTML = ev.venue_map_link 
                    ? `<a href="${ev.venue_map_link}" target="_blank" class="timeline-event-card__venue-link">${ev.venue}</a>`
                    : `<span class="timeline-event-card__venue-text">${ev.venue}</span>`;

                const eventHeading = ev.event_name || 'Untitled Event';

                htmlContent += `
                    <div class="timeline-event-card">
                        <div class="timeline-event-card__dot"></div>
                        
                        <div class="timeline-event-card__header">
                            <div class="timeline-event-card__title-group">
                                <h4 class="timeline-event-card__title">${eventHeading}</h4>
                            </div>
                            ${editIcon}
                        </div>
                        
                        <div class="timeline-event-card__meta">
                            <div class="timeline-event-card__meta-item">
                                <i data-lucide="clock"></i> ${formatTime(ev.time)}
                            </div>
                            <div class="timeline-event-card__meta-item">
                                <i data-lucide="map-pin"></i> ${venueHTML}
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
// 4. INVITE VARIANTS SECTION
// ==========================================
function buildVariantsSection(wedding, variants, allEvents = [], guests = [], canConfig = false) {
    const section = document.createElement("div");
    section.className = "wedding-details-section";

    let searchQuery = '';

    const controlsRow = document.createElement("div");
    controlsRow.className = "wedding-details-section__control-bar";

    let leftHTML = canConfig ? `
        <button id="add-variant-btn" class="wedding-action-btn-primary">
            <i data-lucide="plus"></i> Invite Variant
        </button>
    ` : '<div></div>';

    controlsRow.innerHTML = `
        <div class="wedding-details-section__left-actions">${leftHTML}</div>
        <div class="wedding-details-section__right-actions">
            <div class="wedding-details-search-wrapper">
                <i data-lucide="search"></i>
                <input type="text" id="variantSearchInput" placeholder="Search ..." class="wedding-details-search-input">
            </div>
        </div>
    `;
    section.appendChild(controlsRow);

    const content = document.createElement("div");
    section.appendChild(content);

    function renderVariants() {
        const filteredVariants = (variants || [])
            .filter(v => {
                const q = searchQuery.toLowerCase();
                const nameMatch = (v.variant_name || '').toLowerCase().includes(q);
                const eventsMatch = (allEvents || [])
                    .filter(e => v.selected_event_ids?.includes(e.id))
                    .some(e => (e.event_name || e.title || '').toLowerCase().includes(q));
                return nameMatch || eventsMatch;
            })
            .sort((a, b) => {
                const countA = a.selected_event_ids?.length || 0;
                const countB = b.selected_event_ids?.length || 0;
                if (countB !== countA) {
                    return countB - countA;
                }
                return (a.variant_name || '').localeCompare(b.variant_name || '');
            });

        if (!variants || variants.length === 0) {
            content.innerHTML = `<div class="wedding-details-empty-state">No invite variants created yet. Create a variant to generate targeted invite links.</div>`;
            if (window.lucide) window.lucide.createIcons();
            return;
        }

        if (filteredVariants.length === 0) {
            content.innerHTML = `<div class="wedding-details-empty-state">No variants match your search.</div>`;
            if (window.lucide) window.lucide.createIcons();
            return;
        }

        let html = `<div class="variants-grid">`;
        filteredVariants.forEach(v => {
            const variantUrl = getWebInvitePublicPreviewUrl(v.id);
            const assignedGuests = (guests || []).filter(g => g.variant_id === v.id);
            const eventNames = (allEvents || [])
                .filter(e => v.selected_event_ids?.includes(e.id))
                .map(e => `<span class="wedding-details-guest-event-tag"><i data-lucide="calendar"></i> ${e.event_name || e.title}</span>`)
                .join('');

            const eventsDisplay = eventNames || `<span style="font-size: 0.8rem; color: var(--color-text-muted); font-style: italic;">All Wedding Events</span>`;

            html += `
                <div class="variant-card">
                    <div>
                        <div class="variant-card__header">
                            <div>
                                <h4 class="variant-card__title">${v.variant_name}</h4>
                                <div class="variant-card__count-badge">${assignedGuests.length} guest(s) assigned</div>
                            </div>
                            ${canConfig ? `
                                <button class="edit-variant-btn wedding-details-icon-btn" data-id="${v.id}" title="Edit Variant">
                                    <i data-lucide="edit-2" class="wedding-details-edit-icon"></i>
                                </button>
                            ` : ''}
                        </div>
                        <div style="margin-top: 10px;">
                            <div style="font-size: 0.75rem; color: var(--color-text-secondary); margin-bottom: 6px; text-transform: uppercase;">Included Events:</div>
                            <div class="variant-card__events-wrap">${eventsDisplay}</div>
                        </div>
                    </div>
                    <div class="variant-card__actions" style="display: flex; justify-content: space-between; align-items: center; gap: 10px; padding-top: 12px; margin-top: 6px; border-top: 1px solid var(--color-border, #292524);">
                        ${canConfig ? `
                            <button class="assign-variant-btn wedding-action-btn-primary" data-id="${v.id}" data-name="${v.variant_name.replace(/"/g, '&quot;')}" style="padding: 0.45rem 0.85rem; font-size: 0.825rem;">
                                <i data-lucide="user-plus"></i> Assign Guests
                            </button>
                        ` : '<div></div>'}
                        <div class="variant-card__btn-group" style="display: flex; gap: 8px; align-items: center;">
                            <a href="${variantUrl}" target="_blank" class="wedding-action-btn-primary" style="padding: 0.45rem 0.9rem; font-size: 0.825rem; text-decoration: none;" title="Open Web Invite">
                                <i data-lucide="external-link" style="width: 15px; height: 15px;"></i> Web Invite
                            </a>
                            <button class="copy-variant-btn wedding-action-btn-primary" data-url="${variantUrl}" style="padding: 0.45rem 0.7rem; background: var(--color-bg, #0c0a09); border: 1px solid var(--color-border, #292524); color: var(--color-primary, #eab308);" title="Copy Link" type="button">
                                <i data-lucide="link" style="width: 15px; height: 15px;"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        html += `</div>`;
        content.innerHTML = html;

        setTimeout(() => {
            if (canConfig) {
                content.querySelectorAll('.edit-variant-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const vId = btn.getAttribute('data-id');
                        const variant = variants.find(v => v.id === vId);
                        if (variant) openVariantModal(wedding.id, allEvents, variant);
                    });
                });

                content.querySelectorAll('.assign-variant-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const vId = btn.getAttribute('data-id');
                        const vName = btn.getAttribute('data-name');
                        openAssignVariantModal(vId, vName, guests);
                    });
                });
            }

            content.querySelectorAll('.copy-variant-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const url = btn.getAttribute('data-url');
                    navigator.clipboard.writeText(url);
                    showSweetAlert('success', 'Copied!', 'Variant link copied to clipboard.');
                });
            });

            if (window.lucide) window.lucide.createIcons();
        }, 0);
    }

    setTimeout(() => {
        renderVariants();

        const searchInput = section.querySelector('#variantSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                searchQuery = e.target.value;
                renderVariants();
            });
        }

        if (canConfig) {
            const addBtn = section.querySelector('#add-variant-btn');
            if (addBtn) {
                addBtn.replaceWith(addBtn.cloneNode(true));
                section.querySelector('#add-variant-btn').addEventListener('click', () => openVariantModal(wedding.id, allEvents));
            }
        }
    }, 0);

    return section;
}

// ==========================================
// 5. HOST SECTION LOGIC
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
            content.innerHTML = `<div class="wedding-details-empty-state">No wedding hosts assigned yet.</div>`;
            if (window.lucide) window.lucide.createIcons();
            return;
        }

        if (paginatedHosts.length === 0) {
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
        `;
        
        paginatedHosts.forEach((host, index) => {
            const globalIndex = startIndex + index + 1;
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
                    <div class="wedding-details-col-sno">${globalIndex}</div>
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
            <div class="wedding-details-pagination-bar">
                <div class="wedding-details-pagination-info">
                    Showing ${startIndex + 1} to ${Math.min(startIndex + itemsPerPage, sortedHosts.length)} of ${sortedHosts.length} hosts
                </div>
        `;

        if (totalPages > 1) {
            listHTML += `
                <div class="wedding-details-pagination-controls">
                    <button class="host-pagination-btn wedding-details-page-btn" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}><i data-lucide="chevron-left"></i></button>
                    <span class="wedding-details-page-indicator">Page ${currentPage} of ${totalPages}</span>
                    <button class="host-pagination-btn wedding-details-page-btn" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}><i data-lucide="chevron-right"></i></button>
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
// 6. WEDDING USERS SECTION
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
            content.innerHTML = `<div class="wedding-details-empty-state">No wedding users assigned yet.</div>`;
            if (window.lucide) window.lucide.createIcons();
            return;
        }

        if (paginatedUsers.length === 0) {
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
        `;
        
        paginatedUsers.forEach((u, index) => {
            const globalIndex = startIndex + index + 1;
            
            const actionBtn = canConfig ? `
                <button class="edit-wedding-user-btn wedding-details-icon-btn" data-id="${u.id}" title="Edit">
                    <i data-lucide="edit-2" class="wedding-details-edit-icon"></i>
                </button>
            ` : `<div></div>`;

            listHTML += `
            <div class="wedding-details-table-row-wrap">
                <div class="users-table-grid">
                    ${actionBtn}
                    <div class="wedding-details-col-sno">${globalIndex}</div>
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
            <div class="wedding-details-pagination-bar">
                <div class="wedding-details-pagination-info">
                    Showing ${startIndex + 1} to ${Math.min(startIndex + itemsPerPage, sortedUsers.length)} of ${sortedUsers.length} users
                </div>
        `;

        if (totalPages > 1) {
            listHTML += `
                <div class="wedding-details-pagination-controls">
                    <button class="wedding-user-pagination-btn wedding-details-page-btn" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}><i data-lucide="chevron-left"></i></button>
                    <span class="wedding-details-page-indicator">Page ${currentPage} of ${totalPages}</span>
                    <button class="wedding-user-pagination-btn wedding-details-page-btn" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}><i data-lucide="chevron-right"></i></button>
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

let currentGuestView = 'all'; // Preserves state across re-renders ('all' | 'grouped')

// ==========================================
// 7. GUEST LIST SECTION (BY VARIANT DEFAULT)
// ==========================================
function buildGuestListSection(wedding, guests, events, variants, canConfig) {
    window.__currentEvents = events || [];
    window.__currentVariants = variants || [];

    const section = document.createElement("div");
    section.className = "wedding-details-section";

    let searchQuery = '';

    // Control bar: Action buttons & Search
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

    function getWhatsAppButton(guest) {
        const cleanPhone = guest.phone ? guest.phone.replace(/[^0-9+]/g, '') : '';
        const guestEvents = events ? events.filter(e => guest.invited_events?.includes(e.id)) : [];
        const hasInvitedEvents = guest.invited_events && guest.invited_events.length > 0;
        
        if (guest.phone && hasInvitedEvents) {
            const displayNames = wedding.primary_side === 'groom' ? `${wedding.groom_name} & ${wedding.bride_name}` : `${wedding.bride_name} & ${wedding.groom_name}`;
            const weddingUrl = guest.variant_id 
                ? getWebInvitePublicPreviewUrl(guest.variant_id)
                : `https://shaadi-saathi.pages.dev/#wedding-details?id=${wedding.id}`;
            
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

            return `
                <a href="https://wa.me/${cleanPhone}?text=${encodedMessage}" target="_blank" onclick="event.stopPropagation();" class="guest-wa-btn" title="WhatsApp">
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                </a>
            `;
        } else if (!guest.phone) {
            return `<div class="guest-wa-badge--error">No Phone</div>`;
        } else {
            return `<div class="guest-wa-badge--error">No Events</div>`;
        }
    }

    function renderGuests() {
        const filteredGuests = (guests || []).filter(g => {
            const query = searchQuery.toLowerCase();
            return (g.name || '').toLowerCase().includes(query) || (g.phone || '').includes(query);
        });

        if (!guests || guests.length === 0) {
            content.innerHTML = `<div class="wedding-details-empty-state">No guests added yet.</div>`;
            if (window.lucide) window.lucide.createIcons();
            return;
        }

        if (filteredGuests.length === 0) {
            content.innerHTML = `<div class="wedding-details-empty-state">No guests match your search.</div>`;
            if (window.lucide) window.lucide.createIcons();
            return;
        }

        const gridClass = canConfig ? "guests-table-grid--config" : "guests-table-grid--readonly";
        const groupedGridStyle = canConfig 
            ? "grid-template-columns: 32px 45px minmax(160px, 1.5fr) minmax(130px, 1fr) 65px 40px;"
            : "grid-template-columns: 45px minmax(160px, 1.5fr) minmax(130px, 1fr) 65px;";

        const sortedVariants = [...(variants || [])].sort((a, b) => {
            const countA = a.selected_event_ids?.length || 0;
            const countB = b.selected_event_ids?.length || 0;
            if (countB !== countA) return countB - countA;
            return (a.variant_name || '').localeCompare(b.variant_name || '');
        });

        const groupedMap = new Map();
        sortedVariants.forEach(v => groupedMap.set(v.id, { variant: v, guests: [] }));
        groupedMap.set('none', { variant: { id: 'none', variant_name: 'No Variant Assigned', selected_event_ids: [] }, guests: [] });

        filteredGuests.forEach(g => {
            const key = g.variant_id && groupedMap.has(g.variant_id) ? g.variant_id : 'none';
            groupedMap.get(key).guests.push(g);
        });

        let groupHTML = `<div>`;
        let accordionIdx = 0;

        groupedMap.forEach(({ variant, guests: gList }) => {
            if (gList.length === 0) return;

            // Sort guests alphabetically by Name
            gList.sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));
            const bodyId = `variant-accordion-body-${accordionIdx++}`;

            groupHTML += `
                <div class="variant-group-block" style="margin-bottom: 1rem;">
                    <div class="variant-group-header variant-accordion-toggle" data-target="${bodyId}" style="cursor: pointer; user-select: none;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <i data-lucide="chevron-down" class="variant-accordion-icon" style="transition: transform 0.2s ease; width: 18px; height: 18px; color: var(--color-primary);"></i>
                            <h4 class="variant-group-title" style="margin: 0;">${variant.variant_name}</h4>
                        </div>
                        <span class="variant-group-count">${gList.length} guest(s)</span>
                    </div>
                    <div id="${bodyId}" class="variant-accordion-body wedding-details-table-container" style="padding: 12px 8px 4px 8px;">
                        <div class="wedding-details-table-inner--guests">
                            <div class="wedding-details-table-header" style="display: grid; align-items: center; gap: 10px; ${groupedGridStyle}">
                                ${canConfig ? '<div></div>' : ''}
                                <div>S.No</div>
                                <div>Name</div>
                                <div>Phone Number</div>
                                <div class="guest-events-count">Events</div>
                                ${canConfig ? '<div class="guest-events-count">WA</div>' : ''}
                            </div>
            `;

            gList.forEach((guest, index) => {
                const editCol = canConfig ? `
                    <button class="edit-guest-btn wedding-details-icon-btn" data-id="${guest.id}" title="Edit">
                        <i data-lucide="edit-2" class="wedding-details-edit-icon"></i>
                    </button>
                ` : '';

                groupHTML += `
                    <div class="wedding-details-table-row-wrap">
                        <div style="display: grid; align-items: center; padding: 0.75rem 1rem; gap: 10px; ${groupedGridStyle}">
                            ${editCol}
                            <div class="wedding-details-col-sno">${index + 1}</div>
                            <div class="guest-name-cell">
                                <h4 class="guest-name-text">${guest.name || '-'}</h4>
                            </div>
                            <div class="guest-phone-cell">
                                <i data-lucide="phone"></i> <span>${guest.phone || '-'}</span>
                            </div>
                            <div class="guest-events-count">
                                ${guest.invited_events?.length || 0}
                            </div>
                            ${canConfig ? `<div>${getWhatsAppButton(guest)}</div>` : ''}
                        </div>
                    </div>
                `;
            });

            groupHTML += `
                        </div>
                    </div>
                </div>
            `;
        });

        groupHTML += `</div>`;
        content.innerHTML = groupHTML;

        // Accordion click bindings
        content.querySelectorAll('.variant-accordion-toggle').forEach(headerEl => {
            headerEl.addEventListener('click', () => {
                const targetId = headerEl.getAttribute('data-target');
                const bodyEl = document.getElementById(targetId);
                const icon = headerEl.querySelector('.variant-accordion-icon');
                if (!bodyEl) return;

                const isClosed = bodyEl.style.display === 'none';
                bodyEl.style.display = isClosed ? 'block' : 'none';
                if (icon) {
                    icon.style.transform = isClosed ? 'rotate(0deg)' : 'rotate(-90deg)';
                }
            });
        });

        setTimeout(() => {
            if (canConfig) {
                const editBtns = content.querySelectorAll('.edit-guest-btn');
                editBtns.forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        window.openEditGuestModal(wedding.id, btn.getAttribute('data-id'), variants);
                    });
                });
            }

            if (window.lucide) window.lucide.createIcons();
        }, 0);
    }
    
    setTimeout(() => {
        renderGuests();
        
        const searchInput = section.querySelector('#guestSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                searchQuery = e.target.value;
                renderGuests();
            });
        }

        if (canConfig) {
            const trigger = section.querySelector('#addGuestBtnTrigger');
            if (trigger) {
                trigger.replaceWith(trigger.cloneNode(true));
                section.querySelector('#addGuestBtnTrigger').addEventListener('click', () => window.openGuestModal(wedding.id, variants));
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
    const primaryBtn = allBtns.find(b => ['Add', 'Edit', 'Update', 'Create', 'Apply Variant'].includes(b.textContent.trim()));

    if (cancelBtn) {
        cancelBtn.classList.add('modal-btn-cancel');
        cancelBtn.style.order = '1';
        cancelBtn.style.flexShrink = '0';
        cancelBtn.style.margin = '0';
    }

    if (closeBtn) {
        closeBtn.classList.remove('modal-btn-cancel');
        closeBtn.classList.add('wedding-action-btn-primary');
        closeBtn.style.order = '1';
        closeBtn.style.marginLeft = 'auto';
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
        primaryBtn.style.marginLeft = (isEditModal && deleteBtn) ? '0' : 'auto';
        primaryBtn.style.whiteSpace = 'nowrap';
    }

    const container = cancelBtn?.parentElement || closeBtn?.parentElement;
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
function convertToSearchableDropdown(selectId, onSelectCallback = null) {
    const select = document.getElementById(selectId);
    if (!select) return;

    select.style.display = 'none';

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'position: relative; width: 100%; text-align: left; font-family: inherit; box-sizing: border-box;';
    select.parentNode.insertBefore(wrapper, select);

    const initialValid = select.value !== "";
    const displayBorder = initialValid ? '1px solid #16a34a' : (select.hasAttribute('required') ? '1px solid #dc2626' : '1px solid var(--color-border, #292524)');

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
    dropdownMenu.style.cssText = 'width: 100%; background: var(--color-bg, #0c0a09); border: 1px solid var(--color-border, #292524); border-radius: var(--radius-sm, 4px); display: none; box-shadow: 0 4px 12px rgba(0,0,0,0.3); margin-top: 6px; padding: 8px; flex-direction: column; gap: 8px; box-sizing: border-box; position: absolute; z-index: 9999; top: 100%; left: 0;';
    
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
            displayText.textContent = options[0]?.text || '-- Select --';
            displayText.style.color = 'var(--color-text-secondary, #a1a1aa)';
            displayBox.style.borderColor = select.hasAttribute('required') ? '#dc2626' : 'var(--color-border, #292524)';
        }
    }

    function renderList(filter = '') {
        optionsList.innerHTML = '';
        const filtered = options.filter(opt => opt.text.toLowerCase().includes(filter.toLowerCase()));

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
                if (typeof onSelectCallback === 'function') {
                    onSelectCallback(opt.value);
                }
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
// SYSTEM USER MODAL (FIXED LAYOUT & PADDING)
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
        <form id="sysUserForm" novalidate class="wedding-details-modal-form" style="min-height: 220px; overflow: visible !important;">
            <div style="position: relative; width: 100%;">
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
// VARIANT MODALS (CREATE/EDIT & MULTI-ASSIGN)
// ==========================================
export function openVariantModal(weddingId, events = [], existingVariant = null) {
    const sortedEvents = [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const selectedIds = existingVariant?.selected_event_ids || [];

    const eventCheckboxes = sortedEvents.map(ev => `
        <label class="wedding-modal-checkbox-label">
            <input type="checkbox" name="variant_events" value="${ev.id}" ${selectedIds.includes(ev.id) ? 'checked' : ''}>
            ${ev.event_name || ev.title} (${new Date(ev.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})
        </label>
    `).join('') || `<div class="wedding-details-host-empty">No events scheduled for this wedding yet.</div>`;

    const formHTML = `
        <form id="variantForm" novalidate class="wedding-details-modal-form">
            <div>
                <label class="wedding-modal-label">Variant Name *</label>
                <input type="text" id="variantName" value="${(existingVariant?.variant_name || '').replace(/"/g, '&quot;')}" required placeholder="e.g., Reception Only, Close Family" class="wedding-modal-input ${existingVariant ? 'wedding-modal-input--valid' : 'wedding-modal-input--invalid'}">
            </div>
            <div>
                <label class="wedding-modal-label">Include Events *</label>
                <div class="wedding-modal-checkbox-box">
                    ${eventCheckboxes}
                </div>
            </div>
        </form>
    `;

    const actions = [
        { label: "Cancel", variant: "ghost" },
        ...(existingVariant ? [{
            label: "Delete",
            variant: "danger",
            closesModal: false,
            onClick: async () => {
                const res = await Swal.fire({
                    title: 'Delete Variant?',
                    text: "Guests assigned to this variant will be unassigned.",
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonColor: '#dc2626',
                    cancelButtonColor: '#6b7280',
                    confirmButtonText: 'Yes, delete it!'
                });
                if (res.isConfirmed) {
                    await supabase.from('invite_variants').delete().eq('id', existingVariant.id);
                    modal.close();
                    broadcastWeddingDataUpdated();
                    showSweetAlert('success', 'Deleted!', 'Variant removed.');
                }
            }
        }] : []),
        {
            label: existingVariant ? "Update" : "Create",
            variant: "primary",
            closesModal: false,
            onClick: async () => {
                const name = document.getElementById('variantName').value.trim();
                const selected = Array.from(document.querySelectorAll('input[name="variant_events"]:checked')).map(cb => cb.value);

                if (!name) {
                    showSweetAlert('error', 'Missing Information', 'Please provide a variant name.');
                    return;
                }
                if (selected.length === 0) {
                    showSweetAlert('error', 'Missing Events', 'Please select at least one event.');
                    return;
                }

                try {
                    if (existingVariant) {
                        const { error } = await supabase.from('invite_variants').update({
                            variant_name: name,
                            selected_event_ids: selected
                        }).eq('id', existingVariant.id);
                        if (error) throw error;
                    } else {
                        const { error } = await supabase.from('invite_variants').insert([{
                            wedding_id: weddingId,
                            variant_name: name,
                            selected_event_ids: selected
                        }]);
                        if (error) throw error;
                    }

                    modal.close();
                    broadcastWeddingDataUpdated();
                    showSweetAlert('success', existingVariant ? 'Updated!' : 'Created!', 'Variant saved successfully.');
                } catch (err) {
                    showSweetAlert('error', 'Database Error', err.message);
                }
            }
        }
    ];

    const modal = openModal({
        title: existingVariant ? "Edit Invite Variant" : "Create Invite Variant",
        content: formHTML,
        actions: actions
    });

    setTimeout(() => {
        layoutDetailsModalFooter(!!existingVariant);
        const nameInput = document.getElementById('variantName');
        if (nameInput) {
            nameInput.addEventListener('input', () => {
                nameInput.classList.toggle('wedding-modal-input--invalid', !nameInput.value.trim());
                nameInput.classList.toggle('wedding-modal-input--valid', !!nameInput.value.trim());
            });
        }
    }, 50);
}

export function openAssignVariantModal(variantId, variantName, guests = []) {
    const sortedGuests = [...guests].sort((a, b) => 
        (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })
    );
    let filteredList = [...sortedGuests];

    const listMarkup = (items) => items.map(g => {
        const isCurrentlyAssigned = g.variant_id === variantId;
        const currentTag = g.variant_name && g.variant_name !== 'No Variant Assigned' ? `<span class="guest-assign-current-tag">${g.variant_name}</span>` : '';
        return `
            <label class="guest-assign-item">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <input type="checkbox" name="assign_guest" value="${g.id}" ${isCurrentlyAssigned ? 'checked' : ''} style="accent-color: var(--color-primary);">
                    <span style="font-size: 0.85rem; color: var(--color-text-primary); font-weight: 500;">${g.name} (${g.phone || 'No phone'})</span>
                </div>
                ${currentTag}
            </label>
        `;
    }).join('');

    const formHTML = `
        <div style="display: flex; flex-direction: column; gap: 12px; font-family: inherit;">
            <p style="margin: 0; font-size: 0.85rem; color: var(--color-text-secondary);">
                Select guests to assign to the <strong style="color: var(--color-primary);">${variantName}</strong> variant. Assigning will overwrite any existing variant.
            </p>
            <input type="text" id="assignSearchInput" placeholder="Filter guests..." class="wedding-modal-input" style="height: 34px;">
            <div id="assignGuestsContainer" class="guest-assign-list">
                ${listMarkup(filteredList)}
            </div>
        </div>
    `;

    const modal = openModal({
        title: `Assign Guests: ${variantName}`,
        content: formHTML,
        actions: [
            { label: "Cancel", variant: "ghost" },
            {
                label: "Apply Variant",
                variant: "primary",
                closesModal: false,
                onClick: async () => {
                    const selectedGuestIds = Array.from(document.querySelectorAll('input[name="assign_guest"]:checked')).map(cb => cb.value);

                    // Check if any selected guest is already assigned to a different variant
                    const guestsWithOtherVariant = sortedGuests.filter(g => 
                        selectedGuestIds.includes(g.id) && g.variant_id && g.variant_id !== variantId
                    );

                    if (guestsWithOtherVariant.length > 0) {
                        const confirmRes = await Swal.fire({
                            title: 'Overwrite Existing Variant?',
                            text: `${guestsWithOtherVariant.length} of the selected guest(s) are already assigned to another variant. Do you want to overwrite their assignment?`,
                            icon: 'warning',
                            showCancelButton: true,
                            confirmButtonColor: 'var(--color-primary, #eab308)',
                            cancelButtonColor: '#6b7280',
                            confirmButtonText: 'Yes, overwrite!'
                        });
                        if (!confirmRes.isConfirmed) return;
                    }

                    try {
                        if (selectedGuestIds.length > 0) {
                            const { error: assignErr } = await supabase
                                .from('guests')
                                .update({ variant_id: variantId })
                                .in('id', selectedGuestIds);
                            if (assignErr) throw assignErr;
                        }

                        const unselectedIds = sortedGuests
                            .filter(g => g.variant_id === variantId && !selectedGuestIds.includes(g.id))
                            .map(g => g.id);

                        if (unselectedIds.length > 0) {
                            const { error: unassignErr } = await supabase
                                .from('guests')
                                .update({ variant_id: null })
                                .in('id', unselectedIds);
                            if (unassignErr) throw unassignErr;
                        }

                        modal.close();
                        broadcastWeddingDataUpdated();
                        showSweetAlert('success', 'Assigned!', `Updated guest variant assignments.`);
                    } catch (err) {
                        showSweetAlert('error', 'Error', err.message);
                    }
                }
            }
        ]
    });

    setTimeout(() => {
        layoutDetailsModalFooter(false);
        const search = document.getElementById('assignSearchInput');
        const container = document.getElementById('assignGuestsContainer');
        if (search && container) {
            search.addEventListener('input', (e) => {
                const query = e.target.value.toLowerCase();
                const matched = sortedGuests.filter(g => (g.name || '').toLowerCase().includes(query) || (g.phone || '').includes(query));
                container.innerHTML = listMarkup(matched);
            });
        }
    }, 50);
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
            <div>
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
                <textarea id="eventDescription" rows="3" required placeholder="An auspicious start to our wedding celebrations..." class="wedding-modal-input wedding-modal-input--invalid"></textarea>
            </div>
            
            <div class="wedding-modal-row">
                <div class="wedding-modal-col">
                    <label class="wedding-modal-label">Date *</label>
                    <input type="date" id="eventDate" min="${minDate}" max="${maxDate}" 
                        onclick="try{this.showPicker()}catch(e){}" 
                        onkeydown="if(event.key !== 'Tab' && event.key !== 'Shift') event.preventDefault();" 
                        onpaste="return false;" 
                        required class="wedding-modal-input wedding-modal-input--invalid">
                </div>
                <div class="wedding-modal-col">
                    <label class="wedding-modal-label">Time *</label>
                    <input type="time" id="eventTime" onclick="try{this.showPicker()}catch(e){}" required class="wedding-modal-input wedding-modal-input--invalid">
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

    const applyTemplateData = (selectedId) => {
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
                el.classList.toggle('wedding-modal-input--invalid', !el.value.trim());
                el.classList.toggle('wedding-modal-input--valid', !!el.value.trim());
            }
        });
    };

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
        convertToSearchableDropdown('eventTemplateSelect', applyTemplateData);

        const templateSelect = document.getElementById('eventTemplateSelect');
        if (templateSelect) {
            templateSelect.addEventListener('change', (e) => applyTemplateData(e.target.value));
        }

        ['eventName', 'eventDisplayTitle', 'eventOneLiner', 'eventDescription', 'eventDate', 'eventTime', 'eventVenue', 'eventVenueMapLink'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                const updateValidity = () => {
                    el.classList.toggle('wedding-modal-input--invalid', !el.value.trim());
                    el.classList.toggle('wedding-modal-input--valid', !!el.value.trim());
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
            <div>
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
                <textarea id="editEventDescription" rows="3" required class="wedding-modal-input wedding-modal-input--valid"></textarea>
            </div>
            
            <div class="wedding-modal-row">
                <div class="wedding-modal-col">
                    <label class="wedding-modal-label">Date *</label>
                    <input type="date" id="editEventDate" value="${ev.date}" min="${minDate}" max="${maxDate}" 
                        onclick="try{this.showPicker()}catch(e){}" 
                        onkeydown="if(event.key !== 'Tab' && event.key !== 'Shift') event.preventDefault();" 
                        onpaste="return false;" 
                        required class="wedding-modal-input wedding-modal-input--valid">
                </div>
                <div class="wedding-modal-col">
                    <label class="wedding-modal-label">Time *</label>
                    <input type="time" id="editEventTime" value="${timeValue}" onclick="try{this.showPicker()}catch(e){}" required class="wedding-modal-input wedding-modal-input--valid">
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

    const applyEditTemplateData = (selectedId) => {
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
                el.classList.toggle('wedding-modal-input--invalid', !el.value.trim());
                el.classList.toggle('wedding-modal-input--valid', !!el.value.trim());
            }
        });
    };

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
        convertToSearchableDropdown('editTemplateSelect', applyEditTemplateData);

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
            templateSelect.addEventListener('change', (e) => applyEditTemplateData(e.target.value));
        }

        ['editEventName', 'editEventDisplayTitle', 'editEventOneLiner', 'editEventDescription', 'editEventDate', 'editEventTime', 'editEventVenue', 'editEventVenueMapLink'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                const updateValidity = () => {
                    el.classList.toggle('wedding-modal-input--invalid', !el.value.trim());
                    el.classList.toggle('wedding-modal-input--valid', !!el.value.trim());
                };
                updateValidity();
                el.addEventListener('input', updateValidity);
                el.addEventListener('change', updateValidity);
            }
        });
    }, 50);
};

// ==========================================
// GUEST MODALS (LINKED VIA VARIANT)
// ==========================================
window.openGuestModal = function(weddingId, variants = []) {
    const variantOptions = (variants || []).map(v => `<option value="${v.id}">${v.variant_name}</option>`).join('');

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
            <div>
                <label class="wedding-modal-label">Assign Variant (Optional)</label>
                <select id="guestVariantId" class="wedding-modal-input">
                    <option value="">-- No Variant (Default) --</option>
                    ${variantOptions}
                </select>
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
                    const nameEl = document.getElementById('guestName');
                    const phoneEl = document.getElementById('guestPhone');
                    const variantId = document.getElementById('guestVariantId').value || null;

                    if (!nameEl.value.trim() || !phoneEl.value.trim()) {
                        showSweetAlert('error', 'Missing Information', 'Please fill out all mandatory fields.');
                        return;
                    }

                    const phoneInput = phoneEl.value.trim();
                    const cleanedInputNormalized = normalizePhone(phoneInput);

                    try {
                        const { data: existingGuests, error: fetchErr } = await supabase.from('guests').select('*').eq('wedding_id', weddingId);
                        if (fetchErr) throw fetchErr;

                        const matchingGuest = existingGuests.find(g => normalizePhone(g.phone) === cleanedInputNormalized);

                        if (matchingGuest) {
                            const { error: updateErr } = await supabase
                                .from('guests')
                                .update({
                                    name: nameEl.value.trim(),
                                    phone: phoneInput,
                                    variant_id: variantId
                                })
                                .eq('id', matchingGuest.id);
                            if (updateErr) throw updateErr;
                        } else {
                            const { error: insertError } = await supabase.from('guests').insert([{ 
                                wedding_id: weddingId,
                                name: nameEl.value.trim(),
                                phone: phoneInput,
                                variant_id: variantId,
                                invite_code: generateInviteCode()
                            }]);
                            if (insertError) throw insertError;
                        }

                        modal.close();
                        broadcastWeddingDataUpdated();
                        showSweetAlert('success', matchingGuest ? 'Updated!' : 'Added!', `Guest saved successfully.`);
                    } catch (error) {
                        showSweetAlert('error', 'Database Error', error.message);
                    }
                }
            }
        ]
    });

    setTimeout(() => {
        layoutDetailsModalFooter(false);
        convertToSearchableDropdown('guestVariantId');
        ['guestName', 'guestPhone'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                const updateValidity = () => {
                    el.classList.toggle('wedding-modal-input--invalid', !el.value.trim());
                    el.classList.toggle('wedding-modal-input--valid', !!el.value.trim());
                };
                updateValidity();
                el.addEventListener('input', updateValidity);
            }
        });
    }, 50);
};

window.openEditGuestModal = async function(weddingId, guestId, variants = []) {
    let guest = null;
    try {
        const { data, error } = await supabase.from('guests').select('*').eq('id', guestId).single();
        if (error) throw error;
        guest = data;
    } catch (e) {
        showSweetAlert('error', 'Error', 'Failed to load guest data.');
        return;
    }

    const variantOptions = (variants || []).map(v => 
        `<option value="${v.id}" ${guest.variant_id === v.id ? 'selected' : ''}>${v.variant_name}</option>`
    ).join('');

    const formHTML = `
        <form id="editGuestForm" novalidate class="wedding-details-modal-form">
            <div>
                <label class="wedding-modal-label">Guest Name *</label>
                <input type="text" id="editGuestName" value="${(guest.name || '').replace(/"/g, '&quot;')}" required class="wedding-modal-input wedding-modal-input--valid">
            </div>
            <div>
                <label class="wedding-modal-label">Phone Number *</label>
                <input type="text" id="editGuestPhone" value="${guest.phone || ''}" required class="wedding-modal-input wedding-modal-input--valid">
            </div>
            <div>
                <label class="wedding-modal-label">Assign Variant</label>
                <select id="editGuestVariantId" class="wedding-modal-input">
                    <option value="">-- No Variant (Default) --</option>
                    ${variantOptions}
                </select>
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
                    const name = document.getElementById('editGuestName').value.trim();
                    const phone = document.getElementById('editGuestPhone').value.trim();
                    const variantId = document.getElementById('editGuestVariantId').value || null;

                    if (!name || !phone) {
                        showSweetAlert('error', 'Missing Information', 'Please fill out all mandatory fields.');
                        return;
                    }

                    try {
                        const { error } = await supabase.from('guests').update({ 
                            name: name,
                            phone: phone,
                            variant_id: variantId
                        }).eq('id', guest.id);
                        
                        if (error) throw error;

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
        convertToSearchableDropdown('editGuestVariantId');
    }, 50);
};

// ==========================================
// IMPORT & SAMPLE MODAL (WITH VARIANT MATCHING)
// ==========================================
window.openImportModal = function(weddingId) {
    const dialogHTML = `
        <div class="wedding-import-modal-wrap">
            <p class="wedding-import-modal-desc">
                Upload an Excel file (<code>.xlsx, .xls</code>) to batch add or update your guest list with assigned variants.
            </p>
            <div class="wedding-import-modal-buttons">
                <button id="modalDownloadSampleBtn" class="wedding-action-btn-primary wedding-import-modal-btn">
                    <i data-lucide="download"></i> Download Sample Excel (.xlsx)
                </button>
                <button id="modalSelectFileBtn" class="wedding-action-btn-primary wedding-import-modal-btn">
                    <i data-lucide="upload"></i> Select Excel File to Import
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

        document.getElementById('modalDownloadSampleBtn')?.addEventListener('click', () => {
            window.downloadSampleExcel();
        });

        document.getElementById('modalSelectFileBtn')?.addEventListener('click', () => {
            modal.close();
            window.triggerCSVImport(weddingId);
        });
    }, 50);
};

window.downloadSampleExcel = async function() {
    try {
        const XLSX = await ensureXLSXLoaded();
        const variants = window.__currentVariants || [];
        const variantNames = variants.map(v => v.variant_name);
        
        const headers = ["Name", "Phone Number", "Variant"];
        const sampleRows = [];
        const firstNames = ["Aarav", "Vihaan", "Aditya", "Sai", "Arjun", "Siddharth", "Rohan", "Kabir", "Dhruv", "Aryan", "Ananya", "Diya", "Isha", "Kavya", "Mira", "Neha", "Pooja", "Riya", "Sanya", "Tara"];
        const lastNames = ["Bafna", "Jain", "Shah", "Patel", "Mehta", "Desai", "Parekh", "Kothari", "Doshi", "Gandhi"];
        
        const usedPhones = new Set();

        for (let i = 0; i < 20; i++) {
            const name = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
            let phone;
            do {
                phone = "9" + Math.floor(100000000 + Math.random() * 900000000).toString();
            } while (usedPhones.has(phone));
            usedPhones.add(phone);

            const assignedVariant = variantNames.length > 0 && Math.random() > 0.3 
                ? variantNames[Math.floor(Math.random() * variantNames.length)] 
                : "";

            sampleRows.push([name, phone, assignedVariant]);
        }

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
        ws['!cols'] = [{ wch: 25 }, { wch: 18 }, { wch: 22 }];

        XLSX.utils.book_append_sheet(wb, ws, "Guest List");
        XLSX.writeFile(wb, "Sample_Guest_Import.xlsx");
    } catch (err) {
        showSweetAlert('error', 'Export Error', err.message);
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
                    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                    const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

                    if (rawRows.length === 0) throw new Error("The Excel file is empty.");

                    const getCellValue = (row, keyPatterns) => {
                        const rowKeys = Object.keys(row);
                        for (const pattern of keyPatterns) {
                            const matchedKey = rowKeys.find(k => k.trim().toLowerCase() === pattern.toLowerCase());
                            if (matchedKey !== undefined && row[matchedKey] !== undefined) {
                                return row[matchedKey].toString().trim();
                            }
                        }
                        return "";
                    };

                    const { data: variants, error: varErr } = await supabase
                        .from('invite_variants')
                        .select('id, variant_name')
                        .eq('wedding_id', weddingId);
                    if (varErr) throw varErr;

                    const validRows = [];
                    const invalidVariantRows = [];

                    rawRows.forEach((row, idx) => {
                        const name = getCellValue(row, ['Name', 'Guest Name', 'Full Name']);
                        const phone = getCellValue(row, ['Phone Number', 'Phone', 'Mobile', 'Mobile Number', 'Contact']);
                        const variantCol = getCellValue(row, ['Variant', 'Variant Name', 'Invite Variant', 'Assigned Variant']);

                        if (!name && !phone) return;

                        let vId = null;
                        if (variantCol && 
                            variantCol.toLowerCase() !== 'no variant assigned' && 
                            variantCol.toLowerCase() !== 'none' &&
                            variantCol.toLowerCase() !== 'no variant') {
                            
                            const match = variants?.find(v => v.variant_name.trim().toLowerCase() === variantCol.toLowerCase());
                            if (match) {
                                vId = match.id;
                            } else {
                                invalidVariantRows.push({
                                    rowNumber: idx + 2,
                                    guestName: name || `Row ${idx + 2}`,
                                    variantName: variantCol
                                });
                            }
                        }

                        validRows.push({ name, phone, variantId: vId });
                    });

                    if (validRows.length === 0) {
                        showSweetAlert('info', 'No Data', 'No valid guest records found in the sheet.');
                        return;
                    }

                    Swal.fire({ 
                        title: 'Importing Guests...', 
                        text: 'Please wait while we sync your guests with the database.', 
                        allowOutsideClick: false, 
                        didOpen: () => Swal.showLoading() 
                    });

                    const { data: existingGuests, error: guestsErr } = await supabase
                        .from('guests')
                        .select('*')
                        .eq('wedding_id', weddingId);
                    if (guestsErr) throw guestsErr;
                    
                    const seenNormalized = new Set();
                    let importedCount = 0;

                    for (const { name, phone, variantId } of validRows) {
                        if (!name || !phone) continue;
                        const cleanedNormalized = normalizePhone(phone);
                        if (!cleanedNormalized || seenNormalized.has(cleanedNormalized)) continue;
                        seenNormalized.add(cleanedNormalized);

                        const existing = existingGuests?.find(g => normalizePhone(g.phone) === cleanedNormalized);

                        if (existing) {
                            await supabase.from('guests').update({
                                name: name,
                                phone: phone,
                                variant_id: variantId
                            }).eq('id', existing.id);
                        } else {
                            await supabase.from('guests').insert([{
                                wedding_id: weddingId,
                                name: name,
                                phone: phone,
                                variant_id: variantId,
                                invite_code: generateInviteCode()
                            }]);
                        }
                        importedCount++;
                    }

                    broadcastWeddingDataUpdated();

                    if (invalidVariantRows.length > 0) {
                        const errorListHTML = invalidVariantRows.map(err => 
                            `<li style="margin-bottom: 4px;"><strong>Row ${err.rowNumber} (${err.guestName}):</strong> Variant "<em>${err.variantName}</em>" not found (set to No Variant).</li>`
                        ).join('');

                        await Swal.fire({
                            icon: 'warning',
                            title: 'Import Completed with Warnings',
                            html: `
                                <div style="text-align: left; font-size: 0.85rem; max-height: 220px; overflow-y: auto;">
                                    <p style="margin-bottom: 8px;"><strong>${importedCount}</strong> guests were processed successfully.</p>
                                    <p style="margin-bottom: 6px; color: #facc15;">The following guests had non-existent variants and were imported without a variant:</p>
                                    <ul style="padding-left: 18px; margin: 0; color: #f87171;">
                                        ${errorListHTML}
                                    </ul>
                                </div>
                            `,
                            confirmButtonColor: 'var(--color-primary, #eab308)',
                            confirmButtonText: 'Understood'
                        });
                    } else {
                        showSweetAlert('success', 'Import Complete!', `${importedCount} guests imported successfully.`);
                    }

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