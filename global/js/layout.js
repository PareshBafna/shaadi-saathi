import { createSidebar, createBottomNav } from './sidebar.js';
import { createHeader } from './header.js';
import { logoutUser } from '../../pages/login/login.js';
import { getWhatsAppVerificationLink } from './auth-guard.js';

export function ensureDomLayout() {
    let layout = document.getElementById("layout");
    if (!layout) {
        layout = document.createElement("div");
        layout.id = "layout";
        document.body.appendChild(layout);
    }

    let rightWrapper = document.getElementById("right-wrapper");
    if (!rightWrapper) {
        rightWrapper = document.createElement("div");
        rightWrapper.id = "right-wrapper";
        layout.appendChild(rightWrapper);
    }

    let headerContainer = document.getElementById("header-container");
    if (!headerContainer) {
        headerContainer = document.createElement("div");
        headerContainer.id = "header-container";
        rightWrapper.appendChild(headerContainer);
    }

    let mainContent = document.getElementById("main-content");
    if (!mainContent) {
        mainContent = document.createElement("div");
        mainContent.id = "main-content";
        rightWrapper.appendChild(mainContent);
    }

    return { layout, rightWrapper, headerContainer, mainContent };
}

export function mountNavigation(user) {
    if (!user) return;
    const layout = document.getElementById("layout");
    let activeId = window.location.hash.replace('#', '').split('?')[0];

    if (activeId === 'wedding-details') activeId = 'weddings';
    if (activeId === 'sample-wedding-details') activeId = 'sample-weddings';

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

    if (layout) {
        document.querySelector('.sidebar')?.remove();
        document.querySelector('.bottom-nav')?.remove();
        layout.prepend(sidebar);
        layout.appendChild(bottomNav);
    }
}

export function updateHeader(title) {
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