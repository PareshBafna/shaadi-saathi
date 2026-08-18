export function createHeader(props = {}) {
    const { user, isVerified, verifyLink } = props;

    const header = document.createElement("header");
    header.className = "global-header";

    // Left Section: Verification Button
    const leftSection = document.createElement("div");
    leftSection.className = "global-header__left";

    if (!isVerified) {
        const verifyBtn = document.createElement("a");
        verifyBtn.className = "global-header__verify-btn";
        verifyBtn.href = verifyLink || "#";
        verifyBtn.target = "_blank";
        verifyBtn.innerHTML = `<i data-lucide="shield-alert"></i> Verify Account`;
        leftSection.appendChild(verifyBtn);
    }

    // Right Section: Profile Component
    const rightSection = document.createElement("div");
    rightSection.className = "global-header__right";

    const profileWrapper = document.createElement("div");
    profileWrapper.className = "global-header__profile";
    
    const initials = user?.name 
        ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() 
        : 'U';
    
    profileWrapper.innerHTML = `
        <div class="global-header__avatar">
            ${initials}
        </div>
        <div class="global-header__profile-info">
            <span class="global-header__profile-name">${user?.name || 'Guest'}</span>
            <span class="global-header__profile-role">${user?.role || 'GUEST'}</span>
        </div>
    `;
    
    rightSection.appendChild(profileWrapper);

    header.appendChild(leftSection);
    header.appendChild(rightSection);

    return header;
}