// Step OUT of global/js and into database/js
import { supabase } from '../../database/js/api.js';

// Components are now directly inside global/js/
import { validateSession, getWhatsAppVerificationLink, logoutUser } from './auth.js';
import { createSidebar } from './sidebar.js';
import { createHeader } from './header.js';

// ==========================================
// REFACTORED PAGES (New Architecture)
// ==========================================
import { renderLogin } from '../../pages/login/login.js';
import { renderDashboard } from '../../pages/dashboard/dashboard.js';
import { renderCalendar } from '../../pages/calendar/calendar.js';
import { renderWeddings } from '../../pages/weddings/weddings.js';
import { renderWeddingDetails } from '../../pages/wedding-details/wedding-details.js';
import { renderUsers } from '../../pages/users/users.js';
import { renderHosts } from '../../pages/hosts/hosts.js';
import { renderEvents } from '../../pages/events/events.js'; 

// ==========================================
// PENDING REFACTOR (Old Architecture Paths)
// ==========================================
import { renderSampleWedding } from '../../pages/js/sample-wedding.js';
import { renderWebInvites } from '../../web-invites/js/web-invites.js';
import { renderSampleWebInvites } from '../../web-invites/js/sample-web-invites.js';

// --- NEW PUBLIC ROUTING WHITELIST ---
const publicRoutes = ['#login', '#/', '#sample-web-invites'];

document.addEventListener("DOMContentLoaded", async () => {
    document.body.style.opacity = '0.5';
    let user = await validateSession();
    document.body.style.opacity = '1';

    const rawHash = window.location.hash || '#login';
    const [route] = rawHash.split('?');

    // Bypass strict authentication popups for public routes
    if (!user && !publicRoutes.includes(route)) {
        Swal.fire({
            title: 'Authentication Required',
            text: 'No logged in user details found. Please re-login.',
            icon: 'warning', allowOutsideClick: false, allowEscapeKey: false, showCancelButton: false,
            confirmButtonText: 'Login', confirmButtonColor: '#0f172a'
        }).then(() => { window.location.hash = '#login'; });
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
        
        rightWrapper.style.display = "flex";
        rightWrapper.style.flexDirection = "column";
        rightWrapper.style.flexGrow = "1";
        rightWrapper.style.minWidth = "0";
        rightWrapper.style.height = "100vh";
        
        mainContent.parentNode.insertBefore(rightWrapper, mainContent);
        
        if (!headerContainer) {
            headerContainer = document.createElement("div");
            headerContainer.id = "header-container";
        }
        
        rightWrapper.appendChild(headerContainer);
        rightWrapper.appendChild(mainContent);
        
        mainContent.style.flexGrow = "1";
        mainContent.style.overflowY = "auto";
    }

    if (user) {
        if (activeId === 'wedding-details') {
            activeId = 'weddings';
        }
        
        const sidebar = createSidebar({ 
            role: user.role, 
            activeItemId: activeId || 'calendar',
            onNavigate: (pageId) => {
                window.location.hash = `#${pageId}`;
            },
            onLogout: logoutUser 
        });
        
        if (layout && !document.querySelector('.sidebar')) {
            layout.prepend(sidebar);
        }
    }
    
    if (!window.__routerAttached) {
        window.addEventListener("hashchange", router);
        window.__routerAttached = true;
    }
    router();
}

async function router() {
    if (window.Swal && Swal.isVisible()) Swal.close();
    
    const hash = window.location.hash || '#login';
    const [route, queryString] = hash.split('?');
    const params = new URLSearchParams(queryString || '');

    const contentEl = document.getElementById("main-content");
    if (!contentEl) return;
    
    if (route === '#login') {
        const sidebarEl = document.querySelector('.sidebar');
        const headerEl = document.getElementById('header-container');
        if (sidebarEl) sidebarEl.style.display = 'none';
        if (headerEl) headerEl.style.display = 'none';

        contentEl.innerHTML = "";
        contentEl.style.marginLeft = '0';
        contentEl.style.padding = '0';
        contentEl.appendChild(renderLogin());
        return;
    }

    if (route === '#sample-web-invites') {
        const layoutEl = document.getElementById('layout');
        if (layoutEl) layoutEl.innerHTML = ""; 
        
        document.body.innerHTML = "";
        document.body.style.margin = "0";
        document.body.style.padding = "0";
        document.body.style.overflow = "hidden"; 
        
        renderSampleWebInvites();
        return;
    }

    if (!window.currentUser) {
        window.location.hash = '#login';
        return;
    }

    const userRole = window.currentUser.role;
    
    let pageTitle = "";
    let renderFunc = null;
    let pageArgs = null;
    let allowedRoles = []; 

    if (route === "#dashboard") { pageTitle = "Dashboard"; renderFunc = renderDashboard; allowedRoles = ['creator']; } 
    else if (route === "#weddings") { pageTitle = "Weddings"; renderFunc = renderWeddings; allowedRoles = ['creator', 'host', 'wedding_user', 'guest']; } 
    else if (route === "#wedding-details") {
        pageArgs = params.get('id');
        if (!pageArgs) { showAccessRestricted(); return; }
        pageTitle = "Wedding Details"; renderFunc = renderWeddingDetails; allowedRoles = ['creator', 'host', 'wedding_user', 'guest']; 
    } 
    else if (route === "#calendar") { pageTitle = "Event Calendar"; renderFunc = renderCalendar; allowedRoles = ['creator', 'host', 'wedding_user', 'guest']; }  
    else if (route === "#users") { pageTitle = "Users"; renderFunc = renderUsers; allowedRoles = ['creator']; } 
    else if (route === "#hosts") { pageTitle = "Hosts"; renderFunc = renderHosts; allowedRoles = ['creator']; } 
    else if (route === "#events") { pageTitle = "Events"; renderFunc = renderEvents; allowedRoles = ['creator']; } 
    else if (route === "#sample-wedding" || route === "#sample") { pageTitle = "Sample Wedding"; renderFunc = renderSampleWedding; allowedRoles = ['creator', 'host', 'wedding_user', 'guest']; } 
    else if (route === "#web-invites") { pageTitle = "Web Invites"; renderFunc = renderWebInvites; allowedRoles = ['creator']; } 
    else if (route === "#profile") { pageTitle = "Profile"; renderFunc = renderWeddings; allowedRoles = ['creator', 'host', 'wedding_user', 'guest']; } 
    else { showAccessRestricted(); return; }

    if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
        showAccessRestricted();
        return; 
    }

    contentEl.innerHTML = "";
    
    let activeId = route.replace('#', '');
    if (activeId === 'wedding-details') {
        activeId = 'weddings';
    }

    document.querySelectorAll('.sidebar__nav-link').forEach(link => {
        const pageId = link.getAttribute('data-page-id');
        if (pageId === activeId) {
            link.classList.add('sidebar__nav-link--active');
            link.setAttribute('aria-current', 'page');
        } else {
            link.classList.remove('sidebar__nav-link--active');
            link.removeAttribute('aria-current');
        }
    });

    const sidebarEl = document.querySelector('.sidebar');
    const headerEl = document.getElementById('header-container');
    if (sidebarEl) sidebarEl.style.display = '';
    if (headerEl) headerEl.style.display = '';
    
    contentEl.style.marginLeft = '';
    contentEl.style.padding = '';

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
        notificationCount: 2,
        onMobileMenuClick: () => document.querySelector(".sidebar")?.classList.toggle("sidebar--open")
    });

    if (oldHeader) oldHeader.replaceWith(newHeader);
    else headerContainer.appendChild(newHeader);
}