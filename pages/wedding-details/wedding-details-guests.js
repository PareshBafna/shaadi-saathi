import { supabase } from '../../database/js/api.js';
import { openModal } from '../../global/js/modal.js';
import { showSweetAlert } from '../../global/js/sweet-alert-message.js';
import { getWebInvitePublicPreviewUrl } from '../../global/js/env-config.js';
import { 
    normalizePhone, 
    generateInviteCode, 
    ensureXLSXLoaded, 
    layoutDetailsModalFooter, 
    convertToSearchableDropdown, 
    broadcastWeddingDataUpdated 
} from './wedding-details-common.js';

export function buildGuestListSection(wedding, guests, events, variants, canConfig, isCreator = false) {
    window.__currentEvents = events || [];
    window.__currentVariants = variants || [];

    const section = document.createElement("div");
    section.className = "wedding-details-section";

    let searchQuery = '';

    const controlsRow = document.createElement("div");
    controlsRow.className = "wedding-details-section__control-bar";
    
    let leftActions = isCreator ? `
        <button id="importSampleTriggerBtn" class="wedding-action-btn-primary">
            <i data-lucide="upload"></i> Import / Sample
        </button>
    ` : '';

    let middleActions = canConfig ? `
        <button id="addGuestBtnTrigger" class="wedding-action-btn-primary">
            <i data-lucide="plus"></i> Guest
        </button>
    ` : '';

    controlsRow.innerHTML = `
        <div class="wedding-details-section__left-actions guest-control-left">
            ${leftActions}
        </div>
        <div class="wedding-details-section__middle-actions guest-control-center">
            ${middleActions}
        </div>
        <div class="wedding-details-section__right-actions guest-control-right">
            <div class="wedding-details-search-wrapper">
                <i data-lucide="search"></i>
                <input type="text" id="guestSearchInput" placeholder="Search ..." class="wedding-details-search-input">
            </div>
        </div>
    `;
    section.appendChild(controlsRow);

    const content = document.createElement("div");
    section.appendChild(content);

    function getWhatsAppButton(guest) {
        const cleanPhone = guest.phone ? guest.phone.replace(/[^0-9+]/g, '') : '';
        const guestEvents = events ? events.filter(e => guest.invited_events?.includes(e.id)) : [];
        const hasInvitedEvents = guest.invited_events && guest.invited_events.length > 0;
        
        if (guest.phone && hasInvitedEvents) {
            const displayNames = wedding.primary_side === 'groom' ? `${wedding.groom_name} & ${wedding.bride_name}` : `${wedding.bride_name} & ${wedding.groom_name}`;
            const weddingUrl = guest.variant_id 
                ? getWebInvitePublicPreviewUrl(wedding.id, guest.variant_id)
                : getWebInvitePublicPreviewUrl(wedding.id);
            
            const sortedGuestEvents = [...guestEvents].sort((a, b) => {
                const timeA = a.time || '00:00:00';
                const timeB = b.time || '00:00:00';
                return new Date(`${a.date}T${timeA.length === 5 ? timeA + ':00' : timeA}`).getTime() - 
                       new Date(`${b.date}T${timeB.length === 5 ? timeB + ':00' : timeB}`).getTime();
            });
            
            const eventsListText = sortedGuestEvents.map(ev => {
                const evDate = new Date(ev.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                return `• ${ev.event_name || ev.title} (${evDate})`;
            }).join('\n');

            const waMessage = `Jai Jinendra,\n\n*${(guest.name || '').toUpperCase()}*,\n\n*${(wedding.family_name || '').toUpperCase()}* Family has sent you an invitation for the wedding of *${displayNames}* on *_Shaadi Saathi_*.\n\nYou are cordially invited to the following events:\n${eventsListText}\n\nClick the link below to view the complete invitation and event details:\n${weddingUrl}\n\nAwaiting your gracious presence.\n\nRegards,\n*${wedding.family_details || ''}*\n\n*_Shaadi Saathi_*`;
            const encodedMessage = encodeURIComponent(waMessage);

            return `
                <a href="https://wa.me/${cleanPhone}?text=${encodedMessage}" target="_blank" onclick="event.stopPropagation();" class="guest-wa-btn" title="WhatsApp">
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                </a>
            `;
        } else if (!guest.phone) {
            return `<div class="guest-wa-badge--error">No Phone</div>`;
        } else {
            return `<div class="guest-wa-badge--error">No Events</div>`;
        }
    }

    function renderGuests() {
        const filteredGuests = (guests || []).filter(g => {
            const query = searchQuery.toLowerCase();
            return (g.name || '').toLowerCase().includes(query) || (g.phone || '').includes(query);
        });

        if (!guests || guests.length === 0) {
            content.innerHTML = `<div class="wedding-details-empty-state">No guests added yet.</div>`;
            if (window.lucide) window.lucide.createIcons();
            return;
        }

        if (filteredGuests.length === 0) {
            content.innerHTML = `<div class="wedding-details-empty-state">No guests match your search.</div>`;
            if (window.lucide) window.lucide.createIcons();
            return;
        }

        const groupedGridStyle = canConfig 
            ? "grid-template-columns: 32px 45px minmax(160px, 1.5fr) minmax(130px, 1fr) 65px 40px;"
            : "grid-template-columns: 45px minmax(160px, 1.5fr) minmax(130px, 1fr) 65px;";

        const sortedVariants = [...(variants || [])].sort((a, b) => {
            const countA = a.selected_event_ids?.length || 0;
            const countB = b.selected_event_ids?.length || 0;
            if (countB !== countA) return countB - countA;
            return (a.variant_name || '').localeCompare(b.variant_name || '');
        });

        const groupedMap = new Map();
        sortedVariants.forEach(v => groupedMap.set(v.id, { variant: v, guests: [] }));
        groupedMap.set('none', { variant: { id: 'none', variant_name: 'No Variant Assigned', selected_event_ids: [] }, guests: [] });

        filteredGuests.forEach(g => {
            const key = g.variant_id && groupedMap.has(g.variant_id) ? g.variant_id : 'none';
            groupedMap.get(key).guests.push(g);
        });

        let groupHTML = `<div>`;
        let accordionIdx = 0;

        groupedMap.forEach(({ variant, guests: gList }) => {
            if (gList.length === 0) return;

            gList.sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));
            const bodyId = `variant-accordion-body-${accordionIdx++}`;

            groupHTML += `
                <div class="variant-group-block" style="margin-bottom: 1rem;">
                    <div class="variant-group-header variant-accordion-toggle" data-target="${bodyId}" style="cursor: pointer; user-select: none;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <i data-lucide="chevron-down" class="variant-accordion-icon" style="transition: transform 0.2s ease; width: 18px; height: 18px; color: var(--color-primary);"></i>
                            <h4 class="variant-group-title" style="margin: 0;">${variant.variant_name}</h4>
                        </div>
                        <span class="variant-group-count">${gList.length} guest(s)</span>
                    </div>
                    <div id="${bodyId}" class="variant-accordion-body wedding-details-table-container">
                        <div class="wedding-details-table-inner--guests">
                            <div class="wedding-details-table-header" style="display: grid; align-items: center; gap: 10px; ${groupedGridStyle}">
                                ${canConfig ? '<div></div>' : ''}
                                <div>S.No</div>
                                <div>Name</div>
                                <div>Phone Number</div>
                                <div class="guest-events-count">Events</div>
                                ${canConfig ? '<div class="guest-events-count">WA</div>' : ''}
                            </div>
                            <div class="wedding-details-table-body-scroll">
            `;

            gList.forEach((guest, index) => {
                const editCol = canConfig ? `
                    <button class="edit-guest-btn wedding-details-icon-btn" data-id="${guest.id}" title="Edit">
                        <i data-lucide="edit-2" class="wedding-details-edit-icon"></i>
                    </button>
                ` : '';

                groupHTML += `
                    <div class="wedding-details-table-row-wrap">
                        <div style="display: grid; align-items: center; padding: 0.75rem 1rem; gap: 10px; ${groupedGridStyle}">
                            ${editCol}
                            <div class="wedding-details-col-sno">${index + 1}</div>
                            <div class="guest-name-cell">
                                <h4 class="guest-name-text">${guest.name || '-'}</h4>
                            </div>
                            <div class="guest-phone-cell">
                                <i data-lucide="phone"></i> <span>${guest.phone || '-'}</span>
                            </div>
                            <div class="guest-events-count">
                                ${guest.invited_events?.length || 0}
                            </div>
                            ${canConfig ? `<div>${getWhatsAppButton(guest)}</div>` : ''}
                        </div>
                    </div>
                `;
            });

            groupHTML += `
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        groupHTML += `</div>`;
        content.innerHTML = groupHTML;

        content.querySelectorAll('.variant-accordion-toggle').forEach(headerEl => {
            headerEl.addEventListener('click', () => {
                const targetId = headerEl.getAttribute('data-target');
                const bodyEl = document.getElementById(targetId);
                const icon = headerEl.querySelector('.variant-accordion-icon');
                if (!bodyEl) return;

                const isClosed = bodyEl.style.display === 'none';
                bodyEl.style.display = isClosed ? 'block' : 'none';
                if (icon) {
                    icon.style.transform = isClosed ? 'rotate(0deg)' : 'rotate(-90deg)';
                }
            });
        });

        setTimeout(() => {
            if (canConfig) {
                const editBtns = content.querySelectorAll('.edit-guest-btn');
                editBtns.forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        openEditGuestModal(wedding.id, btn.getAttribute('data-id'), variants);
                    });
                });
            }

            if (window.lucide) window.lucide.createIcons();
        }, 0);
    }
    
    setTimeout(() => {
        renderGuests();
        
        const searchInput = section.querySelector('#guestSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                searchQuery = e.target.value;
                renderGuests();
            });
        }

        if (isCreator) {
            section.querySelector('#importSampleTriggerBtn')?.addEventListener('click', () => openImportModal(wedding.id));
        }

        if (canConfig) {
            const trigger = section.querySelector('#addGuestBtnTrigger');
            if (trigger) {
                trigger.replaceWith(trigger.cloneNode(true));
                section.querySelector('#addGuestBtnTrigger').addEventListener('click', () => openGuestModal(wedding.id, variants));
            }
        }
    }, 0);

    return section;
}

export function openGuestModal(weddingId, variants = []) {
    const variantOptions = (variants || []).map(v => `<option value="${v.id}">${v.variant_name}</option>`).join('');

    const formHTML = `
        <form id="createGuestForm" novalidate class="wedding-details-modal-form" style="min-height:400px;">
            <div>
                <label class="wedding-modal-label">Guest Name *</label>
                <input type="text" id="guestName" required placeholder="Enter guest name" class="wedding-modal-input wedding-modal-input--invalid">
            </div>
            <div>
                <label class="wedding-modal-label">Phone Number *</label>
                <input type="tel" id="guestPhone" required placeholder="Enter phone number" oninput="this.value = this.value.replace(/[^0-9]/g, '');" class="wedding-modal-input wedding-modal-input--invalid">
            </div>
            <div style="position: relative;">
                <label class="wedding-modal-label">Assign Variant (Optional)</label>
                <select id="guestVariantId" class="wedding-modal-input">
                    <option value="">-- No Variant (Default) --</option>
                    ${variantOptions}
                </select>
            </div>
        </form>
    `;

    const modal = openModal({
        title: "Add New Guest",
        content: formHTML,
        actions: [
            { label: "Cancel", variant: "ghost" },
            { 
                label: "Add", 
                variant: "primary", 
                closesModal: false,
                onClick: async () => {
                    const nameEl = document.getElementById('guestName');
                    const phoneEl = document.getElementById('guestPhone');
                    const variantId = document.getElementById('guestVariantId').value || null;

                    if (!nameEl.value.trim() || !phoneEl.value.trim()) {
                        showSweetAlert('error', 'Missing Information', 'Please fill out all mandatory fields.');
                        return;
                    }

                    const phoneInput = phoneEl.value.trim();
                    const cleanedInputNormalized = normalizePhone(phoneInput);

                    try {
                        const { data: existingGuests, error: fetchErr } = await supabase.from('guests').select('*').eq('wedding_id', weddingId);
                        if (fetchErr) throw fetchErr;

                        const matchingGuest = existingGuests.find(g => normalizePhone(g.phone) === cleanedInputNormalized);

                        if (matchingGuest) {
                            const { error: updateErr } = await supabase
                                .from('guests')
                                .update({
                                    name: nameEl.value.trim(),
                                    phone: phoneInput,
                                    variant_id: variantId
                                })
                                .eq('id', matchingGuest.id);
                            if (updateErr) throw updateErr;
                        } else {
                            const { error: insertError } = await supabase.from('guests').insert([{ 
                                wedding_id: weddingId,
                                name: nameEl.value.trim(),
                                phone: phoneInput,
                                variant_id: variantId,
                                invite_code: generateInviteCode()
                            }]);
                            if (insertError) throw insertError;
                        }

                        modal.close();
                        broadcastWeddingDataUpdated();
                        showSweetAlert('success', matchingGuest ? 'Updated!' : 'Added!', `Guest saved successfully.`);
                    } catch (error) {
                        showSweetAlert('error', 'Database Error', error.message);
                    }
                }
            }
        ]
    });

    setTimeout(() => {
        layoutDetailsModalFooter(false);
        convertToSearchableDropdown('guestVariantId');

        ['guestName', 'guestPhone'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                const updateValidity = () => {
                    el.classList.toggle('wedding-modal-input--invalid', !el.value.trim());
                    el.classList.toggle('wedding-modal-input--valid', !!el.value.trim());
                };
                updateValidity();
                el.addEventListener('input', updateValidity);
            }
        });
    }, 50);
}

export async function openEditGuestModal(weddingId, guestId, variants = []) {
    let guest = null;
    try {
        const { data, error } = await supabase.from('guests').select('*').eq('id', guestId).single();
        if (error) throw error;
        guest = data;
    } catch (e) {
        showSweetAlert('error', 'Error', 'Failed to load guest data.');
        return;
    }

    const variantOptions = (variants || []).map(v => 
        `<option value="${v.id}" ${guest.variant_id === v.id ? 'selected' : ''}>${v.variant_name}</option>`
    ).join('');

    const formHTML = `
        <form id="editGuestForm" novalidate class="wedding-details-modal-form" style="min-height:400px;">
            <div>
                <label class="wedding-modal-label">Guest Name *</label>
                <input type="text" id="editGuestName" value="${(guest.name || '').replace(/"/g, '&quot;')}" required class="wedding-modal-input wedding-modal-input--valid">
            </div>
            <div>
                <label class="wedding-modal-label">Phone Number *</label>
                <input type="tel" id="editGuestPhone" value="${guest.phone || ''}" oninput="this.value = this.value.replace(/[^0-9]/g, '');" required class="wedding-modal-input wedding-modal-input--valid">
            </div>
            <div style="position: relative;">
                <label class="wedding-modal-label">Assign Variant</label>
                <select id="editGuestVariantId" class="wedding-modal-input">
                    <option value="">-- No Variant (Default) --</option>
                    ${variantOptions}
                </select>
            </div>
        </form>
    `;

    const modal = openModal({
        title: "Edit Guest",
        content: formHTML,
        actions: [            
            { label: "Cancel", variant: "ghost" },
            {
                label: "Delete",
                variant: "danger", 
                closesModal: false,
                onClick: async () => {
                    const result = await Swal.fire({
                        title: 'Are you sure?',
                        text: "Do you really want to remove this guest?",
                        icon: 'question', 
                        showCancelButton: true,
                        confirmButtonColor: '#dc2626',
                        cancelButtonColor: '#6b7280',
                        confirmButtonText: 'Yes, remove them!'
                    });

                    if (result.isConfirmed) {
                        try {
                            const { error } = await supabase.from('guests').delete().eq('id', guest.id);
                            if (error) throw error;
                            
                            modal.close();
                            broadcastWeddingDataUpdated();
                            showSweetAlert('success', 'Removed!', 'Guest has been removed.');
                        } catch (error) {
                            showSweetAlert('error', 'Database Error', error.message);
                        }
                    }
                }
            },
            { 
                label: "Edit", 
                variant: "primary", 
                closesModal: false,
                onClick: async () => {
                    const name = document.getElementById('editGuestName').value.trim();
                    const phone = document.getElementById('editGuestPhone').value.trim();
                    const variantId = document.getElementById('editGuestVariantId').value || null;

                    if (!name || !phone) {
                        showSweetAlert('error', 'Missing Information', 'Please fill out all mandatory fields.');
                        return;
                    }

                    try {
                        const { error } = await supabase.from('guests').update({ 
                            name: name,
                            phone: phone,
                            variant_id: variantId
                        }).eq('id', guest.id);
                        
                        if (error) throw error;

                        modal.close();
                        broadcastWeddingDataUpdated();
                        showSweetAlert('success', 'Updated!', 'Guest details updated successfully.');
                    } catch (error) {
                        showSweetAlert('error', 'Database Error', error.message);
                    }
                }
            }
        ]
    });

    setTimeout(() => {
        layoutDetailsModalFooter(true);
        convertToSearchableDropdown('editGuestVariantId');
    }, 50);
}

export function openImportModal(weddingId) {
    const dialogHTML = `
        <div class="wedding-import-modal-wrap">
            <p class="wedding-import-modal-desc">
                Upload an Excel file (<code>.xlsx, .xls</code>) to batch add or update your guest list with assigned variants.
            </p>
            <div class="wedding-import-modal-buttons">
                <button id="modalDownloadSampleBtn" class="wedding-action-btn-primary wedding-import-modal-btn">
                    <i data-lucide="download"></i> Download Sample Excel (.xlsx)
                </button>
                <button id="modalSelectFileBtn" class="wedding-action-btn-primary wedding-import-modal-btn">
                    <i data-lucide="upload"></i> Select Excel File to Import
                </button>
            </div>
        </div>
    `;

    const modal = openModal({
        title: "Guest Import & Sample",
        content: dialogHTML,
        actions: [
            { label: "Cancel", variant: "ghost" }
        ]
    });

    setTimeout(() => {
        layoutDetailsModalFooter(false);
        if (window.lucide) window.lucide.createIcons();

        document.getElementById('modalDownloadSampleBtn')?.addEventListener('click', () => {
            downloadSampleExcel();
        });

        document.getElementById('modalSelectFileBtn')?.addEventListener('click', () => {
            modal.close();
            triggerCSVImport(weddingId);
        });
    }, 50);
}

export async function downloadSampleExcel() {
    try {
        const XLSX = await ensureXLSXLoaded();
        const variants = window.__currentVariants || [];
        const variantNames = variants.map(v => v.variant_name);
        
        const headers = ["Name", "Phone Number", "Variant"];
        const sampleRows = [];
        const firstNames = ["Aarav", "Vihaan", "Aditya", "Sai", "Arjun", "Siddharth", "Rohan", "Kabir", "Dhruv", "Aryan", "Ananya", "Diya", "Isha", "Kavya", "Mira", "Neha", "Pooja", "Riya", "Sanya", "Tara"];
        const lastNames = ["Bafna", "Jain", "Shah", "Patel", "Mehta", "Desai", "Parekh", "Kothari", "Doshi", "Gandhi"];
        
        const usedPhones = new Set();

        for (let i = 0; i < 20; i++) {
            const name = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
            let phone;
            do {
                phone = "9" + Math.floor(100000000 + Math.random() * 900000000).toString();
            } while (usedPhones.has(phone));
            usedPhones.add(phone);

            const assignedVariant = variantNames.length > 0 && Math.random() > 0.3 
                ? variantNames[Math.floor(Math.random() * variantNames.length)] 
                : "";

            sampleRows.push([name, phone, assignedVariant]);
        }

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
        ws['!cols'] = [{ wch: 25 }, { wch: 18 }, { wch: 22 }];

        XLSX.utils.book_append_sheet(wb, ws, "Guest List");
        XLSX.writeFile(wb, "Sample_Guest_Import.xlsx");
    } catch (err) {
        showSweetAlert('error', 'Export Error', err.message);
    }
}

export function triggerCSVImport(weddingId) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx, .xls';
    
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const XLSX = await ensureXLSXLoaded();
            const reader = new FileReader();

            reader.onload = async (event) => {
                try {
                    const data = new Uint8Array(event.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                    const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

                    if (rawRows.length === 0) throw new Error("The Excel file is empty.");

                    const getCellValue = (row, keyPatterns) => {
                        const rowKeys = Object.keys(row);
                        for (const pattern of keyPatterns) {
                            const matchedKey = rowKeys.find(k => k.trim().toLowerCase() === pattern.toLowerCase());
                            if (matchedKey !== undefined && row[matchedKey] !== undefined) {
                                return row[matchedKey].toString().trim();
                            }
                        }
                        return "";
                    };

                    const { data: variants, error: varErr } = await supabase
                        .from('invite_variants')
                        .select('id, variant_name')
                        .eq('wedding_id', weddingId);
                    if (varErr) throw varErr;

                    const validRows = [];
                    const invalidVariantRows = [];

                    rawRows.forEach((row, idx) => {
                        const name = getCellValue(row, ['Name', 'Guest Name', 'Full Name']);
                        const phone = getCellValue(row, ['Phone Number', 'Phone', 'Mobile', 'Mobile Number', 'Contact']);
                        const variantCol = getCellValue(row, ['Variant', 'Variant Name', 'Invite Variant', 'Assigned Variant']);

                        if (!name && !phone) return;

                        let vId = null;
                        if (variantCol && 
                            variantCol.toLowerCase() !== 'no variant assigned' && 
                            variantCol.toLowerCase() !== 'none' &&
                            variantCol.toLowerCase() !== 'no variant') {
                            
                            const match = variants?.find(v => v.variant_name.trim().toLowerCase() === variantCol.toLowerCase());
                            if (match) {
                                vId = match.id;
                            } else {
                                invalidVariantRows.push({
                                    rowNumber: idx + 2,
                                    guestName: name || `Row ${idx + 2}`,
                                    variantName: variantCol
                                });
                            }
                        }

                        validRows.push({ name, phone, variantId: vId });
                    });

                    if (validRows.length === 0) {
                        showSweetAlert('info', 'No Data', 'No valid guest records found in the sheet.');
                        return;
                    }

                    Swal.fire({ 
                        title: 'Importing Guests...', 
                        text: 'Please wait while we sync your guests with the database.', 
                        allowOutsideClick: false, 
                        didOpen: () => Swal.showLoading() 
                    });

                    const { data: existingGuests, error: guestsErr } = await supabase
                        .from('guests')
                        .select('*')
                        .eq('wedding_id', weddingId);
                    if (guestsErr) throw guestsErr;
                    
                    const seenNormalized = new Set();
                    let importedCount = 0;

                    for (const { name, phone, variantId } of validRows) {
                        if (!name || !phone) continue;
                        const cleanedNormalized = normalizePhone(phone);
                        if (!cleanedNormalized || seenNormalized.has(cleanedNormalized)) continue;
                        seenNormalized.add(cleanedNormalized);

                        const existing = existingGuests?.find(g => normalizePhone(g.phone) === cleanedNormalized);

                        if (existing) {
                            await supabase.from('guests').update({
                                name: name,
                                phone: phone,
                                variant_id: variantId
                            }).eq('id', existing.id);
                        } else {
                            await supabase.from('guests').insert([{
                                wedding_id: weddingId,
                                name: name,
                                phone: phone,
                                variant_id: variantId,
                                invite_code: generateInviteCode()
                            }]);
                        }
                        importedCount++;
                    }

                    broadcastWeddingDataUpdated();

                    if (invalidVariantRows.length > 0) {
                        const errorListHTML = invalidVariantRows.map(err => 
                            `<li style="margin-bottom: 4px;"><strong>Row ${err.rowNumber} (${err.guestName}):</strong> Variant "<em>${err.variantName}</em>" not found (set to No Variant).</li>`
                        ).join('');

                        await Swal.fire({
                            icon: 'warning',
                            title: 'Import Completed with Warnings',
                            html: `
                                <div style="text-align: left; font-size: 0.85rem; max-height: 220px; overflow-y: auto;">
                                    <p style="margin-bottom: 8px;"><strong>${importedCount}</strong> guests were processed successfully.</p>
                                    <p style="margin-bottom: 6px; color: #facc15;">The following guests had non-existent variants and were imported without a variant:</p>
                                    <ul style="padding-left: 18px; margin: 0; color: #f87171;">
                                        ${errorListHTML}
                                    </ul>
                                </div>
                            `,
                            confirmButtonColor: 'var(--color-primary, #eab308)',
                            confirmButtonText: 'Understood'
                        });
                    } else {
                        showSweetAlert('success', 'Import Complete!', `${importedCount} guests imported successfully.`);
                    }

                } catch (err) {
                    showSweetAlert('error', 'Import Failed', err.message);
                }
            };
            reader.readAsArrayBuffer(file);
        } catch (err) {
            showSweetAlert('error', 'Import Error', err.message);
        }
    };
    input.click();
}