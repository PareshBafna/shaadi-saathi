import { createSidebar } from "../shared/components/sidebar/sidebar.js";
import { createHeader } from "../shared/components/header/header.js";
import { supabase } from '../config/api.js';

const pathname = window.location.pathname;
let activeId = "dashboard";

if (pathname.includes("weddings") || pathname.includes("wedding-detail")) {
    activeId = "weddings";
} else if (pathname.includes("owners")) {
    activeId = "owners";
} else if (pathname.includes("activity")) {
    activeId = "activity";
} else if (pathname.includes("settings")) {
    activeId = "settings";
}

const sidebarEl = document.getElementById("sidebar");
if (sidebarEl) {
    sidebarEl.appendChild(createSidebar({
        role: "creator",
        activeItemId: activeId,
        onNavigate: (pageId) => {
            const pageMap = {
                dashboard: "dashboard.html",
                weddings: "weddings.html",
                owners: "owners.html",
                activity: "activity.html",
                settings: "settings.html"
            };
            if (pageMap[pageId]) {
                window.location.href = pageMap[pageId];
            }
        }
    }));
}

const headerEl = document.getElementById("header");
if (headerEl) {
    const formattedTitle = activeId.charAt(0).toUpperCase() + activeId.slice(1);
    headerEl.appendChild(createHeader({
        pageTitle: formattedTitle,
        user: { name: "Paresh Bafna", role: "creator" },
        notificationCount: 0,
        onNotificationsClick: () => console.log("Notifications clicked"),
        onProfileClick: () => console.log("Profile clicked"),
        onMobileMenuClick: () => {
            if (sidebarEl) sidebarEl.classList.toggle("sidebar--open");
        }
    }));
}

if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
}