export function createHeader(props) {
    const { pageTitle, user, isVerified, verifyLink, notificationCount, onMobileMenuClick } = props;

    const header = document.createElement("header");
    header.className = "global-header";
    header.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: var(--space-4) var(--space-6); background: var(--color-bg); border-bottom: 1px solid var(--color-border); position: sticky; top: 0; z-index: 10;";

    // Time-based greeting helper
    function getTimeBasedGreeting(name) {
        const hour = new Date().getHours();
        const firstName = name ? name.split(' ')[0] : 'Guest';
        
        if (hour >= 5 && hour < 12) return `Good Morning, ${firstName}`;
        if (hour >= 12 && hour < 17) return `Good Afternoon, ${firstName}`;
        if (hour >= 17 && hour < 22) return `Good Evening, ${firstName}`;
        return `Welcome Back, ${firstName}`;
    }

    const greeting = getTimeBasedGreeting(user?.name);

    // Left Section: Mobile Menu Toggle + Greeting
    const leftSection = document.createElement("div");
    leftSection.style.cssText = "display: flex; align-items: center; gap: var(--space-4);";
    
    const mobileMenuBtn = document.createElement("button");
    mobileMenuBtn.className = "mobile-menu-btn";
    mobileMenuBtn.innerHTML = `<i data-lucide="menu" style="width: 24px; height: 24px; color: var(--color-text-primary);"></i>`;
    mobileMenuBtn.style.cssText = "background: none; border: none; cursor: pointer; display: none;"; 
    if (onMobileMenuClick) {
        mobileMenuBtn.addEventListener('click', onMobileMenuClick);
    }
    
    const titleEl = document.createElement("h2");
    titleEl.style.cssText = "font-size: var(--font-size-xl); font-weight: var(--font-weight-bold); color: var(--color-text-primary); margin: 0;";
    titleEl.textContent = greeting;

    leftSection.appendChild(mobileMenuBtn);
    leftSection.appendChild(titleEl);

    // Right Section: Verify Btn + Notifications + Profile
    const rightSection = document.createElement("div");
    rightSection.style.cssText = "display: flex; align-items: center; gap: var(--space-4);";

    // DO NOT show Verify Account button if user is verified
    if (!isVerified) {
        const verifyBtn = document.createElement("a");
        verifyBtn.href = verifyLink || "#";
        verifyBtn.target = "_blank";
        verifyBtn.style.cssText = "background: var(--color-danger); color: white; padding: 0.5rem 1rem; border-radius: var(--radius-sm); text-decoration: none; font-size: var(--font-size-sm); font-weight: var(--font-weight-medium); display: flex; align-items: center; gap: 8px; transition: opacity 0.2s;";
        verifyBtn.innerHTML = `<i data-lucide="shield-alert" style="width: 16px; height: 16px;"></i> Verify Account`;
        verifyBtn.onmouseover = () => verifyBtn.style.opacity = '0.9';
        verifyBtn.onmouseout = () => verifyBtn.style.opacity = '1';
        rightSection.appendChild(verifyBtn);
    }

    const notifWrapper = document.createElement("div");
    notifWrapper.style.cssText = "position: relative; cursor: pointer; padding: var(--space-2); color: var(--color-text-secondary); transition: color 0.2s; display: flex; align-items: center; justify-content: center;";
    notifWrapper.onmouseover = () => notifWrapper.style.color = 'var(--color-primary)';
    notifWrapper.onmouseout = () => notifWrapper.style.color = 'var(--color-text-secondary)';
    
    notifWrapper.innerHTML = `
        <i data-lucide="bell" style="width: 20px; height: 20px;"></i>
        ${notificationCount > 0 ? `<span style="position: absolute; top: 0px; right: 0px; background: var(--color-danger); color: white; font-size: 0.65rem; font-weight: bold; width: 16px; height: 16px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid var(--color-bg);">${notificationCount}</span>` : ''}
    `;
    rightSection.appendChild(notifWrapper);

    const profileWrapper = document.createElement("div");
    profileWrapper.style.cssText = "display: flex; align-items: center; gap: var(--space-3); margin-left: var(--space-2);";
    
    const initials = user?.name ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U';
    
    profileWrapper.innerHTML = `
        <div style="width: 36px; height: 36px; border-radius: 50%; background: var(--color-primary); color: var(--color-text-on-accent); display: flex; align-items: center; justify-content: center; font-weight: var(--font-weight-bold); font-size: var(--font-size-sm);">
            ${initials}
        </div>
        <div style="display: flex; flex-direction: column;">
            <span style="font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold); color: var(--color-text-primary); line-height: 1.2;">${user?.name || 'Guest'}</span>
            <span style="font-size: 0.65rem; font-weight: var(--font-weight-medium); color: var(--color-primary); text-transform: uppercase; letter-spacing: 0.5px;">${user?.role || 'GUEST'}</span>
        </div>
    `;
    
    rightSection.appendChild(profileWrapper);

    header.appendChild(leftSection);
    header.appendChild(rightSection);

    // CSS injection for the mobile menu button visibility
    if (!document.getElementById('header-mobile-css')) {
        const style = document.createElement('style');
        style.id = 'header-mobile-css';
        style.textContent = `
            @media (max-width: 768px) {
                .mobile-menu-btn { display: flex !important; }
            }
        `;
        document.head.appendChild(style);
    }

    return header;
}