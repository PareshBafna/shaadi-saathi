import { renderAppLayout } from "../layouts/app/app.js";
import { renderHeader } from "../components/header/header.js";
import { renderSidebar } from "../components/sidebar/sidebar.js";
import { renderDashboard } from "../pages/dashboard/dashboard.js";

function initializeApp() {

    const app = document.getElementById("app");

    app.innerHTML = renderAppLayout();

    document.getElementById("sidebar").innerHTML = renderSidebar();

    document.getElementById("header").innerHTML = renderHeader();

    document.getElementById("content").innerHTML = renderDashboard();

    if (window.lucide) {
        window.lucide.createIcons();
    }

    console.log("Shaadi Saathi initialized.");
}

initializeApp();    