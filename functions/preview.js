export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const inviteId = url.searchParams.get("id");

    if (!inviteId) {
        return env.ASSETS.fetch(request);
    }

    // Set your Supabase URL & anon key
    const SUPABASE_URL = env.SUPABASE_URL || "https://your-project.supabase.co";
    const SUPABASE_KEY = env.SUPABASE_ANON_KEY || "your-anon-key";

    let ogTitle = "Shaadi Saathi - Wedding Invitation";
    let ogDescription = "You are cordially invited to celebrate our wedding!";
    let ogImage = "https://development.shaadi-saathi.pages.dev/global/images/couple-logo-default.png";

    try {
        const [weddingRes, inviteRes] = await Promise.all([
            fetch(`${SUPABASE_URL}/rest/v1/weddings?id=eq.${inviteId}&select=*`, {
                headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
            }),
            fetch(`${SUPABASE_URL}/rest/v1/wedding_web_invite?wedding_id=eq.${inviteId}&select=*`, {
                headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
            })
        ]);

        const [wedding] = await weddingRes.json();
        const [invite] = await inviteRes.json();

        if (wedding) {
            const familyPrefix = wedding.family_name ? `${wedding.family_name.trim()}'s ` : '';
            const hashtag = wedding.hashtag ? ` - ${wedding.hashtag.replace(/^#/, '').trim()}` : '';
            const primarySide = (invite?.primary_side || 'groom').toLowerCase();
            const isBridePrimary = primarySide === 'bride';

            const name1 = isBridePrimary ? wedding.bride_name : wedding.groom_name;
            const name2 = isBridePrimary ? wedding.groom_name : wedding.bride_name;

            ogTitle = `${familyPrefix}Invitation - ${name1} Weds ${name2}${hashtag}`;
            ogDescription = `You are cordially invited to celebrate the wedding of ${name1} & ${name2}. Join us on our special day!`;
            
            if (invite?.thumbnail_url) {
                ogImage = invite.thumbnail_url;
            }
        }
    } catch (e) {
        console.error("Error generating preview meta:", e);
    }

    // This outputs raw HTML for WhatsApp before JavaScript loads
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${ogTitle}</title>

    <meta name="description" content="${ogDescription}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="${url.href}">
    <meta property="og:title" content="${ogTitle}">
    <meta property="og:description" content="${ogDescription}">
    <meta property="og:image" content="${ogImage}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${ogTitle}">
    <meta name="twitter:description" content="${ogDescription}">
    <meta name="twitter:image" content="${ogImage}">

    <link rel="stylesheet" href="/global/css/splash.css">
    <link rel="stylesheet" href="/global/css/invite.css">
</head>
<body>
    <div class="bg-image"></div>
    <canvas id="particles"></canvas>
    <div class="nav-dots"></div>

    <div id="splash-screen">
        <div class="envelope">      
            <div class="envelope-flap" id="env-flap"></div>
            <div id="seal-container">
                <div class="wax-seal">
                    <img id="seal-logo-img" src="${ogImage}" alt="Seal Logo" height="150" width="130">
                </div>
                <p class="seal-label">Tap to Open</p>
            </div>
        </div>
    </div>

    <main id="main-content-area"></main>
    <button class="back-to-top hidden" data-target="#welcome">↑</button>
    <audio id="bgMusic" src="/global/audio/jashn-e-bahara-instrumental.mp3" loop preload="auto"></audio>

    <script type="module">
        import { renderWebInvitesPreview } from '/web-invites-preview.js';
        renderWebInvitesPreview('${inviteId}');
    </script>
</body>
</html>`;

    return new Response(html, {
        headers: { 'content-type': 'text/html;charset=UTF-8' }
    });
}