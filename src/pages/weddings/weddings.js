/**
 * ============================================================
 * Project : Shaadi Saathi
 * File    : weddings.js
 * Purpose : Renders the Weddings listing page. Groups weddings
 *           into three premium-worded sections instead of the
 *           generic Past/Current/Future labels: "Ongoing
 *           Celebrations", "Upcoming Celebrations", and
 *           "Cherished Memories". Each wedding is shown as a
 *           card with couple names, date, days remaining, guest
 *           count, event count, and owners.
 * Author  : Paresh Bafna
 * ============================================================
 */

import { createCard } from "../../components/card/card.js";
import { createButton } from "../../components/button/button.js";
import { openCreateWeddingModal } from "../../utils/wedding-actions.js";

/**
 * @typedef {Object} Wedding
 * @property {string} id
 * @property {string} coupleNames - e.g. "Riya & Karan"
 * @property {string} weddingDate - ISO date string (YYYY-MM-DD) of the primary/main event.
 * @property {number} guestCount
 * @property {number} eventCount
 * @property {string[]} owners - Names of up to 2 owners assigned to this wedding.
 */

/**
 * Placeholder wedding data, empty until Supabase is wired in.
 * Replace with a real fetch from the wedding-service layer once
 * the backend exists. Kept empty (rather than fabricated demo
 * entries) to stay consistent with how Dashboard handles the
 * "no data yet" state.
 *
 * @type {Wedding[]}
 */
const PLACEHOLDER_WEDDINGS = [
  {
    id: "1",
    coupleNames: "Riya & Karan",
    weddingDate: "2026-12-14",
    guestCount: 240,
    eventCount: 4,
    owners: ["Riya's Father", "Karan's Mother"],
  },
];  

/**
 * Renders the full Weddings listing page as a mounted DOM element.
 *
 * @returns {HTMLElement} The weddings <section> element.
 *
 * @example
 * import { renderWeddings } from "./pages/weddings/weddings.js";
 * document.querySelector("#app").appendChild(renderWeddings());
 * lucide.createIcons();
 */
export function renderWeddings() {
  const section = document.createElement("section");
  section.classList.add("weddings-page");

  section.appendChild(buildPageHeader());

  const groups = groupWeddingsByStatus(PLACEHOLDER_WEDDINGS);

  section.appendChild(
    buildWeddingSection({
      title: "Ongoing Celebrations",
      weddings: groups.ongoing,
      emptyMessage: "No weddings are currently underway.",
      showCreateAction: true,
    })
  );

  section.appendChild(
    buildWeddingSection({
      title: "Upcoming Celebrations",
      weddings: groups.upcoming,
      emptyMessage: "No upcoming weddings scheduled yet.",
      showCreateAction: true,
    })
  );

  section.appendChild(
    buildWeddingSection({
      title: "Cherished Memories",
      weddings: groups.past,
      emptyMessage: "No past weddings yet — memories will appear here once a celebration concludes.",
      showCreateAction: false,
    })
  );

  return section;
}

/**
 * Builds the page header (title + subtitle + primary Create
 * Wedding action).
 *
 * @returns {HTMLDivElement}
 */
function buildPageHeader() {
  const header = document.createElement("div");
  header.classList.add("weddings-page__header");

  const textWrap = document.createElement("div");

  const title = document.createElement("h1");
  title.classList.add("weddings-page__title");
  title.textContent = "All Weddings";

  const subtitle = document.createElement("p");
  subtitle.classList.add("weddings-page__subtitle");
  subtitle.textContent = "Every celebration you manage, in one place.";

  textWrap.appendChild(title);
  textWrap.appendChild(subtitle);

  const createBtn = createButton({
    label: "Create Wedding",
    icon: "plus",
    variant: "primary",
    onClick: () => openCreateWeddingModal(),
  });

  header.appendChild(textWrap);
  header.appendChild(createBtn);

  return header;
}

/**
 * Splits weddings into three status groups based on their
 * wedding date relative to today:
 * - "ongoing": the wedding date is today.
 * - "upcoming": the wedding date is in the future.
 * - "past": the wedding date has already passed ("Cherished Memories").
 *
 * @param {Wedding[]} weddings
 * @returns {{ ongoing: Wedding[], upcoming: Wedding[], past: Wedding[] }}
 */
function groupWeddingsByStatus(weddings) {
  const today = startOfDay(new Date());

  return weddings.reduce(
    (groups, wedding) => {
      const weddingDay = startOfDay(new Date(wedding.weddingDate));

      if (weddingDay.getTime() === today.getTime()) {
        groups.ongoing.push(wedding);
      } else if (weddingDay.getTime() > today.getTime()) {
        groups.upcoming.push(wedding);
      } else {
        groups.past.push(wedding);
      }

      return groups;
    },
    { ongoing: [], upcoming: [], past: [] }
  );
}

/**
 * Zeroes out the time portion of a Date so day-level comparisons
 * aren't affected by the current time of day.
 *
 * @param {Date} date
 * @returns {Date}
 */
function startOfDay(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/**
 * Builds a full section (heading + grid of wedding cards or an
 * empty state).
 *
 * @param {Object} params
 * @param {string} params.title
 * @param {Wedding[]} params.weddings
 * @param {string} params.emptyMessage
 * @param {boolean} params.showCreateAction - Whether to show a "Create Wedding" button in the empty state.
 * @returns {HTMLDivElement}
 */
function buildWeddingSection({ title, weddings, emptyMessage, showCreateAction }) {
  const section = document.createElement("div");
  section.classList.add("weddings-section");

  const heading = document.createElement("h2");
  heading.classList.add("weddings-section__title");
  heading.textContent = title;
  section.appendChild(heading);

  if (weddings.length === 0) {
    section.appendChild(buildEmptyState(emptyMessage, showCreateAction));
    return section;
  }

  const grid = document.createElement("div");
  grid.classList.add("weddings-section__grid");

  weddings.forEach((wedding) => {
    grid.appendChild(buildWeddingCard(wedding));
  });

  section.appendChild(grid);
  return section;
}

/**
 * Builds the empty-state block shown when a section has no
 * weddings, optionally including a "Create Wedding" quick action.
 *
 * @param {string} message
 * @param {boolean} showCreateAction
 * @returns {HTMLDivElement}
 */
function buildEmptyState(message, showCreateAction) {
  const wrap = document.createElement("div");
  wrap.classList.add("weddings-section__empty");

  const text = document.createElement("p");
  text.textContent = message;
  wrap.appendChild(text);

  if (showCreateAction) {
    const createBtn = createButton({
      label: "Create Wedding",
      icon: "plus",
      variant: "outline",
      size: "sm",
      onClick: () => openCreateWeddingModal(),
    });
    wrap.appendChild(createBtn);
  }

  return wrap;
}

/**
 * Builds a single wedding card using the shared Card component,
 * with a custom body showing date, days remaining, guest count,
 * event count, and owners.
 *
 * @param {Wedding} wedding
 * @returns {HTMLDivElement}
 */
function buildWeddingCard(wedding) {
  const card = createCard({
    title: wedding.coupleNames,
    icon: "heart",
    content: buildWeddingCardBody(wedding),
    variant: "elevated",
    hoverable: true,
  });

  card.classList.add("wedding-card");
  return card;
}

/**
 * Builds the custom body content for a wedding card: formatted
 * date, days-remaining chip, and a stats row (guests, events,
 * owners).
 *
 * @param {Wedding} wedding
 * @returns {DocumentFragment}
 */
function buildWeddingCardBody(wedding) {
  const fragment = document.createDocumentFragment();

  const dateRow = document.createElement("div");
  dateRow.classList.add("wedding-card__date-row");

  const dateEl = document.createElement("span");
  dateEl.classList.add("wedding-card__date");
  dateEl.textContent = formatWeddingDate(wedding.weddingDate);

  const daysRemainingEl = document.createElement("span");
  daysRemainingEl.classList.add("wedding-card__days-remaining");
  daysRemainingEl.textContent = formatDaysRemaining(wedding.weddingDate);

  dateRow.appendChild(dateEl);
  dateRow.appendChild(daysRemainingEl);

  const statsRow = document.createElement("div");
  statsRow.classList.add("wedding-card__stats");

  statsRow.appendChild(buildStatItem("users", `${wedding.guestCount} Guests`));
  statsRow.appendChild(buildStatItem("calendar", `${wedding.eventCount} Events`));
  statsRow.appendChild(buildStatItem("shield-check", wedding.owners.join(", ")));

  fragment.appendChild(dateRow);
  fragment.appendChild(statsRow);

  return fragment;
}

/**
 * Builds a single icon + label stat row item used inside a
 * wedding card's stats section.
 *
 * @param {string} icon
 * @param {string} label
 * @returns {HTMLDivElement}
 */
function buildStatItem(icon, label) {
  const item = document.createElement("div");
  item.classList.add("wedding-card__stat-item");

  const iconEl = document.createElement("i");
  iconEl.setAttribute("data-lucide", icon);

  const labelEl = document.createElement("span");
  labelEl.textContent = label;

  item.appendChild(iconEl);
  item.appendChild(labelEl);

  return item;
}

/**
 * Formats an ISO date string into a readable display format,
 * e.g. "2026-12-14" -> "14 Dec 2026".
 *
 * @param {string} isoDate
 * @returns {string}
 */
function formatWeddingDate(isoDate) {
  const date = new Date(isoDate);
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Returns a human-readable "days remaining" string relative to
 * today, e.g. "In 12 days", "Today", or "3 days ago".
 *
 * @param {string} isoDate
 * @returns {string}
 */
function formatDaysRemaining(isoDate) {
  const today = startOfDay(new Date());
  const weddingDay = startOfDay(new Date(isoDate));
  const diffDays = Math.round((weddingDay.getTime() - today.getTime()) / 86400000);

  if (diffDays === 0) return "Today";
  if (diffDays > 0) return `In ${diffDays} day${diffDays === 1 ? "" : "s"}`;
  return `${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? "" : "s"} ago`;
}