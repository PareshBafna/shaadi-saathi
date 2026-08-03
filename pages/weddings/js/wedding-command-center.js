import { supabase } from '../../../database/js/api.js';
import { openModal } from '../../../global/components/js/modal.js';
import { showAlert } from '../../../global/components/js/alerts.js';
import { formatWeddingDateRange } from './weddings.js';

// SIMULATED AUTH CONTEXT (Update this with your real global auth state later)
const currentUser = {
    id: "creator_paresh",
    role: "creator" // 'creator', 'host', or 'guest'
};  

// ==========================================
// MAIN RENDER FUNCTION
// ==========================================
export function renderWeddingCommandCenter(weddingId) {
    const wrapper = document.createElement("div");
    wrapper.style.cssText = "width: 100%; box-sizing: border-box; padding-bottom: var(--space-8);";
    wrapper.innerHTML = `<div style="padding: var(--space-8); text-align: center; color: var(--color-text-secondary);">Loading workspace...</div>`;

    // Initial load
    loadCommandCenterData(wrapper, weddingId);

    // Listen for modal updates and seamlessly reload the data
    const updateHandler = () => {
        // Only trigger the reload if the user is still on this page
        if (document.body.contains(wrapper)) {
            loadCommandCenterData(wrapper, weddingId);
        } else {
            // Clean up the listener if they navigated away
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
        // Fetch wedding details
        const { data: wedding, error: weddingError } = await supabase.from('weddings').select('*').eq('id', weddingId).single();
        if (weddingError) throw weddingError;

        // Fetch related events
        const { data: events, error: eventsError } = await supabase.from('events').select('*').eq('wedding_id', weddingId);
        if (eventsError) throw eventsError;

        // Fetch related guests
        const { data: guests, error: guestsError } = await supabase.from('guests').select('*').eq('wedding_id', weddingId);
        if (guestsError) throw guestsError;

        // Clear loading state and build page
        container.innerHTML = "";
        
        container.appendChild(buildSpecificHeader(wedding));
        container.appendChild(buildSpecificStats(wedding, events?.length || 0, guests?.length || 0));
        container.appendChild(buildEventItinerarySection(wedding, events)); // <-- Pass 'wedding' instead of 'weddingId'
        container.appendChild(buildGuestListSection(wedding, guests)); 

        if (window.lucide) window.lucide.createIcons();

    } catch (error) {
        console.error("Error loading workspace:", error);
        container.innerHTML = `<div style="color: var(--color-danger); padding: var(--space-8); text-align: center;">Failed to load workspace: ${error.message}</div>`;
    }
}

// ==========================================
// 1. HEADER SECTION
// ==========================================
function buildSpecificHeader(wedding) {
    const header = document.createElement("div");
    header.style.cssText = "display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-8);";
    
    // Evaluate the display name order
    const displayNames = wedding.primary_side === 'groom' 
        ? `${wedding.groom_name} & ${wedding.bride_name}` 
        : `${wedding.bride_name} & ${wedding.groom_name}`;

    const familyText = wedding.family_details ? `<p style="color: var(--color-text-secondary); margin: 4px 0 0 0; font-size: var(--font-size-sm);"><i data-lucide="users" style="width:14px; height:14px; vertical-align:middle; margin-right:4px;"></i> ${wedding.family_details}</p>` : '';
    const contactText = wedding.contact_details ? `<p style="color: var(--color-text-secondary); margin: 4px 0 0 0; font-size: var(--font-size-sm);"><i data-lucide="phone" style="width:14px; height:14px; vertical-align:middle; margin-right:4px;"></i> ${wedding.contact_details}</p>` : '';

    header.innerHTML = `
        <div>
            <h1 style="font-size: var(--font-size-3xl); font-weight: var(--font-weight-bold); color: var(--color-text-primary); margin: 0;">${displayNames}</h1>
            <p style="color: var(--color-text-secondary); margin: var(--space-2) 0 var(--space-2) 0; font-size: var(--font-size-base);">Date: <strong style="color: var(--color-primary);">${formatWeddingDateRange(wedding.start_date, wedding.end_date)}</strong></p>
            ${familyText}
            ${contactText}
        </div>
    `;
    return header;
}

// ==========================================
// 2. STATS SECTION (Conditional Visibility)
// ==========================================
function buildSpecificStats(wedding, eventsCount = 0, guestsCount = 0) {
    const isOwnerOrCreator = currentUser.role === 'creator' || currentUser.id === wedding.host_id;
    const statsContainer = document.createElement("div");
    statsContainer.style.cssText = "display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: var(--space-6); margin-bottom: var(--space-8);";

    // Only show Guests stat to Creator or Owner
    if (isOwnerOrCreator) {
        statsContainer.innerHTML += `
            <div class="stat-card" style="padding: var(--space-5); display: flex; align-items: center; justify-content: space-between; background: var(--color-white); border: 1px solid var(--color-border); border-radius: var(--radius-lg);">
                <div>
                    <p style="color: var(--color-text-secondary); font-size: var(--font-size-sm); margin: 0; font-weight: var(--font-weight-medium);">Total Guests</p>
                    <p style="color: var(--color-text-primary); font-size: var(--font-size-2xl); font-weight: var(--font-weight-bold); margin: 4px 0 0 0;">${guestsCount}</p>
                </div>
                <div style="background: var(--color-border); color: var(--color-primary); width: 40px; height: 40px; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center;">
                    <i data-lucide="users" style="width: 20px; height: 20px;"></i>
                </div>
            </div>
        `;
    }

    statsContainer.innerHTML += `
        <div class="stat-card" style="padding: var(--space-5); display: flex; align-items: center; justify-content: space-between; background: var(--color-white); border: 1px solid var(--color-border); border-radius: var(--radius-lg);">
            <div>
                <p style="color: var(--color-text-secondary); font-size: var(--font-size-sm); margin: 0; font-weight: var(--font-weight-medium);">Total Events</p>
                <p style="color: var(--color-text-primary); font-size: var(--font-size-2xl); font-weight: var(--font-weight-bold); margin: 4px 0 0 0;">${eventsCount}</p>
            </div>
            <div style="background: var(--color-border); color: var(--color-primary); width: 40px; height: 40px; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center;">
                <i data-lucide="calendar" style="width: 20px; height: 20px;"></i>
            </div>
        </div>
    `;
    return statsContainer;
}

// ==========================================
// 3. EVENT ITINERARY SECTION
// ==========================================
function buildEventItinerarySection(wedding, events) {
    const section = document.createElement("div");
    section.style.cssText = "background: var(--color-white); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-5); margin-bottom: var(--space-6);";
    
    // NEW: Determine if the current user has permission to edit this specific wedding
    const canEdit = currentUser.role === 'creator' || currentUser.id === wedding.host_id;

    // Only render the header row and Add button if the user has permission
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
                    const timePart = ev.start_time.includes('T') ? ev.start_time.split('T')[1] : ev.start_time;
                    const [hoursStr, minutesStr] = timePart.split(':');
                    let h = parseInt(hoursStr, 10);
                    const m = minutesStr || '00';
                    const ampm = h >= 12 ? 'PM' : 'AM';
                    h = h % 12 || 12;
                    return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
                })() : '';

                // NEW: Conditionally apply interactive styling and edit icons based on permission
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

        // NEW: Only attach click listeners if the user actually has permission to edit
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
// 4. GUEST LIST SECTION (Conditional Visibility)
// ==========================================
function buildGuestListSection(wedding, guests) {
    const isOwnerOrCreator = currentUser.role === 'creator' || currentUser.id === wedding.host_id;
    if (!isOwnerOrCreator) return document.createElement("div"); // Completely hide from non-owners

    const section = document.createElement("div");
    section.style.cssText = "background: var(--color-white); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-5); margin-bottom: var(--space-6);";

    // 3-Column Controls Row (Import | + Guest | Sample) - Title Removed & Button Colors Updated
    const controlsRow = document.createElement("div");
    controlsRow.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-5); border-bottom: 1px solid var(--color-border); padding-bottom: var(--space-4);";
    
    controlsRow.innerHTML = `
        <div style="flex: 1; display: flex; justify-content: flex-start;">
            <button onclick="triggerCSVImport('${wedding.id}')" style="background: var(--color-primary); color: var(--color-text-on-accent); border: none; padding: 0.5rem 1rem; border-radius: var(--radius-sm); cursor: pointer; font-size: var(--font-size-sm); display: flex; align-items: center;"><i data-lucide="upload" style="width:16px; height:16px; margin-right:4px;"></i> Import Guests</button>
        </div>
        <div style="flex: 1; display: flex; justify-content: center;">
            <button onclick="openGuestModal('${wedding.id}')" style="background: var(--color-primary); color: var(--color-text-on-accent); border: none; padding: 0.5rem 1.25rem; border-radius: var(--radius-sm); font-weight: var(--font-weight-semibold); cursor: pointer; font-size: var(--font-size-sm); display: flex; align-items: center;"><i data-lucide="plus" style="width:16px; height:16px; margin-right:4px;"></i> Guest</button>
        </div>
        <div style="flex: 1; display: flex; justify-content: flex-end;">
            <button onclick="downloadSampleCSV()" style="background: var(--color-primary); color: var(--color-text-on-accent); border: none; padding: 0.5rem 1rem; border-radius: var(--radius-sm); cursor: pointer; font-size: var(--font-size-sm); display: flex; align-items: center;"><i data-lucide="download" style="width:16px; height:16px; margin-right:4px;"></i> Sample CSV</button>
        </div>
    `;
    section.appendChild(controlsRow);

    const content = document.createElement("div");
    if (!guests || guests.length === 0) {
        content.innerHTML = `<div style="text-align: center; padding: var(--space-6); color: var(--color-text-muted); border: 1px dashed var(--color-border); border-radius: var(--radius-sm);">No guests added yet.</div>`;
    } else {
        // Build your guests table UI here
        content.innerHTML = `<div style="text-align: center; color: var(--color-text-secondary);">[ ${guests.length} Guests Listed Here ]</div>`;
    }
    section.appendChild(content);
    return section;
}

// ==========================================
// GLOBALS: MODALS & CSV HANDLERS
// ==========================================

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

                    // Save with an explicit local timezone offset so PostgreSQL stores the exact clock time selected
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
    // Safely extract the raw HH:mm from the database timestamp for the time input
    let timeValue = '';
    if (ev.start_time) {
        const timePart = ev.start_time.includes('T') ? ev.start_time.split('T')[1] : ev.start_time;
        const [hours, minutes] = timePart.split(':');
        timeValue = `${hours}:${minutes}`;
    }

    const formHTML = `
        <form id="editEventForm" novalidate style="display:flex; flex-direction:column; gap:var(--space-3);">
            <div>
                <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:4px;">Event Name *</label>
                <!-- Using .replace to safely render names with quotes -->
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
                label: "Save Changes", 
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

                    // Preserve exact local time zone offset
                    const timezoneOffset = new Date().getTimezoneOffset();
                    const sign = timezoneOffset > 0 ? '-' : '+';
                    const absOffset = Math.abs(timezoneOffset);
                    const offsetHours = String(Math.floor(absOffset / 60)).padStart(2, '0');
                    const offsetMinutes = String(absOffset % 60).padStart(2, '0');
                    const formattedOffset = `${sign}${offsetHours}:${offsetMinutes}`;

                    const fullStartTimestamp = `${selectedDate}T${selectedTime}:00${formattedOffset}`;

                    try {
                        // Using .update() instead of .insert()
                        const { error } = await supabase.from('events').update({ 
                            title: document.getElementById('editEventName').value.trim(),
                            date: selectedDate,
                            start_time: fullStartTimestamp,
                            venue: document.getElementById('editEventVenue').value.trim()
                        }).eq('id', ev.id); // Identifying the specific event to update
                        
                        if (error) throw error;
                        
                        modal.close();
                        window.dispatchEvent(new Event('weddingDataUpdated')); 
                        showAlert({ icon: 'success', title: 'Updated!', text: 'Event updated successfully.', timer: 2000 });
                    } catch (error) {
                        showAlert({ icon: 'error', title: 'Database Error', text: error.message });
                    }
                }
            }
        ]
    });

    // Real-time border validation and set initial state
    setTimeout(() => {
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

window.openGuestModal = function(weddingId) {
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
                        const { error } = await supabase.from('guests').insert([{ 
                            wedding_id: weddingId,
                            name: document.getElementById('guestName').value.trim(),
                            phone: document.getElementById('guestPhone').value.trim()
                        }]);
                        if (error) throw error;

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

    // Attach real-time border validation and set initial state
    setTimeout(() => {
        ['guestName', 'guestPhone'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                // Set initial border color on load
                el.style.borderColor = el.value.trim() === '' ? 'red' : 'green';
                
                // Update border color on input
                el.addEventListener('input', () => {
                    el.style.borderColor = el.value.trim() === '' ? 'red' : 'green';
                });
            }
        });
    }, 50);
};

// CSV Download Generator
window.downloadSampleCSV = function() {
    const csvContent = "data:text/csv;charset=utf-8,Guest Name,Phone Number,Dietary Requirements\nJohn Doe,1234567890,Vegetarian\nJane Smith,0987654321,None";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "sample_guest_list.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// CSV File Upload & Processing
window.triggerCSVImport = function(weddingId) {
    let fileInput = document.getElementById('csvGuestImport');
    
    // Create hidden input dynamically if it doesn't exist
    if (!fileInput) {
        fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.id = 'csvGuestImport';
        fileInput.accept = '.csv';
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);
    }

    fileInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async function(event) {
            const text = event.target.result;
            const rows = text.split('\n').slice(1); // Skip the header row
            const guestsToInsert = [];

            rows.forEach(row => {
                const cols = row.split(',');
                if (cols.length >= 2 && cols[0].trim() !== '') { // Require at least Name and Phone
                    guestsToInsert.push({
                        wedding_id: weddingId,
                        name: cols[0].trim(),
                        phone: cols[1].trim(),
                        dietary_requirements: cols[2] ? cols[2].trim() : null
                    });
                }
            });

            if (guestsToInsert.length > 0) {
                try {
                    const { error } = await supabase.from('guests').insert(guestsToInsert);
                    if (error) throw error;
                    showAlert({ icon: 'success', title: 'Imported!', text: `${guestsToInsert.length} guests added successfully.`, timer: 2500 });
                    window.dispatchEvent(new Event('weddingDataUpdated')); 
                } catch (err) {
                    showAlert({ icon: 'error', title: 'Import Error', text: err.message });
                }
            } else {
                showAlert({ icon: 'warning', title: 'Invalid File', text: 'No valid guests found. Make sure names and phones are filled.' });
            }
        };
        reader.readAsText(file);
        e.target.value = ''; // Reset input to allow re-uploading the same file if needed
    };
    
    fileInput.click();
};