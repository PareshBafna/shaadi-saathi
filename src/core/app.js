import { renderAppLayout } from "../shared/layouts/app/app.js";
import { renderHeader } from "../shared/components/header/header.js";
import { renderSidebar } from "../shared/components/sidebar/sidebar.js";
import { supabase } from '../config/api.js';
import { router } from './router.js';

function initializeApp() {
    const app = document.getElementById("app");
    app.innerHTML = renderAppLayout();

    document.getElementById("sidebar").innerHTML = renderSidebar();
    document.getElementById("header").innerHTML = renderHeader();

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
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) console.error('Error fetching session:', error.message);

        this.setSession(session);

        supabase.auth.onAuthStateChange((event, session) => {
            this.setSession(session);
            
            if (event === 'SIGNED_OUT') {
                router.navigate('/login');
            } else if (event === 'SIGNED_IN') {
                router.navigate('/dashboard');
            }
        });

        // Initialize the central router (this controls all page switching)
        router.init();
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
document.addEventListener('DOMContentLoaded', () => app.init());