/**
 * ============================================================
 * Header Component
 * ------------------------------------------------------------
 * Responsible for rendering the application's top navigation.
 *
 * Features:
 * - Displays greeting based on current time.
 * - Displays search button.
 * - Displays notification button.
 * - Displays current user profile button.
 * ============================================================
 */

/**
 * Returns the appropriate greeting based on the current time.
 *
 * @returns {string}
 */
function getGreeting() {

    // Get current hour (0 - 23)
    const hour = new Date().getHours();

    if (hour < 12) {
        return "Good Morning";
    }

    if (hour < 17) {
        return "Good Afternoon";
    }

    return "Good Evening";
}

/**
 * Renders the application header.
 *
 * @returns {string}
 */
export function renderHeader() {

    return `
        <header class="header">

            <!-- Left Section -->
            <div class="header__left">

                <h2 class="header__greeting">
                    ${getGreeting()}, Paresh 👋
                </h2>

            </div>

            <!-- Right Section -->
            <div class="header__right">

                <!-- Search -->
                <button
                    class="header__icon-button"
                    title="Search">

                    🔍

                </button>

                <!-- Notifications -->
                <button
                    class="header__icon-button"
                    title="Notifications">

                    🔔

                </button>

                <!-- Current User -->
                <button
                    class="header__profile-button"
                    title="Profile">

                    PB

                </button>

            </div>

        </header>
    `;
}