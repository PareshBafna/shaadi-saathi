import { getEvents, createEvent } from '../../../database/js/eventService.js';
import { openModal } from '../../../global/components/js/modal.js';

export class EventTimeline {
    constructor(containerId, weddingId) {
        this.timelineContainer = document.getElementById(containerId);
        this.weddingId = weddingId;

        if (this.timelineContainer) {
            this.loadTimeline();
        } else {
            console.warn(`EventTimeline: Container with ID '${containerId}' not found.`);
        }
    }

    async loadTimeline() {
        try {
            this.timelineContainer.innerHTML = '<p style="text-align:center; color:var(--color-text-secondary); padding:var(--space-4);">Loading events...</p>';
            const events = await getEvents(this.weddingId);
            this.render(events);
        } catch (error) {
            this.timelineContainer.innerHTML = '<p style="text-align:center; color:var(--color-danger); padding:var(--space-4);">Failed to load event timeline.</p>';
        }
    }

    formatDate(dateString) {
        const options = { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' };
        return new Date(dateString).toLocaleDateString('en-IN', options);
    }

    render(events) {
        if (!events || events.length === 0) {
            this.timelineContainer.innerHTML = `
                <div style="text-align:center; padding:var(--space-8); background:var(--color-bg-muted); border:1px dashed var(--color-border); border-radius:var(--radius-lg);">
                    <p style="color:var(--color-text-secondary); margin-bottom:var(--space-3);">No events scheduled yet.</p>
                </div>`;
            this.attachModalTriggers();
            return;
        }

        const timelineHTML = events.map((event, index) => {
            const sideClass = index % 2 === 0 ? 'left' : 'right';
            return `
            <div class="timeline-item ${sideClass}">
                <div class="timeline-dot"></div>
                <div class="timeline-content">
                    <span class="event-date">${this.formatDate(event.start_time)}</span>
                    <h4 class="event-title">${event.title}</h4>
                    <p class="event-detail-row">
                        <i data-lucide="map-pin" style="width:14px; height:14px;"></i> ${event.venue}
                    </p>
                    ${event.dress_code ? `
                    <p class="event-detail-row">
                        <i data-lucide="shirt" style="width:14px; height:14px;"></i> Dress Code: ${event.dress_code}
                    </p>` : ''}
                </div>
            </div>
        `}).join('');

        this.timelineContainer.innerHTML = `
            <div class="timeline-container">${timelineHTML}</div>
        `;

        this.attachModalTriggers();
    }

    attachModalTriggers() {
        const openBtn = document.getElementById('openAddEventBtn');
        const firstEventBtn = document.getElementById('addFirstEventBtn');

        const triggerModal = () => {
            const formHTML = `
                <form id="addEventForm" style="display:flex; flex-direction:column; gap:var(--space-3);">
                    <div>
                        <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:4px;">Event Title</label>
                        <input type="text" id="eventTitle" required style="width:100%; background:var(--color-bg); border:1px solid var(--color-border); color:var(--color-text-primary); padding:var(--space-2); border-radius:var(--radius-sm); box-sizing:border-box;">
                    </div>
                    <div>
                        <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:4px;">Start Date & Time</label>
                        <input type="datetime-local" id="eventStartTime" required style="width:100%; background:var(--color-bg); border:1px solid var(--color-border); color:var(--color-text-primary); padding:var(--space-2); border-radius:var(--radius-sm); box-sizing:border-box;">
                    </div>
                    <div>
                        <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:4px;">Venue Name & Address</label>
                        <input type="text" id="eventVenue" required style="width:100%; background:var(--color-bg); border:1px solid var(--color-border); color:var(--color-text-primary); padding:var(--space-2); border-radius:var(--radius-sm); box-sizing:border-box;">
                    </div>
                    <div>
                        <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:4px;">Dress Code (Optional)</label>
                        <input type="text" id="eventDressCode" style="width:100%; background:var(--color-bg); border:1px solid var(--color-border); color:var(--color-text-primary); padding:var(--space-2); border-radius:var(--radius-sm); box-sizing:border-box;">
                    </div>
                </form>
            `;

            const modal = openModal({
                title: "Add New Event",
                content: formHTML,
                actions: [
                    { label: "Cancel", variant: "ghost" },
                    { 
                        label: "Save Event", 
                        variant: "primary", 
                        closesModal: false,
                        onClick: async () => {
                            const form = document.getElementById('addEventForm');
                            if(!form.checkValidity()) { form.reportValidity(); return; }
                            
                            const eventData = {
                                wedding_id: this.weddingId,
                                title: document.getElementById('eventTitle').value.trim(),
                                start_time: document.getElementById('eventStartTime').value,
                                venue: document.getElementById('eventVenue').value.trim(),
                                dress_code: document.getElementById('eventDressCode').value.trim() || null
                            };

                            try {
                                await createEvent(eventData);
                                modal.close();
                                this.loadTimeline();
                            } catch (error) {
                                alert('Failed to create event: ' + error.message);
                            }
                        }
                    }
                ]
            });
        };

        if (openBtn) openBtn.addEventListener('click', triggerModal);
        if (firstEventBtn) firstEventBtn.addEventListener('click', triggerModal);
    }
}

export function initEventTimeline(containerId, activeWeddingId) {
    return new EventTimeline(containerId, activeWeddingId);
}