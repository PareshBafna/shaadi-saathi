import { supabase } from '../../database/js/api.js';

let allEvents = [];
let allWeddings = [];

let currentView = 'week';
let activeFilter = 'all-events';
let currentDate = new Date();
let selectedDate = null;

export function renderCalendar() {
    if (typeof window.checkSessionOrShowAlert === 'function' && !window.checkSessionOrShowAlert()) {
        const errSec = document.createElement("div");
        errSec.className = "calendar-page-container";
        errSec.innerHTML = `
            <div class="calendar-card">
                <div class="calendar-loading-state">Please log in to view your calendar.</div>
            </div>
        `;
        return errSec;
    }

    const section = document.createElement("div");
    section.className = "calendar-page-container";

    const calendarCard = document.createElement("div");
    calendarCard.id = "calendar-card-container";
    calendarCard.className = "calendar-card";
    
    const eventsContainer = document.createElement("div");
    eventsContainer.id = "calendar-events-list";

    section.appendChild(calendarCard);
    section.appendChild(eventsContainer);

    calendarCard.innerHTML = `<div class="calendar-loading-state">Loading your calendar...</div>`;

    setTimeout(() => {
        loadUserEvents().then(() => {
            updateCalendarUI();
        });
    }, 0);

    return section;
}

async function loadUserEvents() {
    const user = window.currentUser;
    if (!user) return;

    try {
        const { data: weddingsData } = await supabase.from('weddings').select('id, bride_name, groom_name, primary_side, family_name, invitation_type');
        allWeddings = weddingsData || [];

        if (user.role === 'creator') {
            const { data } = await supabase.from('wedding_events').select('*');
            allEvents = data || [];
            return;
        }

        const cleanedUserPhone = user.phone ? user.phone.replace(/[^0-9]/g, '') : null;
        const baseUserPhone = cleanedUserPhone ? cleanedUserPhone.slice(-10) : null;

        const [hostRes, wUserRes, guestRes] = await Promise.all([
            supabase.from('wedding_hosts').select('wedding_id').eq('user_id', user.id),
            supabase.from('wedding_users').select('wedding_id').eq('user_id', user.id),
            supabase.from('guests').select('id, wedding_id, phone, variant_id')
        ]);

        const hostIds = (hostRes.data || []).map(h => h.wedding_id);
        const wUserIds = (wUserRes.data || []).map(u => u.wedding_id);
        const fullAccessWeddingIds = [...new Set([...hostIds, ...wUserIds])];

        let finalEvents = [];

        if (fullAccessWeddingIds.length > 0) {
            const { data: fullEvents } = await supabase.from('wedding_events').select('*').in('wedding_id', fullAccessWeddingIds);
            if (fullEvents) finalEvents.push(...fullEvents);
        }

        if (guestRes.data && guestRes.data.length > 0) {
            const matchedGuests = guestRes.data.filter(g => {
                const cleanedGuestPhone = g.phone ? g.phone.replace(/[^0-9]/g, '') : null;
                return baseUserPhone && cleanedGuestPhone && cleanedGuestPhone.endsWith(baseUserPhone);
            });

            const nonFullGuests = matchedGuests.filter(g => !fullAccessWeddingIds.includes(g.wedding_id));
            const variantIds = nonFullGuests.map(g => g.variant_id).filter(Boolean);

            let variantsMap = new Map();
            if (variantIds.length > 0) {
                const { data: variantsData } = await supabase.from('invite_variants').select('id, selected_event_ids').in('id', variantIds);
                (variantsData || []).forEach(v => variantsMap.set(v.id, v.selected_event_ids));
            }

            for (let g of nonFullGuests) {
                const selectedEventIds = g.variant_id ? variantsMap.get(g.variant_id) : null;

                if (selectedEventIds && selectedEventIds.length > 0) {
                    const { data: specificEvents } = await supabase.from('wedding_events').select('*').in('id', selectedEventIds);
                    if (specificEvents) finalEvents.push(...specificEvents);
                } else {
                    const { data: allWeddingEvs } = await supabase.from('wedding_events').select('*').eq('wedding_id', g.wedding_id);
                    if (allWeddingEvs) finalEvents.push(...allWeddingEvs);
                }
            }
        }

        const uniqueEvents = [];
        const seenIds = new Set();
        for (let ev of finalEvents) {
            if (!seenIds.has(ev.id)) {
                seenIds.add(ev.id);
                uniqueEvents.push(ev);
            }
        }

        allEvents = uniqueEvents;
    } catch (error) {
        console.error("Error loading calendar events:", error);
    }
}

window.setEventFilter = function(filter) {
    activeFilter = filter;
    selectedDate = null; 
    
    const now = new Date();
    if (filter === 'this-week') { 
        currentView = 'week'; 
        currentDate = new Date(now); 
    } else if (filter === 'this-month') { 
        currentView = 'month'; 
        currentDate = new Date(now); 
    }
    updateCalendarUI();
};

window.setCalendarView = function(view) {
    currentView = view;
    selectedDate = null; 
    updateCalendarUI();
};

function updateCalendarUI() {
    const calendarCard = document.getElementById("calendar-card-container");
    if (!calendarCard) return;

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const titleText = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;

    const filterHTML = `
        <div class="segmented-group">
            <button class="segmented-btn ${activeFilter === 'this-week' ? 'segmented-btn--active' : ''}" onclick="setEventFilter('this-week')">This Week</button>
            <button class="segmented-btn ${activeFilter === 'this-month' ? 'segmented-btn--active' : ''}" onclick="setEventFilter('this-month')">This Month</button>
            <button class="segmented-btn ${activeFilter === 'all-events' ? 'segmented-btn--active' : ''}" onclick="setEventFilter('all-events')">All</button>
        </div>
    `;

    const viewToggleHTML = `
        <div class="segmented-group">
            <button class="segmented-btn ${currentView === 'week' ? 'segmented-btn--active' : ''}" onclick="setCalendarView('week')" title="Week View">
                <i data-lucide="calendar-range"></i>
            </button>
            <button class="segmented-btn ${currentView === 'month' ? 'segmented-btn--active' : ''}" onclick="setCalendarView('month')" title="Month View">
                <i data-lucide="calendar-days"></i>
            </button>
        </div>
    `;

    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    let gridHTML = daysOfWeek.map(d => `<div class="calendar-grid__day-label">${d}</div>`).join('');

    const createCellHTML = (checkDate) => {
        const isSelected = selectedDate && checkDate.toDateString() === selectedDate.toDateString();
        const isToday = checkDate.toDateString() === new Date().toDateString();

        const dayEvents = allEvents.filter(e => {
            const ed = new Date(e.date || e.start_time);
            return ed.toDateString() === checkDate.toDateString();
        });

        let dotsHTML = `<div class="calendar-day-cell__dots-container"></div>`;
        if (dayEvents.length > 0) {
            dotsHTML = `<div class="calendar-day-cell__dots-container">`;
            const maxDots = Math.min(dayEvents.length, 4);
            for (let i = 0; i < maxDots; i++) {
                dotsHTML += `<div class="calendar-day-cell__dot"></div>`;
            }
            if (dayEvents.length > 4) {
                dotsHTML += `<span class="calendar-day-cell__more-dots">+</span>`;
            }
            dotsHTML += `</div>`;
        }

        let cellClasses = ['calendar-day-cell'];
        if (currentView === 'month' && checkDate.getMonth() !== currentDate.getMonth()) {
            cellClasses.push('calendar-day-cell--muted');
        }
        if (isSelected) {
            cellClasses.push('calendar-day-cell--selected');
        } else if (isToday) {
            cellClasses.push('calendar-day-cell--today');
        }

        return `
            <div class="${cellClasses.join(' ')}" data-year="${checkDate.getFullYear()}" data-month="${checkDate.getMonth()}" data-day="${checkDate.getDate()}">
                <span class="calendar-day-cell__text">${checkDate.getDate()}</span>
                ${dotsHTML}
            </div>
        `;
    };

    if (currentView === 'month') {
        const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
        const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
        
        for (let i = 0; i < firstDay; i++) {
            gridHTML += `<div></div>`;
        }
        for (let day = 1; day <= daysInMonth; day++) {
            const checkDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
            gridHTML += createCellHTML(checkDate);
        }
    } else { 
        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
        
        for (let i = 0; i < 7; i++) {
            const checkDate = new Date(startOfWeek);
            checkDate.setDate(startOfWeek.getDate() + i);
            gridHTML += createCellHTML(checkDate);
        }
    }

    calendarCard.innerHTML = `
        <div class="calendar-controls">
            <div>${viewToggleHTML}</div>
            <div>${filterHTML}</div>
        </div>
        <div class="calendar-header">
            <button id="cal-prev-btn" class="calendar-header__nav-btn"><i data-lucide="chevron-left"></i></button>
            <h2 id="cal-title-header" class="calendar-header__title" title="Go to Today">${titleText}</h2>
            <button id="cal-next-btn" class="calendar-header__nav-btn"><i data-lucide="chevron-right"></i></button>
        </div>
        <div class="calendar-grid">
            ${gridHTML}
        </div>
    `;

    document.getElementById("cal-prev-btn").addEventListener("click", () => {
        if (currentView === 'week') currentDate.setDate(currentDate.getDate() - 7);
        else currentDate.setMonth(currentDate.getMonth() - 1);
        activeFilter = null; 
        selectedDate = null; 
        updateCalendarUI();
    });
    
    document.getElementById("cal-next-btn").addEventListener("click", () => {
        if (currentView === 'week') currentDate.setDate(currentDate.getDate() + 7);
        else currentDate.setMonth(currentDate.getMonth() + 1);
        activeFilter = null; 
        selectedDate = null; 
        updateCalendarUI();
    });

    document.getElementById("cal-title-header").addEventListener("click", () => {
        currentDate = new Date();
        selectedDate = new Date();
        activeFilter = null; 
        updateCalendarUI();
    });

    calendarCard.querySelectorAll('.calendar-day-cell').forEach(cell => {
        cell.addEventListener('click', (e) => {
            const y = parseInt(e.currentTarget.getAttribute('data-year'));
            const m = parseInt(e.currentTarget.getAttribute('data-month'));
            const d = parseInt(e.currentTarget.getAttribute('data-day'));
            selectedDate = new Date(y, m, d);
            activeFilter = null; 
            
            if (currentView === 'month' && m !== currentDate.getMonth()) {
                currentDate = new Date(y, m, 1);
            }
            updateCalendarUI(); 
        });
    });

    if (window.lucide) window.lucide.createIcons();
    renderFilteredEvents();
}

function renderFilteredEvents() {
    const listContainer = document.getElementById("calendar-events-list");
    if (!listContainer) return;

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

    let displayEvents = [];
    let titleHTML = '';

    if (activeFilter) {
        let filterStart, filterEnd, titleText;
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        
        if (activeFilter === 'this-week') {
            filterStart = new Date(now);
            filterStart.setDate(now.getDate() - now.getDay());
            filterEnd = new Date(filterStart);
            filterEnd.setDate(filterStart.getDate() + 6);
            titleText = 'Events for This Week';
        } else if (activeFilter === 'this-month') {
            filterStart = new Date(now.getFullYear(), now.getMonth(), 1);
            filterEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            titleText = 'Events for This Month';
        } else if (activeFilter === 'all-events') {
            titleText = 'All Scheduled Events';
        }

        if (activeFilter === 'all-events') {
            displayEvents = [...allEvents];
        } else {
            displayEvents = allEvents.filter(e => {
                const ed = new Date(e.date || e.start_time);
                ed.setHours(0, 0, 0, 0);
                return ed >= filterStart && ed <= filterEnd;
            });
        }
        titleHTML = titleText;

    } else if (selectedDate) {
        displayEvents = allEvents.filter(e => {
            const ed = new Date(e.date || e.start_time);
            return ed.toDateString() === selectedDate.toDateString();
        });
        titleHTML = `Events for ${selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}`;
    } else {
        listContainer.innerHTML = '';
        return;
    }

    displayEvents.sort((a, b) => new Date(`${a.date} ${a.time || '12:00 AM'}`).getTime() - new Date(`${b.date} ${b.time || '12:00 AM'}`).getTime());

    let html = `
        <h3 class="timeline-title">
            ${titleHTML}
        </h3>
    `;

    if (displayEvents.length === 0) {
        html += `<div class="calendar-empty-state">No events scheduled.</div>`;
    } else {
        const groupedByDate = displayEvents.reduce((acc, ev) => {
            const dateObj = new Date(ev.date || ev.start_time);
            const dateStr = dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
            if (!acc[dateStr]) acc[dateStr] = [];
            acc[dateStr].push(ev);
            return acc;
        }, {});

        html += `<div class="timeline-container">`;
        html += `<div class="timeline-line"></div>`;

        Object.entries(groupedByDate).forEach(([dateLabel, dayEvents]) => {
            if (activeFilter) {
                html += `
                    <div class="timeline-date-header">
                        <div class="timeline-date-header__bullet"></div>
                        <h3 class="timeline-date-header__title">${dateLabel}</h3>
                    </div>
                `;
            }
            
            dayEvents.forEach((ev) => {
                const wedding = allWeddings.find(w => w.id === ev.wedding_id);
                const displayNames = wedding ? (wedding.primary_side === 'groom' ? `${wedding.groom_name} & ${wedding.bride_name}` : `${wedding.bride_name} & ${wedding.groom_name}`) : 'Wedding Event';
                const familyName = wedding && wedding.family_name ? wedding.family_name : '';
                
                const venueHTML = ev.venue_map_link 
                    ? `<a href="${ev.venue_map_link}" target="_blank" class="event-card-link">${ev.venue}</a>`
                    : `<span>${ev.venue}</span>`;

                html += `
                    <div class="timeline-event-card">
                        <div class="timeline-event-card__bullet"></div>
                        <div class="event-card-inner">
                            <div class="event-card-main">
                                <h4 class="event-card-title">${ev.event_name || ev.title}</h4>
                                <div class="event-card-meta-list">
                                    <div class="event-card-meta-item">
                                        <i data-lucide="clock"></i> ${formatTime(ev.time) || '-'}
                                    </div>
                                    <div class="event-card-meta-item">
                                        <i data-lucide="map-pin"></i> ${venueHTML}
                                    </div>
                                </div>
                            </div>
                            
                            <div class="event-card-side">
                                <span class="event-card-names">
                                    <i data-lucide="heart"></i>${displayNames}
                                </span>
                                ${familyName ? `
                                    <span class="event-card-family">
                                        <i data-lucide="users"></i>${familyName}
                                    </span>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                `;
            });
        });
        
        html += `</div>`;
    }

    listContainer.innerHTML = html;
    if (window.lucide) window.lucide.createIcons();
}