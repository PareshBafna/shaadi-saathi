import { createBadge } from "./badge.js";
import { ROLE_LABELS, ROLE_TONES } from "../../js/roles.js";

export function createHeader(options = {}) {
  const {
    pageTitle = "",
    user = { name: "", role: "guest" },
    isVerified = true,
    verifyLink = "",
    notificationCount = 0,
    onNotificationsClick = () => {},
    onProfileClick = () => {},
    onMobileMenuClick = () => {},
  } = options;

  const header = document.createElement("header");
  header.classList.add("header");

  header.appendChild(buildHeaderLeft({ pageTitle, onMobileMenuClick }));
  header.appendChild(buildHeaderRight({ user, isVerified, verifyLink, notificationCount, onNotificationsClick, onProfileClick }));

  return header;
}

function buildHeaderLeft({ pageTitle, onMobileMenuClick }) {
  const left = document.createElement("div");
  left.classList.add("header__left");

  const menuBtn = document.createElement("button");
  menuBtn.type = "button";
  menuBtn.classList.add("header__menu-btn");
  menuBtn.innerHTML = `<i data-lucide="menu"></i>`;
  menuBtn.addEventListener("click", onMobileMenuClick);

  const title = document.createElement("h1");
  title.classList.add("header__title");
  title.textContent = pageTitle;

  left.appendChild(menuBtn);
  left.appendChild(title);

  return left;
}

function buildHeaderRight({ user, isVerified, verifyLink, notificationCount, onNotificationsClick, onProfileClick }) {
  const right = document.createElement("div");
  right.classList.add("header__right");
  right.style.cssText = "display: flex; align-items: center; gap: var(--space-4);";

  // INJECT WHATSAPP VERIFY BUTTON IF UNVERIFIED
  if (!isVerified && verifyLink) {
    const verifyBtn = document.createElement("a");
    verifyBtn.href = verifyLink;
    verifyBtn.target = "_blank";
    verifyBtn.style.cssText = "background: #25D366; color: white; padding: 6px 12px; border-radius: var(--radius-sm); text-decoration: none; font-size: var(--font-size-sm); font-weight: var(--font-weight-bold); display: flex; align-items: center; gap: 6px; transition: opacity 0.2s;";
    verifyBtn.onmouseover = () => verifyBtn.style.opacity = '0.9';
    verifyBtn.onmouseout = () => verifyBtn.style.opacity = '1';
    verifyBtn.innerHTML = `<i data-lucide="message-circle" style="width: 16px; height: 16px;"></i> Verify Account`;
    right.appendChild(verifyBtn);
  }

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