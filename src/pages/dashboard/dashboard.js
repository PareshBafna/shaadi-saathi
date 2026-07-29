    /**
 * ============================================================
 * File:
 * src/pages/dashboard/dashboard.js
 *
 * Page:
 * Dashboard
 *
 * Purpose:
 * Renders the main dashboard page.
 * ============================================================
 */

/**
 * Renders the dashboard page.
 *
 * @returns {string}
 */
export function renderDashboard() {

    return `
        <section class="dashboard">

            <!-- Dashboard Title -->
            <div class="dashboard__header">

                <h1 class="dashboard__title">
                    Dashboard
                </h1>

                <p class="dashboard__subtitle">
                    Welcome back! Here's an overview of your weddings.
                </p>

            </div>

            <!-- Statistics -->
            <div class="dashboard__stats">

                <div class="dashboard-card">
                    <h3>0</h3>
                    <p>Active Weddings</p>
                </div>

                <div class="dashboard-card">
                    <h3>0</h3>
                    <p>Upcoming Weddings</p>
                </div>

                <div class="dashboard-card">
                    <h3>0</h3>
                    <p>Archived Weddings</p>
                </div>

                <div class="dashboard-card">
                    <h3>0</h3>
                    <p>Total Guests</p>
                </div>

            </div>

            <!-- Recent Weddings -->
            <div class="dashboard-section">

                <h2>Recent Weddings</h2>

                <p>
                    No weddings have been created yet.
                </p>

            </div>

            <!-- Recent Activity -->
            <div class="dashboard-section">

                <h2>Recent Activity</h2>

                <p>
                    No activity available.
                </p>

            </div>

        </section>
    `;
}