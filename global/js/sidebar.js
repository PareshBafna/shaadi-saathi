import { ROLES } from "./roles.js";

const CREATOR_NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "layout-dashboard" },
  { id: 'calendar', label: 'Calendar', icon: 'calendar' },
  { id: "weddings", label: "Weddings", icon: "heart" },
  { id: 'events', label: 'Events', icon: 'list' },
  { id: "users", label: "Users", icon: "users" },
  { id: "hosts", label: "Hosts", icon: "user-check" },
  { id: "web-invites", label: "Web Invites", icon: "mail" },
  { id: 'sample-weddings', label: 'Sample Weddings', icon: 'layout-template' },
  { id: "profile", label: "Profile", icon: "user" },
];

const HOST_NAV_ITEMS = [
  { id: 'calendar', label: 'Calendar', icon: 'calendar' },
  { id: "weddings", label: "Weddings", icon: "heart" },
  { id: 'sample-weddings', label: 'Sample Weddings', icon: 'layout-template' },
  { id: "profile", label: "Profile", icon: "user" },
];

const GUEST_NAV_ITEMS = [  
  { id: 'calendar', label: 'Calendar', icon: 'calendar' },
  { id: "weddings", label: "Weddings", icon: "heart" },
  { id: 'sample-weddings', label: 'Sample Weddings', icon: 'layout-template' },
  { id: "profile", label: "Profile", icon: "user" },
];

function getNavItemsForRole(role) {
  switch (role) {
    case ROLES.CREATOR: return CREATOR_NAV_ITEMS;
    case ROLES.HOST: return HOST_NAV_ITEMS;
    case ROLES.GUEST: return GUEST_NAV_ITEMS;
    default: return GUEST_NAV_ITEMS;
  }
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

  aside.appendChild(buildSidebarBrand(collapsed));
  aside.appendChild(buildSidebarNav({ role, activeItemId, onNavigate }));
  aside.appendChild(buildSidebarToggle({ collapsed, onToggleCollapse, aside }));

  return aside;
}

function buildSidebarBrand(collapsed) {
  const brand = document.createElement("div");
  brand.classList.add("sidebar__brand");

  const logoImg = document.createElement("img");
  logoImg.classList.add("sidebar__brand-logo");
  logoImg.src = "/assets/logos/logo.png";
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

    if (typeof window !== "undefined" && window.lucide) {
      window.lucide.createIcons();
    }
    onToggleCollapse(isCollapsed);
  });

  return toggleBtn;
}