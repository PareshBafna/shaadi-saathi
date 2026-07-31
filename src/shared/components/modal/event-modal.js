import { createEvent } from '../../services/eventService.js';

export function openAddEventModal(weddingId, onEventCreated) {
    // Remove any existing modal if already open
    const existingModal = document.getElementById('addEventModal');
    if (existingModal) existingModal.remove();

    const modalHTML = `
        <div id="addEventModal" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background-color: rgba(0, 0, 0, 0.6); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 1rem;">
            <div style="background: white; border-radius: 12px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); max-width: 450px; width: 100%; padding: 2rem; position: relative; font-family: inherit;">
                
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                    <h3 style="margin: 0; font-size: 1.25rem; font-weight: bold; color: #111827;">Add New Event</h3>
                    <button id="closeEventModal" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #9ca3af;">&times;</button>
                </div>

                <form id="addEventForm" style="display: flex; flex-direction: column; gap: 1rem;">
                    <div>
                        <label style="display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.25rem;">Event Title</label>
                        <input type="text" id="eventTitle" required placeholder="e.g., Sangeet Night" style="width: 100%; border: 1px solid #d1d5db; border-radius: 8px; padding: 0.5rem 0.75rem; font-size: 0.875rem; box-sizing: border-box;" />
                    </div>

                    <div>
                        <label style="display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.25rem;">Start Date & Time</label>
                        <input type="datetime-local" id="eventStartTime" required style="width: 100%; border: 1px solid #d1d5db; border-radius: 8px; padding: 0.5rem 0.75rem; font-size: 0.875rem; box-sizing: border-box;" />
                    </div>

                    <div>
                        <label style="display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.25rem;">Venue Name & Address</label>
                        <input type="text" id="eventVenue" required placeholder="e.g., Grand Ballroom, Chennai" style="width: 100%; border: 1px solid #d1d5db; border-radius: 8px; padding: 0.5rem 0.75rem; font-size: 0.875rem; box-sizing: border-box;" />
                    </div>

                    <div>
                        <label style="display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.25rem;">Dress Code (Optional)</label>
                        <input type="text" id="eventDressCode" placeholder="e.g., Festive Traditional" style="width: 100%; border: 1px solid #d1d5db; border-radius: 8px; padding: 0.5rem 0.75rem; font-size: 0.875rem; box-sizing: border-box;" />
                    </div>

                    <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #f3f4f6;">
                        <button type="button" id="cancelEventBtn" style="padding: 0.5rem 1rem; background: transparent; border: none; color: #4b5563; font-weight: 500; cursor: pointer; border-radius: 6px;">Cancel</button>
                        <button type="submit" id="saveEventBtn" style="padding: 0.5rem 1.25rem; background: #2563eb; color: white; border: none; font-weight: 500; cursor: pointer; border-radius: 6px;">Save Event</button>
                    </div>
                </form>

            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modal = document.getElementById('addEventModal');
    const closeBtn = document.getElementById('closeEventModal');
    const cancelBtn = document.getElementById('cancelEventBtn');
    const form = document.getElementById('addEventForm');

    const closeModal = () => modal.remove();

    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const saveBtn = document.getElementById('saveEventBtn');

        const eventData = {
            wedding_id: weddingId,
            title: document.getElementById('eventTitle').value.trim(),
            start_time: document.getElementById('eventStartTime').value,
            venue: document.getElementById('eventVenue').value.trim(),
            dress_code: document.getElementById('eventDressCode').value.trim() || null
        };

        try {
            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving...';
            
            await createEvent(eventData);
            closeModal();
            
            if (typeof onEventCreated === 'function') {
                onEventCreated();
            }
        } catch (error) {
            alert('Failed to create event: ' + error.message);
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save Event';
        }
    });
}