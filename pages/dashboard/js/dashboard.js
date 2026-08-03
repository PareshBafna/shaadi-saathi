import { supabase } from '../../../database/js/api.js';
import { openModal } from '../../../global/components/js/modal.js';
import { showAlert } from '../../../global/components/js/alerts.js';

// SIMULATED AUTH CONTEXT
const currentUser = {
    id: "creator_paresh",
    role: "creator" // 'creator', 'host', or 'guest'
};

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

export function openCreateWeddingModal() {
    const formHTML = `
        <form id="createWeddingForm" novalidate style="display:flex; flex-direction:column; gap:var(--space-3);">
            <div>
                <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:8px;">Primary Side</label>
                <div style="display: flex; gap: var(--space-4);">
                    <label style="display: flex; align-items: center; gap: 4px; color: var(--color-text-primary); font-size: var(--font-size-sm); cursor: pointer;">
                        <input type="radio" name="primarySide" value="bride" checked style="accent-color: var(--color-primary); cursor: pointer;"> Bride's Side
                    </label>
                    <label style="display: flex; align-items: center; gap: 4px; color: var(--color-text-primary); font-size: var(--font-size-sm); cursor: pointer;">
                        <input type="radio" name="primarySide" value="groom" style="accent-color: var(--color-primary); cursor: pointer;"> Groom's Side
                    </label>
                </div>
            </div>

            <div style="display: flex; gap: var(--space-3); flex-wrap: wrap;">
                <div style="flex: 1; min-width: 140px;">
                    <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:4px;">Bride's Name *</label>
                    <input type="text" id="brideName" required style="width:100%; background:var(--color-bg); border:1px solid var(--color-border); color:var(--color-text-primary); padding:var(--space-2); border-radius:var(--radius-sm); box-sizing:border-box; outline:none; transition: border-color 0.2s;">
                </div>
                <div style="flex: 1; min-width: 140px;">
                    <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:4px;">Groom's Name *</label>
                    <input type="text" id="groomName" required style="width:100%; background:var(--color-bg); border:1px solid var(--color-border); color:var(--color-text-primary); padding:var(--space-2); border-radius:var(--radius-sm); box-sizing:border-box; outline:none; transition: border-color 0.2s;">
                </div>
            </div>

            <div style="display: flex; gap: var(--space-3); flex-wrap: wrap;">
                <div style="flex: 1; min-width: 140px;">
                    <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:4px;">Start Date *</label>
                    <input type="date" id="startDate" onclick="try{this.showPicker()}catch(e){}" required style="width:100%; background:var(--color-bg); border:1px solid var(--color-border); color:var(--color-text-primary); padding:var(--space-2); border-radius:var(--radius-sm); box-sizing:border-box; cursor:pointer; outline:none; transition: border-color 0.2s;">
                </div>
                <div style="flex: 1; min-width: 140px;">
                    <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:4px;">End Date *</label>
                    <input type="date" id="endDate" onclick="try{this.showPicker()}catch(e){}" required style="width:100%; background:var(--color-bg); border:1px solid var(--color-border); color:var(--color-text-primary); padding:var(--space-2); border-radius:var(--radius-sm); box-sizing:border-box; cursor:pointer; outline:none; transition: border-color 0.2s;">
                </div>
            </div>

            <div>
                <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:4px;">Contact Details *</label>
                <input type="text" id="contactDetails" required placeholder="e.g., +91 98765 43210 (Rahul)" style="width:100%; background:var(--color-bg); border:1px solid var(--color-border); color:var(--color-text-primary); padding:var(--space-2); border-radius:var(--radius-sm); box-sizing:border-box; outline:none; transition: border-color 0.2s;">
            </div>

            <div>
                <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:4px;">Family Details *</label>
                <input type="text" id="familyDetails" required placeholder="e.g., The Bafna & Sharma Families" style="width:100%; background:var(--color-bg); border:1px solid var(--color-border); color:var(--color-text-primary); padding:var(--space-2); border-radius:var(--radius-sm); box-sizing:border-box; outline:none; transition: border-color 0.2s;">
            </div>
        </form>
    `;

    const modal = openModal({
        title: "Add New Wedding",
        content: formHTML,
        actions: [
            { label: "Cancel", variant: "ghost" },
            { 
                label: "Add", 
                variant: "primary", 
                closesModal: false,
                onClick: async () => {
                    const requiredFields = [
                        { id: 'brideName', name: "Bride's Name" },
                        { id: 'groomName', name: "Groom's Name" },
                        { id: 'startDate', name: "Start Date" },
                        { id: 'endDate', name: "End Date" },
                        { id: 'contactDetails', name: "Contact Details" },
                        { id: 'familyDetails', name: "Family Details" }
                    ];

                    let isValid = true;
                    let firstEmptyField = null;

                    requiredFields.forEach(field => {
                        const el = document.getElementById(field.id);
                        if (!el.value.trim()) {
                            el.style.borderColor = "red";
                            isValid = false;
                            if (!firstEmptyField) firstEmptyField = field.name;
                        } else {
                            el.style.borderColor = "green";
                        }
                    });

                    if (!isValid) {
                        showAlert({
                            icon: 'warning',
                            title: 'Missing Information',
                            text: `Please fill out all mandatory fields. Missing: ${firstEmptyField}`
                        });
                        return;
                    }

                    const primarySide = document.querySelector('input[name="primarySide"]:checked').value;
                    const brideName = document.getElementById('brideName').value.trim();
                    const groomName = document.getElementById('groomName').value.trim();
                    const startDate = document.getElementById('startDate').value;
                    const endDate = document.getElementById('endDate').value;
                    
                    if (new Date(endDate) < new Date(startDate)) {
                        showAlert({
                            icon: 'error',
                            title: 'Invalid Dates',
                            text: 'End date cannot be earlier than the start date.'
                        });
                        return;
                    }

                    const contactDetails = document.getElementById('contactDetails').value.trim() || null;
                    const familyDetails = document.getElementById('familyDetails').value.trim() || null;

                    try {
                        const { error } = await supabase.from('weddings').insert([{ 
                            primary_side: primarySide,
                            bride_name: brideName,
                            groom_name: groomName, 
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

                        showAlert({
                            icon: 'success',
                            title: 'Added!',
                            text: 'The wedding celebration has been successfully added.',
                            timer: 2000
                        });
                        
                    } catch (error) {
                        showAlert({
                            icon: 'error',
                            title: 'Database Error',
                            text: 'Failed to add wedding: ' + error.message
                        });
                    }
                }
            }
        ]
    });

    setTimeout(() => {
        const requiredIds = ['brideName', 'groomName', 'startDate', 'endDate', 'contactDetails', 'familyDetails'];
        requiredIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.style.borderColor = el.value.trim() === '' ? 'red' : 'green';
                el.addEventListener('input', () => {
                    el.style.borderColor = el.value.trim() === '' ? 'red' : 'green';
                });
            }
        });
    }, 50);
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

    weddingsList.sort((a, b) => new Date(a.start_date) - new Date(b.start_date)).forEach(wedding => {        
        const displayNames = wedding.primary_side === 'groom' 
            ? `${wedding.groom_name} & ${wedding.bride_name}` 
            : `${wedding.bride_name} & ${wedding.groom_name}`;
        
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
                    <h3 style="margin: 0; font-size: 0.9rem; font-weight: var(--font-weight-bold); color: var(--color-text-primary);">${displayNames}</h3>
                    <p style="margin: 4px 0 0 0; font-size: 0.75rem; color: var(--color-text-secondary);"><i data-lucide="calendar" style="width:12px; height:12px; vertical-align:middle; margin-right:4px;"></i> ${formatWeddingDateRange(wedding.start_date, wedding.end_date)}</p>
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