import * as weddingService from '../../shared/services/weddingService.js';
import { initEventTimeline } from './event-timeline.js';
import { initFamilyManager } from './family-manager.js';
import { supabase } from '../../config/api.js';

export function renderWeddingCommandCenter(weddingId) {
    const wrapper = document.createElement('section');
    wrapper.style.cssText = "padding: 2rem; color: #f3f4f6; width: 100%; box-sizing: border-box;";
    wrapper.innerHTML = `<div style="text-align: center; color: #9ca3af; padding: 2rem; font-size: 0.95rem;">Loading command center...</div>`;

    if (!weddingId) {
        wrapper.innerHTML = `<div style="color: #ef4444; text-align: center; padding: 2rem;">Error: No Wedding ID provided. Please return to the directory.</div>`;
        return wrapper;
    }

    loadWeddingData(wrapper, weddingId);
    return wrapper;
}

async function loadWeddingData(section, weddingId) {
    try {
        const [wedding, stats] = await Promise.all([
            weddingService.getWeddingById(weddingId),
            weddingService.getDashboardStats(weddingId)
        ]);

        section.innerHTML = "";
        section.appendChild(buildSpecificHeader(wedding));

        const liveStats = [
            { label: "Total Guests", value: stats.totalGuests, icon: "users" },
            { label: "Attending", value: stats.rsvp.attending, icon: "check-circle" },
            { label: "Pending RSVPs", value: stats.rsvp.pending, icon: "clock" },
            { label: "Total Events", value: stats.totalEvents, icon: "calendar" }
        ];

        section.appendChild(buildStatsGrid(liveStats));

        const contentContainer = document.createElement("div");
        contentContainer.style.cssText = "display: flex; flex-direction: column; gap: 1.5rem; margin-top: 1.5rem;";
        contentContainer.innerHTML = `
            <div style="background: #231718; border: 1px solid #3d292b; border-radius: 10px; padding: 1.25rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.85rem;">
                    <h2 style="font-size: 1.1rem; font-weight: bold; color: #fdf8f6; margin: 0;">Event Itinerary</h2>
                    <button id="addEventBtn" style="background: transparent; color: #e0bc6a; border: 1px solid #573a3d; padding: 0.3rem 0.75rem; border-radius: 6px; font-size: 0.75rem; font-weight: 500; cursor: pointer; transition: border-color 0.2s;">+ Add Event</button>
                </div>
                <div id="wedding-timeline-container"></div>
            </div>

            <div style="background: #231718; border: 1px solid #3d292b; border-radius: 10px; padding: 1.25rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.85rem;">
                    <h2 style="font-size: 1.1rem; font-weight: bold; color: #fdf8f6; margin: 0;">Guest List Control Center</h2>
                    <button id="addGuestBtn" style="background: #e0bc6a; color: #1a1011; border: none; padding: 0.35rem 0.85rem; border-radius: 6px; font-size: 0.75rem; font-weight: 600; cursor: pointer; transition: opacity 0.2s;">+ Add Guest</button>
                </div>
                <div style="overflow-x: auto;">
                    <table style="width: 100%; text-align: left; border-collapse: collapse; font-size: 0.85rem;">
                        <thead>
                            <tr style="border-bottom: 1px solid #3d292b; color: #9ca3af;">
                                <th style="padding: 0.6rem; font-weight: 600;">Name</th>
                                <th style="padding: 0.6rem; font-weight: 600;">Family</th>
                                <th style="padding: 0.6rem; font-weight: 600;">Phone</th>
                                <th style="padding: 0.6rem; font-weight: 600;">RSVP</th>
                                <th style="padding: 0.6rem; font-weight: 600;">Dietary</th>
                                <th style="padding: 0.6rem; font-weight: 600;">Invite Code</th>
                            </tr>
                        </thead>
                        <tbody id="guestTableBody">
                            <tr><td colspan="6" style="text-align: center; padding: 1rem; color: #9ca3af; font-size: 0.85rem;">Loading guests...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div id="family-manager-container"></div>
        `;
        section.appendChild(contentContainer);

        setTimeout(() => {
            const addGuestBtn = document.getElementById('addGuestBtn');
            if (addGuestBtn) addGuestBtn.addEventListener('click', () => openAddGuestModal(weddingId));
            
            const addEventBtn = document.getElementById('addEventBtn');
            if (addEventBtn) addEventBtn.addEventListener('click', () => alert("Event builder module coming next!"));
        }, 0);

        initEventTimeline('wedding-timeline-container', weddingId);
        initFamilyManager('family-manager-container', weddingId);
        
        await loadGuestTableData(weddingId);

        if (window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons();
        }

    } catch (error) {
        console.error('[DEBUG ERROR] Failed to load wedding data:', error);
        section.innerHTML = `<div style="color: #ef4444; padding: 1.25rem; background: #231718; border: 1px solid #3d292b; border-radius: 8px; font-size: 0.9rem;">Failed to load data: ${error.message}</div>`;
    }
}

function buildSpecificHeader(wedding) {
    const header = document.createElement("div");
    header.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.75rem;";
    header.innerHTML = `
        <div>
            <h1 style="font-size: 1.65rem; font-weight: bold; color: #fdf8f6; margin: 0;">${wedding.couple_names}</h1>
            <p style="color: #9ca3af; margin: 0.25rem 0 0 0; font-size: 0.9rem;">Wedding Date: <strong style="color: #e0bc6a;">${formatWeddingDate(wedding.wedding_date)}</strong></p>
        </div>
        <button id="backToOverview" style="background: #3d292b; color: #e0bc6a; border: 1px solid #573a3d; padding: 0.4rem 0.85rem; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.85rem; transition: background 0.2s;">
            ← Back to Overview
        </button>
    `;
    
    header.querySelector('#backToOverview').addEventListener('click', () => {
        window.location.hash = '#weddings';
    });
    return header;
}

function buildStatsGrid(stats) {
    const grid = document.createElement("div");
    grid.style.cssText = "display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 1rem; margin-bottom: 1.75rem;";
    grid.innerHTML = stats.map(s => `
        <div style="background: #231718; border: 1px solid #3d292b; border-radius: 10px; padding: 0.85rem 1.15rem; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);">
            <div>
                <p style="color: #9ca3af; font-size: 0.8rem; margin: 0; font-weight: 500;">${s.label}</p>
                <p style="color: #fdf8f6; font-size: 1.4rem; font-weight: bold; margin: 0.2rem 0 0 0; letter-spacing: -0.02em;">${s.value}</p>
            </div>
            <div style="background: #3d292b; color: #e0bc6a; width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                <i data-lucide="${s.icon}" style="width: 18px; height: 18px;"></i>
            </div>
        </div>
    `).join('');
    return grid;
}

function formatWeddingDate(isoDate) {
    if (!isoDate) return "";
    const date = new Date(isoDate);
    const day = date.getDate();
    
    let suffix = "th";
    if (day === 1 || day === 21 || day === 31) suffix = "st";
    else if (day === 2 || day === 22) suffix = "nd";
    else if (day === 3 || day === 23) suffix = "rd";
    
    const month = date.toLocaleString("en-IN", { month: "long" });
    const year = date.getFullYear();
    
    return `${day}${suffix} ${month}, ${year}`;
}

async function loadGuestTableData(weddingId) {
    try {
        const { data, error } = await supabase
            .from('guests')
            .select('*')
            .eq('wedding_id', weddingId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const tbody = document.getElementById('guestTableBody');
        if (tbody) {
            if (!data || data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 1rem; color: #9ca3af; font-size: 0.85rem;">No guests added yet. Click "+ Add Guest" to start.</td></tr>`;
                return;
            }

            tbody.innerHTML = data.map(guest => `
                <tr style="border-bottom: 1px solid #3d292b; transition: background 0.15s;" onmouseover="this.style.background='#1a1011'" onmouseout="this.style.background='transparent'">
                    <td style="padding: 0.6rem 0.75rem; font-weight: 500; color: #fdf8f6; font-size: 0.85rem;">${guest.name}</td>
                    <td style="padding: 0.6rem 0.75rem; color: #9ca3af; font-size: 0.85rem;">${guest.family_id || 'Unassigned'}</td>
                    <td style="padding: 0.6rem 0.75rem; color: #9ca3af; font-size: 0.85rem;">${guest.phone || '-'}</td>
                    <td style="padding: 0.6rem 0.75rem;"><span style="padding: 0.15rem 0.5rem; font-size: 0.725rem; border-radius: 9999px; font-weight: 500; background: ${guest.rsvp_status === 'attending' ? 'rgba(16, 185, 129, 0.2); color: #34d399;' : guest.rsvp_status === 'declined' ? 'rgba(239, 68, 68, 0.2); color: #ef4444;' : 'rgba(234, 179, 8, 0.2); color: #facc15;'}">${guest.rsvp_status.charAt(0).toUpperCase() + guest.rsvp_status.slice(1) || 'Pending'}</span></td>
                    <td style="padding: 0.6rem 0.75rem; color: #9ca3af; font-size: 0.85rem;">${guest.dietary_pref || '-'}</td>
                    <td style="padding: 0.6rem 0.75rem; font-family: monospace; font-size: 0.75rem; color: #e0bc6a; letter-spacing: 0.05em;">${guest.invite_code || '-'}</td>
                </tr>
            `).join('');
        }
    } catch (err) {
        console.error("[DEBUG ERROR] Error loading guest table:", err);
    }
}

function openAddGuestModal(weddingId) {
    const existingModal = document.getElementById('addGuestModal');
    if (existingModal) existingModal.remove();

    const modalHTML = `
        <div id="addGuestModal" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background-color: rgba(0, 0, 0, 0.7); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 1rem;">
            <div style="background: #231718; border: 1px solid #3d292b; border-radius: 10px; box-shadow: 0 15px 30px rgba(0, 0, 0, 0.4); max-width: 390px; width: 100%; padding: 1.75rem; color: #f3f4f6; position: relative;">
                
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
                    <h3 style="margin: 0; font-size: 1.15rem; font-weight: bold; color: #fdf8f6;">Add New Guest</h3>
                    <button id="closeGuestModal" style="background: none; border: none; font-size: 1.4rem; cursor: pointer; color: #9ca3af; padding: 0;">&times;</button>
                </div>

                <form id="addGuestForm" style="display: flex; flex-direction: column; gap: 0.85rem;">
                    <div>
                        <label style="display: block; font-size: 0.825rem; font-weight: 500; color: #d1d5db; margin-bottom: 0.25rem;">Guest Name *</label>
                        <input type="text" id="guestName" required placeholder="e.g., Anjali Sharma" style="width: 100%; background: #1a1011; border: 1px solid #3d292b; border-radius: 6px; padding: 0.5rem 0.75rem; font-size: 0.85rem; color: white; box-sizing: border-box;" />
                    </div>

                    <div>
                        <label style="display: block; font-size: 0.825rem; font-weight: 500; color: #d1d5db; margin-bottom: 0.25rem;">Phone Number</label>
                        <input type="tel" id="guestPhone" placeholder="e.g., +91 98765 43210" style="width: 100%; background: #1a1011; border: 1px solid #3d292b; border-radius: 6px; padding: 0.5rem 0.75rem; font-size: 0.85rem; color: white; box-sizing: border-box;" />
                    </div>

                    <div>
                        <label style="display: block; font-size: 0.825rem; font-weight: 500; color: #d1d5db; margin-bottom: 0.25rem;">RSVP Status</label>
                        <select id="guestRsvp" style="width: 100%; background: #1a1011; border: 1px solid #3d292b; border-radius: 6px; padding: 0.5rem 0.75rem; font-size: 0.85rem; color: white; box-sizing: border-box; cursor: pointer;">
                            <option value="Pending">Pending</option>
                            <option value="Attending">Attending</option>
                            <option value="Declined">Declined</option>
                        </select>
                    </div>

                    <div style="display: flex; justify-content: flex-end; gap: 0.6rem; margin-top: 1rem; padding-top: 0.85rem; border-top: 1px solid #3d292b;">
                        <button type="button" id="cancelGuestBtn" style="padding: 0.5rem 0.85rem; background: transparent; border: none; color: #9ca3af; font-weight: 500; cursor: pointer; border-radius: 6px; font-size: 0.85rem;">Cancel</button>
                        <button type="submit" id="saveGuestBtn" style="padding: 0.5rem 1.1rem; background: #e0bc6a; color: #1a1011; border: none; font-weight: 600; cursor: pointer; border-radius: 6px; font-size: 0.85rem;">Add Guest</button>
                    </div>
                </form>

            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modal = document.getElementById('addGuestModal');
    const closeBtn = document.getElementById('closeGuestModal');
    const cancelBtn = document.getElementById('cancelGuestBtn');
    const form = document.getElementById('addGuestForm');

    const closeModal = () => modal.remove();

    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const saveBtn = document.getElementById('saveGuestBtn');
        const guestName = document.getElementById('guestName').value.trim();
        const guestPhone = document.getElementById('guestPhone').value.trim() || null;
        const guestRsvp = document.getElementById('guestRsvp').value;
        
        const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

        try {
            saveBtn.disabled = true;
            saveBtn.textContent = 'Adding...';

            const { error } = await supabase.from('guests').insert([{ 
                wedding_id: weddingId,
                name: guestName,
                phone: guestPhone,
                rsvp_status: guestRsvp.toLowerCase(),
                invite_code: inviteCode
            }]);

            if (error) throw error;
            closeModal();
            loadGuestTableData(weddingId); 
        } catch (error) {
            console.error("[DEBUG ERROR] Failed to add guest:", error);
            alert('Failed to add guest: ' + error.message);
            saveBtn.disabled = false;
            saveBtn.textContent = 'Add Guest';
        }
    });
}