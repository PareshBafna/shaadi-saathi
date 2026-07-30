import { eventService } from '../../services/eventService.js';

export class EventTimeline {
    constructor(containerId, weddingId) {
        this.container = document.getElementById(containerId);
        this.weddingId = weddingId;
    }

    async render() {
        this.container.innerHTML = `<div class="loader">Loading itinerary...</div>`;

        try {
            const events = await eventService.getEventsByWedding(this.weddingId);
            
            if (!events || events.length === 0) {
                this.renderEmptyState();
                return;
            }

            const timelineHTML = events.map((event, index) => this.createEventCard(event, index)).join('');
            
            this.container.innerHTML = `
                <div class="timeline-container">
                    ${timelineHTML}
                </div>
            `;
        } catch (error) {
            console.error('Failed to load events:', error);
            this.container.innerHTML = `<div class="toast-error">Unable to load the event schedule. Please try again.</div>`;
        }
    }

    createEventCard(event, index) {
        // Format time to 12-hour AM/PM format
        const startTime = new Date(event.start_time).toLocaleTimeString('en-IN', {
            hour: '2-digit', minute: '2-digit'
        });
        
        const date = new Date(event.start_time).toLocaleDateString('en-IN', {
            weekday: 'long', month: 'long', day: 'numeric'
        });

        // Alternating layout for desktop view
        const alignment = index % 2 === 0 ? 'left' : 'right';

        return `
            <div class="timeline-item ${alignment}">
                <div class="timeline-dot"></div>
                <div class="timeline-content card">
                    <span class="event-date">${date}</span>
                    <h3 class="event-title">${event.title}</h3>
                    <div class="event-details">
                        <p class="event-time">🕒 ${startTime}</p>
                        <p class="event-venue">📍 ${event.venue}</p>
                        ${event.dress_code ? `<p class="event-dresscode">👗 Dress Code: ${event.dress_code}</p>` : ''}
                    </div>
                    <button class="btn btn-outline" onclick="openDirections('${event.venue}')">
                        Get Directions
                    </button>
                </div>
            </div>
        `;
    }

    renderEmptyState() {
        // Placeholder data to preview the layout before real data is added
        this.container.innerHTML = `
            <div class="timeline-empty">
                <p>No events scheduled yet. Here is a preview of how it will look:</p>
                <div class="timeline-container blurred-preview">
                    ${this.createEventCard({
                        title: "Paresh & Darshana's Sangeet",
                        venue: "ITC Grand Chola, Chennai",
                        start_time: new Date().toISOString(),
                        dress_code: "Indo-Western / Formals"
                    }, 0)}
                </div>
            </div>
        `;
    }
}

// Global function for the directions button
window.openDirections = (venue) => {
    const query = encodeURIComponent(venue);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
};