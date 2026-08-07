export function renderHosts() {
    const page = document.createElement('div');
    page.innerHTML = `
        <h1 class="page-title">Manage Hosts</h1>
        <p class="page-subtitle">Manage co-creators, hosts, and permissions for your studio.</p>
    `;
    return page;
}