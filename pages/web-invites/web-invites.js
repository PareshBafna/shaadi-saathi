import { supabase } from '../../database/js/api.js';
import { openModal } from '../../global/js/modal.js';
import { showSweetAlert } from '../../global/js/sweet-alert-message.js';

const INVITE_BASE_URL = "/invite.html"; 

function startOfDay(date) {
    const copy = new Date(date);
    copy.setHours(0, 0, 0, 0);
    return copy;
}

export function renderWebInvites() {
    if (typeof window.checkSessionOrShowAlert === 'function' && !window.checkSessionOrShowAlert()) {
        const wrapper = document.createElement('section');
        wrapper.style.cssText = "width: 100%; text-align: center; padding: var(--space-8); color: var(--color-text-secondary);";
        wrapper.textContent = "Please log in to manage web invites.";
        return wrapper;
    }
    
    const wrapper = document.createElement('section');
    wrapper.className = "weddings-page-wrapper"; 
    wrapper.style.cssText = "width: 100%; box-sizing: border-box;";

    const controls = document.createElement('div');
    controls.className = "weddings-control-bar";
    controls.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-6); background: var(--color-white); padding: var(--space-4); border-radius: var(--radius-lg); border: 1px solid var(--color-border); flex-wrap: wrap; gap: 16px;";

    const sortContainer = document.createElement('div');
    sortContainer.innerHTML = `<div style="width: 150px;"></div>`;

    const centerContainer = document.createElement('div');
    const createBtn = document.createElement("button");
    createBtn.id = "add-invite-btn";
    createBtn.innerHTML = `<i data-lucide="plus" style="width:16px; height:16px; margin-right:4px; vertical-align:middle;"></i> Web Invite`;
    createBtn.style.cssText = "background: var(--color-primary); color: var(--color-text-on-accent); border: none; padding: 0.5rem 1.25rem; border-radius: var(--radius-sm); font-weight: var(--font-weight-semibold); cursor: pointer; font-size: var(--font-size-sm); display: flex; align-items: center; transition: opacity 0.2s;";
    createBtn.addEventListener('click', () => openInviteModal());
    centerContainer.appendChild(createBtn);

    const searchContainer = document.createElement('div');
    searchContainer.style.cssText = "width: 250px; display: flex; justify-content: flex-end;";
    searchContainer.innerHTML = `
        <div style="position: relative; width: 100%;">
            <i data-lucide="search" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); width: 16px; height: 16px; color: var(--color-text-secondary);"></i>
            <input type="text" id="inviteSearchInput" placeholder="Search web invites..." style="background: var(--color-bg); border: 1px solid var(--color-border); color: var(--color-text-primary); padding: var(--space-2) var(--space-3) var(--space-2) 32px; border-radius: var(--radius-sm); font-size: var(--font-size-sm); width: 100%; outline: none;">
        </div>
    `;

    controls.appendChild(sortContainer);
    controls.appendChild(centerContainer);
    controls.appendChild(searchContainer);
    wrapper.appendChild(controls);

    const sectionsContainer = document.createElement('div');
    sectionsContainer.id = "invites-galleries";
    wrapper.appendChild(sectionsContainer);

    loadInvitesData(sectionsContainer);

    window.addEventListener('invitesDataUpdated', () => {
        if (document.getElementById('invites-galleries')) {
            loadInvitesData(document.getElementById('invites-galleries'));
        }
    });

    setTimeout(() => {
        document.getElementById('inviteSearchInput')?.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const filtered = window.__invitesData.filter(inv => {
                const w = inv.weddings;
                return (w.bride_name || '').toLowerCase().includes(query) || 
                       (w.groom_name || '').toLowerCase().includes(query) ||
                       (w.hashtag || '').toLowerCase().includes(query);
            });
            renderInviteGalleries(sectionsContainer, filtered);
        });
        if (window.lucide) window.lucide.createIcons();
    }, 0);

    return wrapper;
}

async function loadInvitesData(container) {
    container.innerHTML = `<div style="text-align: center; padding: var(--space-8); color: var(--color-text-secondary);">Loading web invites...</div>`;
    
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
        container.innerHTML = `<div style="color: var(--color-danger); text-align: center; padding: var(--space-8);">Failed to load invites: ${err.message}</div>`;
    }
}

function renderInviteGalleries(container, invites) {
    if (invites.length === 0) {
        container.innerHTML = `<div style="text-align: center; padding: var(--space-8); color: var(--color-text-muted); background: var(--color-white); border-radius: var(--radius-lg); border: 1px solid var(--color-border);">No web invitations found.</div>`;
        return;
    }

    const todayTime = startOfDay(new Date()).getTime();

    const inProgress = [];
    const upcoming = [];
    const archived = [];

    invites.forEach(inv => {
        const w = inv.weddings;
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
        const dateA = new Date(a.weddings.start_date || a.weddings.end_date || 0);
        const dateB = new Date(b.weddings.start_date || b.weddings.end_date || 0);
        return dateA - dateB;
    };

    inProgress.sort(sortByEarliest);
    upcoming.sort(sortByEarliest);
    archived.sort(sortByEarliest);

    container.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: var(--space-6); width: 100%; align-items: start;">
            ${buildGallerySection("In Progress", inProgress, false)}
            ${buildGallerySection("Upcoming", upcoming, false)}
            ${buildGallerySection("Archived", archived, true)}
        </div>
    `;

    container.querySelectorAll('.edit-invite-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
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
        const w = inv.weddings;
        const displayNames = w.primary_side === 'groom' 
            ? `${w.groom_name} & ${w.bride_name}` 
            : `${w.bride_name} & ${w.groom_name}`;
            
        const targetDate = w.end_date || w.start_date;
        const dateStr = targetDate ? new Date(targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Date TBD';
        
        const inviteUrl = `/invite.html?id=${w.id}`;
        const invJson = JSON.stringify(inv).replace(/'/g, "&apos;").replace(/"/g, "&quot;");
        const t = themePalettes[inv.theme] || themePalettes.blue;

        const editButtonHtml = isArchived ? '' : `
            <button class="edit-invite-btn" data-invite='${invJson}' style="position: absolute; top: 12px; right: 12px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #fff; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='${t.accent}'; this.style.color='#000';" onmouseout="this.style.background='rgba(255,255,255,0.1)'; this.style.color='#fff';" title="Edit Invite">
                <i data-lucide="edit-2" style="width: 14px; height: 14px;"></i>
            </button>
        `;

        return `
        <div style="background: ${t.bgDark}; border: 1px solid ${t.accent}; border-radius: var(--radius-lg); overflow: hidden; display: flex; flex-direction: column; transition: transform 0.2s, box-shadow 0.2s; box-shadow: 0 4px 15px rgba(0,0,0,0.2);" onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 10px 20px rgba(0,0,0,0.4)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(0,0,0,0.2)';">
            <div style="background: rgba(0,0,0,0.2); padding: var(--space-6); text-align: center; position: relative; border-bottom: 1px solid rgba(255,255,255,0.1);">
                ${editButtonHtml}
                <div style="width: 60px; height: 60px; background: ${t.accent}; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">
                    <i data-lucide="mail" style="width: 28px; height: 28px; color: ${t.bgDark};"></i>
                </div>
            </div>
            <div style="padding: var(--space-5); display: flex; flex-direction: column; flex-grow: 1;">
                <h3 style="margin: 0 0 12px 0; font-size: 1.15rem; color: #ffffff; text-align: center;">${displayNames}</h3>
                
                <p style="margin: 0 0 16px 0; font-size: 0.85rem; color: #cbd5e1; text-align: center; font-weight: var(--font-weight-medium);">
                    <span style="color: ${t.accent}; font-weight: bold; font-size: 1rem; letter-spacing: 0.05em;">${w.hashtag || ''}</span><br/>
                    <span style="display:inline-block; margin-top: 6px;">${dateStr}</span>
                </p>
                
                <div style="margin-top: auto; display: flex; gap: 8px;">
                    <a href="${inviteUrl}" target="_blank" style="flex: 1; text-align: center; background: ${t.accent}; color: ${t.bgDark}; padding: 10px; border-radius: var(--radius-sm); text-decoration: none; font-size: 0.9rem; font-weight: var(--font-weight-semibold); transition: opacity 0.2s;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
                        View Invite
                    </a>
                    <button onclick="navigator.clipboard.writeText(window.location.origin + '${inviteUrl}'); showSweetAlert('success', 'Copied!', 'Link copied to clipboard');" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #fff; padding: 10px; border-radius: var(--radius-sm); cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'" title="Copy Link">
                        <i data-lucide="link" style="width: 18px; height: 18px;"></i>
                    </button>
                </div>
            </div>
        </div>
        `;
    }).join('');

    return `
        <div style="background: var(--color-white); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-5); display: flex; flex-direction: column; gap: var(--space-4);">
            <h2 style="font-size: 1.25rem; font-weight: var(--font-weight-bold); color: var(--color-text-primary); margin: 0;">${title}</h2>
            <div style="display: flex; flex-direction: column; gap: var(--space-3);">
                ${listItems}
            </div>
        </div>
    `;
}

async function openInviteModal(existingInvite = null) {
    let eligibleWeddings = [];
    
    if (!existingInvite) {
        const { data: allWeddings } = await supabase.from('weddings').select('id, bride_name, groom_name, start_date, end_date, hashtag, primary_side');
        const { data: existingIds } = await supabase.from('wedding_web_invite').select('wedding_id');
        const usedIds = existingIds.map(e => e.wedding_id);
        eligibleWeddings = allWeddings.filter(w => !usedIds.includes(w.id));
    }

    const optionsHtml = eligibleWeddings.map(w => {
        const targetDate = w.end_date || w.start_date;
        const formattedDate = targetDate ? new Date(targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Date TBD';
        const hashtagStr = w.hashtag ? ` (${w.hashtag})` : ''; 
        return `<option value="${w.id}" data-side="${w.primary_side}">${w.bride_name} & ${w.groom_name}${hashtagStr} - ${formattedDate}</option>`;
    }).join('');

    const weddingSelectionHTML = existingInvite 
        ? `<div>
            <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:4px;">Wedding</label>
            <input type="text" value="${existingInvite.weddings.bride_name} & ${existingInvite.weddings.groom_name}" disabled style="width:100%; box-sizing: border-box; background:var(--color-border); border:1px solid var(--color-border); color:var(--color-text-primary); padding:var(--space-2); border-radius:var(--radius-sm); outline:none; opacity: 0.7;">
            <input type="hidden" id="inviteWeddingId" value="${existingInvite.wedding_id}">
           </div>`
        : `<div>
            <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:4px;">Select Wedding *</label>
            <select id="inviteWeddingId" required style="width:100%; box-sizing: border-box; background:var(--color-bg); border:1px solid #dc2626; color:var(--color-text-primary); padding:var(--space-2); border-radius:var(--radius-sm); outline:none; transition: border-color 0.2s;">
                <option value="" disabled selected>-- Select a Wedding --</option>
                ${optionsHtml}
            </select>
           </div>`;

    const formHTML = `
        <form id="inviteForm" novalidate style="display:flex; flex-direction:column; gap:var(--space-4); width: 100%; box-sizing: border-box;">
            ${weddingSelectionHTML}
            
            <h4 style="margin: 0; padding-bottom: 4px; border-bottom: 1px solid var(--color-border); color: var(--color-text-primary); font-size: 1rem;">Bride's Family</h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4);">
                <div>
                    <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:4px;">Grandfather *</label>
                    <input type="text" id="bGrandfather" required placeholder="e.g., Shri Jain" value="${existingInvite?.bride_grandfather || ''}" style="width:100%; box-sizing: border-box; background:var(--color-bg); border:1px solid ${existingInvite?.bride_grandfather ? '#16a34a' : '#dc2626'}; color:var(--color-text-primary); padding:var(--space-2); border-radius:var(--radius-sm); outline:none; transition: border-color 0.2s;">
                </div>
                <div>
                    <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:4px;">Grandmother *</label>
                    <input type="text" id="bGrandmother" required placeholder="e.g., Smt. Jain" value="${existingInvite?.bride_grandmother || ''}" style="width:100%; box-sizing: border-box; background:var(--color-bg); border:1px solid ${existingInvite?.bride_grandmother ? '#16a34a' : '#dc2626'}; color:var(--color-text-primary); padding:var(--space-2); border-radius:var(--radius-sm); outline:none; transition: border-color 0.2s;">
                </div>
                <div>
                    <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:4px;">Father *</label>
                    <input type="text" id="bFather" required placeholder="e.g., Rajesh" value="${existingInvite?.bride_father || ''}" style="width:100%; box-sizing: border-box; background:var(--color-bg); border:1px solid ${existingInvite?.bride_father ? '#16a34a' : '#dc2626'}; color:var(--color-text-primary); padding:var(--space-2); border-radius:var(--radius-sm); outline:none; transition: border-color 0.2s;">
                </div>
                <div>
                    <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:4px;">Mother *</label>
                    <input type="text" id="bMother" required placeholder="e.g., Sunita" value="${existingInvite?.bride_mother || ''}" style="width:100%; box-sizing: border-box; background:var(--color-bg); border:1px solid ${existingInvite?.bride_mother ? '#16a34a' : '#dc2626'}; color:var(--color-text-primary); padding:var(--space-2); border-radius:var(--radius-sm); outline:none; transition: border-color 0.2s;">
                </div>
            </div>

            <h4 style="margin: 8px 0 0 0; padding-bottom: 4px; border-bottom: 1px solid var(--color-border); color: var(--color-text-primary); font-size: 1rem;">Groom's Family</h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4);">
                <div>
                    <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:4px;">Grandfather *</label>
                    <input type="text" id="gGrandfather" required placeholder="e.g., Shri Mutha" value="${existingInvite?.groom_grandfather || ''}" style="width:100%; box-sizing: border-box; background:var(--color-bg); border:1px solid ${existingInvite?.groom_grandfather ? '#16a34a' : '#dc2626'}; color:var(--color-text-primary); padding:var(--space-2); border-radius:var(--radius-sm); outline:none; transition: border-color 0.2s;">
                </div>
                <div>
                    <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:4px;">Grandmother *</label>
                    <input type="text" id="gGrandmother" required placeholder="e.g., Smt. Mutha" value="${existingInvite?.groom_grandmother || ''}" style="width:100%; box-sizing: border-box; background:var(--color-bg); border:1px solid ${existingInvite?.groom_grandmother ? '#16a34a' : '#dc2626'}; color:var(--color-text-primary); padding:var(--space-2); border-radius:var(--radius-sm); outline:none; transition: border-color 0.2s;">
                </div>
                <div>
                    <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:4px;">Father *</label>
                    <input type="text" id="gFather" required placeholder="e.g., Vijayji" value="${existingInvite?.groom_father || ''}" style="width:100%; box-sizing: border-box; background:var(--color-bg); border:1px solid ${existingInvite?.groom_father ? '#16a34a' : '#dc2626'}; color:var(--color-text-primary); padding:var(--space-2); border-radius:var(--radius-sm); outline:none; transition: border-color 0.2s;">
                </div>
                <div>
                    <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:4px;">Mother *</label>
                    <input type="text" id="gMother" required placeholder="e.g., Kavita" value="${existingInvite?.groom_mother || ''}" style="width:100%; box-sizing: border-box; background:var(--color-bg); border:1px solid ${existingInvite?.groom_mother ? '#16a34a' : '#dc2626'}; color:var(--color-text-primary); padding:var(--space-2); border-radius:var(--radius-sm); outline:none; transition: border-color 0.2s;">
                </div>
            </div>

            <div>
                <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:4px;">Story / About Us Quote *</label>
                <textarea id="storyText" required rows="3" placeholder="A short quote or story for the About Us page..." style="width:100%; box-sizing: border-box; background:var(--color-bg); border:1px solid ${existingInvite?.story_text ? '#16a34a' : '#dc2626'}; color:var(--color-text-primary); padding:var(--space-2); border-radius:var(--radius-sm); outline:none; transition: border-color 0.2s; resize: vertical;">${existingInvite ? existingInvite.story_text : ''}</textarea>
            </div>

            <div>
                <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:4px;">Invite Theme Color *</label>
                <select id="inviteTheme" required style="width:100%; box-sizing: border-box; background:var(--color-bg); border:1px solid #16a34a; color:var(--color-text-primary); padding:var(--space-2); border-radius:var(--radius-sm); outline:none; transition: border-color 0.2s;">
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
        { 
            label: existingInvite ? "Update" : "Create", 
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
                        targetEl.style.borderColor = '#dc2626'; 
                        if (!firstError) firstError = field.name; 
                    } else {
                        targetEl.style.borderColor = '#16a34a'; 
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

    if (existingInvite) {
        actions.unshift({
            label: "Delete",
            variant: "danger", 
            closesModal: false,
            onClick: async () => {
                const result = await Swal.fire({
                    title: 'Delete Invite?',
                    text: `Are you sure you want to permanently delete this web invite?`,
                    icon: 'question', showCancelButton: true, confirmButtonColor: '#dc2626', confirmButtonText: 'Yes, delete it!'
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
        });
    }

    const modal = openModal({
        title: existingInvite ? `Edit Web Invite` : `Create Web Invite`,
        content: formHTML,
        actions: actions
    });

    setTimeout(() => {
        const form = document.getElementById('inviteForm');
        if (form) {
            let parent = form.parentElement;
            while (parent && parent.tagName !== 'BODY') {
                if (window.getComputedStyle(parent).position === 'fixed') {
                    break;
                }
                parent.style.maxWidth = '800px';
                parent.style.width = '95vw';
                parent = parent.parentElement;
            }
        }

        ['bGrandfather', 'bGrandmother', 'bFather', 'bMother', 'gGrandfather', 'gGrandmother', 'gFather', 'gMother', 'storyText', 'inviteTheme'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', (e) => {
                    e.target.style.borderColor = e.target.value.trim() ? '#16a34a' : '#dc2626';
                });
                el.addEventListener('change', (e) => {
                    e.target.style.borderColor = e.target.value.trim() ? '#16a34a' : '#dc2626';
                });
            }
        });

        const btns = Array.from(document.querySelectorAll('button'));
        btns.forEach(btn => {
            const txt = btn.textContent.trim();
            if (txt === 'Cancel' && !btn.hasAttribute('data-styled')) {
                btn.style.cssText = 'background: #6b7280; color: #ffffff; border: 1px solid #6b7280; padding: 0.6rem 1.25rem; border-radius: var(--radius-sm); font-weight: var(--font-weight-medium); cursor: pointer; transition: opacity 0.2s;';
                btn.setAttribute('data-styled', 'true');
            } else if (txt === 'Delete' && !btn.hasAttribute('data-styled')) {
                btn.style.cssText = 'background: #dc2626; color: #ffffff; border: 1px solid #dc2626; padding: 0.6rem 1.25rem; border-radius: var(--radius-sm); font-weight: var(--font-weight-semibold); cursor: pointer; transition: opacity 0.2s; margin-right: auto;';
                if(btn.parentElement) { btn.parentElement.style.display = 'flex'; btn.parentElement.style.width = '100%'; }
                btn.setAttribute('data-styled', 'true');
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
                        if (input) input.style.borderColor = e.target.value ? '#16a34a' : '#dc2626';
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
    input.placeholder = 'Search...';
    input.className = select.className; 
    input.style.cssText = 'width: 100%; padding: var(--space-2); border: 1px solid #dc2626; border-radius: var(--radius-sm); box-sizing: border-box; background: var(--color-bg); color: var(--color-text-primary); outline: none; transition: border-color 0.2s;';
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
                input.style.borderColor = '#16a34a';
                list.style.display = 'none'; 
                
                const form = select.closest('form');
                if (form) form.style.paddingBottom = '0px';
                
                select.dispatchEvent(new Event('change')); 
            });
            list.appendChild(item);
        });
    }
    
    input.addEventListener('focus', () => { 
        input.value = ''; 
        renderList(''); 
        list.style.display = 'block'; 
        
        const form = select.closest('form');
        if (form) form.style.paddingBottom = '150px';
    });
    
    input.addEventListener('input', (e) => { 
        renderList(e.target.value); 
        list.style.display = 'block'; 
        
        const form = select.closest('form');
        if (form) form.style.paddingBottom = '150px';
    });
    
    document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) {
            list.style.display = 'none';
            
            const form = select.closest('form');
            if (form) form.style.paddingBottom = '0px';
            
            const selectedOpt = options.find(o => o.value === select.value);
            if (selectedOpt && select.value !== "") {
                input.value = selectedOpt.text;
                input.style.borderColor = '#16a34a';
            } else {
                input.value = '';
                input.style.borderColor = '#dc2626';
            }
        }
    });

    const initialOpt = options.find(o => o.value === select.value);
    if (initialOpt && select.value !== "") {
        input.value = initialOpt.text;
        input.style.borderColor = '#16a34a';
    }
}