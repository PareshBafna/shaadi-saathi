import { renderDashboard } from '../pages/dashboard/dashboard.js';
import { renderWeddings } from '../pages/weddings/weddings.js';
import { renderWeddingCommandCenter } from '../pages/wedding-detail/wedding-command-center.js';

class Router {
    constructor() {
        this.routes = {
            '#dashboard': renderDashboard,
            '#weddings': renderWeddings,
        };
    }

    init() {
        window.addEventListener('hashchange', () => this.handleRoute());
        // Handle route on initial page load
        this.handleRoute();
    }

    navigate(path) {
        window.location.hash = path;
    }

    handleRoute() {
        const content = document.getElementById('content');
        if (!content) return;

        const hash = window.location.hash || '#dashboard';
        content.innerHTML = ''; // Clear previous view

        console.log("[ROUTER] Handling route change to:", hash);

        // 1. Handle dynamic wedding detail route with parameters (#wedding?id=...)
        if (hash.startsWith('#wedding?id=')) {
            const urlParams = new URLSearchParams(hash.split('?')[1]);
            const weddingId = urlParams.get('id');
            console.log("[ROUTER] Rendering Wedding Command Center for ID:", weddingId);
            content.appendChild(renderWeddingCommandCenter(weddingId));
            return;
        }

        // 2. Handle standard routes from the map
        const baseRoute = hash.split('?')[0];
        const routeHandler = this.routes[baseRoute];

        if (routeHandler) {
            content.appendChild(routeHandler());
        } else {
            // Fallback to dashboard if route is not recognized
            content.appendChild(renderDashboard());
        }
    }
}

export const router = new Router();