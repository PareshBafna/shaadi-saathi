import { validateSession } from '../../pages/login/login.js';
import { ensureDomLayout, mountNavigation } from './layout.js';
import { resolveDynamicUserRole, checkSessionOrShowAlert, publicRoutes } from './auth-guard.js';
import { router } from './router.js';

const GA_MEASUREMENT_ID = 'G-XXXXXXXXXX';

function trackPageView() {
    if (typeof window.gtag === 'function') {
        window.gtag('config', GA_MEASUREMENT_ID, {
            page_path: window.location.hash || window.location.pathname
        });
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    // Scaffold DOM containers in case index.html is blank
    ensureDomLayout();

    const rawHash = window.location.hash || '';
    const [route] = rawHash.split('?');

    const isRoot = !route || route === '' || route === '#' || route === '#/' || route === '#home';

    document.body.style.opacity = '0.5';
    let user = await validateSession();
    document.body.style.opacity = '1';

    const isPublic = isRoot || route === '#login' || publicRoutes.includes(route);

    if (!user && !isPublic) {
        checkSessionOrShowAlert();
        initApp(null);
        return;
    }

    if (user) {
        user = await resolveDynamicUserRole(user);
    }
    window.currentUser = user || null;

    // ONLY redirect to dashboard when user explicitly visits #login while logged in
    // Root / landing stays on landing page even if user is logged in
    if (user && route === '#login') {
        window.location.hash = user.role === 'creator' ? '#dashboard' : (user.role === 'host' || user.role === 'wedding_user' ? '#weddings' : '#calendar');
        return;
    } else if (route === '#web-invites-preview') {
        initApp(user);
        return;
    }

    initApp(user);
});

function initApp(user) {
    const rawHash = window.location.hash || '';
    const [route] = rawHash.split('?');
    const isRoot = !route || route === '' || route === '#' || route === '#/' || route === '#home';

    // Do not mount sidebar/header shell if on public root landing page
    if (user && !isRoot) {
        mountNavigation(user);
    }

    if (!window.__routerAttached) {
        window.addEventListener("hashchange", () => {
            router();
            trackPageView();
        });
        window.__routerAttached = true;
    }

    router();
    trackPageView();
}