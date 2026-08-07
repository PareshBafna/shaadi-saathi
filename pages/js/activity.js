export function renderActivity() {
    const page = document.createElement('div');
    page.innerHTML = `
        <h1 class="page-title">Activity Log</h1>
        <p class="page-subtitle">Track real-time system events, guest check-ins, and updates.</p>
    `;
    return page;
}