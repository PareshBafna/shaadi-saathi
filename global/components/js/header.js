import { createBadge } from "./badge.js";
import { ROLE_LABELS, ROLE_TONES } from "../../js/roles.js";

export function createHeader(options = {}) {
  const {
    pageTitle = "",
    user = { name: "", role: "guest" },
    notificationCount = 0,
    onNotificationsClick = () => {},
    onProfileClick = () => {},
    onMobileMenuClick = () => {},
  } = options;

  const header = document.createElement("header");
  header.classList.add("header");

  header.appendChild(buildHeaderLeft({ pageTitle, onMobileMenuClick }));
  header.appendChild(buildHeaderRight({ user, notificationCount, onNotificationsClick, onProfileClick }));

  return header;
}

function buildHeaderLeft({ pageTitle, onMobileMenuClick }) {
  const left = document.createElement("div");
  left.classList.add("header__left");

  const menuBtn = document.createElement("button");
  menuBtn.type = "button";
  menuBtn.classList.add("header__menu-btn");
  menuBtn.setAttribute("aria-label", "Open navigation menu");
  menuBtn.innerHTML = `<i data-lucide="menu"></i>`;
  menuBtn.addEventListener("click", onMobileMenuClick);

  const title = document.createElement("h1");
  title.classList.add("header__title");
  title.textContent = pageTitle;

  left.appendChild(menuBtn);
  left.appendChild(title);

  return left;
}

function buildHeaderRight({ user, notificationCount, onNotificationsClick, onProfileClick }) {
  const right = document.createElement("div");
  right.classList.add("header__right");

  right.appendChild(buildNotificationsButton({ notificationCount, onNotificationsClick }));
  right.appendChild(buildProfile({ user, onProfileClick }));

  return right;
}

function buildNotificationsButton({ notificationCount, onNotificationsClick }) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.classList.add("header__notifications-btn");
  btn.setAttribute("aria-label", `Notifications${notificationCount > 0 ? ` (${notificationCount} unread)` : ""}`);

  const icon = document.createElement("i");
  icon.setAttribute("data-lucide", "bell");
  btn.appendChild(icon);

  if (notificationCount > 0) {
    const countBadge = document.createElement("span");
    countBadge.classList.add("header__notification-count");
    countBadge.textContent = notificationCount > 9 ? "9+" : String(notificationCount);
    btn.appendChild(countBadge);
  }

  btn.addEventListener("click", onNotificationsClick);
  return btn;
}

function buildProfile({ user, onProfileClick }) {
  const profile = document.createElement("button");
  profile.type = "button";
  profile.classList.add("header__profile");
  profile.setAttribute("aria-label", `Open profile menu for ${user.name}`);

  profile.appendChild(buildAvatar(user));

  const textWrap = document.createElement("div");
  textWrap.classList.add("header__profile-text");

  const nameEl = document.createElement("span");
  nameEl.classList.add("header__profile-name");
  nameEl.textContent = user.name;
  textWrap.appendChild(nameEl);

  const roleBadge = createBadge({
    label: ROLE_LABELS[user.role] || user.role,
    tone: ROLE_TONES[user.role] || "neutral",
  });
  textWrap.appendChild(roleBadge);

  profile.appendChild(textWrap);
  profile.addEventListener("click", onProfileClick);

  return profile;
}

function buildAvatar(user) {
  if (user.avatarUrl) {
    const img = document.createElement("img");
    img.classList.add("header__avatar");
    img.src = user.avatarUrl;
    img.alt = user.name;
    return img;
  }

  const fallback = document.createElement("div");
  fallback.classList.add("header__avatar", "header__avatar--fallback");
  fallback.textContent = getInitials(user.name);
  return fallback;
}

function getInitials(name) {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}