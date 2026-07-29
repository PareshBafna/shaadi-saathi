/**
 * ============================================================
 * Project : Shaadi Saathi
 * File    : roles.js
 * Purpose : Single source of truth for the application's three
 *           roles (Creator, Owner, Guest) — role keys, display
 *           labels, and badge tones. Any file that needs to
 *           reference a role (Sidebar navigation, Header profile
 *           badge, future permission checks) must import from
 *           here rather than redefining its own role constants.
 * Author  : Paresh Bafna
 * ============================================================
 */

/**
 * Canonical role identifiers used throughout the app. Always
 * reference these constants instead of raw string literals
 * ("creator", "owner", "guest") so a typo becomes a build-time
 * error rather than a silent runtime bug.
 *
 * @type {{ CREATOR: "creator", OWNER: "owner", GUEST: "guest" }}
 */
export const ROLES = {
  CREATOR: "creator",
  OWNER: "owner",
  GUEST: "guest",
};

/**
 * Human-readable display label per role, used in the Header
 * profile role badge and anywhere else a role needs to be shown
 * to the user.
 *
 * @type {Record<string, string>}
 */
export const ROLE_LABELS = {
  [ROLES.CREATOR]: "Creator",
  [ROLES.OWNER]: "Owner",
  [ROLES.GUEST]: "Guest",
};

/**
 * Badge tone per role, matching the app's Bold Dark + Gold/Maroon
 * theme: Creator (gold/primary), Owner (maroon/secondary),
 * Guest (neutral).
 *
 * @type {Record<string, string>}
 */
export const ROLE_TONES = {
  [ROLES.CREATOR]: "primary",
  [ROLES.OWNER]: "secondary",
  [ROLES.GUEST]: "neutral",
};