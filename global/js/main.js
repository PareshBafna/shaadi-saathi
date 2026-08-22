import { validateSession } from '../../pages/login/login.js';
import { ensureDomLayout, mountNavigation } from './layout.js';
import { resolveDynamicUserRole, checkSessionOrShowAlert, publicRoutes } from './auth-guard.js';
import { router } from './router.js';

document.addEventListener("DOMContentLoaded", async () => {
    // Scaffold DOM containers in case index.html is blank
    ensureDomLayout();

    document.body.style.opacity = '0.5';
    let user = await validateSession();
    document.body.style.opacity = '1';

    const rawHash = window.location.hash || '#login';
    const [route] = rawHash.split('?');

    if (!user && !publicRoutes.includes(route)) {
        checkSessionOrShowAlert();
        initApp(null);
        return;
    }

    user = await resolveDynamicUserRole(user);
    window.currentUser = user || null;

    if (route === '#login' || route === '#/') {
        if (user) {
            window.location.hash = user.role === 'creator' ? '#dashboard' : (user.role === 'host' || user.role === 'wedding_user' ? '#weddings' : '#calendar');
        } else {
            window.location.hash = '#login';
        }
    }

    initApp(user);
});

function initApp(user) {
    if (user) {
        mountNavigation(user);
    }

    if (!window.__routerAttached) {
        window.addEventListener("hashchange", router);
        window.__routerAttached = true;
    }

    router();
}