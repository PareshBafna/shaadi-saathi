import { supabase } from '../../database/js/api.js';

let allEvents = [];
let allWeddings = [];

// State variables for Calendar View
let currentView = 'week'; // 'week' or 'month'
let activeFilter = null; // 'this-week', 'next-week', 'this-month', 'next-month'
let currentDate = new Date(); // Controls what month/week is visible in the grid
let selectedDate = new Date(); // The specifically clicked day (null if a filter is active)

export function renderCalendar() {
    const section = document.createElement("div");
    // Increased max-width to fit the new control layout comfortably
    section.style.cssText = "width: 100%; max-width: 1100px; margin: 0 auto; padding-bottom: var(--space-8);";

    // Calendar Card Container
    const calendarCard = document.createElement("div");
    calendarCard.id = "calendar-card-container";
    calendarCard.style.cssText = "background: var(--color-white); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-5); margin-bottom: var(--space-6); box-shadow: 0 1px 3px rgba(0,0,0,0.05);";
    
    // Events List Container (Below Calendar)
    const eventsContainer = document.createElement("div");
    eventsContainer.id = "calendar-events-list";

    section.appendChild(calendarCard);
    section.appendChild(eventsContainer);

    calendarCard.innerHTML = `<div style="padding: var(--space-6); text-align: center; color: var(--color-text-secondary);">Loading your calendar...</div>`;

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
        const { data: weddingsData } = await supabase.from('weddings').select('id, bride_name, groom_name, primary_side, family_name');
        allWeddings = weddingsData || [];

        if (user.role === 'creator') {
            const { data } = await supabase.from('events').select('*');
            allEvents = data || [];
            return;
        }

        const [hostRes, wUserRes, guestRes] = await Promise.all([
            supabase.from('wedding_hosts').select('wedding_id').eq('user_id', user.id),
            supabase.from('wedding_users').select('wedding_id').eq('user_id', user.id),
            supabase.from('guests').select('id, wedding_id').eq('phone', user.phone)
        ]);

        const hostIds = (hostRes.data || []).map(h => h.wedding_id);
        const wUserIds = (wUserRes.data || []).map(u => u.wedding_id);
        const fullAccessWeddingIds = [...new Set([...hostIds, ...wUserIds])];

        let finalEvents = [];

        if (fullAccessWeddingIds.length > 0) {
            const { data: fullEvents } = await supabase.from('events').select('*').in('wedding_id', fullAccessWeddingIds);
            if (fullEvents) finalEvents.push(...fullEvents);
        }

        if (guestRes.data && guestRes.data.length > 0) {
            for (let g of guestRes.data) {
                if (!fullAccessWeddingIds.includes(g.wedding_id)) {
                    const { data: egData } = await supabase.from('event_guests').select('event_id').eq('guest_id', g.id);
                    if (egData && egData.length > 0) {
                        const eventIds = egData.map(eg => eg.event_id);
                        const { data: specificEvents } = await supabase.from('events').select('*').in('id', eventIds);
                        if (specificEvents) finalEvents.push(...specificEvents);
                    }
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

// Attach helpers to window for inline HTML onclick binding
window.setEventFilter = function(filter) {
    activeFilter = filter;
    selectedDate = null; 
    
    const now = new Date();
    if (filter === 'this-week') { 
        currentView = 'week'; 
        currentDate = new Date(now); 
    } else if (filter === 'next-week') { 
        currentView = 'week'; 
        currentDate = new Date(now); 
        currentDate.setDate(now.getDate() + 7); 
    } else if (filter === 'this-month') { 
        currentView = 'month'; 
        currentDate = new Date(now); 
    } else if (filter === 'next-month') { 
        currentView = 'month'; 
        currentDate = new Date(now); 
        currentDate.setMonth(now.getMonth() + 1); 
    }
    updateCalendarUI();
};

window.setCalendarView = function(view) {
    currentView = view;
    selectedDate = null; 
    updateCalendarUI();
};

window.searchCalendarDate = function(dateStr) {
    if (!dateStr) return;
    const [y, m, d] = dateStr.split('-');
    const parsedDate = new Date(y, m - 1, d);
    currentDate = new Date(parsedDate);
    selectedDate = new Date(parsedDate);
    activeFilter = null;
    
    // Auto-switch to month view if searching so they can see the surrounding dates
    if (currentView === 'week') {
        currentView = 'month';
    }
    updateCalendarUI();
};

function updateCalendarUI() {
    const calendarCard = document.getElementById("calendar-card-container");
    if (!calendarCard) return;

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const titleText = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;

    const getBtnStyle = (filterName) => activeFilter === filterName 
        ? `background: var(--color-primary); color: var(--color-text-on-accent); border: 1px solid var(--color-primary);` 
        : `background: var(--color-bg); color: var(--color-text-secondary); border: 1px solid var(--color-border);`;

    const getToggleStyle = (viewName) => currentView === viewName 
        ? `background: var(--color-primary); color: var(--color-text-on-accent); font-weight: bold;` 
        : `background: transparent; color: var(--color-text-primary);`;

    const filterHTML = `
        <button onclick="setEventFilter('this-week')" style="padding: 6px 12px; border-radius: var(--radius-sm); font-size: 0.8rem; font-weight: var(--font-weight-medium); cursor: pointer; transition: all 0.2s; ${getBtnStyle('this-week')}">This Week</button>
        <button onclick="setEventFilter('next-week')" style="padding: 6px 12px; border-radius: var(--radius-sm); font-size: 0.8rem; font-weight: var(--font-weight-medium); cursor: pointer; transition: all 0.2s; ${getBtnStyle('next-week')}">Next Week</button>
        <button onclick="setEventFilter('this-month')" style="padding: 6px 12px; border-radius: var(--radius-sm); font-size: 0.8rem; font-weight: var(--font-weight-medium); cursor: pointer; transition: all 0.2s; ${getBtnStyle('this-month')}">This Month</button>
        <button onclick="setEventFilter('next-month')" style="padding: 6px 12px; border-radius: var(--radius-sm); font-size: 0.8rem; font-weight: var(--font-weight-medium); cursor: pointer; transition: all 0.2s; ${getBtnStyle('next-month')}">Next Month</button>
    `;

    const viewToggleHTML = `
        <div style="display: flex; background: var(--color-bg); border-radius: var(--radius-sm); border: 1px solid var(--color-border); overflow: hidden;">
            <button onclick="setCalendarView('week')" style="padding: 6px 16px; font-size: 0.8rem; border: none; cursor: pointer; transition: all 0.2s; ${getToggleStyle('week')}">Week</button>
            <button onclick="setCalendarView('month')" style="padding: 6px 16px; font-size: 0.8rem; border: none; cursor: pointer; transition: all 0.2s; ${getToggleStyle('month')}">Month</button>
        </div>
    `;

    const dateSearchHTML = `
        <div style="display: flex; align-items: center; gap: 8px; background: var(--color-bg); padding: 2px 4px; border-radius: var(--radius-sm); border: 1px solid var(--color-border);">
            <i data-lucide="calendar-search" style="width: 16px; height: 16px; color: var(--color-text-secondary); margin-left: 6px;"></i>
            <input type="date" title="Search Date" style="border: none; background: transparent; font-size: 0.8rem; color: var(--color-text-primary); cursor: pointer; padding: 4px; outline: none;" onchange="searchCalendarDate(this.value)">
        </div>
    `;

    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    let gridHTML = daysOfWeek.map(d => `<div style="font-size: 0.75rem; font-weight: var(--font-weight-bold); color: var(--color-text-secondary); text-transform: uppercase; padding-bottom: 8px;">${d}</div>`).join('');

    const createCellHTML = (checkDate) => {
        const isSelected = selectedDate && checkDate.toDateString() === selectedDate.toDateString();
        const isToday = checkDate.toDateString() === new Date().toDateString();

        const dayEvents = allEvents.filter(e => {
            const ed = new Date(e.date || e.start_time);
            return ed.toDateString() === checkDate.toDateString();
        });

        let dotsHTML = `<div style="height: 10px; margin-top: 4px;"></div>`;
        if (dayEvents.length > 0) {
            const dotColor = isSelected ? 'var(--color-text-on-accent)' : 'var(--color-primary)';
            dotsHTML = `<div style="display: flex; gap: 3px; justify-content: center; margin-top: 4px; flex-wrap: wrap;">`;
            const maxDots = Math.min(dayEvents.length, 4);
            for(let i=0; i<maxDots; i++) {
                dotsHTML += `<div style="width: 6px; height: 6px; background: ${dotColor}; border-radius: 50%;"></div>`;
            }
            if (dayEvents.length > 4) {
                 dotsHTML += `<span style="font-size: 9px; color: ${dotColor}; line-height: 6px; font-weight: bold;">+</span>`;
            }
            dotsHTML += `</div>`;
        }

        let cellStyle = `padding: 10px 0; cursor: pointer; border-radius: var(--radius-sm); transition: all 0.2s ease; display: flex; flex-direction: column; align-items: center; justify-content: center; border: 1px solid transparent;`;
        let textStyle = `font-size: 0.9rem; font-weight: var(--font-weight-medium); color: var(--color-text-primary);`;

        if (currentView === 'month' && checkDate.getMonth() !== currentDate.getMonth()) {
            textStyle = `font-size: 0.9rem; font-weight: var(--font-weight-medium); color: var(--color-text-muted); opacity: 0.5;`;
        }

        if (isSelected) {
            cellStyle += ` background: var(--color-primary);`;
            textStyle = `font-size: 0.9rem; font-weight: var(--font-weight-bold); color: var(--color-text-on-accent);`;
        } else if (isToday) {
            cellStyle += ` border: 1px solid var(--color-primary);`;
        }

        return `
            <div class="calendar-day-cell" data-year="${checkDate.getFullYear()}" data-month="${checkDate.getMonth()}" data-day="${checkDate.getDate()}" style="${cellStyle}" onmouseover="if(!${isSelected}) this.style.background='var(--color-bg)'" onmouseout="if(!${isSelected}) this.style.background='transparent'">
                <span style="${textStyle}">${checkDate.getDate()}</span>
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
        // Week View
        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
        
        for (let i = 0; i < 7; i++) {
            const checkDate = new Date(startOfWeek);
            checkDate.setDate(startOfWeek.getDate() + i);
            gridHTML += createCellHTML(checkDate);
        }
    }

    calendarCard.innerHTML = `
        <div id="calendar-controls" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-5); flex-wrap: wrap; gap: 16px;">
            <div style="flex: 1; min-width: 150px; display: flex; justify-content: flex-start;">
                ${viewToggleHTML}
            </div>
            <div style="flex: 2; min-width: 300px; display: flex; justify-content: center; gap: 8px; flex-wrap: wrap;">
                ${filterHTML}
            </div>
            <div style="flex: 1; min-width: 150px; display: flex; justify-content: flex-end;">
                ${dateSearchHTML}
            </div>
        </div>
        <div id="calendar-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-5);">
            <button id="cal-prev-btn" style="background: none; border: 1px solid var(--color-border); border-radius: var(--radius-sm); padding: 6px; cursor: pointer; color: var(--color-text-primary); display: flex; align-items: center; justify-content: center; transition: background 0.2s;" onmouseover="this.style.background='var(--color-bg)'" onmouseout="this.style.background='transparent'"><i data-lucide="chevron-left" style="width: 18px; height: 18px;"></i></button>
            <h2 id="cal-title-header" style="margin: 0; font-size: var(--font-size-lg); font-weight: var(--font-weight-bold); color: var(--color-text-primary); cursor: pointer; transition: color 0.2s;" onmouseover="this.style.color='var(--color-primary)'" onmouseout="this.style.color='var(--color-text-primary)'" title="Go to Today">${titleText}</h2>
            <button id="cal-next-btn" style="background: none; border: 1px solid var(--color-border); border-radius: var(--radius-sm); padding: 6px; cursor: pointer; color: var(--color-text-primary); display: flex; align-items: center; justify-content: center; transition: background 0.2s;" onmouseover="this.style.background='var(--color-bg)'" onmouseout="this.style.background='transparent'"><i data-lucide="chevron-right" style="width: 18px; height: 18px;"></i></button>
        </div>
        <div id="calendar-grid" style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; text-align: center;">
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
        } else if (activeFilter === 'next-week') {
            filterStart = new Date(now);
            filterStart.setDate(now.getDate() - now.getDay() + 7);
            filterEnd = new Date(filterStart);
            filterEnd.setDate(filterStart.getDate() + 6);
            titleText = 'Events for Next Week';
        } else if (activeFilter === 'this-month') {
            filterStart = new Date(now.getFullYear(), now.getMonth(), 1);
            filterEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            titleText = 'Events for This Month';
        } else if (activeFilter === 'next-month') {
            filterStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
            filterEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0);
            titleText = 'Events for Next Month';
        }

        displayEvents = allEvents.filter(e => {
            const ed = new Date(e.date || e.start_time);
            ed.setHours(0, 0, 0, 0);
            return ed >= filterStart && ed <= filterEnd;
        });
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

    displayEvents.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

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

    let html = `
        <h3 style="font-size: 1.1rem; font-weight: var(--font-weight-bold); color: var(--color-text-primary); margin: 0 0 var(--space-4) 0; border-bottom: 1px solid var(--color-border); padding-bottom: var(--space-3);">
            ${titleHTML}
        </h3>
    `;

    if (displayEvents.length === 0) {
        html += `<div style="text-align: center; padding: var(--space-6); background: var(--color-white); border: 1px dashed var(--color-border); border-radius: var(--radius-lg); color: var(--color-text-muted);">No events scheduled.</div>`;
    } else {
        
        const groupedByDate = displayEvents.reduce((acc, ev) => {
            const dateObj = new Date(ev.date || ev.start_time);
            const dateStr = dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
            if (!acc[dateStr]) acc[dateStr] = [];
            acc[dateStr].push(ev);
            return acc;
        }, {});

        html += `<div style="display: flex; flex-direction: column; position: relative; padding-left: 12px; margin-top: 12px;">`;
        html += `<div style="position: absolute; left: 16px; top: 12px; bottom: 20px; width: 2px; background: var(--color-border);"></div>`;

        Object.entries(groupedByDate).forEach(([dateLabel, dayEvents], groupIdx) => {
            if (activeFilter) {
                html += `
                    <div style="position: relative; margin-top: ${groupIdx === 0 ? '0' : '24px'}; margin-bottom: 16px; display: flex; align-items: center;">
                        <div style="position: absolute; left: -1.5px; width: 10px; height: 10px; border-radius: 50%; background: var(--color-primary); border: 2px solid var(--color-white); z-index: 2;"></div>
                        <h3 style="font-size: 1.05rem; font-weight: var(--font-weight-bold); color: var(--color-primary); margin: 0 0 0 24px;">
                            ${dateLabel}
                        </h3>
                    </div>
                `;
            }
            
            dayEvents.forEach((ev, idx) => {
                const wedding = allWeddings.find(w => w.id === ev.wedding_id);
                const displayNames = wedding ? (wedding.primary_side === 'groom' ? `${wedding.groom_name} & ${wedding.bride_name}` : `${wedding.bride_name} & ${wedding.groom_name}`) : 'Wedding Event';
                const familyName = wedding && wedding.family_name ? wedding.family_name : '';
                
                html += `
                    <div class="timeline-event-card" style="position: relative; margin-left: 24px; padding: 16px; margin-bottom: 12px; background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-md); display: flex; flex-direction: column; gap: 8px;">
                        <div style="position: absolute; left: -24px; top: 22px; width: 8px; height: 8px; border-radius: 50%; background: var(--color-border); border: 2px solid var(--color-white); z-index: 2;"></div>
                        
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px;">
                            <div style="display: flex; flex-direction: column; gap: 4px;">
                                <h4 style="margin: 0; font-size: 1.15rem; font-weight: var(--font-weight-bold); color: var(--color-text-primary);">${ev.title}</h4>
                                <div style="display: flex; gap: 16px; color: var(--color-text-primary); font-size: 0.95rem; font-weight: var(--font-weight-medium); flex-wrap: wrap; margin-top: 4px;">
                                    <div style="display: flex; align-items: center; gap: 6px;">
                                        <i data-lucide="clock" style="width: 16px; height: 16px; color: var(--color-text-secondary);"></i> ${formatTime(ev.start_time)}
                                    </div>
                                    <div style="display: flex; align-items: center; gap: 6px;">
                                        <i data-lucide="map-pin" style="width: 16px; height: 16px; color: var(--color-text-secondary);"></i> <span style="line-height: 1.4;">${ev.venue}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div style="display: flex; flex-direction: column; align-items: flex-end; text-align: right;">
                                <span style="font-size: 1.05rem; font-weight: var(--font-weight-bold); color: var(--color-primary); display: flex; align-items: center; gap: 6px;">
                                    <i data-lucide="heart" style="width: 16px; height: 16px; color: var(--color-primary);"></i>${displayNames}
                                </span>
                                ${familyName ? `<span style="font-size: 0.85rem; color: var(--color-text-secondary); font-weight: var(--font-weight-medium); margin-top: 4px;">${familyName}</span>` : ''}
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