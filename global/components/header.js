export function createHeader({ pageTitle, user, notificationCount, onNotificationsClick, onProfileClick }) {
    const header = document.createElement("div");
    header.className = "header";
    
    header.innerHTML = `
        <div style="display: flex; align-items: center; gap: 1rem;">
            <h1 style="font-size: 1.15rem; font-weight: 600;">${pageTitle}</h1>
        </div>
        <div style="display: flex; align-items: center; gap: 1.25rem;">
            <button id="notificationBtn" style="background: transparent; border: 1px solid var(--border-color); color: var(--text-secondary); width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; position: relative;">
                <i data-lucide="bell" style="width: 16px; height: 16px;"></i>
                ${notificationCount > 0 ? `<span style="position: absolute; top: -4px; right: -4px; background: var(--accent); color: #1a1011; font-size: 0.65rem; font-weight: bold; width: 16px; height: 16px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">${notificationCount}</span>` : ''}
            </button>
            <div id="userProfileBtn" class="profile-btn">
                <div class="brand-logo" style="width: 32px; height: 32px; font-size: 0.85rem;">
                    ${user?.name ? user.name.charAt(0).toUpperCase() : 'P'}
                </div>
                <div style="display: flex; flex-direction: column;">
                    <span style="font-size: 0.85rem; font-weight: 600; line-height: 1.2;">${user?.name || 'Paresh Bafna'}</span>
                    <span style="font-size: 0.7rem; color: var(--accent); text-transform: uppercase; font-weight: 500;">${user?.role || 'Creator'}</span>
                </div>
            </div>
        </div>
    `;

    header.querySelector('#notificationBtn').addEventListener('click', onNotificationsClick);
    header.querySelector('#userProfileBtn').addEventListener('click', onProfileClick);

    return header;
}