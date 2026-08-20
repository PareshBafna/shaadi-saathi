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
        wrapper.style.cssText = "width: 100%; text-align: center; padding: var(--space-8); color: var(--color-text-secondary);";
        wrapper.textContent = "Please log in to view sample wedding details.";
        return wrapper;
    }

    const data = generateSampleData(weddingId);
    let currentViewRole = 'guest'; 

    const wrapper = document.createElement("div");
    wrapper.style.cssText = "width: 100%; box-sizing: border-box; padding-bottom: var(--space-8);";

    const toggleBar = document.createElement("div");
    toggleBar.style.cssText = "display: flex; justify-content: center; gap: 8px; margin-bottom: var(--space-6); background: var(--color-bg); padding: 8px; border-radius: var(--radius-md); border: 1px solid var(--color-border); max-width: 400px; margin-left: auto; margin-right: auto;";
    
    const createToggleBtn = (label, roleVal) => {
        const btn = document.createElement("button");
        btn.innerText = label;
        btn.style.cssText = `flex: 1; padding: 8px 16px; border: none; border-radius: var(--radius-sm); font-size: 0.9rem; font-weight: var(--font-weight-medium); cursor: pointer; transition: all 0.2s;`;
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
            btn.style.background = 'transparent';
            btn.style.color = 'var(--color-text-secondary)';
            btn.style.fontWeight = 'var(--font-weight-medium)';
        });
        const activeBtn = currentViewRole === 'guest' ? btnGuest : (currentViewRole === 'wedding_user' ? btnUser : btnHost);
        activeBtn.style.background = 'var(--color-primary)';
        activeBtn.style.color = 'var(--color-text-on-accent)';
        activeBtn.style.fontWeight = 'var(--font-weight-bold)';
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
            contentContainer.appendChild(buildMockGuests(data.guests, data.events, data.wedding));
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
    header.style.cssText = "display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-8); flex-wrap: wrap; gap: 16px;";
    
    const leftSide = document.createElement("div");
    leftSide.style.cssText = "display: flex; flex-direction: column; gap: var(--space-2);";
    
    const formattedDate = formatWeddingDateRange(wedding.start_date, wedding.end_date);
    const hashtagHTML = wedding.hashtag ? `<div style="margin-top: 4px;"><span style="background: var(--color-primary); color: var(--color-text-on-accent); padding: 4px 12px; border-radius: 16px; font-size: var(--font-size-sm); font-weight: var(--font-weight-medium); letter-spacing: 0.5px; display: inline-flex; align-items: center; height: 28px; box-sizing: border-box;">${wedding.hashtag}</span></div>` : '';

    const displayNames = wedding.primary_side === 'groom' ? `${wedding.groom_name} & ${wedding.bride_name}` : `${wedding.bride_name} & ${wedding.groom_name}`;

    leftSide.innerHTML = `
        <h1 style="font-size: var(--font-size-3xl); font-weight: var(--font-weight-bold); color: var(--color-text-primary); margin: 0;">${displayNames}</h1>
        <p style="color: var(--color-text-secondary); margin: 0; font-size: var(--font-size-base);">Date: <strong style="color: var(--color-primary);">${formattedDate}</strong></p>
        ${hashtagHTML}
    `;

    const rightSide = document.createElement("div");
    rightSide.style.cssText = "display: flex; flex-direction: column; align-items: flex-end; gap: 10px;";

    const inviteUrl = `#sample-web-invites-preview?id=${wedding.id}`;

    const webInviteHTML = wedding.has_web_invite ? `
        <a href="${inviteUrl}" target="_blank" style="background: var(--color-primary); color: var(--color-text-on-accent); padding: 0 16px; height: 36px; border-radius: var(--radius-sm); text-decoration: none; font-size: var(--font-size-sm); font-weight: var(--font-weight-medium); display: inline-flex; align-items: center; gap: 6px; transition: opacity 0.2s; box-sizing: border-box;" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">
            <i data-lucide="external-link" style="width: 14px; height: 14px;"></i> Wedding Invitation
        </a>` : '';

    let instagramHTML = '';
    if (wedding.instagram) {
        let igUrl = wedding.instagram.startsWith('http') ? wedding.instagram : `https://instagram.com/${wedding.instagram.replace('@', '')}`;
        let handle = wedding.instagram.trim().replace('@', ''); 

        instagramHTML = `
            <a href="${igUrl}" target="_blank" style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; text-decoration: none; background: linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888); padding: 0 16px; height: 32px; border-radius: 999px; color: white; transition: opacity 0.2s; box-sizing: border-box; font-size: 0.85rem; font-weight: bold; font-family: sans-serif;" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'" title="Instagram">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M8 0C5.829 0 5.556.01 4.703.048 3.85.088 3.269.222 2.76.42a3.917 3.917 0 0 0-1.417.923A3.927 3.927 0 0 0 .42 2.76C.222 3.268.087 3.85.048 4.7.01 5.555 0 5.827 0 8.001c0 2.172.01 2.444.048 3.297.04.852.174 1.433.372 1.942.205.526.478.972.923 1.417.444.445.89.719 1.416.923.51.198 1.09.333 1.942.372C5.555 15.99 5.827 16 8 16s2.444-.01 3.298-.048c.851-.04 1.434-.174 1.943-.372a3.916 3.916 0 0 0 1.416-.923c.445-.445.718-.891.923-1.417.197-.509.332-1.09.372-1.942C15.99 10.445 16 10.173 16 8s-.01-2.445-.048-3.299c-.04-.851-.175-1.433-.372-1.941a3.926 3.926 0 0 0-.923-1.417A3.911 3.911 0 0 0 13.24.42c-.51-.198-1.092-.333-1.943-.372C10.443.01 10.172 0 7.998 0h.003zm-.717 1.442h.718c2.136 0 2.389.007 3.232.046.78.035 1.204.166 1.486.275.373.145.64.319.92.599.28.28.453.546.598.92.11.281.24.705.275 1.485.039.843.047 1.096.047 3.231s-.008 2.389-.047 3.232c-.035.78-.166 1.203-.275 1.485a2.47 2.47 0 0 1-.599.919c-.28.28-.546.453-.92.598-.282.11-.705.24-1.485.276-.843.038-1.096.047-3.232.047s-2.39-.009-3.233-.047c-.78-.036-1.203-.166-1.485-.276a2.478 2.478 0 0 1-.92-.598 2.48 2.48 0 0 1-.6-.92c-.109-.281-.24-.705-.275-1.485-.038-.843-.046-1.096-.046-3.233 0-2.136.008-2.388.046-3.231.036-.78.166-1.204.276-1.486.145-.373.319-.64.599-.92.28-.28.546-.453.92-.598.282-.11.705-.24 1.485-.276.738-.034 1.024-.044 2.515-.045v.002zm4.988 1.328a.96.96 0 1 0 0 1.92.96.96 0 0 0 0-1.92zm-4.27 1.122a4.109 4.109 0 1 0 0 8.217 4.109 4.109 0 0 0 0-8.217zm0 1.441a2.667 2.667 0 1 1 0 5.334 2.667 2.667 0 0 1 0-5.334z"/>
                </svg>
                ${handle}
            </a>
        `;
    }

    rightSide.innerHTML = `${webInviteHTML} ${instagramHTML}`;
    header.appendChild(leftSide);
    header.appendChild(rightSide);
    return header;
}

function buildMockStats(wedding, eventsCount, guestsCount, hosts, canViewAll) {
    const container = document.createElement("div");
    container.style.cssText = "display: flex; flex-direction: column; gap: var(--space-6); margin-bottom: var(--space-8);";

    const topRow = document.createElement("div");
    topRow.style.cssText = "display: flex; gap: var(--space-6); width: 100%; flex-wrap: wrap;";
    
    topRow.innerHTML = `
        <div class="stat-card" style="flex: 1; min-width: 250px; padding: var(--space-5); display: flex; align-items: center; justify-content: space-between; background: var(--color-white); border: 1px solid var(--color-border); border-radius: var(--radius-lg);">
            <div>
                <p style="color: var(--color-text-secondary); font-size: var(--font-size-sm); margin: 0; font-weight: var(--font-weight-medium);">Family Name</p>
                <p style="color: var(--color-text-primary); font-size: var(--font-size-lg); font-weight: var(--font-weight-bold); margin: 4px 0 0 0;">${wedding.family_name}</p>
            </div>
            <div style="background: var(--color-border); color: var(--color-primary); width: 40px; height: 40px; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center;">
                <i data-lucide="home" style="width: 20px; height: 20px;"></i>
            </div>
        </div>
        <div class="stat-card" style="flex: 2; min-width: 300px; padding: var(--space-5); display: flex; align-items: center; justify-content: space-between; background: var(--color-white); border: 1px solid var(--color-border); border-radius: var(--radius-lg);">
            <div>
                <p style="color: var(--color-text-secondary); font-size: var(--font-size-sm); margin: 0; font-weight: var(--font-weight-medium);">Family Details</p>
                <p style="color: var(--color-text-primary); font-size: var(--font-size-lg); font-weight: var(--font-weight-bold); margin: 4px 0 0 0; line-height: 1.4;">${wedding.family_details}</p>
            </div>
            <div style="background: var(--color-border); color: var(--color-primary); width: 40px; height: 40px; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center;">
                <i data-lucide="users" style="width: 20px; height: 20px;"></i>
            </div>
        </div>
    `;
    container.appendChild(topRow);

    const bottomGrid = document.createElement("div");
    bottomGrid.style.cssText = "display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: var(--space-6);";

    let hostRowsHTML = hosts.map(host => `
        <div style="display: flex; align-items: center; justify-content: space-between; margin-top: var(--space-3); padding-top: var(--space-3); border-top: 1px solid var(--color-border);">
            <span style="color: var(--color-text-primary); font-size: var(--font-size-lg); font-weight: var(--font-weight-bold);">${host.name} - ${host.phone}</span>
        </div>
    `).join('');

    let bottomCardsHTML = `
        <div class="stat-card" style="padding: var(--space-5); display: flex; flex-direction: column; justify-content: center; background: var(--color-white); border: 1px solid var(--color-border); border-radius: var(--radius-lg);">
            <p style="color: var(--color-text-secondary); font-size: var(--font-size-sm); margin: 0; font-weight: var(--font-weight-medium);">Wedding Host Details</p>
            ${hostRowsHTML}
        </div>
    `;

    if (canViewAll) {
        bottomCardsHTML += `
            <div class="stat-card" style="padding: var(--space-5); display: flex; align-items: center; justify-content: space-between; background: var(--color-white); border: 1px solid var(--color-border); border-radius: var(--radius-lg);">
                <div>
                    <p style="color: var(--color-text-secondary); font-size: var(--font-size-sm); margin: 0; font-weight: var(--font-weight-medium);">Total Guests</p>
                    <p style="color: var(--color-text-primary); font-size: var(--font-size-2xl); font-weight: var(--font-weight-bold); margin: 4px 0 0 0;">${guestsCount}</p>
                </div>
                <div style="background: var(--color-border); color: var(--color-primary); width: 40px; height: 40px; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center;">
                    <i data-lucide="users" style="width: 20px; height: 20px;"></i>
                </div>
            </div>
        `;
    }

    bottomCardsHTML += `
        <div class="stat-card" style="padding: var(--space-5); display: flex; align-items: center; justify-content: space-between; background: var(--color-white); border: 1px solid var(--color-border); border-radius: var(--radius-lg);">
            <div>
                <p style="color: var(--color-text-secondary); font-size: var(--font-size-sm); margin: 0; font-weight: var(--font-weight-medium);">Total Events</p>
                <p style="color: var(--color-text-primary); font-size: var(--font-size-2xl); font-weight: var(--font-weight-bold); margin: 4px 0 0 0;">${eventsCount}</p>
            </div>
            <div style="background: var(--color-border); color: var(--color-primary); width: 40px; height: 40px; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center;">
                <i data-lucide="calendar" style="width: 20px; height: 20px;"></i>
            </div>
        </div>
    `;

    bottomGrid.innerHTML = bottomCardsHTML;
    container.appendChild(bottomGrid);
    return container;
}

function buildMockEvents(events) {
    const section = document.createElement("div");
    section.style.cssText = "background: var(--color-white); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-5); margin-bottom: var(--space-6);";

    const headerRow = document.createElement("div");
    headerRow.style.cssText = "display: flex; justify-content: center; align-items: center; margin-bottom: var(--space-5); border-bottom: 1px solid var(--color-border); padding-bottom: var(--space-4);";
    headerRow.innerHTML = `<h3 style="margin:0; font-size: 1.2rem; color: var(--color-text-primary);">Event Itinerary</h3>`;
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

    let htmlContent = `<div style="display: flex; flex-direction: column; position: relative; padding-left: 12px; margin-top: 12px;">`;
    htmlContent += `<div style="position: absolute; left: 16px; top: 12px; bottom: 20px; width: 2px; background: var(--color-border);"></div>`;
    
    Object.entries(groupedEvents).forEach(([dateLabel, dayEvents], groupIdx) => {
        htmlContent += `
            <div style="position: relative; margin-top: ${groupIdx === 0 ? '0' : '24px'}; margin-bottom: 16px; display: flex; align-items: center;">
                <div style="position: absolute; left: -1.5px; width: 10px; height: 10px; border-radius: 50%; background: var(--color-primary); border: 2px solid var(--color-white); z-index: 2;"></div>
                <h3 style="font-size: 1.05rem; font-weight: var(--font-weight-bold); color: var(--color-primary); margin: 0 0 0 24px;">${dateLabel}</h3>
            </div>
        `;
        
        dayEvents.forEach(ev => {
            const venueHTML = ev.venue_map_link 
                ? `<a href="${ev.venue_map_link}" target="_blank" style="line-height: 1.4; color: inherit; text-decoration: underline; text-underline-offset: 2px; transition: color 0.2s;" onmouseover="this.style.color='var(--color-primary)'" onmouseout="this.style.color='inherit'">${ev.venue}</a>`
                : `<span style="line-height: 1.4;">${ev.venue}</span>`;

            htmlContent += `
                <div class="timeline-event-card" style="position: relative; margin-left: 24px; padding: 16px; margin-bottom: 12px; background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-md); display: flex; flex-direction: column; gap: 8px;">
                    <div style="position: absolute; left: -24px; top: 22px; width: 8px; height: 8px; border-radius: 50%; background: var(--color-border); border: 2px solid var(--color-white); z-index: 2;"></div>
                    <h4 style="margin: 0; font-size: 1.05rem; font-weight: var(--font-weight-bold); color: var(--color-text-primary);">${ev.event_name || ev.title || 'Untitled Event'}</h4>
                    <div style="display: flex; gap: 16px; color: var(--color-text-secondary); font-size: var(--font-size-sm); flex-wrap: wrap;">
                        <div style="display: flex; align-items: center; gap: 6px;"><i data-lucide="clock" style="width: 14px; height: 14px;"></i> ${formatTime(ev.time)}</div>
                        <div style="display: flex; align-items: center; gap: 6px;"><i data-lucide="map-pin" style="width: 14px; height: 14px;"></i> ${venueHTML}</div>
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
    section.style.cssText = "background: var(--color-white); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-5); margin-bottom: var(--space-6);";

    section.innerHTML = `
        <div style="display: flex; justify-content: center; align-items: center; margin-bottom: var(--space-5); border-bottom: 1px solid var(--color-border); padding-bottom: var(--space-4);">
            <h3 style="margin:0; font-size: 1.2rem; color: var(--color-text-primary);">${title}</h3>
        </div>
        <div style="display: grid; grid-template-columns: 50px 1.5fr 1fr; align-items: center; padding: 0 var(--space-4) var(--space-2) var(--space-4); border-bottom: 1px solid var(--color-border); margin-bottom: var(--space-2); color: var(--color-text-secondary); font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold); gap: 12px;">
            <div>S.No</div><div>Name</div><div>Phone Number</div>
        </div>
        ${items.map((item, index) => `
            <div style="border: 1px solid var(--color-border); border-radius: var(--radius-sm); margin-bottom: var(--space-2); background: var(--color-bg); overflow: hidden;">
                <div style="display: grid; grid-template-columns: 50px 1.5fr 1fr; align-items: center; padding: var(--space-3) var(--space-4); gap: 12px;">
                    <div style="color: var(--color-text-secondary); font-size: var(--font-size-sm); font-weight: var(--font-weight-medium);">${index + 1}</div>
                    <div style="color: var(--color-text-primary); font-size: 0.95rem; font-weight: var(--font-weight-medium);">${item.name}</div>
                    <div style="display: flex; align-items: center; gap: 6px; color: var(--color-text-secondary); font-size: var(--font-size-sm);">
                        <i data-lucide="phone" style="width: 14px; height: 14px;"></i> ${item.phone}
                    </div>
                </div>
            </div>
        `).join('')}
    `;
    return section;
}

function buildMockGuests(guests, events) {
    const section = document.createElement("div");
    section.style.cssText = "background: var(--color-white); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-5); margin-bottom: var(--space-6);";

    let currentPage = 1;
    const itemsPerPage = 10;
    let searchQuery = '';

    const controlsRow = document.createElement("div");
    controlsRow.style.cssText = "display: flex; justify-content: flex-end; align-items: center; margin-bottom: var(--space-5); border-bottom: 1px solid var(--color-border); padding-bottom: var(--space-4);";
    controlsRow.innerHTML = `
        <div style="position: relative; display: flex; align-items: center; width: 100%; max-width: 300px;">
            <i data-lucide="search" style="position: absolute; left: 10px; width: 16px; height: 16px; color: var(--color-text-muted);"></i>
            <input type="text" id="mockGuestSearch" placeholder="Search ..." style="width: 100%; padding: 0.5rem 0.5rem 0.5rem 32px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); font-size: var(--font-size-sm); background: var(--color-bg); color: var(--color-text-primary); outline: none; transition: border-color 0.2s;">
        </div>
    `;
    section.appendChild(controlsRow);

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

        let listHTML = `
            <div style="display: grid; grid-template-columns: 32px 50px 1.5fr 1fr 1fr; align-items: center; padding: 0 var(--space-4) var(--space-2) var(--space-4); border-bottom: 1px solid var(--color-border); margin-bottom: var(--space-2); color: var(--color-text-secondary); font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold); gap: 12px;">
                <div></div><div>S.No</div><div>Name</div><div>Phone Number</div><div>Events Count</div>
            </div>
        `;

        if (paginatedGuests.length === 0) {
            listHTML += `<div style="text-align: center; padding: var(--space-6); color: var(--color-text-muted); border: 1px dashed var(--color-border); border-radius: var(--radius-sm);">No guests match your search.</div>`;
        }

        listHTML += paginatedGuests.map((guest, index) => {
            const globalIndex = startIndex + index + 1;
            const guestEvents = events.filter(e => guest.invited_events.includes(e.id));
            guestEvents.sort((a, b) => new Date(a.date + 'T' + (a.time || '00:00:00')).getTime() - new Date(b.date + 'T' + (b.time || '00:00:00')).getTime());

            const eventsTags = guestEvents.map(e => `<span style="background: var(--color-border); padding: 4px 10px; border-radius: 16px; font-size: 0.75rem; color: var(--color-text-primary); font-weight: var(--font-weight-medium); display: inline-flex; align-items: center; gap: 4px;"><i data-lucide="calendar" style="width:12px; height:12px;"></i> ${e.event_name || e.title}</span>`).join('');

            return `
            <div style="border: 1px solid var(--color-border); border-radius: var(--radius-sm); margin-bottom: var(--space-2); background: var(--color-bg); overflow: hidden;">
                <div style="display: grid; grid-template-columns: 32px 50px 1.5fr 1fr 1fr; align-items: center; padding: var(--space-3) var(--space-4); transition: background 0.2s ease; gap: 12px;" onmouseover="this.style.background='var(--color-border)';" onmouseout="this.style.background='transparent';">
                    <button class="toggle-events-mock-btn" data-target="child-mock-${guest.id}" style="background: none; border: none; cursor: pointer; color: var(--color-text-muted); padding: 4px; display: flex; align-items: center; justify-content: center;"><i data-lucide="chevron-right" style="width: 18px; height: 18px; transition: transform 0.2s;"></i></button>
                    <div style="color: var(--color-text-secondary); font-size: var(--font-size-sm); font-weight: var(--font-weight-medium);">${globalIndex}</div>
                    <div style="color: var(--color-text-primary); font-size: 0.95rem; font-weight: var(--font-weight-medium);">${guest.name}</div>
                    <div style="display: flex; align-items: center; gap: 6px; color: var(--color-text-secondary); font-size: var(--font-size-sm);"><i data-lucide="phone" style="width: 14px; height: 14px;"></i> ${guest.phone}</div>
                    <div style="color: var(--color-text-secondary); font-size: var(--font-size-sm);">${guestEvents.length} Invited</div>
                </div>
                <div id="child-mock-${guest.id}" style="display: none; padding: var(--space-4) var(--space-4) var(--space-4) 42px; background: var(--color-white); border-top: 1px dashed var(--color-border);">
                    <div style="font-size: 0.75rem; color: var(--color-text-secondary); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: var(--font-weight-semibold);">Events Invited To:</div>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px;">${eventsTags}</div>
                </div>
            </div>`;
        }).join('');

        listHTML += `
            <div style="display: flex; justify-content: space-between; align-items: center; padding-top: var(--space-4); margin-top: var(--space-4); border-top: 1px solid var(--color-border);">
                <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">Showing ${startIndex + 1} to ${Math.min(startIndex + itemsPerPage, filteredGuests.length)} of ${filteredGuests.length} guests</div>
        `;

        if (totalPages > 1) {
            listHTML += `
                <div style="display: flex; gap: 8px; align-items: center;">
                    <button class="mock-pagination-btn" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''} style="background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-sm); padding: 4px 8px; cursor: ${currentPage === 1 ? 'not-allowed' : 'pointer'}; opacity: ${currentPage === 1 ? '0.5' : '1'}; color: var(--color-text-primary); display: flex; align-items: center;"><i data-lucide="chevron-left" style="width: 16px; height: 16px;"></i></button>
                    <span style="font-size: var(--font-size-sm); color: var(--color-text-primary); font-weight: var(--font-weight-medium); padding: 0 8px;">Page ${currentPage} of ${totalPages}</span>
                    <button class="mock-pagination-btn" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''} style="background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-sm); padding: 4px 8px; cursor: ${currentPage === totalPages ? 'not-allowed' : 'pointer'}; opacity: ${currentPage === totalPages ? '0.5' : '1'}; color: var(--color-text-primary); display: flex; align-items: center;"><i data-lucide="chevron-right" style="width: 16px; height: 16px;"></i></button>
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
                    const icon = btn.querySelector('i');
                    if (childRow.style.display === 'none') {
                        childRow.style.display = 'block';
                        icon.style.transform = 'rotate(90deg)';
                    } else {
                        childRow.style.display = 'none';
                        icon.style.transform = 'rotate(0deg)';
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
        const searchInput = document.getElementById('mockGuestSearch');
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