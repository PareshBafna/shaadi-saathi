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
    if (typeof window.checkSessionOrShowAlert === 'function' && !window.checkSessionOrShowAlert()) {
        const wrapper = document.createElement('section');
        wrapper.className = "sample-weddings-auth-message";
        wrapper.textContent = "Please log in to view sample weddings.";
        return wrapper;
    }

    const wrapper = document.createElement('section');
    wrapper.className = "sample-weddings-page-wrapper"; 

    const controls = document.createElement('div');
    controls.className = "sample-weddings-control-bar";

    controls.innerHTML = `
        <div class="sample-weddings-search-container">
            <div class="sample-weddings-search-input-wrapper">
                <i data-lucide="search" class="sample-weddings-search-icon"></i>
                <input type="text" id="searchSampleWeddings" placeholder="Search ..." class="sample-weddings-search-input">
            </div>
        </div>
    `;
    wrapper.appendChild(controls);

    const sectionsContainer = document.createElement('div');
    sectionsContainer.id = "sample-weddings-galleries";
    wrapper.appendChild(sectionsContainer);

    setTimeout(() => {
        loadSampleWeddingsData();
        document.getElementById('searchSampleWeddings')?.addEventListener('input', filterAndRenderGalleries);
        if (window.lucide) window.lucide.createIcons();
    }, 50);

    return wrapper;
}

function loadSampleWeddingsData() {
    const today = new Date();
    const addD = (days) => { const d = new Date(today); d.setDate(d.getDate() + days); return d; };
    const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    allSampleWeddings = [
        {
            id: 'sample-inprogress',
            status: 'in-progress',
            primary_side: 'bride',
            bride_name: 'Ananya',
            groom_name: 'Vikram',
            start_date: fmt(addD(-1)),
            end_date: fmt(addD(2)),
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
            start_date: fmt(addD(30)),
            end_date: fmt(addD(32)),
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
            start_date: fmt(addD(-45)),
            end_date: fmt(addD(-43)),
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
    
    let filtered = allSampleWeddings.filter(w => {
        const full = `${w.groom_name} & ${w.bride_name}`.toLowerCase();
        return full.includes(searchTerm.replace(/\s+/g, '')) || w.bride_name.toLowerCase().includes(searchTerm) || w.groom_name.toLowerCase().includes(searchTerm);
    });

    filtered.sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

    const inProgress = filtered.filter(w => w.status === 'in-progress');
    const upcoming = filtered.filter(w => w.status === 'upcoming');
    const archived = filtered.filter(w => w.status === 'archived');

    const container = document.getElementById('sample-weddings-galleries');
    if (!container) return;

    if (filtered.length === 0) {
        container.innerHTML = `<div class="sample-weddings-empty-state">No sample weddings match your search.</div>`;
        return;
    }

    container.innerHTML = `
        <div class="sample-weddings-galleries-grid">
            ${buildGallerySection("In Progress", inProgress)}
            ${buildGallerySection("Upcoming", upcoming)}
            ${buildGallerySection("Archived", archived)}
        </div>
    `;

    container.querySelectorAll('.sample-wedding-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (!e.target.closest('a')) {
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
        const hostsHTML = `
            <div class="sample-wedding-card__row">
                <i data-lucide="phone"></i> <span>${inlineHosts}</span>
            </div>
        `;

        let webInviteHTML = '';
        if (wedding.has_web_invite) {
            webInviteHTML = `
            <div class="sample-wedding-card__invite-wrap">
                <a href="#sample-web-invites-preview?id=${wedding.id}" target="_blank" onclick="event.stopPropagation();" class="sample-wedding-card__invite-btn">
                    <i data-lucide="external-link"></i> Wedding Invitation
                </a>
            </div>`;
        }

        return `
        <div class="sample-wedding-card" data-wedding-id="${wedding.id}">
            <div class="sample-wedding-card__header">
                <div class="sample-wedding-card__title-group">
                    <div class="sample-wedding-card__icon-badge">
                        <i data-lucide="heart"></i>
                    </div>
                    <div>
                        <h3 class="sample-wedding-card__names">${displayNames}</h3>
                        <p class="sample-wedding-card__dates"><i data-lucide="calendar"></i> ${formatWeddingDateRange(wedding.start_date, wedding.end_date)}</p>
                    </div>
                </div>
            </div>
            <div class="sample-wedding-card__details">
                <div class="sample-wedding-card__row"><i data-lucide="home"></i> <span>${wedding.family_name}</span></div>
                <div class="sample-wedding-card__row"><i data-lucide="users"></i> <span>${wedding.family_details}</span></div>
                ${hostsHTML}
                <div class="sample-wedding-card__row"><i data-lucide="calendar-days"></i> <span>${wedding.events_count} Events</span></div>
                ${webInviteHTML}
            </div>
        </div>
        `;
    }).join('');

    return `
        <div class="sample-dashboard-section">
            <h2 class="sample-dashboard-section__heading">${title}</h2>
            <div class="sample-dashboard-section__list">
                ${listItems}
            </div>
        </div>
    `;
}