export function createSidebar({ role, activeItemId, onNavigate }) {
    const aside = document.createElement("nav");
    aside.className = "sidebar";

    const navItems = [
        { id: "dashboard", label: "Dashboard", icon: "layout-dashboard" },
        { id: "weddings", label: "All Weddings", icon: "heart-handshake" },
        { id: "owners", label: "Manage Owners", icon: "users" },
        { id: "activity", label: "Activity Log", icon: "activity" },
        { id: "settings", label: "Settings", icon: "settings" }
    ];

    aside.innerHTML = `
        <div class="sidebar-brand">
            <div class="brand-logo">SS</div>
            <div>
                <h2 style="font-size: 1rem;">Shaadi Saathi</h2>
                <span style="font-size: 0.725rem; color: var(--accent); font-weight: 500; text-transform: uppercase;">${role || 'Creator'} Studio</span>
            </div>
        </div>
        <div class="sidebar-nav">
            ${navItems.map(item => {
                const isActive = item.id === activeItemId;
                return `
                    <button data-page-id="${item.id}" class="nav-link ${isActive ? 'active' : ''}">
                        <i data-lucide="${item.icon}" style="width: 18px; height: 18px;"></i>
                        <span>${item.label}</span>
                    </button>
                `;
            }).join('')}
        </div>
    `;

    aside.querySelectorAll('.nav-link').forEach(btn => {
        btn.addEventListener('click', () => {
            const pageId = btn.getAttribute('data-page-id');
            if (onNavigate) onNavigate(pageId);
        });
    });

    return aside;
}