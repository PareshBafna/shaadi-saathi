// Step OUT of global/js and into global/components
import { validateSession, getWhatsAppVerificationLink, logoutUser } from '../components/js/auth.js';
import { createSidebar } from '../components/js/sidebar.js';
import { createHeader } from '../components/js/header.js';

// Step OUT of global/js, OUT of global, and into pages/js
import { renderDashboard } from '../../pages/js/dashboard.js';
import { renderWeddings } from '../../pages/js/weddings.js';
import { renderWeddingDetails } from '../../pages/js/wedding-details.js';
import { renderLogin } from '../../pages/js/login.js';

document.addEventListener("DOMContentLoaded", async () => {
    document.body.style.opacity = '0.5';
    const user = await validateSession();
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

    window.currentUser = user;

    if (route === '#login' || route === '#/') {
        window.location.hash = user.role === 'creator' ? '#dashboard' : '#weddings';
    }

    initApp(user);
});

function initApp(user) {
    if (user) {
        const activeId = window.location.hash.replace('#', '').split('?')[0] || 'weddings';
        
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

        // STRUCTURAL FIX: Wrap Header and Main Content in a vertical right-panel
        let mainContent = document.getElementById("main-content");
        let headerContainer = document.getElementById("header-container");
        let rightWrapper = document.getElementById("right-wrapper");

        if (!rightWrapper && mainContent) {
            rightWrapper = document.createElement("div");
            rightWrapper.id = "right-wrapper";
            
            // Apply flex-column directly so they stack perfectly
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
            
            // Ensure main content can scroll independently under the header
            mainContent.style.flexGrow = "1";
            mainContent.style.overflowY = "auto";
        }
    }
    
    window.addEventListener("hashchange", router);
    router();
}

function router() {
    const hash = window.location.hash || '#login';
    const [route, queryString] = hash.split('?');
    const params = new URLSearchParams(queryString || '');

    const contentEl = document.getElementById("main-content");
    if (!contentEl) return;
    contentEl.innerHTML = "";

    // ---- HANDLE LOGIN VIEW ----
    if (route === '#login') {
        const sidebarEl = document.querySelector('.sidebar');
        const headerEl = document.getElementById('header-container');
        if (sidebarEl) sidebarEl.style.display = 'none';
        if (headerEl) headerEl.style.display = 'none';

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
    const creatorRoutes = ['#dashboard', '#weddings', '#manage-users', '#hosts', '#web-invites', '#sample', '#profile', '#wedding-details'];
    const guestHostRoutes = ['#weddings', '#sample', '#profile', '#wedding-details'];
    const allowedRoutes = userRole === 'creator' ? creatorRoutes : guestHostRoutes;

    if (!allowedRoutes.includes(route)) {
        Swal.fire({
            icon: 'error',
            title: '404 - Page Not Found',
            text: 'The page you are looking for does not exist or you do not have permission to access it.',
            allowOutsideClick: false,
            allowEscapeKey: false,
            confirmButtonText: 'Go to Home',
            confirmButtonColor: '#0f172a'
        }).then((result) => {
            if (result.isConfirmed) {
                window.location.hash = userRole === 'creator' ? '#dashboard' : '#weddings';
            }
        });
        return;
    }

    // Update active class on sidebar items
    const activeId = route.replace('#', '');
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

    // Resolve page title and render function dynamically based on route
    let pageTitle = "Weddings";
    let renderFunc = renderWeddings;
    let pageArgs = null;

    if (route === "#dashboard") {
        pageTitle = "Dashboard"; 
        renderFunc = renderDashboard;
    } else if (route === "#weddings") {
        pageTitle = "Weddings"; 
        renderFunc = renderWeddings;
    } else if (route === "#wedding-details") {
        pageTitle = "Wedding Details"; 
        renderFunc = renderWeddingDetails; 
        pageArgs = params.get('id');
    } else if (route === "#sample") {
        pageTitle = "Sample Wedding";
        renderFunc = renderWeddings; 
    } else if (route === "#profile") {
        pageTitle = "Profile";
        renderFunc = renderWeddings;
    }

    // Always update and render the header securely
    updateHeader(pageTitle);

    const pageNode = renderFunc(pageArgs);
    if (pageNode) contentEl.appendChild(pageNode);

    setTimeout(() => { if (window.lucide) window.lucide.createIcons(); }, 50);
}

function updateHeader(title) {
    if (!window.currentUser) return;
    const headerContainer = document.getElementById("header-container");
    if (!headerContainer) return;

    const oldHeader = headerContainer.querySelector("header");
    const newHeader = createHeader({
        pageTitle: title, 
        user: window.currentUser,
        isVerified: window.currentUser.is_verified,
        verifyLink: window.currentUser.is_verified ? "" : getWhatsAppVerificationLink(window.currentUser.verification_code, window.currentUser.name),
        notificationCount: 2,
        onMobileMenuClick: () => document.querySelector(".sidebar")?.classList.toggle("sidebar--open")
    });

    if (oldHeader) oldHeader.replaceWith(newHeader);
    else headerContainer.appendChild(newHeader);
}