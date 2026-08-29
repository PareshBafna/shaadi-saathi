import { supabase } from '../../database/js/api.js';
import { openModal } from '../../global/js/modal.js';
import { showSweetAlert } from '../../global/js/sweet-alert-message.js';
import { getWebInvitePreviewUrl, getSampleWebInvitePreviewUrl, getWebInvitePublicPreviewUrl } from '../../global/js/env-config.js';

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

    const wrapper = document.createElement('section');
    wrapper.className = "dashboard";

    wrapper.innerHTML = `
        <div class="dashboard-section">
            <div class="dashboard-loading-state">Loading dashboard...</div>
        </div>
    `;

    loadGlobalDashboardData(wrapper);
    return wrapper;
}    

async function loadGlobalDashboardData(section) {
    const user = window.currentUser || { role: 'guest' };
    const isCreator = user.role === 'creator';
    const userPhone = user.phone || '';
    const userId = user.id || '';

    const cleanedUserPhone = userPhone ? userPhone.replace(/[^0-9]/g, '') : null;
    const baseUserPhone = cleanedUserPhone ? cleanedUserPhone.slice(-10) : null;

    try {
        let accessibleWeddingIds = [];

        if (!isCreator) {
            const [hostRes, wUserRes, allGuestsRes] = await Promise.all([
                supabase.from('wedding_hosts').select('wedding_id').eq('user_id', userId),
                supabase.from('wedding_users').select('wedding_id').eq('user_id', userId),
                supabase.from('guests').select('id, wedding_id, phone')
            ]);

            const hostIds = (hostRes.data || []).map(h => h.wedding_id);
            const wUserIds = (wUserRes.data || []).map(u => u.wedding_id);

            const matchedGuests = (allGuestsRes.data || []).filter(g => {
                const cleanedGuestPhone = g.phone ? g.phone.replace(/[^0-9]/g, '') : null;
                return baseUserPhone && cleanedGuestPhone && cleanedGuestPhone.endsWith(baseUserPhone);
            });
            const guestIds = matchedGuests.map(g => g.wedding_id);

            accessibleWeddingIds = [...new Set([...hostIds, ...wUserIds, ...guestIds])];

            if (accessibleWeddingIds.length === 0) {
                renderEmptyDashboard(section);
                return;
            }
        }

        let weddingsQuery = supabase.from('weddings').select('*');
        if (!isCreator) {
            weddingsQuery = weddingsQuery.in('id', accessibleWeddingIds);
        }

        const { data: rawWeddings, error } = await weddingsQuery;
        if (error) throw error;

        const { data: allSysUsers, error: sysUsersErr } = await supabase.from('users').select('id, name, phone');
        if (sysUsersErr) throw sysUsersErr;

        let hostsQuery = supabase.from('wedding_hosts').select('*');
        let wUsersQuery = supabase.from('wedding_users').select('*');
        let webInvitesQuery = supabase.from('wedding_web_invite').select('wedding_id');
        let variantsQuery = supabase.from('invite_variants').select('*');

        if (!isCreator) {
            hostsQuery = hostsQuery.in('wedding_id', accessibleWeddingIds);
            wUsersQuery = wUsersQuery.in('wedding_id', accessibleWeddingIds);
            webInvitesQuery = webInvitesQuery.in('wedding_id', accessibleWeddingIds);
            variantsQuery = variantsQuery.in('wedding_id', accessibleWeddingIds);
        }

        const [hostsRes, wUsersRes, webInvitesRes, variantsRes] = await Promise.all([
            hostsQuery,
            wUsersQuery,
            webInvitesQuery,
            variantsQuery
        ]);

        const hostsData = hostsRes.data || [];
        const wUsersData = wUsersRes.data || [];
        const webInvitesData = webInvitesRes.data || [];
        const variantsData = variantsRes.data || [];

        let processedWeddings = [];

        for (let wedding of (rawWeddings || [])) {
            const rawHosts = hostsData.filter(h => h.wedding_id === wedding.id);
            wedding.hosts = rawHosts.map(h => {
                const u = (allSysUsers || []).find(u => u.id === h.user_id) || {};
                return { ...h, name: u.name, phone: u.phone };
            });

            wedding.wedding_users = wUsersData.filter(u => u.wedding_id === wedding.id);
            wedding.has_web_invite = (wedding.id === '00000000-0000-0000-0000-000000000000') || webInvitesData.some(w => w.wedding_id === wedding.id);
            wedding.variants = variantsData.filter(v => v.wedding_id === wedding.id);

            const isHost = wedding.hosts.some(h => h.user_id === userId);
            const isWUser = wedding.wedding_users.some(u => u.user_id === userId);
            const canViewAll = isCreator || isHost || isWUser;

            let eventsQuery = supabase.from('wedding_events').select('*', { count: 'exact', head: true }).eq('wedding_id', wedding.id);

            if (!canViewAll) {
                const { data: weddingGuests } = await supabase.from('guests').select('id, phone, variant_id').eq('wedding_id', wedding.id);
                const currentGuest = (weddingGuests || []).find(g => {
                    const cleanedGuestPhone = g.phone ? g.phone.replace(/[^0-9]/g, '') : null;
                    return baseUserPhone && cleanedGuestPhone && cleanedGuestPhone.endsWith(baseUserPhone);
                });

                if (currentGuest) {
                    if (currentGuest.variant_id) {
                        const matchedVar = wedding.variants.find(v => v.id === currentGuest.variant_id);
                        if (matchedVar && matchedVar.selected_event_ids?.length > 0) {
                            eventsQuery = eventsQuery.in('id', matchedVar.selected_event_ids);
                        }
                    }
                } else {
                    eventsQuery = eventsQuery.eq('id', '00000000-0000-0000-0000-000000000000');
                }
            }

            const { count: eventsCount } = await eventsQuery;
            wedding.events_count = eventsCount || 0;

            const isWebInviteOnly = wedding.invitation_type === 'web_invite_only';
            if (!isWebInviteOnly && canViewAll) {
                const { count: guestsCount } = await supabase.from('guests').select('*', { count: 'exact', head: true }).eq('wedding_id', wedding.id);
                wedding.guests_count = guestsCount || 0;
            } else {
                wedding.guests_count = 0;
            }

            processedWeddings.push(wedding);
        }

        section.innerHTML = "";

        const todayTime = startOfDay(new Date()).getTime();

        const inProgressWeddings = processedWeddings.filter(w => {
            const start = startOfDay(new Date(w.start_date)).getTime();
            const end = startOfDay(new Date(w.end_date)).getTime();
            return todayTime >= start && todayTime <= end;
        });
        
        const upcomingWeddings = processedWeddings.filter(w => {
            const start = startOfDay(new Date(w.start_date)).getTime();
            return todayTime < start;
        });
        
        const archivedWeddings = processedWeddings.filter(w => {
            const end = startOfDay(new Date(w.end_date)).getTime();
            return todayTime > end;
        });

        const globalStats = [
            { label: "Total Weddings", value: processedWeddings.length, icon: "heart" },
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

function renderEmptyDashboard(section) {
    section.innerHTML = `
        <div class="dashboard-section">
            <div class="dashboard-section__empty">No accessible weddings found for your account.</div>
        </div>
    `;
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

    const count = (weddingsList || []).length;
    const heading = document.createElement("h2");
    heading.className = "dashboard-section__heading";
    heading.textContent = `${title} (${count})`;
    container.appendChild(heading);

    if (!weddingsList || weddingsList.length === 0) {
        const emptyDiv = document.createElement("div");
        emptyDiv.className = "dashboard-section__empty";
        emptyDiv.textContent = `No ${title.toLowerCase()} weddings found.`;
        container.appendChild(emptyDiv);
        return container;
    }

    const invitationTypeCategories = [
        { type: 'full', label: 'Full Wedding' },
        { type: 'full_self', label: 'Full Wedding (Self)' },
        { type: 'web_invite_only', label: 'Web Invite Only' }
    ];

    const sortedWeddings = [...weddingsList].sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

    invitationTypeCategories.forEach(category => {
        const categoryWeddings = sortedWeddings.filter(w => {
            if (category.type === 'full') return !w.invitation_type || w.invitation_type === 'full';
            return w.invitation_type === category.type;
        });

        if (categoryWeddings.length === 0) return;

        const groupWrapper = document.createElement("div");
        groupWrapper.className = "dashboard-invitation-type-group";
        groupWrapper.style.marginBottom = "1.25rem";

        const subHeading = document.createElement("h3");
        subHeading.className = "dashboard-invitation-type-heading";
        subHeading.style.cssText = "font-size: 0.9rem; font-weight: 600; color: var(--color-primary, #facc15); margin-bottom: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em;";
        subHeading.textContent = `${category.label} (${categoryWeddings.length})`;
        groupWrapper.appendChild(subHeading);

        const listContainer = document.createElement("div");
        listContainer.className = "dashboard-section__list";

        categoryWeddings.forEach(wedding => {
            const isGroom = (wedding.primary_side || '').toString().toLowerCase().includes('groom');
            const displayNames = isGroom 
                ? `${wedding.groom_name} & ${wedding.bride_name}` 
                : `${wedding.bride_name} & ${wedding.groom_name}`;
            
            const isWebInviteOnly = wedding.invitation_type === 'web_invite_only';
            const allowsVariants = wedding.allow_variants !== false;
            const hasWebInvite = wedding.has_web_invite || wedding.id === '00000000-0000-0000-0000-000000000000';

            let inviteTypeLabel = category.label;
            const sideLabel = isGroom ? "Groom's Side" : "Bride's Side";

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
            if (hasWebInvite) {
                webInviteHTML = `
                <div class="dashboard-wedding-card__invite-wrap">
                    <button type="button" class="dashboard-wedding-card__invite-btn dashboard-open-invite-links-btn" data-wedding-id="${wedding.id}" data-wedding-title="${displayNames.replace(/"/g, '&quot;')}" style="border: none; outline: none; box-shadow: none; cursor: pointer;">
                        <i data-lucide="external-link"></i> Wedding Invitation
                    </button>
                </div>`;
            }

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
                </div>
                
                <div class="dashboard-wedding-card__details">
                    <div class="dashboard-wedding-card__row">
                        <i data-lucide="user-check"></i> <span><strong>Side:</strong> ${sideLabel}</span>
                    </div>
                    <div class="dashboard-wedding-card__row">
                        <i data-lucide="file-text"></i> <span><strong>Type:</strong> ${inviteTypeLabel}</span>
                    </div>
                    <div class="dashboard-wedding-card__row">
                        <i data-lucide="layers"></i> <span><strong>Allow Variants:</strong> ${allowsVariants ? 'Yes' : 'No'}</span>
                    </div>

                    ${wedding.family_name ? `<div class="dashboard-wedding-card__row"><i data-lucide="home"></i> <span>${wedding.family_name}</span></div>` : ''}
                    ${wedding.family_details ? `<div class="dashboard-wedding-card__row"><i data-lucide="users"></i> <span>${wedding.family_details}</span></div>` : ''}
                    
                    ${hostsHTML}
                    ${!isWebInviteOnly ? `<div class="dashboard-wedding-card__row"><i data-lucide="user"></i> <span>${wedding.guests_count || 0} Guests</span></div>` : ''}
                    <div class="dashboard-wedding-card__row"><i data-lucide="calendar-days"></i> <span>${wedding.events_count || 0} Events</span></div>
                    
                    ${webInviteHTML}
                </div>
            `;

            cardEl.innerHTML = cardHTML;

            const inviteBtn = cardEl.querySelector('.dashboard-open-invite-links-btn');
            if (inviteBtn) {
                inviteBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const wId = inviteBtn.getAttribute('data-wedding-id');
                    const wTitle = inviteBtn.getAttribute('data-wedding-title');
                    
                    const curUser = window.currentUser || { role: 'guest' };

                    if (curUser.role === 'guest') {
                        const { data: wData } = await supabase.from('weddings').select('invitation_type, allow_variants').eq('id', wId).single();
                        const isWebInviteOnly = wData?.invitation_type === 'web_invite_only';
                        const allowsVariants = isWebInviteOnly ? (wData?.allow_variants !== false) : true;

                        let targetUrl = '';
                        if (isWebInviteOnly) {
                            if (allowsVariants) {
                                const { data: vList } = await supabase.from('invite_variants').select('id').eq('wedding_id', wId).order('created_at', { ascending: true }).limit(1);
                                targetUrl = getWebInvitePublicPreviewUrl(wId, vList?.[0]?.id);
                            } else {
                                targetUrl = getWebInvitePublicPreviewUrl(wId);
                            }
                        } else {
                            const { data: vList } = await supabase.from('invite_variants').select('id').eq('wedding_id', wId).order('created_at', { ascending: true }).limit(1);
                            targetUrl = getWebInvitePreviewUrl(wId, vList?.[0]?.id);
                        }

                        window.open(targetUrl, '_blank');
                        return;
                    }

                    showWeddingVariantsModal(wId, wTitle);
                });
            }

            cardEl.addEventListener('click', () => {
                const weddingId = cardEl.getAttribute('data-wedding-id');
                window.location.hash = `#wedding-details?id=${weddingId}`;
            });

            listContainer.appendChild(cardEl);
        });

        groupWrapper.appendChild(listContainer);
        container.appendChild(groupWrapper);
    });

    return container;
}

async function showWeddingVariantsModal(weddingId, weddingTitle) {
    const [{ data: wedding }, { data: variants }, { data: allEvents }] = await Promise.all([
        supabase.from('weddings').select('invitation_type, allow_variants').eq('id', weddingId).single(),
        supabase.from('invite_variants').select('*').eq('wedding_id', weddingId).order('created_at', { ascending: false }),
        supabase.from('wedding_events').select('id, event_name, title').eq('wedding_id', weddingId)
    ]);

    const isWebInviteOnly = wedding?.invitation_type === 'web_invite_only';
    const allowsVariants = isWebInviteOnly ? (wedding?.allow_variants !== false) : true;

    const getPreviewUrl = (variantId) => {
        if (isWebInviteOnly) {
            return allowsVariants 
                ? getWebInvitePublicPreviewUrl(weddingId, variantId) 
                : getWebInvitePublicPreviewUrl(weddingId);
        }
        return getWebInvitePreviewUrl(weddingId, variantId);
    };

    let rowsHTML = '';

    const btnStyle = "background: var(--color-primary, #facc15) !important; color: #1c1917 !important; border: none !important; outline: none !important; font-weight: 600 !important; font-size: 0.8rem !important; padding: 0.5rem 0.85rem !important; border-radius: 4px !important; display: inline-flex !important; align-items: center !important; justify-content: center !important; gap: 6px !important; text-decoration: none !important; cursor: pointer !important; box-shadow: none !important; flex: 1 1 0;";

    const buildVariantRowHTML = (title, countText, url) => `
        <div style="display: flex; flex-direction: column; background: rgba(255,255,255,0.04); border: 1px solid var(--color-border, rgba(255,255,255,0.1)); padding: 12px 14px; border-radius: 6px; margin-bottom: 10px; gap: 10px;">
            <div>
                <div style="font-weight: 600; font-size: 1rem; color: var(--color-text-primary, #ffffff); line-height: 1.3;">${title}</div>
                <div style="font-size: 0.85rem; font-weight: 500; color: #cbd5e1; margin-top: 4px;">${countText}</div>
            </div>
            <div style="display: flex; gap: 8px; width: 100%;">
                <a href="${url}" target="_blank" style="${btnStyle}" title="Open Web Invite">
                    <i data-lucide="external-link" style="width: 14px; height: 14px; stroke: #1c1917 !important;"></i> Web Invite
                </a>
                <button class="dash-copy-variant-btn" data-url="${url}" style="${btnStyle}" title="Copy Link" type="button">
                    <i data-lucide="link" style="width: 14px; height: 14px; stroke: #1c1917 !important;"></i> Copy
                </button>
            </div>
        </div>
    `;

    if (isWebInviteOnly && !allowsVariants) {
        const directUrl = getPreviewUrl();
        const eventCount = (allEvents || []).length;
        rowsHTML = buildVariantRowHTML("All Events", `${eventCount} event(s) included`, directUrl);
    } else if (!variants || variants.length === 0) {
        rowsHTML = `<div style="color: var(--color-text-muted, #94a3b8); font-size: 0.875rem; text-align: center; padding: 18px 0;">No link variants created yet.</div>`;
    } else {
        rowsHTML = variants.map(v => {
            const variantUrl = getPreviewUrl(v.id);
            const count = v.selected_event_ids?.length || 0;
            return buildVariantRowHTML(v.variant_name, `${count} event(s) included`, variantUrl);
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
                showSweetAlert('success', 'Copied!', 'Invite link copied to clipboard.');
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