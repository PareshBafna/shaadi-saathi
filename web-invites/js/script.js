// Pointing to your root database API file
import { supabase } from '../../database/js/api.js';

let weddingConfig = {};
let weddingEventsData = [];
let isThemeReady = false; // Locks the particle engine until colors load

// =========================================================================
// ANTI-FLASH PRELOADER: Hides hardcoded blue elements until theme loads
// =========================================================================
const preloaderStyle = document.createElement('style');
preloaderStyle.innerHTML = `
    body:not(.theme-loaded) .bg-image,
    body:not(.theme-loaded) .color-morph,
    body:not(.theme-loaded) .video-overlay,
    body:not(.theme-loaded) #particles,
    body:not(.theme-loaded) .card {
        opacity: 0 !important;
        visibility: hidden !important;
    }
    html, body {
        background-color: #000000 !important; /* Very dark neutral backdrop */
    }
`;
document.head.appendChild(preloaderStyle);

// Global variable to pass converted RGB colors to the canvas animation
let currentThemeRGB = {
    main: '29, 78, 216',   
    accent: '96, 165, 250',
    bgDark: '15, 23, 42'
};

// Helper function to convert Hex to RGB for the canvas particles and CSS glows
function hexToRgb(hex) {
    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '255, 255, 255';
}

// 1. Stacked Full Names for the Splash Screen Envelope Seal
function generateDynamicLogo(name1, name2, colors) {
    const n1 = name1.split(' ')[0]; 
    const n2 = name2.split(' ')[0];
    const strokeColor = colors ? colors.accent : '#a8d4ff'; 
    
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
            <circle cx="100" cy="100" r="90" fill="none" stroke="${strokeColor}" stroke-width="2"/>
            <circle cx="100" cy="100" r="82" fill="none" stroke="${strokeColor}" stroke-width="1" stroke-dasharray="4 4"/>
            <text x="100" y="85" font-family="'Lucida Handwriting', cursive, serif" font-size="28" fill="#ffffff" text-anchor="middle">${n1}</text>
            <text x="100" y="115" font-family="sans-serif" font-size="20" fill="${strokeColor}" text-anchor="middle" font-style="italic">&amp;</text>
            <text x="100" y="145" font-family="'Lucida Handwriting', cursive, serif" font-size="28" fill="#ffffff" text-anchor="middle">${n2}</text>
        </svg>
    `;
    return 'data:image/svg+xml;base64,' + btoa(svg);
}

// Helper to generate initials SVG for the Favicon and First Page Logo Badge
function generateInitialsLogo(name1, name2, colors) {
    const init1 = name1.charAt(0).toUpperCase();
    const init2 = name2.charAt(0).toUpperCase();
    const strokeColor = colors ? colors.accent : '#a8d4ff'; 
    
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
            <circle cx="100" cy="100" r="90" fill="none" stroke="${strokeColor}" stroke-width="4" stroke-dasharray="10 5"/>
            <circle cx="100" cy="100" r="80" fill="none" stroke="${strokeColor}" stroke-width="1"/>
            <text x="75" y="125" font-family="'Lucida Handwriting', cursive, serif" font-size="70" fill="#ffffff" text-anchor="middle">${init1}</text>
            <text x="125" y="125" font-family="'Lucida Handwriting', cursive, serif" font-size="70" fill="#ffffff" text-anchor="middle">${init2}</text>
        </svg>
    `;
    return 'data:image/svg+xml;base64,' + btoa(svg);
}

async function initDynamicInvite() {
    const urlParams = new URLSearchParams(window.location.search);
    const inviteId = urlParams.get('id');
    const guestId = urlParams.get('guest_id'); // Extracting the guest context

    if (!inviteId) {
        document.body.innerHTML = "<div style='display:flex; justify-content:center; align-items:center; height:100vh; background:#000;'><div style='background:rgba(255,255,255,0.1); padding:40px; border-radius:12px; border:1px solid rgba(255,255,255,0.2); text-align:center;'><h1 style='color:white; font-family:sans-serif; margin:0 0 10px 0;'>Invalid Link</h1><p style='color:#ccc; font-family:sans-serif; margin:0;'>No wedding ID was provided.</p></div></div>";
        return;
    }

    window.history.replaceState(null, '', `/invite.html?id=${inviteId}${guestId ? `&guest_id=${guestId}` : ''}`);

    try {
        const { data: wedding, error: wErr } = await supabase.from('weddings').select('*').eq('id', inviteId).single();
        if (wErr || !wedding) {
            document.body.innerHTML = "<div style='display:flex; justify-content:center; align-items:center; height:100vh; background:#000;'><div style='background:rgba(255,255,255,0.1); padding:40px; border-radius:12px; border:1px solid rgba(255,255,255,0.2); text-align:center;'><h1 style='color:white; font-family:sans-serif; margin:0 0 10px 0;'>No Web Invite Found</h1><p style='color:#ccc; font-family:sans-serif; margin:0;'>We couldn't find an invitation for this link.</p></div></div>";
            return;
        }

        const { data: inviteDetails, error: iErr } = await supabase.from('wedding_web_invite').select('*').eq('wedding_id', wedding.id).single();
        if (iErr || !inviteDetails) {
            document.body.innerHTML = "<div style='display:flex; justify-content:center; align-items:center; height:100vh; background:#000;'><div style='background:rgba(255,255,255,0.1); padding:40px; border-radius:12px; border:1px solid rgba(255,255,255,0.2); text-align:center;'><h1 style='color:white; font-family:sans-serif; margin:0 0 10px 0;'>No Web Invite Found</h1><p style='color:#ccc; font-family:sans-serif; margin:0;'>The web invitation details for this wedding have not been set up yet.</p></div></div>";
            return;
        }

        // Handle old database entries natively to prevent bugs
        let rawThemeName = inviteDetails.theme || 'blue';
        const legacyThemeMap = {
            'emerald': 'green',
            'burgundy': 'maroon',
            'rose': 'peach'
        };
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

        // =========================================================================
        // DYNAMIC CSS INJECTOR: Overrides any hardcoded styles in style.css
        // =========================================================================
        const dynamicStyle = document.createElement('style');
        dynamicStyle.innerHTML = `
            :root {
                --color-primary: ${colors.main} !important;
                --color-secondary: ${colors.accent} !important;
                --color-bg-dark: ${colors.bgDark} !important;
                --theme-accent-rgb: ${currentThemeRGB.accent} !important;
                --theme-bg-dark-rgb: ${currentThemeRGB.bgDark} !important;
            }
            
            /* Force Background Image & Color */
            html, body {
                background-color: var(--color-bg-dark) !important;
                background-image: url('web-invites/images/background/${selectedThemeName}-background.png') !important;
                background-size: cover !important;
                background-position: center !important;
                background-attachment: fixed !important;
                background-repeat: no-repeat !important;
            }
            
            /* Ensure the text is readable by applying the dark theme overlay */
            .video-overlay, .color-morph, #splash-screen {
                background: rgba(var(--theme-bg-dark-rgb), 0.75) !important;
            }

            /* Cards & Borders */
            .card {
                background: linear-gradient(145deg, rgba(var(--theme-bg-dark-rgb), 0.95), #000000) !important;
                border: 1px solid var(--color-secondary) !important;
                animation: card-pop 0.9s ease-out, themeGlowPulse 4s ease-in-out 0.8s infinite alternate !important;
            }
            .hero-divider, .event-divider, .garland-top {
                background: var(--color-secondary) !important;
                box-shadow: 0 0 10px var(--color-secondary) !important;
                border-top-color: var(--color-secondary) !important;
            }
            .time-box, .couple-card {
                border: 1px solid var(--color-secondary) !important;
                background: rgba(var(--theme-bg-dark-rgb), 0.6) !important;
                box-shadow: 0 0 15px rgba(var(--theme-accent-rgb), 0.25) !important;
            }
            .calendar-icon {
                background: var(--color-secondary) !important;
                box-shadow: 0 0 10px rgba(var(--theme-accent-rgb), 0.6) !important;
            }
            .calendar-icon .cal-month, .calendar-icon .cal-day {
                color: var(--color-bg-dark) !important;
            }

            /* Glass Orbs (Flower Corners) */
            .flower-corner {
                background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.4), rgba(var(--theme-accent-rgb), 0.2) 50%, rgba(var(--theme-bg-dark-rgb), 0.8) 90%) !important;
                box-shadow: inset 0 0 15px rgba(255, 255, 255, 0.3), 0 0 20px rgba(var(--theme-accent-rgb), 0.5) !important;
            }

            /* Buttons */
            .btn {
                background: radial-gradient(circle at 30% 30%, #ffffff, var(--color-secondary)) !important;
                border: 1px solid rgba(255, 255, 255, 0.4) !important;
                color: var(--color-bg-dark) !important;
                box-shadow: 0 0 15px rgba(var(--theme-accent-rgb), 0.9), 0 0 30px rgba(var(--theme-accent-rgb), 0.8) !important;
            }
            .btn-secondary {
                background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.9), var(--color-secondary)) !important;
                border: 1px solid rgba(255, 255, 255, 0.6) !important;
                color: var(--color-bg-dark) !important;
                box-shadow: 0 0 12px rgba(var(--theme-accent-rgb), 0.85), 0 0 24px rgba(var(--theme-accent-rgb), 0.7) !important;
            }
            .btn-secondary:hover {
                color: #ffffff !important;
                background: rgba(var(--theme-bg-dark-rgb), 0.8) !important;
                border: 1px solid var(--color-secondary) !important;
                box-shadow: 0 0 20px rgba(255, 255, 255, 0.4), 0 0 35px var(--color-secondary) !important;
            }

            /* Envelope */
            .envelope::before { border-bottom-color: var(--color-bg-dark) !important; filter: brightness(1.35) !important; }
            .envelope::after { border-left-color: var(--color-bg-dark) !important; border-right-color: var(--color-bg-dark) !important; filter: brightness(1.0) !important; }
            .envelope-flap { border-top-color: var(--color-bg-dark) !important; filter: brightness(1.2) !important; }
            .wax-seal { background: var(--color-primary) !important; border-color: var(--color-secondary) !important; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.8), 0 0 20px rgba(var(--theme-accent-rgb), 0.8) !important; }

            /* Nav Dots */
            .nav-dots { background: rgba(var(--theme-bg-dark-rgb), 0.35) !important; border-color: rgba(var(--theme-accent-rgb), 0.2) !important; }
            .nav-dot { border-color: var(--color-secondary) !important; background: rgba(var(--theme-bg-dark-rgb), 0.4) !important; }
            .nav-dot.active { background: var(--color-secondary) !important; box-shadow: 0 0 10px var(--color-secondary) !important; border-color: #ffffff !important; }

            /* Custom Keyframes */
            @keyframes themeGlowPulse {
                0% { box-shadow: 0 0 20px rgba(var(--theme-accent-rgb), 0.2), inset 0 0 10px rgba(var(--theme-accent-rgb), 0.1); }
                100% { box-shadow: 0 0 40px rgba(var(--theme-accent-rgb), 0.5), inset 0 0 20px rgba(var(--theme-accent-rgb), 0.3); }
            }
            @keyframes countdownGlow {
                0% { box-shadow: 0 0 8px rgba(var(--theme-accent-rgb), 0.5); }
                100% { box-shadow: 0 0 16px rgba(var(--theme-accent-rgb), 0.8); }
            }
        `;
        document.head.appendChild(dynamicStyle);

        // Tell the CSS and HTML that it's safe to reveal the page
        document.body.setAttribute('data-theme', selectedThemeName);
        document.body.classList.add('theme-loaded');
        
        // Unlock the Canvas Engine so particles can spawn in the correct color
        isThemeReady = true;

        const { data: events } = await supabase.from('events').select('*').eq('wedding_id', wedding.id).order('start_time', { ascending: true });

        // =========================================================================
        // GUEST & ROLE FILTERING LOGIC
        // =========================================================================
        let currentGuest = null;
        if (guestId) {
            const { data: guestData, error: guestErr } = await supabase.from('guests').select('*').eq('id', guestId).single();
            if (!guestErr) currentGuest = guestData;
        }

        const filteredEvents = (events || []).filter(ev => {
            // If the link does not specify a guest, default to showing all events
            if (!guestId) return true;

            const allowedRoles = ev.roles || ev.invited_roles || [];
            const allowedGuests = ev.guests || ev.invited_guests || [];

            // If the event has no role/guest restrictions configured, it is considered open to everyone
            if (allowedRoles.length === 0 && allowedGuests.length === 0) return true;

            // Check if the current guest's role or exact ID matches the event allowances
            const guestRole = currentGuest?.role || currentGuest?.group || currentGuest?.category;
            const roleMatches = guestRole && allowedRoles.includes(guestRole);
            const guestMatches = allowedGuests.includes(guestId);

            return roleMatches || guestMatches;
        });

        const primarySide = (inviteDetails.primary_side || 'groom').toLowerCase();
        const isBridePrimary = primarySide === 'bride';
        const primaryFirstName = isBridePrimary ? wedding.bride_name : wedding.groom_name;
        const secondaryFirstName = isBridePrimary ? wedding.groom_name : wedding.bride_name;

        const dynamicLogoUri = generateDynamicLogo(primaryFirstName, secondaryFirstName, colors);
        const initialsLogoUri = generateInitialsLogo(primaryFirstName, secondaryFirstName, colors);
        
        const link = document.createElement('link');
        link.rel = 'icon';
        link.href = initialsLogoUri;
        document.head.appendChild(link);

        const sealImg = document.getElementById('seal-logo-img');
        if (sealImg) {
            sealImg.src = dynamicLogoUri;
            sealImg.style.opacity = "1";
        }
        
        document.title = `Invitation - ${primaryFirstName} & ${secondaryFirstName}`;

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
            mainDatePlace: `${new Date(wedding.start_date).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`,
            timerTarget: filteredEvents.length > 0 ? filteredEvents[0].start_time : `${wedding.start_date}T10:00:00+05:30`,
            instagram: wedding.instagram || "",
            instaLink: wedding.instagram 
                ? (wedding.instagram.includes('instagram.com') ? wedding.instagram : `https://instagram.com/${wedding.instagram.replace('@','')}`) 
                : "#",
            story: inviteDetails.story_text || '"Two souls, one beautiful journey."'
        };

        weddingEventsData = filteredEvents.map((ev, index) => {
            const evDate = new Date(ev.start_time || ev.date);
            return {
                id: `event-${ev.id}`,
                label: ev.title,
                title: ev.title,
                subtitle: ev.subtitle || "", 
                quote: ev.quote || "", 
                description: ev.description || "",
                month: evDate.toLocaleString('en-US', { month: 'short' }).toUpperCase(),
                day: evDate.getDate().toString(),
                dateText: evDate.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
                time: evDate.toLocaleTimeString('en-US', { hour: '2-digit', minute:'2-digit' }) + " onwards",
                location: ev.venue,
                directions: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ev.venue)}`,
                nextTarget: index < filteredEvents.length - 1 ? `#event-${filteredEvents[index+1].id}` : "#about-us",
                nextLabel: index < filteredEvents.length - 1 ? filteredEvents[index+1].title : "About Us"
            };
        });

        const seal = document.getElementById("seal-container");
        if (seal) seal.classList.add('ready');

    } catch (err) {
        console.error("Error loading invite:", err);
        document.body.innerHTML = `<div style='display:flex; justify-content:center; align-items:center; height:100vh; background:#000;'><div style='background:rgba(255,255,255,0.1); padding:40px; border-radius:12px; border:1px solid rgba(255,255,255,0.2); text-align:center;'><h1 style='color:white; font-family:sans-serif; margin:0 0 10px 0;'>Error</h1><p style='color:#ccc; font-family:sans-serif; margin:0;'>${err.message}</p></div></div>`;
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
                    <div class="tagline" style="font-size: 2.5rem; font-weight:bold; margin-bottom: 6px; color: var(--color-secondary); text-shadow: 0 2px 5px rgba(var(--theme-accent-rgb), 0.7);">${weddingConfig.familyLastName}</div>
                    <div class="tagline" style="font-size: 1.5rem; font-weight:bold; margin-bottom: 6px; color: var(--color-secondary); text-shadow: 0 2px 5px rgba(var(--theme-accent-rgb), 0.7);">Wedding Invitation</div>
                    <div class="hero-divider"></div>
                    
                    <img src="${initialsLogoUri}" alt="Logo" class="couple-logo" style="filter: none;" />
                    
                    <h1 class="names" style="color: #ffffff !important; text-shadow: 0 0 12px rgba(255,255,255,0.4) !important;">
                        <span class="word word-left">${primaryLetters}</span>
                        <span class="amp" style="color: var(--color-secondary) !important; text-shadow: 0 0 12px rgba(var(--theme-accent-rgb), 0.5) !important;">&amp;</span>
                        <span class="word word-right">${secondaryLetters}</span>
                    </h1>
                    
                    ${weddingConfig.hashtag ? `<div class="hashtag-line-last" style="color: var(--color-secondary); text-shadow: 0 2px 5px rgba(var(--theme-accent-rgb), 0.7);">${weddingConfig.hashtag}</div>` : ''}
                    
                    <div class="hero-divider"></div>
                    <div class="hero-date-place" style="color: #ffffff !important; text-shadow: 0 2px 5px rgba(0,0,0,0.8) !important;">${weddingConfig.mainDatePlace}</div>
                    <div class="countdown" id="countdown">
                        <div class="time-box"><div class="time-value" id="days">0</div><div class="time-label" style="color: var(--color-secondary);">Days</div></div>
                        <div class="time-box"><div class="time-value" id="hours">00</div><div class="time-label" style="color: var(--color-secondary);">Hours</div></div>
                        <div class="time-box"><div class="time-value" id="minutes">00</div><div class="time-label" style="color: var(--color-secondary);">Minutes</div></div>
                        <div class="time-box"><div class="time-value" id="seconds">00</div><div class="time-label" style="color: var(--color-secondary);">Seconds</div></div>
                    </div>
                    <div class="hero-divider"></div>
                    <p class="scroll-hint tagline" style="color: #ffffff !important; font-size: 0.8rem; text-transform: none; font-weight: normal; text-shadow: 0 2px 5px rgba(0,0,0,0.8) !important;">Scroll or use the dots to explore each celebration.</p>
                </div>
            </div>
            <div class="card-footer" style="text-align: center;"><button class="btn btn-secondary" data-next="#couple">Next: The Couple ↓</button></div>
        </div>
    </section>`;
};

const generateCoupleHTML = () => `
    <section class="full-page js-reveal" id="couple">
        <div class="card">
            <div class="flower-corner flower-top-left"></div><div class="flower-corner flower-bottom-right"></div>
            <div class="garland-top"></div>
            <div class="card-inner">
                <div class="hero">
                    <div class="tagline" style="font-size:2.4rem;font-weight:bold; color: var(--color-secondary); text-shadow: 0 2px 5px rgba(var(--theme-accent-rgb), 0.7);">The Couple</div>
                    <div class="hero-divider"></div>
                    <div class="couple-split">
                        <div class="couple-card bride-card">
                            <div class="couple-role" style="font-size: 1.5rem; font-weight: bold; color: var(--color-secondary);">Bride</div>
                            <div class="hero-divider"></div>
                            <div class="couple-name" style="color: #ffffff !important; text-shadow: 0 0 12px rgba(255,255,255,0.4) !important;">${weddingConfig.bride.firstName}</div>
                            <p class="couple-role" style="color: var(--color-secondary);"><br/><br/><strong>Granddaughter of</strong></p><div class="hero-divider"></div>
                            <div class="tagline" style="color: #ffffff !important; line-height: 1.6; font-size: 1.05rem; text-transform: none; letter-spacing: normal; text-shadow: none !important;">
                                ${weddingConfig.bride.grandfather}<br/>
                                ${weddingConfig.bride.grandmother}
                            </div>
                            <br/><p class="couple-role" style="color: var(--color-secondary);"><strong>Daughter of</strong></p><div class="hero-divider"></div>
                            <div class="tagline" style="color: #ffffff !important; line-height: 1.6; font-size: 1.05rem; text-transform: none; letter-spacing: normal; text-shadow: none !important;">
                                ${weddingConfig.bride.father}<br/>
                                ${weddingConfig.bride.mother}
                            </div>
                        </div>
                        <div class="couple-card groom-card">
                            <div class="couple-role" style="font-size: 1.5rem; font-weight: bold; color: var(--color-secondary);">Groom</div>
                            <div class="hero-divider"></div>
                            <div class="couple-name" style="color: #ffffff !important; text-shadow: 0 0 12px rgba(255,255,255,0.4) !important;">${weddingConfig.groom.firstName}</div>
                            <p class="couple-role" style="color: var(--color-secondary);"><br/><br/><strong>Grandson of</strong></p><div class="hero-divider"></div>
                            <div class="tagline" style="color: #ffffff !important; line-height: 1.6; font-size: 1.05rem; text-transform: none; letter-spacing: normal; text-shadow: none !important;">
                                ${weddingConfig.groom.grandfather}<br/>
                                ${weddingConfig.groom.grandmother}
                            </div>
                            <br/><p class="couple-role" style="color: var(--color-secondary);"><strong>Son of</strong></p><div class="hero-divider"></div>
                            <div class="tagline" style="color: #ffffff !important; line-height: 1.6; font-size: 1.05rem; text-transform: none; letter-spacing: normal; text-shadow: none !important;">
                                ${weddingConfig.groom.father}<br/>
                                ${weddingConfig.groom.mother}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="hero-divider"></div>
            <div class="card-footer" style="text-align: center;"><button class="btn btn-secondary" data-next="${weddingEventsData.length > 0 ? '#' + weddingEventsData[0].id : '#about-us'}">Next: ${weddingEventsData.length > 0 ? weddingEventsData[0].label : 'About Us'} ↓</button></div>
        </div>
    </section>`;

const generateEventHTML = (event) => `
    <section class="full-page js-reveal" id="${event.id}">
        <div class="card">
            <div class="flower-corner flower-top-left"></div><div class="flower-corner flower-bottom-right"></div>
            <div class="garland-top"></div>
            
            <div class="card-inner">
                <div class="hero">
                    <h2 class="event-title" style="color: #ffffff !important; font-size: 2.2rem; letter-spacing: 0.15em; text-shadow: 0 0 12px rgba(255,255,255,0.4) !important;">${event.title}</h2>
                    
                    ${event.subtitle ? `
                        <div class="hero-divider"></div>
                        <div class="tagline" style="font-size: 1.1rem; font-family: 'Georgia', serif; font-weight: bold; color: #ffffff !important; text-transform: uppercase; text-shadow: none !important;">${event.subtitle}</div>
                    ` : ''}
                    
                    ${event.quote ? `
                        <div class="hero-divider"></div>
                        <div class="event-subtitle" style="font-style: italic; color: #ffffff !important; font-size: 0.95rem; line-height: 1.5; padding: 0 10px; text-shadow: none !important;">"${event.quote}"</div>
                    ` : ''}
                    
                    <div class="hero-divider"></div>
                    
                    <div class="event-meta" style="margin-top: 15px; margin-bottom: 15px;">
                        <div class="event-row" style="justify-content: flex-start; margin-left: 10%;">
                            <div class="calendar-icon" style="min-width: 44px;"><span class="cal-month">${event.month}</span><span class="cal-day">${event.day}</span></div>
                            <span class="event-value" style="padding-left: 12px; font-size: 1.1rem; text-align: left; align-self: center; color: #ffffff !important; text-shadow: none !important;">${event.dateText}</span>
                        </div>
                        <div class="event-row" style="justify-content: flex-start; margin-left: 10%; margin-top: 10px;">
                            <span style="font-size: 1.8rem; min-width: 44px; text-align: center;">⏰</span>
                            <span class="event-value" style="padding-left: 12px; font-size: 1.1rem; text-align: left; align-self: center; color: #ffffff !important; text-shadow: none !important;">${event.time}</span>
                        </div>
                        <div class="event-row" style="justify-content: flex-start; margin-left: 10%; margin-top: 10px;">
                            <span style="font-size: 1.8rem; min-width: 44px; text-align: center;">📍</span>
                            <span class="event-value" style="padding-left: 12px; font-size: 1.1rem; text-align: left; align-self: center; color: #ffffff !important; text-shadow: none !important;">${event.location}</span>
                        </div>
                    </div>
                    
                    <div class="cta" style="margin-top: 20px;">
                        <a class="btn" href="${event.directions}" target="_blank" rel="noopener noreferrer" style="padding: 8px 24px; font-size: 0.9rem;">Get Directions</a>
                    </div>
                    
                    ${event.description ? `
                        <div class="hero-divider" style="margin-top: 20px;"></div>
                        <p class="event-text" style="font-size: 0.95rem; color: #ffffff !important; padding: 0 10px; line-height: 1.6; text-shadow: none !important;">${event.description}</p>
                    ` : ''}
                </div>
            </div>
            <div class="hero-divider"></div>
            <div class="card-footer" style="text-align: center;"><button class="btn btn-secondary" data-next="${event.nextTarget}">Next: ${event.nextLabel} ↓</button></div>
        </div>
    </section>`;

const generateAboutUsHTML = () => {
    // Dynamic family details block
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
                    <div class="tagline" style="font-size:2.4rem; font-weight:bold; letter-spacing: 0.15em; color: var(--color-secondary); text-shadow: 0 2px 5px rgba(var(--theme-accent-rgb), 0.7);">ABOUT US</div>
                    <div class="hero-divider"></div>
                    
                    <div class="event-subtitle" style="font-size: 1.1rem; line-height: 1.6; color: #ffffff !important; padding: 0 10px; text-shadow: none !important;">
                        ${weddingConfig.story.replace(/\n/g, '<br/>')}
                    </div>
                    
                    <div style="margin-top: 15px; display: flex; flex-direction: column; align-items: center; gap: 10px;">
                        <p class="event-subtitle" style="font-size: 1.3rem; margin-bottom:12px; color: #ffffff !important; text-shadow: none !important;">Follow our journey for latest updates & gossips!</p>
                        ${weddingConfig.instagram ? `
                        <a href="${weddingConfig.instaLink}" target="_blank" class="btn" style="font-weight: bold; font-size: 1.25rem; background: linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888) !important; border: none !important; padding: 12px 26px; display: flex; align-items: center; gap: 10px; color: white !important; border-radius: 999px;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="#ffffff" viewBox="0 0 16 16">
                                <path d="M8 0C5.829 0 5.556.01 4.703.048 3.85.088 3.269.222 2.76.42a3.917 3.917 0 0 0-1.417.923A3.927 3.927 0 0 0 .42 2.76C.222 3.268.087 3.85.048 4.7.01 5.555 0 5.827 0 8.001c0 2.172.01 2.444.048 3.297.04.852.174 1.433.372 1.942.205.526.478.972.923 1.417.444.445.89.719 1.416.923.51.198 1.09.333 1.942.372C5.555 15.99 5.827 16 8 16s2.444-.01 3.298-.048c.851-.04 1.434-.174 1.943-.372a3.916 3.916 0 0 0 1.416-.923c.445-.445.718-.891.923-1.417.197-.509.332-1.09.372-1.942C15.99 10.445 16 10.173 16 8s-.01-2.445-.048-3.299c-.04-.851-.175-1.433-.372-1.941a3.926 3.926 0 0 0-.923-1.417A3.911 3.911 0 0 0 13.24.42c-.51-.198-1.092-.333-1.943-.372C10.443.01 10.172 0 7.998 0h.003zm-.717 1.442h.718c2.136 0 2.389.007 3.232.046.78.035 1.204.166 1.486.275.373.145.64.319.92.599.28.28.453.546.598.92.11.281.24.705.275 1.485.039.843.047 1.096.047 3.231s-.008 2.389-.047 3.232c-.035.78-.166 1.203-.275 1.485a2.47 2.47 0 0 1-.599.919c-.28.28-.546.453-.92.598-.282.11-.705.24-1.485.276-.843.038-1.096.047-3.232.047s-2.39-.009-3.233-.047c-.78-.036-1.203-.166-1.485-.276a2.478 2.478 0 0 1-.92-.598 2.48 2.48 0 0 1-.6-.92c-.109-.281-.24-.705-.275-1.485-.038-.843-.046-1.096-.046-3.233 0-2.136.008-2.388.046-3.231.036-.78.166-1.204.276-1.486.145-.373.319-.64.599-.92.28-.28.546-.453.92-.598.282-.11.705-.24 1.485-.276.738-.034 1.024-.044 2.515-.045v.002zm4.988 1.328a.96.96 0 1 0 0 1.92.96.96 0 0 0 0-1.92zm-4.27 1.122a4.109 4.109 0 1 0 0 8.217 4.109 4.109 0 0 0 0-8.217zm0 1.441a2.667 2.667 0 0 1 0-5.334 2.667 2.667 0 0 1 0-5.334z"/>
                            </svg>
                                ${instaHandle}
                            </a>
                            ` : ''}
                    </div>
                    
                    <div class="hero-divider" style="margin-top: 30px;"></div>
                    
                    <div class="rsvp" style="margin-top:20px; font-size: 1.1rem; color: #ffffff !important; text-shadow: 0 2px 5px rgba(0,0,0, 0.7);">
                        <strong style="text-transform: uppercase !important;">
                            With Best Compliments From:
                        </strong>
                        <br/>
                        <br/>
                        <div style="text-transform: uppercase; font-weight: bold; font-size: 1.4rem; color: var(--color-secondary) !important; letter-spacing: 0.1em; text-shadow: 0 0 8px rgba(var(--theme-accent-rgb), 0.6);">
                            ${familyDetailsText}
                        </div>
                    </div>
                    
                    <div class="hero-divider" style="height: 5px !important; margin-top: 25px;"></div>
                    
                    <div class="rsvp" style="color: #ffffff !important; text-shadow: 0 2px 5px rgba(0,0,0, 0.7);">
                        <strong style="font-size:1.1rem">Created By</strong>
                        <br/>
                        <br/>
                        <div class="signature-glow" style="font-weight: bold; font-size: 2.2rem; color: lightblue; font-family: 'Best Signature Font', sans-serif; margin-bottom: 4px;">
                            Paresh Bafna
                        </div>
                        <div style="display: flex !important; justify-content: center !important; margin-top: 25px !important; margin-bottom: 25px !important; gap: 20px !important; align-items: center !important;">
                            <a href="https://pareshbafna-portfolio.pages.dev/" target="_blank">
                                <img src="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/icons/globe.svg" width="30" height="30" style="filter: invert(1); display: block;" alt="Portfolio">
                            </a>
                            <a href="https://www.instagram.com/paresh_bafna_studio/" target="_blank">
                                <img src="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/icons/instagram.svg" width="30" height="30" style="filter: invert(1); display: block;" alt="Instagram">
                            </a>
                            <a href="https://www.instagram.com/web_invites_by_pb/" target="_blank">
                                <img src="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/icons/instagram.svg" width="30" height="30" style="filter: invert(1); display: block;" alt="Instagram">
                            </a>
                            <a href="https://wa.me/919791146838" target="_blank">
                                <img src="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/icons/whatsapp.svg" width="30" height="30" style="filter: invert(1); display: block;" alt="WhatsApp">
                            </a>
                            <a href="tel:+919791146838">
                                <img src="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/icons/telephone-fill.svg" width="30" height="30" style="filter: invert(1); display: block;" alt="Phone">
                            </a>
                            <a href="mailto:pareshbafna26@gmail.com">
                                <img src="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/icons/envelope-fill.svg" width="30" height="30" style="filter: invert(1); display: block;" alt="Email">
                            </a>
                        </div>
                    </div>
                    
                    <div class="hero-divider" style="margin-top: 20px;"></div>
                </div>
            </div>
            <div class="card-footer" style="text-align: center; margin-top: 20px;"><button class="btn btn-secondary" data-next="#welcome">Back to Start ↑</button></div>
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

let triggerBurst;
(function () {
    const canvas = document.getElementById("particles");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let particles = [];
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    window.addEventListener("resize", resize); resize();
    
    const spawnFallingParticle = (customX = null) => {
        if (!isThemeReady) return; // Failsafe
        const isPetal = Math.random() < 0.5;
        const particleColor = isPetal ? `rgba(${currentThemeRGB.main}, 0.85)` : `rgba(${currentThemeRGB.accent}, 0.8)`;
        particles.push({
            x: customX !== null ? customX : Math.random() * canvas.width, y: -50, vx: Math.random() * 2 - 1, vy: Math.random() * 2.5 + 2, 
            size: Math.random() * 14 + 10, color: particleColor, type: isPetal ? "petal" : "heart", 
            rotation: Math.random() * 2, vr: Math.random() * 0.04, isBurst: false
        });
    };
    
    triggerBurst = (x, y, count = 60) => {
        if (!isThemeReady) return; // Failsafe
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
        if (isThemeReady && splash && splash.classList.contains("splash-open") && !e.target.closest('button') && !e.target.closest('.nav-dot')) {
            triggerBurst(e.clientX, e.clientY, 30); 
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
})();

const initNameAnimation = () => {
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
};

const syncNavDots = () => {
    const dots = document.querySelectorAll(".nav-dot");
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => { if (entry.isIntersecting) dots.forEach(d => d.classList.toggle("active", d.getAttribute("data-target") === `#${entry.target.id}`)); });
    }, { rootMargin: "-20% 0px -70% 0px" });
    document.querySelectorAll("section.full-page").forEach(sec => observer.observe(sec));
};

const initButtonListeners = () => {
    document.querySelectorAll("[data-next], .nav-dot, .back-to-top").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.preventDefault();
            setTimeout(() => { document.querySelector(btn.getAttribute("data-next") || btn.getAttribute("data-target") || btn.getAttribute("href"))?.scrollIntoView({ behavior: "smooth", block: "start" }); }, 100);
        });
    });
};

const updateTimer = () => {
    const target = new Date(weddingConfig.timerTarget).getTime();
    const diff = target - Date.now();
    const d = document.getElementById("days"), h = document.getElementById("hours"), m = document.getElementById("minutes"), s = document.getElementById("seconds");
    if (!d || diff <= 0) return;
    d.textContent = Math.floor(diff / 86400000);
    h.textContent = Math.floor((diff % 86400000) / 3600000).toString().padStart(2, "0");
    m.textContent = Math.floor((diff % 3600000) / 60000).toString().padStart(2, "0");
    s.textContent = Math.floor((diff % 60000) / 1000).toString().padStart(2, "0");
};

window.addEventListener('DOMContentLoaded', () => {
    initDynamicInvite();
    
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
                document.body.style.overflow = "auto";
                initButtonListeners(); syncNavDots(); initNameAnimation();
                setInterval(updateTimer, 1000); updateTimer();
            }, 800);

            setTimeout(() => {
                document.querySelectorAll(".js-reveal, section.full-page").forEach(s => s.classList.add("visible"));
                if (triggerBurst) triggerBurst(window.innerWidth / 2, 0, 120); 
            }, 1200);
        });
    }
});

window.addEventListener("scroll", () => {
    document.querySelectorAll(".js-reveal, section.full-page").forEach((sec) => {
        if (sec.getBoundingClientRect().top < window.innerHeight * 0.8) sec.classList.add("visible");
    });
    const btt = document.querySelector(".back-to-top");
    if (btt) btt.classList.toggle("hidden", window.scrollY <= 400);
});