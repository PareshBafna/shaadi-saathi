import { supabase } from '../../database/js/api.js';
import { openModal } from '../../global/js/modal.js';
import { showSweetAlert } from '../../global/js/sweet-alert-message.js';
import { layoutDetailsModalFooter, convertToSearchableDropdown, broadcastWeddingDataUpdated } from './wedding-details-common.js';

export function buildEventItinerarySection(wedding, events, canConfig) {
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
            <i data-lucide="bell-ring"></i> Remind Me
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
                    openEditEventModal(wedding.id, wedding.start_date, wedding.end_date, eventId);
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
                section.querySelector('#add-event-main-btn').addEventListener('click', () => openEventModal(wedding.id, wedding.start_date, wedding.end_date));
            }
        }
        
        const addToCalBtn = section.querySelector('#add-to-calendar-btn');
        if (addToCalBtn) {
            addToCalBtn.replaceWith(addToCalBtn.cloneNode(true));
            section.querySelector('#add-to-calendar-btn').addEventListener('click', () => {
                downloadICS(wedding, events);
            });
        }
        
        if (window.lucide) window.lucide.createIcons();
    }, 0);

    return section;
}

export function downloadICS(wedding, events) {
    if (!events || events.length === 0) return;

    let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Shaadi Saathi//Wedding Events//EN\n";

    const displayNames = wedding.primary_side === 'groom' 
        ? `${wedding.groom_name} & ${wedding.bride_name}` 
        : `${wedding.bride_name} & ${wedding.groom_name}`;

    const rawFamily = wedding && wedding.family_name ? wedding.family_name.trim().toUpperCase() : '';
    const familyName = rawFamily ? (rawFamily.endsWith("s") ? rawFamily : `${rawFamily}'s`) : '';

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

        const eventName = ev.event_name || ev.title || 'Event';
        const summary = familyName ? `${eventName} - ${familyName} - ${displayNames}` : `${eventName} - ${displayNames}`;
        const description = ev.description || ev.one_liner || '';
        const location = ev.venue || '';

        icsContent += "BEGIN:VEVENT\n";
        icsContent += `DTSTART:${formatICSDate(startDate)}\n`;
        icsContent += `DTEND:${formatICSDate(endDate)}\n`;
        icsContent += `SUMMARY:${summary}\n`;
        icsContent += `DESCRIPTION:${description}\n`;
        icsContent += `LOCATION:${location}\n`;

        // 2 hours before
        icsContent += "BEGIN:VALARM\n";
        icsContent += "TRIGGER:-PT2H\n";
        icsContent += "ACTION:DISPLAY\n";
        icsContent += `DESCRIPTION:Reminder: ${summary} starts in 2 hours\n`;
        icsContent += "END:VALARM\n";

        // 1 hour before
        icsContent += "BEGIN:VALARM\n";
        icsContent += "TRIGGER:-PT1H\n";
        icsContent += "ACTION:DISPLAY\n";
        icsContent += `DESCRIPTION:Reminder: ${summary} starts in 1 hour\n`;
        icsContent += "END:VALARM\n";

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
}

export async function openEventModal(weddingId, minDate, maxDate) {
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

        if (window.lucide) window.lucide.createIcons();
    }, 50);
}

export async function openEditEventModal(weddingId, minDate, maxDate, eventId) {
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

        if (window.lucide) window.lucide.createIcons();
    }, 50);
}