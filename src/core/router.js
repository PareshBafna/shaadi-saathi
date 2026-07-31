import { renderDashboard } from '../pages/dashboard/dashboard.js';
import { renderWeddings } from '../pages/weddings/weddings.js';
import { renderWeddingCommandCenter } from '../pages/wedding-detail/wedding-command-center.js';
import { renderOwners } from '../pages/owners/owners.js';
import { renderActivity } from '../pages/activity/activity.js';
import { renderSettings } from '../pages/settings/settings.js';

class Router {
    constructor() {
        this.routes = {
            '#dashboard': renderDashboard,
            '#weddings': renderWeddings,
            '#owners': renderOwners,
            '#activity': renderActivity,
            '#settings': renderSettings,
        };
    }

    init() {
        window.addEventListener('hashchange', () => this.handleRoute());
        this.handleRoute();
    }

    navigate(path) {
        window.location.hash = path;
    }

    handleRoute() {
        const content = document.getElementById('content');
        if (!content) {
            console.error("[ROUTER ERROR] Element with id 'content' not found in DOM!");
            return;
        }

        const hash = window.location.hash || '#dashboard';
        console.log("[ROUTER] Navigating to route:", hash);

        // Clear previous view safely
        content.replaceChildren();

        // 1. Determine active sidebar tab ID
        let activePageId = 'dashboard';
        if (hash.startsWith('#weddings') || hash.startsWith('#wedding?id=')) {
            activePageId = 'weddings';
        } else if (hash.startsWith('#owners')) {
            activePageId = 'owners';
        } else if (hash.startsWith('#activity')) {
            activePageId = 'activity';
        } else if (hash.startsWith('#settings')) {
            activePageId = 'settings';
        } else if (hash.startsWith('#dashboard') || hash === '') {
            activePageId = 'dashboard';
        }

        // 2. Sync Sidebar active visual state automatically
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            const links = sidebar.querySelectorAll(".sidebar__nav-link");
            links.forEach((link) => {
                const isActive = link.getAttribute("data-page-id") === activePageId;
                link.classList.toggle("sidebar__nav-link--active", isActive);
                if (isActive) {
                    link.setAttribute("aria-current", "page");
                } else {
                    link.removeAttribute("aria-current");
                }
            });
        }

        // 3. Handle dynamic wedding command center route
        if (hash.startsWith('#wedding?id=')) {
            const urlParams = new URLSearchParams(hash.split('?')[1]);
            const weddingId = urlParams.get('id');
            const viewElement = renderWeddingCommandCenter(weddingId);
            if (viewElement instanceof HTMLElement) content.appendChild(viewElement);
            return;
        }

        // 4. Handle standard standalone page routes
        const baseRoute = hash.split('?')[0];
        const routeHandler = this.routes[baseRoute];

        if (routeHandler) {
            const viewElement = routeHandler();
            if (viewElement instanceof HTMLElement) content.appendChild(viewElement);
        } else {
            console.warn("[ROUTER] Unknown route, falling back to dashboard:", hash);
            const viewElement = renderDashboard();
            if (viewElement instanceof HTMLElement) content.appendChild(viewElement);
        }
    }
}

export const router = new Router();