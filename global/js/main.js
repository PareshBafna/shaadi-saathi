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

    // Parse the hash to ignore query strings
    const rawHash = window.location.hash || '#login';
    const [route] = rawHash.split('?');

    // Handle Unauthenticated Users
    if (!user) {
        // Only show the popup if they are trying to access a protected page
        if (route !== '#login' && route !== '#/') {
            Swal.fire({
                title: 'Authentication Required',
                text: 'No logged in user details found. Please re-login.',
                icon: 'warning', allowOutsideClick: false, allowEscapeKey: false, showCancelButton: false,
                confirmButtonText: 'Login', confirmButtonColor: '#0f172a'
            }).then(() => { window.location.hash = '#login'; });
        } else {
            // Silently redirect to login without the popup
            window.location.hash = '#login';
        }
        initApp(null);
        return;
    }

    // Handle Authenticated Users (Redirect away from login page)
    if (route === '#login' || route === '#/') {
        window.location.hash = user.role === 'creator' ? '#dashboard' : '#weddings';
    }

    initApp(user);
});

function initApp(user) {
    if (user) {
        const sidebar = createSidebar({ userRole: user.role, onLogout: logoutUser });
        const layout = document.getElementById("layout");
        if(layout && !document.querySelector('.sidebar')) layout.prepend(sidebar);

        let headerContainer = document.getElementById("header-container");
        if (!headerContainer) {
            headerContainer = document.createElement("div");
            headerContainer.id = "header-container";
            const mainContent = document.getElementById("main-content");
            if (mainContent) mainContent.parentNode.insertBefore(headerContainer, mainContent);
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

    const sidebarEl = document.querySelector('.sidebar');
    const headerEl = document.getElementById('header-container');
    if (sidebarEl) sidebarEl.style.display = '';
    if (headerEl) headerEl.style.display = '';
    
    // Reset layout metrics
    contentEl.style.marginLeft = '';
    contentEl.style.padding = '';

    let pageTitle = "Dashboard";
    let renderFunc = renderDashboard;
    let pageArgs = null;

    if (route === "#dashboard") {
        pageTitle = "Dashboard"; renderFunc = renderDashboard;
    } else if (route === "#weddings") {
        pageTitle = "Weddings"; renderFunc = renderWeddings;
    } else if (route === "#wedding-details") {
        pageTitle = "Wedding Details"; renderFunc = renderWeddingDetails; pageArgs = params.get('id');
    }

    updateHeader(pageTitle);

    // Render the page normally without the full-screen verification block
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