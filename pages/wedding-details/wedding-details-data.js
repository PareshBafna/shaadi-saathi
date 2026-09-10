import { supabase } from '../../database/js/api.js';
import { openModal } from '../../global/js/modal.js';
import { showSweetAlert } from '../../global/js/sweet-alert-message.js';
import { formatWeddingDateRange } from '../weddings/weddings.js';
import { getWebInvitePreviewUrl, getWebInvitePublicPreviewUrl } from '../../global/js/env-config.js';

export function buildSpecificHeader(wedding, hasWebInvite = true, variants = []) {
    const header = document.createElement("div");
    header.className = "wedding-details-header";
    
    const leftSide = document.createElement("div");
    leftSide.className = "wedding-details-header__left";
    
    const isGroom = (wedding.primary_side || '').toString().toLowerCase().includes('groom');
    const displayNames = isGroom 
        ? `${wedding.groom_name} & ${wedding.bride_name}` 
        : `${wedding.bride_name} & ${wedding.groom_name}`;

    let hashtagHTML = '';
    if (wedding.hashtag) {
        const formattedHashtag = wedding.hashtag.startsWith('#') ? wedding.hashtag : `#${wedding.hashtag}`;
        hashtagHTML = `<div class="wedding-details-header__hashtag-wrap"><span class="wedding-details-header__hashtag">${formattedHashtag}</span></div>`;
    }

    leftSide.innerHTML = `
        <h1 class="wedding-details-header__title">${displayNames}</h1>
        <p class="wedding-details-header__date">Date: <strong>${formatWeddingDateRange(wedding.start_date, wedding.end_date)}</strong></p>
        ${hashtagHTML}
    `;

    const rightSide = document.createElement("div");
    rightSide.className = "wedding-details-header__right";

    let instagramHTML = '';
    if (wedding.instagram) {
        let igUrl = wedding.instagram.startsWith('http') ? wedding.instagram : `https://instagram.com/${wedding.instagram.replace('@', '')}`;
        let handle = wedding.instagram.trim();
        if (handle.includes('instagram.com/')) {
            handle = handle.split('instagram.com/')[1].replace(/\//g, '');
        }
        handle = handle.replace('@', ''); 

        instagramHTML = `
            <a href="${igUrl}" target="_blank" class="wedding-details-header__instagram-btn" title="Instagram">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M8 0C5.829 0 5.556.01 4.703.048 3.85.088 3.269.222 2.76.42a3.917 3.917 0 0 0-1.417.923A3.927 3.927 0 0 0 .42 2.76C.222 3.268.087 3.85.048 4.7.01 5.555 0 5.827 0 8.001c0 2.172.01 2.444.048 3.297.04.852.174 1.433.372 1.942.205.526.478.972.923 1.417.444.445.89.719 1.416.923.51.198 1.09.333 1.942.372C5.555 15.99 5.827 16 8 16s2.444-.01 3.298-.048c.851-.04 1.434-.174 1.943-.372a3.916 3.916 0 0 0 1.416-.923c.445-.445.718-.891.923-1.417.197-.509.332-1.09.372-1.942C15.99 10.445 16 10.173 16 8s-.01-2.445-.048-3.299c-.04-.851-.175-1.433-.372-1.941a3.926 3.926 0 0 0-.923-1.417A3.911 3.911 0 0 0 13.24.42c-.51-.198-1.092-.333-1.943-.372C10.443.01 10.172 0 7.998 0h.003zm-.717 1.442h.718c2.136 0 2.389.007 3.232.046.78.035 1.204.166 1.486.275.373.145.64.319.92.599.28.28.453.546.598.92.11.281.24.705.275 1.485.039.843.047 1.096.047 3.231s-.008 2.389-.047 3.232c-.035.78-.166 1.203-.275 1.485a2.47 2.47 0 0 1-.599.919c-.28.28-.546.453-.92.598-.282.11-.705.24-1.485.276-.843.038-1.096.047-3.232.047s-2.39-.009-3.233-.047c-.78-.036-1.203-.166-1.485-.276a2.478 2.478 0 0 1-.92-.598 2.48 2.48 0 0 1-.6-.92c-.109-.281-.24-.705-.275-1.485-.038-.843-.046-1.096-.046-3.233 0-2.136.008-2.388.046-3.231.036-.78.166-1.204.276-1.486.145-.373.319-.64.599-.92.28-.28.546-.453.92-.598.282-.11.705-.24 1.485-.276.738-.034 1.024-.044 2.515-.045v.002zm4.988 1.328a.96.96 0 1 0 0 1.92.96.96 0 0 0 0-1.92zm-4.27 1.122a4.109 4.109 0 1 0 0 8.217 4.109 4.109 0 0 0 0-8.217zm0 1.441a2.667 2.667 0 1 1 0 5.334 2.667 2.667 0 0 1 0-5.334z"/>
                </svg>
                ${handle}
            </a>
        `;
    }

    let webInviteHTML = '';
    if (hasWebInvite || wedding.id === '00000000-0000-0000-0000-000000000000') {
        webInviteHTML = `
            <button type="button" id="details-header-invite-btn" class="wedding-details-header__invite-btn" style="border: none; outline: none; box-shadow: none; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                <i data-lucide="external-link"></i> Wedding Invitation
            </button>`;
    }

    rightSide.innerHTML = `
        ${instagramHTML}
        ${webInviteHTML}
    `;

    header.appendChild(leftSide);
    header.appendChild(rightSide);

    setTimeout(() => {
        const headerInviteBtn = header.querySelector('#details-header-invite-btn');
        if (headerInviteBtn) {
            headerInviteBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const curUser = window.currentUser || { role: 'guest' };

                if (curUser.role === 'guest') {
                    const { data: guests } = await supabase.from('guests').select('variant_id, phone').eq('wedding_id', wedding.id);

                    const cleanPhone = (p) => (p || '').replace(/[^0-9]/g, '').slice(-10);
                    const curUserClean = cleanPhone(curUser.phone);
                    const guestRecord = (guests || []).find(g => cleanPhone(g.phone) === curUserClean);
                    const guestVariantId = guestRecord?.variant_id || null;

                    const isWebInviteOnly = wedding?.invitation_type === 'web_invite_only';
                    const allowsVariants = isWebInviteOnly ? (wedding?.allow_variants !== false) : true;

                    let targetUrl = '';
                    if (isWebInviteOnly) {
                        targetUrl = allowsVariants && guestVariantId
                            ? getWebInvitePublicPreviewUrl(wedding.id, guestVariantId)
                            : getWebInvitePublicPreviewUrl(wedding.id);
                    } else {
                        targetUrl = getWebInvitePreviewUrl(wedding.id, guestVariantId);
                    }

                    window.open(targetUrl, '_blank');
                    return;
                }

                showWeddingVariantsModal(wedding.id, displayNames);
            });
        }
    }, 0);
    
    return header;
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

export function buildSpecificStats(wedding, eventsCount = 0, guestsCount = 0, hosts = [], canViewAll = true, isWebInviteOnly = false) {
    const formatWithNewlines = (text) => text ? text.replace(/[,;]\s*/g, '<br>') : '';

    const container = document.createElement("div");
    container.className = "wedding-details-stats";

    if (wedding.family_name || wedding.family_details) {
        const topRow = document.createElement("div");
        topRow.className = "wedding-details-stats__top-row";
        
        let topCardsHTML = '';

        if (wedding.family_name) {
            topCardsHTML += `
            <div class="wedding-details-stat-card wedding-details-stat-card--flex1">
                <div>
                    <p class="wedding-details-stat-card__subtitle">Family Name</p>
                    <p class="wedding-details-stat-card__title wedding-details-stat-card__title--md">${wedding.family_name}</p>
                </div>
                <div class="wedding-details-stat-card__icon-badge">
                    <i data-lucide="home"></i>
                </div>
            </div>`;
        }

        if (wedding.family_details) {
            topCardsHTML += `
            <div class="wedding-details-stat-card wedding-details-stat-card--flex2">
                <div>
                    <p class="wedding-details-stat-card__subtitle">Family Details</p>
                    <p class="wedding-details-stat-card__title wedding-details-stat-card__title--md wedding-details-stat-card__title--details">${formatWithNewlines(wedding.family_details)}</p>
                </div>
                <div class="wedding-details-stat-card__icon-badge">
                    <i data-lucide="users"></i>
                </div>
            </div>`;
        }

        topRow.innerHTML = topCardsHTML;
        container.appendChild(topRow);
    }

    const bottomGrid = document.createElement("div");
    bottomGrid.className = "wedding-details-stats__grid";

    let bottomCardsHTML = '';
    let hostRowsHTML = '';

    if (!isWebInviteOnly) {
        if (hosts && hosts.length > 0) {
            const sortedHosts = [...hosts].sort((a, b) => (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase()));
            hostRowsHTML = sortedHosts.map(host => {
                const cleanNum = host.phone ? host.phone.replace(/[^0-9+]/g, '') : '';
                return `
                <div class="wedding-details-host-row">
                    <span class="wedding-details-host-row__text">${host.name} - ${host.phone}</span>
                    <a href="tel:${cleanNum}" class="wedding-details-host-row__call-btn" title="Call ${host.name}">
                        <i data-lucide="phone"></i>
                    </a>
                </div>`;
            }).join('');
        } else {
            hostRowsHTML = `<div class="wedding-details-host-empty">No wedding hosts added yet.</div>`;
        }

        bottomCardsHTML += `
        <div class="wedding-details-stat-card wedding-details-stat-card--column">
            <p class="wedding-details-stat-card__subtitle">Wedding Host Details</p>
            ${hostRowsHTML}
        </div>`;
    }

    if (canViewAll && !isWebInviteOnly) {
        bottomCardsHTML += `
        <div class="wedding-details-stat-card">
            <div>
                <p class="wedding-details-stat-card__subtitle">Total Guests</p>
                <p class="wedding-details-stat-card__title">${guestsCount}</p>
            </div>
            <div class="wedding-details-stat-card__icon-badge">
                <i data-lucide="users"></i>
            </div>
        </div>`;
    }

    bottomCardsHTML += `
    <div class="wedding-details-stat-card">
        <div>
            <p class="wedding-details-stat-card__subtitle">Total Events</p>
            <p class="wedding-details-stat-card__title">${eventsCount}</p>
        </div>
        <div class="wedding-details-stat-card__icon-badge">
            <i data-lucide="calendar"></i>
        </div>
    </div>`;

    bottomGrid.innerHTML = bottomCardsHTML;
    container.appendChild(bottomGrid);

    return container;
}