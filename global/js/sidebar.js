import { ROLES } from "./roles.js";

const CREATOR_NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "layout-dashboard" },
  { id: "calendar", label: "Calendar", icon: "calendar" },
  { id: "weddings", label: "Weddings", icon: "heart" },
  { id: "events", label: "Events", icon: "list" },
  { id: "users", label: "Users", icon: "users" },
  { id: "hosts", label: "Hosts", icon: "user-check" },
  { id: "web-invites", label: "Web Invites", icon: "mail" },
  { id: "sample-weddings", label: "Sample Weddings", icon: "layout-template" },
  { id: "profile", label: "Profile", icon: "user" },
];

const HOST_NAV_ITEMS = [
  { id: "calendar", label: "Calendar", icon: "calendar" },
  { id: "weddings", label: "Weddings", icon: "heart" },
  { id: "sample-weddings", label: "Sample Weddings", icon: "layout-template" },
  { id: "profile", label: "Profile", icon: "user" },
];

const GUEST_NAV_ITEMS = [  
  { id: "calendar", label: "Calendar", icon: "calendar" },
  { id: "weddings", label: "Weddings", icon: "heart" },
  { id: "sample-weddings", label: "Sample Weddings", icon: "layout-template" },
  { id: "profile", label: "Profile", icon: "user" },
];

function getNavItemsForRole(role) {
  const normalizedRole = (role || "").toLowerCase();
  if (normalizedRole === "creator" || normalizedRole === ROLES?.CREATOR?.toLowerCase()) {
    return CREATOR_NAV_ITEMS;
  }
  if (normalizedRole === "host" || normalizedRole === ROLES?.HOST?.toLowerCase()) {
    return HOST_NAV_ITEMS;
  }
  return GUEST_NAV_ITEMS;
}

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

  aside.appendChild(buildSidebarBrand());
  aside.appendChild(buildSidebarNav({ role, activeItemId, onNavigate }));
  aside.appendChild(buildSidebarToggle({ collapsed, onToggleCollapse, aside }));

  return aside;
}

export function createBottomNav(options = {}) {
  const {
    role = "guest",
    activeItemId = "",
    onNavigate = () => {},
  } = options;

  const nav = document.createElement("nav");
  nav.classList.add("bottom-nav");

  const items = getNavItemsForRole(role);

  items.forEach((item) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.classList.add("bottom-nav__item");
    btn.setAttribute("data-page-id", item.id);
    
    if (item.id === activeItemId) {
      btn.classList.add("bottom-nav__item--active");
    }

    const icon = document.createElement("i");
    icon.setAttribute("data-lucide", item.icon);
    icon.classList.add("bottom-nav__icon");

    const label = document.createElement("span");
    label.classList.add("bottom-nav__label");
    label.textContent = item.label;

    btn.appendChild(icon);
    btn.appendChild(label);
    
    btn.addEventListener("click", () => onNavigate(item.id));
    nav.appendChild(btn);
  });

  return nav;
}

function buildSidebarBrand() {
  const brand = document.createElement("div");
  brand.classList.add("sidebar__brand");

  const logoImg = document.createElement("img");
  logoImg.classList.add("sidebar__brand-logo");
  logoImg.src = "/global/logos/logo.png";
  logoImg.alt = "Shaadi Saathi";
  brand.appendChild(logoImg);

  const brandText = document.createElement("span");
  brandText.classList.add("sidebar__brand-text");
  brandText.textContent = "Shaadi Saathi";
  brand.appendChild(brandText);

  return brand;
}

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

function buildSidebarNavItem({ item, isActive, onNavigate }) {
  const li = document.createElement("li");
  li.classList.add("sidebar__nav-item");

  const link = document.createElement("button");
  link.type = "button";
  link.classList.add("sidebar__nav-link");
  link.setAttribute("title", item.label);
  link.setAttribute("data-page-id", item.id);

  const icon = document.createElement("i");
  icon.setAttribute("data-lucide", item.icon);
  icon.classList.add("sidebar__nav-icon");

  const label = document.createElement("span");
  label.classList.add("sidebar__nav-label");
  label.textContent = item.label;

  if (isActive) {
    link.classList.add("sidebar__nav-link--active");
    link.setAttribute("aria-current", "page");
  }

  link.appendChild(icon);
  link.appendChild(label);

  link.addEventListener("click", () => onNavigate(item.id));

  li.appendChild(link);
  return li;
}

function buildSidebarToggle({ collapsed, onToggleCollapse, aside }) {
  let isCollapsed = collapsed;

  const toggleBtn = document.createElement("button");
  toggleBtn.type = "button";
  toggleBtn.classList.add("sidebar__toggle-btn");
  toggleBtn.setAttribute("aria-label", "Toggle sidebar collapse");
  toggleBtn.innerHTML = `<i data-lucide="${isCollapsed ? 'chevron-right' : 'chevron-left'}"></i>`;

  toggleBtn.addEventListener("click", () => {
    isCollapsed = !isCollapsed;
    aside.classList.toggle("sidebar--collapsed", isCollapsed);
    toggleBtn.innerHTML = `<i data-lucide="${isCollapsed ? 'chevron-right' : 'chevron-left'}"></i>`;

    if (typeof window !== "undefined" && window.lucide) {
      window.lucide.createIcons();
    }
    onToggleCollapse(isCollapsed);
  });

  return toggleBtn;
}