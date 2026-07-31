import { createButton } from '../../shared/components/button/button.js';
import { supabase } from '../../config/api.js';

export function renderDashboard() {
    const wrapper = document.createElement('section');
    wrapper.style.cssText = "padding: 2rem; color: #f3f4f6; width: 100%; box-sizing: border-box;";
    wrapper.innerHTML = `<div style="text-align: center; color: #9ca3af; padding: 2rem; font-size: 0.95rem;">Loading dashboard...</div>`;

    loadGlobalDashboardData(wrapper);
    return wrapper;
}

async function loadGlobalDashboardData(section) {
    try {
        let weddings = [];
        const { data, error } = await supabase.from('weddings').select('*');
        if (!error && data) {
            weddings = data;
        } else if (error) {
            throw error;
        }
        
        section.innerHTML = "";
        section.appendChild(buildGlobalHeader());

        const today = startOfDay(new Date());
        const totalCount = weddings.length;
        const upcomingCount = weddings.filter(w => new Date(w.wedding_date) >= today).length;
        const archivedCount = weddings.filter(w => new Date(w.wedding_date) < today).length;

        const globalStats = [
            { label: "Total Weddings", value: totalCount, icon: "heart" },
            { label: "Upcoming", value: upcomingCount, icon: "calendar" },
            { label: "Archived", value: archivedCount, icon: "archive" },
        ];

        section.appendChild(buildStatsGrid(globalStats));
        section.appendChild(buildFeaturedCelebrationSection(weddings));
        section.appendChild(buildRecentActivitySection());

        if (window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons();
        }

    } catch (error) {
        console.error('[DEBUG ERROR] Failed to load dashboard data:', error);
        section.innerHTML = `<div style="color: #ef4444; padding: 1.25rem; background: #231718; border: 1px solid #3d292b; border-radius: 8px; font-size: 0.9rem;">Failed to load data: ${error.message}</div>`;
    }
}

function buildGlobalHeader() {
    const header = document.createElement("div");
    header.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.75rem;";
    
    const titleWrap = document.createElement("div");
    titleWrap.innerHTML = `
        <h1 style="font-size: 1.65rem; font-weight: bold; color: #fdf8f6; margin: 0; letter-spacing: -0.02em;">Studio Dashboard</h1>
        <p style="color: #9ca3af; margin: 0.25rem 0 0 0; font-size: 0.9rem;">Executive command center and studio performance pulse.</p>
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

function startOfDay(date) {
    const copy = new Date(date);
    copy.setHours(0, 0, 0, 0);
    return copy;
}

function buildFeaturedCelebrationSection(weddings) {
    const container = document.createElement("div");
    container.style.cssText = "margin-bottom: 1.75rem;";

    const heading = document.createElement("h2");
    heading.style.cssText = "font-size: 1.1rem; font-weight: bold; color: #fdf8f6; margin-bottom: 0.85rem;";
    heading.textContent = "Featured Celebration Spotlight";
    container.appendChild(heading);

    if (!weddings || weddings.length === 0) {
        const emptyDiv = document.createElement("div");
        emptyDiv.style.cssText = "background: #1a1011; border: 1px dashed #3d292b; border-radius: 10px; padding: 1.25rem; text-align: center; color: #9ca3af; font-size: 0.85rem; max-width: 520px;";
        emptyDiv.textContent = "No weddings scheduled. Click \"+ Create Wedding\" above to initialize your first celebration.";
        container.appendChild(emptyDiv);
        return container;
    }

    const today = startOfDay(new Date());
    const sorted = [...weddings].sort((a, b) => new Date(a.wedding_date) - new Date(b.wedding_date));
    const featured = sorted.find(w => startOfDay(new Date(w.wedding_date)).getTime() >= today.getTime()) || sorted[sorted.length - 1];

    const cardEl = document.createElement("div");
    cardEl.style.cssText = "cursor: pointer; background: #1a1011; border: 1px solid #3d292b; border-radius: 10px; color: #f3f4f6; padding: 1rem 1.25rem; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2); transition: border-color 0.2s; max-width: 520px;";
    
    cardEl.addEventListener('mouseenter', () => cardEl.style.borderColor = '#e0bc6a');
    cardEl.addEventListener('mouseleave', () => cardEl.style.borderColor = '#3d292b');

    cardEl.innerHTML = `
        <div style="display: flex; align-items: center; gap: 1rem; width: 100%;">
            <div style="background: #3d292b; color: #e0bc6a; width: 38px; height: 38px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                <i data-lucide="heart" style="width: 18px; height: 18px;"></i>
            </div>
            <div style="flex: 1;">
                <h3 style="margin: 0; font-size: 0.95rem; font-weight: bold; color: #fdf8f6;">${featured.couple_names}</h3>
                <p style="margin: 0.15rem 0 0 0; font-size: 0.8rem; color: #9ca3af;">Scheduled for ${formatWeddingDate(featured.wedding_date)} &bull; <span style="color: #34d399; font-weight: 500;">Active Priority Focus</span></p>
            </div>
            <div style="color: #e0bc6a; font-size: 1rem; font-weight: bold; padding-left: 0.75rem;">
                →
            </div>
        </div>
    `;

    // Standard native hash assignment
    cardEl.addEventListener('click', () => {
        window.location.hash = `#wedding?id=${featured.id}`;
        window.dispatchEvent(new Event('hashchange'));
    });

    container.appendChild(cardEl);
    return container;
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

function buildRecentActivitySection() {
    const section = document.createElement("div");
    section.innerHTML = `
        <h2 style="font-size: 1.1rem; font-weight: bold; color: #fdf8f6; margin-bottom: 0.85rem;">Recent Studio Activity</h2>
        <div style="background: #1a1011; border: 1px solid #3d292b; border-radius: 10px; padding: 1.25rem; text-align: center; color: #9ca3af; font-size: 0.85rem; max-width: 520px;">
            No recent activity logs recorded.
        </div>
    `;
    return section;
}

export function openCreateWeddingModal() {
    const existingModal = document.getElementById('createWeddingModal');
    if (existingModal) existingModal.remove();

    const modalHTML = `
        <div id="createWeddingModal" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background-color: rgba(0, 0, 0, 0.7); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 1rem;">
            <div style="background: #231718; border: 1px solid #3d292b; border-radius: 10px; box-shadow: 0 15px 30px rgba(0, 0, 0, 0.4); max-width: 390px; width: 100%; padding: 1.75rem; color: #f3f4f6; position: relative;">
                
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
                    <h3 style="margin: 0; font-size: 1.15rem; font-weight: bold; color: #fdf8f6;">Create New Wedding</h3>
                    <button id="closeWeddingModal" style="background: none; border: none; font-size: 1.4rem; cursor: pointer; color: #9ca3af; padding: 0;">&times;</button>
                </div>

                <form id="createWeddingForm" style="display: flex; flex-direction: column; gap: 0.85rem;">
                    <div>
                        <label style="display: block; font-size: 0.825rem; font-weight: 500; color: #d1d5db; margin-bottom: 0.25rem;">Bride's Name</label>
                        <input type="text" id="brideName" required placeholder="e.g., Riya" style="width: 100%; background: #1a1011; border: 1px solid #3d292b; border-radius: 6px; padding: 0.5rem 0.75rem; font-size: 0.85rem; color: white; box-sizing: border-box;" />
                    </div>

                    <div>
                        <label style="display: block; font-size: 0.825rem; font-weight: 500; color: #d1d5db; margin-bottom: 0.25rem;">Groom's Name</label>
                        <input type="text" id="groomName" required placeholder="e.g., Karan" style="width: 100%; background: #1a1011; border: 1px solid #3d292b; border-radius: 6px; padding: 0.5rem 0.75rem; font-size: 0.85rem; color: white; box-sizing: border-box;" />
                    </div>

                    <div>
                        <label style="display: block; font-size: 0.825rem; font-weight: 500; color: #d1d5db; margin-bottom: 0.25rem;">Wedding Date</label>
                        <input type="date" id="weddingDate" required style="width: 100%; background: #1a1011; border: 1px solid #3d292b; border-radius: 6px; padding: 0.5rem 0.75rem; font-size: 0.85rem; color: white; box-sizing: border-box; cursor: pointer;" />
                    </div>

                    <div style="display: flex; justify-content: flex-end; gap: 0.6rem; margin-top: 1rem; padding-top: 0.85rem; border-top: 1px solid #3d292b;">
                        <button type="button" id="cancelWeddingBtn" style="padding: 0.5rem 0.85rem; background: transparent; border: none; color: #9ca3af; font-weight: 500; cursor: pointer; border-radius: 6px; font-size: 0.85rem;">Cancel</button>
                        <button type="submit" id="saveWeddingBtn" style="padding: 0.5rem 1.1rem; background: #e0bc6a; color: #1a1011; border: none; font-weight: 600; cursor: pointer; border-radius: 6px; font-size: 0.85rem;">Create Wedding</button>
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
        const brideName = document.getElementById('brideName').value.trim();
        const groomName = document.getElementById('groomName').value.trim();
        const coupleNames = `${brideName} & ${groomName}`;
        const weddingDate = document.getElementById('weddingDate').value;

        try {
            saveBtn.disabled = true;
            saveBtn.textContent = 'Creating...';

            const { error } = await supabase.from('weddings').insert([{ 
                couple_names: coupleNames, 
                wedding_date: weddingDate 
            }]);

            if (error) throw error;
            closeModal();
            window.location.hash = '#dashboard';
            window.dispatchEvent(new Event('hashchange'));
        } catch (error) {
            console.error("[DEBUG ERROR] Failed to create wedding:", error);
            alert('Failed to create wedding: ' + error.message);
            saveBtn.disabled = false;
            saveBtn.textContent = 'Create Wedding';
        }
    });
}