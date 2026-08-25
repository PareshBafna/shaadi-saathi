import { supabase } from '../../database/js/api.js';

let weddingConfig = {};
let weddingEventsData = [];
let isThemeReady = false; 

let currentThemeRGB = { main: '29, 78, 216', accent: '96, 165, 250', bgDark: '15, 23, 42' };

function hexToRgb(hex) {
    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '255, 255, 255';
}

function generateDynamicLogo(name1, name2, colors) {
    const n1 = name1.split(' ')[0]; const n2 = name2.split(' ')[0];
    const strokeColor = colors ? colors.accent : '#a8d4ff'; 
    return 'data:image/svg+xml;base64,' + btoa(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><circle cx="100" cy="100" r="90" fill="none" stroke="${strokeColor}" stroke-width="2"/><circle cx="100" cy="100" r="82" fill="none" stroke="${strokeColor}" stroke-width="1" stroke-dasharray="4 4"/><text x="100" y="85" font-family="'Lucida Handwriting', cursive, serif" font-size="28" fill="#ffffff" text-anchor="middle">${n1}</text><text x="100" y="115" font-family="sans-serif" font-size="20" fill="${strokeColor}" text-anchor="middle" font-style="italic">&amp;</text><text x="100" y="145" font-family="'Lucida Handwriting', cursive, serif" font-size="28" fill="#ffffff" text-anchor="middle">${n2}</text></svg>`);
}

function generateInitialsLogo(name1, name2, colors) {
    const strokeColor = colors ? colors.accent : '#a8d4ff'; 
    return 'data:image/svg+xml;base64,' + btoa(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><circle cx="100" cy="100" r="90" fill="none" stroke="${strokeColor}" stroke-width="4" stroke-dasharray="10 5"/><circle cx="100" cy="100" r="80" fill="none" stroke="${strokeColor}" stroke-width="1"/><text x="75" y="125" font-family="'Lucida Handwriting', cursive, serif" font-size="70" fill="#ffffff" text-anchor="middle">${name1.charAt(0).toUpperCase()}</text><text x="125" y="125" font-family="'Lucida Handwriting', cursive, serif" font-size="70" fill="#ffffff" text-anchor="middle">${name2.charAt(0).toUpperCase()}</text></svg>`);
}

function updateSocialMetaTags(title, description, imageUrl) {
    document.title = title;

    const metaTags = [
        { name: 'description', content: description },
        { property: 'og:type', content: 'website' },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:url', content: window.location.href },
        { property: 'og:image', content: imageUrl },
        { property: 'og:image:secure_url', content: imageUrl },
        { property: 'og:image:type', content: imageUrl.startsWith('data:image/svg') ? 'image/svg+xml' : 'image/png' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: description },
        { name: 'twitter:image', content: imageUrl }
    ];

    metaTags.forEach(tag => {
        const selector = tag.name ? `meta[name="${tag.name}"]` : `meta[property="${tag.property}"]`;
        let el = document.querySelector(selector);
        if (!el) {
            el = document.createElement('meta');
            if (tag.name) el.setAttribute('name', tag.name);
            if (tag.property) el.setAttribute('property', tag.property);
            document.head.appendChild(el);
        }
        el.setAttribute('content', tag.content);
    });

    document.querySelectorAll("link[rel*='icon'], link[rel='image_src'], link[rel='apple-touch-icon']").forEach(el => el.remove());

    const iconLink = document.createElement('link');
    iconLink.rel = 'icon';
    iconLink.type = imageUrl.startsWith('data:image/svg') ? 'image/svg+xml' : 'image/png';
    iconLink.href = imageUrl;
    document.head.appendChild(iconLink);

    const imageSrcLink = document.createElement('link');
    imageSrcLink.rel = 'image_src';
    imageSrcLink.href = imageUrl;
    document.head.appendChild(imageSrcLink);
}

const showSwalError = (title, text, confirmBtnText, redirectUrl) => {
    document.body.innerHTML = '';
    document.body.style.setProperty('background-image', 'none', 'important');
    document.body.style.setProperty('background-color', '#0f172a', 'important');
    document.body.classList.add('theme-loaded'); 

    const navigateTo = () => {
        document.title = "Shaadi Saathi";
        document.querySelectorAll("link[rel*='icon']").forEach(el => el.remove());
        const defaultFavicon = document.createElement('link');
        defaultFavicon.rel = 'icon';
        defaultFavicon.type = 'image/x-icon';
        defaultFavicon.href = `/global/icons/favicon.ico?v=${Date.now()}`;
        document.head.appendChild(defaultFavicon);

        window.location.href = `/${redirectUrl}`;
        window.location.reload();
    };

    if (typeof Swal !== 'undefined') {
        Swal.fire({
            icon: 'error',
            title: title,
            text: text,
            confirmButtonText: confirmBtnText,
            allowOutsideClick: false,
            allowEscapeKey: false,
            confirmButtonColor: '#eab308'
        }).then(() => {
            navigateTo();
        });
    } else {
        alert(`${title}\n\n${text}`);
        navigateTo();
    }
};

async function initDynamicInvite(inviteId) {
    const loginRedirectUrl = '#login';
    const dashboardWeddingsUrl = '#weddings'; 

    const ssUserId = localStorage.getItem('ss_user_id');
    if (!ssUserId) {
        showSwalError("Authentication Required", "Please log in to view this invitation.", "Go Back To Login", loginRedirectUrl);
        return;
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!inviteId || (!uuidRegex.test(inviteId) && inviteId !== '00000000-0000-0000-0000-000000000000')) {
        showSwalError("Invalid Link", "The wedding link is broken or invalid.", "Go Back to Weddings", dashboardWeddingsUrl);
        return;
    }

    try {
        const { data: curUser, error: userErr } = await supabase.from('users').select('*').eq('id', ssUserId).maybeSingle();
        if (userErr || !curUser) {
            showSwalError("Authentication Required", "User session not found. Please log in again.", "Go Back To Login", loginRedirectUrl);
            return;
        }

        const { data: wedding, error: wErr } = await supabase.from('weddings').select('*').eq('id', inviteId).maybeSingle();
        if (wErr || !wedding) {
            showSwalError("Error", "Incorrect wedding details. Please contact Admin.", "Go Back to Weddings", dashboardWeddingsUrl);
            return;
        }

        const { data: inviteDetails, error: iErr } = await supabase.from('wedding_web_invite').select('*').eq('wedding_id', wedding.id).maybeSingle();
        if (iErr || !inviteDetails) {
            showSwalError("Error", "Incorrect wedding details. Please contact Admin.", "Go Back to Weddings", dashboardWeddingsUrl);
            return;
        }

        let rawThemeName = inviteDetails.theme || 'blue';
        const legacyThemeMap = { 'emerald': 'green', 'burgundy': 'maroon', 'rose': 'peach' };
        const selectedThemeName = legacyThemeMap[rawThemeName] || rawThemeName;

        const themePalettes = {
            blue:   { main: '#1d4ed8', bgDark: '#0f172a', bgLight: '#eff6ff', accent: '#60a5fa' },
            green:  { main: '#047857', bgDark: '#064e3b', bgLight: '#ecfdf5', accent: '#34d399' },
            maroon: { main: '#881337', bgDark: '#4c0519', bgLight: '#fff1f2', accent: '#fb7185' },
            gold:   { main: '#b45309', bgDark: '#451a03', bgLight: '#fffbeb', accent: '#fbbf24' },
            peach:  { main: '#be123c', bgDark: '#4c0519', bgLight: '#fff1f2', accent: '#fb7185' },
            violet: { main: '#5b21b6', bgDark: '#2e1065', bgLight: '#f5f3ff', accent: '#a78bfa' },
            purple: { main: '#6b21a8', bgDark: '#3b0764', bgLight: '#faf5ff', accent: '#c084fc' },
            red:    { main: '#b91c1c', bgDark: '#450a0a', bgLight: '#fef2f2', accent: '#f87171' },
            pink:   { main: '#be185d', bgDark: '#500724', bgLight: '#fdf2f8', accent: '#f472b6' }
        };

        const colors = themePalettes[selectedThemeName] || themePalettes.blue;

        currentThemeRGB.main = hexToRgb(colors.main);
        currentThemeRGB.accent = hexToRgb(colors.accent);
        currentThemeRGB.bgDark = hexToRgb(colors.bgDark);

        const dynamicStyle = document.getElementById('invite-dynamic-style') || document.createElement('style');
        dynamicStyle.id = 'invite-dynamic-style';
        dynamicStyle.innerHTML = `
            :root {
                --color-primary: ${colors.main};
                --color-secondary: ${colors.accent};
                --color-bg-dark: ${colors.bgDark};
                --theme-accent-rgb: ${currentThemeRGB.accent};
                --theme-bg-dark-rgb: ${currentThemeRGB.bgDark};
            }
            body {
                background-image: url('global/images/background/${selectedThemeName}-background.png');
            }
        `;
        document.head.appendChild(dynamicStyle);

        document.body.setAttribute('data-theme', selectedThemeName);
        document.body.classList.add('theme-loaded');
        isThemeReady = true;

        const { data: rawHosts } = await supabase.from('wedding_hosts').select('user_id').eq('wedding_id', wedding.id);
        const { data: rawWUsers } = await supabase.from('wedding_users').select('user_id').eq('wedding_id', wedding.id);

        const isCreator = wedding.user_id === curUser.id || curUser.role === 'creator';
        const isHost = (rawHosts || []).some(h => h.user_id === curUser.id);
        const isWeddingUser = (rawWUsers || []).some(w => w.user_id === curUser.id);
        const canViewAll = isCreator || isHost || isWeddingUser;

        const { data: allEvents } = await supabase.from('wedding_events').select('*').eq('wedding_id', wedding.id).order('date', { ascending: true }).order('time', { ascending: true });
        
        let filteredEvents = [];

        if (!canViewAll) {
            const { data: guests } = await supabase.from('guests').select('*').eq('wedding_id', wedding.id);
            
            const cleanPhone = (p) => (p || '').replace(/[^0-9]/g, '').slice(-10);
            const curUserClean = cleanPhone(curUser.phone);
            
            const currentGuest = (guests || []).find(g => cleanPhone(g.phone) === curUserClean);

            if (!currentGuest) {
                showSwalError(
                    "Not Invited", 
                    "Your account is not registered on the guest list for this wedding. Please contact the host if you believe this is a mistake.",
                    "Go Back to Weddings",
                    "#weddings"
                );
                return;
            }

            const { data: eventGuests } = await supabase.from('event_guests').select('*').eq('guest_id', currentGuest.id);
            const invitedEventIds = (eventGuests || []).map(eg => eg.event_id);
            filteredEvents = (allEvents || []).filter(e => invitedEventIds.includes(e.id));
        } else {
            filteredEvents = allEvents || [];
        }

        const primarySide = (inviteDetails.primary_side || 'groom').toLowerCase();
        const isBridePrimary = primarySide === 'bride';
        const primaryFirstName = isBridePrimary ? wedding.bride_name : wedding.groom_name;
        const secondaryFirstName = isBridePrimary ? wedding.groom_name : wedding.bride_name;

        const dynamicLogoUri = generateDynamicLogo(primaryFirstName, secondaryFirstName, colors);
        const initialsLogoUri = generateInitialsLogo(primaryFirstName, secondaryFirstName, colors);
        
        const sealImg = document.getElementById('seal-logo-img');
        if (sealImg) {
            sealImg.src = dynamicLogoUri;
            sealImg.style.opacity = "1";
        }
        
        // Dynamically compute metadata texts & thumbnail
        const familyPrefix = wedding.family_name ? `${wedding.family_name.trim()}'s ` : '';
        const hashtagSuffix = wedding.hashtag ? ` - ${wedding.hashtag.replace(/^#/, '').trim()}` : '';
        const dynamicTitle = `${familyPrefix}Invitation - ${primaryFirstName} Weds ${secondaryFirstName}${hashtagSuffix}`;
        const dynamicDesc = `You are cordially invited to celebrate the wedding of ${primaryFirstName} & ${secondaryFirstName}. Join us on our special day!`;
        const dynamicThumbnail = inviteDetails.thumbnail_url || initialsLogoUri;

        updateSocialMetaTags(dynamicTitle, dynamicDesc, dynamicThumbnail);

        weddingConfig = {
            familyLastName: wedding.family_name ? `${wedding.family_name.toUpperCase()}'S` : "WEDDING",
            rawFamilyName: wedding.family_name || "",
            familyDetails: wedding.family_details || inviteDetails.family_details || "",
            primarySide: primarySide,
            bride: {
                firstName: wedding.bride_name,
                letters: wedding.bride_name.split(''),
                grandfather: inviteDetails.bride_grandfather || "",
                grandmother: inviteDetails.bride_grandmother || "",
                father: inviteDetails.bride_father || "",
                mother: inviteDetails.bride_mother || ""
            },
            groom: {
                firstName: wedding.groom_name,
                letters: wedding.groom_name.split(''),
                grandfather: inviteDetails.groom_grandfather || "",
                grandmother: inviteDetails.groom_grandmother || "",
                father: inviteDetails.groom_father || "",
                mother: inviteDetails.groom_mother || ""
            },
            hashtag: wedding.hashtag,
            mainDatePlace: new Date(wedding.end_date || wedding.start_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase(),
            timerTarget: filteredEvents.length > 0 ? `${filteredEvents[filteredEvents.length - 1].date}T${filteredEvents[filteredEvents.length - 1].time || '23:59:59'}` : `${wedding.end_date || wedding.start_date}T23:59:59`,
            instagram: wedding.instagram || "",
            instaLink: wedding.instagram 
                ? (wedding.instagram.includes('instagram.com') ? wedding.instagram : `https://instagram.com/${wedding.instagram.replace('@','')}`) 
                : "#",
            story: inviteDetails.story_text || '"Two souls, one beautiful journey."'
        };

        weddingEventsData = filteredEvents.map((ev, index) => {
            const timeStr = ev.time && ev.time.length === 5 ? ev.time + ':00' : (ev.time || '00:00:00');
            const evDate = new Date(`${ev.date}T${timeStr}`);
            
            return {
                id: `event-${ev.id}`,
                label: ev.event_name || 'Untitled Event',
                title: ev.title || "",
                subtitle: ev.subtitle || "", 
                quote: ev.one_liner || "", 
                description: ev.description || "",
                month: evDate.toLocaleString('en-US', { month: 'short' }).toUpperCase(),
                day: evDate.getDate().toString(),
                dateText: evDate.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
                time: evDate.toLocaleTimeString('en-US', { hour: '2-digit', minute:'2-digit' }) + " onwards",
                location: ev.venue,
                directions: ev.venue_map_link || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ev.venue)}`,
                nextTarget: index < filteredEvents.length - 1 ? `#event-${filteredEvents[index+1].id}` : "#about-us",
                nextLabel: index < filteredEvents.length - 1 ? (filteredEvents[index+1].event_name || 'Next Event') : "About Us"
            };
        });

        const seal = document.getElementById("seal-container");
        if (seal) seal.classList.add('ready');

    } catch (err) {
        console.error("Error loading invite:", err);
        showSwalError("Error", err?.message || "An unexpected error occurred.", "Go Back to Weddings", "#weddings");
    }
}

const generateWelcomeHTML = () => {
    const isBridePrimary = weddingConfig.primarySide === 'bride';
    const primaryLettersArray = isBridePrimary ? weddingConfig.bride.letters : weddingConfig.groom.letters;
    const secondaryLettersArray = isBridePrimary ? weddingConfig.groom.letters : weddingConfig.bride.letters;
    
    const primaryLetters = primaryLettersArray.map(l => `<span class="letter">${l}</span>`).join('');
    const secondaryLetters = secondaryLettersArray.map(l => `<span class="letter">${l}</span>`).join('');

    const primaryFirstName = isBridePrimary ? weddingConfig.bride.firstName : weddingConfig.groom.firstName;
    const secondaryFirstName = isBridePrimary ? weddingConfig.groom.firstName : weddingConfig.bride.firstName;
    
    const themePalettes = {
        blue:   { accent: '#60a5fa' }, green:  { accent: '#34d399' }, maroon: { accent: '#fb7185' },
        gold:   { accent: '#fbbf24' }, peach:  { accent: '#fb7185' }, violet: { accent: '#a78bfa' },
        purple: { accent: '#c084fc' }, red:    { accent: '#f87171' }, pink:   { accent: '#f472b6' }
    };
    
    let rawThemeName = document.body.getAttribute('data-theme') || 'blue';
    const legacyThemeMap = { 'emerald': 'green', 'burgundy': 'maroon', 'rose': 'peach' };
    const currentTheme = legacyThemeMap[rawThemeName] || rawThemeName;
    
    const initialsLogoUri = generateInitialsLogo(primaryFirstName, secondaryFirstName, themePalettes[currentTheme]);

    return `
    <section class="full-page js-reveal" id="welcome">
        <div class="card">
            <div class="flower-corner flower-top-left"></div><div class="flower-corner flower-top-right"></div><div class="flower-corner flower-bottom-left"></div><div class="flower-corner flower-bottom-right"></div>
            <div class="garland-top"></div>
            <div class="card-inner">
                <div class="hero">
                    <div class="hero-family-name">${weddingConfig.familyLastName}</div>
                    <div class="hero-sub-title">Wedding Invitation</div>
                    <div class="hero-divider"></div>
                    
                    <img src="${initialsLogoUri}" alt="Logo" class="couple-logo" />
                    
                    <h1 class="names">
                        <span class="word word-left">${primaryLetters}</span>
                        <span class="amp">&amp;</span>
                        <span class="word word-right">${secondaryLetters}</span>
                    </h1>
                    
                    ${weddingConfig.hashtag ? `<div class="hashtag-line-last">${weddingConfig.hashtag}</div>` : ''}
                    
                    <div class="hero-divider"></div>
                    <div class="hero-date-place">${weddingConfig.mainDatePlace}</div>
                    <div class="countdown" id="countdown">
                        <div class="time-box"><div class="time-value" id="days">0</div><div class="time-label">Days</div></div>
                        <div class="time-box"><div class="time-value" id="hours">00</div><div class="time-label">Hours</div></div>
                        <div class="time-box"><div class="time-value" id="minutes">00</div><div class="time-label">Minutes</div></div>
                        <div class="time-box"><div class="time-value" id="seconds">00</div><div class="time-label">Seconds</div></div>
                    </div>
                    <div class="hero-divider"></div>
                    <p class="scroll-hint tagline">Scroll or use the dots to explore each celebration.</p>
                </div>
            </div>
            <div class="card-footer"><button class="btn btn-secondary" data-next="#couple">Next: The Couple ↓</button></div>
        </div>
    </section>`;
};

const generateCoupleHTML = () => {
    const brideCard = `
        <div class="couple-card bride-card">
            <div class="couple-role">Bride</div>
            <div class="hero-divider"></div>
            <div class="couple-name">${weddingConfig.bride.firstName}</div>
            <p class="couple-relation-heading"><br/><br/><strong>Granddaughter of</strong></p><div class="hero-divider"></div>
            <div class="couple-family-details">
                ${weddingConfig.bride.grandfather}<br/>
                ${weddingConfig.bride.grandmother}
            </div>
            <br/><p class="couple-relation-heading"><strong>Daughter of</strong></p><div class="hero-divider"></div>
            <div class="couple-family-details">
                ${weddingConfig.bride.father}<br/>
                ${weddingConfig.bride.mother}
            </div>
        </div>
    `;

    const groomCard = `
        <div class="couple-card groom-card">
            <div class="couple-role">Groom</div>
            <div class="hero-divider"></div>
            <div class="couple-name">${weddingConfig.groom.firstName}</div>
            <p class="couple-relation-heading"><br/><br/><strong>Grandson of</strong></p><div class="hero-divider"></div>
            <div class="couple-family-details">
                ${weddingConfig.groom.grandfather}<br/>
                ${weddingConfig.groom.grandmother}
            </div>
            <br/><p class="couple-relation-heading"><strong>Son of</strong></p><div class="hero-divider"></div>
            <div class="couple-family-details">
                ${weddingConfig.groom.father}<br/>
                ${weddingConfig.groom.mother}
            </div>
        </div>
    `;

    const isBridePrimary = weddingConfig.primarySide === 'bride';
    const coupleSplitContent = isBridePrimary ? (brideCard + groomCard) : (groomCard + brideCard);

    return `
    <section class="full-page js-reveal" id="couple">
        <div class="card">
            <div class="flower-corner flower-top-left"></div><div class="flower-corner flower-top-right"></div><div class="flower-corner flower-bottom-left"></div><div class="flower-corner flower-bottom-right"></div>
            <div class="garland-top"></div>
            <div class="card-inner">
                <div class="hero">
                    <div class="section-tagline">The Couple</div>
                    <div class="hero-divider"></div>
                    <div class="couple-split">
                        ${coupleSplitContent}
                    </div>
                </div>
            </div>
            <div class="hero-divider"></div>
            <div class="card-footer"><button class="btn btn-secondary" data-next="${weddingEventsData.length > 0 ? '#' + weddingEventsData[0].id : '#about-us'}">Next: ${weddingEventsData.length > 0 ? weddingEventsData[0].label : 'About Us'} ↓</button></div>
        </div>
    </section>`;
};

const generateEventHTML = (event) => `
    <section class="full-page js-reveal" id="${event.id}">
        <div class="card">
            <div class="flower-corner flower-top-left"></div><div class="flower-corner flower-top-right"></div><div class="flower-corner flower-bottom-left"></div><div class="flower-corner flower-bottom-right"></div>
            <div class="garland-top"></div>
            
            <div class="card-inner">
                <div class="hero">
                    <div class="event-main-label">${event.label}</div>
                    
                    ${event.title ? `
                        <div class="hero-divider"></div>
                        <div class="event-custom-title">${event.title}</div>
                    ` : ''}

                    <br/>
                    
                    ${event.quote ? `
                        <div class="event-quote-text">${event.quote}</div>
                    ` : ''}
                    
                    <div class="hero-divider"></div>
                    
                    <div class="event-meta-container">
                        <div class="event-meta-row">
                            <div class="calendar-icon"><span class="cal-month">${event.month}</span><span class="cal-day">${event.day}</span></div>
                            <span class="event-meta-value">${event.dateText}</span>
                        </div>
                        <div class="event-meta-row">
                            <span class="event-time-icon">⏰</span>
                            <span class="event-meta-value">${event.time}</span>
                        </div>
                        <div class="event-meta-row">
                            <span class="event-location-icon">📍</span>
                            <span class="event-meta-location">${event.location}</span>
                        </div>
                    </div>
                    
                    <div>
                        <a class="btn btn-directions" href="${event.directions}" target="_blank" rel="noopener noreferrer">Get Directions</a>
                    </div>
                    
                    ${event.description ? `
                        <div class="hero-divider"></div>
                        <p class="event-description-text">${event.description}</p>
                    ` : ''}
                </div>
            </div>
            <div class="hero-divider"></div>
            <div class="card-footer"><button class="btn btn-secondary" data-next="${event.nextTarget}">Next: ${event.nextLabel} ↓</button></div>
        </div>
    </section>`;

const generateAboutUsHTML = () => {
    const familyDetailsText = weddingConfig.familyDetails ? weddingConfig.familyDetails.toUpperCase() : "OUR FAMILY";

    let instaHandle = weddingConfig.instagram || "";
    try {
        if(instaHandle.includes('instagram.com/')) {
            const urlParts = instaHandle.split('instagram.com/');
            instaHandle = urlParts[urlParts.length - 1].replace(/\//g, '');
        }
    } catch(e) {}
    instaHandle = instaHandle.replace('@', '').trim();

    return `
    <section class="full-page js-reveal" id="about-us">
        <div class="card">
            <div class="flower-corner flower-top-left"></div><div class="flower-corner flower-top-right"></div><div class="flower-corner flower-bottom-left"></div><div class="flower-corner flower-bottom-right"></div>
            <div class="garland-top"></div>
            <div class="card-inner">
                <div class="hero">
                    <div class="section-tagline">ABOUT US</div>
                    <div class="hero-divider"></div>
                    
                    <div class="event-subtitle">
                        ${weddingConfig.story.replace(/\n/g, '<br/>')}
                    </div>
                    
                    <div class="event-meta-container">
                        <p class="event-follow-title">Follow our journey for latest updates & gossips!</p>
                        ${weddingConfig.instagram ? `
                        <a href="${weddingConfig.instaLink}" target="_blank" class="btn btn-instagram-gradient">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="#ffffff" viewBox="0 0 16 16"><path d="M8 0C5.829 0 5.556.01 4.703.048 3.85.088 3.269.222 2.76.42a3.917 3.917 0 0 0-1.417.923A3.927 3.927 0 0 0 .42 2.76C.222 3.268.087 3.85.048 4.7.01 5.555 0 5.827 0 8.001c0 2.172.01 2.444.048 3.297.04.852.174 1.433.372 1.942.205.526.478.972.923 1.417.444.445.89.719 1.416.923.51.198 1.09.333 1.942.372C5.555 15.99 5.827 16 8 16s2.444-.01 3.298-.048c.851-.04 1.434-.174 1.943-.372a3.916 3.916 0 0 0 1.416-.923c.445-.445.718-.891.923-1.417.197-.509.332-1.09.372-1.942C15.99 10.445 16 10.173 16 8s-.01-2.445-.048-3.299c-.04-.851-.175-1.433-.372-1.941a3.926 3.926 0 0 0-.923-1.417A3.911 3.911 0 0 0 13.24.42c-.51-.198-1.092-.333-1.943-.372C10.443.01 10.172 0 7.998 0h.003zm-.717 1.442h.718c2.136 0 2.389.007 3.232.046.78.035 1.204.166 1.486.275.373.145.64.319.92.599.28.28.453.546.598.92.11.281.24.705.275 1.485.039.843.047 1.096.047 3.231s-.008 2.389-.047 3.232c-.035.78-.166 1.203-.275 1.485a2.47 2.47 0 0 1-.599.919c-.28.28-.546.453-.92.598-.282.11-.705.24-1.485.276-.843.038-1.096.047-3.232.047s-2.39-.009-3.233-.047c-.78-.036-1.203-.166-1.485-.276a2.478 2.478 0 0 1-.92-.598 2.48 2.48 0 0 1-.6-.92c-.109-.281-.24-.705-.275-1.485-.038-.843-.046-1.096-.046-3.233 0-2.136.008-2.388.046-3.231.036-.78.166-1.204.276-1.486.145-.373.319-.64.599-.92.28-.28.546-.453.92-.598.282-.11.705-.24 1.485-.276.738-.034 1.024-.044 2.515-.045v.002zm4.988 1.328a.96.96 0 1 0 0 1.92.96.96 0 0 0 0-1.92zm-4.27 1.122a4.109 4.109 0 1 0 0 8.217 4.109 4.109 0 0 0 0-8.217zm0 1.441a2.667 2.667 0 1 1 0 5.334 2.667 2.667 0 0 1 0-5.334z"/></svg>
                            ${instaHandle}
                        </a>
                        ` : ''}
                    </div>
                    
                    <div class="hero-divider"></div>
                    
                    <div class="rsvp-compliments">
                        <strong class="compliments-title">With Best Compliments From:</strong>
                        <br/><br/>
                        <div class="compliments-family-text">
                            ${familyDetailsText}
                        </div>
                    </div>
                    
                    <div class="hero-divider divider-thick"></div>
                    
                    <div class="rsvp-creator">
                        <strong class="creator-heading">Created By</strong>
                        <br/><br/>
                        <div class="signature-glow">
                            Paresh Bafna
                        </div>
                        <div class="creator-social-links">
                            <a href="https://pareshbafna-portfolio.pages.dev/" target="_blank">
                                <img src="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/icons/globe.svg" width="30" height="30" class="social-icon-img" alt="Portfolio">
                            </a>
                            <a href="https://www.instagram.com/paresh_bafna_studio/" target="_blank">
                                <img src="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/icons/instagram.svg" width="30" height="30" class="social-icon-img" alt="Instagram">
                            </a>
                            <a href="https://www.instagram.com/web_invites_by_pb/" target="_blank">
                                <img src="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/icons/instagram.svg" width="30" height="30" class="social-icon-img" alt="Instagram">
                            </a>
                            <a href="https://wa.me/919791146838" target="_blank">
                                <img src="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/icons/whatsapp.svg" width="30" height="30" class="social-icon-img" alt="WhatsApp">
                            </a>
                            <a href="tel:+919791146838">
                                <img src="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/icons/telephone-fill.svg" width="30" height="30" class="social-icon-img" alt="Phone">
                            </a>
                            <a href="mailto:pareshbafna26@gmail.com">
                                <img src="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/icons/envelope-fill.svg" width="30" height="30" class="social-icon-img" alt="Email">
                            </a>
                        </div>
                    </div>
                    
                    <div class="hero-divider"></div>
                </div>
            </div>
            <div class="card-footer"><button class="btn btn-secondary" data-next="#welcome">Back to Start ↑</button></div>
        </div>
    </section>`;
};

const generateDotHTML = (id, label) => `<div class="nav-dot" data-target="#${id}" data-label="${label}"></div>`;

const injectAllContent = () => {
    const main = document.getElementById('main-content-area');
    const nav = document.querySelector('.nav-dots');
    if (main) main.innerHTML = generateWelcomeHTML() + generateCoupleHTML() + weddingEventsData.map(e => generateEventHTML(e)).join('') + generateAboutUsHTML();
    if (nav) nav.innerHTML = generateDotHTML('welcome', 'Welcome') + generateDotHTML('couple', 'The Couple') + weddingEventsData.map(e => generateDotHTML(e.id, e.label)).join('') + generateDotHTML('about-us', 'About Us');
};

function initNameAnimation() {
    const step = 0.5, start = 1.5;
    const left = document.querySelectorAll('.names .word-left .letter');
    left.forEach((l, i) => l.style.animationDelay = `${start + i * step}s`);
    const amp = document.querySelector('.names .amp');
    let delay = start + (left.length - 1) * step;
    if (amp) { delay += step; amp.style.animationDelay = `${delay}s`; }
    const right = document.querySelectorAll('.names .word-right .letter');
    right.forEach((l, i) => l.style.animationDelay = `${delay + step + i * step}s`);
    const hashtag = document.querySelector('.hashtag-line-last');
    if (hashtag) hashtag.style.animationDelay = `${delay + step + (right.length * step)}s`;
}

function syncNavDots() {
    const dots = document.querySelectorAll(".nav-dot");
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => { if (entry.isIntersecting) dots.forEach(d => d.classList.toggle("active", d.getAttribute("data-target") === `#${entry.target.id}`)); });
    }, { rootMargin: "-20% 0px -70% 0px" });
    document.querySelectorAll("section.full-page").forEach(sec => observer.observe(sec));
}

function initButtonListeners() {
    document.querySelectorAll("[data-next], .nav-dot, .back-to-top").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.preventDefault();
            setTimeout(() => { document.querySelector(btn.getAttribute("data-next") || btn.getAttribute("data-target") || btn.getAttribute("href"))?.scrollIntoView({ behavior: "smooth", block: "start" }); }, 100);
        });
    });
}

function updateTimer() {
    const target = new Date(weddingConfig.timerTarget).getTime();
    const diff = target - Date.now();
    const d = document.getElementById("days"), h = document.getElementById("hours"), m = document.getElementById("minutes"), s = document.getElementById("seconds");
    if (!d || diff <= 0) return;
    d.textContent = Math.floor(diff / 86400000);
    h.textContent = Math.floor((diff % 86400000) / 3600000).toString().padStart(2, "0");
    m.textContent = Math.floor((diff % 3600000) / 60000).toString().padStart(2, "0");
    s.textContent = Math.floor((diff % 60000) / 1000).toString().padStart(2, "0");
}

function initParticles() {
    const canvas = document.getElementById("particles");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let particles = [];
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    window.addEventListener("resize", resize); resize();
    
    const spawnFallingParticle = (customX = null) => {
        if (!isThemeReady) return; 
        const isPetal = Math.random() < 0.5;
        const particleColor = isPetal ? `rgba(${currentThemeRGB.main}, 0.85)` : `rgba(${currentThemeRGB.accent}, 0.8)`;
        particles.push({
            x: customX !== null ? customX : Math.random() * canvas.width, y: -50, vx: Math.random() * 2 - 1, vy: Math.random() * 2.5 + 2, 
            size: Math.random() * 14 + 10, color: particleColor, type: isPetal ? "petal" : "heart", 
            rotation: Math.random() * 2, vr: Math.random() * 0.04, isBurst: false
        });
    };
    
    window.triggerBurst = (x, y, count = 60) => {
        if (!isThemeReady) return; 
        for (let i = 0; i < count; i++) {
            const isPetal = Math.random() < 0.6;
            const particleColor = isPetal ? `rgba(${currentThemeRGB.main}, 0.95)` : `rgba(${currentThemeRGB.accent}, 0.9)`;
            particles.push({
                x: x + (Math.random() * 100 - 50), y: y - 20, vx: Math.random() * 4 - 2, vy: Math.random() * 3 + 2, size: Math.random() * 18 + 10, 
                color: particleColor, type: isPetal ? "petal" : "heart", 
                rotation: Math.random() * Math.PI * 2, vr: Math.random() * 0.1, isBurst: true, life: 0, maxLife: 150
            });
        }
    };
    
    window.addEventListener("click", (e) => {
        const splash = document.getElementById("splash-screen");
        if (isThemeReady && (!splash || splash.style.display === 'none' || splash.classList.contains("splash-open")) && !e.target.closest('button') && !e.target.closest('.nav-dot') && !e.target.closest('a')) {
            window.triggerBurst(e.clientX, e.clientY, 30); 
            for(let i=0; i<15; i++) spawnFallingParticle();
        }
    });
    
    const animate = () => {
        if (isThemeReady && particles.length < 350 && Math.random() < 0.5) spawnFallingParticle();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles = particles.filter(p => {
            p.x += p.vx; p.y += p.vy; p.rotation += p.vr;
            if (p.isBurst && ++p.life > p.maxLife) return false;
            ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rotation);
            ctx.fillStyle = p.color; ctx.beginPath();
            if(p.type === "petal") { ctx.moveTo(0,-p.size*0.5); ctx.quadraticCurveTo(p.size*0.5,-p.size*0.1,0,p.size*0.5); ctx.quadraticCurveTo(-p.size*0.5,-p.size*0.1,0,-p.size*0.5); } 
            else { ctx.moveTo(0, -p.size * 0.25); ctx.bezierCurveTo(-p.size*0.5,-p.size*0.9,-p.size,-p.size*0.1,0,p.size*0.7); ctx.bezierCurveTo(p.size,-p.size*0.1,p.size*0.5,-p.size*0.9,0,-p.size*0.25); }
            ctx.fill(); ctx.restore();
            return p.y < canvas.height + 100;
        });
        requestAnimationFrame(animate);
    };
    animate();
}

window.addEventListener("scroll", () => {
    document.querySelectorAll(".js-reveal, section.full-page").forEach((sec) => {
        if (sec.getBoundingClientRect().top < window.innerHeight * 0.8) sec.classList.add("visible");
    });
    const btt = document.querySelector(".back-to-top");
    if (btt) btt.classList.toggle("hidden", window.scrollY <= 400);
});

function loadCSS(id, href) {
    return new Promise((resolve) => {
        if (document.getElementById(id)) {
            resolve();
            return;
        }
        const link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        link.href = href;
        link.onload = resolve;
        document.head.appendChild(link);
    });
}

export async function renderWebInvitesPreview(inviteId) {
    await Promise.all([
        loadCSS('web-invite-splash-styles', '/global/css/splash.css'),
        loadCSS('web-invite-base-styles', '/global/css/invite.css')
    ]);

    document.body.innerHTML = `
        <div class="bg-image"></div>
        <canvas id="particles"></canvas>
        <div class="nav-dots"></div>

        <div id="splash-screen">
            <div class="envelope">      
                <div class="envelope-flap" id="env-flap"></div>
                <div id="seal-container">
                    <div class="wax-seal">
                        <img id="seal-logo-img" src="" alt="Seal Logo" height="150" width="130">
                    </div>
                    <p class="seal-label">Tap to Open</p>
                </div>
            </div>
        </div>

        <main id="main-content-area"></main>
        <button class="back-to-top hidden" data-target="#welcome">↑</button>
        <audio id="bgMusic" src="global/audio/jashn-e-bahara-instrumental.mp3" loop preload="auto"></audio>
    `;

    initDynamicInvite(inviteId);
    setTimeout(initParticles, 100);

    const seal = document.getElementById("seal-container");
    if (seal) {
        seal.addEventListener("click", () => {
            const bgMusic = document.getElementById("bgMusic");
            if (bgMusic) { bgMusic.volume = 0.6; bgMusic.play().catch(() => {}); }
            
            injectAllContent();
            seal.style.opacity = "0"; seal.style.pointerEvents = "none";
            document.getElementById("env-flap")?.classList.add("flap-open");
            
            setTimeout(() => {
                document.getElementById("splash-screen")?.classList.add("splash-open");
                document.body.style.overflowX = "hidden";
                document.body.style.overflowY = "auto";
                initButtonListeners(); syncNavDots(); initNameAnimation();
                setInterval(updateTimer, 1000); updateTimer();
            }, 800);

            setTimeout(() => {
                document.querySelectorAll(".js-reveal, section.full-page").forEach(s => s.classList.add("visible"));
                if (window.triggerBurst) window.triggerBurst(window.innerWidth / 2, 0, 120); 
            }, 1200);
        });
    }
}