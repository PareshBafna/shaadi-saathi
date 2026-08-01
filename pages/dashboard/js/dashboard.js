import { supabase } from '../../../database/js/api.js';
import { openModal } from '../../../global/components/js/modal.js';

export function renderDashboard() {
    const wrapper = document.createElement('section');
    wrapper.className = "dashboard";
    wrapper.innerHTML = `<div class="dashboard-section__empty" style="text-align: center;">Loading dashboard...</div>`;

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

        const todayTime = startOfDay(new Date()).getTime();

        // NEW LOGIC: In Progress if today is between or equal to start/end dates
        const inProgressWeddings = weddings.filter(w => {
            const start = startOfDay(new Date(w.start_date)).getTime();
            const end = startOfDay(new Date(w.end_date)).getTime();
            return todayTime >= start && todayTime <= end;
        });
        
        // Upcoming if today is strictly before the start date
        const upcomingWeddings = weddings.filter(w => {
            const start = startOfDay(new Date(w.start_date)).getTime();
            return todayTime < start;
        });
        
        // Archived if today is strictly after the end date
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
        // Added margin-top to perfectly mirror the spacing below the card
        listsWrapper.style.cssText = "display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: var(--space-6); width: 100%; margin-top: var(--space-6); margin-bottom: var(--space-6);";

        // Removed the word "Celebrations"
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
    section.className = "dashboard-section";
    section.innerHTML = `
        <h2>Recent Activity</h2>
        <div class="dashboard-section__empty" style="text-align: center;">
            No recent activity logs recorded.
        </div>
    `;
    return section;
}

export function openCreateWeddingModal() {
    const formHTML = `
        <form id="createWeddingForm" style="display:flex; flex-direction:column; gap:var(--space-3);">
            <div>
                <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:4px;">Bride's Name</label>
                <input type="text" id="brideName" required style="width:100%; background:var(--color-bg); border:1px solid var(--color-border); color:var(--color-text-primary); padding:var(--space-2); border-radius:var(--radius-sm); box-sizing:border-box;">
            </div>
            <div>
                <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:4px;">Groom's Name</label>
                <input type="text" id="groomName" required style="width:100%; background:var(--color-bg); border:1px solid var(--color-border); color:var(--color-text-primary); padding:var(--space-2); border-radius:var(--radius-sm); box-sizing:border-box;">
            </div>
            <div style="display: flex; gap: var(--space-3);">
                <div style="flex: 1;">
                    <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:4px;">Start Date</label>
                    <input type="date" id="startDate" required style="width:100%; background:var(--color-bg); border:1px solid var(--color-border); color:var(--color-text-primary); padding:var(--space-2); border-radius:var(--radius-sm); box-sizing:border-box; cursor:pointer;">
                </div>
                <div style="flex: 1;">
                    <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:4px;">End Date</label>
                    <input type="date" id="endDate" required style="width:100%; background:var(--color-bg); border:1px solid var(--color-border); color:var(--color-text-primary); padding:var(--space-2); border-radius:var(--radius-sm); box-sizing:border-box; cursor:pointer;">
                </div>
            </div>
            <div>
                <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:4px;">Primary Contact Details</label>
                <input type="text" id="contactDetails" placeholder="e.g., +91 98765 43210 (Rahul)" style="width:100%; background:var(--color-bg); border:1px solid var(--color-border); color:var(--color-text-primary); padding:var(--space-2); border-radius:var(--radius-sm); box-sizing:border-box;">
            </div>
            <div>
                <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:4px;">Family Details</label>
                <input type="text" id="familyDetails" placeholder="e.g., The Bafna & Sharma Families" style="width:100%; background:var(--color-bg); border:1px solid var(--color-border); color:var(--color-text-primary); padding:var(--space-2); border-radius:var(--radius-sm); box-sizing:border-box;">
            </div>
        </form>
    `;

    const modal = openModal({
        title: "Create New Wedding",
        content: formHTML,
        actions: [
            { label: "Cancel", variant: "ghost" },
            { 
                label: "Create Wedding", 
                variant: "primary", 
                closesModal: false,
                onClick: async () => {
                    const form = document.getElementById('createWeddingForm');
                    if(!form.checkValidity()) { form.reportValidity(); return; }

                    const coupleNames = `${document.getElementById('brideName').value.trim()} & ${document.getElementById('groomName').value.trim()}`;
                    const startDate = document.getElementById('startDate').value;
                    const endDate = document.getElementById('endDate').value;
                    
                    if (new Date(endDate) < new Date(startDate)) {
                        alert("End date cannot be earlier than the start date.");
                        return;
                    }

                    const contactDetails = document.getElementById('contactDetails').value.trim() || null;
                    const familyDetails = document.getElementById('familyDetails').value.trim() || null;

                    try {
                        const { error } = await supabase.from('weddings').insert([{ 
                            couple_names: coupleNames, 
                            start_date: startDate,
                            end_date: endDate,
                            contact_details: contactDetails,
                            family_details: familyDetails
                        }]);
                        
                        if (error) throw error;
                        
                        modal.close();
                        window.dispatchEvent(new Event('weddingDataUpdated'));
                        
                        const wrapper = document.querySelector('.dashboard');
                        if(wrapper) loadGlobalDashboardData(wrapper);
                        
                    } catch (error) {
                        alert('Failed to create wedding: ' + error.message);
                    }
                }
            }
        ]
    });
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
        emptyDiv.textContent = `No ${title.toLowerCase()} found.`;
        container.appendChild(emptyDiv);
        return container;
    }

    const listContainer = document.createElement("div");
    listContainer.style.cssText = "display: flex; flex-direction: column; gap: var(--space-3);";

    // Sort chronologically before rendering
    weddingsList.sort((a, b) => new Date(a.wedding_date) - new Date(b.wedding_date)).forEach(wedding => {
        const cardEl = document.createElement("div");
        cardEl.className = "stat-card";
        cardEl.setAttribute('data-wedding-id', wedding.id);
        
        cardEl.style.cssText = "cursor: pointer; padding: 1rem 1.25rem; display: flex; align-items: center; justify-content: space-between;";
        
        cardEl.innerHTML = `
            <div style="display: flex; align-items: center; gap: 1rem;">
                <div style="background: var(--color-border); color: var(--color-primary); width: 32px; height: 32px; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <i data-lucide="heart" style="width: 16px; height: 16px;"></i>
                </div>
                <div>
                    <h3 style="margin: 0; font-size: 0.9rem; font-weight: var(--font-weight-bold); color: var(--color-text-primary);">${wedding.couple_names}</h3>
                    <p style="margin: 2px 0 0 0; font-size: 0.75rem; color: var(--color-text-secondary);">${formatWeddingDate(wedding.wedding_date)}</p>
                </div>
            </div>
            <div style="color: var(--color-primary); font-size: var(--font-size-sm); font-weight: var(--font-weight-medium); padding-left: var(--space-4);">
                Manage →
            </div>
        `;

        cardEl.addEventListener('click', () => {
            const weddingId = cardEl.getAttribute('data-wedding-id');
            window.location.hash = `#wedding?id=${weddingId}`;
        });

        listContainer.appendChild(cardEl);
    });

    container.appendChild(listContainer);
    return container;
}