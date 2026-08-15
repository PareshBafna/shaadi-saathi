import { supabase } from '../../database/js/api.js';
import { openModal } from '../../global/js/modal.js';
import { showAlert } from '../../global/js/alerts.js';

let currentPage = 1;
const itemsPerPage = 10;
let searchQuery = '';
let allEventsData = [];

export function renderEvents() {
    if (typeof window.checkSessionOrShowAlert === 'function' && !window.checkSessionOrShowAlert()) {
        const errSec = document.createElement("section");
        errSec.style.cssText = "width: 100%; text-align: center; padding: var(--space-8); color: var(--color-text-secondary);";
        errSec.textContent = "Please log in to manage events.";
        return errSec;
    }

    const section = document.createElement("section");
    section.className = "weddings-page-wrapper"; 
    section.style.cssText = "width: 100%; box-sizing: border-box;";

    const controls = document.createElement('div');
    controls.className = "weddings-control-bar";
    controls.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-6); background: var(--color-white); padding: var(--space-4); border-radius: var(--radius-lg); border: 1px solid var(--color-border); flex-wrap: wrap; gap: 16px;";

    const sortContainer = document.createElement('div');
    sortContainer.innerHTML = `<div style="width: 150px;"></div>`;

    const centerContainer = document.createElement('div');
    const createBtn = document.createElement("button");
    createBtn.id = "add-master-event-btn";
    createBtn.innerHTML = `<i data-lucide="plus" style="width:16px; height:16px; margin-right:4px; vertical-align:middle;"></i> Event`;
    createBtn.style.cssText = "background: var(--color-primary); color: var(--color-text-on-accent); border: none; padding: 0.5rem 1.25rem; border-radius: var(--radius-sm); font-weight: var(--font-weight-semibold); cursor: pointer; font-size: var(--font-size-sm); display: flex; align-items: center; transition: opacity 0.2s;";
    createBtn.addEventListener('click', () => openMasterEventModal());
    centerContainer.appendChild(createBtn);

    const searchContainer = document.createElement('div');
    searchContainer.style.cssText = "width: 250px; display: flex; justify-content: flex-end;";
    searchContainer.innerHTML = `
        <div style="position: relative; width: 100%;">
            <i data-lucide="search" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); width: 16px; height: 16px; color: var(--color-text-secondary);"></i>
            <input type="text" id="eventSearchInput" placeholder="Search events..." style="background: var(--color-bg); border: 1px solid var(--color-border); color: var(--color-text-primary); padding: var(--space-2) var(--space-3) var(--space-2) 32px; border-radius: var(--radius-sm); font-size: var(--font-size-sm); width: 100%; outline: none;">
        </div>
    `;

    controls.appendChild(sortContainer);
    controls.appendChild(centerContainer);
    controls.appendChild(searchContainer);
    section.appendChild(controls);

    const cardContainer = document.createElement("div");
    cardContainer.style.cssText = "background: var(--color-white); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-5);";

    const content = document.createElement("div");
    content.id = "master-events-content";
    cardContainer.appendChild(content);
    section.appendChild(cardContainer);

    setTimeout(() => {
        const searchInput = document.getElementById('eventSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                searchQuery = e.target.value;
                currentPage = 1;
                renderEventsList();
            });
        }
        loadEventsData();
    }, 0);

    const updateHandler = () => {
        if (document.body.contains(section)) loadEventsData();
        else window.removeEventListener('masterEventsUpdated', updateHandler);
    };
    window.addEventListener('masterEventsUpdated', updateHandler);

    return section;
}

async function loadEventsData() {
    const content = document.getElementById("master-events-content");
    if (!content) return;
    content.innerHTML = `<div style="text-align: center; padding: var(--space-8); color: var(--color-text-secondary);">Loading events...</div>`;

    try {
        const { data: events, error } = await supabase.from('events').select('*');
        if (error) throw error;

        allEventsData = events || [];
        renderEventsList();
    } catch (error) {
        content.innerHTML = `<div style="color: var(--color-danger); padding: var(--space-5); text-align: center;">Error loading events: ${error.message}</div>`;
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
        content.innerHTML = `<div style="text-align: center; padding: var(--space-6); color: var(--color-text-muted); border: 1px dashed var(--color-border); border-radius: var(--radius-sm);">No events match your search.</div>`;
        if (window.lucide) window.lucide.createIcons();
        return;
    }

    const gridTemplate = "32px 50px 1.5fr 1.5fr 2fr 3fr";
    const textClampStyle = "display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis; white-space: normal; line-height: 1.4;";

    let listHTML = `
        <div style="display: grid; grid-template-columns: ${gridTemplate}; align-items: center; padding: 0 var(--space-4) var(--space-2) var(--space-4); border-bottom: 1px solid var(--color-border); margin-bottom: var(--space-2); color: var(--color-text-secondary); font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold); gap: 12px;">
            <div></div>
            <div>S.No</div>
            <div>Event Name</div>
            <div>Display Title</div>
            <div>One Liner</div>
            <div>Description</div>
        </div>
    `;

    paginatedEvents.forEach((ev, index) => {
        const globalIndex = startIndex + index + 1;
        
        listHTML += `
        <div style="border: 1px solid var(--color-border); border-radius: var(--radius-sm); margin-bottom: var(--space-2); background: var(--color-bg); overflow: hidden;">
            <div style="display: grid; grid-template-columns: ${gridTemplate}; align-items: center; padding: var(--space-3) var(--space-4); transition: background 0.2s ease; gap: 12px;" onmouseover="this.style.background='var(--color-border)';" onmouseout="this.style.background='transparent';">
                
                <button class="edit-master-event-btn" data-id="${ev.id}" style="background: none; border: none; cursor: pointer; color: var(--color-text-muted); padding: 4px; display: flex; align-items: center; justify-content: center;" onmouseover="this.style.color='var(--color-primary)'" onmouseout="this.style.color='var(--color-text-muted)'" title="Edit">
                    <i data-lucide="edit-2" style="width: 16px; height: 16px;"></i>
                </button>
                
                <div style="color: var(--color-text-secondary); font-size: var(--font-size-sm); font-weight: var(--font-weight-medium);">${globalIndex}</div>
                
                <div style="color: var(--color-text-primary); font-size: 0.95rem; font-weight: var(--font-weight-bold); ${textClampStyle}">
                    ${ev.event_name || '-'}
                </div>

                <div style="color: var(--color-text-secondary); font-size: var(--font-size-sm); ${textClampStyle}">
                    ${ev.display_title || '-'}
                </div>

                <div style="color: var(--color-text-secondary); font-size: var(--font-size-sm); font-style: italic; ${textClampStyle}">
                    "${ev.one_liner || '-'}"
                </div>

                <div style="color: var(--color-text-secondary); font-size: var(--font-size-sm); ${textClampStyle}">
                    ${ev.description || '-'}
                </div>
            </div>
        </div>`;
    });

    listHTML += `
        <div style="display: flex; justify-content: space-between; align-items: center; padding-top: var(--space-4); margin-top: var(--space-4); border-top: 1px solid var(--color-border);">
            <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">
                Showing ${startIndex + 1} to ${Math.min(startIndex + itemsPerPage, filteredEvents.length)} of ${filteredEvents.length} events
            </div>
    `;

    if (totalPages > 1) {
        listHTML += `
            <div style="display: flex; gap: 8px; align-items: center;">
                <button class="pagination-btn" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''} style="background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-sm); padding: 4px 8px; cursor: ${currentPage === 1 ? 'not-allowed' : 'pointer'}; opacity: ${currentPage === 1 ? '0.5' : '1'}; color: var(--color-text-primary); display: flex; align-items: center;"><i data-lucide="chevron-left" style="width: 16px; height: 16px;"></i></button>
                <span style="font-size: var(--font-size-sm); color: var(--color-text-primary); font-weight: var(--font-weight-medium); padding: 0 8px;">Page ${currentPage} of ${totalPages}</span>
                <button class="pagination-btn" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''} style="background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-sm); padding: 4px 8px; cursor: ${currentPage === totalPages ? 'not-allowed' : 'pointer'}; opacity: ${currentPage === totalPages ? '0.5' : '1'}; color: var(--color-text-primary); display: flex; align-items: center;"><i data-lucide="chevron-right" style="width: 16px; height: 16px;"></i></button>
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

window.openMasterEventModal = async function(eventId = null) {
    let eventObj = null;

    if (eventId) {
        try {
            const { data, error } = await supabase.from('events').select('*').eq('id', eventId).single();
            if (error) throw error;
            eventObj = data;
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Data Error', text: 'Could not fetch event details.' });
            return;
        }
    }

    const formHTML = `
        <form id="masterEventForm" novalidate style="display:flex; flex-direction:column; gap:var(--space-3);">
            <div>
                <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:4px;">Event Name *</label>
                <input type="text" id="tplEventName" required placeholder="e.g., Grithpaan" style="width:100%; background:var(--color-bg); border:1px solid ${eventObj?.event_name ? '#16a34a' : '#dc2626'}; color:var(--color-text-primary); padding:var(--space-2); border-radius:var(--radius-sm); outline:none; transition: border-color 0.2s;">
            </div>
            <div>
                <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:4px;">Display Title *</label>
                <input type="text" id="tplDisplayTitle" required placeholder="e.g., Blessings & Beginnings" style="width:100%; background:var(--color-bg); border:1px solid ${eventObj?.display_title ? '#16a34a' : '#dc2626'}; color:var(--color-text-primary); padding:var(--space-2); border-radius:var(--radius-sm); outline:none; transition: border-color 0.2s;">
            </div>
            <div>
                <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:4px;">One Liner Quote *</label>
                <input type="text" id="tplOneLiner" required placeholder="e.g., Golden ghee, elders blessings..." style="width:100%; background:var(--color-bg); border:1px solid ${eventObj?.one_liner ? '#16a34a' : '#dc2626'}; color:var(--color-text-primary); padding:var(--space-2); border-radius:var(--radius-sm); outline:none; transition: border-color 0.2s;">
            </div>
            <div>
                <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:4px;">Description *</label>
                <textarea id="tplDescription" rows="4" required placeholder="An auspicious start to our wedding celebrations..." style="width:100%; background:var(--color-bg); border:1px solid ${eventObj?.description ? '#16a34a' : '#dc2626'}; color:var(--color-text-primary); padding:var(--space-2); border-radius:var(--radius-sm); outline:none; transition: border-color 0.2s; resize: vertical;"></textarea>
            </div>
        </form>
    `;

    const actions = [
        { label: "Cancel", variant: "ghost" },
        { 
            label: eventObj ? "Update" : "Add", 
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
                        el.style.borderColor = '#dc2626';
                        isValid = false;
                        if (!firstEmpty) firstEmpty = field.name;
                    } else {
                        el.style.borderColor = '#16a34a';
                    }
                });

                if (!isValid) {
                    Swal.fire({ icon: 'error', title: 'Missing Information', text: `Please fill out all mandatory fields. Missing: ${firstEmpty}` });
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
                        document.getElementById('tplEventName').style.borderColor = '#dc2626';
                        Swal.fire({ icon: 'question', title: 'Duplicate Warning', text: 'An event with this name already exists.' });
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
                    window.dispatchEvent(new Event('masterEventsUpdated')); 
                    Swal.fire({ icon: 'success', title: eventObj ? 'Updated!' : 'Added!', text: `Event saved successfully.`, timer: 2000 });
                } catch (error) {
                    Swal.fire({ icon: 'error', title: 'Database Error', text: error.message });
                }
            }
        }
    ];

    if (eventObj) {
        actions.unshift({
            label: "Delete",
            variant: "danger", 
            closesModal: false,
            onClick: async () => {
                const result = await Swal.fire({
                    title: 'Are you sure?', text: `Do you really want to permanently delete this event?`, icon: 'question', 
                    showCancelButton: true, confirmButtonColor: '#dc2626', confirmButtonText: 'Yes, delete!'
                });

                if (result.isConfirmed) {
                    try {
                        const { error } = await supabase.from('events').delete().eq('id', eventObj.id);
                        if (error) throw error;
                        
                        modal.close();
                        window.dispatchEvent(new Event('masterEventsUpdated')); 
                        Swal.fire({ icon: 'success', title: 'Deleted!', text: `Event has been removed.`, timer: 2000 });
                    } catch (error) {
                        Swal.fire({ icon: 'error', title: 'Database Error', text: error.message });
                    }
                }
            }
        });
    }

    const modal = openModal({ title: eventObj ? "Edit Event" : "Add New Event", content: formHTML, actions: actions });

    setTimeout(() => {
        if (eventObj) {
            document.getElementById('tplEventName').value = eventObj.event_name || '';
            document.getElementById('tplDisplayTitle').value = eventObj.display_title || '';
            document.getElementById('tplOneLiner').value = eventObj.one_liner || '';
            document.getElementById('tplDescription').value = eventObj.description || '';
        }

        ['tplEventName', 'tplDisplayTitle', 'tplOneLiner', 'tplDescription'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.style.borderColor = el.value.trim() === '' ? '#dc2626' : '#16a34a';
                el.addEventListener('input', () => {
                    el.style.borderColor = el.value.trim() === '' ? '#dc2626' : '#16a34a';
                });
            }
        });

        const btns = Array.from(document.querySelectorAll('button'));
        btns.forEach(btn => {
            const txt = btn.textContent.trim();
            if (txt === 'Cancel' && !btn.hasAttribute('data-styled')) {
                btn.style.cssText = 'background: #6b7280; color: #ffffff; border: 1px solid #6b7280; padding: 0.5rem 1.25rem; border-radius: var(--radius-sm); font-weight: var(--font-weight-medium); cursor: pointer; transition: opacity 0.2s;';
                btn.setAttribute('data-styled', 'true');
            } else if (txt === 'Delete' && !btn.hasAttribute('data-styled')) {
                btn.style.cssText = 'background: #dc2626; color: #ffffff; border: 1px solid #dc2626; padding: 0.5rem 1.25rem; border-radius: var(--radius-sm); font-weight: var(--font-weight-semibold); cursor: pointer; transition: opacity 0.2s; margin-right: auto;';
                if (btn.parentElement) { btn.parentElement.style.display = 'flex'; btn.parentElement.style.width = '100%'; }
                btn.setAttribute('data-styled', 'true');
            }
        });
    }, 50);
};