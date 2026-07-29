/**
 * ============================================================
 * Project : Shaadi Saathi
 * File    : dashboard.js
 * Purpose : Renders the main Dashboard page. Assembles stat
 *           cards, recent weddings, and recent activity using
 *           shared components (Card, Button, Modal, Toast).
 *           Returns a DOM element ready to be mounted into the 
 *           app shell — NOT an HTML string, to stay consistent
 *           with the component factory pattern used across the app.
 * Author  : Paresh Bafna
 * ============================================================
 */

import { createCard } from "../../components/card/card.js";
import { createButton } from "../../components/button/button.js";
import { openCreateWeddingModal } from "../../utils/wedding-actions.js";

/**
 * @typedef {Object} DashboardStat
 * @property {string} label - Stat label (e.g. "Active Weddings").
 * @property {number} value - Stat numeric value.
 * @property {string} icon  - Lucide icon name representing the stat.
 */

/**
 * Placeholder stats shown until real data wiring (Supabase) is
 * connected. Replace this with a live data fetch when the
 * backend service layer is built.
 *
 * @type {DashboardStat[]}
 */
const PLACEHOLDER_STATS = [
  { label: "Active Weddings", value: 0, icon: "heart" },
  { label: "Upcoming Weddings", value: 0, icon: "calendar-clock" },
  { label: "Archived Weddings", value: 0, icon: "archive" },
  { label: "Total Guests", value: 0, icon: "users" },
];

/**
 * Renders the full Dashboard page as a mounted DOM element.
 *
 * @returns {HTMLElement} The dashboard <section> element.
 *
 * @example
 * import { renderDashboard } from "./pages/dashboard/dashboard.js";
 * document.querySelector("#app").appendChild(renderDashboard());
 * lucide.createIcons();
 */
export function renderDashboard() {
  const section = document.createElement("section");
  section.classList.add("dashboard");

  section.appendChild(buildDashboardHeader());
  section.appendChild(buildStatsGrid(PLACEHOLDER_STATS));
  section.appendChild(buildRecentWeddingsSection());
  section.appendChild(buildRecentActivitySection());

  return section;
}

/**
 * Builds the dashboard page header (greeting title + subtitle).
 *
 * @returns {HTMLDivElement}
 */
function buildDashboardHeader() {
  const header = document.createElement("div");
  header.classList.add("dashboard__header");

  const title = document.createElement("h1");
  title.classList.add("dashboard__title");
  title.textContent = "Good Morning, Paresh 👋";

  const subtitle = document.createElement("p");
  subtitle.classList.add("dashboard__subtitle");
  subtitle.textContent = "Welcome back! Here's an overview of your weddings.";

  header.appendChild(title);
  header.appendChild(subtitle);

  return header;
}

/**
 * Builds the statistics grid using the shared Card component.
 *
 * @param {DashboardStat[]} stats
 * @returns {HTMLDivElement}
 */
function buildStatsGrid(stats) {
  const grid = document.createElement("div");
  grid.classList.add("dashboard__stats");

  stats.forEach((stat) => {
    const statCard = createCard({
      icon: stat.icon,
      title: String(stat.value),
      subtitle: stat.label,
      variant: "elevated",
    });
    statCard.classList.add("dashboard__stat-card");
    grid.appendChild(statCard);
  });

  return grid;
}

/**
 * Builds the "Recent Weddings" section. Shows an empty state
 * until weddings exist, plus a "Create Wedding" quick action
 * that opens the Create Wedding modal.
 *
 * @returns {HTMLDivElement}
 */
function buildRecentWeddingsSection() {
  const section = document.createElement("div");
  section.classList.add("dashboard-section");

  const heading = document.createElement("h2");
  heading.textContent = "Recent Weddings";

  const emptyState = document.createElement("p");
  emptyState.classList.add("dashboard-section__empty");
  emptyState.textContent = "No weddings have been created yet.";

  const createWeddingBtn = createButton({
    label: "Create Wedding",
    icon: "plus",
    variant: "primary",
    onClick: handleCreateWeddingClick,
  });

  section.appendChild(heading);
  section.appendChild(emptyState);
  section.appendChild(createWeddingBtn);

  return section;
}

/**
 * Opens the Create Wedding modal and wires up its Cancel/Create
 * actions. On confirm, closes the modal and shows a success toast.
 * Replace the TODO with an actual Supabase insert once the
 * service layer is built.
 *
 * @returns {void}
 */

/**
 * Builds the "Recent Activity" section. Shows an empty state
 * until audit log entries exist.
 *
 * @returns {HTMLDivElement}
 */
function buildRecentActivitySection() {
  const section = document.createElement("div");
  section.classList.add("dashboard-section");

  const heading = document.createElement("h2");
  heading.textContent = "Recent Activity";

  const emptyState = document.createElement("p");
  emptyState.classList.add("dashboard-section__empty");
  emptyState.textContent = "No activity available.";

  section.appendChild(heading);
  section.appendChild(emptyState);

  return section;
}

/**
 * Opens the shared Create Wedding modal (see utils/wedding-actions.js).
 *
 * @returns {void}
 */
function handleCreateWeddingClick() {
  openCreateWeddingModal();
}