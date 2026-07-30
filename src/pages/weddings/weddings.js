import { createCard } from "../../components/card/card.js";
import { supabase } from "../../config/api.js";

export function renderWeddings() {
  console.log("[DEBUG] renderWeddings called synchronously.");
  
  const section = document.createElement("section");
  section.classList.add("weddings-page");
  section.style.cssText = "padding: 2rem; color: #f3f4f6; width: 100%; box-sizing: border-box;";

  section.appendChild(buildPageHeader());

  const contentContainer = document.createElement("div");
  contentContainer.id = "weddingsContentContainer";
  contentContainer.innerHTML = `<div style="text-align: center; color: #9ca3af; padding: 2rem;">Loading weddings...</div>`;
  section.appendChild(contentContainer);

  fetchAndRenderWeddingsList(contentContainer);

  return section;
}

async function fetchAndRenderWeddingsList(container) {
  try {
    let weddingsList = [];
    const { data, error } = await supabase.from('weddings').select('*');
    
    if (error) throw error;

    if (data) {
      weddingsList = data.map(w => ({
        id: w.id,
        coupleNames: w.couple_names,
        weddingDate: w.wedding_date,
        guestCount: w.guest_count || 0,
        eventCount: w.event_count || 0,
        owners: w.owners || ["Owner"]
      }));
    }

    console.log("[DEBUG] Fetched weddings list for All Weddings page:", weddingsList);
    container.innerHTML = "";

    const groups = groupWeddingsByStatus(weddingsList);

    container.appendChild(
      buildWeddingSection({
        title: "Ongoing Celebrations",
        weddings: groups.ongoing,
        emptyMessage: "No weddings are currently underway.",
      })
    );

    container.appendChild(
      buildWeddingSection({
        title: "Upcoming Celebrations",
        weddings: groups.upcoming,
        emptyMessage: "No upcoming weddings scheduled yet.",
      })
    );

    container.appendChild(
      buildWeddingSection({
        title: "Cherished Memories",
        weddings: groups.past,
        emptyMessage: "No past weddings yet — memories will appear here once a celebration concludes.",
      })
    );

  } catch (err) {
    console.error("[DEBUG ERROR] Failed to load weddings list:", err);
    container.innerHTML = `<div style="color: #ef4444; padding: 2rem; background: #231718; border: 1px solid #3d292b; border-radius: 8px;">Failed to load weddings: ${err.message}</div>`;
  }
}

function buildPageHeader() {
  const header = document.createElement("div");
  header.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;";

  const textWrap = document.createElement("div");

  const title = document.createElement("h1");
  title.style.cssText = "font-size: 2rem; font-weight: bold; color: #fdf8f6; margin: 0;";
  title.textContent = "All Weddings";

  const subtitle = document.createElement("p");
  subtitle.style.cssText = "color: #9ca3af; margin: 0.25rem 0 0 0; font-size: 0.95rem;";
  subtitle.textContent = "Every celebration you manage, in one place.";

  textWrap.appendChild(title);
  textWrap.appendChild(subtitle);
  header.appendChild(textWrap);

  return header;
}

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

function startOfDay(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function buildWeddingSection({ title, weddings, emptyMessage }) {
  const section = document.createElement("div");
  section.style.cssText = "margin-bottom: 2.5rem;";

  const heading = document.createElement("h2");
  heading.style.cssText = "font-size: 1.25rem; font-weight: bold; color: #fdf8f6; margin-bottom: 1rem;";
  heading.textContent = title;
  section.appendChild(heading);

  if (weddings.length === 0) {
    const wrap = document.createElement("div");
    wrap.style.cssText = "background: #231718; border: 1px solid #3d292b; border-radius: 12px; padding: 1.5rem; text-align: center; color: #9ca3af; font-size: 0.875rem;";
    const text = document.createElement("p");
    text.style.margin = "0";
    text.textContent = emptyMessage;
    wrap.appendChild(text);
    section.appendChild(wrap);
    return section;
  }

  const grid = document.createElement("div");
  grid.style.cssText = "display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem;";

  weddings.forEach((wedding) => {
    grid.appendChild(buildWeddingCard(wedding));
  });

  section.appendChild(grid);
  return section;
}

function buildWeddingCard(wedding) {
  const card = createCard({
    title: wedding.coupleNames,
    icon: "heart",
    content: buildWeddingCardBody(wedding),
    variant: "elevated",
    hoverable: true,
  });

  card.style.cssText = "cursor: pointer; background: #231718; border: 1px solid #3d292b; border-radius: 12px; color: #f3f4f6; display: flex; flex-direction: column; justify-content: space-between;";
  card.addEventListener('click', () => {
    console.log("[DEBUG] All Weddings card clicked, redirecting to weddingId:", wedding.id);
    window.location.hash = `#dashboard?weddingId=${wedding.id}`;
  });

  return card;
}

function buildWeddingCardBody(wedding) {
  const fragment = document.createDocumentFragment();

  const dateRow = document.createElement("div");
  dateRow.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; font-size: 0.875rem;";

  const dateEl = document.createElement("span");
  dateEl.style.color = "#9ca3af";
  dateEl.textContent = formatWeddingDate(wedding.weddingDate);

  const daysRemainingEl = document.createElement("span");
  daysRemainingEl.style.cssText = "color: #e0bc6a; background: #3d292b; padding: 0.2rem 0.6rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 500;";
  daysRemainingEl.textContent = formatDaysRemaining(wedding.weddingDate);

  dateRow.appendChild(dateEl);
  dateRow.appendChild(daysRemainingEl);

  const statsRow = document.createElement("div");
  statsRow.style.cssText = "display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.875rem; color: #9ca3af; border-top: 1px solid #3d292b; padding-top: 0.75rem; margin-top: 0.5rem;";

  statsRow.appendChild(buildStatItem("users", `${wedding.guestCount} Guests`));
  statsRow.appendChild(buildStatItem("calendar", `${wedding.eventCount} Events`));
  statsRow.appendChild(buildStatItem("shield-check", wedding.owners.join(", ")));

  fragment.appendChild(dateRow);
  fragment.appendChild(statsRow);

  return fragment;
}

function buildStatItem(icon, label) {
  const item = document.createElement("div");
  item.style.cssText = "display: flex; align-items: center; gap: 0.5rem;";

  const iconEl = document.createElement("i");
  iconEl.setAttribute("data-lucide", icon);
  iconEl.style.cssText = "width: 16px; height: 16px; color: #e0bc6a;";

  const labelEl = document.createElement("span");
  labelEl.textContent = label;

  item.appendChild(iconEl);
  item.appendChild(labelEl);

  return item;
}

function formatWeddingDate(isoDate) {
  const date = new Date(isoDate);
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDaysRemaining(isoDate) {
  const today = startOfDay(new Date());
  const weddingDay = startOfDay(new Date(isoDate));
  const diffDays = Math.round((weddingDay.getTime() - today.getTime()) / 86400000);

  if (diffDays === 0) return "Today";
  if (diffDays > 0) return `In ${diffDays} day${diffDays === 1 ? "" : "s"}`;
  return `${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? "" : "s"} ago`;
}