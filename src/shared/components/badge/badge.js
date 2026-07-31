/**
 * ============================================================
 * Project : Shaadi Saathi
 * File    : badge.js
 * Purpose : Reusable Badge component factory. Used for status
 *           indicators (guest attendance, invitation status,
 *           wedding lifecycle state) as well as generic labels
 *           (tags, counts). All badges in the app must be
 *           created through this single factory to avoid
 *           duplicate badge markup or styling.
 * Author  : Paresh Bafna
 * ============================================================
 */

/**
 * @typedef {Object} BadgeOptions
 * @property {string} label - Text content of the badge.
 * @property {"neutral"|"primary"|"secondary"|"success"|"warning"|"danger"|"info"} [tone="neutral"] - Generic color tone.
 * @property {"confirmed"|"pending"|"declined"|"invited"|"tentative"|null} [status=null] - Status-specific variant. When provided, this takes precedence over `tone`.
 * @property {"sm"|"md"} [size="md"] - Badge size.
 * @property {boolean} [dot=false] - Whether to show a leading status dot instead of/with an icon.
 * @property {string} [icon] - Optional Lucide icon name shown before the label.
 */

/**
 * Maps status keywords to their semantic tone, so status badges
 * (guest attendance, invitation tracking) stay visually consistent
 * across every part of the app without repeating color logic.
 *
 * @type {Record<string, string>}
 */
const STATUS_TONE_MAP = {
  confirmed: "success",
  attending: "success",
  invited: "info",
  pending: "warning",
  tentative: "warning",
  declined: "danger",
  "not-attending": "danger",
};

/**
 * Human-readable default labels for known status keys, used when
 * no explicit `label` is passed alongside a `status`.
 *
 * @type {Record<string, string>}
 */
const STATUS_LABEL_MAP = {
  confirmed: "Confirmed",
  attending: "Attending",
  invited: "Invited",
  pending: "Pending",
  tentative: "Tentative",
  declined: "Declined",
  "not-attending": "Not Attending",
};

/**
 * Creates a fully-styled Badge element.
 *
 * @param {BadgeOptions} options - Configuration options for the badge.
 * @returns {HTMLSpanElement} The constructed badge element.
 *
 * @example
 * // Generic tone badge
 * const tagBadge = createBadge({ label: "VIP", tone: "primary" });
 *
 * @example
 * // Status badge (tone auto-derived from status)
 * const attendanceBadge = createBadge({ status: "confirmed", dot: true });
 */
export function createBadge(options = {}) {
  const {
    label = "",
    tone = "neutral",
    status = null,
    size = "md",
    dot = false,
    icon = "",
  } = options;

  const resolvedTone = status ? (STATUS_TONE_MAP[status] || "neutral") : tone;
  const resolvedLabel = label || (status ? STATUS_LABEL_MAP[status] || status : "");

  const badge = document.createElement("span");
  badge.classList.add("badge", `badge--${resolvedTone}`, `badge--${size}`);

  if (status) {
    badge.classList.add(`badge--status-${status}`);
    badge.setAttribute("data-status", status);
  }

  if (dot) {
    const dotEl = document.createElement("span");
    dotEl.classList.add("badge__dot");
    dotEl.setAttribute("aria-hidden", "true");
    badge.appendChild(dotEl);
  }

  if (icon) {
    const iconEl = document.createElement("i");
    iconEl.setAttribute("data-lucide", icon);
    iconEl.classList.add("badge__icon");
    badge.appendChild(iconEl);
  }

  if (resolvedLabel) {
    const labelEl = document.createElement("span");
    labelEl.classList.add("badge__label");
    labelEl.textContent = resolvedLabel;
    badge.appendChild(labelEl);
  }

  return badge;
}