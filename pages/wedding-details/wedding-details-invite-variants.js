import { supabase } from '../../database/js/api.js';
import { openModal } from '../../global/js/modal.js';
import { showSweetAlert } from '../../global/js/sweet-alert-message.js';
import { getWebInvitePreviewUrl, getWebInvitePublicPreviewUrl } from '../../global/js/env-config.js';
import { layoutDetailsModalFooter, broadcastWeddingDataUpdated } from './wedding-details-common.js';

export function buildVariantsSection(wedding, variants, allEvents = [], guests = [], canConfig = false) {
    const section = document.createElement("div");
    section.className = "wedding-details-section";

    let searchQuery = '';

    const controlsRow = document.createElement("div");
    controlsRow.className = "wedding-details-section__control-bar";

    let leftHTML = canConfig ? `
        <button id="add-variant-btn" class="wedding-action-btn-primary">
            <i data-lucide="plus"></i> Invite Variant
        </button>
    ` : '<div></div>';

    controlsRow.innerHTML = `
        <div class="wedding-details-section__left-actions">${leftHTML}</div>
        <div class="wedding-details-section__right-actions">
            <div class="wedding-details-search-wrapper">
                <i data-lucide="search"></i>
                <input type="text" id="variantSearchInput" placeholder="Search ..." class="wedding-details-search-input">
            </div>
        </div>
    `;
    section.appendChild(controlsRow);

    const content = document.createElement("div");
    section.appendChild(content);

    function renderVariants() {
        const filteredVariants = (variants || [])
            .filter(v => {
                const q = searchQuery.toLowerCase();
                const nameMatch = (v.variant_name || '').toLowerCase().includes(q);
                const eventsMatch = (allEvents || [])
                    .filter(e => v.selected_event_ids?.includes(e.id))
                    .some(e => (e.event_name || e.title || '').toLowerCase().includes(q));
                return nameMatch || eventsMatch;
            })
            .sort((a, b) => {
                const countA = a.selected_event_ids?.length || 0;
                const countB = b.selected_event_ids?.length || 0;
                if (countB !== countA) {
                    return countB - countA;
                }
                return (a.variant_name || '').localeCompare(b.variant_name || '');
            });

        if (!variants || variants.length === 0) {
            content.innerHTML = `<div class="wedding-details-empty-state">No invite variants created yet. Add a variant to generate targeted invite links.</div>`;
            if (window.lucide) window.lucide.createIcons();
            return;
        }

        if (filteredVariants.length === 0) {
            content.innerHTML = `<div class="wedding-details-empty-state">No variants match your search.</div>`;
            if (window.lucide) window.lucide.createIcons();
            return;
        }

        let html = `<div class="variants-grid">`;
        filteredVariants.forEach(v => {
            const isWebInviteOnly = wedding.invitation_type === 'web_invite_only';
            const allowsVariants = isWebInviteOnly ? (wedding.allow_variants !== false) : true;

            const variantUrl = isWebInviteOnly 
                ? (allowsVariants ? getWebInvitePublicPreviewUrl(wedding.id, v.id) : getWebInvitePublicPreviewUrl(wedding.id))
                : getWebInvitePreviewUrl(wedding.id, v.id);

            const assignedGuests = (guests || []).filter(g => g.variant_id === v.id);
            const eventNames = (allEvents || [])
                .filter(e => v.selected_event_ids?.includes(e.id))
                .map(e => `<span class="wedding-details-guest-event-tag"><i data-lucide="calendar"></i> ${e.event_name || e.title}</span>`)
                .join('');

            const eventsDisplay = eventNames || `<span style="font-size: 0.8rem; color: var(--color-text-muted); font-style: italic;">All Wedding Events</span>`;

            const showGuestFeatures = canConfig && !isWebInviteOnly;

            html += `
                <div class="variant-card">
                    <div>
                        <div class="variant-card__header">
                            <div>
                                <h4 class="variant-card__title">${v.variant_name}</h4>
                                ${!isWebInviteOnly ? `<div class="variant-card__count-badge">${assignedGuests.length} guest(s) assigned</div>` : ''}
                            </div>
                            ${canConfig ? `
                                <button class="edit-variant-btn wedding-details-icon-btn" data-id="${v.id}" title="Edit Variant">
                                    <i data-lucide="edit-2" class="wedding-details-edit-icon"></i>
                                </button>
                            ` : ''}
                        </div>
                        <div style="margin-top: 10px;">
                            <div style="font-size: 0.75rem; color: var(--color-text-secondary); margin-bottom: 6px; text-transform: uppercase;">Included Events:</div>
                            <div class="variant-card__events-wrap">${eventsDisplay}</div>
                        </div>
                    </div>
                    <div class="variant-card__actions" style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 8px; padding-top: 12px; margin-top: 6px; border-top: 1px solid var(--color-border, #292524);">
                        ${showGuestFeatures ? `
                            <button class="assign-variant-btn wedding-action-btn-primary" data-id="${v.id}" data-name="${v.variant_name.replace(/"/g, '&quot;')}" style="padding: 0.45rem 0.75rem; font-size: 0.8rem; white-space: nowrap; flex: 1 1 auto; justify-content: center;">
                                <i data-lucide="user-plus" style="width: 14px; height: 14px;"></i> Assign Guests
                            </button>
                        ` : ''}
                        <div class="variant-card__btn-group" style="display: flex; gap: 8px; align-items: center; flex: 1 1 auto; justify-content: flex-end;">
                            <a href="${variantUrl}" target="_blank" class="wedding-action-btn-primary" style="padding: 0.45rem 0.75rem; font-size: 0.8rem; text-decoration: none; white-space: nowrap; display: inline-flex; align-items: center; gap: 6px; flex: 1; justify-content: center;" title="Open Web Invite">
                                <i data-lucide="external-link" style="width: 14px; height: 14px;"></i> Web Invite
                            </a>
                            <button class="copy-variant-btn wedding-action-btn-primary" data-url="${variantUrl}" style="padding: 0.45rem 0.75rem; font-size: 0.8rem; border: none; outline: none; cursor: pointer; white-space: nowrap; display: inline-flex; align-items: center; gap: 6px; flex: 1; justify-content: center;" title="Copy Link" type="button">
                                <i data-lucide="link" style="width: 14px; height: 14px; stroke: #1c1917 !important;"></i> Copy
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        html += `</div>`;
        content.innerHTML = html;

        setTimeout(() => {
            if (canConfig) {
                content.querySelectorAll('.edit-variant-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const vId = btn.getAttribute('data-id');
                        const variant = variants.find(v => v.id === vId);
                        if (variant) openVariantModal(wedding.id, allEvents, variant);
                    });
                });

                content.querySelectorAll('.assign-variant-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const vId = btn.getAttribute('data-id');
                        const vName = btn.getAttribute('data-name');
                        openAssignVariantModal(vId, vName, guests);
                    });
                });
            }

            content.querySelectorAll('.copy-variant-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const url = btn.getAttribute('data-url');
                    navigator.clipboard.writeText(url);
                    showSweetAlert('success', 'Copied!', 'Variant link copied to clipboard.');
                });
            });

            if (window.lucide) window.lucide.createIcons();
        }, 0);
    }

    setTimeout(() => {
        renderVariants();

        const searchInput = section.querySelector('#variantSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                searchQuery = e.target.value;
                renderVariants();
            });
        }

        if (canConfig) {
            const addBtn = section.querySelector('#add-variant-btn');
            if (addBtn) {
                addBtn.replaceWith(addBtn.cloneNode(true));
                section.querySelector('#add-variant-btn').addEventListener('click', () => openVariantModal(wedding.id, allEvents));
            }
        }
    }, 0);

    return section;
}

export function openVariantModal(weddingId, events = [], existingVariant = null) {
    const sortedEvents = [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const selectedIds = existingVariant?.selected_event_ids || [];

    const eventCheckboxes = sortedEvents.map(ev => `
        <label class="wedding-modal-checkbox-label">
            <input type="checkbox" name="variant_events" value="${ev.id}" ${selectedIds.includes(ev.id) ? 'checked' : ''}>
            ${ev.event_name || ev.title} (${new Date(ev.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})
        </label>
    `).join('') || `<div class="wedding-details-host-empty">No events scheduled for this wedding yet.</div>`;

    const formHTML = `
        <form id="variantForm" novalidate class="wedding-details-modal-form">
            <div>
                <label class="wedding-modal-label">Variant Name *</label>
                <input type="text" id="variantName" value="${(existingVariant?.variant_name || '').replace(/"/g, '&quot;')}" required placeholder="e.g., Reception Only, Close Family" class="wedding-modal-input ${existingVariant ? 'wedding-modal-input--valid' : 'wedding-modal-input--invalid'}">
            </div>
            <div>
                <label class="wedding-modal-label">Include Events *</label>
                <div class="wedding-modal-checkbox-box">
                    ${eventCheckboxes}
                </div>
            </div>
        </form>
    `;

    const actions = [
        { label: "Cancel", variant: "ghost" },
        ...(existingVariant ? [{
            label: "Delete",
            variant: "danger",
            closesModal: false,
            onClick: async () => {
                const res = await Swal.fire({
                    title: 'Delete Variant?',
                    text: "Guests assigned to this variant will be unassigned.",
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonColor: '#dc2626',
                    cancelButtonColor: '#6b7280',
                    confirmButtonText: 'Yes, delete it!'
                });
                if (res.isConfirmed) {
                    await supabase.from('invite_variants').delete().eq('id', existingVariant.id);
                    modal.close();
                    broadcastWeddingDataUpdated();
                    showSweetAlert('success', 'Deleted!', 'Variant removed.');
                }
            }
        }] : []),
        {
            label: existingVariant ? "Edit" : "Add",
            variant: "primary",
            closesModal: false,
            onClick: async () => {
                const name = document.getElementById('variantName').value.trim();
                const selected = Array.from(document.querySelectorAll('input[name="variant_events"]:checked')).map(cb => cb.value);

                if (!name) {
                    showSweetAlert('error', 'Missing Information', 'Please provide a variant name.');
                    return;
                }
                if (selected.length === 0) {
                    showSweetAlert('error', 'Missing Events', 'Please select at least one event.');
                    return;
                }

                try {
                    if (existingVariant) {
                        const { error } = await supabase.from('invite_variants').update({
                            variant_name: name,
                            selected_event_ids: selected
                        }).eq('id', existingVariant.id);
                        if (error) throw error;
                    } else {
                        const { error } = await supabase.from('invite_variants').insert([{
                            wedding_id: weddingId,
                            variant_name: name,
                            selected_event_ids: selected
                        }]);
                        if (error) throw error;
                    }

                    modal.close();
                    broadcastWeddingDataUpdated();
                    showSweetAlert('success', existingVariant ? 'Updated!' : 'Created!', 'Variant saved successfully.');
                } catch (err) {
                    showSweetAlert('error', 'Database Error', err.message);
                }
            }
        }
    ];

    const modal = openModal({
        title: existingVariant ? "Edit Invite Variant" : "Add Invite Variant",
        content: formHTML,
        actions: actions
    });

    setTimeout(() => {
        layoutDetailsModalFooter(!!existingVariant);
        const nameInput = document.getElementById('variantName');
        if (nameInput) {
            nameInput.addEventListener('input', () => {
                nameInput.classList.toggle('wedding-modal-input--invalid', !nameInput.value.trim());
                nameInput.classList.toggle('wedding-modal-input--valid', !!nameInput.value.trim());
            });
        }
    }, 50);
}

export function openAssignVariantModal(variantId, variantName, guests = []) {
    const sortedGuests = [...guests].sort((a, b) => 
        (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })
    );
    let filteredList = [...sortedGuests];

    const listMarkup = (items) => items.map(g => {
        const isCurrentlyAssigned = g.variant_id === variantId;
        const currentTag = g.variant_name && g.variant_name !== 'No Variant Assigned' ? `<span class="guest-assign-current-tag">${g.variant_name}</span>` : '';
        return `
            <label class="guest-assign-item">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <input type="checkbox" name="assign_guest" value="${g.id}" ${isCurrentlyAssigned ? 'checked' : ''} style="accent-color: var(--color-primary);">
                    <span style="font-size: 0.85rem; color: var(--color-text-primary); font-weight: 500;">${g.name} (${g.phone || 'No phone'})</span>
                </div>
                ${currentTag}
            </label>
        `;
    }).join('');

    const formHTML = `
        <div style="display: flex; flex-direction: column; gap: 12px; font-family: inherit;">
            <p style="margin: 0; font-size: 0.85rem; color: var(--color-text-secondary);">
                Select guests to assign to the <strong style="color: var(--color-primary);">${variantName}</strong> variant. Assigning will overwrite any existing variant.
            </p>
            <input type="text" id="assignSearchInput" placeholder="Filter guests..." class="wedding-modal-input" style="height: 34px;">
            <div id="assignGuestsContainer" class="guest-assign-list">
                ${listMarkup(filteredList)}
            </div>
        </div>
    `;

    const modal = openModal({
        title: `Assign Guests: ${variantName}`,
        content: formHTML,
        actions: [
            { label: "Cancel", variant: "ghost" },
            {
                label: "Apply Variant",
                variant: "primary",
                closesModal: false,
                onClick: async () => {
                    const selectedGuestIds = Array.from(document.querySelectorAll('input[name="assign_guest"]:checked')).map(cb => cb.value);

                    const guestsWithOtherVariant = sortedGuests.filter(g => 
                        selectedGuestIds.includes(g.id) && g.variant_id && g.variant_id !== variantId
                    );

                    if (guestsWithOtherVariant.length > 0) {
                        const confirmRes = await Swal.fire({
                            title: 'Overwrite Existing Variant?',
                            text: `${guestsWithOtherVariant.length} of the selected guest(s) are already assigned to another variant. Do you want to overwrite their assignment?`,
                            icon: 'warning',
                            showCancelButton: true,
                            confirmButtonColor: 'var(--color-primary, #eab308)',
                            cancelButtonColor: '#6b7280',
                            confirmButtonText: 'Yes, overwrite!'
                        });
                        if (!confirmRes.isConfirmed) return;
                    }

                    try {
                        if (selectedGuestIds.length > 0) {
                            const { error: assignErr } = await supabase
                                .from('guests')
                                .update({ variant_id: variantId })
                                .in('id', selectedGuestIds);
                            if (assignErr) throw assignErr;
                        }

                        const unselectedIds = sortedGuests
                            .filter(g => g.variant_id === variantId && !selectedGuestIds.includes(g.id))
                            .map(g => g.id);

                        if (unselectedIds.length > 0) {
                            const { error: unassignErr } = await supabase
                                .from('guests')
                                .update({ variant_id: null })
                                .in('id', unselectedIds);
                            if (unassignErr) throw unassignErr;
                        }

                        modal.close();
                        broadcastWeddingDataUpdated();
                        showSweetAlert('success', 'Assigned!', `Updated guest variant assignments.`);
                    } catch (err) {
                        showSweetAlert('error', 'Error', err.message);
                    }
                }
            }
        ]
    });

    setTimeout(() => {
        layoutDetailsModalFooter(false);
        const search = document.getElementById('assignSearchInput');
        const container = document.getElementById('assignGuestsContainer');
        if (search && container) {
            search.addEventListener('input', (e) => {
                const query = e.target.value.toLowerCase();
                const matched = sortedGuests.filter(g => (g.name || '').toLowerCase().includes(query) || (g.phone || '').includes(query));
                container.innerHTML = listMarkup(matched);
            });
        }
    }, 50);
}