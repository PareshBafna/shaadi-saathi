import { createSidebar } from '../components/sidebar.js';
import { createHeader } from '../components/header.js';

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
    sidebarEl.replaceChildren(createSidebar({
        role: "creator",
        activeItemId: activeId,
        onNavigate: (pageId) => {
            const pageMap = {
                dashboard: "../../dashboard/html/dashboard.html",
                weddings: "../../weddings/html/weddings.html",
                owners: "../../owners/html/owners.html",
                activity: "../../activity/html/activity.html",
                settings: "../../settings/html/settings.html"
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
    headerEl.replaceChildren(createHeader({
        pageTitle: formattedTitle,
        user: { name: "Paresh Bafna", role: "creator" },
        notificationCount: 0,
        onNotificationsClick: () => console.log("Notifications clicked"),
        onProfileClick: () => console.log("Profile clicked")
    }));
}

// FIX: Wait 50ms to ensure all async HTML from modules has been attached to the DOM
setTimeout(() => {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
    }
}, 50);