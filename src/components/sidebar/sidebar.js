export function renderSidebar() {
    return `
        <aside class="sidebar">

            <div class="sidebar__brand">

                <img
                    class="sidebar__brand-logo"
                    src="./src/assets/logos/logo.png"
                    alt="Shaadi Saathi Logo"
                />

                <h2 class="sidebar__brand-title">
                    Shaadi Saathi
                </h2>

                <p class="sidebar__brand-tagline">
                    From Invitation to Celebration
                </p>

            </div>

            <nav class="sidebar__navigation">

                <button class="sidebar__item sidebar__item--active">
                    <i data-lucide="layout-dashboard"></i>
                    <span>Dashboard</span>
                </button>

                <button class="sidebar__item">
                    <i data-lucide="heart"></i>
                    <span>Weddings</span>
                </button>

                <button class="sidebar__item">
                    <i data-lucide="settings"></i>
                    <span>Settings</span>
                </button>

            </nav>

            <footer class="sidebar__footer">
                Version 0.1.0
            </footer>

        </aside>
    `;
}