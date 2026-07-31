export function renderOwners() {
    const page = document.createElement('div');
    page.style.cssText = "padding: 2rem; color: #f3f4f6;";
    page.innerHTML = `
        <h1 style="font-size: 1.65rem; font-weight: bold; color: #fdf8f6; margin-bottom: 0.5rem;">Manage Owners</h1>
        <p style="color: #9ca3af; font-size: 0.9rem;">Manage co-creators, owners, and permissions for your studio.</p>
    `;
    return page;
}