export async function onRequest(context) {
    const { request } = context;
    const url = new URL(request.url);
    const inviteId = url.searchParams.get("id");

    if (!inviteId) {
        return context.env.ASSETS.fetch(request);
    }

    // Direct Supabase API configuration
    const SUPABASE_URL = "https://vufhmsosktkxskymfisv.supabase.co/"; 
    const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1Zmhtc29za3RreHNreW1maXN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyMDk1MjgsImV4cCI6MjEwMDc4NTUyOH0.7XRBkwY7dw2nH2Jrvmp4I1M2BZAPv5j_n8cLGIB-hqk";             // Replace with your actual Supabase Anon Key

    // Default Shaadi Saathi Logo
    //const defaultLogoUrl = `${url.origin}/global/logos/logo.png`;
    const defaultLogoUrl = "https://development.shaadi-saathi.pages.dev/global/logos/logo-compressed.png";

    let ogTitle = "";
    let ogDescription = "";
    let ogImage = defaultLogoUrl;
    let dynamicTheme = "blue";

    try {
        const [weddingRes, inviteRes] = await Promise.all([
            fetch(`${SUPABASE_URL}/rest/v1/weddings?id=eq.${inviteId}&select=*`, {
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`
                }
            }),
            fetch(`${SUPABASE_URL}/rest/v1/wedding_web_invite?wedding_id=eq.${inviteId}&select=*`, {
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`
                }
            })
        ]);

        const weddingData = await weddingRes.json();
        const inviteData = await inviteRes.json();

        const wedding = Array.isArray(weddingData) ? weddingData[0] : weddingData;
        const invite = Array.isArray(inviteData) ? inviteData[0] : inviteData;

        if (wedding && (wedding.bride_name || wedding.groom_name)) {
            const familyPrefix = wedding.family_name ? `${wedding.family_name.trim()}'s ` : '';
            const hashtagSuffix = wedding.hashtag ? ` - ${wedding.hashtag.replace(/^#/, '').trim()}` : '';
            
            const primarySide = (invite?.primary_side || 'groom').toLowerCase();
            const isBridePrimary = primarySide === 'bride';

            const name1 = isBridePrimary ? wedding.bride_name : wedding.groom_name;
            const name2 = isBridePrimary ? wedding.groom_name : wedding.bride_name;

            // Formats: "Bafna's Invitation - Lachi Weds Karanji - PDR"
            ogTitle = `${familyPrefix}Invitation - ${name1} Weds ${name2}${hashtagSuffix}`;
            ogDescription = `You are cordially invited to celebrate the wedding of ${name1} & ${name2}. Join us on our special day!`;

            if (invite?.theme) {
                dynamicTheme = invite.theme;
            }
        } else {
            console.error("Wedding not found or empty for ID:", inviteId, weddingData);
        }
    } catch (err) {
        console.error("Failed to query dynamic metadata from Supabase:", err);
    }

    // Safety fallback only if DB returns nothing
    if (!ogTitle) {
        ogTitle = "Wedding Invitation";
        ogDescription = "You are cordially invited to celebrate our wedding. Join us on our special day!";
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${ogTitle}</title>

    <!-- Standard Meta -->
    <meta name="description" content="${ogDescription}">

    <!-- Open Graph (WhatsApp, Facebook, iMessage) -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="${url.href}">
    <meta property="og:title" content="${ogTitle}">
    <meta property="og:description" content="${ogDescription}">
    <meta property="og:image" content="${ogImage}">
    <meta property="og:image:secure_url" content="${ogImage}">
    <meta property="og:image:type" content="image/png">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${ogTitle}">
    <meta name="twitter:description" content="${ogDescription}">
    <meta name="twitter:image" content="${ogImage}">

    <!-- Favicon -->
    <link rel="icon" type="image/png" sizes="32x32" href="${ogImage}">
    <link rel="apple-touch-icon" href="${ogImage}">

    <!-- Stylesheets -->
    <link rel="stylesheet" href="/global/css/splash.css">
    <link rel="stylesheet" href="/global/css/invite.css">
</head>
<body data-theme="${dynamicTheme}">
    <div class="bg-image"></div>
    <canvas id="particles"></canvas>
    <div class="nav-dots"></div>

    <div id="splash-screen">
        <div class="envelope">      
            <div class="envelope-flap" id="env-flap"></div>
            <div id="seal-container">
                <div class="wax-seal">
                    <img id="seal-logo-img" src="${ogImage}" alt="Shaadi Saathi Logo" height="150" width="130">
                </div>
                <p class="seal-label">Tap to Open</p>
            </div>
        </div>
    </div>

    <main id="main-content-area"></main>
    <button class="back-to-top hidden" data-target="#welcome">↑</button>
    <audio id="bgMusic" src="/global/audio/jashn-e-bahara-instrumental.mp3" loop preload="auto"></audio>

    <script type="module">
        import { renderWebInvitesPreview } from '/pages/web-invites-preview/web-invites-preview.js';
        renderWebInvitesPreview('${inviteId}');
    </script>
</body>
</html>`;

    return new Response(html, {
        headers: {
            'content-type': 'text/html;charset=UTF-8'
        }
    });
}