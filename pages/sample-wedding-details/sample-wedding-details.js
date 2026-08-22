import { formatWeddingDateRange } from '../sample-weddings/sample-weddings.js';

// ==========================================
// SAMPLE WEDDING MOCK DATA GENERATOR
// ==========================================
function generateSampleData(weddingId) {
    const today = new Date();
    const addD = (days) => { const d = new Date(today); d.setDate(d.getDate() + days); return d; };
    const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    let wedding;
    let events = [];
    let hosts = [];

    if (weddingId === 'sample-inprogress') {
        wedding = {
            id: 'sample-inprogress', bride_name: 'Ananya', groom_name: 'Vikram', primary_side: 'bride',
            family_name: 'The Sharma Family', family_details: 'Sharma & Verma Families', hashtag: '#AnanyaWedsVikram',
            instagram: 'ananyasharma', start_date: fmt(addD(-1)), end_date: fmt(addD(2)), has_web_invite: true
        };
        events = [
            { id: 'e1', event_name: 'Engagement Ring Ceremony', title: 'Engagement Ring Ceremony', date: fmt(addD(-1)), time: '17:00:00', venue: 'Grand Resort Ballroom, Chennai', venue_map_link: 'https://maps.app.goo.gl/example' },
            { id: 'e2', event_name: 'Haldi & Floral Bath', title: 'Haldi & Floral Bath', date: fmt(addD(0)), time: '10:30:00', venue: 'Grand Resort Ballroom, Chennai', venue_map_link: 'https://maps.app.goo.gl/example' },
            { id: 'e3', event_name: 'Sangeet & Cocktail Night', title: 'Sangeet & Cocktail Night', date: fmt(addD(1)), time: '19:00:00', venue: 'Grand Resort Ballroom, Chennai', venue_map_link: 'https://maps.app.goo.gl/example' },
            { id: 'e4', event_name: 'Wedding & Reception', title: 'Wedding & Reception', date: fmt(addD(2)), time: '18:00:00', venue: 'Grand Resort Ballroom, Chennai', venue_map_link: 'https://maps.app.goo.gl/example' }
        ];
        hosts = [ { name: 'Amit Sharma', phone: '+919876543210' }, { name: 'Priya Sharma', phone: '+919876543211' } ];
    } else if (weddingId === 'sample-upcoming') {
        wedding = {
            id: 'sample-upcoming', bride_name: 'Neha', groom_name: 'Rahul', primary_side: 'groom',
            family_name: 'The Patel Family', family_details: 'Patel & Shah Families', hashtag: '#RahulKiNeha',
            instagram: 'rahulpatel', start_date: fmt(addD(30)), end_date: fmt(addD(32)), has_web_invite: true
        };
        events = [
            { id: 'e5', event_name: 'Welcome Hi-Tea', title: 'Welcome Hi-Tea', date: fmt(addD(30)), time: '16:00:00', venue: 'Royal Palace Hall, Jaipur' },
            { id: 'e6', event_name: 'Mehendi Celebration', title: 'Mehendi Celebration', date: fmt(addD(30)), time: '19:00:00', venue: 'Royal Palace Hall, Jaipur' },
            { id: 'e7', event_name: 'Sangeet Night', title: 'Sangeet Night', date: fmt(addD(31)), time: '18:30:00', venue: 'Royal Palace Hall, Jaipur' },
            { id: 'e8', event_name: 'Pheras & Wedding Lunch', title: 'Pheras & Wedding Lunch', date: fmt(addD(32)), time: '11:00:00', venue: 'Royal Palace Hall, Jaipur' }
        ];
        hosts = [ { name: 'Sanjay Patel', phone: '+919876543222' } ];
    } else {
        wedding = {
            id: 'sample-archived', bride_name: 'Isha', groom_name: 'Karan', primary_side: 'bride',
            family_name: 'The Gupta Family', family_details: 'Gupta & Malhotra Families', hashtag: '#IshaWedsKaran',
            instagram: 'ishagupta', start_date: fmt(addD(-45)), end_date: fmt(addD(-43)), has_web_invite: false
        };
        events = [
            { id: 'e9', event_name: 'Welcome Dinner', title: 'Welcome Dinner', date: fmt(addD(-45)), time: '20:00:00', venue: 'City Club Main Banquet, Mumbai' },
            { id: 'e10', event_name: 'Haldi & Puja', title: 'Haldi & Puja', date: fmt(addD(-44)), time: '09:30:00', venue: 'City Club Main Banquet, Mumbai' },
            { id: 'e11', event_name: 'Sangeet Evening', title: 'Sangeet Evening', date: fmt(addD(-44)), time: '19:00:00', venue: 'City Club Main Banquet, Mumbai' },
            { id: 'e12', event_name: 'Grand Reception', title: 'Grand Reception', date: fmt(addD(-43)), time: '19:00:00', venue: 'City Club Main Banquet, Mumbai' }
        ];
        hosts = [ { name: 'Rajesh Gupta', phone: '+919876543233' } ];
    }

    const users = [ { id: 'u1', name: 'Rahul Jain', phone: '+919876500003' }, { id: 'u2', name: 'Neha Jain', phone: '+919876500004' } ];
    const guests = [];
    const firstNames = ["Amit", "Priya", "Rahul", "Anjali", "Karan", "Neha", "Vikram", "Sneha"];
    const lastNames = ["Jain", "Shah", "Mehta", "Patel", "Desai", "Gupta", "Sharma", "Singh"];
    
    const allEventIds = events.map(e => e.id);
    for (let i = 1; i <= 50; i++) {
        guests.push({
            id: `g${i}`,
            name: `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`,
            phone: `+919${Math.floor(100000000 + Math.random() * 900000000)}`,
            invited_events: allEventIds
        });
    }

    return { wedding, events, hosts, users, guests };
}

// ==========================================
// MAIN RENDER FUNCTION
// ==========================================
export function renderSampleWeddingDetails(weddingId) {
    if (typeof window.checkSessionOrShowAlert === 'function' && !window.checkSessionOrShowAlert()) {
        const wrapper = document.createElement("div");
        wrapper.className = "sample-details-auth-message";
        wrapper.textContent = "Please log in to view sample wedding details.";
        return wrapper;
    }

    const data = generateSampleData(weddingId);
    let currentViewRole = 'guest'; 

    const wrapper = document.createElement("div");
    wrapper.className = "sample-details-wrapper";

    const toggleBar = document.createElement("div");
    toggleBar.className = "sample-details-toggle-bar";
    
    const createToggleBtn = (label, roleVal) => {
        const btn = document.createElement("button");
        btn.innerText = label;
        btn.className = "sample-details-toggle-btn";
        btn.onclick = () => {
            currentViewRole = roleVal;
            updateToggles();
            renderContent();
        };
        return btn;
    };

    const btnGuest = createToggleBtn('Guest View', 'guest');
    const btnUser = createToggleBtn('User View', 'wedding_user');
    const btnHost = createToggleBtn('Host View', 'host');
    
    toggleBar.appendChild(btnGuest);
    toggleBar.appendChild(btnUser);
    toggleBar.appendChild(btnHost);
    wrapper.appendChild(toggleBar);

    const contentContainer = document.createElement("div");
    wrapper.appendChild(contentContainer);

    const updateToggles = () => {
        [btnGuest, btnUser, btnHost].forEach(btn => {
            btn.classList.remove('active');
        });
        const activeBtn = currentViewRole === 'guest' ? btnGuest : (currentViewRole === 'wedding_user' ? btnUser : btnHost);
        activeBtn.classList.add('active');
    };

    const renderContent = () => {
        contentContainer.innerHTML = '';
        
        contentContainer.appendChild(buildMockHeader(data.wedding));
        
        const canViewAll = currentViewRole === 'host' || currentViewRole === 'wedding_user';
        
        contentContainer.appendChild(buildMockStats(data.wedding, data.events.length, data.guests.length, data.hosts, canViewAll));
        contentContainer.appendChild(buildMockEvents(data.events));

        if (canViewAll) {
            contentContainer.appendChild(buildMockList("Wedding Hosts", data.hosts));
            contentContainer.appendChild(buildMockList("Wedding Users", data.users));
            contentContainer.appendChild(buildMockGuests(data.guests, data.events));
        }

        if (window.lucide) window.lucide.createIcons();
    };

    updateToggles();
    renderContent();

    return wrapper;
}

// ==========================================
// UI COMPONENT BUILDERS (READ-ONLY)
// ==========================================
function buildMockHeader(wedding) {
    const header = document.createElement("div");
    header.className = "sample-details-header";
    
    const leftSide = document.createElement("div");
    leftSide.className = "sample-details-header__left";
    
    const formattedDate = formatWeddingDateRange(wedding.start_date, wedding.end_date);
    const hashtagHTML = wedding.hashtag 
        ? `<div class="sample-details-header__hashtag-wrap"><span class="sample-details-header__hashtag">${wedding.hashtag}</span></div>` 
        : '';

    const displayNames = wedding.primary_side === 'groom' 
        ? `${wedding.groom_name} & ${wedding.bride_name}` 
        : `${wedding.bride_name} & ${wedding.groom_name}`;

    leftSide.innerHTML = `
        <h1 class="sample-details-header__title">${displayNames}</h1>
        <p class="sample-details-header__date">Date: <strong>${formattedDate}</strong></p>
        ${hashtagHTML}
    `;

    const rightSide = document.createElement("div");
    rightSide.className = "sample-details-header__right";

    const inviteUrl = `#sample-web-invites-preview?id=${wedding.id}`;

    let instagramHTML = '';
    if (wedding.instagram) {
        let igUrl = wedding.instagram.startsWith('http') ? wedding.instagram : `https://instagram.com/${wedding.instagram.replace('@', '')}`;
        let handle = wedding.instagram.trim().replace('@', ''); 

        instagramHTML = `
            <a href="${igUrl}" target="_blank" class="sample-details-header__instagram-btn" title="Instagram">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M8 0C5.829 0 5.556.01 4.703.048 3.85.088 3.269.222 2.76.42a3.917 3.917 0 0 0-1.417.923A3.927 3.927 0 0 0 .42 2.76C.222 3.268.087 3.85.048 4.7.01 5.555 0 5.827 0 8.001c0 2.172.01 2.444.048 3.297.04.852.174 1.433.372 1.942.205.526.478.972.923 1.417.444.445.89.719 1.416.923.51.198 1.09.333 1.942.372C5.555 15.99 5.827 16 8 16s2.444-.01 3.298-.048c.851-.04 1.434-.174 1.943-.372a3.916 3.916 0 0 0 1.416-.923c.445-.445.718-.891.923-1.417.197-.509.332-1.09.372-1.942C15.99 10.445 16 10.173 16 8s-.01-2.445-.048-3.299c-.04-.851-.175-1.433-.372-1.941a3.926 3.926 0 0 0-.923-1.417A3.911 3.911 0 0 0 13.24.42c-.51-.198-1.092-.333-1.943-.372C10.443.01 10.172 0 7.998 0h.003zm-.717 1.442h.718c2.136 0 2.389.007 3.232.046.78.035 1.204.166 1.486.275.373.145.64.319.92.599.28.28.453.546.598.92.11.281.24.705.275 1.485.039.843.047 1.096.047 3.231s-.008 2.389-.047 3.232c-.035.78-.166 1.203-.275 1.485a2.47 2.47 0 0 1-.599.919c-.28.28-.546.453-.92.598-.282.11-.705.24-1.485.276-.843.038-1.096.047-3.232.047s-2.39-.009-3.233-.047c-.78-.036-1.203-.166-1.485-.276a2.478 2.478 0 0 1-.92-.598 2.48 2.48 0 0 1-.6-.92c-.109-.281-.24-.705-.275-1.485-.038-.843-.046-1.096-.046-3.233 0-2.136.008-2.388.046-3.231.036-.78.166-1.204.276-1.486.145-.373.319-.64.599-.92.28-.28.546-.453.92-.598.282-.11.705-.24 1.485-.276.738-.034 1.024-.044 2.515-.045v.002zm4.988 1.328a.96.96 0 1 0 0 1.92.96.96 0 0 0 0-1.92zm-4.27 1.122a4.109 4.109 0 1 0 0 8.217 4.109 4.109 0 0 0 0-8.217zm0 1.441a2.667 2.667 0 1 1 0 5.334 2.667 2.667 0 0 1 0-5.334z"/>
                </svg>
                ${handle}
            </a>
        `;
    }

    const webInviteHTML = wedding.has_web_invite ? `
        <a href="${inviteUrl}" target="_blank" class="sample-details-header__invite-btn">
            <i data-lucide="external-link"></i> Wedding Invitation
        </a>` : '';

    rightSide.innerHTML = `${instagramHTML} ${webInviteHTML}`;
    header.appendChild(leftSide);
    header.appendChild(rightSide);
    return header;
}

function buildMockStats(wedding, eventsCount, guestsCount, hosts, canViewAll) {
    const container = document.createElement("div");
    container.className = "sample-details-stats-container";

    const topRow = document.createElement("div");
    topRow.className = "sample-details-stats-top";
    
    topRow.innerHTML = `
        <div class="sample-details-stat-card sample-details-stat-card--flex1">
            <div>
                <p class="sample-details-stat-label">Family Name</p>
                <p class="sample-details-stat-value">${wedding.family_name}</p>
            </div>
            <div class="sample-details-stat-icon-wrap">
                <i data-lucide="home"></i>
            </div>
        </div>
        <div class="sample-details-stat-card sample-details-stat-card--flex2">
            <div>
                <p class="sample-details-stat-label">Family Details</p>
                <p class="sample-details-stat-value sample-details-stat-value--details">${wedding.family_details}</p>
            </div>
            <div class="sample-details-stat-icon-wrap">
                <i data-lucide="users"></i>
            </div>
        </div>
    `;
    container.appendChild(topRow);

    const bottomGrid = document.createElement("div");
    bottomGrid.className = "sample-details-stats-grid";

    let hostRowsHTML = hosts.map(host => `
        <div class="sample-details-host-row">
            <span class="sample-details-host-name">${host.name} - ${host.phone}</span>
        </div>
    `).join('');

    let bottomCardsHTML = `
        <div class="sample-details-stat-card sample-details-stat-card--column">
            <p class="sample-details-stat-label">Wedding Host Details</p>
            ${hostRowsHTML}
        </div>
    `;

    if (canViewAll) {
        bottomCardsHTML += `
            <div class="sample-details-stat-card">
                <div>
                    <p class="sample-details-stat-label">Total Guests</p>
                    <p class="sample-details-stat-value sample-details-stat-value--large">${guestsCount}</p>
                </div>
                <div class="sample-details-stat-icon-wrap">
                    <i data-lucide="users"></i>
                </div>
            </div>
        `;
    }

    bottomCardsHTML += `
        <div class="sample-details-stat-card">
            <div>
                <p class="sample-details-stat-label">Total Events</p>
                <p class="sample-details-stat-value sample-details-stat-value--large">${eventsCount}</p>
            </div>
            <div class="sample-details-stat-icon-wrap">
                <i data-lucide="calendar"></i>
            </div>
        </div>
    `;

    bottomGrid.innerHTML = bottomCardsHTML;
    container.appendChild(bottomGrid);
    return container;
}

function buildMockEvents(events) {
    const section = document.createElement("div");
    section.className = "sample-details-card-section";

    const headerRow = document.createElement("div");
    headerRow.className = "sample-details-section-header";
    headerRow.innerHTML = `<h3 class="sample-details-section-title">Event Itinerary</h3>`;
    section.appendChild(headerRow);

    const content = document.createElement("div");
    section.appendChild(content);

    const formatTime = (timeStr) => {
        if (!timeStr) return '';
        const [hoursStr, minutesStr] = timeStr.split(':');
        let h = parseInt(hoursStr, 10);
        if (isNaN(h)) return timeStr;
        const m = minutesStr || '00';
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
    };

    const groupedEvents = events.reduce((groups, ev) => {
        const dateString = new Date(ev.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
        if (!groups[dateString]) groups[dateString] = [];
        groups[dateString].push(ev);
        return groups;
    }, {});

    let htmlContent = `<div class="sample-details-timeline-wrap">`;
    htmlContent += `<div class="sample-details-timeline-line"></div>`;
    
    Object.entries(groupedEvents).forEach(([dateLabel, dayEvents], groupIdx) => {
        htmlContent += `
            <div class="sample-details-timeline-day ${groupIdx > 0 ? 'sample-details-timeline-day--subsequent' : ''}">
                <div class="sample-details-timeline-dot"></div>
                <h3 class="sample-details-timeline-day-title">${dateLabel}</h3>
            </div>
        `;
        
        dayEvents.forEach(ev => {
            const venueHTML = ev.venue_map_link 
                ? `<a href="${ev.venue_map_link}" target="_blank" class="sample-details-event-card__venue-link">${ev.venue}</a>`
                : `<span>${ev.venue}</span>`;

            htmlContent += `
                <div class="sample-details-event-card">
                    <div class="sample-details-event-card__dot"></div>
                    <h4 class="sample-details-event-card__title">${ev.event_name || ev.title || 'Untitled Event'}</h4>
                    <div class="sample-details-event-card__meta">
                        <div class="sample-details-event-card__meta-item"><i data-lucide="clock"></i> ${formatTime(ev.time)}</div>
                        <div class="sample-details-event-card__meta-item"><i data-lucide="map-pin"></i> ${venueHTML}</div>
                    </div>
                </div>
            `;
        });
    });
    htmlContent += `</div>`;
    content.innerHTML = htmlContent;
    return section;
}

function buildMockList(title, items) {
    const section = document.createElement("div");
    section.className = "sample-details-card-section";

    let searchQuery = '';
    const sectionId = title.toLowerCase().replace(/\s+/g, '-');

    const headerRow = document.createElement("div");
    headerRow.className = "sample-details-section-header";
    headerRow.innerHTML = `
        <h3 class="sample-details-section-title">${title}</h3>
        <div class="sample-details-section-search">
            <i data-lucide="search" class="sample-details-section-search-icon"></i>
            <input type="text" id="search-${sectionId}" placeholder="Search ..." class="sample-details-section-search-input">
        </div>
    `;
    section.appendChild(headerRow);

    const listContent = document.createElement("div");
    section.appendChild(listContent);

    const renderListItems = () => {
        const query = searchQuery.toLowerCase();
        const filtered = items.filter(item => 
            (item.name || '').toLowerCase().includes(query) || (item.phone || '').includes(query)
        );

        if (filtered.length === 0) {
            listContent.innerHTML = `<div class="sample-details-empty-state">No records match your search.</div>`;
            return;
        }

        let html = `
            <div class="sample-details-table-scroll-container">
                <div class="sample-details-table-inner--simple">
                    <div class="sample-details-table-header--simple">
                        <div>S.No</div>
                        <div>Name</div>
                        <div>Phone Number</div>
                        <div></div>
                    </div>
        `;

        html += filtered.map((item, index) => `
            <div class="sample-details-table-row-wrap">
                <div class="sample-details-table-row--simple">
                    <div class="sample-details-col-sno">${index + 1}</div>
                    <div class="sample-details-col-name">${item.name}</div>
                    <div class="sample-details-col-phone">
                        <i data-lucide="phone"></i> <span>${item.phone}</span>
                    </div>
                    <div></div>
                </div>
            </div>
        `).join('');

        html += `
                </div>
            </div>
        `;

        listContent.innerHTML = html;
        if (window.lucide) window.lucide.createIcons();
    };

    setTimeout(() => {
        const searchInput = section.querySelector(`#search-${sectionId}`);
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                searchQuery = e.target.value;
                renderListItems();
            });
        }
        renderListItems();
    }, 0);

    return section;
}

function buildMockGuests(guests, events) {
    const section = document.createElement("div");
    section.className = "sample-details-card-section";

    let currentPage = 1;
    const itemsPerPage = 10;
    let searchQuery = '';

    const headerRow = document.createElement("div");
    headerRow.className = "sample-details-section-header";
    headerRow.innerHTML = `
        <h3 class="sample-details-section-title">Wedding Guests</h3>
        <div class="sample-details-section-search">
            <i data-lucide="search" class="sample-details-section-search-icon"></i>
            <input type="text" id="mockGuestSearch" placeholder="Search ..." class="sample-details-section-search-input">
        </div>
    `;
    section.appendChild(headerRow);

    const content = document.createElement("div");
    section.appendChild(content);

    const renderGuestsPage = () => {
        const filteredGuests = guests.filter(g => {
            const query = searchQuery.toLowerCase();
            return (g.name || '').toLowerCase().includes(query) || (g.phone || '').includes(query);
        });

        const totalPages = Math.ceil(filteredGuests.length / itemsPerPage) || 1;
        if (currentPage > totalPages) currentPage = totalPages;

        const startIndex = (currentPage - 1) * itemsPerPage;
        const paginatedGuests = filteredGuests.slice(startIndex, startIndex + itemsPerPage);

        if (paginatedGuests.length === 0) {
            content.innerHTML = `<div class="sample-details-empty-state">No guests match your search.</div>`;
            return;
        }

        let listHTML = `
            <div class="sample-details-table-scroll-container">
                <div class="sample-details-table-inner--guests">
                    <div class="sample-details-guests-header">
                        <div></div>
                        <div>S.No</div>
                        <div>Name</div>
                        <div>Phone Number</div>
                        <div>Events</div>
                        <div></div>
                    </div>
        `;

        listHTML += paginatedGuests.map((guest, index) => {
            const globalIndex = startIndex + index + 1;
            const guestEvents = events.filter(e => guest.invited_events.includes(e.id));
            guestEvents.sort((a, b) => new Date(a.date + 'T' + (a.time || '00:00:00')).getTime() - new Date(b.date + 'T' + (b.time || '00:00:00')).getTime());

            const eventsTags = guestEvents.map(e => `
                <span class="sample-details-guest-event-tag">
                    <i data-lucide="calendar"></i> ${e.event_name || e.title}
                </span>
            `).join('');

            return `
            <div class="sample-details-table-row-wrap">
                <div class="sample-details-guests-row">
                    <button class="toggle-events-mock-btn sample-details-guests-toggle-btn" data-target="child-mock-${guest.id}">
                        <i data-lucide="chevron-right"></i>
                    </button>
                    <div class="sample-details-col-sno">${globalIndex}</div>
                    <div class="sample-details-col-name">${guest.name}</div>
                    <div class="sample-details-col-phone">
                        <i data-lucide="phone"></i> <span>${guest.phone}</span>
                    </div>
                    <div class="sample-details-col-count">${guestEvents.length}</div>
                    <div></div>
                </div>
                <div id="child-mock-${guest.id}" class="sample-details-guests-child">
                    <div class="sample-details-guests-child-title">Events Invited To:</div>
                    <div class="sample-details-guests-child-tags">${eventsTags}</div>
                </div>
            </div>`;
        }).join('');

        listHTML += `
                </div>
            </div>
            <div class="sample-details-pagination-bar">
                <div class="sample-details-pagination-info">Showing ${startIndex + 1} to ${Math.min(startIndex + itemsPerPage, filteredGuests.length)} of ${filteredGuests.length} guests</div>
        `;

        if (totalPages > 1) {
            listHTML += `
                <div class="sample-details-pagination-controls">
                    <button class="mock-pagination-btn sample-details-page-btn" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}><i data-lucide="chevron-left"></i></button>
                    <span class="sample-details-page-indicator">Page ${currentPage} of ${totalPages}</span>
                    <button class="mock-pagination-btn sample-details-page-btn" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}><i data-lucide="chevron-right"></i></button>
                </div>
            `;
        } else {
            listHTML += `<div></div>`;
        }

        listHTML += `</div>`;
        content.innerHTML = listHTML;

        setTimeout(() => {
            content.querySelectorAll('.toggle-events-mock-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const targetId = btn.getAttribute('data-target');
                    const childRow = document.getElementById(targetId);
                    const icon = btn.querySelector('i, svg');
                    if (childRow.style.display === 'none' || !childRow.style.display) {
                        childRow.style.display = 'block';
                        if (icon) icon.style.transform = 'rotate(90deg)';
                    } else {
                        childRow.style.display = 'none';
                        if (icon) icon.style.transform = 'rotate(0deg)';
                    }
                });
            });

            content.querySelectorAll('.mock-pagination-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    if (btn.hasAttribute('disabled')) return;
                    currentPage = parseInt(btn.getAttribute('data-page'));
                    renderGuestsPage();
                });
            });

            if (window.lucide) window.lucide.createIcons();
        }, 0);
    };

    setTimeout(() => {
        const searchInput = section.querySelector('#mockGuestSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                searchQuery = e.target.value;
                currentPage = 1; 
                renderGuestsPage();
            });
        }
        renderGuestsPage();
    }, 0);

    return section;
}