import { weddingService } from '../../../database/weddingService.js';

export function renderWeddings() {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = "width: 100%; box-sizing: border-box;";
    
    wrapper.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
            <div>
                <h1 class="page-title">All Weddings Directory</h1>
                <p class="page-subtitle">Manage all active client weddings and access their command centers.</p>
            </div>
            <button id="createNewWeddingBtn" style="background: var(--accent); color: var(--bg-surface); border: none; padding: 0.5rem 1rem; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 0.85rem;">+ New Wedding</button>
        </div>

        <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 10px; overflow: hidden;">
            <div style="overflow-x: auto;">
                <table style="width: 100%; text-align: left; border-collapse: collapse; font-size: 0.85rem;">
                    <thead>
                        <tr style="border-bottom: 1px solid var(--border-color); color: var(--text-secondary); background: var(--bg-main);">
                            <th style="padding: 0.75rem 1rem; font-weight: 600;">Couple Names</th>
                            <th style="padding: 0.75rem 1rem; font-weight: 600;">Wedding Date</th>
                            <th style="padding: 0.75rem 1rem; font-weight: 600;">Location</th>
                            <th style="padding: 0.75rem 1rem; font-weight: 600; text-align: right;">Action</th>
                        </tr>
                    </thead>
                    <tbody id="weddingsTableBody">
                        <tr><td colspan="4" style="text-align: center; padding: 2rem; color: var(--text-secondary);">Loading weddings directory...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    loadWeddingsList(wrapper);
    return wrapper;
}

async function loadWeddingsList(container) {
    try {
        const weddings = await weddingService.getWeddingsByUser();
        const tbody = container.querySelector('#weddingsTableBody');

        if (!weddings || weddings.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 2rem; color: var(--text-secondary);">No weddings found. Click "+ New Wedding" to create one.</td></tr>`;
            return;
        }

        tbody.innerHTML = weddings.map(wedding => `
            <tr style="border-bottom: 1px solid var(--border-color); transition: background 0.15s; cursor: pointer;" 
                onmouseover="this.style.background='var(--bg-main)'" 
                onmouseout="this.style.background='transparent'"
                onclick="window.location.href='wedding-detail.html?id=${wedding.id}'">
                <td style="padding: 0.85rem 1rem; font-weight: 600; color: var(--text-primary);">${wedding.couple_names}</td>
                <td style="padding: 0.85rem 1rem; color: var(--text-secondary);">${formatDate(wedding.wedding_date)}</td>
                <td style="padding: 0.85rem 1rem; color: var(--text-secondary);">${wedding.location || 'Chennai, India'}</td>
                <td style="padding: 0.85rem 1rem; text-align: right;">
                    <span style="color: var(--accent); font-weight: 600; font-size: 0.8rem;">Open Command Center →</span>
                </td>
            </tr>
        `).join('');

    } catch (err) {
        console.error("[ERROR] Failed to load weddings directory:", err);
        const tbody = container.querySelector('#weddingsTableBody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 2rem; color: #ef4444;">Failed to load weddings: ${err.message}</td></tr>`;
        }
    }
}

function formatDate(isoDate) {
    if (!isoDate) return "-";
    const date = new Date(isoDate);
    return date.toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' });
}