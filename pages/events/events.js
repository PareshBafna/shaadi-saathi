import { supabase } from '../../database/js/api.js';
import { openModal } from '../../global/js/modal.js';
import { showAlert } from '../../global/js/alerts.js';

let currentPage = 1;
const itemsPerPage = 10;
let searchQuery = '';
let allEventsData = [];

export function renderEvents() {
    const section = document.createElement("div");
    section.style.cssText = "background: var(--color-white); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-5); margin-bottom: var(--space-6);";

    const controlsRow = document.createElement("div");
    controlsRow.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-5); border-bottom: 1px solid var(--color-border); padding-bottom: var(--space-4); flex-wrap: wrap; gap: 12px;";

    controlsRow.innerHTML = `
        <div style="flex: 1 1 0; display: flex; gap: 8px; min-width: 200px;"></div>
        <div style="flex: 1 1 0; display: flex; justify-content: center; min-width: 150px;">
            <button id="add-master-event-btn" style="background: var(--color-primary); color: var(--color-text-on-accent); border: none; padding: 0.5rem 1.5rem; border-radius: var(--radius-sm); font-weight: var(--font-weight-semibold); cursor: pointer; font-size: var(--font-size-sm); display: flex; align-items: center; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
                <i data-lucide="plus" style="width:16px; height:16px; margin-right:4px;"></i> Event
            </button>
        </div>
        <div style="flex: 1 1 0; display: flex; justify-content: flex-end; min-width: 200px;">
            <div style="position: relative; display: flex; align-items: center; width: 100%; max-width: 300px;">
                <i data-lucide="search" style="position: absolute; left: 10px; width: 16px; height: 16px; color: var(--color-text-muted);"></i>
                <input type="text" id="eventSearchInput" placeholder="Search events..." style="width: 100%; padding: 0.5rem 0.5rem 0.5rem 32px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); font-size: var(--font-size-sm); background: var(--color-bg); color: var(--color-text-primary); outline: none; transition: border-color 0.2s;">
            </div>
        </div>
    `;
    section.appendChild(controlsRow);

    const content = document.createElement("div");
    content.id = "master-events-content";
    section.appendChild(content);

    setTimeout(() => {
        document.getElementById('add-master-event-btn').addEventListener('click', () => openMasterEventModal());
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

// Global modal query by ID and safe injection
window.openMasterEventModal = async function(eventId = null) {
    let eventObj = null;

    if (eventId) {
        try {
            const { data, error } = await supabase.from('events').select('*').eq('id', eventId).single();
            if (error) throw error;
            eventObj = data;
        } catch (error) {
            showAlert({ icon: 'error', title: 'Data Error', text: 'Could not fetch event details.' });
            return;
        }
    }

    const formHTML = `
        <form id="masterEventForm" novalidate style="display:flex; flex-direction:column; gap:var(--space-3);">
            <div>
                <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:4px;">Event Name *</label>
                <input type="text" id="tplEventName" required placeholder="e.g., Grithpaan" style="width:100%; background:var(--color-bg); border:1px solid var(--color-border); color:var(--color-text-primary); padding:var(--space-2); border-radius:var(--radius-sm); outline:none;">
            </div>
            <div>
                <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:4px;">Display Title</label>
                <input type="text" id="tplDisplayTitle" placeholder="e.g., Blessings & Beginnings" style="width:100%; background:var(--color-bg); border:1px solid var(--color-border); color:var(--color-text-primary); padding:var(--space-2); border-radius:var(--radius-sm); outline:none;">
            </div>
            <div>
                <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:4px;">One Liner Quote</label>
                <input type="text" id="tplOneLiner" placeholder="e.g., Golden ghee, elders blessings..." style="width:100%; background:var(--color-bg); border:1px solid var(--color-border); color:var(--color-text-primary); padding:var(--space-2); border-radius:var(--radius-sm); outline:none;">
            </div>
            <div>
                <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:4px;">Description</label>
                <textarea id="tplDescription" rows="4" placeholder="An auspicious start to our wedding celebrations..." style="width:100%; background:var(--color-bg); border:1px solid var(--color-border); color:var(--color-text-primary); padding:var(--space-2); border-radius:var(--radius-sm); outline:none; resize: vertical;"></textarea>
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
                const nameInput = document.getElementById('tplEventName');
                const eventName = nameInput.value.trim();

                nameInput.style.borderColor = 'var(--color-border)';

                if (!eventName) {
                    nameInput.style.borderColor = 'red';
                    showAlert({ icon: 'warning', title: 'Missing Information', text: 'Please enter the Event Name.' });
                    return;
                }

                const payload = { 
                    event_name: eventName,
                    display_title: document.getElementById('tplDisplayTitle').value.trim(),
                    one_liner: document.getElementById('tplOneLiner').value.trim(),
                    description: document.getElementById('tplDescription').value.trim()
                };

                try {
                    if (eventObj) {
                        const { error } = await supabase.from('events').update(payload).eq('id', eventObj.id);
                        if (error) throw error;
                    } else {
                        const { error } = await supabase.from('events').insert([payload]);
                        if (error) throw error;
                    }

                    modal.close();
                    window.dispatchEvent(new Event('masterEventsUpdated')); 
                    showAlert({ icon: 'success', title: eventObj ? 'Updated!' : 'Added!', text: `Event saved successfully.`, timer: 2000 });
                } catch (error) {
                    showAlert({ icon: 'error', title: 'Database Error', text: error.message });
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
                    title: 'Are you sure?', text: `Do you really want to permanently delete this event?`, icon: 'warning', 
                    showCancelButton: true, confirmButtonColor: '#dc2626', confirmButtonText: 'Yes, delete!'
                });

                if (result.isConfirmed) {
                    try {
                        const { error } = await supabase.from('events').delete().eq('id', eventObj.id);
                        if (error) throw error;
                        
                        modal.close();
                        window.dispatchEvent(new Event('masterEventsUpdated')); 
                        showAlert({ icon: 'success', title: 'Deleted!', text: `Event has been removed.`, timer: 2000 });
                    } catch (error) {
                        showAlert({ icon: 'error', title: 'Database Error', text: error.message });
                    }
                }
            }
        });
    }

    const modal = openModal({ title: eventObj ? "Edit Event" : "Add New Event", content: formHTML, actions: actions });

    setTimeout(() => {
        // Safely inject values after DOM creation to avoid special character crashes
        if (eventObj) {
            document.getElementById('tplEventName').value = eventObj.event_name || '';
            document.getElementById('tplDisplayTitle').value = eventObj.display_title || '';
            document.getElementById('tplOneLiner').value = eventObj.one_liner || '';
            document.getElementById('tplDescription').value = eventObj.description || '';
        }

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