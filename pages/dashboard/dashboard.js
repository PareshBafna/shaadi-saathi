import { supabase } from '../../database/js/api.js';
import { openModal } from '../../global/js/modal.js';
import { getWebInvitePreviewUrl, getWebInvitePublicPreviewUrl } from '../../global/js/env-config.js';

const PUBLIC_INVITE_BASE_URL = "/#web-invites-public-preview";

export function renderDashboard() {
    if (typeof window.checkSessionOrShowAlert === 'function' && !window.checkSessionOrShowAlert()) {
        const wrapper = document.createElement('section');
        wrapper.className = "dashboard";
        wrapper.innerHTML = `
            <div class="dashboard-section">
                <div class="dashboard-loading-state">Please log in to view dashboard contents.</div>
            </div>
        `;
        return wrapper;
    }

    const curUser = window.currentUser || { role: 'guest' };
    const wrapper = document.createElement('section');
    wrapper.className = "dashboard";

    if (curUser.role !== 'creator') {
        return wrapper; 
    }

    wrapper.innerHTML = `
        <div class="dashboard-section">
            <div class="dashboard-loading-state">Loading dashboard...</div>
        </div>
    `;

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

        const { data: allSysUsers, error: sysUsersErr } = await supabase.from('users').select('id, name, phone');
        if (sysUsersErr) throw sysUsersErr;

        const { data: hostsData, error: hostsError } = await supabase.from('wedding_hosts').select('*');
        if (hostsError && hostsError.code !== '42P01') throw hostsError;
        
        const { data: webInvitesData, error: webInvitesErr } = await supabase.from('wedding_web_invite').select('wedding_id');
        if (webInvitesErr && webInvitesErr.code !== '42P01') throw webInvitesErr;

        const { data: variantsData } = await supabase.from('invite_variants').select('*');

        for (let wedding of weddings) {
            const rawHosts = hostsData ? hostsData.filter(h => h.wedding_id === wedding.id) : [];
            wedding.hosts = rawHosts.map(h => {
                const u = allSysUsers.find(u => u.id === h.user_id) || {};
                return { ...h, name: u.name, phone: u.phone };
            });

            wedding.has_web_invite = webInvitesData ? webInvitesData.some(w => w.wedding_id === wedding.id) : false;
            wedding.variants = variantsData ? variantsData.filter(v => v.wedding_id === wedding.id) : [];

            const { count: eventsCount } = await supabase.from('wedding_events').select('*', { count: 'exact', head: true }).eq('wedding_id', wedding.id);
            
            const isWebInviteOnly = wedding.invitation_type === 'web_invite_only';
            if (!isWebInviteOnly) {
                const { count: guestsCount } = await supabase.from('guests').select('*', { count: 'exact', head: true }).eq('wedding_id', wedding.id);
                wedding.guests_count = guestsCount || 0;
            } else {
                wedding.guests_count = 0;
            }

            wedding.events_count = eventsCount || 0;
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
        listsWrapper.className = "dashboard__lists-grid";

        listsWrapper.appendChild(buildWeddingListSection("In Progress", inProgressWeddings));
        listsWrapper.appendChild(buildWeddingListSection("Upcoming", upcomingWeddings));
        listsWrapper.appendChild(buildWeddingListSection("Archived", archivedWeddings));

        section.appendChild(listsWrapper);
        section.appendChild(buildRecentActivitySection());

        if (window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons();
        }

    } catch (error) {
        console.error('[DEBUG ERROR] Failed to load dashboard data:', error);
        section.innerHTML = `<div class="dashboard-section dashboard-section--error"><span class="dashboard-section__error-text">Failed to load data: ${error.message}</span></div>`;
    }
}

function buildStatsGrid(stats) {
    const grid = document.createElement("div");
    grid.className = "dashboard__stats";
    grid.innerHTML = stats.map(s => `
        <div class="dashboard-stat-card">
            <div class="dashboard-stat-card__content">
                <p class="dashboard-stat-card__subtitle">${s.label}</p>
                <p class="dashboard-stat-card__title">${s.value}</p>
            </div>
            <div class="dashboard-stat-card__icon-badge">
                <i data-lucide="${s.icon}"></i>
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
        <h2 class="dashboard-section__heading">Recent Activity</h2>
        <div class="dashboard-section__empty">
            No recent activity logs recorded.
        </div>
    `;
    return section;
}

function buildWeddingListSection(title, weddingsList) {
    const container = document.createElement("div");
    container.className = "dashboard-section";

    const heading = document.createElement("h2");
    heading.className = "dashboard-section__heading";
    heading.textContent = title;
    container.appendChild(heading);

    if (!weddingsList || weddingsList.length === 0) {
        const emptyDiv = document.createElement("div");
        emptyDiv.className = "dashboard-section__empty";
        emptyDiv.textContent = `No ${title.toLowerCase()} weddings found.`;
        container.appendChild(emptyDiv);
        return container;
    }

    const listContainer = document.createElement("div");
    listContainer.className = "dashboard-section__list";

    weddingsList.sort((a, b) => new Date(a.start_date) - new Date(b.start_date)).forEach(wedding => {        
        const displayNames = wedding.primary_side === 'groom' 
            ? `${wedding.groom_name} & ${wedding.bride_name}` 
            : `${wedding.bride_name} & ${wedding.groom_name}`;
        
        const isWebInviteOnly = wedding.invitation_type === 'web_invite_only';

        let hostsHTML = '';
        if (!isWebInviteOnly) {
            if (wedding.hosts && wedding.hosts.length > 0) {
                const sortedHosts = [...wedding.hosts].sort((a, b) => (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase()));
                const inlineHosts = sortedHosts.map(h => `${h.name} - ${h.phone}`).join(', ');
                
                hostsHTML = `
                <div class="dashboard-wedding-card__row">
                    <i data-lucide="phone"></i> <span>${inlineHosts}</span>
                </div>`;
            } else {
                hostsHTML = `
                <div class="dashboard-wedding-card__row dashboard-wedding-card__row--empty">
                    <i data-lucide="phone"></i> <span>No wedding hosts added</span>
                </div>`;
            }
        }

        let webInviteHTML = '';
        if (!isWebInviteOnly && wedding.has_web_invite) {
            const inviteUrl = getWebInvitePreviewUrl(wedding.id);
            webInviteHTML = `
            <div class="dashboard-wedding-card__invite-wrap">
                <a href="${inviteUrl}" target="_blank" class="dashboard-wedding-card__invite-btn" onclick="event.stopPropagation();">
                    <i data-lucide="external-link"></i> Wedding Invitation
                </a>
            </div>`;
        }

        const webInviteOnlyIcon = isWebInviteOnly ? `
            <button class="dashboard-wedding-card__icon-badge dashboard-wedding-card__web-badge" title="View Links" type="button">
                <i data-lucide="mail"></i>
            </button>
        ` : '';

        const cardEl = document.createElement("div");
        cardEl.className = "dashboard-wedding-card";
        cardEl.setAttribute('data-wedding-id', wedding.id);
        
        let cardHTML = `
            <div class="dashboard-wedding-card__header">
                <div class="dashboard-wedding-card__title-group">
                    <div class="dashboard-wedding-card__icon-badge">
                        <i data-lucide="heart"></i>
                    </div>
                    <div>
                        <h3 class="dashboard-wedding-card__names">${displayNames}</h3>
                        <p class="dashboard-wedding-card__dates"><i data-lucide="calendar"></i> ${formatWeddingDateRange(wedding.start_date, wedding.end_date)}</p>
                    </div>
                </div>
                ${webInviteOnlyIcon}
            </div>
            
            <div class="dashboard-wedding-card__details">
                ${wedding.family_name ? `<div class="dashboard-wedding-card__row"><i data-lucide="home"></i> <span>${wedding.family_name}</span></div>` : ''}
                ${wedding.family_details ? `<div class="dashboard-wedding-card__row"><i data-lucide="users"></i> <span>${wedding.family_details}</span></div>` : ''}
                ${hostsHTML}
                ${!isWebInviteOnly ? `<div class="dashboard-wedding-card__row"><i data-lucide="users"></i> <span>${wedding.guests_count || 0} Guests</span></div>` : ''}
                <div class="dashboard-wedding-card__row"><i data-lucide="calendar-days"></i> <span>${wedding.events_count || 0} Events</span></div>
                ${webInviteHTML}
            </div>
        `;

        cardEl.innerHTML = cardHTML;

        const webBadgeBtn = cardEl.querySelector('.dashboard-wedding-card__web-badge');
        if (webBadgeBtn) {
            webBadgeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                showWeddingVariantsModal(wedding.id, displayNames);
            });
        }

        cardEl.addEventListener('click', () => {
            const weddingId = cardEl.getAttribute('data-wedding-id');
            window.location.hash = `#wedding-details?id=${weddingId}`;
        });

        listContainer.appendChild(cardEl);
    });

    container.appendChild(listContainer);
    return container;
}

async function showWeddingVariantsModal(weddingId, weddingTitle) {
    const { data: variants } = await supabase
        .from('invite_variants')
        .select('*')
        .eq('wedding_id', weddingId)
        .order('created_at', { ascending: false });

    let rowsHTML = '';
    if (!variants || variants.length === 0) {
        rowsHTML = `<div style="color: var(--color-text-muted, #94a3b8); font-size: 0.875rem; text-align: center; padding: 18px 0;">No link variants created yet. Please create variants in the Web Invites tab.</div>`;
    } else {
        rowsHTML = variants.map(v => {
            const variantUrl = getWebInvitePublicPreviewUrl(v.id);
            const count = v.selected_event_ids?.length || 0;
            return `
                <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.04); border: 1px solid var(--color-border, rgba(255,255,255,0.1)); padding: 10px 14px; border-radius: 6px; margin-bottom: 8px;">
                    <div>
                        <div style="font-weight: 600; font-size: 0.9rem; color: var(--color-text-primary, #ffffff);">${v.variant_name}</div>
                        <div style="font-size: 0.75rem; color: var(--color-text-muted, #94a3b8);">${count} event(s) included</div>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <a href="${variantUrl}" target="_blank" style="display: inline-flex; align-items: center; justify-content: center; background: transparent; border: 1px solid var(--color-border, rgba(255,255,255,0.2)); color: var(--color-primary, #facc15); padding: 6px 10px; border-radius: 4px; text-decoration: none;" title="Open Link">
                            <i data-lucide="external-link" style="width: 14px; height: 14px;"></i>
                        </a>
                        <button class="dash-copy-variant-btn" data-url="${variantUrl}" style="background: transparent; border: 1px solid var(--color-border, rgba(255,255,255,0.2)); color: var(--color-primary, #facc15); padding: 6px 10px; border-radius: 4px; cursor: pointer;" title="Copy Link" type="button">
                            <i data-lucide="link" style="width: 14px; height: 14px;"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    const contentHTML = `
        <div style="display: flex; flex-direction: column; gap: 12px; font-family: inherit;">
            <div id="dashVariantsListContainer">
                ${rowsHTML}
            </div>
        </div>
    `;

    openModal({
        title: `Invite Links - ${weddingTitle}`,
        content: contentHTML,
        actions: [
            { label: "Cancel", variant: "ghost" }
        ]
    });

    setTimeout(() => {
        const allBtns = Array.from(document.querySelectorAll('button'));
        const cancelBtn = allBtns.find(b => b.textContent.trim() === 'Cancel');
        if (cancelBtn) {
            cancelBtn.classList.add('modal-btn-cancel');
        }

        if (window.lucide) window.lucide.createIcons();

        document.querySelectorAll('.dash-copy-variant-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const url = btn.getAttribute('data-url');
                navigator.clipboard.writeText(url);
                if (typeof window.showSweetAlert === 'function') {
                    window.showSweetAlert('success', 'Copied!', 'Variant link copied to clipboard.');
                }
            });
        });
    }, 50);
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