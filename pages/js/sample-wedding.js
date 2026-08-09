// ==========================================
// SAMPLE WEDDING MOCK DATA GENERATOR
// ==========================================
function generateSampleData() {
    const today = new Date();
    
    // Set Day 1 to exactly one week from today
    const day1 = new Date(today);
    day1.setDate(today.getDate() + 7);
    
    const day2 = new Date(day1);
    day2.setDate(day1.getDate() + 1);
    
    const day3 = new Date(day1);
    day3.setDate(day1.getDate() + 2);

    const formatDateString = (dateObj) => {
        const yyyy = dateObj.getFullYear();
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    };

    const d1Str = formatDateString(day1);
    const d2Str = formatDateString(day2);
    const d3Str = formatDateString(day3);

    const wedding = {
        id: 'sample-wedding-123',
        bride_name: 'Shruti',
        groom_name: 'Rohan',
        primary_side: 'groom',
        family_name: 'Jain',
        family_details: 'Sha Rameshji Sureshji Jain',
        hashtag: '#RohanKiShruti',
        instagram: 'https://instagram.com/',
        start_date: d1Str,
        end_date: d3Str
    };

    const events = [
        { id: 'e1', title: 'Paath Bithai', date: d1Str, start_time: `${d1Str}T10:31:00`, venue: 'Terapanti Bhavan, Sowcarpet' },
        { id: 'e2', title: 'Tamil Night', date: d1Str, start_time: `${d1Str}T18:30:00`, venue: 'Terapanti Bhavan, Sowcarpet' },
        { id: 'e3', title: 'Haldi & Carnival', date: d2Str, start_time: `${d2Str}T11:00:00`, venue: 'Pearl Banquet, Pursaiwalkam' },
        { id: 'e4', title: 'Sangeet', date: d2Str, start_time: `${d2Str}T18:00:00`, venue: 'Pearl Banquet, Pursaiwalkam' },
        { id: 'e5', title: 'Baraat', date: d3Str, start_time: `${d3Str}T09:30:00`, venue: 'MRC' },
        { id: 'e6', title: 'Varmala', date: d3Str, start_time: `${d3Str}T10:30:00`, venue: 'MRC' },
        { id: 'e7', title: 'Reception', date: d3Str, start_time: `${d3Str}T11:00:00`, venue: 'MRC' },
        { id: 'e8', title: 'Phera & Vidaai', date: d3Str, start_time: `${d3Str}T14:30:00`, venue: 'MRC' }
    ];

    const hosts = [
        { id: 'h1', name: 'Ramesh Jain', phone: '+919876500001' },
        { id: 'h2', name: 'Suresh Jain', phone: '+919876500002' }
    ];

    const users = [
        { id: 'u1', name: 'Rahul Jain', phone: '+919876500003' },
        { id: 'u2', name: 'Neha Jain', phone: '+919876500004' }
    ];

    const guests = [];
    const firstNames = ["Amit", "Priya", "Rahul", "Anjali", "Karan", "Neha", "Vikram", "Sneha", "Rohit", "Pooja", "Suresh", "Geeta"];
    const lastNames = ["Jain", "Shah", "Mehta", "Patel", "Desai", "Gupta", "Sharma", "Singh"];
    
    const allEventIds = events.map(e => e.id);
    const receptionId = 'e7';

    for (let i = 1; i <= 500; i++) {
        const fn = firstNames[Math.floor(Math.random() * firstNames.length)];
        const ln = lastNames[Math.floor(Math.random() * lastNames.length)];
        
        let invited = [receptionId]; // ALL guests are invited to the reception
        const rand = Math.random();

        if (rand < 0.20) {
            // 20% invited to all events
            invited = [...allEventIds]; 
        } else if (rand < 0.40) {
            // 20% invited to ONLY reception
            invited = [receptionId]; 
        } else if (rand < 0.60) {
            // 20% invited to Baraat and Reception
            invited = ['e5', receptionId]; 
        } else if (rand < 0.80) {
            // 20% invited to Paath Bithai and Reception
            invited = ['e1', receptionId]; 
        } else {
            // 20% invited to a random mix of other events + Reception
            const mix = ['e2', 'e3', 'e4', 'e6'];
            mix.forEach(id => {
                if (Math.random() > 0.5) invited.push(id);
            });
        }

        // Remove duplicates just in case
        invited = [...new Set(invited)];

        guests.push({
            id: `g${i}`,
            name: `${fn} ${ln}`,
            phone: `+919${Math.floor(100000000 + Math.random() * 900000000)}`,
            invited_events: invited
        });
    }

    return { wedding, events, hosts, users, guests };
}

function formatWeddingDateRange(startIso, endIso) {
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

    const sMonth = start.toLocaleString("en-US", { month: "short" });
    const eMonth = end.toLocaleString("en-US", { month: "short" });
    const year = start.getFullYear();

    if (startIso === endIso) {
        return `${sDay}${getSuffix(sDay)} ${start.toLocaleString("en-US", { month: "long" })}, ${year}`;
    }
    
    if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
        return `${sDay}${getSuffix(sDay)} - ${eDay}${getSuffix(eDay)} ${start.toLocaleString("en-US", { month: "long" })}, ${year}`;
    }
    
    return `${sDay}${getSuffix(sDay)} ${sMonth} - ${eDay}${getSuffix(eDay)} ${eMonth}, ${year}`;
}

// ==========================================
// MAIN RENDER FUNCTION
// ==========================================
export function renderSampleWedding() {
    const data = generateSampleData();
    let currentViewRole = 'guest'; // Default view

    const wrapper = document.createElement("div");
    wrapper.style.cssText = "width: 100%; box-sizing: border-box; padding-bottom: var(--space-8);";

    // View Toggle Bar
    const toggleBar = document.createElement("div");
    toggleBar.style.cssText = "display: flex; justify-content: center; gap: 8px; margin-bottom: var(--space-6); background: var(--color-bg); padding: 8px; border-radius: var(--radius-md); border: 1px solid var(--color-border); max-width: 400px; margin-left: auto; margin-right: auto;";
    
    const createToggleBtn = (id, label, roleVal) => {
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

    const btnGuest = createToggleBtn('btn-view-guest', 'Guest View', 'guest');
    const btnUser = createToggleBtn('btn-view-user', 'User View', 'wedding_user');
    const btnHost = createToggleBtn('btn-view-host', 'Host View', 'host');
    
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
        
        // Render Header & Stats
        contentContainer.appendChild(buildMockHeader(data.wedding));
        
        const canViewAll = currentViewRole === 'host' || currentViewRole === 'wedding_user';
        
        contentContainer.appendChild(buildMockStats(data.wedding, data.events.length, data.guests.length, data.hosts, canViewAll));
        contentContainer.appendChild(buildMockEvents(data.events));

        // If Host or User, show the lists
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
    header.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-8);";
    
    const formattedDate = formatWeddingDateRange(wedding.start_date, wedding.end_date);

    header.innerHTML = `
        <div>
            <h1 style="font-size: var(--font-size-3xl); font-weight: var(--font-weight-bold); color: var(--color-text-primary); margin: 0;">${wedding.groom_name} & ${wedding.bride_name}</h1>
            <p style="color: var(--color-text-secondary); margin: var(--space-2) 0 0 0; font-size: var(--font-size-base);">Date: <strong style="color: var(--color-primary);">${formattedDate}</strong></p>
            <div style="display: flex; align-items: center; gap: 8px; margin-top: var(--space-3);">
                <span style="background: var(--color-primary); color: var(--color-text-on-accent); padding: 4px 12px; border-radius: 16px; font-size: var(--font-size-sm); font-weight: var(--font-weight-medium);">${wedding.hashtag}</span>
            </div>
        </div>
    `;
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
        const d = new Date(timeStr);
        let h = d.getHours();
        const m = String(d.getMinutes()).padStart(2, '0');
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
                <h3 style="font-size: 1.05rem; font-weight: var(--font-weight-bold); color: var(--color-primary); margin: 0 0 0 24px;">
                    ${dateLabel}
                </h3>
            </div>
        `;
        
        dayEvents.forEach(ev => {
            htmlContent += `
                <div class="timeline-event-card" style="position: relative; margin-left: 24px; padding: 16px; margin-bottom: 12px; background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-md); display: flex; flex-direction: column; gap: 8px;">
                    <div style="position: absolute; left: -24px; top: 22px; width: 8px; height: 8px; border-radius: 50%; background: var(--color-border); border: 2px solid var(--color-white); z-index: 2;"></div>
                    
                    <h4 style="margin: 0; font-size: 1.05rem; font-weight: var(--font-weight-bold); color: var(--color-text-primary);">${ev.title}</h4>
                    
                    <div style="display: flex; gap: 16px; color: var(--color-text-secondary); font-size: var(--font-size-sm); flex-wrap: wrap;">
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <i data-lucide="clock" style="width: 14px; height: 14px;"></i> ${formatTime(ev.start_time)}
                        </div>
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <i data-lucide="map-pin" style="width: 14px; height: 14px;"></i> <span style="line-height: 1.4;">${ev.venue}</span>
                        </div>
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
            <div>S.No</div>
            <div>Name</div>
            <div>Phone Number</div>
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

function buildMockGuests(guests, events, wedding) {
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
            <input type="text" id="mockGuestSearch" placeholder="Search guests by name or phone..." style="width: 100%; padding: 0.5rem 0.5rem 0.5rem 32px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); font-size: var(--font-size-sm); background: var(--color-bg); color: var(--color-text-primary); outline: none; transition: border-color 0.2s;">
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
                <div></div> 
                <div>S.No</div>
                <div>Name</div>
                <div>Phone Number</div>
                <div>Events Count</div>
            </div>
        `;

        if (paginatedGuests.length === 0) {
            listHTML += `<div style="text-align: center; padding: var(--space-6); color: var(--color-text-muted); border: 1px dashed var(--color-border); border-radius: var(--radius-sm);">No guests match your search.</div>`;
        }

        listHTML += paginatedGuests.map((guest, index) => {
            const globalIndex = startIndex + index + 1;
            
            // Map the randomly assigned event IDs back to their full objects
            const guestEvents = events.filter(e => guest.invited_events.includes(e.id));
            guestEvents.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

            const eventsTags = guestEvents.map(e => `<span style="background: var(--color-border); padding: 4px 10px; border-radius: 16px; font-size: 0.75rem; color: var(--color-text-primary); font-weight: var(--font-weight-medium); display: inline-flex; align-items: center; gap: 4px;"><i data-lucide="calendar" style="width:12px; height:12px;"></i> ${e.title}</span>`).join('');

            return `
            <div style="border: 1px solid var(--color-border); border-radius: var(--radius-sm); margin-bottom: var(--space-2); background: var(--color-bg); overflow: hidden;">
                <div style="display: grid; grid-template-columns: 32px 50px 1.5fr 1fr 1fr; align-items: center; padding: var(--space-3) var(--space-4); transition: background 0.2s ease; gap: 12px;" onmouseover="this.style.background='var(--color-border)';" onmouseout="this.style.background='transparent';">
                    
                    <button class="toggle-events-mock-btn" data-target="child-mock-${guest.id}" style="background: none; border: none; cursor: pointer; color: var(--color-text-muted); padding: 4px; display: flex; align-items: center; justify-content: center;" onmouseover="this.style.color='var(--color-primary)'" onmouseout="this.style.color='var(--color-text-muted)'">
                        <i data-lucide="chevron-right" style="width: 18px; height: 18px; transition: transform 0.2s;"></i>
                    </button>

                    <div style="color: var(--color-text-secondary); font-size: var(--font-size-sm); font-weight: var(--font-weight-medium);">${globalIndex}</div>
                    
                    <div style="color: var(--color-text-primary); font-size: 0.95rem; font-weight: var(--font-weight-medium);">${guest.name}</div>
                    
                    <div style="display: flex; align-items: center; gap: 6px; color: var(--color-text-secondary); font-size: var(--font-size-sm);">
                        <i data-lucide="phone" style="width: 14px; height: 14px;"></i> ${guest.phone}
                    </div>
                    
                    <div style="color: var(--color-text-secondary); font-size: var(--font-size-sm);">
                        ${guestEvents.length} Invited
                    </div>
                </div>

                <div id="child-mock-${guest.id}" style="display: none; padding: var(--space-4) var(--space-4) var(--space-4) 42px; background: var(--color-white); border-top: 1px dashed var(--color-border);">
                    <div style="font-size: 0.75rem; color: var(--color-text-secondary); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: var(--font-weight-semibold);">Events Invited To:</div>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                        ${eventsTags}
                    </div>
                </div>
            </div>`;
        }).join('');

        listHTML += `
            <div style="display: flex; justify-content: space-between; align-items: center; padding-top: var(--space-4); margin-top: var(--space-4); border-top: 1px solid var(--color-border);">
                <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">
                    Showing ${startIndex + 1} to ${Math.min(startIndex + itemsPerPage, filteredGuests.length)} of ${filteredGuests.length} guests
                </div>
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
            const toggleBtns = content.querySelectorAll('.toggle-events-mock-btn');
            toggleBtns.forEach(btn => {
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

            const pageBtns = content.querySelectorAll('.mock-pagination-btn');
            pageBtns.forEach(btn => {
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