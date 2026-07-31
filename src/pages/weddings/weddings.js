import { supabase } from "../../config/api.js";

export function renderWeddings() {
  const section = document.createElement("section");
  section.classList.add("weddings-page");
  section.style.cssText = "padding: 2rem; color: #f3f4f6; width: 100%; box-sizing: border-box;";

  section.appendChild(buildPageHeader());

  const contentContainer = document.createElement("div");
  contentContainer.id = "weddingsTableContainer";
  contentContainer.innerHTML = `<div style="text-align: center; color: #9ca3af; padding: 2rem; font-size: 0.95rem;">Loading master directory...</div>`;
  section.appendChild(contentContainer);

  fetchAndRenderWeddingsTable(contentContainer);

  return section;
}

async function fetchAndRenderWeddingsTable(container) {
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

    renderTableContent(container, weddingsList);

  } catch (err) {
    console.error("[DEBUG ERROR] Failed to load weddings master directory:", err);
    container.innerHTML = `<div style="color: #ef4444; padding: 1.5rem; background: #231718; border: 1px solid #3d292b; border-radius: 10px; font-size: 0.95rem;">Failed to load master directory: ${err.message}</div>`;
  }
}

function buildPageHeader() {
  const header = document.createElement("div");
  header.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;";

  const textWrap = document.createElement("div");

  const title = document.createElement("h1");
  title.style.cssText = "font-size: 1.85rem; font-weight: bold; color: #fdf8f6; margin: 0; letter-spacing: -0.02em;";
  title.textContent = "All Weddings Directory";

  const subtitle = document.createElement("p");
  subtitle.style.cssText = "color: #9ca3af; margin: 0.35rem 0 0 0; font-size: 0.95rem;";
  subtitle.textContent = "Master database of all studio celebrations, search, and sort.";

  textWrap.appendChild(title);
  textWrap.appendChild(subtitle);
  header.appendChild(textWrap);

  return header;
}

function renderTableContent(container, weddings) {
  container.innerHTML = "";

  let currentSearch = "";
  let currentSort = "date-asc";

  const wrapper = document.createElement("div");
  wrapper.style.cssText = "background: #1a1011; border: 1px solid #3d292b; border-radius: 12px; padding: 1.5rem;";

  const controlsBar = document.createElement("div");
  controlsBar.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; gap: 1rem; flex-wrap: wrap;";
  
  controlsBar.innerHTML = `
    <div style="flex: 1; min-width: 240px; position: relative;">
      <input type="text" id="weddingSearchInput" placeholder="Search by couple names..." value="${currentSearch}" style="width: 100%; background: #231718; border: 1px solid #3d292b; border-radius: 8px; padding: 0.6rem 0.85rem 0.6rem 2.25rem; font-size: 0.875rem; color: white; box-sizing: border-box;" />
      <span style="position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); color: #9ca3af; display: flex; align-items: center;">
        <i data-lucide="search" style="width: 16px; height: 16px;"></i>
      </span>
    </div>
    <div style="display: flex; align-items: center; gap: 0.75rem;">
      <label style="font-size: 0.875rem; color: #9ca3af; white-space: nowrap;">Sort by:</label>
      <select id="weddingSortSelect" style="background: #231718; border: 1px solid #3d292b; border-radius: 8px; padding: 0.6rem 0.85rem; font-size: 0.875rem; color: white; cursor: pointer;">
        <option value="date-asc" ${currentSort === 'date-asc' ? 'selected' : ''}>Date (Earliest first)</option>
        <option value="date-desc" ${currentSort === 'date-desc' ? 'selected' : ''}>Date (Latest first)</option>
        <option value="name-asc" ${currentSort === 'name-asc' ? 'selected' : ''}>Couple Name (A-Z)</option>
      </select>
    </div>
  `;
  wrapper.appendChild(controlsBar);

  const tableContainer = document.createElement("div");
  tableContainer.style.cssText = "overflow-x: auto;";
  
  const table = document.createElement("table");
  table.style.cssText = "width: 100%; text-align: left; border-collapse: collapse; font-size: 0.875rem;";
  
  table.innerHTML = `
    <thead>
      <tr style="border-bottom: 1px solid #3d292b; color: #9ca3af;">
        <th style="padding: 0.75rem; font-weight: 600;">Couple Names</th>
        <th style="padding: 0.75rem; font-weight: 600;">Wedding Date</th>
        <th style="padding: 0.75rem; font-weight: 600;">Status</th>
        <th style="padding: 0.75rem; font-weight: 600;">Guests</th>
        <th style="padding: 0.75rem; font-weight: 600;">Events</th>
        <th style="padding: 0.75rem; font-weight: 600; text-align: right;">Action</th>
      </tr>
    </thead>
    <tbody id="masterWeddingTableBody"></tbody>
  `;
  tableContainer.appendChild(table);
  wrapper.appendChild(tableContainer);
  container.appendChild(wrapper);

  const tbody = table.querySelector('#masterWeddingTableBody');
  const searchInput = wrapper.querySelector('#weddingSearchInput');
  const sortSelect = wrapper.querySelector('#weddingSortSelect');

  function updateTableRows() {
    const query = searchInput.value.toLowerCase();
    const sortVal = sortSelect.value;

    let filtered = weddings.filter(w => w.coupleNames.toLowerCase().includes(query));

    filtered.sort((a, b) => {
      const dateA = new Date(a.weddingDate).getTime();
      const dateB = new Date(b.weddingDate).getTime();
      if (sortVal === 'date-asc') return dateA - dateB;
      if (sortVal === 'date-desc') return dateB - dateA;
      if (sortVal === 'name-asc') return a.coupleNames.localeCompare(b.coupleNames);
      return 0;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 2rem; color: #9ca3af;">No matching weddings found.</td></tr>`;
      return;
    }

    // 1. Build the HTML and store the ID in a data attribute
    tbody.innerHTML = filtered.map(wedding => {
      const statusBadge = getStatusBadge(wedding.weddingDate);
      return `
        <tr data-wedding-id="${wedding.id}" class="clickable-wedding-row" style="border-bottom: 1px solid #3d292b; cursor: pointer; transition: background 0.15s;" onmouseover="this.style.background='#231718'" onmouseout="this.style.background='transparent'">
          <td style="padding: 0.85rem 0.75rem; font-weight: 500; color: #fdf8f6;">${wedding.coupleNames}</td>
          <td style="padding: 0.85rem 0.75rem; color: #9ca3af;">${formatWeddingDate(wedding.weddingDate)}</td>
          <td style="padding: 0.85rem 0.75rem;"><span style="padding: 0.2rem 0.6rem; font-size: 0.75rem; border-radius: 9999px; font-weight: 500; background: ${statusBadge.bg}; color: ${statusBadge.color};">${statusBadge.label}</span></td>
          <td style="padding: 0.85rem 0.75rem; color: #9ca3af;">${wedding.guestCount}</td>
          <td style="padding: 0.85rem 0.75rem; color: #9ca3af;">${wedding.eventCount}</td>
          <td style="padding: 0.85rem 0.75rem; text-align: right;">
            <button style="background: #3d292b; color: #e0bc6a; border: 1px solid #573a3d; padding: 0.35rem 0.75rem; border-radius: 6px; font-size: 0.75rem; font-weight: 500; cursor: pointer;">Manage →</button>
          </td>
        </tr>
      `;
    }).join('');

    // 2. Attach standard JavaScript click listeners dynamically
    tbody.querySelectorAll('.clickable-wedding-row').forEach(row => {
      row.addEventListener('click', () => {
        const id = row.getAttribute('data-wedding-id');
        window.location.hash = `#wedding?id=${id}`;
        // Force the app router to fire immediately 
        window.dispatchEvent(new Event('hashchange'));
      });
    });

    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  searchInput.addEventListener('input', updateTableRows);
  sortSelect.addEventListener('change', updateTableRows);

  updateTableRows();
}

function getStatusBadge(isoDate) {
  const today = startOfDay(new Date());
  const weddingDay = startOfDay(new Date(isoDate));

  if (weddingDay.getTime() === today.getTime()) {
    return { label: "Ongoing", bg: "rgba(16, 185, 129, 0.2)", color: "#34d399" };
  } else if (weddingDay.getTime() > today.getTime()) {
    return { label: "Upcoming", bg: "rgba(224, 188, 106, 0.2)", color: "#e0bc6a" };
  } else {
    return { label: "Archived", bg: "rgba(156, 163, 175, 0.2)", color: "#9ca3af" };
  }
}

function startOfDay(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function formatWeddingDate(isoDate) {
  if (!isoDate) return "";
  const date = new Date(isoDate);
  const day = date.getDate();
  
  let suffix = "th";
  if (day === 1 || day === 21 || day === 31) suffix = "st";
  else if (day === 2 || day === 22) suffix = "nd";
  else if (day === 3 || day === 23) suffix = "rd";
  
  const month = date.toLocaleString("en-IN", { month: "long" });
  const year = date.getFullYear();
  
  return `${day}${suffix} ${month}, ${year}`;
}