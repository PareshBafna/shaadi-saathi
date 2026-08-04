import { supabase } from '../../../database/js/api.js';
import { openCreateWeddingModal } from '../../weddings/js/weddings.js';
import { showAlert } from '../../../global/components/js/alerts.js';

// SIMULATED AUTH CONTEXT
const currentUser = {
    id: "creator_paresh",
    role: "creator" // 'creator', 'host', or 'guest'
};

// ==========================================
// MAIN RENDER FUNCTION
// ==========================================
export function renderDashboard() {
    const wrapper = document.createElement('section');
    wrapper.className = "dashboard";

    if (currentUser.role !== 'creator') {
        return wrapper; 
    }

    wrapper.innerHTML = `<div class="dashboard-section__empty" style="text-align: center;">Loading dashboard...</div>`;

    loadGlobalDashboardData(wrapper);
    return wrapper;
}

// ==========================================
// ASYNC DATA FETCHER
// ==========================================
async function loadGlobalDashboardData(section) {
    try {
        let weddings = [];
        const { data, error } = await supabase.from('weddings').select('*');
        if (!error && data) {
            weddings = data;
        } else if (error) {
            throw error;
        }
        
        for (let wedding of weddings) {
            const { count: eventsCount } = await supabase
                .from('events')
                .select('*', { count: 'exact', head: true })
                .eq('wedding_id', wedding.id);

            const { count: guestsCount } = await supabase
                .from('guests')
                .select('*', { count: 'exact', head: true })
                .eq('wedding_id', wedding.id);

            wedding.events_count = eventsCount || 0;
            wedding.guests_count = guestsCount || 0;
        }
        
        section.innerHTML = "";

        const todayTime = startOfDay(new Date()).getTime();

        const inProgressWeddings = weddings.filter(w => {
            const start = startOfDay(new Date(w.start_date)).getTime();
            const end = startOfDay(new Date(w.end_date)).getTime();
            return todayTime >= start && todayTime <= end;
        });
        
        const upcomingWeddings = weddings.filter(w => {
            const start = startOfDay(new Date(w.start_date)).getTime();
            return todayTime < start;
        });
        
        const archivedWeddings = weddings.filter(w => {
            const end = startOfDay(new Date(w.end_date)).getTime();
            return todayTime > end;
        });

        const globalStats = [
            { label: "Total Weddings", value: weddings.length, icon: "heart" },
            { label: "In Progress", value: inProgressWeddings.length, icon: "loader" },
            { label: "Upcoming", value: upcomingWeddings.length, icon: "calendar" },
            { label: "Archived", value: archivedWeddings.length, icon: "archive" },
        ];

        section.appendChild(buildStatsGrid(globalStats));
        
        const listsWrapper = document.createElement("div");
        listsWrapper.style.cssText = "display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: var(--space-6); width: 100%; margin-top: var(--space-6); margin-bottom: var(--space-6);";

        const inProgressSection = buildWeddingListSection("In Progress", inProgressWeddings);
        const upcomingSection = buildWeddingListSection("Upcoming", upcomingWeddings);
        
        inProgressSection.style.marginBottom = "0";
        upcomingSection.style.marginBottom = "0";

        listsWrapper.appendChild(inProgressSection);
        listsWrapper.appendChild(upcomingSection);

        section.appendChild(listsWrapper);
        section.appendChild(buildRecentActivitySection());

        if (window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons();
        }

    } catch (error) {
        console.error('[DEBUG ERROR] Failed to load dashboard data:', error);
        section.innerHTML = `<div class="dashboard-section" style="border-color: var(--color-danger);"><span style="color: var(--color-danger);">Failed to load data: ${error.message}</span></div>`;
    }
}

function buildStatsGrid(stats) {
    const grid = document.createElement("div");
    grid.className = "dashboard__stats";
    grid.innerHTML = stats.map(s => `
        <div class="stat-card" style="padding: var(--space-4); display: flex; align-items: center; justify-content: space-between;">
            <div class="dashboard__stat-card">
                <p class="card__subtitle">${s.label}</p>
                <p class="card__title" style="margin: 0; color: var(--color-text-primary);">${s.value}</p>
            </div>
            <div style="background: var(--color-border); color: var(--color-primary); width: 36px; height: 36px; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
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

function buildRecentActivitySection() {
    const section = document.createElement("div");
    section.className = "dashboard-section";
    section.innerHTML = `
        <h2>Recent Activity</h2>
        <div class="dashboard-section__empty" style="text-align: center;">
            No recent activity logs recorded.
        </div>
    `;
    return section;
}

function buildWeddingListSection(title, weddingsList) {
    const container = document.createElement("div");
    container.className = "dashboard-section";
    container.style.cssText = "width: 100%; margin-bottom: var(--space-6);"; 

    const heading = document.createElement("h2");
    heading.textContent = title;
    heading.style.marginBottom = "var(--space-4)";
    container.appendChild(heading);

    if (!weddingsList || weddingsList.length === 0) {
        const emptyDiv = document.createElement("div");
        emptyDiv.className = "dashboard-section__empty";
        emptyDiv.style.textAlign = "center";
        emptyDiv.textContent = `No ${title.toLowerCase()} weddings found.`;
        container.appendChild(emptyDiv);
        return container;
    }

    const listContainer = document.createElement("div");
    listContainer.style.cssText = "display: flex; flex-direction: column; gap: var(--space-3);";

    weddingsList.sort((a, b) => new Date(a.start_date) - new Date(b.start_date)).forEach(wedding => {        
        const displayNames = wedding.primary_side === 'groom' 
            ? `${wedding.groom_name} & ${wedding.bride_name}` 
            : `${wedding.bride_name} & ${wedding.groom_name}`;
        
        let contactsHTML = '';
        if (wedding.contact_details) {
            const parts = wedding.contact_details.split(/,\s*/);
            contactsHTML = parts.map(part => {
                let name = part, num = '';
                if (part.includes(' - ')) {
                    [name, num] = part.split(' - ');
                }
                const displayString = num ? `${name} - ${num}` : name;
                return `
                <div style="display:flex; align-items:center; gap:6px; font-size:var(--font-size-xs); color:var(--color-text-secondary); margin-bottom: 6px;">
                    <i data-lucide="phone" style="width:14px; height:14px;"></i> ${displayString}
                </div>`;
            }).join('');
        }

        const cardEl = document.createElement("div");
        cardEl.className = "stat-card";
        cardEl.setAttribute('data-wedding-id', wedding.id);
        
        cardEl.style.cssText = "cursor: pointer; padding: 1rem 1.25rem; display: flex; flex-direction: column; gap: 8px; position: relative;";
        
        let cardHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <div style="background: var(--color-border); color: var(--color-primary); width: 32px; height: 32px; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                        <i data-lucide="heart" style="width: 16px; height: 16px;"></i>
                    </div>
                    <div>
                        <h3 style="margin: 0; font-size: 0.9rem; font-weight: var(--font-weight-bold); color: var(--color-text-primary);">${displayNames}</h3>
                        <p style="margin: 4px 0 0 0; font-size: 0.75rem; color: var(--color-text-secondary);"><i data-lucide="calendar" style="width:12px; height:12px; vertical-align:middle; margin-right:4px;"></i> ${formatWeddingDateRange(wedding.start_date, wedding.end_date)}</p>
                    </div>
                </div>
            </div>
            
            <div style="border-top: 1px solid var(--color-border); margin-top: 4px; padding-top: 8px;">
                ${wedding.family_name ? `<div style="display:flex; align-items:center; gap:6px; font-size:var(--font-size-xs); color:var(--color-text-secondary); margin-bottom: 6px;"><i data-lucide="home" style="width:14px; height:14px;"></i> ${wedding.family_name}</div>` : ''}

                ${wedding.family_details ? `<div style="display:flex; align-items:center; gap:6px; font-size:var(--font-size-xs); color:var(--color-text-secondary); margin-bottom: 6px;"><i data-lucide="users" style="width:14px; height:14px;"></i> ${wedding.family_details}</div>` : ''}
                
                ${contactsHTML}

                <div style="display:flex; align-items:center; gap:6px; font-size:var(--font-size-xs); color:var(--color-text-secondary); margin-bottom: 6px;"><i data-lucide="users" style="width:14px; height:14px;"></i> ${wedding.guests_count || 0} Guests</div>

                <div style="display:flex; align-items:center; gap:6px; font-size:var(--font-size-xs); color:var(--color-text-secondary);"><i data-lucide="calendar-days" style="width:14px; height:14px;"></i> ${wedding.events_count || 0} Events</div>
            </div>
        `;

        cardEl.innerHTML = cardHTML;

        cardEl.addEventListener('click', (e) => {
            const weddingId = cardEl.getAttribute('data-wedding-id');
            window.location.hash = `#wedding?id=${weddingId}`;
        });

        listContainer.appendChild(cardEl);
    });

    container.appendChild(listContainer);
    return container;
}

function formatWeddingDateRange(startIso, endIso) {
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

    if (startIso === endIso) {
        return `${sDay}${getSuffix(sDay)} ${start.toLocaleString("en-IN", { month: "long" })}, ${year}`;
    }
    
    if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
        return `${sDay}${getSuffix(sDay)} - ${eDay}${getSuffix(eDay)} ${start.toLocaleString("en-IN", { month: "long" })}, ${year}`;
    }
    
    return `${sDay}${getSuffix(sDay)} ${sMonth} - ${eDay}${getSuffix(eDay)} ${eMonth}, ${year}`;
}