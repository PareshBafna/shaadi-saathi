import * as weddingService from '../../../database/js/weddingService.js';
import { supabase } from '../../../database/js/api.js';
import { initEventTimeline } from './event-timeline.js';
import { openModal } from '../../../global/components/js/modal.js';

export function renderWeddingCommandCenter(weddingId) {
    const wrapper = document.createElement('section');
    wrapper.style.cssText = "width: 100%; box-sizing: border-box;";
    wrapper.innerHTML = `<div style="text-align: center; color: var(--color-text-secondary); padding: var(--space-8); font-size: var(--font-size-base);">Loading command center...</div>`;

    if (!weddingId) {
        wrapper.innerHTML = `<div style="color: var(--color-danger); text-align: center; padding: var(--space-8);">Error: No Wedding ID provided. Please return to the directory.</div>`;
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
            { label: "Total Events", value: stats.totalEvents, icon: "calendar" }
        ];

        section.appendChild(buildStatsGrid(liveStats));

        const contentContainer = document.createElement("div");
        contentContainer.style.cssText = "display: flex; flex-direction: column; gap: var(--space-6); margin-top: var(--space-6);";
        
        contentContainer.innerHTML = `
            <div style="background: var(--color-white); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-6);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-4);">
                    <h2 style="font-size: var(--font-size-xl); font-weight: var(--font-weight-bold); color: var(--color-text-primary); margin: 0;">Event Itinerary</h2>
                    <button id="addEventBtn" style="background: var(--color-primary); color: var(--color-text-on-accent); border: none; padding: var(--space-2) var(--space-4); border-radius: var(--radius-sm); font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold); cursor: pointer; display: flex; align-items: center;">
                        <i data-lucide="plus" style="width:16px; height:16px; margin-right:4px;"></i> Add Event
                    </button>
                </div>
                <div id="wedding-timeline-container"></div>
            </div>

            <div style="background: var(--color-white); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-6);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-4);">
                    <h2 style="font-size: var(--font-size-xl); font-weight: var(--font-weight-bold); color: var(--color-text-primary); margin: 0;">Guest List Control Center</h2>
                    <button id="addGuestBtn" style="background: var(--color-primary); color: var(--color-text-on-accent); border: none; padding: var(--space-2) var(--space-4); border-radius: var(--radius-sm); font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold); cursor: pointer; display: flex; align-items: center;">
                        <i data-lucide="plus" style="width:16px; height:16px; margin-right:4px;"></i> Add Guest
                    </button>
                </div>
                <div style="overflow-x: auto;">
                    <table style="width: 100%; text-align: left; border-collapse: collapse; font-size: var(--font-size-sm);">
                        <thead>
                            <tr style="border-bottom: 1px solid var(--color-border); color: var(--color-text-secondary);">
                                <th style="padding: var(--space-3); font-weight: var(--font-weight-semibold);">Name</th>
                                <th style="padding: var(--space-3); font-weight: var(--font-weight-semibold);">Phone</th>
                                <th style="padding: var(--space-3); font-weight: var(--font-weight-semibold);">Dietary</th>
                                <th style="padding: var(--space-3); font-weight: var(--font-weight-semibold);">Invite Code</th>
                            </tr>
                        </thead>
                        <tbody id="guestTableBody">
                            <tr><td colspan="4" style="text-align: center; padding: var(--space-4); color: var(--color-text-muted);">Loading guests...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        section.appendChild(contentContainer);

        setTimeout(() => {
            const addGuestBtn = document.getElementById('addGuestBtn');
            if (addGuestBtn) addGuestBtn.addEventListener('click', () => openAddGuestModal(weddingId));
        }, 0);

        initEventTimeline('wedding-timeline-container', weddingId);
        await loadGuestTableData(weddingId);

        if (window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons();
        }

    } catch (error) {
        console.error('[DEBUG ERROR] Failed to load wedding data:', error);
        section.innerHTML = `<div style="color: var(--color-danger); padding: var(--space-6); background: var(--color-white); border: 1px solid var(--color-border); border-radius: var(--radius-md);">Failed to load data: ${error.message}</div>`;
    }
}

function buildSpecificHeader(wedding) {
    const header = document.createElement("div");
    header.style.cssText = "display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-8);";
    
    const familyText = wedding.family_details ? `<p style="color: var(--color-text-secondary); margin: 4px 0 0 0; font-size: var(--font-size-sm);"><i data-lucide="users" style="width:14px; height:14px; vertical-align:middle; margin-right:4px;"></i> ${wedding.family_details}</p>` : '';
    const contactText = wedding.contact_details ? `<p style="color: var(--color-text-secondary); margin: 4px 0 0 0; font-size: var(--font-size-sm);"><i data-lucide="phone" style="width:14px; height:14px; vertical-align:middle; margin-right:4px;"></i> ${wedding.contact_details}</p>` : '';

    header.innerHTML = `
        <div>
            <h1 style="font-size: var(--font-size-3xl); font-weight: var(--font-weight-bold); color: var(--color-text-primary); margin: 0;">${wedding.couple_names}</h1>
            <p style="color: var(--color-text-secondary); margin: var(--space-2) 0 var(--space-2) 0; font-size: var(--font-size-base);">Celebration Timeline: <strong style="color: var(--color-primary);">${formatWeddingDateRange(wedding.start_date, wedding.end_date)}</strong></p>
            ${familyText}
            ${contactText}
        </div>
    `;
    return header;
}

function buildStatsGrid(stats) {
    const grid = document.createElement("div");
    grid.style.cssText = "display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: var(--space-4); margin-bottom: var(--space-8);";
    grid.innerHTML = stats.map(s => `
        <div class="stat-card" style="padding: var(--space-4); display: flex; align-items: center; justify-content: space-between;">
            <div>
                <p style="color: var(--color-text-secondary); font-size: var(--font-size-sm); margin: 0; font-weight: var(--font-weight-medium);">${s.label}</p>
                <p style="color: var(--color-text-primary); font-size: var(--font-size-2xl); font-weight: var(--font-weight-bold); margin: 4px 0 0 0;">${s.value}</p>
            </div>
            <div style="background: var(--color-border); color: var(--color-primary); width: 36px; height: 36px; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
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
                tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: var(--space-4); color: var(--color-text-muted);">No guests added yet. Click "+ Add Guest" to start.</td></tr>`;
                return;
            }

            tbody.innerHTML = data.map(guest => `
                <tr style="border-bottom: 1px solid var(--color-border);">
                    <td style="padding: var(--space-3); font-weight: var(--font-weight-medium);">${guest.name}</td>
                    <td style="padding: var(--space-3); color: var(--color-text-secondary);">${guest.phone || '-'}</td>
                    <td style="padding: var(--space-3); color: var(--color-text-secondary);">${guest.dietary_pref || '-'}</td>
                    <td style="padding: var(--space-3); font-family: monospace; color: var(--color-primary);">${guest.invite_code || '-'}</td>
                </tr>
            `).join('');
        }
    } catch (err) {
        console.error("[DEBUG ERROR] Error loading guest table:", err);
    }
}

function openAddGuestModal(weddingId) {
    const formHTML = `
        <form id="addGuestForm" style="display:flex; flex-direction:column; gap:var(--space-3);">
            <div>
                <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:4px;">Guest Name *</label>
                <input type="text" id="guestName" required style="width:100%; background:var(--color-bg); border:1px solid var(--color-border); color:var(--color-text-primary); padding:var(--space-2); border-radius:var(--radius-sm); box-sizing:border-box;">
            </div>
            <div>
                <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:4px;">Phone Number</label>
                <input type="tel" id="guestPhone" style="width:100%; background:var(--color-bg); border:1px solid var(--color-border); color:var(--color-text-primary); padding:var(--space-2); border-radius:var(--radius-sm); box-sizing:border-box;">
            </div>
        </form>
    `;

    const modal = openModal({
        title: "Add New Guest",
        content: formHTML,
        actions: [
            { label: "Cancel", variant: "ghost" },
            { 
                label: "Add Guest", 
                variant: "primary", 
                closesModal: false,
                onClick: async () => {
                    const form = document.getElementById('addGuestForm');
                    if(!form.checkValidity()) { form.reportValidity(); return; }

                    const guestData = {
                        wedding_id: weddingId,
                        name: document.getElementById('guestName').value.trim(),
                        phone: document.getElementById('guestPhone').value.trim() || null,
                        invite_code: Math.random().toString(36).substring(2, 8).toUpperCase()
                    };

                    try {
                        const { error } = await supabase.from('guests').insert([guestData]);
                        if (error) throw error;
                        modal.close();
                        loadGuestTableData(weddingId);
                    } catch (error) {
                        alert('Failed to add guest: ' + error.message);
                    }
                }
            }
        ]
    });
}

export function formatWeddingDateRange(startIso, endIso) {
    if (!startIso || !endIso) return "";
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

    // If it's a 1-day event
    if (startIso === endIso) {
        return `${sDay}${getSuffix(sDay)} ${start.toLocaleString("en-IN", { month: "long" })}, ${year}`;
    }
    
    // If it spans multiple days in the same month
    if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
        return `${sDay}${getSuffix(sDay)} - ${eDay}${getSuffix(eDay)} ${start.toLocaleString("en-IN", { month: "long" })}, ${year}`;
    }
    
    // If it spans across different months
    return `${sDay}${getSuffix(sDay)} ${sMonth} - ${eDay}${getSuffix(eDay)} ${eMonth}, ${year}`;
}