/**
 * ============================================================
 * Project : Shaadi Saathi
 * File    : dashboard.js
 * Purpose : Renders the main Dashboard page. Assembles stat
 *           cards, recent weddings, and recent activity using
 *           shared components (Card, Button, Modal, Toast).
 *           Returns a DOM element ready to be mounted into the 
 *           app shell.
 * Author  : Paresh Bafna
 * ============================================================
 */

import { createCard } from "../../components/card/card.js";
import { createButton } from "../../components/button/button.js";
import { openCreateWeddingModal } from "../../utils/wedding-actions.js";
import { weddingService } from '../../services/weddingService.js';

/**
 * Renders the full Dashboard page as a mounted DOM element.
 * Returns the DOM element synchronously, then loads data asynchronously.
 *
 * @param {string} [weddingId] - Optional UUID of the specific wedding
 * @returns {HTMLElement} The dashboard <section> element.
 */

export function renderDashboard(weddingId = null) {
    // 1. Create and return the container SYNCHRONOUSLY so app.js can append it
    const section = document.createElement("section");
    section.classList.add("dashboard");

    // Render initial loading state
    section.innerHTML = `<div class="loader" style="padding: 2rem;">Loading Dashboard Analytics...</div>`;

    // 2. Fetch data ASYNCHRONOUSLY in the background
    loadDashboardData(section, weddingId);

    return section;
}

/**
 * Handles the async data fetching and DOM updating
 */
async function loadDashboardData(section, weddingId) {
    try {
        if (weddingId) {
            // --- SPECIFIC WEDDING DASHBOARD ---
            const [wedding, stats] = await Promise.all([
                weddingService.getWeddingById(weddingId),
                weddingService.getDashboardStats(weddingId)
            ]);

            section.innerHTML = ""; // Clear loader
            section.appendChild(buildSpecificHeader(wedding));

            const liveStats = [
                { label: "Total Guests", value: stats.totalGuests, icon: "users" },
                { label: "Attending", value: stats.rsvp.attending, icon: "check-circle" },
                { label: "Pending RSVPs", value: stats.rsvp.pending, icon: "clock" },
                { label: "Total Events", value: stats.totalEvents, icon: "calendar" }
            ];

            section.appendChild(buildStatsGrid(liveStats));
            section.appendChild(buildDietarySection(stats));

        } else {
            // --- GLOBAL OVERVIEW DASHBOARD ---
            const weddings = await weddingService.getWeddingsByUser();
            
            section.innerHTML = ""; // Clear loader
            section.appendChild(buildGlobalHeader());

            const globalStats = [
                { label: "Total Weddings", value: weddings.length, icon: "heart" },
                { label: "Upcoming", value: weddings.filter(w => new Date(w.wedding_date) >= new Date()).length, icon: "calendar-clock" },
                { label: "Archived", value: weddings.filter(w => new Date(w.wedding_date) < new Date()).length, icon: "archive" },
            ];

            section.appendChild(buildStatsGrid(globalStats));
            section.appendChild(buildRecentWeddingsSection(weddings));
            section.appendChild(buildRecentActivitySection());
        }

    } catch (error) {
        console.error('Failed to load dashboard:', error);
        
        // Handle the "User not authenticated" error gracefully
        if (error.message.includes('not authenticated')) {
            section.innerHTML = `
                <div class="error-state" style="padding: 2rem; text-align: center;">
                    <h2>Authentication Required</h2>
                    <p>You need to be logged in to view your dashboard.</p>
                    <a href="/login" class="btn btn-primary" style="margin-top: 1rem; display: inline-block;">Go to Login</a>
                </div>
            `;
        } else {
            section.innerHTML = `<div class="error-toast" style="color: red; padding: 2rem;">Failed to load data: ${error.message}</div>`;
        }
    }
}

// ------------------------------------------------------------
// Component Builders
// ------------------------------------------------------------

function buildGlobalHeader() {
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

function buildSpecificHeader(wedding) {
    const header = document.createElement("div");
    header.classList.add("dashboard__header");

    const title = document.createElement("h1");
    title.classList.add("dashboard__title");
    title.textContent = `${wedding.couple_names}'s Wedding Workspace`;

    const subtitle = document.createElement("p");
    subtitle.classList.add("dashboard__subtitle");
    subtitle.textContent = `📅 ${new Date(wedding.wedding_date).toLocaleDateString()}`;

    header.appendChild(title);
    header.appendChild(subtitle);
    return header;
}

function buildStatsGrid(stats) {
    const grid = document.createElement("div");
    grid.classList.add("dashboard__stats");
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = "repeat(auto-fit, minmax(200px, 1fr))";
    grid.style.gap = "1rem";
    grid.style.marginBottom = "2rem";

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

function buildDietarySection(stats) {
    const section = document.createElement("div");
    section.classList.add("dashboard-section");

    const heading = document.createElement("h2");
    heading.textContent = "Dietary Requirements";
    section.appendChild(heading);

    const card = document.createElement("div");
    card.classList.add("card", "section-card");
    card.style.padding = "1.5rem";
    card.style.marginTop = "1rem";

    card.innerHTML = `
        <ul class="diet-list" style="list-style: none; padding: 0; line-height: 1.8;">
            <li>🟢 Pure Veg: <strong>${stats.dietary.veg}</strong></li>
            <li>🟡 Jain: <strong>${stats.dietary.jain}</strong></li>
            <li>🔴 Non-Veg: <strong>${stats.dietary.non_veg}</strong></li>
            <li>🥚 Eggiterian: <strong>${stats.dietary.egg}</strong></li>
        </ul>
    `;
    
    section.appendChild(card);
    return section;
}

function buildRecentWeddingsSection(weddings = []) {
    const section = document.createElement("div");
    section.classList.add("dashboard-section");
    section.style.marginBottom = "2rem";

    const heading = document.createElement("h2");
    heading.textContent = "Recent Weddings";
    section.appendChild(heading);

    if (weddings.length === 0) {
        const emptyState = document.createElement("p");
        emptyState.classList.add("dashboard-section__empty");
        emptyState.textContent = "No weddings have been created yet.";
        section.appendChild(emptyState);
    } else {
        const list = document.createElement("ul");
        list.style.margin = "1rem 0";
        weddings.forEach(w => {
            const li = document.createElement("li");
            li.textContent = `${w.couple_names} - ${new Date(w.wedding_date).toLocaleDateString()}`;
            list.appendChild(li);
        });
        section.appendChild(list);
    }

    const createWeddingBtn = createButton({
        label: "Create Wedding",
        icon: "plus",
        variant: "primary",
        onClick: handleCreateWeddingClick,
    });
    section.appendChild(createWeddingBtn);

    return section;
}

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

function handleCreateWeddingClick() {
    openCreateWeddingModal();
}