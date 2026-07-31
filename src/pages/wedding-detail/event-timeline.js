import { getEvents } from '../../shared/services/eventService.js';
import { openAddEventModal } from '../../shared/components/modal/event-modal.js';

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
            this.timelineContainer.innerHTML = '<p class="text-center text-gray-500 py-4">Loading events...</p>';
            
            const events = await getEvents(this.weddingId);
            this.render(events);
        } catch (error) {
            this.timelineContainer.innerHTML = '<p class="text-center text-red-500 py-4">Failed to load event timeline.</p>';
        }
    }

    formatDate(dateString) {
        const options = { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric', 
            hour: 'numeric', 
            minute: '2-digit' 
        };
        return new Date(dateString).toLocaleDateString('en-IN', options);
    }

    render(events) {
        // Top header action bar with "Add Event" button
        const headerHTML = `
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-xl font-bold text-gray-900">Events Schedule</h3>
                <button id="openAddEventBtn" class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium shadow hover:bg-blue-700 transition-colors flex items-center gap-2">
                    <span>+ Add Event</span>
                </button>
            </div>
        `;

        if (!events || events.length === 0) {
            this.timelineContainer.innerHTML = `
                ${headerHTML}
                <div class="text-center p-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <p class="text-gray-500 mb-3">No events scheduled yet.</p>
                    <button id="addFirstEventBtn" class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium shadow hover:bg-blue-700">Add First Event</button>
                </div>`;
            
            this.attachModalTriggers();
            return;
        }

        // Build the chronological timeline HTML
        const timelineHTML = events.map((event, index) => `
            <div class="relative pl-8 sm:pl-32 py-6 group">
                <!-- Vertical Line & Timeline Dot -->
                <div class="flex flex-col items-center absolute left-2 sm:left-0 sm:right-auto sm:ml-20 top-0 h-full">
                    <div class="h-full w-px bg-gray-200 ${index === events.length - 1 ? 'hidden' : ''}"></div>
                    <div class="absolute top-8 -ml-1.5 h-3 w-3 rounded-full bg-blue-500 border-4 border-white shadow"></div>
                </div>
                
                <!-- Event Content Card -->
                <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                    <div class="flex flex-col sm:flex-row sm:justify-between sm:items-baseline mb-4">
                        <h4 class="text-lg font-bold text-gray-900">${event.title}</h4>
                        <span class="text-sm font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full mt-2 sm:mt-0 w-fit">
                            ${this.formatDate(event.start_time)}
                        </span>
                    </div>
                    
                    <div class="text-gray-600 flex flex-col gap-2 text-sm">
                        <p class="flex items-center gap-2">
                            <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                            ${event.venue}
                        </p>
                        ${event.dress_code ? `
                        <p class="flex items-center gap-2">
                            <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                            Dress Code: ${event.dress_code}
                        </p>` : ''}
                    </div>
                </div>
            </div>
        `).join('');

        this.timelineContainer.innerHTML = `
            ${headerHTML}
            <div class="max-w-3xl mx-auto">${timelineHTML}</div>
        `;

        this.attachModalTriggers();
    }

    attachModalTriggers() {
        const openBtn = document.getElementById('openAddEventBtn');
        const firstEventBtn = document.getElementById('addFirstEventBtn');

        const triggerModal = () => {
            openAddEventModal(this.weddingId, () => {
                // Callback triggered after successful creation: reload timeline
                this.loadTimeline();
            });
        };

        if (openBtn) openBtn.addEventListener('click', triggerModal);
        if (firstEventBtn) firstEventBtn.addEventListener('click', triggerModal);
    }
}

// Wrapper for easy initialization
export function initEventTimeline(containerId, activeWeddingId) {
    return new EventTimeline(containerId, activeWeddingId);
}