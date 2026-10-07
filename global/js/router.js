import { loadPageStyle, forceResetFavicon } from './dom-helpers.js';
import { updateHeader, ensureDomLayout, mountNavigation } from './layout.js';
import { checkSessionOrShowAlert, publicRoutes } from './auth-guard.js';

import { getHomeHTML, initHome } from '../../pages/home/home.js';
import { renderLogin } from '../../pages/login/login.js';
import { renderPrivacyPolicy } from '../../pages/privacy/privacy.js';
import { renderTermsConditions } from '../../pages/terms/terms.js';
import { renderDashboard } from '../../pages/dashboard/dashboard.js';
import { renderCalendar } from '../../pages/calendar/calendar.js';
import { renderWeddings } from '../../pages/weddings/weddings.js';
import { renderWeddingDetails } from '../../pages/wedding-details/wedding-details.js';
import { renderEvents } from '../../pages/events/events.js'; 
import { renderUsers } from '../../pages/users/users.js';
import { renderHosts } from '../../pages/hosts/hosts.js';
import { renderWebInvites } from '../../pages/web-invites/web-invites.js';
import { renderSampleWeddings } from '../../pages/sample-weddings/sample-weddings.js';
import { renderSampleWeddingDetails } from '../../pages/sample-wedding-details/sample-wedding-details.js';
import { renderSampleWebInvites } from '../../pages/sample-web-invites-preview/sample-web-invites-preview.js';
import { renderWebInvitesPreview } from '../../pages/web-invites-preview/web-invites-preview.js';
import { renderWebInvitesPublicPreview } from '../../pages/web-invites-public-preview/web-invites-public-preview.js';
import { renderProfile } from '../../pages/profile/profile.js';

export function render404Page() {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'min-height: 65vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: var(--color-text-primary, #ffffff); padding: 2rem; box-sizing: border-box;';
    wrap.innerHTML = `
        <h1 style="font-size: 5rem; color: var(--color-primary, #facc15); margin: 0; line-height: 1; font-weight: 800;">404</h1>
        <h2 style="margin: 1rem 0 0.5rem 0; font-size: 1.5rem; font-weight: 700;">Page Not Found</h2>
        <p style="color: var(--color-text-secondary, #a1a1aa); max-width: 420px; margin-bottom: 1.75rem; font-size: 0.95rem; line-height: 1.5;">
            The page you requested does not exist or may have been moved.
        </p>
        <a href="#home" class="btn btn-primary" style="display: inline-block; text-decoration: none; background-color: #facc15; color: #18181b; padding: 0.65rem 1.4rem; font-size: 0.95rem; font-weight: 600; border-radius: 6px;">
            Return to Home
        </a>
    `;
    return wrap;
}

export async function router() {
    const hash = window.location.hash || '';
    const [route, queryString] = hash.split('?');
    const params = new URLSearchParams(queryString || '');

    const isRoot = !route || route === '' || route === '#' || route === '#/';
    const isHome = route === '#home';
    const isLegal = route === '#privacy' || route === '#terms';
    const isLandingAnchor = route === '#features' || route === '#pricing';

    if (route !== '#web-invites-preview' && route !== '#sample-web-invites-preview' && route !== '#web-invites-public-preview') {
        document.title = "Shaadi Saathi";
        forceResetFavicon();
    }

    if (window.Swal && Swal.isVisible() && Swal.getTitle()?.textContent !== 'Session Expired') Swal.close();
    
    document.querySelectorAll('.modal-backdrop, .modal, .custom-modal, .swal2-container').forEach(el => el.remove());
    document.body.classList.remove('modal-open', 'swal2-shown');
    document.body.style.overflow = '';

    ensureDomLayout();

    const contentEl = document.getElementById("main-content");
    if (contentEl) {
        contentEl.style.visibility = 'hidden';
        contentEl.style.opacity = '0';
    }

    let activePageName = (isHome || isLandingAnchor || isRoot) ? 'home' : (isLegal ? route.replace('#', '') : route.replace('#', ''));
    
    await loadPageStyle(activePageName);
    if (document.fonts?.ready) await document.fonts.ready;

    // LOGIN ROUTE
    if (route === '#login') {
        const activeUserId = localStorage.getItem('ss_user_id');
        if (activeUserId && window.currentUser) {
            const role = window.currentUser.role;
            window.location.hash = role === 'creator' ? '#dashboard' : (role === 'host' || role === 'wedding_user' ? '#weddings' : '#calendar');
            return;
        }

        document.querySelector('.sidebar')?.setAttribute('style', 'display: none;');
        document.querySelector('.bottom-nav')?.setAttribute('style', 'display: none;');
        document.getElementById('header-container')?.setAttribute('style', 'display: none;');

        if (contentEl) {
            contentEl.innerHTML = "";
            contentEl.appendChild(renderLogin());
            contentEl.style.visibility = 'visible';
            contentEl.style.opacity = '1';
        }
        return;
    }

    // ROOT, EXPLICIT HOME, ANCHOR ROUTES (#home, #features, #pricing)
    if (isRoot || isHome || isLandingAnchor) {
        document.querySelector('.sidebar')?.setAttribute('style', 'display: none;');
        document.querySelector('.bottom-nav')?.setAttribute('style', 'display: none;');
        document.getElementById('header-container')?.setAttribute('style', 'display: none;');

        if (contentEl) {
            contentEl.innerHTML = getHomeHTML();
            initHome();
            contentEl.style.visibility = 'visible';
            contentEl.style.opacity = '1';

            if (isLandingAnchor) {
                const sectionId = route.replace('#', '');
                setTimeout(() => {
                    const targetEl = document.getElementById(sectionId);
                    if (targetEl) targetEl.scrollIntoView({ behavior: 'smooth' });
                }, 100);
            }
        }
        return;
    }

    // PRIVACY POLICY & TERMS
    if (isLegal) {
        document.querySelector('.sidebar')?.setAttribute('style', 'display: none;');
        document.querySelector('.bottom-nav')?.setAttribute('style', 'display: none;');
        document.getElementById('header-container')?.setAttribute('style', 'display: none;');

        if (contentEl) {
            contentEl.innerHTML = "";
            contentEl.appendChild(route === '#privacy' ? renderPrivacyPolicy() : renderTermsConditions());
            contentEl.style.visibility = 'visible';
            contentEl.style.opacity = '1';
        }
        return;
    }

    if (route === '#sample-web-invites-preview') {
        document.getElementById('layout')?.replaceChildren();
        document.body.innerHTML = "";
        renderSampleWebInvites();
        return;
    }

    if (route === '#web-invites-preview') {
        document.getElementById('layout')?.replaceChildren();
        renderWebInvitesPreview(params.get('id'), params.get('variant_id'));
        return;
    }

    // Direct standalone public route
    if (route === '#web-invites-public-preview') {
        document.getElementById('layout')?.replaceChildren();
        document.body.innerHTML = "";
        await renderWebInvitesPublicPreview(params.get('id'), params.get('variant_id'));
        return;
    }

    if (!window.currentUser && !publicRoutes.includes(route)) {
        checkSessionOrShowAlert();
        if (contentEl) {
            contentEl.innerHTML = `<div style="padding: var(--space-8); text-align: center; color: var(--color-text-secondary);">Please log in to continue.</div>`;
            contentEl.style.visibility = 'visible';
            contentEl.style.opacity = '1';
        }
        return;
    }

    if (!contentEl) return;

    const userRole = window.currentUser?.role || 'guest';
    let pageTitle = "";
    let renderFunc = null;
    let pageArgs = null;

    const routeConfig = {
        '#dashboard': { title: 'Dashboard', fn: renderDashboard, roles: ['creator'] },
        '#calendar': { title: 'Event Calendar', fn: renderCalendar, roles: ['creator', 'host', 'wedding_user', 'guest'] },
        '#weddings': { title: 'Weddings', fn: renderWeddings, roles: ['creator', 'host', 'wedding_user', 'guest'] },
        '#wedding-details': { title: 'Wedding Details', fn: renderWeddingDetails, roles: ['creator', 'host', 'wedding_user', 'guest'], requiresParam: 'id' },
        '#events': { title: 'Events', fn: renderEvents, roles: ['creator'] },
        '#users': { title: 'Users', fn: renderUsers, roles: ['creator'] },
        '#hosts': { title: 'Hosts', fn: renderHosts, roles: ['creator'] },
        '#sample-weddings': { title: 'Sample Wedding', fn: renderSampleWeddings, roles: ['creator', 'host', 'wedding_user', 'guest'] },
        '#sample-wedding-details': { title: 'Sample Wedding Details', fn: renderSampleWeddingDetails, roles: ['creator', 'host', 'wedding_user', 'guest'], requiresParam: 'id' },
        '#web-invites': { title: 'Web Invites', fn: renderWebInvites, roles: ['creator', 'host'] },
        '#profile': { title: 'Profile', fn: renderProfile, roles: ['creator', 'host', 'wedding_user', 'guest'] }
    };

    const matchedRoute = routeConfig[route];
    
    if (!matchedRoute) {
        document.querySelector('.sidebar')?.setAttribute('style', 'display: none;');
        document.querySelector('.bottom-nav')?.setAttribute('style', 'display: none;');
        document.getElementById('header-container')?.setAttribute('style', 'display: none;');
        
        contentEl.innerHTML = "";
        contentEl.appendChild(render404Page());
        contentEl.style.visibility = 'visible';
        contentEl.style.opacity = '1';
        return;
    }

    if (matchedRoute.requiresParam) {
        pageArgs = params.get(matchedRoute.requiresParam);
        if (!pageArgs) { showAccessRestricted(); return; }
    }

    if (matchedRoute.roles.length > 0 && !matchedRoute.roles.includes(userRole)) {
        showAccessRestricted();
        return; 
    }

    pageTitle = matchedRoute.title;
    renderFunc = matchedRoute.fn;

    contentEl.innerHTML = "";
    
    if (!document.querySelector('.sidebar') && window.currentUser) {
        mountNavigation(window.currentUser);
    }

    let activeId = route.replace('#', '');
    if (activeId === 'wedding-details') activeId = 'weddings';
    if (activeId === 'sample-wedding-details') activeId = 'sample-weddings';

    document.querySelectorAll('.sidebar__nav-link, .bottom-nav__item').forEach(link => {
        const isCurrent = link.getAttribute('data-page-id') === activeId;
        link.classList.toggle('sidebar__nav-link--active', isCurrent);
        link.classList.toggle('bottom-nav__item--active', isCurrent);
        link.setAttribute('aria-current', isCurrent ? 'page' : 'false');
    });

    document.querySelector('.sidebar')?.removeAttribute('style');
    document.querySelector('.bottom-nav')?.removeAttribute('style');
    document.getElementById('header-container')?.removeAttribute('style');

    updateHeader(pageTitle);

    if (renderFunc) {
        const pageNode = renderFunc(pageArgs);
        contentEl.appendChild(pageNode instanceof Promise ? await pageNode : pageNode);
    }

    if (window.lucide) window.lucide.createIcons();

    contentEl.style.visibility = 'visible';
    contentEl.style.opacity = '1';
}

function showAccessRestricted() {
    const contentEl = document.getElementById("main-content");
    if (contentEl) contentEl.innerHTML = ""; 

    Swal.fire({
        icon: 'warning',
        title: 'Access Restricted',
        text: 'The page you are looking for does not exist or you do not have permission to access it.',
        allowOutsideClick: false,
        allowEscapeKey: false,
        confirmButtonText: 'Go to Home',
        confirmButtonColor: '#6e1a26'
    }).then((result) => {
        if (result.isConfirmed) {
            const userRole = window.currentUser?.role || 'guest';
            if (userRole === 'creator') window.location.hash = '#dashboard';
            else if (userRole === 'host' || userRole === 'wedding_user') window.location.hash = '#weddings';
            else if (userRole === 'guest') window.location.hash = '#calendar';
            else window.location.hash = '#login';
        }
    });
}