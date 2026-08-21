import { supabase } from '../../database/js/api.js';
import { openModal } from '../../global/js/modal.js';
import { showSweetAlert } from '../../global/js/sweet-alert-message.js';

const INVITE_BASE_URL = "/#web-invites-preview";

function startOfDay(date) {
    const copy = new Date(date);
    copy.setHours(0, 0, 0, 0);
    return copy;
}

export function renderWebInvites() {
    if (typeof window.checkSessionOrShowAlert === 'function' && !window.checkSessionOrShowAlert()) {
        const wrapper = document.createElement('section');
        wrapper.className = "web-invites-auth-message";
        wrapper.textContent = "Please log in to manage web invites.";
        return wrapper;
    }
    
    const wrapper = document.createElement('section');
    wrapper.className = "web-invites-page-wrapper";

    const controls = document.createElement('div');
    controls.className = "web-invites-control-bar";

    const leftContainer = document.createElement('div');
    leftContainer.className = "web-invites-left-action";
    const createBtn = document.createElement("button");
    createBtn.id = "add-invite-btn";
    createBtn.className = "web-invites-add-btn";
    createBtn.innerHTML = `<i data-lucide="plus"></i> Web Invite`;
    createBtn.addEventListener('click', () => openInviteModal());
    leftContainer.appendChild(createBtn);

    const searchContainer = document.createElement('div');
    searchContainer.className = "web-invites-search-container";
    searchContainer.innerHTML = `
        <div class="web-invites-search-input-wrapper">
            <i data-lucide="search" class="web-invites-search-icon"></i>
            <input type="text" id="inviteSearchInput" placeholder="Search ..." class="web-invites-search-input">
        </div>
    `;

    controls.appendChild(leftContainer);
    controls.appendChild(searchContainer);
    wrapper.appendChild(controls);

    const sectionsContainer = document.createElement('div');
    sectionsContainer.id = "invites-galleries";
    wrapper.appendChild(sectionsContainer);

    loadInvitesData(sectionsContainer);

    const updateHandler = () => {
        if (document.body.contains(wrapper)) {
            loadInvitesData(sectionsContainer);
        } else {
            window.removeEventListener('invitesDataUpdated', updateHandler);
            window.removeEventListener('hashchange', hashChangeCleanup);
        }
    };

    const hashChangeCleanup = () => {
        const modalBackdrops = document.querySelectorAll('.modal-backdrop, .swal2-container');
        modalBackdrops.forEach(b => b.remove());
        window.removeEventListener('hashchange', hashChangeCleanup);
    };

    window.removeEventListener('invitesDataUpdated', updateHandler);
    window.addEventListener('invitesDataUpdated', updateHandler);
    window.addEventListener('hashchange', hashChangeCleanup);

    setTimeout(() => {
        document.getElementById('inviteSearchInput')?.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const filtered = (window.__invitesData || []).filter(inv => {
                const w = inv.weddings || {};
                return (w.bride_name || '').toLowerCase().includes(query) || 
                       (w.groom_name || '').toLowerCase().includes(query) ||
                       (w.hashtag || '').toLowerCase().includes(query);
            });
            renderInviteGalleries(sectionsContainer, filtered);
        });
        if (window.lucide) window.lucide.createIcons();
    }, 50);

    return wrapper;
}

async function loadInvitesData(container) {
    container.innerHTML = `<div class="web-invites-loading-state">Loading web invites...</div>`;
    
    try {
        const { data: invites, error } = await supabase
            .from('wedding_web_invite')
            .select(`
                *,
                weddings ( id, bride_name, groom_name, start_date, end_date, hashtag, primary_side )
            `);
            
        if (error) throw error;

        window.__invitesData = invites || [];
        renderInviteGalleries(container, window.__invitesData);
    } catch (err) {
        container.innerHTML = `<div class="web-invites-error-state">Failed to load invites: ${err.message}</div>`;
    }
}

function renderInviteGalleries(container, invites) {
    if (!invites || invites.length === 0) {
        container.innerHTML = `<div class="web-invites-empty-state">No web invitations found.</div>`;
        return;
    }

    const todayTime = startOfDay(new Date()).getTime();

    const inProgress = [];
    const upcoming = [];
    const archived = [];

    invites.forEach(inv => {
        const w = inv.weddings || {};
        const start = w.start_date ? startOfDay(new Date(w.start_date)).getTime() : todayTime;
        const end = w.end_date ? startOfDay(new Date(w.end_date)).getTime() : start;

        if (todayTime >= start && todayTime <= end) {
            inProgress.push(inv);
        } else if (todayTime < start) {
            upcoming.push(inv);
        } else {
            archived.push(inv);
        }
    });

    const sortByEarliest = (a, b) => {
        const dateA = new Date(a.weddings?.start_date || a.weddings?.end_date || 0);
        const dateB = new Date(b.weddings?.start_date || b.weddings?.end_date || 0);
        return dateA - dateB;
    };

    inProgress.sort(sortByEarliest);
    upcoming.sort(sortByEarliest);
    archived.sort(sortByEarliest);

    container.innerHTML = `
        <div class="web-invites-galleries-grid">
            ${buildGallerySection("In Progress", inProgress, false)}
            ${buildGallerySection("Upcoming", upcoming, false)}
            ${buildGallerySection("Archived", archived, true)}
        </div>
    `;

    container.querySelectorAll('.edit-invite-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const data = JSON.parse(btn.getAttribute('data-invite'));
            openInviteModal(data);
        });
    });

    if (window.lucide) window.lucide.createIcons();
}

function buildGallerySection(title, invites, isArchived) {
    if (!invites || invites.length === 0) return '';
    
    const themePalettes = {
        blue:   { bgDark: '#0f172a', accent: '#60a5fa' },
        green:  { bgDark: '#064e3b', accent: '#34d399' },
        maroon: { bgDark: '#4c0519', accent: '#fb7185' },
        gold:   { bgDark: '#451a03', accent: '#fbbf24' },
        peach:  { bgDark: '#4c0519', accent: '#fb7185' },
        violet: { bgDark: '#2e1065', accent: '#a78bfa' },
        purple: { bgDark: '#3b0764', accent: '#c084fc' },
        red:    { bgDark: '#450a0a', accent: '#f87171' },
        pink:   { bgDark: '#500724', accent: '#f472b6' }
    };

    const listItems = invites.map(inv => {
        const w = inv.weddings || {};
        const displayNames = w.primary_side === 'groom' 
            ? `${w.groom_name} & ${w.bride_name}` 
            : `${w.bride_name} & ${w.groom_name}`;
            
        const targetDate = w.end_date || w.start_date;
        const dateStr = targetDate ? new Date(targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Date TBD';
        
        const inviteUrl = `${INVITE_BASE_URL}?id=${w.id}`;
        const fullShareUrl = `${window.location.origin}${inviteUrl}`;
        const invJson = JSON.stringify(inv).replace(/'/g, "&apos;").replace(/"/g, "&quot;");
        const t = themePalettes[inv.theme] || themePalettes.blue;

        const editButtonHtml = isArchived ? '' : `
            <button class="edit-invite-btn web-invite-card__edit-btn" data-invite='${invJson}' title="Edit Invite" onmouseover="this.style.background='${t.accent}'; this.style.color='#000';" onmouseout="this.style.background='rgba(255,255,255,0.1)'; this.style.color='#fff';">
                <i data-lucide="edit-2" style="width: 14px; height: 14px;"></i>
            </button>
        `;

        return `
        <div class="web-invite-card" style="background: ${t.bgDark}; border-color: ${t.accent};">
            <div class="web-invite-card__header">
                ${editButtonHtml}
                <div class="web-invite-card__icon-wrap" style="background: ${t.accent};">
                    <i data-lucide="mail" style="color: ${t.bgDark};"></i>
                </div>
            </div>
            <div class="web-invite-card__body">
                <h3 class="web-invite-card__names">${displayNames}</h3>
                
                <p class="web-invite-card__meta">
                    <span class="web-invite-card__hashtag" style="color: ${t.accent};">${w.hashtag || ''}</span><br/>
                    <span class="web-invite-card__date">${dateStr}</span>
                </p>
                
                <div class="web-invite-card__actions">
                    <a href="${inviteUrl}" target="_blank" class="web-invite-card__view-btn" style="background: ${t.accent}; color: ${t.bgDark};">
                        View Invite
                    </a>
                    <button onclick="navigator.clipboard.writeText('${fullShareUrl}'); showSweetAlert('success', 'Copied!', 'Link copied to clipboard');" class="web-invite-card__copy-btn" title="Copy Link">
                        <i data-lucide="link"></i>
                    </button>
                </div>
            </div>
        </div>
        `;
    }).join('');

    return `
        <div class="web-invites-section">
            <h2 class="web-invites-section__heading">${title}</h2>
            <div class="web-invites-section__list">
                ${listItems}
            </div>
        </div>
    `;
}

function layoutInviteModalFooter(isEditModal = false) {
    const allBtns = Array.from(document.querySelectorAll('button'));
    const cancelBtn = allBtns.find(b => b.textContent.trim() === 'Cancel');
    const deleteBtn = allBtns.find(b => b.textContent.trim() === 'Delete');
    const primaryBtn = allBtns.find(b => ['Add', 'Edit', 'Create', 'Update'].includes(b.textContent.trim()));

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

async function openInviteModal(existingInvite = null) {
    let eligibleWeddings = [];
    
    if (!existingInvite) {
        const { data: allWeddings } = await supabase.from('weddings').select('id, bride_name, groom_name, start_date, end_date, hashtag, primary_side');
        const { data: existingIds } = await supabase.from('wedding_web_invite').select('wedding_id');
        const usedIds = (existingIds || []).map(e => e.wedding_id);
        eligibleWeddings = (allWeddings || []).filter(w => !usedIds.includes(w.id));
    }

    const optionsHtml = eligibleWeddings.map(w => {
        const targetDate = w.end_date || w.start_date;
        const formattedDate = targetDate ? new Date(targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Date TBD';
        const hashtagStr = w.hashtag ? ` (${w.hashtag})` : ''; 
        return `<option value="${w.id}" data-side="${w.primary_side}">${w.bride_name} & ${w.groom_name}${hashtagStr} - ${formattedDate}</option>`;
    }).join('');

    const weddingSelectionHTML = existingInvite 
        ? `<div>
            <label class="invite-modal-label">Wedding</label>
            <input type="text" value="${existingInvite.weddings?.bride_name || ''} & ${existingInvite.weddings?.groom_name || ''}" disabled class="invite-modal-input">
            <input type="hidden" id="inviteWeddingId" value="${existingInvite.wedding_id}">
           </div>`
        : `<div>
            <label class="invite-modal-label">Select Wedding *</label>
            <select id="inviteWeddingId" required class="invite-modal-input invite-modal-input--invalid">
                <option value="" disabled selected>-- Select a Wedding --</option>
                ${optionsHtml}
            </select>
           </div>`;

    const formHTML = `
        <form id="inviteForm" novalidate class="invite-modal-form">
            ${weddingSelectionHTML}
            
            <div class="invite-modal-heading">Bride's Family</div>
            <div class="invite-modal-grid-2">
                <div>
                    <label class="invite-modal-label">Grandfather *</label>
                    <input type="text" id="bGrandfather" required placeholder="e.g., Shri Jain" value="${existingInvite?.bride_grandfather || ''}" class="invite-modal-input ${existingInvite?.bride_grandfather ? 'invite-modal-input--valid' : 'invite-modal-input--invalid'}">
                </div>
                <div>
                    <label class="invite-modal-label">Grandmother *</label>
                    <input type="text" id="bGrandmother" required placeholder="e.g., Smt. Jain" value="${existingInvite?.bride_grandmother || ''}" class="invite-modal-input ${existingInvite?.bride_grandmother ? 'invite-modal-input--valid' : 'invite-modal-input--invalid'}">
                </div>
                <div>
                    <label class="invite-modal-label">Father *</label>
                    <input type="text" id="bFather" required placeholder="e.g., Rajesh" value="${existingInvite?.bride_father || ''}" class="invite-modal-input ${existingInvite?.bride_father ? 'invite-modal-input--valid' : 'invite-modal-input--invalid'}">
                </div>
                <div>
                    <label class="invite-modal-label">Mother *</label>
                    <input type="text" id="bMother" required placeholder="e.g., Sunita" value="${existingInvite?.bride_mother || ''}" class="invite-modal-input ${existingInvite?.bride_mother ? 'invite-modal-input--valid' : 'invite-modal-input--invalid'}">
                </div>
            </div>

            <div class="invite-modal-heading">Groom's Family</div>
            <div class="invite-modal-grid-2">
                <div>
                    <label class="invite-modal-label">Grandfather *</label>
                    <input type="text" id="gGrandfather" required placeholder="e.g., Shri Mutha" value="${existingInvite?.groom_grandfather || ''}" class="invite-modal-input ${existingInvite?.groom_grandfather ? 'invite-modal-input--valid' : 'invite-modal-input--invalid'}">
                </div>
                <div>
                    <label class="invite-modal-label">Grandmother *</label>
                    <input type="text" id="gGrandmother" required placeholder="e.g., Smt. Mutha" value="${existingInvite?.groom_grandmother || ''}" class="invite-modal-input ${existingInvite?.groom_grandmother ? 'invite-modal-input--valid' : 'invite-modal-input--invalid'}">
                </div>
                <div>
                    <label class="invite-modal-label">Father *</label>
                    <input type="text" id="gFather" required placeholder="e.g., Vijayji" value="${existingInvite?.groom_father || ''}" class="invite-modal-input ${existingInvite?.groom_father ? 'invite-modal-input--valid' : 'invite-modal-input--invalid'}">
                </div>
                <div>
                    <label class="invite-modal-label">Mother *</label>
                    <input type="text" id="gMother" required placeholder="e.g., Kavita" value="${existingInvite?.groom_mother || ''}" class="invite-modal-input ${existingInvite?.groom_mother ? 'invite-modal-input--valid' : 'invite-modal-input--invalid'}">
                </div>
            </div>

            <div>
                <label class="invite-modal-label">Story / About Us Quote *</label>
                <textarea id="storyText" required rows="3" placeholder="A short quote or story for the About Us page..." class="invite-modal-input ${existingInvite?.story_text ? 'invite-modal-input--valid' : 'invite-modal-input--invalid'}">${existingInvite ? existingInvite.story_text : ''}</textarea>
            </div>

            <div>
                <label class="invite-modal-label">Invite Theme Color *</label>
                <select id="inviteTheme" required class="invite-modal-input invite-modal-input--valid">
                    <option value="blue" ${existingInvite?.theme === 'blue' ? 'selected' : ''}>Sapphire Blue (Default)</option>
                    <option value="green" ${existingInvite?.theme === 'green' ? 'selected' : ''}>Emerald Green</option>
                    <option value="maroon" ${existingInvite?.theme === 'maroon' ? 'selected' : ''}>Burgundy Maroon</option>
                    <option value="gold" ${existingInvite?.theme === 'gold' ? 'selected' : ''}>Amber Gold</option>
                    <option value="peach" ${existingInvite?.theme === 'peach' ? 'selected' : ''}>Coral Peach</option>
                    <option value="violet" ${existingInvite?.theme === 'violet' ? 'selected' : ''}>Indigo Violet</option>
                    <option value="purple" ${existingInvite?.theme === 'purple' ? 'selected' : ''}>Amethyst Purple</option>
                    <option value="red" ${existingInvite?.theme === 'red' ? 'selected' : ''}>Ruby Red</option>
                    <option value="pink" ${existingInvite?.theme === 'pink' ? 'selected' : ''}>Magenta Pink</option>
                </select>
            </div>
        </form>
    `;

    const actions = [
        { label: "Cancel", variant: "ghost" },
        ...(existingInvite ? [{
            label: "Delete",
            variant: "danger", 
            closesModal: false,
            onClick: async () => {
                const result = await Swal.fire({
                    title: 'Delete Invite?',
                    text: `Are you sure you want to permanently delete this web invite?`,
                    icon: 'question', 
                    showCancelButton: true, 
                    confirmButtonColor: '#dc2626', 
                    cancelButtonColor: '#6b7280',
                    confirmButtonText: 'Yes, delete it!'
                });

                if (result.isConfirmed) {
                    try {
                        const { error } = await supabase.from('wedding_web_invite').delete().eq('id', existingInvite.id);
                        if (error) throw error;
                        modal.close();
                        window.dispatchEvent(new Event('invitesDataUpdated')); 
                        showSweetAlert('success', 'Deleted!', 'Invite removed.');
                    } catch (error) {
                        showSweetAlert('error', 'Database Error', error.message);
                    }
                }
            }
        }] : []),
        { 
            label: existingInvite ? "Edit" : "Add", 
            variant: "primary", 
            closesModal: false,
            onClick: async () => {
                const fieldsToValidate = [
                    { id: 'inviteWeddingId', name: 'Wedding Selection' },
                    { id: 'bGrandfather', name: "Bride's Grandfather" },
                    { id: 'bGrandmother', name: "Bride's Grandmother" },
                    { id: 'bFather', name: "Bride's Father" },
                    { id: 'bMother', name: "Bride's Mother" },
                    { id: 'gGrandfather', name: "Groom's Grandfather" },
                    { id: 'gGrandmother', name: "Groom's Grandmother" },
                    { id: 'gFather', name: "Groom's Father" },
                    { id: 'gMother', name: "Groom's Mother" },
                    { id: 'storyText', name: "Story / About Us Quote" },
                    { id: 'inviteTheme', name: "Invite Theme Color" }
                ];

                let firstError = null;

                fieldsToValidate.forEach(field => {
                    const el = document.getElementById(field.id);
                    if (!el) return;

                    let targetEl = el;
                    if (el.tagName === 'SELECT' && el.style.display === 'none') {
                        const wrapper = el.previousElementSibling;
                        if (wrapper && wrapper.tagName === 'DIV') {
                            targetEl = wrapper.querySelector('input') || targetEl;
                        }
                    }

                    if (!el.value.trim()) {
                        targetEl.classList.add('invite-modal-input--invalid');
                        targetEl.classList.remove('invite-modal-input--valid');
                        if (!firstError) firstError = field.name; 
                    } else {
                        targetEl.classList.remove('invite-modal-input--invalid');
                        targetEl.classList.add('invite-modal-input--valid');
                    }
                });

                if (firstError) {
                    showSweetAlert('error', 'Missing Information', `Please fill out all mandatory fields. Missing: ${firstError}`);
                    return;
                }

                const selectEl = document.getElementById('inviteWeddingId');
                let pSide = existingInvite ? existingInvite.primary_side : 'groom';
                if (!existingInvite) {
                    const selectedOpt = selectEl.options[selectEl.selectedIndex];
                    if (selectedOpt) {
                        pSide = selectedOpt.getAttribute('data-side') || 'groom';
                    }
                }

                const payload = {
                    wedding_id: selectEl.value,
                    primary_side: pSide,
                    bride_grandfather: document.getElementById('bGrandfather').value.trim(),
                    bride_grandmother: document.getElementById('bGrandmother').value.trim(),
                    bride_father: document.getElementById('bFather').value.trim(),
                    bride_mother: document.getElementById('bMother').value.trim(),
                    groom_grandfather: document.getElementById('gGrandfather').value.trim(),
                    groom_grandmother: document.getElementById('gGrandmother').value.trim(),
                    groom_father: document.getElementById('gFather').value.trim(),
                    groom_mother: document.getElementById('gMother').value.trim(),
                    story_text: document.getElementById('storyText').value.trim(),
                    theme: document.getElementById('inviteTheme').value
                };

                try {
                    if (existingInvite) {
                        const { error } = await supabase.from('wedding_web_invite').update(payload).eq('id', existingInvite.id);
                        if (error) throw error;
                    } else {
                        const { data: existingInv } = await supabase.from('wedding_web_invite').select('id').eq('wedding_id', selectEl.value);
                        if (existingInv && existingInv.length > 0) {
                            showSweetAlert('warning', 'Duplicate Warning', 'A web invite for this wedding already exists.');
                        }

                        const { error } = await supabase.from('wedding_web_invite').insert([payload]);
                        if (error) throw error;
                    }

                    modal.close();
                    window.dispatchEvent(new Event('invitesDataUpdated')); 
                    showSweetAlert('success', 'Success', `Web Invite ${existingInvite ? 'updated' : 'created'} successfully!`);
                } catch (error) {
                    showSweetAlert('error', 'Database Error', error.message);
                }
            }
        }
    ];

    const modal = openModal({
        title: existingInvite ? `Edit Web Invite` : `Add Web Invite`,
        content: formHTML,
        actions: actions
    });

    setTimeout(() => {
        layoutInviteModalFooter(!!existingInvite);

        ['bGrandfather', 'bGrandmother', 'bFather', 'bMother', 'gGrandfather', 'gGrandmother', 'gFather', 'gMother', 'storyText', 'inviteTheme'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                const updateVal = (e) => {
                    if (e.target.value.trim()) {
                        e.target.classList.remove('invite-modal-input--invalid');
                        e.target.classList.add('invite-modal-input--valid');
                    } else {
                        e.target.classList.remove('invite-modal-input--valid');
                        e.target.classList.add('invite-modal-input--invalid');
                    }
                };
                el.addEventListener('input', updateVal);
                el.addEventListener('change', updateVal);
            }
        });

        if (!existingInvite) {
            convertToSearchableDropdown('inviteWeddingId');
            const selectEl = document.getElementById('inviteWeddingId');
            if (selectEl) {
                selectEl.addEventListener('change', (e) => {
                    const wrapper = selectEl.previousElementSibling;
                    if (wrapper && wrapper.tagName === 'DIV') {
                        const input = wrapper.querySelector('input');
                        if (input) {
                            if (e.target.value) {
                                input.classList.remove('invite-modal-input--invalid');
                                input.classList.add('invite-modal-input--valid');
                            } else {
                                input.classList.remove('invite-modal-input--valid');
                                input.classList.add('invite-modal-input--invalid');
                            }
                        }
                    }
                });
            }
        }
    }, 50);
}

function convertToSearchableDropdown(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    select.style.display = 'none';
    
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'position: relative; width: 100%; text-align: left;';
    select.parentNode.insertBefore(wrapper, select);
    
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Search ...';
    input.className = 'invite-modal-input invite-modal-input--invalid';
    wrapper.appendChild(input);
    
    const list = document.createElement('div');
    list.style.cssText = 'position: absolute; top: 100%; left: 0; right: 0; max-height: 150px; overflow-y: auto; background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-sm); z-index: 9999; display: none; box-shadow: 0 4px 6px rgba(0,0,0,0.3); margin-top: 4px;';
    wrapper.appendChild(list);
    
    const options = Array.from(select.options);
    
    function renderList(filter = '') {
        list.innerHTML = '';
        const filtered = options.filter(opt => opt.text.toLowerCase().includes(filter.toLowerCase()) && opt.value !== "");
        if (filtered.length === 0) {
            const noRes = document.createElement('div');
            noRes.style.cssText = 'padding: 10px; color: var(--color-text-muted); font-size: 0.9rem; text-align: center;';
            noRes.textContent = 'No results found';
            list.appendChild(noRes);
            return;
        }
        filtered.forEach(opt => {
            const item = document.createElement('div');
            item.style.cssText = 'padding: 10px; cursor: pointer; border-bottom: 1px solid var(--color-border); font-size: 0.9rem; color: var(--color-text-primary); transition: background 0.2s;';
            item.textContent = opt.text;
            item.addEventListener('mouseover', () => item.style.background = 'var(--color-border)');
            item.addEventListener('mouseout', () => item.style.background = 'transparent');
            item.addEventListener('click', () => {
                select.value = opt.value; 
                input.value = opt.text; 
                input.classList.remove('invite-modal-input--invalid');
                input.classList.add('invite-modal-input--valid');
                list.style.display = 'none'; 
                
                select.dispatchEvent(new Event('change')); 
            });
            list.appendChild(item);
        });
    }
    
    input.addEventListener('focus', () => { 
        input.value = ''; 
        renderList(''); 
        list.style.display = 'block'; 
    });
    
    input.addEventListener('input', (e) => { 
        renderList(e.target.value); 
        list.style.display = 'block'; 
    });
    
    document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) {
            list.style.display = 'none';
            
            const selectedOpt = options.find(o => o.value === select.value);
            if (selectedOpt && select.value !== "") {
                input.value = selectedOpt.text;
                input.classList.remove('invite-modal-input--invalid');
                input.classList.add('invite-modal-input--valid');
            } else {
                input.value = '';
                input.classList.remove('invite-modal-input--valid');
                input.classList.add('invite-modal-input--invalid');
            }
        }
    });

    const initialOpt = options.find(o => o.value === select.value);
    if (initialOpt && select.value !== "") {
        input.value = initialOpt.text;
        input.classList.remove('invite-modal-input--invalid');
        input.classList.add('invite-modal-input--valid');
    }
}