import { weddingService } from '../../../database/js/weddingService.js';

export function renderWeddings() {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = "padding: 2rem; color: #f3f4f6; width: 100%; box-sizing: border-box;";
    
    wrapper.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
            <div>
                <h1 style="font-size: 1.65rem; font-weight: bold; color: #fdf8f6; margin: 0;">All Weddings Directory</h1>
                <p style="color: #9ca3af; margin: 0.25rem 0 0 0; font-size: 0.9rem;">Manage all active client weddings and access their command centers.</p>
            </div>
            <button id="createNewWeddingBtn" style="background: #e0bc6a; color: #1a1011; border: none; padding: 0.5rem 1rem; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 0.85rem;">+ New Wedding</button>
        </div>

        <div style="background: #231718; border: 1px solid #3d292b; border-radius: 10px; overflow: hidden;">
            <div style="overflow-x: auto;">
                <table style="width: 100%; text-align: left; border-collapse: collapse; font-size: 0.85rem;">
                    <thead>
                        <tr style="border-bottom: 1px solid #3d292b; color: #9ca3af; background: #1a1011;">
                            <th style="padding: 0.75rem 1rem; font-weight: 600;">Couple Names</th>
                            <th style="padding: 0.75rem 1rem; font-weight: 600;">Wedding Date</th>
                            <th style="padding: 0.75rem 1rem; font-weight: 600;">Location</th>
                            <th style="padding: 0.75rem 1rem; font-weight: 600; text-align: right;">Action</th>
                        </tr>
                    </thead>
                    <tbody id="weddingsTableBody">
                        <tr><td colspan="4" style="text-align: center; padding: 2rem; color: #9ca3af;">Loading weddings directory...</td></tr>
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
            tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 2rem; color: #9ca3af;">No weddings found. Click "+ New Wedding" to create one.</td></tr>`;
            return;
        }

        tbody.innerHTML = weddings.map(wedding => `
            <tr style="border-bottom: 1px solid #3d292b; transition: background 0.15s; cursor: pointer;" 
                onmouseover="this.style.background='#1a1011'" 
                onmouseout="this.style.background='transparent'"
                onclick="window.location.href='wedding-detail.html?id=${wedding.id}'">
                <td style="padding: 0.85rem 1rem; font-weight: 600; color: #fdf8f6;">${wedding.couple_names}</td>
                <td style="padding: 0.85rem 1rem; color: #9ca3af;">${formatDate(wedding.wedding_date)}</td>
                <td style="padding: 0.85rem 1rem; color: #9ca3af;">${wedding.location || 'Chennai, India'}</td>
                <td style="padding: 0.85rem 1rem; text-align: right;">
                    <span style="color: #e0bc6a; font-weight: 600; font-size: 0.8rem;">Open Command Center →</span>
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