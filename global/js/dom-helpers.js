// Dynamic CSS Stylesheet Injector
export function loadPageStyle(pageName) {
    const existingStyle = document.getElementById('dynamic-page-style');
    if (existingStyle) {
        existingStyle.remove();
    }

    if (!pageName || pageName === 'web-invites-preview' || pageName === 'sample-web-invites-preview') return;

    const link = document.createElement('link');
    link.id = 'dynamic-page-style';
    link.rel = 'stylesheet';
    link.href = `/pages/${pageName}/${pageName}.css`;
    document.head.appendChild(link);
}

// Favicon Cache Buster & Dynamic Canvas Loader
export function forceResetFavicon() {
    document.querySelectorAll("link[rel*='icon']").forEach(el => el.remove());

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = `/global/icons/favicon.ico?t=${Date.now()}`;
    
    img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 32;
        canvas.height = img.naturalHeight || 32;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const newLink = document.createElement('link');
        newLink.rel = 'icon';
        newLink.type = 'image/png';
        newLink.href = canvas.toDataURL('image/png');
        document.head.appendChild(newLink);
    };

    img.onerror = () => {
        const fallback = document.createElement('link');
        fallback.rel = 'icon';
        fallback.type = 'image/x-icon';
        fallback.href = `/global/icons/favicon.ico?nocache=${Date.now()}`;
        document.head.appendChild(fallback);
    };
}