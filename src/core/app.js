/**
 * ============================================================
 * Project : Shaadi Saathi
 * File    : app.js (Core)
 * Purpose : Core application bootstrap. Authenticates session,
 *           initializes the App Shell layout with all standalone 
 *           pages, and manages routing and user state.
 * Author  : Paresh Bafna
 * ============================================================
 */

import { createAppShell } from "../shared/layouts/app/app.js";
import { renderDashboard } from "../pages/dashboard/dashboard.js";
import { renderWeddings } from "../pages/weddings/weddings.js";
import { renderOwners } from "../pages/owners/owners.js";
import { renderActivity } from "../pages/activity/activity.js";
import { renderSettings } from "../pages/settings/settings.js";
import { supabase } from '../config/api.js';
import { router } from './router.js';

export class App {
    constructor() {
        this.session = null;
        this.user = null;
    }

    async init() {
        console.log("[APP] App initialization sequence started...");
        
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) console.error('Error fetching session:', error.message);

        this.setSession(session);

        supabase.auth.onAuthStateChange((event, session) => {
            console.log(`Auth event: ${event}`);
            this.setSession(session);
            
            if (event === 'SIGNED_OUT') {
                router.navigate('/login');
            } else if (event === 'SIGNED_IN') {
                router.navigate('/dashboard');
            }
        });

        this.mountAppShell();
        router.init();
    }

    mountAppShell() {
        const appContainer = document.getElementById("app");
        if (!appContainer) {
            console.error("[APP ERROR] #app container not found in DOM!");
            return;
        }

        appContainer.innerHTML = "";

        // Determine safe initial sidebar tab based on current hash
        const rawHash = window.location.hash || '#dashboard';
        let initialPageId = "dashboard";
        
        if (rawHash.startsWith('#weddings') || rawHash.startsWith('#wedding?id=')) {
            initialPageId = "weddings";
        } else if (rawHash.startsWith('#owners')) {
            initialPageId = "owners";
        } else if (rawHash.startsWith('#activity')) {
            initialPageId = "activity";
        } else if (rawHash.startsWith('#settings')) {
            initialPageId = "settings";
        }

        // Assemble the App Shell with all standalone pages registered
        const shell = createAppShell({
            user: { 
                name: this.user?.email || "Paresh Bafna", 
                role: "creator" 
            },
            pages: [
                { id: "dashboard", title: "Dashboard", render: renderDashboard },
                { id: "weddings", title: "All Weddings Directory", render: renderWeddings },
                { id: "owners", title: "Manage Owners", render: renderOwners },
                { id: "activity", title: "Activity Log", render: renderActivity },
                { id: "settings", title: "Settings", render: renderSettings },
            ],
            initialPageId: initialPageId,
            notificationCount: 0,
        });

        appContainer.appendChild(shell);

        if (window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons();
        }

        console.log("Shaadi Saathi App Shell successfully mounted with all pages.");
    }

    setSession(session) {
        this.session = session;
        this.user = session?.user ?? null;
        
        window.__APP_STATE__ = {
            session: this.session,
            user: this.user,
            isAuthenticated: !!this.session
        };
    }
}

export const app = new App();

// Execute initialization immediately when module loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => app.init());
} else {
    app.init();
}