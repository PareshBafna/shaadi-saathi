import { createSidebar } from '../components/js/sidebar.js';
import { createHeader } from '../components/js/header.js';

if (window.location.pathname.includes('dashboard.html')) {
    window.history.replaceState({}, '', '/dashboard');
} else if (window.location.pathname.includes('weddings.html')) {
    window.history.replaceState({}, '', '/weddings');
}

const pathname = window.location.pathname;
let activeId = "dashboard";

if (pathname.includes("weddings") || pathname.includes("wedding-detail")) {
    activeId = "weddings";
} else if (pathname.includes("hosts")) {
    activeId = "hosts";
} else if (pathname.includes("activity")) {
    activeId = "activity";
} else if (pathname.includes("settings")) {
    activeId = "settings";
}

const sidebarEl = document.getElementById("sidebar");
if (sidebarEl) {
    sidebarEl.replaceWith(createSidebar({
        role: "creator",
        activeItemId: activeId,
        onNavigate: (pageId) => {
            const pageMap = {
                dashboard: "/pages/dashboard/html/dashboard.html",
                weddings: "/pages/weddings/html/weddings.html",
                hosts: "/pages/hosts/html/hosts.html",
                activity: "/pages/activity/html/activity.html",
                settings: "/pages/settings/html/settings.html"
            };
            if (pageMap[pageId]) {
                window.location.href = pageMap[pageId];
            }
        }
    }));
}

const headerEl = document.getElementById("header");
if (headerEl) {
    const formattedTitle = activeId === 'weddings' ? 'All Weddings' : activeId.charAt(0).toUpperCase() + activeId.slice(1);
    headerEl.replaceWith(createHeader({
        pageTitle: formattedTitle,
        user: { name: "Paresh Bafna", role: "creator" },
        notificationCount: 2,
        onNotificationsClick: () => console.log("Notifications clicked"),
        onProfileClick: () => console.log("Profile clicked"),
        onMobileMenuClick: () => {
            const sidebar = document.querySelector(".sidebar");
            if (sidebar) sidebar.classList.toggle("sidebar--open");
        }
    }));
}

setTimeout(() => {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
    }
}, 50);