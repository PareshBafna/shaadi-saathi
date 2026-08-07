export function renderSettings() {
    const page = document.createElement('div');
    page.innerHTML = `
        <h1 class="page-title">Settings</h1>
        <p class="page-subtitle">Configure account details, studio branding, and preferences.</p>
    `;
    return page;
}