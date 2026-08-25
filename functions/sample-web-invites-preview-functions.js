export async function onRequest(context) {
    const { request } = context;
    const url = new URL(request.url);
    const sampleId = url.searchParams.get("id") || "sample-upcoming";

    // Default Shaadi Saathi Logo / Metadata
    const defaultLogoUrl = `${url.origin}/global/logos/logo-compressed.png`;
    const ogTitle = "Sample Wedding Invitation - Shaadi Saathi";
    const ogDescription = "Explore an interactive sample wedding invitation created with Shaadi Saathi.";
    const ogImage = defaultLogoUrl;
    const dynamicTheme = "maroon";

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

    <!-- SweetAlert2 -->
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>

    <!-- Stylesheets -->
    <link rel="stylesheet" href="/global/css/splash.css">
    <link rel="stylesheet" href="/global/css/invite.css">
</head>
<body data-theme="${dynamicTheme}">
    <main id="main-content-area"></main>
    <button class="back-to-top hidden" style="display: none;" data-target="#welcome">↑</button>

    <script type="module">
        import { renderSampleWebInvites } from '/pages/sample-web-invites-preview/sample-web-invites-preview.js';
        renderSampleWebInvites('${sampleId}');
    </script>
</body>
</html>`;

    return new Response(html, {
        headers: {
            'content-type': 'text/html;charset=UTF-8'
        }
    });
}