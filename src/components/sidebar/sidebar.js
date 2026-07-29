/**
 * ============================================================
 * Project : Shaadi Saathi
 * File    : sidebar.js
 * Purpose : Reusable Sidebar navigation component. Renders a
 *           role-aware navigation menu (Creator, Owner, Guest)
 *           with support for collapsing to icon-only mode.
 *           Navigation items differ per role per the app's
 *           Permission Philosophy: Creator > Owner > Guests.
 * Author  : Paresh Bafna
 * ============================================================
 */

import { ROLES } from "../../core/roles.js";

/**
 * @typedef {"creator"|"owner"|"guest"} UserRole
 */

/**
 * @typedef {Object} SidebarNavItem
 * @property {string} id - Unique route/page identifier.
 * @property {string} label - Display label.
 * @property {string} icon - Lucide icon name.
 */

/**
 * @typedef {Object} SidebarOptions
 * @property {UserRole} role - Current user's role, determines which nav items render.
 * @property {string} activeItemId - The id of the currently active nav item.
 * @property {boolean} [collapsed=false] - Whether the sidebar starts in collapsed (icon-only) mode.
 * @property {(itemId: string) => void} onNavigate - Called when a nav item is clicked.
 * @property {() => void} [onToggleCollapse] - Called when the collapse toggle is clicked.
 */

/**
 * Navigation items visible to the Creator role. Creator has
 * complete access to every wedding in the system.
 *
 * @type {SidebarNavItem[]}
 */
const CREATOR_NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "layout-dashboard" },
  { id: "weddings", label: "All Weddings", icon: "heart" },
  { id: "owners", label: "Manage Owners", icon: "users" },
  { id: "activity", label: "Activity Log", icon: "history" },
  { id: "settings", label: "Settings", icon: "settings" },
];

/**
 * Navigation items visible to the Owner role. Owner can do
 * everything inside their assigned wedding(s), but cannot
 * manage other weddings or become Creator.
 *
 * @type {SidebarNavItem[]}
 */
const OWNER_NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "layout-dashboard" },
  { id: "wedding-website", label: "Wedding Website", icon: "globe" },
  { id: "guests", label: "Guest Management", icon: "users" },
  { id: "invitations", label: "Invitations", icon: "mail" },
  { id: "events", label: "Events", icon: "calendar" },
  { id: "gallery", label: "Gallery", icon: "image" },
  { id: "activity", label: "Activity Log", icon: "history" },
  { id: "settings", label: "Settings", icon: "settings" },
];

/**
 * Navigation items visible to the Guest role. Guests can only
 * view invitations shared with them — no dashboard, no settings.
 *
 * @type {SidebarNavItem[]}
 */
const GUEST_NAV_ITEMS = [
  { id: "invitation-inbox", label: "Invitation Inbox", icon: "inbox" },
  { id: "current-events", label: "Current Events", icon: "calendar-clock" },
  { id: "past-events", label: "Past Events", icon: "archive" },
];

/**
 * Resolves the correct nav item list for a given role.
 *
 * @param {UserRole} role
 * @returns {SidebarNavItem[]}
 */
function getNavItemsForRole(role) {
  switch (role) {
    case ROLES.CREATOR:
      return CREATOR_NAV_ITEMS;
    case ROLES.OWNER:
      return OWNER_NAV_ITEMS;
    case ROLES.GUEST:
      return GUEST_NAV_ITEMS;
    default:
      console.warn(`[Sidebar] Unknown role "${role}" — defaulting to guest nav.`);
      return GUEST_NAV_ITEMS;
  }
}

/**
 * Creates the Sidebar navigation element.
 *
 * @param {SidebarOptions} options - Configuration options for the sidebar.
 * @returns {HTMLElement} The constructed <aside> sidebar element.
 *
 * @example
 * const sidebar = createSidebar({
 *   role: "owner",
 *   activeItemId: "dashboard",
 *   onNavigate: (id) => router.goTo(id),
 *   onToggleCollapse: () => console.log("toggled"),
 * });
 * document.querySelector("#app-shell").appendChild(sidebar);
 */
export function createSidebar(options = {}) {
  const {
    role = "guest",
    activeItemId = "",
    collapsed = false,
    onNavigate = () => {},
    onToggleCollapse = () => {},
  } = options;

  const aside = document.createElement("aside");
  aside.classList.add("sidebar");
  if (collapsed) aside.classList.add("sidebar--collapsed");

  aside.appendChild(buildSidebarBrand(collapsed));
  aside.appendChild(buildSidebarNav({ role, activeItemId, onNavigate }));
  aside.appendChild(buildSidebarToggle({ collapsed, onToggleCollapse, aside }));

  return aside;
}

/**
 * Builds the sidebar brand/logo area at the top of the sidebar.
 *
 * @param {boolean} collapsed
 * @returns {HTMLDivElement}
 */

function buildSidebarBrand(collapsed) {
  const brand = document.createElement("div");
  brand.classList.add("sidebar__brand");

  const logoImg = document.createElement("img");
  logoImg.classList.add("sidebar__brand-logo");
  logoImg.src = "../../src/assets/logos/logo.png";
  logoImg.alt = "Shaadi Saathi";
  brand.appendChild(logoImg);

  if (!collapsed) {
    const brandText = document.createElement("span");
    brandText.classList.add("sidebar__brand-text");
    brandText.textContent = "Shaadi Saathi";
    brand.appendChild(brandText);
  }

  return brand;
}

/**
 * Builds the sidebar's scrollable navigation list, rendering
 * only the items appropriate for the given role.
 *
 * @param {Object} params
 * @param {UserRole} params.role
 * @param {string} params.activeItemId
 * @param {(itemId: string) => void} params.onNavigate
 * @returns {HTMLElement}
 */
function buildSidebarNav({ role, activeItemId, onNavigate }) {
  const nav = document.createElement("nav");
  nav.classList.add("sidebar__nav");

  const list = document.createElement("ul");
  list.classList.add("sidebar__nav-list");

  const items = getNavItemsForRole(role);

  items.forEach((item) => {
    list.appendChild(buildSidebarNavItem({ item, isActive: item.id === activeItemId, onNavigate }));
  });

  nav.appendChild(list);
  return nav;
}

/**
 * Builds a single sidebar navigation <li> item.
 *
 * @param {Object} params
 * @param {SidebarNavItem} params.item
 * @param {boolean} params.isActive
 * @param {(itemId: string) => void} params.onNavigate
 * @returns {HTMLLIElement}
 */
/**
 * Builds a single sidebar navigation <li> item.
 *
 * @param {Object} params
 * @param {SidebarNavItem} params.item
 * @param {boolean} params.isActive
 * @param {(itemId: string) => void} params.onNavigate
 * @returns {HTMLLIElement}
 */
function buildSidebarNavItem({ item, isActive, onNavigate }) {
  const li = document.createElement("li");
  li.classList.add("sidebar__nav-item");

  const link = document.createElement("button");
  link.type = "button";
  link.classList.add("sidebar__nav-link");
  if (isActive) link.classList.add("sidebar__nav-link--active");
  link.setAttribute("title", item.label);
  link.setAttribute("data-page-id", item.id);
  if (isActive) link.setAttribute("aria-current", "page");

  const icon = document.createElement("i");
  icon.setAttribute("data-lucide", item.icon);
  icon.classList.add("sidebar__nav-icon");

  const label = document.createElement("span");
  label.classList.add("sidebar__nav-label");
  label.textContent = item.label;

  link.appendChild(icon);
  link.appendChild(label);

  link.addEventListener("click", () => onNavigate(item.id));

  li.appendChild(link);
  return li;
}

/**
 * Builds the collapse/expand toggle button pinned to the
 * bottom of the sidebar.
 *
 * @param {Object} params
 * @param {boolean} params.collapsed
 * @param {() => void} params.onToggleCollapse
 * @param {HTMLElement} params.aside - Reference to the sidebar element, toggled directly for instant visual feedback.
 * @returns {HTMLButtonElement}
 */
function buildSidebarToggle({ collapsed, onToggleCollapse, aside }) {
  let isCollapsed = collapsed;

  const toggleBtn = document.createElement("button");
  toggleBtn.type = "button";
  toggleBtn.classList.add("sidebar__toggle-btn");
  toggleBtn.setAttribute("aria-label", "Toggle sidebar collapse");

  const icon = document.createElement("i");
  icon.setAttribute("data-lucide", isCollapsed ? "chevron-right" : "chevron-left");
  toggleBtn.appendChild(icon);

  toggleBtn.addEventListener("click", () => {
    isCollapsed = !isCollapsed;
    aside.classList.toggle("sidebar--collapsed", isCollapsed);
    icon.setAttribute("data-lucide", isCollapsed ? "chevron-right" : "chevron-left");

    // Re-render the swapped icon and notify the caller.
    if (typeof window !== "undefined" && window.lucide) {
      window.lucide.createIcons();
    }
    onToggleCollapse(isCollapsed);
  });

  return toggleBtn;
}