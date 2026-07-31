export function renderDashboard() {
    const page = document.createElement('div');
    page.innerHTML = `
        <h1 class="page-title">Dashboard</h1>
        <p class="page-subtitle">Welcome back! Here is your studio overview.</p>
    `;
    return page;
}