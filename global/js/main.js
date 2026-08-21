// Step OUT of global/js and into database/js
import { supabase } from '../../database/js/api.js';

// Components & Alerts
import { validateSession, logoutUser } from '../../pages/login/login.js';
import { createSidebar, createBottomNav } from './sidebar.js';
import { createHeader } from './header.js';
import { showSweetAlert } from './sweet-alert-message.js';

// ==========================================
// REFACTORED PAGES (New Architecture)
// ==========================================
import { renderLogin } from '../../pages/login/login.js';
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
import { renderProfile } from '../../pages/profile/profile.js';

// --- DYNAMIC PAGE STYLESHEET LOADER ---
function loadPageStyle(pageName) {
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

// --- WHATSAPP ADMIN SUPPORT CONFIG ---
const ADMIN_WHATSAPP_NUMBER = "919791146838";

function getWhatsAppVerificationLink(verificationCode, name) {
    const message = `Hi Shaadi Saathi, please verify my account.\n\nName: ${name || 'User'}\nCode: ${verificationCode || 'N/A'}`;
    return `https://wa.me/${ADMIN_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

// --- CENTRALIZED SESSION VALIDATION HELPER ---
export function checkSessionOrShowAlert() {
    const userId = localStorage.getItem('ss_user_id');
    if (!userId || !window.currentUser) {
        showSweetAlert('error', 'Session Expired', 'Please log in to continue', null, 'Go To Login Page', () => {
            window.location.hash = '#login';
        });
        return false;
    }
    return true;
}
window.checkSessionOrShowAlert = checkSessionOrShowAlert;

// --- NEW PUBLIC ROUTING WHITELIST ---
const publicRoutes = ['#login', '#/', '#sample-web-invites-preview'];

document.addEventListener("DOMContentLoaded", async () => {
    document.body.style.opacity = '0.5';
    let user = await validateSession();
    document.body.style.opacity = '1';

    const rawHash = window.location.hash || '#login';
    const [route] = rawHash.split('?');

    // Bypass strict authentication popups for public routes
    if (!user && !publicRoutes.includes(route)) {
        checkSessionOrShowAlert();
        initApp(null);
        return;
    }

    // --- DYNAMIC ROLE EVALUATION ---
    if (user && user.role !== 'creator') {
        try {
            const { data: hostData } = await supabase.from('wedding_hosts').select('wedding_id').eq('user_id', user.id);
            const { data: userData } = await supabase.from('wedding_users').select('wedding_id').eq('user_id', user.id);

            const hostWeddingIds = (hostData || []).map(h => h.wedding_id);
            const userWeddingIds = (userData || []).map(u => u.wedding_id);
            const allAssignedIds = [...new Set([...hostWeddingIds, ...userWeddingIds])];

            if (allAssignedIds.length > 0) {
                const { data: activeWeddings } = await supabase.from('weddings').select('id, end_date').in('id', allAssignedIds);

                if (activeWeddings) {
                    const todayTime = new Date();
                    todayTime.setHours(0, 0, 0, 0); 
                    
                    const activeWeddingIds = activeWeddings.filter(w => {
                        const endDate = new Date(w.end_date);
                        endDate.setHours(0, 0, 0, 0);
                        return endDate.getTime() >= todayTime.getTime();
                    }).map(w => w.id);
                    
                    if (activeWeddingIds.length > 0) {
                        const isActivelyHosting = hostWeddingIds.some(id => activeWeddingIds.includes(id));
                        user.role = isActivelyHosting ? 'host' : 'wedding_user'; 
                    }
                }
            }
        } catch (err) {
            console.error("Failed to dynamically resolve role:", err);
        }
    }
    // --- END DYNAMIC ROLE EVALUATION ---

    window.currentUser = user || null;

    // ROLE-BASED DEFAULT ROUTING
    if (route === '#login' || route === '#/') {
        if (user) {
            if (user.role === 'creator') {
                window.location.hash = '#dashboard';
            } else if (user.role === 'host' || user.role === 'wedding_user') {
                window.location.hash = '#weddings';
            } else {
                window.location.hash = '#calendar';
            }
        } else {
            window.location.hash = '#login';
        }
    }

    initApp(user);
});

function initApp(user) {
    let activeId = window.location.hash.replace('#', '').split('?')[0];
    
    const layout = document.getElementById("layout");
    let mainContent = document.getElementById("main-content");
    let rightWrapper = document.getElementById("right-wrapper");
    let headerContainer = document.getElementById("header-container");

    if (layout && !rightWrapper && mainContent) {
        rightWrapper = document.createElement("div");
        rightWrapper.id = "right-wrapper";
        
        mainContent.parentNode.insertBefore(rightWrapper, mainContent);
        
        if (!headerContainer) {
            headerContainer = document.createElement("div");
            headerContainer.id = "header-container";
        }

        rightWrapper.appendChild(headerContainer);
        rightWrapper.appendChild(mainContent);
    }

    if (user) {
        if (activeId === 'wedding-details') {
            activeId = 'weddings';
        } else if (activeId === 'sample-wedding-details') {
            activeId = 'sample-weddings';
        }
        
        const sidebar = createSidebar({ 
            role: user.role, 
            activeItemId: activeId || 'calendar',
            onNavigate: (pageId) => {
                window.location.hash = `#${pageId}`;
            },
            onLogout: logoutUser 
        });

        const bottomNav = createBottomNav({
            role: user.role,
            activeItemId: activeId || 'calendar',
            onNavigate: (pageId) => {
                window.location.hash = `#${pageId}`;
            }
        });
        
        if (layout && !document.querySelector('.sidebar')) {
            layout.prepend(sidebar);
            layout.appendChild(bottomNav);
        }
    }
    
    if (!window.__routerAttached) {
        window.addEventListener("hashchange", router);
        window.__routerAttached = true;
    }
    router();
}

function forceResetFavicon() {
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

async function router() {
    const hash = window.location.hash || '#login';
    const [route, queryString] = hash.split('?');
    const params = new URLSearchParams(queryString || '');

    if (route !== '#web-invites-preview' && route !== '#sample-web-invites-preview') {
        document.title = "Shaadi Saathi";
        forceResetFavicon();
    }

    if (window.Swal && Swal.isVisible() && Swal.getTitle()?.textContent !== 'Session Expired') Swal.close();
    
    document.querySelectorAll('.modal-backdrop, .modal, .custom-modal, .swal2-container').forEach(el => {
        el.remove();
    });

    document.body.classList.remove('modal-open', 'swal2-shown');
    document.body.style.overflow = '';

    let activePageName = route.replace('#', '');
    if (activePageName === '' || activePageName === '/') activePageName = 'login';
    loadPageStyle(activePageName);

    const contentEl = document.getElementById("main-content");
    
    if (route === '#login') {
        const activeUserId = localStorage.getItem('ss_user_id');
        if (activeUserId && window.currentUser) {
            const role = window.currentUser.role;
            if (role === 'creator') {
                window.location.hash = '#dashboard';
            } else if (role === 'host' || role === 'wedding_user') {
                window.location.hash = '#weddings';
            } else {
                window.location.hash = '#calendar';
            }
            return;
        }

        const sidebarEl = document.querySelector('.sidebar');
        const bottomNavEl = document.querySelector('.bottom-nav');
        const headerEl = document.getElementById('header-container');
        if (sidebarEl) sidebarEl.style.display = 'none';
        if (bottomNavEl) bottomNavEl.style.display = 'none';
        if (headerEl) headerEl.style.display = 'none';

        if (contentEl) {
            contentEl.innerHTML = "";
            contentEl.appendChild(renderLogin());
        }
        return;
    }

    if (route === '#sample-web-invites-preview') {
        const layoutEl = document.getElementById('layout');
        if (layoutEl) layoutEl.innerHTML = ""; 
        
        document.body.innerHTML = "";
        renderSampleWebInvites();
        return;
    }

    if (route === '#web-invites-preview') {
        const layoutEl = document.getElementById('layout');
        if (layoutEl) layoutEl.innerHTML = "";
        
        const inviteId = params.get('id');
        renderWebInvitesPreview(inviteId);
        return;
    }

    if (!window.currentUser && !publicRoutes.includes(route)) {
        checkSessionOrShowAlert();
        if (contentEl) contentEl.innerHTML = `<div style="padding: var(--space-8); text-align: center; color: var(--color-text-secondary);">Please log in to continue.</div>`;
        return;
    }

    if (!contentEl) return;

    const userRole = window.currentUser?.role || 'guest';
    
    let pageTitle = "";
    let renderFunc = null;
    let pageArgs = null;
    let allowedRoles = []; 

    if (route === "#dashboard") 
    { 
        pageTitle = "Dashboard"; 
        renderFunc = renderDashboard; 
        allowedRoles = ['creator']; 
    } 
    else if (route === "#calendar") 
    {
        pageTitle = "Event Calendar"; 
        renderFunc = renderCalendar; 
        allowedRoles = ['creator', 'host', 'wedding_user', 'guest']; 
    }
    else if (route === "#weddings") 
    { 
        pageTitle = "Weddings"; 
        renderFunc = renderWeddings; 
        allowedRoles = ['creator', 'host', 'wedding_user', 'guest']; 
    } 
    else if (route === "#wedding-details") 
    {
        pageArgs = params.get('id');
        if (!pageArgs) { showAccessRestricted(); return; }
        pageTitle = "Wedding Details"; 
        renderFunc = renderWeddingDetails; 
        allowedRoles = ['creator', 'host', 'wedding_user', 'guest']; 
    } 
    else if (route === "#events") 
    { 
        pageTitle = "Events"; 
        renderFunc = renderEvents; 
        allowedRoles = ['creator']; 
    } 
    else if (route === "#users") 
    { 
        pageTitle = "Users"; 
        renderFunc = renderUsers; 
        allowedRoles = ['creator']; 
    } 
    else if (route === "#hosts") 
    { 
        pageTitle = "Hosts"; 
        renderFunc = renderHosts; 
        allowedRoles = ['creator']; 
    } 
    else if (route === "#sample-weddings") 
    { 
        pageTitle = "Sample Wedding"; 
        renderFunc = renderSampleWeddings; 
        allowedRoles = ['creator', 'host', 'wedding_user', 'guest']; 
    }
    else if (route === "#sample-wedding-details") 
    { 
        pageArgs = params.get('id');
        pageTitle = "Sample Wedding Details"; 
        renderFunc = renderSampleWeddingDetails; 
        allowedRoles = ['creator', 'host', 'wedding_user', 'guest']; 
    }
    else if (route === "#web-invites") 
    { 
        pageTitle = "Web Invites"; 
        renderFunc = renderWebInvites; 
        allowedRoles = ['creator']; 
    } 
    else if (route === "#profile") 
    { 
        pageTitle = "Profile"; 
        renderFunc = renderProfile; 
        allowedRoles = ['creator', 'host', 'wedding_user', 'guest']; 
    } 
    else 
    { 
        showAccessRestricted(); 
        return; 
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
        showAccessRestricted();
        return; 
    }

    contentEl.innerHTML = "";
    
    let activeId = route.replace('#', '');
    if (activeId === 'wedding-details') {
        activeId = 'weddings';
    } else if (activeId === 'sample-wedding-details') {
        activeId = 'sample-weddings';
    }

    document.querySelectorAll('.sidebar__nav-link, .bottom-nav__item').forEach(link => {
        const pageId = link.getAttribute('data-page-id');
        if (pageId === activeId) {
            link.classList.add('sidebar__nav-link--active');
            link.classList.add('bottom-nav__item--active');
            link.setAttribute('aria-current', 'page');
        } else {
            link.classList.remove('sidebar__nav-link--active');
            link.classList.remove('bottom-nav__item--active');
            link.removeAttribute('aria-current');
        }
    });

    const sidebarEl = document.querySelector('.sidebar');
    const bottomNavEl = document.querySelector('.bottom-nav');
    const headerEl = document.getElementById('header-container');
    
    if (sidebarEl) sidebarEl.style.display = '';
    if (bottomNavEl) bottomNavEl.style.display = ''; 
    if (headerEl) headerEl.style.display = '';

    updateHeader(pageTitle);

    if (renderFunc) {
        const pageNode = renderFunc(pageArgs);
        if (pageNode) {
            if (pageNode instanceof Promise) {
                contentEl.appendChild(await pageNode);
            } else {
                contentEl.appendChild(pageNode);
            }
        }
    } else {
        contentEl.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--color-text-secondary);">Page content coming soon...</div>`;
    }

    setTimeout(() => { if (window.lucide) window.lucide.createIcons(); }, 50);
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
        confirmButtonColor: '#0f172a'
    }).then((result) => {
        if (result.isConfirmed) {
            const userRole = window.currentUser?.role || 'guest';
            if (userRole === 'creator') window.location.hash = '#dashboard';
            else if (userRole === 'host' || userRole === 'wedding_user') window.location.hash = '#weddings';
            else window.location.hash = '#calendar';
        }
    });
}

function updateHeader(title) {
    if (!window.currentUser) return;
    const headerContainer = document.getElementById("header-container");
    if (!headerContainer) return;

    let displayRole = window.currentUser.role;
    if (displayRole === 'host') displayRole = 'HOST';
    else if (displayRole === 'wedding_user') displayRole = 'USER';
    else if (displayRole === 'creator') displayRole = 'CREATOR';
    else displayRole = 'GUEST';

    const displayUser = { ...window.currentUser, role: displayRole };

    const oldHeader = headerContainer.querySelector("header");
    const newHeader = createHeader({
        pageTitle: title, 
        user: displayUser,
        isVerified: window.currentUser.is_verified,
        verifyLink: window.currentUser.is_verified ? "" : getWhatsAppVerificationLink(window.currentUser.verification_code, window.currentUser.name),
        notificationCount: 2
    });

    if (oldHeader) oldHeader.replaceWith(newHeader);
    else headerContainer.appendChild(newHeader);
}