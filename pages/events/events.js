import { supabase } from '../../database/js/api.js';
import { openModal } from '../../global/js/modal.js';
import { showSweetAlert } from '../../global/js/sweet-alert-message.js';

let currentPage = 1;
const itemsPerPage = 10;
let searchQuery = '';
let allEventsData = [];

let broadcastTimer = null;
function broadcastMasterEventsUpdated() {
    if (broadcastTimer) return;
    broadcastTimer = setTimeout(() => {
        broadcastTimer = null;
        window.dispatchEvent(new Event('masterEventsUpdated'));
    }, 150);
}

export function renderEvents() {
    if (typeof window.checkSessionOrShowAlert === 'function' && !window.checkSessionOrShowAlert()) {
        const errSec = document.createElement("section");
        errSec.className = "events-auth-message";
        errSec.textContent = "Please log in to manage events.";
        return errSec;
    }

    const section = document.createElement("section");
    section.className = "events-page-wrapper"; 

    const controls = document.createElement('div');
    controls.className = "events-control-bar";

    const leftContainer = document.createElement('div');
    leftContainer.className = "events-left-action";
    const createBtn = document.createElement("button");
    createBtn.id = "add-master-event-btn";
    createBtn.className = "events-add-btn";
    createBtn.innerHTML = `<i data-lucide="plus"></i> Event`;
    createBtn.addEventListener('click', () => openMasterEventModal());
    leftContainer.appendChild(createBtn);

    const searchContainer = document.createElement('div');
    searchContainer.className = "events-search-container";
    searchContainer.innerHTML = `
        <div class="events-search-input-wrapper">
            <i data-lucide="search" class="events-search-icon"></i>
            <input type="text" id="eventSearchInput" placeholder="Search events..." class="events-search-input">
        </div>
    `;

    controls.appendChild(leftContainer);
    controls.appendChild(searchContainer);
    section.appendChild(controls);

    const cardContainer = document.createElement("div");
    cardContainer.className = "events-card-container";

    const content = document.createElement("div");
    content.id = "master-events-content";
    cardContainer.appendChild(content);
    section.appendChild(cardContainer);

    setTimeout(() => {
        const searchInput = section.querySelector('#eventSearchInput');
        if (searchInput) {
            searchInput.replaceWith(searchInput.cloneNode(true));
            section.querySelector('#eventSearchInput').addEventListener('input', (e) => {
                searchQuery = e.target.value;
                currentPage = 1;
                renderEventsList();
            });
        }
        loadEventsData();
        if (window.lucide) window.lucide.createIcons();
    }, 50);

    const updateHandler = () => {
        if (document.body.contains(section)) {
            loadEventsData();
        } else {
            window.removeEventListener('masterEventsUpdated', updateHandler);
            window.removeEventListener('hashchange', hashChangeCleanup);
        }
    };

    const hashChangeCleanup = () => {
        const modalBackdrops = document.querySelectorAll('.modal-backdrop, .swal2-container');
        modalBackdrops.forEach(b => b.remove());
        window.removeEventListener('hashchange', hashChangeCleanup);
    };

    window.removeEventListener('masterEventsUpdated', updateHandler);
    window.addEventListener('masterEventsUpdated', updateHandler);
    window.addEventListener('hashchange', hashChangeCleanup);

    return section;
}

async function loadEventsData() {
    const content = document.getElementById("master-events-content");
    if (!content) return;
    content.innerHTML = `<div class="events-loading-state">Loading events...</div>`;

    try {
        const { data: events, error } = await supabase.from('events').select('*');
        if (error) throw error;

        allEventsData = events || [];
        renderEventsList();
    } catch (error) {
        content.innerHTML = `<div class="events-error-state">Error loading events: ${error.message}</div>`;
    }
}

function renderEventsList() {
    const content = document.getElementById("master-events-content");
    if (!content) return;

    const filteredEvents = allEventsData.filter(e => {
        const query = searchQuery.toLowerCase();
        const nameMatch = (e.event_name || '').toLowerCase().includes(query);
        const titleMatch = (e.display_title || '').toLowerCase().includes(query);
        return nameMatch || titleMatch;
    });

    filteredEvents.sort((a, b) => (a.event_name || '').toLowerCase().localeCompare((b.event_name || '').toLowerCase()));

    const totalPages = Math.ceil(filteredEvents.length / itemsPerPage) || 1;
    if (currentPage > totalPages) currentPage = totalPages;

    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedEvents = filteredEvents.slice(startIndex, startIndex + itemsPerPage);

    if (filteredEvents.length === 0) {
        content.innerHTML = `<div class="events-empty-state">No events match your search.</div>`;
        if (window.lucide) window.lucide.createIcons();
        return;
    }

    let listHTML = `
        <div class="events-table-scroll-container">
            <div class="events-table-inner">
                <div class="events-table-header">
                    <div></div>
                    <div class="events-sno-col">S.No</div>
                    <div>Event Name</div>
                    <div>Display Title</div>
                    <div>One Liner</div>
                    <div>Description</div>
                </div>
    `;

    paginatedEvents.forEach((ev, index) => {
        const globalIndex = startIndex + index + 1;
        
        listHTML += `
        <div class="events-table-row-wrapper">
            <div class="events-table-row">
                <button class="edit-master-event-btn events-edit-btn" data-id="${ev.id}" title="Edit">
                    <i data-lucide="edit-2"></i>
                </button>
                
                <div class="events-sno-col">${globalIndex}</div>
                
                <div class="events-name-col events-text-clamp">
                    ${ev.event_name || '-'}
                </div>

                <div class="events-title-col events-text-clamp">
                    ${ev.display_title || '-'}
                </div>

                <div class="events-quote-col events-text-clamp">
                    ${ev.one_liner || '-'}
                </div>

                <div class="events-desc-col">
                    ${ev.description || '-'}
                </div>
            </div>
        </div>`;
    });

    listHTML += `
            </div>
        </div>
        <div class="events-pagination-bar">
            <div class="events-pagination-info">
                Showing ${startIndex + 1} to ${Math.min(startIndex + itemsPerPage, filteredEvents.length)} of ${filteredEvents.length} events
            </div>
    `;

    if (totalPages > 1) {
        listHTML += `
            <div class="events-pagination-controls">
                <button class="pagination-btn events-page-btn" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}><i data-lucide="chevron-left"></i></button>
                <span class="events-page-indicator">Page ${currentPage} of ${totalPages}</span>
                <button class="pagination-btn events-page-btn" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}><i data-lucide="chevron-right"></i></button>
            </div>
        `;
    } else {
        listHTML += `<div></div>`; 
    }

    listHTML += `</div>`;
    content.innerHTML = listHTML;

    setTimeout(() => {
        content.querySelectorAll('.edit-master-event-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                openMasterEventModal(btn.getAttribute('data-id'));
            });
        });

        const pageBtns = content.querySelectorAll('.pagination-btn');
        pageBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.hasAttribute('disabled')) return;
                currentPage = parseInt(btn.getAttribute('data-page'));
                renderEventsList();
            });
        });

        if (window.lucide) window.lucide.createIcons();
    }, 0);
}

function layoutMasterModalFooter(isEditModal = false) {
    const allBtns = Array.from(document.querySelectorAll('button'));
    const cancelBtn = allBtns.find(b => b.textContent.trim() === 'Cancel');
    const deleteBtn = allBtns.find(b => b.textContent.trim() === 'Delete');
    const primaryBtn = allBtns.find(b => ['Add', 'Edit', 'Update'].includes(b.textContent.trim()));

    if (cancelBtn) {
        cancelBtn.classList.add('modal-btn-cancel');
        cancelBtn.style.order = '1';
        cancelBtn.style.flexShrink = '0';
        cancelBtn.style.marginRight = isEditModal ? '0' : '0';
    }

    if (deleteBtn) {
        deleteBtn.classList.add('modal-btn-delete');
        deleteBtn.style.order = '2';
        deleteBtn.style.flexShrink = '0';
        deleteBtn.style.margin = '0 auto';
    }

    if (primaryBtn) {
        primaryBtn.style.order = '3';
        primaryBtn.style.flexShrink = '0';
        primaryBtn.style.marginLeft = isEditModal ? '0' : 'auto';
        primaryBtn.style.whiteSpace = 'nowrap';
    }

    const container = cancelBtn?.parentElement;
    if (container) {
        container.style.display = 'flex';
        container.style.flexDirection = 'row';
        container.style.flexWrap = 'nowrap';
        container.style.width = '100%';
        container.style.justifyContent = 'space-between';
        container.style.alignItems = 'center';
        container.style.gap = '8px';
        container.style.boxSizing = 'border-box';
    }
}

window.openMasterEventModal = async function(eventId = null) {
    let eventObj = null;

    if (eventId) {
        try {
            const { data, error } = await supabase.from('events').select('*').eq('id', eventId).single();
            if (error) throw error;
            eventObj = data;
        } catch (error) {
            showSweetAlert('error', 'Data Error', 'Could not fetch event details.');
            return;
        }
    }

    const formHTML = `
        <form id="masterEventForm" novalidate class="master-event-form">
            <div>
                <label class="master-event-label">Event Name *</label>
                <input type="text" id="tplEventName" required placeholder="e.g., Grithpaan" class="master-event-input ${eventObj?.event_name ? 'master-event-input--valid' : 'master-event-input--invalid'}">
            </div>
            <div>
                <label class="master-event-label">Display Title *</label>
                <input type="text" id="tplDisplayTitle" required placeholder="e.g., Blessings & Beginnings" class="master-event-input ${eventObj?.display_title ? 'master-event-input--valid' : 'master-event-input--invalid'}">
            </div>
            <div>
                <label class="master-event-label">One Liner Quote *</label>
                <textarea id="tplOneLiner" rows="2" required placeholder="e.g., Golden ghee, elders blessings..." class="master-event-input ${eventObj?.one_liner ? 'master-event-input--valid' : 'master-event-input--invalid'}" style="resize: vertical;"></textarea>
            </div>
            <div>
                <label class="master-event-label">Description *</label>
                <textarea id="tplDescription" rows="4" required placeholder="An auspicious start to our wedding celebrations..." class="master-event-input ${eventObj?.description ? 'master-event-input--valid' : 'master-event-input--invalid'}" style="resize: vertical;"></textarea>
            </div>
        </form>
    `;

    const actions = [
        { label: "Cancel", variant: "ghost" },
        ...(eventObj ? [{
            label: "Delete",
            variant: "danger", 
            closesModal: false,
            onClick: async () => {
                const result = await Swal.fire({
                    title: 'Are you sure?', 
                    text: `Do you really want to permanently delete this event?`, 
                    icon: 'question', 
                    showCancelButton: true, 
                    confirmButtonColor: '#dc2626', 
                    cancelButtonColor: '#6b7280',
                    confirmButtonText: 'Yes, delete!'
                });

                if (result.isConfirmed) {
                    try {
                        const { error } = await supabase.from('events').delete().eq('id', eventObj.id);
                        if (error) throw error;
                        
                        modal.close();
                        broadcastMasterEventsUpdated();
                        showSweetAlert('success', 'Deleted!', 'Event has been removed.');
                    } catch (error) {
                        showSweetAlert('error', 'Database Error', error.message);
                    }
                }
            }
        }] : []),
        { 
            label: eventObj ? "Edit" : "Add", 
            variant: "primary", 
            closesModal: false,
            onClick: async () => {
                const requiredFields = [
                    { id: 'tplEventName', name: "Event Name" },
                    { id: 'tplDisplayTitle', name: "Display Title" },
                    { id: 'tplOneLiner', name: "One Liner Quote" },
                    { id: 'tplDescription', name: "Description" }
                ];

                let isValid = true;
                let firstEmpty = null;

                requiredFields.forEach(field => {
                    const el = document.getElementById(field.id);
                    if (!el.value.trim()) {
                        el.classList.add('master-event-input--invalid');
                        el.classList.remove('master-event-input--valid');
                        isValid = false;
                        if (!firstEmpty) firstEmpty = field.name;
                    } else {
                        el.classList.remove('master-event-input--invalid');
                        el.classList.add('master-event-input--valid');
                    }
                });

                if (!isValid) {
                    showSweetAlert('error', 'Missing Information', `Please fill out all mandatory fields. Missing: ${firstEmpty}`);
                    return;
                }

                const eventName = document.getElementById('tplEventName').value.trim();

                try {
                    const { data: existingEvents, error: checkError } = await supabase
                        .from('events')
                        .select('id')
                        .ilike('event_name', eventName);

                    if (checkError) throw checkError;

                    const duplicate = existingEvents.find(e => !eventObj || e.id !== eventObj.id);
                    if (duplicate) {
                        const el = document.getElementById('tplEventName');
                        el.classList.add('master-event-input--invalid');
                        el.classList.remove('master-event-input--valid');
                        showSweetAlert('warning', 'Duplicate Warning', 'An event with this name already exists.');
                        return;
                    }

                    const payload = { 
                        event_name: eventName, 
                        display_title: document.getElementById('tplDisplayTitle').value.trim(), 
                        one_liner: document.getElementById('tplOneLiner').value.trim(), 
                        description: document.getElementById('tplDescription').value.trim() 
                    };

                    if (eventObj) {
                        const { error } = await supabase.from('events').update(payload).eq('id', eventObj.id);
                        if (error) throw error;
                    } else {
                        const { error } = await supabase.from('events').insert([payload]);
                        if (error) throw error;
                    }

                    modal.close();
                    broadcastMasterEventsUpdated();
                    showSweetAlert('success', eventObj ? 'Updated!' : 'Added!', 'Event saved successfully.');
                } catch (error) {
                    showSweetAlert('error', 'Database Error', error.message);
                }
            }
        }
    ];

    const modal = openModal({ title: eventObj ? "Edit Event" : "Add New Event", content: formHTML, actions: actions });

    setTimeout(() => {
        layoutMasterModalFooter(!!eventObj);

        if (eventObj) {
            document.getElementById('tplEventName').value = eventObj.event_name || '';
            document.getElementById('tplDisplayTitle').value = eventObj.display_title || '';
            document.getElementById('tplOneLiner').value = eventObj.one_liner || '';
            document.getElementById('tplDescription').value = eventObj.description || '';
        }

        ['tplEventName', 'tplDisplayTitle', 'tplOneLiner', 'tplDescription'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                const updateValidationClass = () => {
                    if (el.value.trim() === '') {
                        el.classList.add('master-event-input--invalid');
                        el.classList.remove('master-event-input--valid');
                    } else {
                        el.classList.remove('master-event-input--invalid');
                        el.classList.add('master-event-input--valid');
                    }
                };

                updateValidationClass();
                el.addEventListener('input', updateValidationClass);
            }
        });
    }, 50);
};