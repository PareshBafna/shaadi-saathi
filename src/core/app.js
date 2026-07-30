import { renderAppLayout } from "../layouts/app/app.js";
import { renderHeader } from "../components/header/header.js";
import { renderSidebar } from "../components/sidebar/sidebar.js";
import { renderDashboard } from "../pages/dashboard/dashboard.js";
import { supabase } from '../config/api.js';
import { router } from './router.js';

function initializeApp() {

    const app = document.getElementById("app");

    app.innerHTML = renderAppLayout();

    document.getElementById("sidebar").innerHTML = renderSidebar();

    document.getElementById("header").innerHTML = renderHeader();

    document.getElementById("content").innerHTML = renderDashboard();

    if (window.lucide) {
        window.lucide.createIcons();
    }

    console.log("Shaadi Saathi initialized.");
}

initializeApp();

export class App {
    constructor() {
        this.session = null;
        this.user = null;
    }

    async init() {
        // 1. Check active session on initial load
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) console.error('Error fetching session:', error.message);

        this.setSession(session);

        // 2. Listen for auth state changes (SIGN_IN, SIGN_OUT, TOKEN_REFRESHED)
        supabase.auth.onAuthStateChange((event, session) => {
            console.log(`Auth event: ${event}`);
            this.setSession(session);
            
            if (event === 'SIGNED_OUT') {
                router.navigate('/login');
            } else if (event === 'SIGNED_IN') {
                router.navigate('/dashboard');
            }
        });

        // 3. Initialize application router
        router.init();
    }

    setSession(session) {
        this.session = session;
        this.user = session?.user ?? null;
        
        // Expose user session globally if needed by components/layouts
        window.__APP_STATE__ = {
            session: this.session,
            user: this.user,
            isAuthenticated: !!this.session
        };
    }
}

export const app = new App();
document.addEventListener('DOMContentLoaded', () => app.init());