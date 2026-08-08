// Step OUT of global/js and into database/js
import { supabase } from '../../database/js/api.js';

// Step OUT of global/js and into global/components
import { validateSession, getWhatsAppVerificationLink, logoutUser } from '../components/js/auth.js';
import { createSidebar } from '../components/js/sidebar.js';
import { createHeader } from '../components/js/header.js';

// Step OUT of global/js, OUT of global, and into pages/js
import { renderLogin } from '../../pages/js/login.js';
import { renderDashboard } from '../../pages/js/dashboard.js';
import { renderWeddings } from '../../pages/js/weddings.js';
import { renderWeddingDetails } from '../../pages/js/wedding-details.js';
import { renderCalendar } from '../../pages/js/calendar.js';
import { renderUsers } from '../../pages/js/users.js';
import { renderHosts } from '../../pages/js/hosts.js';

document.addEventListener("DOMContentLoaded", async () => {
    document.body.style.opacity = '0.5';
    let user = await validateSession();
    document.body.style.opacity = '1';

    const rawHash = window.location.hash || '#login';
    const [route] = rawHash.split('?');

    if (!user) {
        if (route !== '#login' && route !== '#/') {
            Swal.fire({
                title: 'Authentication Required',
                text: 'No logged in user details found. Please re-login.',
                icon: 'warning', allowOutsideClick: false, allowEscapeKey: false, showCancelButton: false,
                confirmButtonText: 'Login', confirmButtonColor: '#0f172a'
            }).then(() => { window.location.hash = '#login'; });
        } else {
            window.location.hash = '#login';
        }
        initApp(null);
        return;
    }

    // --- DYNAMIC ROLE EVALUATION ---
    if (user.role !== 'creator') {
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

    window.currentUser = user;

    // ROLE-BASED DEFAULT ROUTING
    if (route === '#login' || route === '#/') {
        if (user.role === 'creator') {
            window.location.hash = '#dashboard';
        } else if (user.role === 'host' || user.role === 'wedding_user') {
            window.location.hash = '#weddings';
        } else {
            window.location.hash = '#calendar';
        }
    }

    initApp(user);
});

function initApp(user) {
    if (user) {
        let defaultRoute = 'calendar';
        if (user.role === 'creator') defaultRoute = 'dashboard';
        if (user.role === 'host' || user.role === 'wedding_user') defaultRoute = 'weddings';

        let activeId = window.location.hash.replace('#', '').split('?')[0] || defaultRoute;
        
        // Force highlight "Weddings" in sidebar when nested in details
        if (activeId === 'wedding-details') {
            activeId = 'weddings';
        }
        
        const sidebar = createSidebar({ 
            role: user.role, 
            activeItemId: activeId,
            onNavigate: (pageId) => {
                window.location.hash = `#${pageId}`;
            },
            onLogout: logoutUser 
        });
        
        const layout = document.getElementById("layout");
        if(layout && !document.querySelector('.sidebar')) layout.prepend(sidebar);

        let mainContent = document.getElementById("main-content");
        let headerContainer = document.getElementById("header-container");
        let rightWrapper = document.getElementById("right-wrapper");

        if (!rightWrapper && mainContent) {
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
    }
    
    window.addEventListener("hashchange", router);
    router();
}

async function router() {
    // 1. Force close any lingering popups from previous invalid routes
    if (window.Swal && Swal.isVisible()) {
        Swal.close();
    }
    
    const hash = window.location.hash || '#login';
    const [route, queryString] = hash.split('?');
    const params = new URLSearchParams(queryString || '');

    const contentEl = document.getElementById("main-content");
    if (!contentEl) return;
    
    // ---- HANDLE LOGIN VIEW ----
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

    // ---- PROTECTED VIEWS ----
    if (!window.currentUser) {
        window.location.hash = '#login';
        return;
    }

    const userRole = window.currentUser.role;
    
    let pageTitle = "";
    let renderFunc = null;
    let pageArgs = null;
    let allowedRoles = []; 

    // Route Definitions
    if (route === "#dashboard") {
        pageTitle = "Dashboard"; 
        renderFunc = renderDashboard;
        allowedRoles = ['creator']; 
    } else if (route === "#weddings") {
        pageTitle = "Weddings"; 
        renderFunc = renderWeddings;
        allowedRoles = ['creator', 'host', 'wedding_user', 'guest'];
    } else if (route === "#wedding-details") {
        pageArgs = params.get('id');
        if (!pageArgs) {
            showAccessRestricted();
            return; // Instantly halt if no ID is present
        }
        pageTitle = "Wedding Details"; 
        renderFunc = renderWeddingDetails; 
        allowedRoles = ['creator', 'host', 'wedding_user', 'guest']; 
    } else if (route === "#calendar") {
        pageTitle = "Event Calendar";
        renderFunc = renderCalendar;
        allowedRoles = ['creator', 'host', 'wedding_user', 'guest'];
    }  else if (route === "#users") {
        pageTitle = "Users";
        renderFunc = renderUsers;
        allowedRoles = ['creator']; 
    } else if (route === "#hosts") {
        pageTitle = "Hosts";
        renderFunc = renderHosts;
        allowedRoles = ['creator'];
    } else if (route === "#sample") {
        pageTitle = "Sample Wedding";
        renderFunc = renderWeddings; 
        allowedRoles = ['creator', 'host', 'wedding_user', 'guest'];
    } else if (route === "#profile") {
        pageTitle = "Profile";
        renderFunc = renderWeddings;
        allowedRoles = ['creator', 'host', 'wedding_user', 'guest'];
    } else {
        // Route Not Found
        showAccessRestricted();
        return;
    }

    // Evaluate Access
    if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
        showAccessRestricted();
        return; 
    }

    // Render Page
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

    // Clean up role text formatting for the header display
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