let isThemeReady = false; 
const currentThemeRGB = { main: '29, 78, 216', accent: '96, 165, 250', bgDark: '15, 23, 42' };
let currentThemeColors = { main: '#1d4ed8', bgDark: '#0f172a', bgLight: '#eff6ff', accent: '#60a5fa' };

let sampleWeddingConfig = {};
let sampleEventsData = [];

function formatWeddingDateRange(startIso, endIso) {
    if (!startIso || !endIso) return "Dates TBD";
    const start = new Date(startIso);
    const end = new Date(endIso);
    const sDay = start.getDate();
    const eDay = end.getDate();
    const getSuffix = (day) => {
        if (day > 3 && day < 21) return 'th';
        switch (day % 10) { case 1: return "st"; case 2: return "nd"; case 3: return "rd"; default: return "th"; }
    };
    const sMonth = start.toLocaleString("en-US", { month: "short" });
    const eMonth = end.toLocaleString("en-US", { month: "short" });
    const year = start.getFullYear();

    if (startIso === endIso) return `${sDay}${getSuffix(sDay)} ${start.toLocaleString("en-US", { month: "long" })}, ${year}`;
    if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) return `${sDay}${getSuffix(sDay)} - ${eDay}${getSuffix(eDay)} ${start.toLocaleString("en-US", { month: "long" })}, ${year}`;
    return `${sDay}${getSuffix(sDay)} ${sMonth} - ${eDay}${getSuffix(eDay)} ${eMonth}, ${year}`;
}

function setupMockData(inviteId) {
    const today = new Date();
    const addD = (days) => { const d = new Date(today); d.setDate(d.getDate() + days); return d; };
    const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    let rawEvents = [];

    if (inviteId === 'sample-upcoming') {
        const start = fmt(addD(30)); const mid = fmt(addD(31)); const end = fmt(addD(32));
        const endDateStr = new Date(end).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase();
        
        sampleWeddingConfig = {
            familyLastName: "THE PATEL FAMILY", primarySide: "groom",
            bride: { firstName: "Neha", letters: "Neha".split(''), grandfather: "Late Shri. Babulal Shah", grandmother: "Smt. Sarojdevi Shah", father: "Mr. Amit Shah", mother: "Mrs. Priya Shah" },
            groom: { firstName: "Rahul", letters: "Rahul".split(''), grandfather: "Late Shri. Ramesh Patel", grandmother: "Smt. Kanta Patel", father: "Mr. Sanjay Patel", mother: "Mrs. Seema Patel" },
            hashtag: "#RahulKiNeha", mainDatePlace: endDateStr, timerTarget: `${end}T11:00:00`,
            instagram: "@rahulpatel", instaLink: "https://instagram.com/rahulpatel",
            story: "Two souls, one beautiful journey. Join us as we celebrate our love and begin our forever together.", familyDetails: "Patel & Shah Families"
        };
        rawEvents = [
            { id: 'e1', name: 'Welcome Hi-Tea', title: 'FAMILIES UNITED', quote: '"Two families, one celebration, and countless bonds being made."', description: 'A warm and joyful tradition where both families come together, exchange greetings, and celebrate the union of two hearts.', start_time: `${start}T16:00:00`, venue: 'Royal Palace Hall, Jaipur' },
            { id: 'e2', name: 'Mehendi Celebration', title: 'DRAWN WITH LOVE', quote: '"Intricate patterns, endless laughter, and love etched on our hands."', description: 'A beautiful afternoon of mehendi, music, laughter, and togetherness as we celebrate the bride-to-be and the journey ahead.', start_time: `${start}T19:00:00`, venue: 'Royal Palace Hall, Jaipur' },
            { id: 'e3', name: 'Sangeet Night', title: 'RHYTHMS OF LOVE', quote: '"Where families unite on the dance floor and stars light up the stage."', description: 'An evening of music, dance, performances, and celebration as our families come together to make memories.', start_time: `${mid}T18:30:00`, venue: 'Royal Palace Hall, Jaipur' },
            { id: 'e4', name: 'Pheras & Wedding Lunch', title: 'PROMISES FOR A LIFETIME', quote: '"Seven steps, seven promises, and a bond for seven lifetimes."', description: 'The heart of the wedding ceremony where the couple circles the holy fire, sealing their eternal commitment and love for one another.', start_time: `${end}T11:00:00`, venue: 'Royal Palace Hall, Jaipur' }
        ];
    } else if (inviteId === 'sample-archived') {
        const start = fmt(addD(-45)); const mid = fmt(addD(-44)); const end = fmt(addD(-43));
        const endDateStr = new Date(end).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase();
        
        sampleWeddingConfig = {
            familyLastName: "THE GUPTA FAMILY", primarySide: "bride",
            bride: { firstName: "Isha", letters: "Isha".split(''), grandfather: "Late Shri. Babulal Gupta", grandmother: "Smt. Sarojdevi Gupta", father: "Mr. Rajesh Gupta", mother: "Mrs. Priya Gupta" },
            groom: { firstName: "Karan", letters: "Karan".split(''), grandfather: "Late Shri. Ramesh Malhotra", grandmother: "Smt. Kanta Malhotra", father: "Mr. Suresh Malhotra", mother: "Mrs. Seema Malhotra" },
            hashtag: "#IshaWedsKaran", mainDatePlace: endDateStr, timerTarget: `${end}T19:00:00`,
            instagram: "@ishagupta", instaLink: "https://instagram.com/ishagupta",
            story: "Two souls, one beautiful journey. Join us as we celebrate our love and begin our forever together.", familyDetails: "Gupta & Malhotra Families"
        };
        rawEvents = [
            { id: 'e1', name: 'Welcome Dinner', title: 'FAMILIES UNITED', quote: '"Two families, one celebration, and countless bonds being made."', description: 'A warm and joyful tradition where both families come together, exchange greetings, and celebrate the union of two hearts.', start_time: `${start}T20:00:00`, venue: 'City Club Main Banquet, Mumbai' },
            { id: 'e2', name: 'Haldi & Puja', title: 'THE GOLDEN GLOW', quote: '"Sun-kissed hues, playful splashes, and a radiant bridal glow."', description: 'A vibrant celebration filled with turmeric, laughter, love and blessing them with joy, protection, and a radiant glow.', start_time: `${mid}T09:30:00`, venue: 'City Club Main Banquet, Mumbai' },
            { id: 'e3', name: 'Sangeet Evening', title: 'RHYTHMS OF LOVE', quote: '"Where families unite on the dance floor and stars light up the stage."', description: 'An evening of music, dance, performances, and celebration as our families come together to make memories.', start_time: `${mid}T19:00:00`, venue: 'City Club Main Banquet, Mumbai' },
            { id: 'e4', name: 'Grand Reception', title: 'A GRAND CELEBRATION', quote: '"Raising a toast to love, laughter, and our happily ever after."', description: 'A glamorous evening to celebrate the newlywed couple with family, friends, great food, and unforgettable memories.', start_time: `${end}T19:00:00`, venue: 'City Club Main Banquet, Mumbai' }
        ];
    } else {
        const start = fmt(addD(-1)); const mid1 = fmt(addD(0)); const mid2 = fmt(addD(1)); const end = fmt(addD(2));
        const endDateStr = new Date(end).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase();
        
        sampleWeddingConfig = {
            familyLastName: "THE SHARMA FAMILY", primarySide: "bride",
            bride: { firstName: "Ananya", letters: "Ananya".split(''), grandfather: "Late Shri. Babulal Sharma", grandmother: "Smt. Sarojdevi Sharma", father: "Mr. Amit Sharma", mother: "Mrs. Priya Sharma" },
            groom: { firstName: "Vikram", letters: "Vikram".split(''), grandfather: "Late Shri. Ramesh Verma", grandmother: "Smt. Kanta Verma", father: "Mr. Suresh Verma", mother: "Mrs. Seema Verma" },
            hashtag: "#AnanyaWedsVikram", mainDatePlace: endDateStr, timerTarget: `${end}T18:00:00`,
            instagram: "@ananyasharma", instaLink: "https://instagram.com/ananyasharma",
            story: "Two souls, one beautiful journey. Join us as we celebrate our love and begin our forever together.", familyDetails: "Sharma & Verma Families"
        };
        rawEvents = [
            { id: 'e1', name: 'Engagement Ring Ceremony', title: 'THE PROMISE RING', quote: '"One ring, two hearts, and a lifetime waiting to unfold."', description: 'A beautiful celebration of love and commitment as two hearts make a promise to walk through life together.', start_time: `${start}T17:00:00`, venue: 'Grand Resort Ballroom, Chennai' },
            { id: 'e2', name: 'Haldi & Floral Bath', title: 'THE GOLDEN GLOW', quote: '"Sun-kissed hues, playful splashes, and a radiant bridal glow."', description: 'A vibrant celebration filled with turmeric, laughter, love and blessing them with joy, protection, and a radiant glow.', start_time: `${mid1}T10:30:00`, venue: 'Grand Resort Ballroom, Chennai' },
            { id: 'e3', name: 'Sangeet & Cocktail Night', title: 'RHYTHMS OF LOVE', quote: '"Where families unite on the dance floor and stars light up the stage."', description: 'An evening of music, dance, performances, and celebration as our families come together to make memories.', start_time: `${mid2}T19:00:00`, venue: 'Grand Resort Ballroom, Chennai' },
            { id: 'e4', name: 'Wedding & Reception', title: 'A GRAND CELEBRATION', quote: '"Raising a toast to love, laughter, and our happily ever after."', description: 'A glamorous evening to celebrate the newlywed couple with family, friends, great food, and unforgettable memories.', start_time: `${end}T18:00:00`, venue: 'Grand Resort Ballroom, Chennai' }
        ];
    }

    sampleEventsData = rawEvents.map((ev, index) => {
        const evDate = new Date(ev.start_time);
        return {
            id: `event-${ev.id}`, 
            label: ev.name, 
            title: ev.title, 
            subtitle: "", 
            quote: ev.quote, 
            description: ev.description,
            month: evDate.toLocaleString('en-US', { month: 'short' }).toUpperCase(), 
            day: evDate.getDate().toString(),
            dateText: evDate.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
            time: evDate.toLocaleTimeString('en-US', { hour: '2-digit', minute:'2-digit' }) + " onwards",
            location: ev.venue, 
            directions: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ev.venue)}`,
            nextTarget: index < rawEvents.length - 1 ? `#event-${rawEvents[index+1].id}` : "#about-us",
            nextLabel: index < rawEvents.length - 1 ? rawEvents[index+1].name : "About Us"
        };
    });
}

function hexToRgb(hex) {
    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '255, 255, 255';
}

function generateInitialsLogo(name1, name2, colors) {
    const strokeColor = colors ? colors.accent : '#a8d4ff'; 
    return 'data:image/svg+xml;base64,' + btoa(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><circle cx="100" cy="100" r="90" fill="none" stroke="${strokeColor}" stroke-width="4" stroke-dasharray="10 5"/><circle cx="100" cy="100" r="80" fill="none" stroke="${strokeColor}" stroke-width="1"/><text x="75" y="125" font-family="'Lucida Handwriting', cursive, serif" font-size="70" fill="#ffffff" text-anchor="middle">${name1.charAt(0).toUpperCase()}</text><text x="125" y="125" font-family="'Lucida Handwriting', cursive, serif" font-size="70" fill="#ffffff" text-anchor="middle">${name2.charAt(0).toUpperCase()}</text></svg>`);
}

function generateDynamicLogo(name1, name2, colors) {
    const strokeColor = colors ? colors.accent : '#ffffff'; 
    return 'data:image/svg+xml;base64,' + btoa(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><circle cx="100" cy="100" r="90" fill="none" stroke="${strokeColor}" stroke-width="2"/><circle cx="100" cy="100" r="82" fill="none" stroke="${strokeColor}" stroke-width="1" stroke-dasharray="4 4"/><text x="100" y="85" font-family="'Lucida Handwriting', cursive, serif" font-size="28" fill="#ffffff" text-anchor="middle">${name1.split(' ')[0]}</text><text x="100" y="115" font-family="sans-serif" font-size="20" fill="${strokeColor}" text-anchor="middle" font-style="italic">&amp;</text><text x="100" y="145" font-family="'Lucida Handwriting', cursive, serif" font-size="28" fill="#ffffff" text-anchor="middle">${name2.split(' ')[0]}</text></svg>`);
}

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

export async function renderSampleWebInvites() {
    let hashSplit = window.location.hash.split('?');
    let inviteId = 'sample-inprogress';
    if(hashSplit.length > 1) {
        const urlParams = new URLSearchParams(hashSplit[1]);
        if(urlParams.get('id')) inviteId = urlParams.get('id');
    }

    setupMockData(inviteId);

    await Promise.all([
        loadCSS('web-invite-splash-styles', '/global/css/splash.css'),
        loadCSS('web-invite-base-styles', '/global/css/invite.css')
    ]);

    let selectedThemeName = 'blue';
    if(inviteId === 'sample-upcoming') selectedThemeName = 'gold';
    if(inviteId === 'sample-archived') selectedThemeName = 'pink';

    const themePalettes = {
        blue:   { main: '#1d4ed8', bgDark: '#0f172a', bgLight: '#eff6ff', accent: '#60a5fa' },
        gold:   { main: '#b45309', bgDark: '#451a03', bgLight: '#fffbeb', accent: '#fbbf24' },
        pink:   { main: '#be185d', bgDark: '#500724', bgLight: '#fdf2f8', accent: '#f472b6' }
    };
    
    currentThemeColors = themePalettes[selectedThemeName] || themePalettes.blue;
    currentThemeRGB.main = hexToRgb(currentThemeColors.main); 
    currentThemeRGB.accent = hexToRgb(currentThemeColors.accent); 
    currentThemeRGB.bgDark = hexToRgb(currentThemeColors.bgDark);

    const dynamicStyle = document.getElementById('invite-dynamic-style') || document.createElement('style');
    dynamicStyle.id = 'invite-dynamic-style';
    dynamicStyle.innerHTML = `
        :root {
            --color-primary: ${currentThemeColors.main};
            --color-secondary: ${currentThemeColors.accent};
            --color-bg-dark: ${currentThemeColors.bgDark};
            --theme-accent-rgb: ${currentThemeRGB.accent};
            --theme-bg-dark-rgb: ${currentThemeRGB.bgDark};
        }
        body {
            background-image: url('global/images/background/${selectedThemeName}-background.png');
        }
    `;
    document.head.appendChild(dynamicStyle);
    
    const isBridePrimary = sampleWeddingConfig.primarySide === 'bride';
    const primaryFirstName = isBridePrimary ? sampleWeddingConfig.bride.firstName : sampleWeddingConfig.groom.firstName;
    const secondaryFirstName = isBridePrimary ? sampleWeddingConfig.groom.firstName : sampleWeddingConfig.bride.firstName;

    const dynamicLogoUri = generateDynamicLogo(primaryFirstName, secondaryFirstName, currentThemeColors);
    const initialsLogoUri = generateInitialsLogo(primaryFirstName, secondaryFirstName, currentThemeColors);

    document.querySelectorAll("link[rel*='icon']").forEach(el => el.remove());
    const linkIcon = document.createElement('link'); 
    linkIcon.rel = 'icon'; 
    linkIcon.type = 'image/svg+xml';
    linkIcon.href = initialsLogoUri;
    document.head.appendChild(linkIcon);

    document.title = `Invitation - ${primaryFirstName} & ${secondaryFirstName}`;

    document.body.setAttribute('data-theme', selectedThemeName);
    document.body.classList.add('theme-loaded');
    isThemeReady = true;

    document.body.innerHTML = `
        <div class="bg-image"></div>
        <canvas id="particles"></canvas>
        <div class="nav-dots"></div>

        <div id="splash-screen">
            <div class="envelope">      
                <div class="envelope-flap" id="env-flap"></div>
                <div id="seal-container">
                    <div class="wax-seal">
                        <img id="seal-logo-img" src="${dynamicLogoUri}" alt="Seal Logo" height="150" width="130" style="opacity: 1; object-fit: contain;">
                    </div>
                    <p class="seal-label">Tap to Open</p>
                </div>
            </div>
        </div>

        <main id="main-content-area"></main>
        <button class="back-to-top hidden" data-target="#welcome">↑</button>
        <audio id="bgMusic" src="global/audio/jashn-e-bahara-instrumental.mp3" loop preload="auto"></audio>
    `;

    const seal = document.getElementById("seal-container");
    if (seal) {
        seal.classList.add('ready'); 
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
    setTimeout(initParticles, 100);
}

const generateWelcomeHTML = () => {
    const isBridePrimary = sampleWeddingConfig.primarySide === 'bride';
    const primaryLettersArray = isBridePrimary ? sampleWeddingConfig.bride.letters : sampleWeddingConfig.groom.letters;
    const secondaryLettersArray = isBridePrimary ? sampleWeddingConfig.groom.letters : sampleWeddingConfig.bride.letters;

    const primaryLetters = primaryLettersArray.map(l => `<span class="letter">${l}</span>`).join('');
    const secondaryLetters = secondaryLettersArray.map(l => `<span class="letter">${l}</span>`).join('');

    const primaryFirstName = isBridePrimary ? sampleWeddingConfig.bride.firstName : sampleWeddingConfig.groom.firstName;
    const secondaryFirstName = isBridePrimary ? sampleWeddingConfig.groom.firstName : sampleWeddingConfig.bride.firstName;
    
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
                    <div class="tagline" style="font-size: 2.5rem; font-weight:bold; margin-bottom: 6px;">${sampleWeddingConfig.familyLastName}</div>
                    <div class="tagline" style="font-size: 1.5rem; font-weight:bold; margin-bottom: 6px;">Wedding Invitation</div>
                    <div class="hero-divider"></div>
                    
                    <img src="${initialsLogoUri}" alt="Logo" class="couple-logo" />
                    
                    <h1 class="names">
                        <span class="word word-left">${primaryLetters}</span>
                        <span class="amp">&amp;</span>
                        <span class="word word-right">${secondaryLetters}</span>
                    </h1>
                    
                    ${sampleWeddingConfig.hashtag ? `<div class="hashtag-line-last">${sampleWeddingConfig.hashtag}</div>` : ''}
                    
                    <div class="hero-divider"></div>
                    <div class="hero-date-place">${sampleWeddingConfig.mainDatePlace}</div>
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
            <div class="couple-role" style="font-size: 1.5rem; font-weight: bold;">Bride</div>
            <div class="hero-divider"></div>
            <div class="couple-name">${sampleWeddingConfig.bride.firstName}</div>
            <p class="couple-role"><br/><br/><strong>Granddaughter of</strong></p><div class="hero-divider"></div>
            <div class="tagline" style="color: #ffffff !important; line-height: 1.6; font-size: 1.05rem; text-transform: none; letter-spacing: normal; text-shadow: none !important;">
                ${sampleWeddingConfig.bride.grandfather}<br/>
                ${sampleWeddingConfig.bride.grandmother}
            </div>
            <br/><p class="couple-role"><strong>Daughter of</strong></p><div class="hero-divider"></div>
            <div class="tagline" style="color: #ffffff !important; line-height: 1.6; font-size: 1.05rem; text-transform: none; letter-spacing: normal; text-shadow: none !important;">
                ${sampleWeddingConfig.bride.father}<br/>
                ${sampleWeddingConfig.bride.mother}
            </div>
        </div>
    `;

    const groomCard = `
        <div class="couple-card groom-card">
            <div class="couple-role" style="font-size: 1.5rem; font-weight: bold;">Groom</div>
            <div class="hero-divider"></div>
            <div class="couple-name">${sampleWeddingConfig.groom.firstName}</div>
            <p class="couple-role"><br/><br/><strong>Grandson of</strong></p><div class="hero-divider"></div>
            <div class="tagline" style="color: #ffffff !important; line-height: 1.6; font-size: 1.05rem; text-transform: none; letter-spacing: normal; text-shadow: none !important;">
                ${sampleWeddingConfig.groom.grandfather}<br/>
                ${sampleWeddingConfig.groom.grandmother}
            </div>
            <br/><p class="couple-role"><strong>Son of</strong></p><div class="hero-divider"></div>
            <div class="tagline" style="color: #ffffff !important; line-height: 1.6; font-size: 1.05rem; text-transform: none; letter-spacing: normal; text-shadow: none !important;">
                ${sampleWeddingConfig.groom.father}<br/>
                ${sampleWeddingConfig.groom.mother}
            </div>
        </div>
    `;

    const isBridePrimary = sampleWeddingConfig.primarySide === 'bride';
    const coupleSplitContent = isBridePrimary ? (brideCard + groomCard) : (groomCard + brideCard);

    return `
    <section class="full-page js-reveal" id="couple">
        <div class="card">
            <div class="flower-corner flower-top-left"></div><div class="flower-corner flower-top-right"></div><div class="flower-corner flower-bottom-left"></div><div class="flower-corner flower-bottom-right"></div>
            <div class="garland-top"></div>
            <div class="card-inner">
                <div class="hero">
                    <div class="tagline" style="font-size:2.4rem;font-weight:bold;">The Couple</div>
                    <div class="hero-divider"></div>
                    <div class="couple-split">
                        ${coupleSplitContent}
                    </div>
                </div>
            </div>
            <div class="hero-divider"></div>
            <div class="card-footer"><button class="btn btn-secondary" data-next="${sampleEventsData.length > 0 ? '#' + sampleEventsData[0].id : '#about-us'}">Next: ${sampleEventsData.length > 0 ? sampleEventsData[0].label : 'About Us'} ↓</button></div>
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
                    <div class="tagline" style="font-size: 2.4rem; font-weight: bold; text-transform: uppercase;">${event.label}</div>
                    
                    ${event.title ? `
                        <div class="hero-divider" style="margin: 15px auto;"></div>
                        <div class="tagline" style="font-size: 1.4rem; font-family: 'Georgia', serif; font-weight: bold; color: #ffffff !important; text-transform: uppercase; text-shadow: none !important;">${event.title}</div>
                    ` : ''}

                    <br/>
                    
                    ${event.quote ? `
                        <div class="event-subtitle" style="font-style: italic; font-size: 1.1rem; padding: 0 10px; margin-top: 10px;">${event.quote}</div>
                    ` : ''}
                    
                    <div class="hero-divider" style="margin: 20px auto;"></div>
                    
                    <div class="event-meta" style="margin-top: 15px; margin-bottom: 25px; display: flex; flex-direction: column; align-items: center; gap: 15px;">
                        <div class="event-row" style="display: flex; align-items: center; justify-content: center; gap: 12px;">
                            <div class="calendar-icon" style="min-width: 44px;"><span class="cal-month">${event.month}</span><span class="cal-day">${event.day}</span></div>
                            <span class="event-value" style="font-size: 1.3rem; font-weight: bold; color: #ffffff !important; text-shadow: none !important;">${event.dateText}</span>
                        </div>
                        <div class="event-row" style="display: flex; align-items: center; justify-content: center; gap: 12px;">
                            <span style="font-size: 1.4rem; min-width: 44px; text-align: center;">⏰</span>
                            <span class="event-value" style="font-size: 1.3rem; font-weight: bold; color: #ffffff !important; text-shadow: none !important;">${event.time}</span>
                        </div>
                        <div class="event-row" style="display: flex; align-items: center; justify-content: center; gap: 12px;">
                            <span style="font-size: 1.4rem; min-width: 44px; text-align: center; color: var(--color-secondary);">📍</span>
                            <span class="event-value" style="font-size: 1.3rem; font-weight: bold; color: #ffffff !important; text-shadow: none !important; text-align: center;">${event.location}</span>
                        </div>
                    </div>
                    
                    <div class="cta" style="margin-top: 20px;">
                        <a class="btn" href="${event.directions}" target="_blank" rel="noopener noreferrer" style="padding: 10px 28px; font-size: 0.95rem; border-radius: 999px;">Get Directions</a>
                    </div>
                    
                    ${event.description ? `
                        <div class="hero-divider" style="margin: 25px auto;"></div>
                        <p class="event-text" style="font-size: 1.05rem; color: #ffffff !important; padding: 0 15px; line-height: 1.6; text-shadow: none !important;">${event.description}</p>
                    ` : ''}
                </div>
            </div>
            <div class="hero-divider" style="margin: 20px auto;"></div>
            <div class="card-footer"><button class="btn btn-secondary" data-next="${event.nextTarget}">Next: ${event.nextLabel} ↓</button></div>
        </div>
    </section>`;

const generateAboutUsHTML = () => {
    const familyDetailsText = sampleWeddingConfig.familyDetails ? sampleWeddingConfig.familyDetails.toUpperCase() : "OUR FAMILY";

    let instaHandle = sampleWeddingConfig.instagram || "";
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
                    <div class="tagline" style="font-size:2.4rem; font-weight:bold; letter-spacing: 0.15em;">ABOUT US</div>
                    <div class="hero-divider"></div>
                    
                    <div class="event-subtitle" style="font-size: 1.1rem; line-height: 1.6; padding: 0 10px;">
                        ${sampleWeddingConfig.story.replace(/\n/g, '<br/>')}
                    </div>
                    
                    <div style="margin-top: 15px; display: flex; flex-direction: column; align-items: center; gap: 10px;">
                        <p class="event-subtitle" style="font-size: 1.3rem; margin-bottom:12px;">Follow our journey for latest updates & gossips!</p>
                        ${sampleWeddingConfig.instagram ? `
                        <a href="${sampleWeddingConfig.instaLink}" target="_blank" class="btn" style="font-weight: bold; font-size: 1.25rem; background: linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888) !important; border: none !important; padding: 12px 26px; display: flex; align-items: center; gap: 10px; color: white !important;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="#ffffff" viewBox="0 0 16 16"><path d="M8 0C5.829 0 5.556.01 4.703.048 3.85.088 3.269.222 2.76.42a3.917 3.917 0 0 0-1.417.923A3.927 3.927 0 0 0 .42 2.76C.222 3.268.087 3.85.048 4.7.01 5.555 0 5.827 0 8.001c0 2.172.01 2.444.048 3.297.04.852.174 1.433.372 1.942.205.526.478.972.923 1.417.444.445.89.719 1.416.923.51.198 1.09.333 1.942.372C5.555 15.99 5.827 16 8 16s2.444-.01 3.298-.048c.851-.04 1.434-.174 1.943-.372a3.916 3.916 0 0 0 1.416-.923c.445-.445.718-.891.923-1.417.197-.509.332-1.09.372-1.942C15.99 10.445 16 10.173 16 8s-.01-2.445-.048-3.299c-.04-.851-.175-1.433-.372-1.941a3.926 3.926 0 0 0-.923-1.417A3.911 3.911 0 0 0 13.24.42c-.51-.198-1.092-.333-1.943-.372C10.443.01 10.172 0 7.998 0h.003zm-.717 1.442h.718c2.136 0 2.389.007 3.232.046.78.035 1.204.166 1.486.275.373.145.64.319.92.599.28.28.453.546.598.92.11.281.24.705.275 1.485.039.843.047 1.096.047 3.231s-.008 2.389-.047 3.232c-.035.78-.166 1.203-.275 1.485a2.47 2.47 0 0 1-.599.919c-.28.28-.546.453-.92.598-.282.11-.705.24-1.485.276-.843.038-1.096.047-3.232.047s-2.39-.009-3.233-.047c-.78-.036-1.203-.166-1.485-.276a2.478 2.478 0 0 1-.92-.598 2.48 2.48 0 0 1-.6-.92c-.109-.281-.24-.705-.275-1.485-.038-.843-.046-1.096-.046-3.233 0-2.136.008-2.388.046-3.231.036-.78.166-1.204.276-1.486.145-.373.319-.64.599-.92.28-.28.546-.453.92-.598.282-.11.705-.24 1.485-.276.738-.034 1.024-.044 2.515-.045v.002zm4.988 1.328a.96.96 0 1 0 0 1.92.96.96 0 0 0 0-1.92zm-4.27 1.122a4.109 4.109 0 1 0 0 8.217 4.109 4.109 0 0 0 0-8.217zm0 1.441a2.667 2.667 0 1 1 0 5.334 2.667 2.667 0 0 1 0-5.334z"/></svg>
                            ${instaHandle}
                        </a>
                        ` : ''}
                    </div>
                    
                    <div class="hero-divider" style="margin-top: 30px;"></div>
                    
                    <div class="rsvp" style="margin-top:20px; font-size: 1.1rem; color: #ffffff !important; text-shadow: 0 2px 5px rgba(0,0,0, 0.7);">
                        <strong style="text-transform: uppercase !important;">With Best Compliments From:</strong>
                        <br/><br/>
                        <div style="text-transform: uppercase; font-weight: bold; font-size: 1.4rem; color: var(--color-secondary) !important; letter-spacing: 0.1em; text-shadow: 0 0 8px rgba(var(--theme-accent-rgb), 0.6);">
                            ${familyDetailsText}
                        </div>
                    </div>
                    
                    <div class="hero-divider" style="height: 5px !important; margin-top: 25px;"></div>
                    
                    <div class="rsvp" style="color: #ffffff !important; text-shadow: 0 2px 5px rgba(0,0,0, 0.7);">
                        <strong style="font-size:1.1rem">Created By</strong>
                        <br/><br/>
                        <div class="signature-glow" style="font-weight: bold; font-size: 2.2rem; font-family: 'Best Signature Font', sans-serif; margin-bottom: 4px; color: inherit;">
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
            <div class="card-footer"><button class="btn btn-secondary" data-next="#welcome">Back to Start ↑</button></div>
        </div>
    </section>`;
};

const generateDotHTML = (id, label) => `<div class="nav-dot" data-target="#${id}" data-label="${label}"></div>`;

const injectAllContent = () => {
    const main = document.getElementById('main-content-area');
    const nav = document.querySelector('.nav-dots');
    if (main) main.innerHTML = generateWelcomeHTML() + generateCoupleHTML() + sampleEventsData.map(e => generateEventHTML(e)).join('') + generateAboutUsHTML();
    if (nav) nav.innerHTML = generateDotHTML('welcome', 'Welcome') + generateDotHTML('couple', 'The Couple') + sampleEventsData.map(e => generateDotHTML(e.id, e.label)).join('') + generateDotHTML('about-us', 'About Us');
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
    const target = new Date(sampleWeddingConfig.timerTarget).getTime();
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