/**
 * ============================================================
 * Project : Shaadi Saathi
 * File    : app.js
 * Purpose : App Shell layout. Assembles the persistent Sidebar
 *           and Header around a swappable content area, and
 *           provides a minimal page-switching mechanism so
 *           Sidebar navigation actually changes what's rendered.
 *           This is the top-level layout every authenticated
 *           screen mounts into.
 * Author  : Paresh Bafna
 * ============================================================
 */

import { createSidebar } from "../../components/sidebar/sidebar.js";
import { createHeader } from "../../components/header/header.js";

/**
 * @typedef {Object} AppShellUser
 * @property {string} name
 * @property {"creator"|"owner"|"guest"} role
 * @property {string} [avatarUrl]
 */

/**
 * @typedef {Object} PageDefinition
 * @property {string} id - Matches a Sidebar nav item id.
 * @property {string} title - Shown in the Header as the page title.
 * @property {() => HTMLElement} render - Returns the page's root DOM element.
 */

/**
 * @typedef {Object} AppShellOptions
 * @property {AppShellUser} user - Currently logged-in user.
 * @property {PageDefinition[]} pages - All pages this user's role can navigate between.
 * @property {string} initialPageId - The id of the page to show first.
 * @property {number} [notificationCount=0] - Unread notification count passed to the Header.
 */

/**
 * Builds and mounts the full App Shell (Sidebar + Header + content
 * area) into a single root element. Handles page switching when a
 * Sidebar nav item is clicked, and re-renders icons after every
 * DOM change since Lucide icons must be re-processed each time
 * new `data-lucide` elements are inserted.
 *
 * @param {AppShellOptions} options - Configuration options for the app shell.
 * @returns {HTMLDivElement} The root app-shell element, ready to append to `#app`.
 *
 * @example
 * import { createAppShell } from "./layouts/app/app.js";
 * import { renderDashboard } from "./pages/dashboard/dashboard.js";
 *
 * const shell = createAppShell({
 *   user: { name: "Paresh Bafna", role: "creator" },
 *   pages: [
 *     { id: "dashboard", title: "Dashboard", render: renderDashboard },
 *   ],
 *   initialPageId: "dashboard",
 *   notificationCount: 3,
 * });
 *
 * document.querySelector("#app").appendChild(shell);
 */
export function createAppShell(options = {}) {
  const {
    user = { name: "", role: "guest" },
    pages = [],
    initialPageId = "",
    notificationCount = 0,
  } = options;

  const pageMap = buildPageMap(pages);

  const root = document.createElement("div");
  root.classList.add("app-shell");

  const contentArea = document.createElement("main");
  contentArea.classList.add("app-shell__content");

  const sidebar = createSidebar({
    role: user.role,
    activeItemId: initialPageId,
    onNavigate: (pageId) => handleNavigate({ pageId, pageMap, sidebar, header, contentArea }),
  });

  const header = createHeader({
    pageTitle: getPageTitle(pageMap, initialPageId),
    user,
    notificationCount,
    onNotificationsClick: () => {
      console.log("Notifications clicked");
      // TODO: wire up notifications panel once built
    },
    onProfileClick: () => {
      console.log("Profile menu clicked");
      // TODO: wire up profile dropdown once built
    },
    onMobileMenuClick: () => {
      sidebar.classList.toggle("sidebar--open");
    },
  });

  const mainColumn = document.createElement("div");
  mainColumn.classList.add("app-shell__main");
  mainColumn.appendChild(header);
  mainColumn.appendChild(contentArea);

  root.appendChild(sidebar);
  root.appendChild(mainColumn);

  renderPageInto(contentArea, pageMap, initialPageId);
  refreshIcons();

  return root;
}

/**
 * Converts the pages array into a lookup map keyed by page id,
 * for O(1) access during navigation.
 *
 * @param {PageDefinition[]} pages
 * @returns {Record<string, PageDefinition>}
 */
function buildPageMap(pages) {
  const map = {};
  pages.forEach((page) => {
    map[page.id] = page;
  });
  return map;
}

/**
 * Returns the title of a page by id, falling back to an empty
 * string if the page isn't found (defensive, should not happen
 * in normal use).
 *
 * @param {Record<string, PageDefinition>} pageMap
 * @param {string} pageId
 * @returns {string}
 */
function getPageTitle(pageMap, pageId) {
  return pageMap[pageId]?.title || "";
}

/**
 * Clears the content area and renders the given page's element
 * into it.
 *
 * @param {HTMLElement} contentArea
 * @param {Record<string, PageDefinition>} pageMap
 * @param {string} pageId
 * @returns {void}
 */
function renderPageInto(contentArea, pageMap, pageId) {
  const page = pageMap[pageId];

  contentArea.innerHTML = "";

  if (!page) {
    console.warn(`[AppShell] No page registered for id "${pageId}".`);
    return;
  }

  contentArea.appendChild(page.render());
}

/**
 * Handles a Sidebar navigation click: updates the active nav
 * item styling, updates the Header title, swaps the rendered
 * page, closes the mobile sidebar if open, and re-renders icons.
 *
 * @param {Object} params
 * @param {string} params.pageId
 * @param {Record<string, PageDefinition>} params.pageMap
 * @param {HTMLElement} params.sidebar
 * @param {HTMLElement} params.header
 * @param {HTMLElement} params.contentArea
 * @returns {void}
 */
function handleNavigate({ pageId, pageMap, sidebar, header, contentArea }) {
  updateActiveNavItem(sidebar, pageId);
  updateHeaderTitle(header, getPageTitle(pageMap, pageId));
  renderPageInto(contentArea, pageMap, pageId);

  // Close mobile sidebar after navigating, if it was open.
  sidebar.classList.remove("sidebar--open");

  refreshIcons();
}

/**
 * Updates which Sidebar nav link carries the active state,
 * without rebuilding the whole Sidebar.
 *
 * @param {HTMLElement} sidebar
 * @param {string} activePageId
 * @returns {void}
 */

/**
 * Updates which Sidebar nav link carries the active state,
 * without rebuilding the whole Sidebar. Matches directly on
 * each link's `data-page-id` attribute.
 *
 * @param {HTMLElement} sidebar
 * @param {string} activePageId
 * @returns {void}
 */

function updateActiveNavItem(sidebar, activePageId) {
  const links = sidebar.querySelectorAll(".sidebar__nav-link");

  links.forEach((link) => {
    const isActive = link.getAttribute("data-page-id") === activePageId;
    link.classList.toggle("sidebar__nav-link--active", isActive);

    if (isActive) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

/**
 * Updates the Header's page title text in place.
 *
 * @param {HTMLElement} header
 * @param {string} title
 * @returns {void}
 */
function updateHeaderTitle(header, title) {
  const titleEl = header.querySelector(".header__title");
  if (titleEl) titleEl.textContent = title;
}

/**
 * Re-renders all Lucide icons currently in the DOM. Must be
 * called after any DOM update that introduces new elements with
 * a `data-lucide` attribute.
 *
 * @returns {void}
 */
function refreshIcons() {
  if (typeof window !== "undefined" && window.lucide) {
    window.lucide.createIcons();
  }
}