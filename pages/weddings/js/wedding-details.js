import { supabase } from '../../../database/js/api.js';
import { openModal } from '../../../global/components/js/modal.js';
import { showAlert } from '../../../global/components/js/alerts.js';

// SIMULATED AUTH CONTEXT
const currentUser = {
    id: "creator_paresh",
    role: "creator" // 'creator', 'host', or 'guest'
};  

// ==========================================
// MAIN RENDER FUNCTION
// ==========================================
export function renderWeddingDetails(weddingId) {
    const wrapper = document.createElement("div");
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
// ASYNC DATA FETCHER
// ==========================================
async function loadCommandCenterData(container, weddingId) {
    try {
        const { data: wedding, error: weddingError } = await supabase.from('weddings').select('*').eq('id', weddingId).single();
        if (weddingError) throw weddingError;

        let eventsQuery = supabase.from('events').select('*').eq('wedding_id', weddingId);
        const { data: guests, error: guestsError } = await supabase.from('guests').select('*').eq('wedding_id', weddingId);
        if (guestsError) throw guestsError;

        const { data: eventGuests, error: egError } = await supabase.from('event_guests').select('*');
        if (egError && egError.code !== '42P01') throw egError;

        if (guests && eventGuests) {
            guests.forEach(g => {
                g.invited_events = eventGuests.filter(eg => eg.guest_id === g.id).map(eg => eg.event_id);
            });
        }

        // Filter events for guests based on invited events
        let filteredEvents = [];
        const { data: allEvents, error: eventsError } = await eventsQuery;
        if (eventsError) throw eventsError;

        if (currentUser.role === 'guest') {
            const currentGuest = guests?.find(g => g.phone === currentUser.phone);
            const invitedEventIds = currentGuest ? currentGuest.invited_events : [];
            filteredEvents = allEvents ? allEvents.filter(e => invitedEventIds.includes(e.id)) : [];
        } else {
            filteredEvents = allEvents || [];
        }

        container.innerHTML = "";
        
        container.appendChild(buildSpecificHeader(wedding));
        
        const statsSection = buildSpecificStats(wedding, filteredEvents.length, guests?.length || 0);
        if (statsSection) container.appendChild(statsSection);
        
        container.appendChild(buildEventItinerarySection(wedding, filteredEvents));

        const guestSection = buildGuestListSection(wedding, guests, allEvents);
        if (guestSection) container.appendChild(guestSection);

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
        hashtagHTML = `<div style="margin-top: var(--space-3);"><span style="background: var(--color-primary); color: var(--color-text-on-accent); padding: 4px 12px; border-radius: 16px; font-size: var(--font-size-sm); font-weight: var(--font-weight-medium); letter-spacing: 0.5px;">${formattedHashtag}</span></div>`;
    }

    let instagramHTML = '';
    if (wedding.instagram) {
        let igUrl = wedding.instagram.startsWith('http') ? wedding.instagram : `https://instagram.com/${wedding.instagram.replace('@', '')}`;
        // Using inline SVG to guarantee visibility
        instagramHTML = `
            <a href="${igUrl}" target="_blank" style="background: var(--color-border); color: var(--color-primary); width: 44px; height: 44px; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; text-decoration: none; flex-shrink: 0; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'" title="Instagram">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
            </a>
        `;
    }

    header.innerHTML = `
        <div>
            <h1 style="font-size: var(--font-size-3xl); font-weight: var(--font-weight-bold); color: var(--color-text-primary); margin: 0;">${displayNames}</h1>
            <p style="color: var(--color-text-secondary); margin: var(--space-2) 0 0 0; font-size: var(--font-size-base);">Date: <strong style="color: var(--color-primary);">${formatWeddingDateRange(wedding.start_date, wedding.end_date)}</strong></p>
            ${hashtagHTML}
        </div>
        ${instagramHTML}
    `;
    return header;
}

// ==========================================
// 2. STATS SECTION (Family Row Above, Rest Below)
// ==========================================
function buildSpecificStats(wedding, eventsCount = 0, guestsCount = 0) {
    const isOwnerOrCreator = currentUser.role === 'creator' || currentUser.role === 'host';

    const formatWithNewlines = (text) => {
        if (!text) return '';
        return text.replace(/[,;]\s*/g, '<br>');
    };

    const container = document.createElement("div");
    container.style.cssText = "display: flex; flex-direction: column; gap: var(--space-6); margin-bottom: var(--space-8);";

    // Top Row: Family Name (flex: 1) and Family Details (flex: 2)
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

    // Bottom Row: Contact Details, Guests, Events Grid
    const bottomGrid = document.createElement("div");
    bottomGrid.style.cssText = "display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: var(--space-6);";

    let bottomCardsHTML = '';
    let contactRowsHTML = '';

    // Render Contact Details as a list with Call Buttons
    if (wedding.contact_details) {
        const parts = wedding.contact_details.split(/[,;]\s*/);
        contactRowsHTML += parts.map(part => {
            let name = part, num = '';
            if (part.includes(' - ')) {
                [name, num] = part.split(' - ');
            } else if (part.includes('(') && part.includes(')')) {
                name = part.substring(0, part.indexOf('(')).trim();
                num = part.substring(part.indexOf('(') + 1, part.indexOf(')')).trim();
            }

            if (num) {
                return `
                <div style="display: flex; align-items: center; justify-content: space-between; margin-top: var(--space-3); padding-top: var(--space-3); border-top: 1px solid var(--color-border);">
                    <span style="color: var(--color-text-primary); font-size: var(--font-size-lg); font-weight: var(--font-weight-bold);">${name} - ${num}</span>
                    <a href="tel:${num.replace(/[^0-9+]/g, '')}" style="background: var(--color-border); color: var(--color-primary); width: 36px; height: 36px; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; text-decoration: none; flex-shrink: 0; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'" title="Call ${name}">
                        <i data-lucide="phone" style="width: 18px; height: 18px;"></i>
                    </a>
                </div>`;
            } else {
                return `
                <div style="margin-top: var(--space-3); padding-top: var(--space-3); border-top: 1px solid var(--color-border);">
                    <span style="color: var(--color-text-primary); font-size: var(--font-size-lg); font-weight: var(--font-weight-bold);">${name}</span>
                </div>`;
            }
        }).join('');
    }

    // Wrap Contacts if data exists
    if (contactRowsHTML) {
        bottomCardsHTML += `
        <div class="stat-card" style="padding: var(--space-5); display: flex; flex-direction: column; justify-content: center; background: var(--color-white); border: 1px solid var(--color-border); border-radius: var(--radius-lg);">
            <p style="color: var(--color-text-secondary); font-size: var(--font-size-sm); margin: 0; font-weight: var(--font-weight-medium);">Contact Details</p>
            ${contactRowsHTML}
        </div>`;
    }

    if (isOwnerOrCreator) {
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
function buildEventItinerarySection(wedding, events) {
    const section = document.createElement("div");
    section.style.cssText = "background: var(--color-white); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-5); margin-bottom: var(--space-6);";
    
    const canEdit = currentUser.role === 'creator' || currentUser.role === 'host';

    if (canEdit) {
        const headerRow = document.createElement("div");
        headerRow.style.cssText = "display: flex; justify-content: center; margin-bottom: var(--space-5); border-bottom: 1px solid var(--color-border); padding-bottom: var(--space-4);";

        const addBtn = document.createElement("button");
        addBtn.innerHTML = `<i data-lucide="plus" style="width:16px; height:16px; margin-right:4px;"></i> Event`;
        addBtn.style.cssText = "background: var(--color-primary); color: var(--color-text-on-accent); border: none; padding: 0.5rem 1.25rem; border-radius: var(--radius-sm); font-weight: var(--font-weight-semibold); cursor: pointer; font-size: var(--font-size-sm); display: flex; align-items: center;";
        addBtn.onclick = () => openEventModal(wedding.id, wedding.start_date, wedding.end_date);
        
        headerRow.appendChild(addBtn);
        section.appendChild(headerRow);
    }

    const content = document.createElement("div");
    
    if (!events || events.length === 0) {
        content.innerHTML = `<div style="text-align: center; padding: var(--space-6); color: var(--color-text-muted); border: 1px dashed var(--color-border); border-radius: var(--radius-sm);">No events scheduled yet.</div>`;
    } else {
        content.style.cssText = "display: flex; flex-direction: column; gap: var(--space-6);";
        
        const sortedEvents = [...events].sort((a, b) => {
            const timeA = new Date(a.start_time || a.date).getTime();
            const timeB = new Date(b.start_time || b.date).getTime();
            return timeA - timeB;
        });

        const groupedEvents = sortedEvents.reduce((groups, ev) => {
            const dateObj = new Date(ev.date);
            const dateString = isNaN(dateObj) ? ev.date : dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
            
            if (!groups[dateString]) groups[dateString] = [];
            groups[dateString].push(ev);
            return groups;
        }, {});

        let htmlContent = '';
        
        for (const [dateLabel, dayEvents] of Object.entries(groupedEvents)) {
            htmlContent += `
                <div class="event-date-group">
                    <h3 style="font-size: 1.1rem; font-weight: var(--font-weight-bold); color: var(--color-text-primary); margin: 0 0 var(--space-4) 0; border-bottom: 1px solid var(--color-border); padding-bottom: var(--space-2);">
                        <i data-lucide="calendar-days" style="width: 18px; height: 18px; vertical-align: text-bottom; margin-right: 6px; color: var(--color-primary);"></i>${dateLabel}
                    </h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: var(--space-5);">
            `;

            htmlContent += dayEvents.map(ev => {
                const timeString = ev.start_time ? (() => {
                    const d = new Date(ev.start_time);
                    if (!isNaN(d)) {
                        let h = d.getHours();
                        const m = String(d.getMinutes()).padStart(2, '0');
                        const ampm = h >= 12 ? 'PM' : 'AM';
                        h = h % 12 || 12;
                        return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
                    } else {
                        const timePart = ev.start_time.includes('T') ? ev.start_time.split('T')[1] : ev.start_time;
                        const [hoursStr, minutesStr] = timePart.split(':');
                        let h = parseInt(hoursStr, 10);
                        const m = minutesStr || '00';
                        const ampm = h >= 12 ? 'PM' : 'AM';
                        h = h % 12 || 12;
                        return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
                    }
                })() : '';

                const cardClass = canEdit ? 'event-card' : '';
                const cursorStyle = canEdit ? 'cursor: pointer;' : 'cursor: default;';
                const hoverStyle = canEdit ? `onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.05)';" onmouseout="this.style.transform='none'; this.style.boxShadow='none';"` : '';
                const editIcon = canEdit ? `<i data-lucide="edit-2" style="width: 14px; height: 14px; color: var(--color-text-muted);"></i>` : '';

                return `
                        <div class="${cardClass}" data-event-id="${ev.id}" style="padding: var(--space-5); border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-bg); display: flex; flex-direction: column; gap: var(--space-3); transition: transform 0.2s ease, box-shadow 0.2s ease; ${cursorStyle}" ${hoverStyle}>
                            
                            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                <h4 style="margin: 0; font-size: 1.05rem; font-weight: var(--font-weight-bold); color: var(--color-text-primary);">${ev.title}</h4>
                                ${editIcon}
                            </div>
                            
                            <div style="display: flex; flex-direction: column; gap: 8px; color: var(--color-text-secondary); font-size: var(--font-size-sm); margin-top: auto;">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <div style="background: var(--color-border); color: var(--color-primary); width: 24px; height: 24px; border-radius: 4px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                        <i data-lucide="clock" style="width: 14px; height: 14px;"></i>
                                    </div>
                                    ${timeString}
                                </div>
                                
                                <div style="display: flex; align-items: flex-start; gap: 8px;">
                                    <div style="background: var(--color-border); color: var(--color-primary); width: 24px; height: 24px; border-radius: 4px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                        <i data-lucide="map-pin" style="width: 14px; height: 14px;"></i>
                                    </div>
                                    <span style="line-height: 1.4; padding-top: 2px;">${ev.venue}</span>
                                </div>
                            </div>
                            
                        </div>
                `;
            }).join('');

            htmlContent += `</div></div>`;
        }
        
        content.innerHTML = htmlContent;

        if (canEdit) {
            const eventCards = content.querySelectorAll('.event-card');
            eventCards.forEach(card => {
                card.addEventListener('click', () => {
                    const eventId = card.getAttribute('data-event-id');
                    const ev = events.find(e => e.id === eventId);
                    if(ev) window.openEditEventModal(wedding.id, wedding.start_date, wedding.end_date, ev);
                });
            });
        }
    }
    
    section.appendChild(content);
    return section;
}

// ==========================================
// 4. GUEST LIST SECTION (Hosts/Creators Only)
// ==========================================
function buildGuestListSection(wedding, guests, events) {
    const isOwnerOrCreator = currentUser.role === 'creator' || currentUser.role === 'host';
    if (!isOwnerOrCreator) return null;

    const section = document.createElement("div");
    section.style.cssText = "background: var(--color-white); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-5); margin-bottom: var(--space-6);";

    const controlsRow = document.createElement("div");
    controlsRow.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-5); border-bottom: 1px solid var(--color-border); padding-bottom: var(--space-4);";
    
    controlsRow.innerHTML = `
        <div style="flex: 1; display: flex; justify-content: flex-start;">
            <button onclick="triggerCSVImport('${wedding.id}')" style="background: var(--color-primary); color: var(--color-text-on-accent); border: none; padding: 0.5rem 1rem; border-radius: var(--radius-sm); cursor: pointer; font-size: var(--font-size-sm); display: flex; align-items: center;"><i data-lucide="upload" style="width:16px; height:16px; margin-right:4px;"></i> Import Guests</button>
        </div>
        <div style="flex: 1; display: flex; justify-content: center;">
            <button id="addGuestBtnTrigger" style="background: var(--color-primary); color: var(--color-text-on-accent); border: none; padding: 0.5rem 1.25rem; border-radius: var(--radius-sm); font-weight: var(--font-weight-semibold); cursor: pointer; font-size: var(--font-size-sm); display: flex; align-items: center;"><i data-lucide="plus" style="width:16px; height:16px; margin-right:4px;"></i> Guest</button>
        </div>
        <div style="flex: 1; display: flex; justify-content: flex-end;">
            <button onclick="downloadSampleExcel()" style="background: var(--color-primary); color: var(--color-text-on-accent); border: none; padding: 0.5rem 1rem; border-radius: var(--radius-sm); cursor: pointer; font-size: var(--font-size-sm); display: flex; align-items: center;"><i data-lucide="download" style="width:16px; height:16px; margin-right:4px;"></i> Sample File</button>
        </div>
    `;
    section.appendChild(controlsRow);

    const content = document.createElement("div");
    if (!guests || guests.length === 0) {
        content.innerHTML = `<div style="text-align: center; padding: var(--space-6); color: var(--color-text-muted); border: 1px dashed var(--color-border); border-radius: var(--radius-sm);">No guests added yet.</div>`;
    } else {
        const sortedGuests = [...guests].sort((a, b) => a.name.localeCompare(b.name));
        
        const gridTemplate = "32px 32px 50px 1fr 1fr 1fr"; 

        let listHTML = `
            <div style="display: grid; grid-template-columns: ${gridTemplate}; align-items: center; padding: 0 var(--space-4) var(--space-2) var(--space-4); border-bottom: 1px solid var(--color-border); margin-bottom: var(--space-2); color: var(--color-text-secondary); font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold); gap: 12px;">
                <div></div> 
                <div></div> 
                <div>S.No</div>
                <div>Name</div>
                <div>Phone Number</div>
                <div>Events Count</div>
            </div>
        `;

        listHTML += sortedGuests.map((guest, index) => {
            const guestEvents = events ? events.filter(e => guest.invited_events?.includes(e.id)) : [];
            const eventsTags = guestEvents.length > 0 
                ? guestEvents.map(e => `<span style="background: var(--color-border); padding: 4px 10px; border-radius: 16px; font-size: 0.75rem; color: var(--color-text-primary); font-weight: var(--font-weight-medium); display: inline-flex; align-items: center; gap: 4px;"><i data-lucide="calendar" style="width:12px; height:12px;"></i> ${e.title}</span>`).join('')
                : `<span style="color: var(--color-text-muted); font-size: 0.8rem; font-style: italic;">No events assigned</span>`;

            return `
            <div style="border: 1px solid var(--color-border); border-radius: var(--radius-sm); margin-bottom: var(--space-2); background: var(--color-bg); overflow: hidden;">
                
                <div style="display: grid; grid-template-columns: ${gridTemplate}; align-items: center; padding: var(--space-3) var(--space-4); transition: background 0.2s ease; gap: 12px;" onmouseover="this.style.background='var(--color-border)';" onmouseout="this.style.background='transparent';">
                    
                    <button class="toggle-events-btn" data-target="child-${guest.id}" style="background: none; border: none; cursor: pointer; color: var(--color-text-muted); padding: 4px; display: flex; align-items: center; justify-content: center;" onmouseover="this.style.color='var(--color-primary)'" onmouseout="this.style.color='var(--color-text-muted)'">
                        <i data-lucide="chevron-right" style="width: 18px; height: 18px; transition: transform 0.2s;"></i>
                    </button>

                    <button class="edit-guest-btn" data-guest-id="${guest.id}" style="background: none; border: none; cursor: pointer; color: var(--color-text-muted); padding: 4px; display: flex; align-items: center; justify-content: center;" onmouseover="this.style.color='var(--color-primary)'" onmouseout="this.style.color='var(--color-text-muted)'">
                        <i data-lucide="edit-2" style="width: 16px; height: 16px;"></i>
                    </button>

                    <div style="color: var(--color-text-secondary); font-size: var(--font-size-sm); font-weight: var(--font-weight-medium);">
                        ${index + 1}
                    </div>
                    
                    <div style="display: flex; align-items: center; gap: 12px; overflow: hidden;">
                        <div style="background: var(--color-white); border: 1px solid var(--color-border); color: var(--color-primary); width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; flex-shrink: 0;">
                            ${guest.name.charAt(0).toUpperCase()}
                        </div>
                        <h4 style="margin: 0; font-size: 0.95rem; font-weight: var(--font-weight-medium); color: var(--color-text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${guest.name}</h4>
                    </div>
                    
                    <div style="display: flex; align-items: center; gap: 6px; color: var(--color-text-secondary); font-size: var(--font-size-sm); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        <i data-lucide="phone" style="width: 14px; height: 14px; flex-shrink: 0;"></i> ${guest.phone}
                    </div>
                    
                    <div style="display: flex; align-items: center; gap: 6px; color: var(--color-text-secondary); font-size: var(--font-size-sm);">
                        ${guest.invited_events?.length || 0} Invited
                    </div>
                </div>

                <div id="child-${guest.id}" style="display: none; padding: var(--space-4) var(--space-4) var(--space-4) 74px; background: var(--color-white); border-top: 1px dashed var(--color-border);">
                    <div style="font-size: 0.75rem; color: var(--color-text-secondary); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: var(--font-weight-semibold);">Events Invited To:</div>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                        ${eventsTags}
                    </div>
                </div>

            </div>
            `;
        }).join('');

        content.innerHTML = listHTML;

        setTimeout(() => {
            const editBtns = content.querySelectorAll('.edit-guest-btn');
            editBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const guestId = btn.getAttribute('data-guest-id');
                    const guestData = guests.find(g => g.id === guestId);
                    if(guestData) window.openEditGuestModal(wedding.id, guestData, events);
                });
            });

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

            if (window.lucide) window.lucide.createIcons();
        }, 0);
    }
    
    section.appendChild(content);

    setTimeout(() => {
        const trigger = document.getElementById('addGuestBtnTrigger');
        if(trigger) trigger.addEventListener('click', () => window.openGuestModal(wedding.id, events));
    }, 0);

    return section;
}

// ==========================================
// GLOBALS: MODALS & BUTTON STYLER
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
            btn.style.cssText = 'background: #dc2626; color: #ffffff; border: 1px solid #dc2626; padding: 0.5rem 1.25rem; border-radius: var(--radius-sm); font-weight: var(--font-weight-semibold); cursor: pointer; transition: opacity 0.2s;';
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
    const eventCheckboxes = events.length > 0 ? events.map(ev => `
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

                    try {
                        const { data: newGuestData, error: insertError } = await supabase.from('guests').insert([{ 
                            wedding_id: weddingId,
                            name: document.getElementById('guestName').value.trim(),
                            phone: document.getElementById('guestPhone').value.trim(),
                            invite_code: generateInviteCode()
                        }]).select().single();
                        
                        if (insertError) throw insertError;

                        const selectedEvents = Array.from(document.querySelectorAll('input[name="guest_events"]:checked')).map(cb => ({
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
    
    const eventCheckboxes = events.length > 0 ? events.map(ev => `
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
                            window.dispatchEvent(new Event('weddingDataUpdated')); 
                            showAlert({ icon: 'success', title: 'Removed!', text: 'Guest has been removed.', timer: 2000 });
                        } catch (error) {
                            showAlert({ icon: 'error', title: 'Database Error', text: error.message });
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

                    try {
                        const { error } = await supabase.from('guests').update({ 
                            name: document.getElementById('editGuestName').value.trim(),
                            phone: document.getElementById('editGuestPhone').value.trim()
                        }).eq('id', guest.id);
                        
                        if (error) throw error;

                        await supabase.from('event_guests').delete().eq('guest_id', guest.id);

                        const selectedEvents = Array.from(document.querySelectorAll('input[name="guest_events"]:checked')).map(cb => ({
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
                        showAlert({ icon: 'error', title: 'DatabaseError', text: error.message });
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
    const csvContent = "data:text/csv;charset=utf-8,Guest Name,Phone Number,Dietary Requirements\nJohn Doe,1234567890,Vegetarian\nJane Smith,0987654321,None";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Sample File.xlsx");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

window.openCSVImportModal = function(weddingId) {
    // Existing CSV import handler
};