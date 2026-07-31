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
  contentArea.id = "content"; // <-- ADD THIS LINE SO THE ROUTER CAN FIND IT

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
    },
    onProfileClick: () => {
      console.log("Profile menu clicked");
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

function buildPageMap(pages) {
  const map = {};
  pages.forEach((page) => {
    map[page.id] = page;
  });
  return map;
}

function getPageTitle(pageMap, pageId) {
  return pageMap[pageId]?.title || "";
}

function renderPageInto(contentArea, pageMap, pageId) {
  const page = pageMap[pageId];

  contentArea.innerHTML = "";

  if (!page) {
    console.warn(`[AppShell] No page registered for id "${pageId}".`);
    return;
  }

  contentArea.appendChild(page.render());
}

function handleNavigate({ pageId, pageMap, sidebar, header, contentArea }) {
  updateActiveNavItem(sidebar, pageId);
  updateHeaderTitle(header, getPageTitle(pageMap, pageId));
  renderPageInto(contentArea, pageMap, pageId);

  sidebar.classList.remove("sidebar--open");

  refreshIcons();
}

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

function updateHeaderTitle(header, title) {
  const titleEl = header.querySelector(".header__title");
  if (titleEl) titleEl.textContent = title;
}

function refreshIcons() {
  if (typeof window !== "undefined" && window.lucide) {
    window.lucide.createIcons();
  }
}

/**
 * Backward-compatibility alias so any module importing 
 * renderAppLayout will resolve successfully.
 */
export function renderAppLayout(options) {
  return createAppShell(options);
}