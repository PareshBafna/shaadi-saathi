import { supabase } from '../../../database/js/api.js';
import { openCreateWeddingModal } from '../../dashboard/js/dashboard.js';

let allWeddings = [];

// SIMULATED AUTH CONTEXT (Update this with your real global auth state later)
const currentUser = {
    id: "creator_paresh",
    role: "creator" // 'creator', 'host', or 'guest'
};

export function renderWeddings() {
    const wrapper = document.createElement('section');
    wrapper.className = "weddings-directory";
    wrapper.style.cssText = "width: 100%; box-sizing: border-box;";

    // ==========================================
    // 1. CONTROL BAR (Sort | Button | Search)
    // ==========================================
    const controls = document.createElement('div');
    controls.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-6); background: var(--color-white); padding: var(--space-4); border-radius: var(--radius-lg); border: 1px solid var(--color-border);";

    // LEFT: Sort Dropdown
    const sortContainer = document.createElement('div');
    sortContainer.innerHTML = `
        <div style="display: flex; align-items: center; gap: var(--space-2);">
            <span style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">Sort by:</span>
            <select id="sortWeddings" style="background: var(--color-bg); border: 1px solid var(--color-border); color: var(--color-text-primary); padding: var(--space-2) var(--space-3); border-radius: var(--radius-sm); font-size: var(--font-size-sm); cursor: pointer; outline: none;">
                <option value="date-asc">Date (Earliest first)</option>
                <option value="date-desc">Date (Latest first)</option>
                <option value="name-asc">Couple Names (A-Z)</option>
            </select>
        </div>
    `;

    // CENTER: "Wedding" Button (Visible ONLY to Creator)
    const centerContainer = document.createElement('div');
    if (currentUser.role === 'creator') {
        const createBtn = document.createElement("button");
        createBtn.innerHTML = `<i data-lucide="plus" style="width:16px; height:16px; margin-right:4px; vertical-align:middle;"></i> Wedding`;
        createBtn.style.cssText = "background: var(--color-primary); color: var(--color-text-on-accent); border: none; padding: 0.5rem 1.25rem; border-radius: var(--radius-sm); font-weight: var(--font-weight-semibold); cursor: pointer; font-size: var(--font-size-sm); display:flex; align-items:center; transition: opacity 0.2s;";
        createBtn.addEventListener('click', openCreateWeddingModal);
        centerContainer.appendChild(createBtn);
    }

    // RIGHT: Search Bar
    const searchContainer = document.createElement('div');
    searchContainer.innerHTML = `
        <div style="position: relative;">
            <i data-lucide="search" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); width: 16px; height: 16px; color: var(--color-text-secondary);"></i>
            <input type="text" id="searchWeddings" placeholder="Search celebrations..." style="background: var(--color-bg); border: 1px solid var(--color-border); color: var(--color-text-primary); padding: var(--space-2) var(--space-3) var(--space-2) 32px; border-radius: var(--radius-sm); font-size: var(--font-size-sm); width: 250px; outline: none;">
        </div>
    `;

    controls.appendChild(sortContainer);
    controls.appendChild(centerContainer);
    controls.appendChild(searchContainer);
    wrapper.appendChild(controls);

    // ==========================================
    // 2. GALLERIES CONTAINER
    // ==========================================
    const sectionsContainer = document.createElement('div');
    sectionsContainer.id = "weddings-galleries";
    wrapper.appendChild(sectionsContainer);

    // Fetch Initial Data
    loadWeddingsData(sectionsContainer);

    // Instant Refresh Listener
    window.addEventListener('weddingDataUpdated', () => {
        if (document.getElementById('weddings-galleries')) {
            loadWeddingsData(document.getElementById('weddings-galleries'));
        }
    });

    // Search & Sort Listeners
    setTimeout(() => {
        document.getElementById('searchWeddings')?.addEventListener('input', () => filterAndRenderGalleries());
        document.getElementById('sortWeddings')?.addEventListener('change', () => filterAndRenderGalleries());
        if (window.lucide) window.lucide.createIcons();
    }, 0);

    return wrapper;
}

function startOfDay(date) {
    const copy = new Date(date);
    copy.setHours(0, 0, 0, 0);
    return copy;
}

async function loadWeddingsData(container) {
    container.innerHTML = `<div style="text-align: center; padding: var(--space-8); color: var(--color-text-secondary);">Loading celebrations...</div>`;
    try {
        const { data, error } = await supabase.from('weddings').select('*');
        if (error) throw error;
        
        allWeddings = data || [];
        filterAndRenderGalleries();
    } catch (error) {
        console.error('[DEBUG ERROR] Failed to load weddings directory:', error);
        container.innerHTML = `<div style="color: var(--color-danger); text-align: center; padding: var(--space-8);">Failed to load data: ${error.message}</div>`;
    }
}

function filterAndRenderGalleries() {
    const searchTerm = document.getElementById('searchWeddings')?.value.toLowerCase() || '';
    const sortValue = document.getElementById('sortWeddings')?.value || 'date-asc';

    const combinedSearchTerm = searchTerm.replace(/\s+/g, ''); // For searching "bride&groom" easily
    
    let filtered = allWeddings.filter(w => {
        const side = w.primary_side || 'bride';
        const full = side === 'groom' ? `${w.groom_name} & ${w.bride_name}`.toLowerCase() : `${w.bride_name} & ${w.groom_name}`.toLowerCase();
        return full.includes(searchTerm) || w.bride_name.toLowerCase().includes(searchTerm) || w.groom_name.toLowerCase().includes(searchTerm);
    });

    filtered.sort((a, b) => {
        if (sortValue === 'date-asc') return new Date(a.start_date) - new Date(b.start_date);
        if (sortValue === 'date-desc') return new Date(b.start_date) - new Date(a.start_date);
        if (sortValue === 'name-asc') {
            const sideA = a.primary_side || 'bride';
            const nameA = sideA === 'groom' ? `${a.groom_name} & ${a.bride_name}` : `${a.bride_name} & ${a.groom_name}`;
            const sideB = b.primary_side || 'bride';
            const nameB = sideB === 'groom' ? `${b.groom_name} & ${b.bride_name}` : `${b.bride_name} & ${b.groom_name}`;
            return nameA.localeCompare(nameB);
        }
        return 0;
    });

    const todayTime = startOfDay(new Date()).getTime();

    // FILTER GALLERY LISTS
    const inProgress = filtered.filter(w => {
        const start = startOfDay(new Date(w.start_date)).getTime();
        const end = startOfDay(new Date(w.end_date)).getTime();
        return todayTime >= start && todayTime <= end;
    });
    const upcoming = filtered.filter(w => startOfDay(new Date(w.start_date)).getTime() > todayTime);
    const archived = filtered.filter(w => startOfDay(new Date(w.end_date)).getTime() < todayTime);

    const container = document.getElementById('weddings-galleries');
    if (!container) return;

    if (filtered.length === 0) {
        container.innerHTML = `<div style="text-align: center; padding: var(--space-8); color: var(--color-text-muted); background: var(--color-white); border-radius: var(--radius-lg); border: 1px solid var(--color-border);">No celebrations match your search.</div>`;
        return;
    }

    container.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: var(--space-6); width: 100%; align-items: start;">
            ${buildGallerySection("In Progress", inProgress)}
            ${buildGallerySection("Upcoming", upcoming)}
            ${buildGallerySection("Archived", archived)}
        </div>
    `;

    container.querySelectorAll('.gallery-card').forEach(card => {
        card.addEventListener('click', () => {
            const id = card.getAttribute('data-wedding-id');
            window.location.hash = `#wedding?id=${id}`;
        });
    });

    if (window.lucide) window.lucide.createIcons();
}

function buildGallerySection(title, weddings) {
    if (!weddings || weddings.length === 0) return '';
    
    const listItems = weddings.map(wedding => {
        const isOwnerOrCreator = currentUser.role === 'creator' || currentUser.id === wedding.host_id;
        const guestStat = isOwnerOrCreator ? 
            `<div style="display:flex; align-items:center; gap:6px; font-size:var(--font-size-xs); color:var(--color-text-secondary);"><i data-lucide="users" style="width:14px; height:14px;"></i> ${wedding.guests_count || 0} Guests</div>` : '';

        // Evaluate the display name order
        const displayNames = wedding.primary_side === 'groom' 
            ? `${wedding.groom_name} & ${wedding.bride_name}` 
            : `${wedding.bride_name} & ${wedding.groom_name}`;

        // ADDED 'stat-card' here so the hover effect applies ONLY to the specific list item
        return `
        <div class="stat-card gallery-card" data-wedding-id="${wedding.id}" style="cursor: pointer; padding: 1rem 1.25rem; display: flex; flex-direction: column; gap: var(--space-3); transition: all 0.2s ease;">
            
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <div style="background: var(--color-border); color: var(--color-primary); width: 32px; height: 32px; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                        <i data-lucide="heart" style="width: 16px; height: 16px;"></i>
                    </div>
                    <div>
                        <h3 style="margin: 0; font-size: 0.95rem; font-weight: var(--font-weight-bold); color: var(--color-text-primary);">${displayNames}</h3>
                        <p style="margin: 4px 0 0 0; font-size: 0.8rem; color: var(--color-text-secondary);"><i data-lucide="calendar" style="width:12px; height:12px; vertical-align:middle; margin-right:4px;"></i> ${formatWeddingDateRange(wedding.start_date, wedding.end_date)}</p>
                    </div>
                </div>
                <div style="color: var(--color-primary); font-size: var(--font-size-sm); font-weight: var(--font-weight-medium); padding-left: var(--space-4);">
                    Manage →
                </div>
            </div>

            <!-- Extra Details Row (Guests & Events) -->
            <div style="display: flex; justify-content: flex-start; gap: var(--space-5); margin-top: 4px; padding-top: var(--space-3); border-top: 1px solid var(--color-border);">
                ${guestStat}
                <div style="display:flex; align-items:center; gap:6px; font-size:var(--font-size-xs); color:var(--color-text-secondary);"><i data-lucide="calendar-days" style="width:14px; height:14px;"></i> ${wedding.events_count || 0} Events Invited</div>
            </div>

        </div>
        `;
    }).join('');

    // REMOVED 'stat-card' from the outer wrapper to kill the giant hover effect, 
    // replacing it with explicit background/border styles so it still looks right.
    return `
        <div style="background: var(--color-white); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-5); display: flex; flex-direction: column; gap: var(--space-4);">
            <h2 style="font-size: 1.25rem; font-weight: var(--font-weight-bold); color: var(--color-text-primary); margin: 0;">${title}</h2>
            <div style="display: flex; flex-direction: column; gap: var(--space-3);">
                ${listItems}
            </div>
        </div>
    `;
}

export function formatWeddingDateRange(startIso, endIso) {
    if (!startIso || !endIso) return "Dates TBD";
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