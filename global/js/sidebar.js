import { ROLES } from "./roles.js";

const OFFICIAL_WHATSAPP_SVG_BOTTOM = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" width="28" height="28" fill="#25d366">
  <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/>
</svg>
`;

const WHATSAPP_MESSAGE_TEXT = `Hi *Shaadi Saathi* ❤️,\nI would like to create a wedding.`;

const WHATSAPP_ITEM = { 
  id: "whatsapp-create", 
  label: "", 
  rawSvg: OFFICIAL_WHATSAPP_SVG_BOTTOM,
  isExternal: true, 
  url: `https://wa.me/919791146838?text=${encodeURIComponent(WHATSAPP_MESSAGE_TEXT)}` 
};

const CREATOR_NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "layout-dashboard" },
  { id: "calendar", label: "Calendar", icon: "calendar" },
  { id: "weddings", label: "Weddings", icon: "heart" },
  { id: "events", label: "Events", icon: "list" },
  { id: "users", label: "Users", icon: "users" },
  { id: "hosts", label: "Hosts", icon: "user-check" },
  { id: "web-invites", label: "Web Invites", icon: "mail" },
  WHATSAPP_ITEM,
  { id: "sample-weddings", label: "Sample", icon: "sparkles" },
  { id: "profile", label: "Profile", icon: "user" },
];

const HOST_NAV_ITEMS = [
  { id: "calendar", label: "Calendar", icon: "calendar" },
  { id: "weddings", label: "Weddings", icon: "heart" },
  WHATSAPP_ITEM,
  { id: "sample-weddings", label: "Sample", icon: "sparkles" },
  { id: "profile", label: "Profile", icon: "user" },
];

const GUEST_NAV_ITEMS = [  
  { id: "calendar", label: "Calendar", icon: "calendar" },
  { id: "weddings", label: "Weddings", icon: "heart" },
  WHATSAPP_ITEM,
  { id: "sample-weddings", label: "Sample", icon: "sparkles" },
  { id: "profile", label: "Profile", icon: "user" },
];

function getNavItemsForRole(role) {
  const normalizedRole = (role || "").toLowerCase();
  if (normalizedRole === "creator" || normalizedRole === ROLES?.CREATOR?.toLowerCase()) {
    return CREATOR_NAV_ITEMS;
  }
  if (
    normalizedRole === "host" || 
    normalizedRole === "wedding_user" || 
    normalizedRole === ROLES?.HOST?.toLowerCase()
  ) {
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

  aside.appendChild(buildSidebarBrand({ onNavigate }));
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

  const normalizedRole = (role || "").toLowerCase();
  const isCreator = normalizedRole === "creator" || normalizedRole === ROLES?.CREATOR?.toLowerCase();
  
  if (isCreator) {
    nav.classList.add("bottom-nav--scrollable");
  }

  const items = getNavItemsForRole(role);

  items.forEach((item) => {
    let btn;
    if (item.isExternal) {
      btn = document.createElement("a");
      btn.href = item.url;
      btn.target = "_blank";
      btn.rel = "noopener noreferrer";
      btn.classList.add("bottom-nav__item", "bottom-nav__item--whatsapp");
      btn.innerHTML = `${item.rawSvg}`;
    } else {
      btn = document.createElement("button");
      btn.type = "button";
      btn.classList.add("bottom-nav__item");
      btn.setAttribute("data-page-id", item.id);
      if (item.id === activeItemId) {
        btn.classList.add("bottom-nav__item--active");
      }
      btn.innerHTML = `
        <i data-lucide="${item.icon}" class="bottom-nav__icon"></i>
        <span class="bottom-nav__label">${item.label}</span>
      `;
      btn.addEventListener("click", () => onNavigate(item.id));
    }

    nav.appendChild(btn);
  });

  return nav;
}

function buildSidebarBrand({ onNavigate } = {}) {
  const brand = document.createElement("a");
  brand.href = "#";
  brand.classList.add("sidebar__brand");
  brand.setAttribute("aria-label", "Shaadi Saathi Home");

  const logoBadge = document.createElement("div");
  logoBadge.classList.add("sidebar__logo-badge");

  const logoImg = document.createElement("img");
  logoImg.src = "/global/logos/logo.png";
  logoImg.alt = "Shaadi Saathi Logo";
  logoImg.width = 44;
  logoImg.height = 44;
  logoBadge.appendChild(logoImg);

  const brandText = document.createElement("div");
  brandText.classList.add("sidebar__brand-text", "signature-glow");
  brandText.textContent = "Shaadi Saathi";

  brand.appendChild(logoBadge);
  brand.appendChild(brandText);

  brand.addEventListener("click", (e) => {
    e.preventDefault();
    if (onNavigate) {
      onNavigate("home");
    }
    window.location.hash = "";
  });

  return brand;
}

function buildSidebarNav({ role, activeItemId, onNavigate }) {
  const nav = document.createElement("nav");
  nav.classList.add("sidebar__nav");

  const list = document.createElement("ul");
  list.classList.add("sidebar__nav-list");

  const items = getNavItemsForRole(role);

  items.forEach((item) => {
    if (!item.isExternal) {
      list.appendChild(buildSidebarNavItem({ item, isActive: item.id === activeItemId, onNavigate }));
    }
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