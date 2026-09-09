export function renderTermsConditions() {
    const wrap = document.createElement('div');
    wrap.className = 'ss-wrap';
    wrap.style.cssText = 'padding-top: 2.5rem; max-width: 820px; color: var(--text-primary); margin: 0 auto;';

    wrap.innerHTML = `
        <h1 style="color: var(--gold); font-family: 'DM Serif Display', serif; font-size: 2.2rem; margin-bottom: 0.5rem;">Terms &amp; Conditions</h1>
        <p style="color: var(--text-muted); font-size: 13px; margin-bottom: 2rem;">Last updated: September 2026</p>
        
        <h3 style="color: #ffffff; margin-top: 1.5rem; font-size: 1.2rem;">1. Service Agreement</h3>
        <p style="color: var(--text-muted); line-height: 1.6; font-size: 14px;">By accessing Shaadi Saathi, you agree to comply with platform guidelines for coordinating weddings, managing wedding guests, and communicating event itineraries.</p>

        <h3 style="color: #ffffff; margin-top: 1.5rem; font-size: 1.2rem;">2. Acceptable Messaging Use</h3>
        <p style="color: var(--text-muted); line-height: 1.6; font-size: 14px;">Wedding hosts and organizers must verify that guests uploaded for automated messaging have given prior consent to receive wedding-related notifications.</p>

        <h3 style="color: #ffffff; margin-top: 1.5rem; font-size: 1.2rem;">3. Platform Availability</h3>
        <p style="color: var(--text-muted); line-height: 1.6; font-size: 14px;">Paresh Bafna Studio maintains reliable access to web invites, calendar files (.ics), and administrative control dashboards throughout your wedding event window.</p>

        <div style="margin-top: 2.5rem;">
            <a href="#home" class="ss-btn-main ss-btn-outline" style="text-decoration: none; display: inline-flex;">← Back to Home</a>
        </div>
    `;

    return wrap;
}