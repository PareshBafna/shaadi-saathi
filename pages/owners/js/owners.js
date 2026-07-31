export function renderOwners() {
    const page = document.createElement('div');
    page.innerHTML = `
        <h1 class="page-title">Manage Owners</h1>
        <p class="page-subtitle">Manage co-creators, owners, and permissions for your studio.</p>
    `;
    return page;
}