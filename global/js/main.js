import { validateSession } from '../../pages/login/login.js';
import { ensureDomLayout, mountNavigation } from './layout.js';
import { resolveDynamicUserRole, checkSessionOrShowAlert, publicRoutes } from './auth-guard.js';
import { router } from './router.js';

const GA_MEASUREMENT_ID = 'G-3GQ9D2B7FP';

function isConsentGiven() {
    return localStorage.getItem('ss_cookie_consent') === 'granted';
}

function initGA4() {
    if (!isConsentGiven() || typeof window.gtag !== 'function') return;
    window.gtag('consent', 'update', {
        'analytics_storage': 'granted'
    });
    trackPageView();
}

function trackPageView() {
    if (isConsentGiven() && typeof window.gtag === 'function') {
        window.gtag('config', GA_MEASUREMENT_ID, {
            page_path: window.location.hash || window.location.pathname
        });
    }
}

function showCookieBanner() {
    if (localStorage.getItem('ss_cookie_consent')) return;

    const banner = document.createElement('div');
    banner.id = 'ss-cookie-banner';
    banner.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        width: min(92%, 560px);
        background: #1e0e11;
        border: 1px solid #cca038;
        border-radius: 8px;
        padding: 1rem 1.25rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        z-index: 99999;
        box-shadow: 0 8px 24px rgba(0,0,0,0.6);
        color: #f5f0eb;
        font-family: 'DM Sans', sans-serif;
        font-size: 13.5px;
        box-sizing: border-box;
    `;
    banner.innerHTML = `
        <div style="line-height: 1.4;">
            We use minimal analytics to improve your experience. See our 
            <a href="#privacy" style="color: #cca038; text-decoration: underline;">Privacy Policy</a>.
        </div>
        <div style="display: flex; gap: 0.5rem; flex-shrink: 0;">
            <button id="ss-cookie-decline" style="background: transparent; color: #b8a6a9; border: 1px solid #38151b; padding: 0.4rem 0.8rem; border-radius: 6px; cursor: pointer; font-size: 12px;">Decline</button>
            <button id="ss-cookie-accept" style="background: #cca038; color: #13090b; border: none; padding: 0.4rem 0.9rem; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 12px;">Accept</button>
        </div>
    `;

    document.body.appendChild(banner);

    document.getElementById('ss-cookie-accept').addEventListener('click', () => {
        localStorage.setItem('ss_cookie_consent', 'granted');
        banner.remove();
        initGA4();
    });

    document.getElementById('ss-cookie-decline').addEventListener('click', () => {
        localStorage.setItem('ss_cookie_consent', 'denied');
        banner.remove();
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    ensureDomLayout();
    showCookieBanner();
    initGA4();

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
    const isPublicStatic = !route || route === '' || route === '#' || route === '#/' || route === '#home' || route === '#privacy' || route === '#terms';

    if (user && !isPublicStatic) {
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
}