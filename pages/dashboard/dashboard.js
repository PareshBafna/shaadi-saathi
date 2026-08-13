import { supabase } from '../../database/js/api.js';
import { showAlert } from '../../global/js/alerts.js';

// ==========================================
// MAIN RENDER FUNCTION
// ==========================================
export function renderDashboard() {
    const curUser = window.currentUser || { role: 'guest' };
    const wrapper = document.createElement('section');
    wrapper.className = "dashboard";
    wrapper.style.cssText = "width: 100%; box-sizing: border-box;";

    if (curUser.role !== 'creator') {
        return wrapper; 
    }

    wrapper.innerHTML = `<div class="dashboard-section__empty" style="text-align: center; padding: var(--space-8); color: var(--color-text-secondary);">Loading dashboard...</div>`;

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

        // Fetch Users alongside Hosts
        const { data: allSysUsers, error: sysUsersErr } = await supabase.from('users').select('id, name, phone');
        if (sysUsersErr) throw sysUsersErr;

        const { data: hostsData, error: hostsError } = await supabase.from('wedding_hosts').select('*');
        if (hostsError && hostsError.code !== '42P01') throw hostsError;
        
        // Fetch Web Invites to check existence
        const { data: webInvitesData, error: webInvitesErr } = await supabase.from('wedding_web_invite').select('wedding_id');
        if (webInvitesErr && webInvitesErr.code !== '42P01') throw webInvitesErr;

        for (let wedding of weddings) {
            // Attach hosts AND map their names from allSysUsers
            const rawHosts = hostsData ? hostsData.filter(h => h.wedding_id === wedding.id) : [];
            wedding.hosts = rawHosts.map(h => {
                const u = allSysUsers.find(u => u.id === h.user_id) || {};
                return { ...h, name: u.name, phone: u.phone };
            });

            // Check if Web Invite exists for this wedding
            wedding.has_web_invite = webInvitesData ? webInvitesData.some(w => w.wedding_id === wedding.id) : false;

            const { count: eventsCount } = await supabase.from('events').select('*', { count: 'exact', head: true }).eq('wedding_id', wedding.id);
            const { count: guestsCount } = await supabase.from('guests').select('*', { count: 'exact', head: true }).eq('wedding_id', wedding.id);

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
        const archivedSection = buildWeddingListSection("Archived", archivedWeddings);
        
        inProgressSection.style.marginBottom = "0";
        upcomingSection.style.marginBottom = "0";
        archivedSection.style.marginBottom = "0";

        listsWrapper.appendChild(inProgressSection);
        listsWrapper.appendChild(upcomingSection);
        listsWrapper.appendChild(archivedSection);

        section.appendChild(listsWrapper);
        section.appendChild(buildRecentActivitySection());

        if (window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons();
        }

    } catch (error) {
        console.error('[DEBUG ERROR] Failed to load dashboard data:', error);
        section.innerHTML = `<div class="dashboard-section" style="border-color: var(--color-danger); padding: var(--space-5);"><span style="color: var(--color-danger);">Failed to load data: ${error.message}</span></div>`;
    }
}

function buildStatsGrid(stats) {
    const grid = document.createElement("div");
    grid.className = "dashboard__stats";
    grid.style.cssText = `
        display: grid; 
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); 
        gap: var(--space-6); 
        margin-bottom: var(--space-8);
        width: 100%;
    `;
    grid.innerHTML = stats.map(s => `
        <div class="stat-card" style="background: var(--color-white); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-5); display: flex; align-items: center; justify-content: space-between;">
            <div class="dashboard__stat-card">
                <p class="card__subtitle" style="color: var(--color-text-secondary); font-size: var(--font-size-sm); margin: 0; font-weight: var(--font-weight-medium);">${s.label}</p>
                <p class="card__title" style="color: var(--color-text-primary); font-size: var(--font-size-2xl); font-weight: var(--font-weight-bold); margin: 4px 0 0 0;">${s.value}</p>
            </div>
            <div style="background: var(--color-border); color: var(--color-primary); width: 40px; height: 40px; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                <i data-lucide="${s.icon}" style="width: 20px; height: 20px;"></i>
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
    section.style.cssText = "background: var(--color-white); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-5);";
    section.innerHTML = `
        <h2 style="font-size: 1.25rem; font-weight: var(--font-weight-bold); color: var(--color-text-primary); margin: 0 0 var(--space-4) 0;">Recent Activity</h2>
        <div class="dashboard-section__empty" style="text-align: center; padding: var(--space-6); color: var(--color-text-muted); border: 1px dashed var(--color-border); border-radius: var(--radius-sm);">
            No recent activity logs recorded.
        </div>
    `;
    return section;
}

function buildWeddingListSection(title, weddingsList) {
    const container = document.createElement("div");
    container.className = "dashboard-section";
    container.style.cssText = "width: 100%; background: var(--color-white); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-5); display: flex; flex-direction: column; gap: var(--space-4);"; 

    const heading = document.createElement("h2");
    heading.textContent = title;
    heading.style.cssText = "font-size: 1.25rem; font-weight: var(--font-weight-bold); color: var(--color-text-primary); margin: 0;";
    container.appendChild(heading);

    if (!weddingsList || weddingsList.length === 0) {
        const emptyDiv = document.createElement("div");
        emptyDiv.className = "dashboard-section__empty";
        emptyDiv.style.cssText = "text-align: center; padding: var(--space-6); color: var(--color-text-muted); border: 1px dashed var(--color-border); border-radius: var(--radius-sm);";
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
        
        let hostsHTML = '';
        if (wedding.hosts && wedding.hosts.length > 0) {
            const sortedHosts = [...wedding.hosts].sort((a, b) => (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase()));
            const inlineHosts = sortedHosts.map(h => `${h.name} - ${h.phone}`).join(', ');
            
            hostsHTML = `
            <div style="display:flex; align-items:center; gap:6px; font-size:var(--font-size-xs); color:var(--color-text-secondary); margin-bottom: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                <i data-lucide="phone" style="width:14px; height:14px; flex-shrink: 0;"></i> <span>${inlineHosts}</span>
            </div>`;
        } else {
            hostsHTML = `
            <div style="display:flex; align-items:center; gap:6px; font-size:var(--font-size-xs); color:var(--color-text-secondary); margin-bottom: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                <i data-lucide="phone" style="width:14px; height:14px; flex-shrink: 0;"></i> <span style="font-style: italic;">No wedding hosts added</span>
            </div>`;
        }

        let webInviteHTML = '';
        if (wedding.has_web_invite) {
            // FIX: Using window.location.origin instead of hardcoded domain
            const inviteUrl = `${window.location.origin}/invite.html?id=${wedding.id}`;
            webInviteHTML = `
            <div style="margin-top: 12px; display: flex; justify-content: center;">
                <a href="${inviteUrl}" target="_blank" onclick="event.stopPropagation();" style="background: var(--color-primary); color: var(--color-text-on-accent); padding: 8px 16px; border-radius: var(--radius-sm); text-decoration: none; font-size: var(--font-size-sm); font-weight: var(--font-weight-medium); display: inline-flex; align-items: center; gap: 6px; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">
                    <i data-lucide="external-link" style="width: 14px; height: 14px;"></i> Wedding Invitation
                </a>
            </div>`;
        }

        const cardEl = document.createElement("div");
        cardEl.className = "stat-card";
        cardEl.setAttribute('data-wedding-id', wedding.id);
        
        cardEl.style.cssText = "cursor: pointer; padding: 1rem 1.25rem; display: flex; flex-direction: column; gap: 8px; position: relative; border: 1px solid var(--color-border); border-radius: var(--radius-md); transition: transform 0.1s ease; background: var(--color-bg);";
        cardEl.onmouseover = () => cardEl.style.transform = 'translateY(-2px)';
        cardEl.onmouseout = () => cardEl.style.transform = 'translateY(0)';
        
        let cardHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <div style="background: var(--color-border); color: var(--color-primary); width: 32px; height: 32px; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                        <i data-lucide="heart" style="width: 16px; height: 16px;"></i>
                    </div>
                    <div>
                        <h3 style="margin: 0; font-size: 0.95rem; font-weight: var(--font-weight-bold); color: var(--color-text-primary);">${displayNames}</h3>
                        <p style="margin: 4px 0 0 0; font-size: 0.8rem; color: var(--color-text-secondary);"><i data-lucide="calendar" style="width:12px; height:12px; vertical-align:middle; margin-right:4px;"></i> ${formatWeddingDateRange(wedding.start_date, wedding.end_date)}</p>
                    </div>
                </div>
            </div>
            
            <div style="border-top: 1px solid var(--color-border); margin-top: 4px; padding-top: 8px;">
                ${wedding.family_name ? `<div style="display:flex; align-items:center; gap:6px; font-size:var(--font-size-xs); color:var(--color-text-secondary); margin-bottom: 6px;"><i data-lucide="home" style="width:14px; height:14px;"></i> ${wedding.family_name}</div>` : ''}

                ${wedding.family_details ? `<div style="display:flex; align-items:center; gap:6px; font-size:var(--font-size-xs); color:var(--color-text-secondary); margin-bottom: 6px;"><i data-lucide="users" style="width:14px; height:14px;"></i> ${wedding.family_details}</div>` : ''}
                
                ${hostsHTML}

                <div style="display:flex; align-items:center; gap:6px; font-size:var(--font-size-xs); color:var(--color-text-secondary); margin-bottom: 6px;"><i data-lucide="users" style="width:14px; height:14px;"></i> ${wedding.guests_count || 0} Guests</div>

                <div style="display:flex; align-items:center; gap:6px; font-size:var(--font-size-xs); color:var(--color-text-secondary);"><i data-lucide="calendar-days" style="width:14px; height:14px;"></i> ${wedding.events_count || 0} Events</div>
                
                ${webInviteHTML}
            </div>
        `;

        cardEl.innerHTML = cardHTML;

        cardEl.addEventListener('click', (e) => {
            const weddingId = cardEl.getAttribute('data-wedding-id');
            window.location.hash = `#wedding-details?id=${weddingId}`;
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