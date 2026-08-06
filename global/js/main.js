import { validateSession, getWhatsAppVerificationLink, logoutUser } from '../global/components/js/auth.js';
import { createSidebar } from '../global/components/js/sidebar.js';
import { createHeader } from '../global/components/js/header.js';

import { renderDashboard } from '../pages/dashboard/js/dashboard.js';
import { renderWeddings } from '../pages/weddings/js/weddings.js';
import { renderWeddingDetails } from '../pages/wedding-details/js/wedding-details.js';

// ==========================================
// 1. ASYNC AUTH GUARD & INITIALIZATION
// ==========================================
document.addEventListener("DOMContentLoaded", async () => {
    // Show a quick loading state while checking database
    document.body.style.opacity = '0.5'; 
    
    const user = await validateSession();

    document.body.style.opacity = '1';

    if (!user) {
        // SWAL Non-Closable Popup for missing/invalid session
        Swal.fire({
            title: 'Authentication Required',
            text: 'No logged in user details found. Please re-login.',
            icon: 'warning',
            allowOutsideClick: false,
            allowEscapeKey: false,
            showCancelButton: false,
            confirmButtonText: 'Login',
            confirmButtonColor: '#0f172a'
        }).then((result) => {
            if (result.isConfirmed) {
                window.location.replace('/login.html');
            }
        });
        return; // Stop execution
    }

    // Role-based redirection IF they just visit the root website (no specific hash)
    if (!window.location.hash || window.location.hash === '#' || window.location.hash === '#/') {
        window.location.hash = user.role === 'creator' ? '#dashboard' : '#weddings';
    }

    // Proceed to load the app
    initApp();
});

// ==========================================
// 2. LAYOUT INITIALIZATION
// ==========================================
function initApp() {
    const sidebar = createSidebar({
        userRole: window.currentUser.role,
        onLogout: logoutUser
    });
    
    const layout = document.getElementById("layout");
    if(layout) layout.prepend(sidebar);

    let headerContainer = document.getElementById("header-container");
    if (!headerContainer) {
        headerContainer = document.createElement("div");
        headerContainer.id = "header-container";
        const mainContent = document.getElementById("main-content");
        if (mainContent) mainContent.parentNode.insertBefore(headerContainer, mainContent);
    }

    window.addEventListener("hashchange", router);
    router(); 
}

// ==========================================
// 3. ROUTER LOGIC
// ==========================================
function router() {
    if (!window.currentUser) return;

    const hash = window.location.hash || (window.currentUser.role === 'creator' ? '#dashboard' : '#weddings');
    const [route, queryString] = hash.split('?');
    const params = new URLSearchParams(queryString || '');
    
    const contentEl = document.getElementById("main-content");
    if (!contentEl) return;
    
    contentEl.innerHTML = ""; 
    
    let pageTitle = "Dashboard";
    let renderFunc = renderDashboard;
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
    }

    updateHeader(pageTitle);

    // ==========================================
    // 4. WHATSAPP VERIFICATION BLOCKER
    // ==========================================
    if (!window.currentUser.is_verified) {
        contentEl.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 60vh; text-align: center; padding: 20px;">
                <i data-lucide="shield-alert" style="width: 48px; height: 48px; color: var(--color-danger); margin-bottom: 16px;"></i>
                <h2 style="margin: 0 0 8px 0; color: var(--color-text-primary);">Account Verification Required</h2>
                <p style="color: var(--color-text-secondary); max-width: 400px; line-height: 1.5;">
                    To ensure the privacy of our weddings, please verify your phone number. 
                    Click the green <strong>Verify Account</strong> button in the header above to send us an automated WhatsApp message.
                </p>
            </div>
        `;
    } else {
        const pageNode = renderFunc(pageArgs);
        if (pageNode) contentEl.appendChild(pageNode);
    }

    setTimeout(() => { if (window.lucide) window.lucide.createIcons(); }, 50);
}

// ==========================================
// 5. HEADER UPDATER
// ==========================================
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

    if (oldHeader) {
        oldHeader.replaceWith(newHeader);
    } else {
        headerContainer.appendChild(newHeader);
    }
}