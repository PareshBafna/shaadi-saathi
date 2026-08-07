export function createHeader(options = {}) {
    const {
        user = { name: 'Guest', role: 'guest' },
        isVerified = false,
        verifyLink = '',
        notificationCount = 0,
        onMobileMenuClick = () => {}
    } = options;

    const header = document.createElement('header');
    
    // Main header layout: 3 equal flex columns to ensure perfect centering
    header.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--space-4, 16px) var(--space-6, 24px);
        background: transparent;
        border-bottom: 1px solid var(--color-border, #332222);
        position: sticky;
        top: 0;
        z-index: 10;
        width: 100%;
        box-sizing: border-box;
    `;

    // 1. LEFT SECTION (Mobile menu toggle if needed, title removed)
    const leftSection = document.createElement('div');
    leftSection.style.cssText = `display: flex; align-items: center; flex: 1;`;
    
    // Hidden by default on desktop, can be shown via CSS media queries
    const mobileToggle = document.createElement('button');
    mobileToggle.classList.add('mobile-menu-btn');
    mobileToggle.style.cssText = `background: none; border: none; color: inherit; cursor: pointer; display: none;`; 
    mobileToggle.innerHTML = `<i data-lucide="menu"></i>`;
    mobileToggle.addEventListener('click', onMobileMenuClick);
    leftSection.appendChild(mobileToggle);


    // 2. CENTER SECTION (Verify Button)
    const centerSection = document.createElement('div');
    centerSection.style.cssText = `display: flex; justify-content: center; align-items: center; flex: 1;`;

    if (!isVerified) {
        const verifyBtn = document.createElement('a');
        verifyBtn.href = verifyLink;
        verifyBtn.target = "_blank";
        verifyBtn.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
            background-color: #ef4444; /* Changed to red */
            color: white;
            padding: 8px 16px;
            border-radius: 6px;
            text-decoration: none;
            font-weight: 600;
            font-size: 0.875rem;
            transition: opacity 0.2s;
        `;
        verifyBtn.onmouseover = () => verifyBtn.style.opacity = '0.9';
        verifyBtn.onmouseout = () => verifyBtn.style.opacity = '1';
        verifyBtn.innerHTML = `<i data-lucide="shield-alert" style="width: 16px; height: 16px;"></i> Verify Account`;
        centerSection.appendChild(verifyBtn);
    }


    // 3. RIGHT SECTION (Notifications & Profile)
    const rightSection = document.createElement('div');
    rightSection.style.cssText = `display: flex; align-items: center; justify-content: flex-end; gap: 24px; flex: 1;`;

    // Notifications
    const notifWrapper = document.createElement('div');
    notifWrapper.style.cssText = `position: relative; cursor: pointer; display: flex; align-items: center;`;
    notifWrapper.innerHTML = `<i data-lucide="bell" style="color: var(--color-text-secondary, #a1a1aa); width: 20px; height: 20px;"></i>`;
    
    if (notificationCount > 0) {
        const badge = document.createElement('span');
        badge.textContent = notificationCount;
        badge.style.cssText = `
            position: absolute; top: -6px; right: -6px;
            background: #ef4444; color: white;
            font-size: 0.65rem; font-weight: bold;
            border-radius: 50%; width: 16px; height: 16px;
            display: flex; align-items: center; justify-content: center;
        `;
        notifWrapper.appendChild(badge);
    }
    rightSection.appendChild(notifWrapper);

    // Profile Details
    const profileInfo = document.createElement('div');
    profileInfo.style.cssText = `display: flex; align-items: center; gap: 12px;`;
    
    // Avatar
    const avatar = document.createElement('div');
    avatar.style.cssText = `
        width: 36px; height: 36px;
        background: #d4af37; color: #1a0f0f;
        border-radius: 50%; display: flex;
        align-items: center; justify-content: center;
        font-weight: bold; font-size: 0.875rem;
    `;
    const initials = (user.name || 'Guest').split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();
    avatar.textContent = initials;

    // Text details
    const userDetails = document.createElement('div');
    userDetails.style.cssText = `display: flex; flex-direction: column; text-align: left;`;
    userDetails.innerHTML = `
        <span style="font-weight: 600; font-size: 0.875rem; color: var(--color-text-primary, #fff); line-height: 1.2;">${user.name}</span>
        <span style="font-size: 0.7rem; color: var(--color-text-secondary, #a1a1aa); text-transform: uppercase; letter-spacing: 0.05em; line-height: 1.2; margin-top: 2px;">${user.role}</span>
    `;

    profileInfo.appendChild(avatar);
    profileInfo.appendChild(userDetails);
    rightSection.appendChild(profileInfo);

    // Append all sections to header
    header.appendChild(leftSection);
    header.appendChild(centerSection);
    header.appendChild(rightSection);

    return header;
}