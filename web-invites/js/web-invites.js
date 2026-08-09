import { supabase } from '../../database/js/api.js';
import { openModal } from '../../global/components/js/modal.js';
import { showAlert } from '../../global/components/js/alerts.js';

const INVITE_BASE_URL = "/web-invites/html/index.html"; 

export function renderWebInvites() {
    const section = document.createElement("div");
    section.style.cssText = "width: 100%; max-width: 1200px; margin: 0 auto; padding-bottom: var(--space-8);";

    const controlsRow = document.createElement("div");
    controlsRow.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-6); padding-bottom: var(--space-4); border-bottom: 1px solid var(--color-border); flex-wrap: wrap; gap: 16px;";
    
    controlsRow.innerHTML = `
        <div style="flex: 1;">
            <h2 style="margin: 0; font-size: 1.5rem; color: var(--color-text-primary);">Web Invitations</h2>
            <p style="margin: 4px 0 0 0; color: var(--color-text-secondary); font-size: 0.9rem;">Manage dynamic digital invitations for your weddings.</p>
        </div>
        <div style="display: flex; justify-content: center; gap: 12px;">
            <button id="add-invite-btn" style="background: var(--color-primary); color: var(--color-text-on-accent); border: none; padding: 0.6rem 1.5rem; border-radius: var(--radius-sm); font-weight: var(--font-weight-semibold); cursor: pointer; font-size: var(--font-size-sm); display: flex; align-items: center; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
                <i data-lucide="plus" style="width:16px; height:16px; margin-right:6px;"></i> Create Invite
            </button>
        </div>
        <div style="flex: 1; display: flex; justify-content: flex-end;">
            <div style="position: relative; display: flex; align-items: center; width: 100%; max-width: 300px;">
                <i data-lucide="search" style="position: absolute; left: 10px; width: 16px; height: 16px; color: var(--color-text-muted);"></i>
                <input type="text" id="inviteSearchInput" placeholder="Search by name or hashtag..." style="width: 100%; padding: 0.5rem 0.5rem 0.5rem 32px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); font-size: var(--font-size-sm); background: var(--color-bg); color: var(--color-text-primary); outline: none; transition: border-color 0.2s;">
            </div>
        </div>
    `;

    const gridContainer = document.createElement("div");
    gridContainer.id = "invites-grid";
    gridContainer.style.cssText = "display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: var(--space-5);";

    section.appendChild(controlsRow);
    section.appendChild(gridContainer);

    gridContainer.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: var(--space-8); color: var(--color-text-secondary);">Loading web invites...</div>`;

    setTimeout(() => loadInvitesData(gridContainer), 0);

    const updateHandler = () => {
        if (document.body.contains(section)) loadInvitesData(gridContainer);
        else window.removeEventListener('invitesDataUpdated', updateHandler);
    };
    window.addEventListener('invitesDataUpdated', updateHandler);

    setTimeout(() => {
        document.getElementById('add-invite-btn').addEventListener('click', () => openInviteModal());
    }, 50);

    return section;
}

async function loadInvitesData(container) {
    try {
        const { data: invites, error } = await supabase
            .from('wedding_web_invite')
            .select(`
                *,
                weddings ( id, bride_name, groom_name, start_date, hashtag )
            `);
            
        if (error) throw error;

        window.__invitesData = invites || [];
        renderInviteCards(container, window.__invitesData);

        const searchInput = document.getElementById('inviteSearchInput');
        if (searchInput && !searchInput.hasAttribute('data-bound')) {
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value.toLowerCase();
                const filtered = window.__invitesData.filter(inv => {
                    const w = inv.weddings;
                    return (w.bride_name || '').toLowerCase().includes(query) || 
                           (w.groom_name || '').toLowerCase().includes(query) ||
                           (w.hashtag || '').toLowerCase().includes(query);
                });
                renderInviteCards(container, filtered);
            });
            searchInput.setAttribute('data-bound', 'true');
        }
    } catch (err) {
        container.innerHTML = `<div style="grid-column: 1/-1; color: var(--color-danger); text-align: center; padding: var(--space-8);">Failed to load invites: ${err.message}</div>`;
    }
}

function renderInviteCards(container, invites) {
    if (invites.length === 0) {
        container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: var(--space-8); background: var(--color-bg); border: 1px dashed var(--color-border); border-radius: var(--radius-lg); color: var(--color-text-muted);">No web invitations found.</div>`;
        return;
    }

    container.innerHTML = invites.map(inv => {
        const w = inv.weddings;
        const displayNames = `${w.bride_name} & ${w.groom_name}`;
        const dateStr = new Date(w.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        
        const cleanHashtag = (w.hashtag || 'invite').replace('#', '');
        const inviteUrl = `${INVITE_BASE_URL}?h=${cleanHashtag}`;

        const invJson = JSON.stringify(inv).replace(/'/g, "&apos;").replace(/"/g, "&quot;");

        return `
        <div style="background: var(--color-white); border: 1px solid var(--color-border); border-radius: var(--radius-lg); overflow: hidden; display: flex; flex-direction: column; transition: transform 0.2s, box-shadow 0.2s;" onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 10px 20px rgba(0,0,0,0.1)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none';">
            <div style="background: radial-gradient(circle at top left, var(--color-bg), var(--color-border)); padding: var(--space-6); text-align: center; position: relative;">
                <button class="edit-invite-btn" data-invite='${invJson}' style="position: absolute; top: 12px; right: 12px; background: var(--color-white); border: 1px solid var(--color-border); color: var(--color-text-muted); width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.color='var(--color-primary)'; this.style.borderColor='var(--color-primary)';" onmouseout="this.style.color='var(--color-text-muted)'; this.style.borderColor='var(--color-border)';">
                    <i data-lucide="edit-2" style="width: 14px; height: 14px;"></i>
                </button>
                <div style="width: 60px; height: 60px; background: var(--color-white); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
                    <i data-lucide="mail" style="width: 28px; height: 28px; color: var(--color-primary);"></i>
                </div>
            </div>
            <div style="padding: var(--space-5); display: flex; flex-direction: column; flex-grow: 1;">
                <h3 style="margin: 0 0 4px 0; font-size: 1.15rem; color: var(--color-text-primary); text-align: center;">${displayNames}</h3>
                <p style="margin: 0 0 16px 0; font-size: 0.85rem; color: var(--color-text-secondary); text-align: center; font-weight: var(--font-weight-medium);">${dateStr} • ${w.hashtag || ''}</p>
                
                <div style="margin-top: auto; display: flex; gap: 8px;">
                    <a href="${inviteUrl}" target="_blank" style="flex: 1; text-align: center; background: var(--color-primary); color: var(--color-text-on-accent); padding: 10px; border-radius: var(--radius-sm); text-decoration: none; font-size: 0.9rem; font-weight: var(--font-weight-semibold); transition: opacity 0.2s;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
                        View Invite
                    </a>
                    <button onclick="navigator.clipboard.writeText(window.location.origin + '${inviteUrl}'); alert('Link Copied!');" style="background: var(--color-bg); border: 1px solid var(--color-border); color: var(--color-text-primary); padding: 10px; border-radius: var(--radius-sm); cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='var(--color-border)'" onmouseout="this.style.background='var(--color-bg)'" title="Copy Link">
                        <i data-lucide="link" style="width: 18px; height: 18px;"></i>
                    </button>
                </div>
            </div>
        </div>
        `;
    }).join('');

    container.querySelectorAll('.edit-invite-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const data = JSON.parse(btn.getAttribute('data-invite'));
            openInviteModal(data);
        });
    });

    if (window.lucide) window.lucide.createIcons();
}

async function openInviteModal(existingInvite = null) {
    let eligibleWeddings = [];
    
    if (!existingInvite) {
        const { data: allWeddings } = await supabase.from('weddings').select('id, bride_name, groom_name, start_date, hashtag');
        const { data: existingIds } = await supabase.from('wedding_web_invite').select('wedding_id');
        const usedIds = existingIds.map(e => e.wedding_id);
        eligibleWeddings = allWeddings.filter(w => !usedIds.includes(w.id));
    }

    const optionsHtml = eligibleWeddings.map(w => 
        `<option value="${w.id}">${w.bride_name} & ${w.groom_name} (${w.hashtag})</option>`
    ).join('');

    const weddingSelectionHTML = existingInvite 
        ? `<div>
            <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:4px;">Wedding</label>
            <input type="text" value="${existingInvite.weddings.bride_name} & ${existingInvite.weddings.groom_name}" disabled style="width:100%; background:var(--color-border); border:1px solid var(--color-border); color:var(--color-text-primary); padding:var(--space-2); border-radius:var(--radius-sm); outline:none; opacity: 0.7;">
            <input type="hidden" id="inviteWeddingId" value="${existingInvite.wedding_id}">
           </div>`
        : `<div>
            <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:4px;">Select Wedding *</label>
            <select id="inviteWeddingId" required style="width:100%; background:var(--color-bg); border:1px solid var(--color-border); color:var(--color-text-primary); padding:var(--space-2); border-radius:var(--radius-sm); outline:none;">
                <option value="" disabled selected>-- Select a Wedding --</option>
                ${optionsHtml}
            </select>
           </div>`;

    const formHTML = `
        <form id="inviteForm" novalidate style="display:flex; flex-direction:column; gap:var(--space-4); padding-bottom: ${existingInvite ? '20px' : '200px'};">
            ${weddingSelectionHTML}
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4);">
                <div>
                    <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:4px;">Bride's Grandparents</label>
                    <input type="text" id="bGrand" value="${existingInvite ? existingInvite.bride_grandparents : ''}" placeholder="e.g., Smt. & Shri Jain" style="width:100%; background:var(--color-bg); border:1px solid var(--color-border); color:var(--color-text-primary); padding:var(--space-2); border-radius:var(--radius-sm); outline:none;">
                </div>
                <div>
                    <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:4px;">Bride's Parents</label>
                    <input type="text" id="bParents" value="${existingInvite ? existingInvite.bride_parents : ''}" placeholder="e.g., Sunita & Rajesh" style="width:100%; background:var(--color-bg); border:1px solid var(--color-border); color:var(--color-text-primary); padding:var(--space-2); border-radius:var(--radius-sm); outline:none;">
                </div>
                <div>
                    <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:4px;">Groom's Grandparents</label>
                    <input type="text" id="gGrand" value="${existingInvite ? existingInvite.groom_grandparents : ''}" placeholder="e.g., Smt. & Shri Mutha" style="width:100%; background:var(--color-bg); border:1px solid var(--color-border); color:var(--color-text-primary); padding:var(--space-2); border-radius:var(--radius-sm); outline:none;">
                </div>
                <div>
                    <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:4px;">Groom's Parents</label>
                    <input type="text" id="gParents" value="${existingInvite ? existingInvite.groom_parents : ''}" placeholder="e.g., Kavita & Vijayji" style="width:100%; background:var(--color-bg); border:1px solid var(--color-border); color:var(--color-text-primary); padding:var(--space-2); border-radius:var(--radius-sm); outline:none;">
                </div>
            </div>
            <div>
                <label style="display:block; font-size:var(--font-size-sm); color:var(--color-text-secondary); margin-bottom:4px;">Story / About Us Quote</label>
                <textarea id="storyText" rows="3" placeholder="A short quote or story for the About Us page..." style="width:100%; background:var(--color-bg); border:1px solid var(--color-border); color:var(--color-text-primary); padding:var(--space-2); border-radius:var(--radius-sm); outline:none; resize: vertical;">${existingInvite ? existingInvite.story_text : ''}</textarea>
            </div>
        </form>
    `;

    const actions = [
        { label: "Cancel", variant: "ghost" },
        { 
            label: existingInvite ? "Update Invite" : "Create Invite", 
            variant: "primary", 
            closesModal: false,
            onClick: async () => {
                const wId = document.getElementById('inviteWeddingId').value;
                if (!wId) {
                    showAlert({ icon: 'warning', title: 'Missing Info', text: 'Please select a wedding.' });
                    return;
                }

                const payload = {
                    wedding_id: wId,
                    bride_grandparents: document.getElementById('bGrand').value.trim(),
                    bride_parents: document.getElementById('bParents').value.trim(),
                    groom_grandparents: document.getElementById('gGrand').value.trim(),
                    groom_parents: document.getElementById('gParents').value.trim(),
                    story_text: document.getElementById('storyText').value.trim()
                };

                try {
                    if (existingInvite) {
                        const { error } = await supabase.from('wedding_web_invite').update(payload).eq('id', existingInvite.id);
                        if (error) throw error;
                    } else {
                        const { error } = await supabase.from('wedding_web_invite').insert([payload]);
                        if (error) throw error;
                    }

                    modal.close();
                    window.dispatchEvent(new Event('invitesDataUpdated')); 
                    showAlert({ icon: 'success', title: 'Success', text: `Web Invite ${existingInvite ? 'updated' : 'created'} successfully!`, timer: 2000 });
                } catch (error) {
                    showAlert({ icon: 'error', title: 'Database Error', text: error.message });
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
                    icon: 'warning', showCancelButton: true, confirmButtonColor: '#dc2626', confirmButtonText: 'Yes, delete it!'
                });

                if (result.isConfirmed) {
                    try {
                        const { error } = await supabase.from('wedding_web_invite').delete().eq('id', existingInvite.id);
                        if (error) throw error;
                        modal.close();
                        window.dispatchEvent(new Event('invitesDataUpdated')); 
                        showAlert({ icon: 'success', title: 'Deleted!', text: 'Invite removed.', timer: 2000 });
                    } catch (error) {
                        showAlert({ icon: 'error', title: 'Database Error', text: error.message });
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

        if (!existingInvite) convertToSearchableDropdown('inviteWeddingId');
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
    input.style.cssText = 'width: 100%; padding: var(--space-2); border: 1px solid var(--color-border); border-radius: var(--radius-sm); box-sizing: border-box; background: var(--color-bg); color: var(--color-text-primary); outline: none; transition: border-color 0.2s;';
    wrapper.appendChild(input);
    const list = document.createElement('div');
    list.style.cssText = 'position: absolute; top: 100%; left: 0; right: 0; max-height: 200px; overflow-y: auto; background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-sm); z-index: 9999; display: none; box-shadow: 0 4px 6px rgba(0,0,0,0.3); margin-top: 4px;';
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
                select.value = opt.value; input.value = opt.text; list.style.display = 'none'; select.dispatchEvent(new Event('change')); 
            });
            list.appendChild(item);
        });
    }
    input.addEventListener('focus', () => { input.value = ''; renderList(''); list.style.display = 'block'; });
    input.addEventListener('input', (e) => { renderList(e.target.value); list.style.display = 'block'; });
    document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) {
            list.style.display = 'none';
            const selectedOpt = options.find(o => o.value === select.value);
            if (selectedOpt && select.value !== "") input.value = selectedOpt.text;
            else input.value = '';
        }
    });
}