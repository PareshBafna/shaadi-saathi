/**
 * ============================================================
 * Project : Shaadi Saathi
 * File    : header.js
 * Purpose : Reusable Header component. Renders the top app bar
 *           containing the page title, notifications trigger,
 *           and user profile menu (avatar + name + role badge).
 *           Persistent across all authenticated pages, paired
 *           with Sidebar to form the App Shell layout.
 * Author  : Paresh Bafna
 * ============================================================
 */

import { createBadge } from "../badge/badge.js";
import { ROLE_LABELS, ROLE_TONES } from "../../../core/roles.js";

/**
 * @typedef {Object} HeaderUser
 * @property {string} name - Display name of the logged-in user.
 * @property {"creator"|"owner"|"guest"} role - User's role, shown as a badge.
 * @property {string} [avatarUrl] - Optional avatar image URL. Falls back to initials if omitted.
 */

/**
 * @typedef {Object} HeaderOptions
 * @property {string} pageTitle - Current page title shown on the left side of the header.
 * @property {HeaderUser} user - Currently logged-in user info.
 * @property {number} [notificationCount=0] - Unread notification count shown as a dot/number badge.
 * @property {() => void} [onNotificationsClick] - Called when the notification bell is clicked.
 * @property {() => void} [onProfileClick] - Called when the profile area is clicked.
 * @property {() => void} [onMobileMenuClick] - Called when the mobile hamburger icon is clicked (shows sidebar on small screens).
 */

/**
 * Creates the Header element.
 *
 * @param {HeaderOptions} options - Configuration options for the header.
 * @returns {HTMLElement} The constructed <header> element.
 *
 * @example
 * const header = createHeader({
 *   pageTitle: "Dashboard",
 *   user: { name: "Paresh Bafna", role: "creator" },
 *   notificationCount: 3,
 *   onNotificationsClick: () => openNotificationsPanel(),
 *   onProfileClick: () => openProfileMenu(),
 *   onMobileMenuClick: () => sidebar.classList.toggle("sidebar--open"),
 * });
 * document.querySelector("#app-shell").appendChild(header);
 */
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

/**
 * Builds the left side of the header: mobile menu trigger + page title.
 *
 * @param {Object} params
 * @param {string} params.pageTitle
 * @param {() => void} params.onMobileMenuClick
 * @returns {HTMLDivElement}
 */
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

/**
 * Builds the right side of the header: notifications bell + profile.
 *
 * @param {Object} params
 * @param {HeaderUser} params.user
 * @param {number} params.notificationCount
 * @param {() => void} params.onNotificationsClick
 * @param {() => void} params.onProfileClick
 * @returns {HTMLDivElement}
 */
function buildHeaderRight({ user, notificationCount, onNotificationsClick, onProfileClick }) {
  const right = document.createElement("div");
  right.classList.add("header__right");

  right.appendChild(buildNotificationsButton({ notificationCount, onNotificationsClick }));
  right.appendChild(buildProfile({ user, onProfileClick }));

  return right;
}

/**
 * Builds the notification bell button with an optional unread count badge.
 *
 * @param {Object} params
 * @param {number} params.notificationCount
 * @param {() => void} params.onNotificationsClick
 * @returns {HTMLButtonElement}
 */
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

/**
 * Builds the profile section: avatar (or initials fallback),
 * user name, and role badge.
 *
 * @param {Object} params
 * @param {HeaderUser} params.user
 * @param {() => void} params.onProfileClick
 * @returns {HTMLButtonElement}
 */
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
    size: "sm",
  });
  textWrap.appendChild(roleBadge);

  profile.appendChild(textWrap);
  profile.addEventListener("click", onProfileClick);

  return profile;
}

/**
 * Builds the user avatar image, or an initials-based fallback
 * when no avatarUrl is provided.
 *
 * @param {HeaderUser} user
 * @returns {HTMLElement}
 */
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

/**
 * Extracts up to two uppercase initials from a full name.
 *
 * @param {string} name
 * @returns {string}
 */
function getInitials(name) {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}