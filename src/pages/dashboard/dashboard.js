import * as weddingService from '../../services/weddingService.js';
import { initEventTimeline } from '../events/event-timeline.js';
import { initFamilyManager } from '../families/family-manager.js';
import { createCard } from '../../components/card/card.js';
import { createButton } from '../../components/button/button.js';
import { supabase } from '../../config/api.js';

export function renderDashboard(containerOrOptions, weddingId = null) {
    console.log("[DEBUG] renderDashboard invoked. Raw arguments:", { containerOrOptions, weddingId, hash: window.location.hash });

    let activeWeddingId = weddingId;

    if (containerOrOptions && typeof containerOrOptions === 'object' && !(containerOrOptions instanceof HTMLElement)) {
        const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
        activeWeddingId = urlParams.get('weddingId') || containerOrOptions.params?.weddingId || null;
        console.log("[DEBUG] Parsed router options - weddingId:", activeWeddingId);
    }

    const wrapper = document.createElement('section');
    wrapper.style.cssText = "padding: 2rem; color: #f3f4f6; width: 100%; box-sizing: border-box;";
    wrapper.innerHTML = `<div style="text-align: center; color: #9ca3af; padding: 2rem;">Loading dashboard...</div>`;

    loadDashboardData(wrapper, activeWeddingId);

    return wrapper;
}

async function loadDashboardData(section, weddingId) {
    console.log("[DEBUG] loadDashboardData running with weddingId:", weddingId);
    try {
        if (weddingId) {
            console.log("[DEBUG] Fetching details for specific wedding ID:", weddingId);
            const [wedding, stats] = await Promise.all([
                weddingService.getWeddingById(weddingId),
                weddingService.getDashboardStats(weddingId)
            ]);

            console.log("[DEBUG] Successfully fetched wedding and stats:", { wedding, stats });

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
            contentContainer.style.cssText = "display: flex; flex-direction: column; gap: 2rem; margin-top: 2rem;";
            contentContainer.innerHTML = `
                <div style="background: #231718; border: 1px solid #3d292b; border-radius: 12px; padding: 1.5rem;">
                    <h2 style="font-size: 1.25rem; font-weight: bold; color: #fdf8f6; margin-bottom: 1rem;">Event Itinerary</h2>
                    <div id="wedding-timeline-container"></div>
                </div>

                <div style="background: #231718; border: 1px solid #3d292b; border-radius: 12px; padding: 1.5rem;">
                    <h2 style="font-size: 1.25rem; font-weight: bold; color: #fdf8f6; margin-bottom: 1rem;">Guest List</h2>
                    <div style="overflow-x: auto;">
                        <table style="width: 100%; text-align: left; border-collapse: collapse; font-size: 0.875rem;">
                            <thead>
                                <tr style="border-bottom: 1px solid #3d292b; color: #9ca3af;">
                                    <th style="padding: 0.75rem;">Name</th>
                                    <th style="padding: 0.75rem;">Family</th>
                                    <th style="padding: 0.75rem;">Phone</th>
                                    <th style="padding: 0.75rem;">RSVP</th>
                                    <th style="padding: 0.75rem;">Dietary</th>
                                    <th style="padding: 0.75rem;">Invite Code</th>
                                </tr>
                            </thead>
                            <tbody id="guestTableBody">
                                <tr><td colspan="6" style="text-align: center; padding: 1rem; color: #9ca3af;">Loading guests...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div id="family-manager-container"></div>
            `;
            section.appendChild(contentContainer);

            initEventTimeline('wedding-timeline-container', weddingId);
            initFamilyManager('family-manager-container', weddingId);
            
            const dashboardMgr = new DashboardManager(weddingId);
            await dashboardMgr.loadDashboardData();

        } else {
            console.log("[DEBUG] No weddingId provided. Loading global overview...");
            let weddings = [];
            const { data, error } = await supabase.from('weddings').select('*');
            if (!error && data) {
                weddings = data;
            } else if (error) {
                throw error;
            }
            console.log("[DEBUG] Global weddings fetched:", weddings);
            
            section.innerHTML = "";
            section.appendChild(buildGlobalHeader());

            const globalStats = [
                { label: "Total Weddings", value: weddings.length, icon: "heart" },
                { label: "Upcoming", value: weddings.filter(w => new Date(w.wedding_date) >= new Date()).length, icon: "calendar" },
                { label: "Archived", value: weddings.filter(w => new Date(w.wedding_date) < new Date()).length, icon: "archive" },
            ];

            section.appendChild(buildStatsGrid(globalStats));
            section.appendChild(buildRecentWeddingsSection(weddings));
            section.appendChild(buildRecentActivitySection());
        }

        if (window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons();
        }

    } catch (error) {
        console.error('[DEBUG ERROR] Failed to load dashboard data:', error);
        section.innerHTML = `<div style="color: #ef4444; padding: 2rem; background: #231718; border: 1px solid #3d292b; border-radius: 8px;">Failed to load data: ${error.message}</div>`;
    }
}

function buildGlobalHeader() {
    const header = document.createElement("div");
    header.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;";
    
    const titleWrap = document.createElement("div");
    titleWrap.innerHTML = `
        <h1 style="font-size: 2rem; font-weight: bold; color: #fdf8f6; margin: 0;">Dashboard</h1>
        <p style="color: #9ca3af; margin: 0.25rem 0 0 0; font-size: 0.95rem;">Welcome back! Here's an overview of your weddings.</p>
    `;
    header.appendChild(titleWrap);

    const createBtn = createButton({
        label: "Create Wedding",
        icon: "plus",
        variant: "primary",
        onClick: () => openCreateWeddingModal()
    });
    header.appendChild(createBtn);

    return header;
}

function buildSpecificHeader(wedding) {
    const header = document.createElement("div");
    header.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;";
    header.innerHTML = `
        <div>
            <h1 style="font-size: 2rem; font-weight: bold; color: #fdf8f6; margin: 0;">${wedding.couple_names}</h1>
            <p style="color: #9ca3af; margin: 0.25rem 0 0 0; font-size: 0.95rem;">Wedding Date: ${new Date(wedding.wedding_date).toLocaleDateString()}</p>
        </div>
        <button id="backToOverview" style="background: #3d292b; color: #e0bc6a; border: 1px solid #573a3d; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; font-weight: 500; font-size: 0.875rem;">
            ← Back to Overview
        </button>
    `;
    header.querySelector('#backToOverview').addEventListener('click', () => {
        console.log("[DEBUG] Returning to global overview via hash change.");
        window.location.hash = '#dashboard';
    });
    return header;
}

function buildStatsGrid(stats) {
    const grid = document.createElement("div");
    grid.style.cssText = "display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem;";
    grid.innerHTML = stats.map(s => `
        <div style="background: #231718; border: 1px solid #3d292b; border-radius: 12px; padding: 1.25rem; display: flex; align-items: center; justify-content: space-between;">
            <div>
                <p style="color: #9ca3af; font-size: 0.875rem; margin: 0; font-weight: 500;">${s.label}</p>
                <p style="color: #fdf8f6; font-size: 1.5rem; font-weight: bold; margin: 0.25rem 0 0 0;">${s.value}</p>
            </div>
            <div style="background: #3d292b; color: #e0bc6a; width: 44px; height: 44px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                <i data-lucide="${s.icon}" style="width: 22px; height: 22px;"></i>
            </div>
        </div>
    `).join('');
    return grid;
}

function buildRecentWeddingsSection(weddings) {
    const section = document.createElement("div");
    section.style.cssText = "margin-bottom: 2rem;";
    section.innerHTML = `<h2 style="font-size: 1.25rem; font-weight: bold; color: #fdf8f6; margin-bottom: 1rem;">Recent Weddings</h2>`;

    if (!weddings || weddings.length === 0) {
        const emptyDiv = document.createElement("div");
        emptyDiv.style.cssText = "background: #231718; border: 1px solid #3d292b; border-radius: 12px; padding: 2rem; text-align: center; color: #9ca3af;";
        emptyDiv.textContent = "No weddings have been created yet. Click \"+ Create Wedding\" above to get started!";
        section.appendChild(emptyDiv);
        return section;
    }

    const grid = document.createElement("div");
    grid.style.cssText = "display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem;";

    weddings.forEach(wedding => {
        const cardEl = createCard({
            title: wedding.couple_names,
            icon: "heart",
            content: buildWeddingCardContent(wedding),
            variant: "elevated",
            hoverable: true
        });
        cardEl.style.cssText = "cursor: pointer; background: #231718; border: 1px solid #3d292b; border-radius: 12px; color: #f3f4f6; display: flex; flex-direction: column; justify-content: space-between;";
        cardEl.addEventListener('click', () => {
            console.log("[DEBUG] Wedding card clicked, navigating to weddingId:", wedding.id);
            window.location.hash = `#dashboard?weddingId=${wedding.id}`;
        });
        grid.appendChild(cardEl);
    });

    section.appendChild(grid);
    return section;
}

function buildWeddingCardContent(wedding) {
    const frag = document.createDocumentFragment();
    const div = document.createElement("div");
    div.style.cssText = "font-size: 0.875rem; color: #9ca3af; margin-top: 0.5rem;";
    div.innerHTML = `
        <p style="margin: 0;">Date: ${new Date(wedding.wedding_date).toLocaleDateString()}</p>
    `;
    frag.appendChild(div);
    return frag;
}

function buildRecentActivitySection() {
    const section = document.createElement("div");
    section.innerHTML = `
        <h2 style="font-size: 1.25rem; font-weight: bold; color: #fdf8f6; margin-bottom: 1rem;">Recent Activity</h2>
        <div style="background: #231718; border: 1px solid #3d292b; border-radius: 12px; padding: 1.5rem; text-align: center; color: #9ca3af;">
            No activity available.
        </div>
    `;
    return section;
}

export function openCreateWeddingModal() {
    console.log("[DEBUG] openCreateWeddingModal triggered.");
    const existingModal = document.getElementById('createWeddingModal');
    if (existingModal) existingModal.remove();

    const modalHTML = `
        <div id="createWeddingModal" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background-color: rgba(0, 0, 0, 0.6); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 1rem;">
            <div style="background: #231718; border: 1px solid #3d292b; border-radius: 12px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3); max-width: 450px; width: 100%; padding: 2rem; color: #f3f4f6; position: relative;">
                
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                    <h3 style="margin: 0; font-size: 1.25rem; font-weight: bold; color: #fdf8f6;">Create Wedding</h3>
                    <button id="closeWeddingModal" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #9ca3af;">&times;</button>
                </div>

                <form id="createWeddingForm" style="display: flex; flex-direction: column; gap: 1rem;">
                    <div>
                        <label style="display: block; font-size: 0.875rem; font-weight: 500; color: #d1d5db; margin-bottom: 0.25rem;">Couple Names</label>
                        <input type="text" id="coupleNames" required placeholder="e.g., Riya & Karan" style="width: 100%; background: #1a1011; border: 1px solid #3d292b; border-radius: 8px; padding: 0.5rem 0.75rem; font-size: 0.875rem; color: white; box-sizing: border-box;" />
                    </div>

                    <div>
                        <label style="display: block; font-size: 0.875rem; font-weight: 500; color: #d1d5db; margin-bottom: 0.25rem;">Wedding Date</label>
                        <input type="date" id="weddingDate" required style="width: 100%; background: #1a1011; border: 1px solid #3d292b; border-radius: 8px; padding: 0.5rem 0.75rem; font-size: 0.875rem; color: white; box-sizing: border-box;" />
                    </div>

                    <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #3d292b;">
                        <button type="button" id="cancelWeddingBtn" style="padding: 0.5rem 1rem; background: transparent; border: none; color: #9ca3af; font-weight: 500; cursor: pointer; border-radius: 6px;">Cancel</button>
                        <button type="submit" id="saveWeddingBtn" style="padding: 0.5rem 1.25rem; background: #e0bc6a; color: #1a1011; border: none; font-weight: 600; cursor: pointer; border-radius: 6px;">Create</button>
                    </div>
                </form>

            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modal = document.getElementById('createWeddingModal');
    const closeBtn = document.getElementById('closeWeddingModal');
    const cancelBtn = document.getElementById('cancelWeddingBtn');
    const form = document.getElementById('createWeddingForm');

    const closeModal = () => modal.remove();

    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const saveBtn = document.getElementById('saveWeddingBtn');
        const coupleNames = document.getElementById('coupleNames').value.trim();
        const weddingDate = document.getElementById('weddingDate').value;

        console.log("[DEBUG] Submitting new wedding:", { coupleNames, weddingDate });

        try {
            saveBtn.disabled = true;
            saveBtn.textContent = 'Creating...';

            const { error } = await supabase.from('weddings').insert([{ 
                couple_names: coupleNames, 
                wedding_date: weddingDate 
            }]);

            if (error) throw error;

            console.log("[DEBUG] Wedding created successfully.");
            closeModal();
            window.location.reload(); 
        } catch (error) {
            console.error("[DEBUG ERROR] Failed to create wedding:", error);
            alert('Failed to create wedding: ' + error.message);
            saveBtn.disabled = false;
            saveBtn.textContent = 'Create';
        }
    });
}

class DashboardManager {
    constructor(weddingId) {
        this.weddingId = weddingId;
    }
    async loadDashboardData() {
        console.log("[DEBUG] DashboardManager loading guest table for weddingId:", this.weddingId);
        try {
            const { data, error } = await supabase
                .from('guests')
                .select('*')
                .eq('wedding_id', this.weddingId);

            if (error) throw error;

            console.log("[DEBUG] Guests loaded:", data);
            const tbody = document.getElementById('guestTableBody');
            if (tbody) {
                if (!data || data.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 1rem; color: #9ca3af;">No guests added yet.</td></tr>`;
                    return;
                }

                tbody.innerHTML = data.map(guest => `
                    <tr style="border-bottom: 1px solid #3d292b;">
                        <td style="padding: 0.75rem; font-weight: 500; color: #fdf8f6;">${guest.name}</td>
                        <td style="padding: 0.75rem; color: #9ca3af;">${guest.family_id || 'Unassigned'}</td>
                        <td style="padding: 0.75rem; color: #9ca3af;">${guest.phone || '-'}</td>
                        <td style="padding: 0.75rem;"><span style="padding: 0.25rem 0.5rem; font-size: 0.75rem; border-radius: 9999px; background: ${guest.rsvp_status === 'attending' ? 'rgba(16, 185, 129, 0.2); color: #34d399;' : 'rgba(234, 179, 8, 0.2); color: #facc15;'}">${guest.rsvp_status || 'Pending'}</span></td>
                        <td style="padding: 0.75rem; color: #9ca3af;">${guest.dietary_pref || '-'}</td>
                        <td style="padding: 0.75rem; font-family: monospace; font-size: 0.75rem; color: #9ca3af;">${guest.invite_code || '-'}</td>
                    </tr>
                `).join('');
            }
        } catch (err) {
            console.error("[DEBUG ERROR] Error loading guest table:", err);
        }
    }
}