let allSampleWeddings = [];

function startOfDay(date) {
    const copy = new Date(date);
    copy.setHours(0, 0, 0, 0);
    return copy;
}

export function formatWeddingDateRange(startIso, endIso) {
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

export function renderSampleWeddings() {
    if (!document.getElementById('weddings-styles')) {
        const link = document.createElement('link');
        link.id = 'weddings-styles';
        link.rel = 'stylesheet';
        let basePath = window.location.pathname;
        if(basePath.endsWith('.html')) basePath = basePath.substring(0, basePath.lastIndexOf('/'));
        if(!basePath.endsWith('/')) basePath += '/';
        link.href = basePath + 'pages/weddings/weddings.css';
        document.head.appendChild(link);
    }

    const wrapper = document.createElement('section');
    wrapper.className = "weddings-page-wrapper"; 
    wrapper.style.cssText = "width: 100%; box-sizing: border-box;";

    const controls = document.createElement('div');
    controls.className = "weddings-control-bar";
    controls.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-6); background: var(--color-white); padding: var(--space-4); border-radius: var(--radius-lg); border: 1px solid var(--color-border);";

    controls.innerHTML = `
        <div style="display: flex; align-items: center; gap: var(--space-2);">
            <span style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">Sort by:</span>
            <select id="sortSampleWeddings" style="background: var(--color-bg); border: 1px solid var(--color-border); color: var(--color-text-primary); padding: var(--space-2) var(--space-3); border-radius: var(--radius-sm); font-size: var(--font-size-sm); cursor: pointer; outline: none;">
                <option value="date-asc">Date (Earliest first)</option>
                <option value="date-desc">Date (Latest first)</option>
                <option value="name-asc">Couple Names (A-Z)</option>
            </select>
        </div>
        <div></div>
        <div style="position: relative;">
            <i data-lucide="search" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); width: 16px; height: 16px; color: var(--color-text-secondary);"></i>
            <input type="text" id="searchSampleWeddings" placeholder="Search samples..." style="background: var(--color-bg); border: 1px solid var(--color-border); color: var(--color-text-primary); padding: var(--space-2) var(--space-3) var(--space-2) 32px; border-radius: var(--radius-sm); font-size: var(--font-size-sm); width: 250px; outline: none;">
        </div>
    `;
    wrapper.appendChild(controls);

    const sectionsContainer = document.createElement('div');
    sectionsContainer.id = "sample-weddings-galleries";
    wrapper.appendChild(sectionsContainer);

    setTimeout(() => {
        loadSampleWeddingsData();
        document.getElementById('searchSampleWeddings')?.addEventListener('input', filterAndRenderGalleries);
        document.getElementById('sortSampleWeddings')?.addEventListener('change', filterAndRenderGalleries);
        if (window.lucide) window.lucide.createIcons();
    }, 50);

    return wrapper;
}

function loadSampleWeddingsData() {
    // Synced with exact event counts (4 events each) to match sample-wedding-details.js[cite: 1]
    allSampleWeddings = [
        {
            id: 'sample-inprogress',
            status: 'in-progress',
            primary_side: 'bride',
            bride_name: 'Ananya',
            groom_name: 'Vikram',
            start_date: '2026-08-13',
            end_date: '2026-08-16',
            family_name: 'The Sharma Family',
            family_details: 'Sharma & Verma Families',
            events_count: 4, 
            has_web_invite: true,
            hosts: [
                { name: 'Amit Sharma', phone: '+919876543210' },
                { name: 'Priya Sharma', phone: '+919876543211' }
            ]
        },
        {
            id: 'sample-upcoming',
            status: 'upcoming',
            primary_side: 'groom',
            bride_name: 'Neha',
            groom_name: 'Rahul',
            start_date: '2026-09-28',
            end_date: '2026-09-30',
            family_name: 'The Patel Family',
            family_details: 'Patel & Shah Families',
            events_count: 4, 
            has_web_invite: true,
            hosts: [
                { name: 'Sanjay Patel', phone: '+919876543222' }
            ]
        },
        {
            id: 'sample-archived',
            status: 'archived',
            primary_side: 'bride',
            bride_name: 'Isha',
            groom_name: 'Karan',
            start_date: '2026-04-16',
            end_date: '2026-04-18',
            family_name: 'The Gupta Family',
            family_details: 'Gupta & Malhotra Families',
            events_count: 4, 
            has_web_invite: false,
            hosts: [
                { name: 'Rajesh Gupta', phone: '+919876543233' }
            ]
        }
    ];

    filterAndRenderGalleries();
}

function filterAndRenderGalleries() {
    const searchTerm = document.getElementById('searchSampleWeddings')?.value.toLowerCase() || '';
    const sortValue = document.getElementById('sortSampleWeddings')?.value || 'date-asc';
    
    let filtered = allSampleWeddings.filter(w => {
        const full = `${w.groom_name} & ${w.bride_name}`.toLowerCase();
        return full.includes(searchTerm.replace(/\s+/g, '')) || w.bride_name.toLowerCase().includes(searchTerm) || w.groom_name.toLowerCase().includes(searchTerm);
    });

    filtered.sort((a, b) => {
        if (sortValue === 'date-asc') return new Date(a.start_date) - new Date(b.start_date);
        if (sortValue === 'date-desc') return new Date(b.start_date) - new Date(a.start_date);
        if (sortValue === 'name-asc') {
            const nameA = a.primary_side === 'groom' ? `${a.groom_name} & ${a.bride_name}` : `${a.bride_name} & ${a.groom_name}`;
            const nameB = b.primary_side === 'groom' ? `${b.groom_name} & ${b.bride_name}` : `${b.bride_name} & ${b.groom_name}`;
            return nameA.localeCompare(nameB);
        }
        return 0;
    });

    const inProgress = filtered.filter(w => w.status === 'in-progress');
    const upcoming = filtered.filter(w => w.status === 'upcoming');
    const archived = filtered.filter(w => w.status === 'archived');

    const container = document.getElementById('sample-weddings-galleries');
    if (!container) return;

    if (filtered.length === 0) {
        container.innerHTML = `<div style="text-align: center; padding: var(--space-8); color: var(--color-text-muted); background: var(--color-white); border-radius: var(--radius-lg); border: 1px solid var(--color-border);">No sample weddings match your search.</div>`;
        return;
    }

    container.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: var(--space-6); width: 100%; align-items: start;">
            ${buildGallerySection("In Progress", inProgress)}
            ${buildGallerySection("Upcoming", upcoming)}
            ${buildGallerySection("Archived", archived)}
        </div>
    `;

    container.querySelectorAll('.gallery-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if(!e.target.closest('a')) {
                const id = card.getAttribute('data-wedding-id');
                window.location.hash = `#sample-wedding-details?id=${id}`;
            }
        });
    });

    if (window.lucide) window.lucide.createIcons();
}

function buildGallerySection(title, weddings) {
    if (!weddings || weddings.length === 0) return '';
    
    const listItems = weddings.map(wedding => {
        const displayNames = wedding.primary_side === 'groom' 
            ? `${wedding.groom_name} & ${wedding.bride_name}` 
            : `${wedding.bride_name} & ${wedding.groom_name}`;

        const inlineHosts = wedding.hosts.map(h => `${h.name} - ${h.phone}`).join(', ');
        const hostsHTML = `<div style="display:flex; align-items:center; gap:6px; font-size:var(--font-size-xs); color:var(--color-text-secondary); margin-bottom: 6px; flex-wrap: wrap;"><i data-lucide="phone" style="width:14px; height:14px; flex-shrink: 0;"></i> <span>${inlineHosts}</span></div>`;

        let webInviteHTML = '';
        if (wedding.has_web_invite) {
            webInviteHTML = `
            <div style="margin-top: 12px; display: flex; justify-content: center; width: 100%;">
                <a href="${window.location.origin}/sample-invite.html" target="_blank" onclick="event.stopPropagation();" style="background: var(--color-primary); color: var(--color-text-on-accent); padding: 8px 16px; border-radius: var(--radius-sm); text-decoration: none; font-size: var(--font-size-sm); font-weight: var(--font-weight-medium); display: inline-flex; align-items: center; gap: 6px; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">
                    <i data-lucide="external-link" style="width: 14px; height: 14px;"></i> Wedding Invitation
                </a>
            </div>`;
        }

        return `
        <div class="stat-card gallery-card" data-wedding-id="${wedding.id}" style="position: relative; cursor: pointer; padding: 1rem 1.25rem; display: flex; flex-direction: column; gap: 8px; transition: all 0.2s ease;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <div style="background: var(--color-border); color: var(--color-primary); width: 32px; height: 32px; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                        <i data-lucide="heart" style="width: 16px; height: 16px;"></i>
                    </div>
                    <div>
                        <h3 style="margin: 0; font-size: 0.95rem; font-weight: var(--font-weight-bold); color: var(--color-text-primary);">${displayNames}</h3>
                        <p style="margin: 4px 0 0 0; font-size: 0.8rem; color: var(--color-text-secondary);"><i data-lucide="calendar" style="width:12px; height:12px; vertical-align:middle; margin-right:4px;"></i> ${formatWeddingDateRange(wedding.start_date, wedding.end_date)}</p>
                    </div>
                </div>
            </div>
            <div style="border-top: 1px solid var(--color-border); margin-top: 4px; padding-top: 8px;">
                <div style="display:flex; align-items:center; gap:6px; font-size:var(--font-size-xs); color:var(--color-text-secondary); margin-bottom: 6px;"><i data-lucide="home" style="width:14px; height:14px;"></i> ${wedding.family_name}</div>
                <div style="display:flex; align-items:center; gap:6px; font-size:var(--font-size-xs); color:var(--color-text-secondary); margin-bottom: 6px;"><i data-lucide="users" style="width:14px; height:14px;"></i> ${wedding.family_details}</div>
                ${hostsHTML}
                <div style="display:flex; align-items:center; gap:6px; font-size:var(--font-size-xs); color:var(--color-text-secondary);"><i data-lucide="calendar-days" style="width:14px; height:14px;"></i> ${wedding.events_count} Events</div>
                ${webInviteHTML}
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