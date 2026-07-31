/**
 * ============================================================
 * Project : Shaadi Saathi
 * File    : main.js
 * Purpose : Application entry point. Registers all available
 *           pages, determines the current user's session
 *           (placeholder until Supabase Auth is wired in),
 *           builds the App Shell, and mounts it to the DOM.
 *           This is the only file that should ever call
 *           createAppShell() or reference #app directly.
 * Author  : Paresh Bafna
 * ============================================================
 */

import { createAppShell } from "../shared/layouts/app/app.js";
import { renderDashboard } from "../pages/dashboard/dashboard.js";
import { renderWeddings } from "../pages/weddings/weddings.js";
import { ROLES } from "./roles.js";

/**
 * @typedef {Object} SessionUser
 * @property {string} name
 * @property {"creator"|"owner"|"guest"} role
 * @property {string} [avatarUrl]
 */

/**
 * Placeholder session, used until Supabase Authentication is
 * connected. Replace `getCurrentUser()`'s body with a real
 * session lookup once the backend service layer exists.
 *
 * @type {SessionUser}
 */
const PLACEHOLDER_USER = {
  name: "Paresh Bafna",
  role: ROLES.CREATOR,
};

/**
 * Returns the currently logged-in user. Currently hardcoded;
 * replace with a real Supabase Auth session fetch when the
 * backend is connected. Must never return null in production —
 * unauthenticated users should be redirected to a login page
 * before main.js runs (login flow not yet built).
 *
 * @returns {SessionUser}
 */
function getCurrentUser() {
  return PLACEHOLDER_USER;
}

/**
 * Registers every page currently available in the app, keyed by
 * the same `id` used in Sidebar's nav items. As new pages are
 * built (Guests, Settings, etc.), add them here — this is the
 * single source of truth for what App Shell can render.
 *
 * @returns {import("../shared/layouts/app/app.js").PageDefinition[]}
 */
function getRegisteredPages() {
  return [
    { id: "dashboard", title: "Dashboard", render: renderDashboard },
    { id: "weddings", title: "All Weddings", render: renderWeddings },
    // Future pages, added as they are built:
    // { id: "guests", title: "Guest Management", render: renderGuests },
    // { id: "settings", title: "Settings", render: renderSettings },
  ];
}

/**
 * Boots the application: builds the App Shell for the current
 * user and mounts it into #app. Also performs the initial Lucide
 * icon render, since icons inserted before this point (by
 * createAppShell itself) need the library to have executed at
 * least once on page load.
 *
 * @returns {void}
 */
function bootApp() {
  const appRoot = document.querySelector("#app");

  if (!appRoot) {
    console.error('[main.js] Could not find "#app" root element in the DOM.');
    return;
  }

  const user = getCurrentUser();
  const pages = getRegisteredPages();

  const shell = createAppShell({
    user,
    pages,
    initialPageId: "dashboard",
    notificationCount: 0,
  });

  appRoot.appendChild(shell);

  if (typeof window !== "undefined" && window.lucide) {
    window.lucide.createIcons();
  }
}

document.addEventListener("DOMContentLoaded", bootApp);