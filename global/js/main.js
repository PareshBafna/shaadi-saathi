import { createSidebar } from '../components/js/sidebar.js';
import { createHeader } from '../components/js/header.js';
import { renderDashboard } from '../../pages/dashboard/js/dashboard.js';
import { renderWeddings } from '../../pages/weddings/js/weddings.js';
import { renderWeddingDetails } from '../../pages/weddings/js/wedding-details.js';
import { renderSample } from '../../pages/sample/js/sample.js'; // IMPORT ADDED

const routes = {
    '': renderDashboard,
    'dashboard': renderDashboard,
    'weddings': renderWeddings,
    'wedding': (params) => renderWeddingDetails(params.id),
    'hosts': renderDashboard, 
    'sample': renderSample // ROUTE ADDED
};

function router() {
    const hash = window.location.hash.replace('#', '');
    const [route, queryString] = hash.split('?');
    const searchParams = new URLSearchParams(queryString);
    const id = searchParams.get('id');

    let renderFunc = routes[route] || routes['dashboard'];
    let activeId = route || 'dashboard'; // Ensure the active ID highlights the correct sidebar item

    if (route.includes('weddings') || route.includes('wedding')) activeId = 'weddings';

    // Mount Sidebar
    const sidebarEl = document.getElementById("sidebar");
    if (sidebarEl && !sidebarEl.hasChildNodes()) {
        sidebarEl.replaceWith(createSidebar({
            role: "creator", // For now, passing creator. Future: pass dynamic role (Creator/Host/Guest)
            activeItemId: activeId,
            onNavigate: (pageId) => {
                window.location.hash = `#${pageId}`;
            }
        }));
    } else {
        updateActiveSidebarItem(activeId);
    }

    // Mount Header
    const headerEl = document.getElementById("header");
    if (headerEl && !headerEl.hasChildNodes()) {
        headerEl.replaceWith(createHeader({
            pageTitle: "", 
            user: { name: "Paresh Bafna", role: "creator" },
            notificationCount: 2,
            onMobileMenuClick: () => document.querySelector(".sidebar")?.classList.toggle("sidebar--open")
        }));
    }

    // Render Page Content
    const contentEl = document.getElementById("content");
    contentEl.innerHTML = "";
    
    const pageContent = renderFunc({ id });
    contentEl.appendChild(pageContent);

    setTimeout(() => {
        if (window.lucide) window.lucide.createIcons();
    }, 50);
}

function updateActiveSidebarItem(activeId) {
    document.querySelectorAll('.sidebar__nav-link').forEach(link => {
        const isMatch = link.getAttribute('data-page-id') === activeId;
        link.classList.toggle('sidebar__nav-link--active', isMatch);
    });
}

window.addEventListener('hashchange', router);
window.addEventListener('DOMContentLoaded', router);