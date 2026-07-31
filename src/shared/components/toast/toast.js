/**
 * ============================================================
 * Project : Shaadi Saathi
 * File    : toast.js
 * Purpose : Reusable Toast (transient notification) component.
 *           Used for confirmations like "Wedding Created",
 *           "Guest Imported", "Invitation Sent", errors, and
 *           any other brief system feedback. All toasts must be
 *           triggered through this single module so stacking,
 *           timing, and positioning stay consistent app-wide.
 * Author  : Paresh Bafna
 * ============================================================
 */

/**
 * @typedef {Object} ToastOptions
 * @property {string} message - Toast message text.
 * @property {"success"|"error"|"warning"|"info"} [type="info"] - Visual/semantic tone.
 * @property {number} [duration=4000] - Milliseconds before auto-dismiss. Pass 0 to disable auto-dismiss.
 * @property {string} [icon] - Optional Lucide icon override. Defaults to a type-appropriate icon.
 */

/**
 * Default icon per toast type, used when no explicit icon is given.
 *
 * @type {Record<string, string>}
 */
const DEFAULT_TYPE_ICONS = {
  success: "check-circle",
  error: "x-circle",
  warning: "alert-triangle",
  info: "info",
};

/**
 * Lazily-created container that holds all active toasts,
 * stacked vertically. Created once and reused for every toast.
 *
 * @type {HTMLDivElement|null}
 */
let toastContainer = null;

/**
 * Returns the shared toast container, creating and mounting it
 * to document.body on first use.
 *
 * @returns {HTMLDivElement}
 */
function getToastContainer() {
  if (toastContainer) return toastContainer;

  toastContainer = document.createElement("div");
  toastContainer.classList.add("toast-container");
  toastContainer.setAttribute("aria-live", "polite");
  toastContainer.setAttribute("aria-atomic", "true");
  document.body.appendChild(toastContainer);

  return toastContainer;
}

/**
 * Shows a toast notification. Automatically dismisses after
 * `duration` ms unless duration is set to 0.
 *
 * @param {ToastOptions} options - Configuration options for the toast.
 * @returns {{ dismiss: () => void }} Controller to dismiss the toast early.
 *
 * @example
 * showToast({ message: "Wedding Created", type: "success" });
 *
 * @example
 * showToast({ message: "Failed to save changes", type: "error", duration: 6000 });
 */
export function showToast(options = {}) {
  const {
    message = "",
    type = "info",
    duration = 4000,
    icon = "",
  } = options;

  const container = getToastContainer();

  const toast = document.createElement("div");
  toast.classList.add("toast", `toast--${type}`);
  toast.setAttribute("role", type === "error" ? "alert" : "status");

  const iconEl = document.createElement("i");
  iconEl.setAttribute("data-lucide", icon || DEFAULT_TYPE_ICONS[type] || "info");
  iconEl.classList.add("toast__icon");

  const messageEl = document.createElement("span");
  messageEl.classList.add("toast__message");
  messageEl.textContent = message;

  const closeBtn = document.createElement("button");
  closeBtn.classList.add("toast__close-btn");
  closeBtn.setAttribute("aria-label", "Dismiss notification");
  closeBtn.innerHTML = `<i data-lucide="x"></i>`;

  toast.appendChild(iconEl);
  toast.appendChild(messageEl);
  toast.appendChild(closeBtn);
  container.appendChild(toast);

  // Trigger enter animation on next frame (so the initial state renders first).
  requestAnimationFrame(() => {
    toast.classList.add("toast--visible");
  });

  let dismissTimer = null;

  const dismiss = () => {
    if (dismissTimer) clearTimeout(dismissTimer);
    toast.classList.remove("toast--visible");
    toast.classList.add("toast--leaving");

    // Wait for exit transition to finish before removing from DOM.
    toast.addEventListener(
      "transitionend",
      () => {
        toast.remove();
      },
      { once: true }
    );
  };

  closeBtn.addEventListener("click", dismiss);

  if (duration > 0) {
    dismissTimer = setTimeout(dismiss, duration);
  }

  // Render the icons for this toast (Card/Button icons are handled
  // by the caller, but toast icons render immediately since toasts
  // are triggered dynamically at runtime, not part of a page build).
  if (typeof window !== "undefined" && window.lucide) {
    window.lucide.createIcons();
  }

  return { dismiss };
}