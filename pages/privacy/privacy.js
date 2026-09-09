export function renderPrivacyPolicy() {
    const wrap = document.createElement('div');
    wrap.className = 'ss-wrap';
    wrap.style.cssText = 'padding-top: 2.5rem; max-width: 820px; color: var(--text-primary); margin: 0 auto;';

    wrap.innerHTML = `
        <h1 style="color: var(--gold); font-family: 'DM Serif Display', serif; font-size: 2.2rem; margin-bottom: 0.5rem;">Privacy Policy</h1>
        <p style="color: var(--text-muted); font-size: 13px; margin-bottom: 2rem;">Last updated: September 2026</p>
        
        <h3 style="color: #ffffff; margin-top: 1.5rem; font-size: 1.2rem;">1. Information We Collect</h3>
        <p style="color: var(--text-muted); line-height: 1.6; font-size: 14px;">Shaadi Saathi collects guest names, phone numbers, RSVP statuses, and event schedule data supplied by organizers to deliver digital invites, calendar schedules, and messaging campaigns.</p>

        <h3 style="color: #ffffff; margin-top: 1.5rem; font-size: 1.2rem;">2. Use of Information</h3>
        <p style="color: var(--text-muted); line-height: 1.6; font-size: 14px;">We process your data strictly to maintain your wedding portal, coordinate guest attendance, trigger calendar syncs, and dispatch authorized WhatsApp templates. We do not sell or monetize personal guest information.</p>

        <h3 style="color: #ffffff; margin-top: 1.5rem; font-size: 1.2rem;">3. Analytics and Cookies</h3>
        <p style="color: var(--text-muted); line-height: 1.6; font-size: 14px;">We run privacy-first Google Analytics 4 tracking solely to understand portal traffic patterns. Analytics cookies are loaded only after explicit user consent via the cookie banner.</p>

        <div style="margin-top: 2.5rem;">
            <a href="#home" class="ss-btn-main ss-btn-outline" style="text-decoration: none; display: inline-flex;">← Back to Home</a>
        </div>
    `;

    return wrap;
}