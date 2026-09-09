import { ADMIN_WHATSAPP_NUMBER } from '../../global/js/auth-guard.js';

let typeTimer = null;

export async function loadPageCss(href) {
    if (document.querySelector(`link[href="${href}"]`)) return;

    return new Promise((resolve) => {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = href;
        link.onload = () => resolve();
        link.onerror = () => resolve();
        document.head.appendChild(link);
    });
}

export async function renderHome(container) {
    await loadPageCss('/pages/home/home.css');
    container.innerHTML = getHomeHTML();
    initHome();
}

export function initHome() {
    const phrases = [
        'Unlimited Themes & Variants.',
        'Interactive Web Invites.',
        'Direct WhatsApp Campaigns.',
        'Events, Users & Guest Tracking.',
        'One-Tap Calendar Sync.',
        'Central Details Portals.',
        'Zero Wedding Chaos.'
    ];
    let pIdx = 0, cIdx = 0, isDeleting = false;
    const typeTarget = document.getElementById('ss-landing-typed');

    if (typeTimer) clearTimeout(typeTimer);

    function typeLoop() {
        if (!typeTarget) return;
        const current = phrases[pIdx];
        typeTarget.textContent = isDeleting ? current.slice(0, cIdx - 1) : current.slice(0, cIdx + 1);
        isDeleting ? cIdx-- : cIdx++;

        let wait = isDeleting ? 40 : 80;
        if (!isDeleting && cIdx === current.length) {
            wait = 2200;
            isDeleting = true;
        } else if (isDeleting && cIdx === 0) {
            isDeleting = false;
            pIdx = (pIdx + 1) % phrases.length;
            wait = 300;
        }
        typeTimer = setTimeout(typeLoop, wait);
    }
    typeLoop();

    function scrollToId(id) {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        });
    }

    const featuresBtn = document.getElementById('btn-scroll-features');
    if (featuresBtn) {
        featuresBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            scrollToId('features');
        });
    }

    const plansBtn = document.getElementById('btn-scroll-plans');
    if (plansBtn) {
        plansBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            scrollToId('pricing');
        });
    }

    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-q');
        if (question) {
            question.setAttribute('role', 'button');
            question.setAttribute('tabindex', '0');
            question.setAttribute('aria-expanded', 'false');
            const toggle = () => {
                const isOpen = item.classList.contains('open');
                faqItems.forEach(el => {
                    el.classList.remove('open');
                    el.querySelector('.faq-q')?.setAttribute('aria-expanded', 'false');
                });
                if (!isOpen) {
                    item.classList.add('open');
                    question.setAttribute('aria-expanded', 'true');
                }
            };
            question.addEventListener('click', toggle);
            question.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggle();
                }
            });
        }
    });

    initScratchCards();
}

function initScratchCards() {
    const boxes = document.querySelectorAll('.ss-scratch-box');
    boxes.forEach(box => {
        const canvas = box.querySelector('.ss-scratch-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        const rect = box.getBoundingClientRect();
        canvas.width = rect.width || 280;
        canvas.height = rect.height || 110;

        function fillCanvas() {
            ctx.fillStyle = '#2c1217';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.strokeStyle = 'rgba(204, 160, 56, 0.25)';
            ctx.lineWidth = 1;
            for (let i = -canvas.height; i < canvas.width; i += 16) {
                ctx.beginPath();
                ctx.moveTo(i, 0);
                ctx.lineTo(i + canvas.height, canvas.height);
                ctx.stroke();
            }

            ctx.fillStyle = '#cca038';
            ctx.font = '600 12px "DM Sans", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('✨ SCRATCH TO REVEAL ✨', canvas.width / 2, canvas.height / 2);
        }
        fillCanvas();

        let isDrawing = false;

        function scratch(e) {
            if (!isDrawing) return;
            const b = canvas.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            const x = clientX - b.left;
            const y = clientY - b.top;

            ctx.globalCompositeOperation = 'destination-out';
            ctx.beginPath();
            ctx.arc(x, y, 18, 0, Math.PI * 2, false);
            ctx.fill();
        }

        canvas.addEventListener('mousedown', (e) => { isDrawing = true; scratch(e); });
        canvas.addEventListener('mousemove', scratch);
        window.addEventListener('mouseup', () => { isDrawing = false; });

        canvas.addEventListener('touchstart', (e) => { isDrawing = true; scratch(e); }, { passive: true });
        canvas.addEventListener('touchmove', scratch, { passive: true });
        window.addEventListener('touchend', () => { isDrawing = false; });
    });
}

function getWhatsAppInquiryLink(serviceName) {
    const phone = ADMIN_WHATSAPP_NUMBER;
    if (!phone) {
        console.warn('ADMIN_WHATSAPP_NUMBER not configured - WhatsApp inquiry links will not work.');
    }
    const text = `*New Inquiry for Paresh Bafna Studio - Shaadi Saathi*\n\n*Service Requested:*\n• ${serviceName}`;
    return `https://wa.me/${phone || ''}?text=${encodeURIComponent(text)}`;
}

export function getHomeHTML() {
    const waSelfManaged = getWhatsAppInquiryLink('Wedding OS (Self-Managed)');
    const waFullService = getWhatsAppInquiryLink('Wedding OS (Full Service)');

    return `
    <div class="ss-wrap">
       <div class="ss-hero-screen">
          <nav class="ss-nav-bar">
             <a href="#" class="ss-brand" aria-label="Shaadi Saathi home">
                <div class="ss-logo-badge">
                   <img src="/global/logos/logo-compressed.png" alt="Shaadi Saathi Logo" width="50" height="50" />
                </div>
                <div class="signature-glow">
                   Shaadi Saathi
                </div>
             </a>
             <div class="ss-nav-actions">
                <a href="#login" class="ss-nav-cta">Sign In / Register</a>
             </div>
          </nav>

          <header class="ss-hero">
             <div class="ss-trust-badge">✦ Trusted by couples planning their big day</div>
             <h1 class="ss-title">
                Wedding management built for <br />
                <span><span id="ss-landing-typed"></span><span class="ss-cursor">|</span></span>
             </h1>
             <p class="ss-subtitle">
                Deploy interactive web invites with unlimited themes, variants, and dedicated family and journey stories, manage events, users, and guest directories, sync ceremony calendars via .ics, and run personalized WhatsApp campaigns with priority support.
             </p>
             <div class="ss-actions">
                <button type="button" id="btn-scroll-features" class="ss-btn-main">
                   <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
                   Features
                </button>
                <button type="button" id="btn-scroll-plans" class="ss-btn-main ss-btn-outline">
                   <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>
                   Plans
                </button>
             </div>
          </header>
       </div>

       <div class="sub-section" id="features" style="border-top: 3px solid #842333;">
          <div class="addons reveal">
             <div class="faq-section-header">
                <span>✦</span> Features
             </div>
             <div class="ss-grid">
                <div class="ss-card">
                   <span class="ss-card-ico">💌</span>
                   <h3>Web Invitation Included</h3>
                   <p>Interactive digital invite with unlimited themes, custom variants, full event &amp; ceremony details, live venue maps, background audio, animated seals, plus dedicated pages for family members and the couple's journey.</p>
                </div>

                <div class="ss-card">
                   <span class="ss-card-ico">💬</span>
                   <h3>WhatsApp Messaging Campaigns</h3>
                   <p>Dispatch static templates or dynamic personalized messages directly to guest chats with one-tap invite links.</p>
                </div>

                <div class="ss-card">
                   <span class="ss-card-ico">👥</span>
                   <h3>Events, Users &amp; Guests Management</h3>
                   <p>Organize events and guest lists with role-based access, side allocations (Bride/Groom), VIP tags, and headcount tracking.</p>
                </div>

                <div class="ss-card">
                   <span class="ss-card-ico">📅</span>
                   <h3>Calendar Page &amp; Timeline</h3>
                   <p>Complete multi-day wedding itinerary view keeping guests informed of ceremony schedules, timing, and precise venue navigation.</p>
                </div>

                <div class="ss-card">
                   <span class="ss-card-ico">📲</span>
                   <h3>One-Tap Calendar Sync (.ics Export)</h3>
                   <p>Direct calendar export so guests add ceremonies straight to Google, Apple, and Outlook calendars with alarm alerts.</p>
                </div>

                <div class="ss-card">
                   <span class="ss-card-ico">🏛️</span>
                   <h3>Wedding Details Portal</h3>
                   <p>Dedicated central hub managing couple profiles, bride &amp; groom family lineages, key ceremony locations, and live countdowns.</p>
                </div>

                <div class="ss-card">
                   <span class="ss-card-ico">📊</span>
                   <h3>Excel / CSV Batch Setup</h3>
                   <p>Done-for-you bulk guest import and database cleanup from spreadsheets to prevent manual data entry errors.</p>
                </div>

                <div class="ss-card">
                   <span class="ss-card-ico">⚡</span>
                   <h3>Priority Event Support</h3>
                   <p>Dedicated studio support and live troubleshooting on standby to ensure your wedding operations run without a glitch.</p>
                </div>
             </div>
          </div>
       </div>

       <div class="sub-section" id="coming-soon" style="border-top: 3px solid #842333;">
          <div class="addons reveal">
             <div class="faq-section-header">
                <span>✦</span> Coming Soon
             </div>
             <div class="ss-coming-grid">
                <div class="ss-scratch-card">
                   <span class="ss-card-ico">🏨</span>
                   <h3>Room Allocation</h3>
                   <div class="ss-scratch-box">
                      <p class="ss-scratch-desc">Assign hotel rooms, track room occupancies, and manage check-in/check-out dates per guest.</p>
                      <canvas class="ss-scratch-canvas"></canvas>
                   </div>
                </div>

                <div class="ss-scratch-card">
                   <span class="ss-card-ico">🚗</span>
                   <h3>Logistics &amp; Transport</h3>
                   <div class="ss-scratch-box">
                      <p class="ss-scratch-desc">Track arrival flights, schedule airport pickups, and coordinate shuttle transfers across venues.</p>
                      <canvas class="ss-scratch-canvas"></canvas>
                   </div>
                </div>

                <div class="ss-scratch-card">
                   <span class="ss-card-ico">🤝</span>
                   <h3>Vendor Management &amp; Expenses</h3>
                   <div class="ss-scratch-box">
                      <p class="ss-scratch-desc">Central hub to manage vendor contracts, deliverables, arrival timelines, payment advances, due balances, and invoices.</p>
                      <canvas class="ss-scratch-canvas"></canvas>
                   </div>
                </div>

                <div class="ss-scratch-card">
                   <span class="ss-card-ico">💰</span>
                   <h3>Budget Tracker</h3>
                   <div class="ss-scratch-box">
                      <p class="ss-scratch-desc">Monitor overall wedding allocations, track projected vs. actual spends, and keep total event costs under control.</p>
                      <canvas class="ss-scratch-canvas"></canvas>
                   </div>
                </div>

                <div class="ss-scratch-card">
                   <span class="ss-card-ico">📋</span>
                   <h3>Family Tasks</h3>
                   <div class="ss-scratch-box">
                      <p class="ss-scratch-desc">Task delegation board with deadlines, role assignments, and status tracking for immediate family members and coordinators.</p>
                      <canvas class="ss-scratch-canvas"></canvas>
                   </div>
                </div>

                <div class="ss-scratch-card">
                   <span class="ss-card-ico">👗</span>
                   <h3>Dress Code &amp; Moodboards</h3>
                   <div class="ss-scratch-box">
                      <p class="ss-scratch-desc">Visual style guides, ceremonial color palettes, and outfit inspirations for every wedding function.</p>
                      <canvas class="ss-scratch-canvas"></canvas>
                   </div>
                </div>

                <div class="ss-scratch-card">
                   <span class="ss-card-ico">🎁</span>
                   <h3>Digital Shagun &amp; Gift Registry</h3>
                   <div class="ss-scratch-box">
                      <p class="ss-scratch-desc">Direct UPI and custom registry integration with automated instant digital thank-you notes.</p>
                      <canvas class="ss-scratch-canvas"></canvas>
                   </div>
                </div>

                <div class="ss-scratch-card">
                   <span class="ss-card-ico">📖</span>
                   <h3>Interactive Digital Guestbook</h3>
                   <div class="ss-scratch-box">
                      <p class="ss-scratch-desc">Dedicated memory wall where guests upload written wishes, voice recordings, and candid snapshots straight from mobile phones.</p>
                      <canvas class="ss-scratch-canvas"></canvas>
                   </div>
                </div>
             </div>
          </div>
       </div>

       <div class="sub-section" id="pricing" style="border-top: 3px solid #842333;">
          <div class="addons reveal">
             <div class="faq-section-header">
                <span>✦</span> Plans
             </div>
             <div class="ss-pricing-grid-boxed">
                <div class="ss-box-card">
                   <div>
                      <div class="ss-box-pill">WORKSPACE</div>
                      <h3>Wedding OS (Self-Managed)</h3>
                      <div class="ss-box-tagline">Complete self-use system</div>
                      <p class="ss-box-desc">
                         Dedicated portal and workspace tools to manage your own wedding data, schedule, and guests.
                      </p>
                      <ul class="ss-box-feats">
                         <li><span class="ss-chk">✓</span> Web Invitation Included (Unlimited Events, Themes &amp; Variants)</li>
                         <li><span class="ss-chk">✓</span> Calendar Page &amp; Event Timeline</li>
                         <li><span class="ss-chk">✓</span> Wedding Details Portal</li>
                         <li><span class="ss-chk">✓</span> Events, Hosts, Users &amp; Guests Management</li>
                         <li><span class="ss-chk">✓</span> Static WhatsApp Messaging Template Campaigns</li>
                         <li><span class="ss-chk">✓</span> Calendar Sync (.ics Export)</li>
                         <li><span class="ss-chk">✓</span> Standard Support</li>
                      </ul>
                   </div>
                   <a href="${waSelfManaged}" target="_blank" rel="noopener noreferrer" class="ss-box-btn">Get started</a>
                </div>

                <div class="ss-box-card ss-box-card-featured">
                   <div class="ss-box-recommended">MOST POPULAR</div>
                   <div>
                      <div class="ss-box-pill">WHITE GLOVE</div>
                      <h3>Wedding OS (Full Service)</h3>
                      <div class="ss-box-tagline">Done-for-you execution</div>
                      <p class="ss-box-desc">
                         Everything in Wedding OS (Self-Managed), plus we handle the heavy lifting and campaigns for you.
                      </p>
                      <ul class="ss-box-feats">
                         <li><span class="ss-chk">✓</span> Everything in Wedding OS (Self-Managed)</li>
                         <li><span class="ss-chk">✓</span> Excel / CSV Batch Guest Import &amp; Setup (Done-For-You)</li>
                         <li><span class="ss-chk">✓</span> Personalized Name WhatsApp Messaging Campaigns</li>
                         <li><span class="ss-chk">✓</span> Priority Support</li>
                      </ul>
                   </div>
                   <a href="${waFullService}" target="_blank" rel="noopener noreferrer" class="ss-box-btn">Get started</a>
                </div>
             </div>
          </div>
       </div>

       <div class="sub-section" id="ss-faqs" style="border-top: 3px solid #842333;">
          <div class="addons reveal">
             <div class="faq-section-header">
                <span>✦</span> FAQs
             </div>
             <div class="faq-list">
                <div class="faq-item reveal">
                   <div class="faq-q">
                      What is Shaadi Saathi Wedding OS?
                      <span class="faq-ico">+</span>
                   </div>
                   <div class="faq-a">
                      Shaadi Saathi is the entire backend operating portal to organize hosts, categorize guests, sync calendars, coordinate ceremony schedules, and manage personalized WhatsApp outreach.
                   </div>
                </div>
                <div class="faq-item reveal">
                   <div class="faq-q">
                      How much does Shaadi Saathi cost?
                      <span class="faq-ico">+</span>
                   </div>
                   <div class="faq-a">
                      Pricing depends on your event count, guest list size, and whether you choose Self-Managed or Full Service. Reach out via WhatsApp using the "Get started" button on either plan and we'll send a quote within the day.
                   </div>
                </div>
                <div class="faq-item reveal">
                   <div class="faq-q">
                      Can guests add events directly to Google Calendar or Apple Calendar?
                      <span class="faq-ico">+</span>
                   </div>
                   <div class="faq-a">
                      Yes. Each event features a one-tap .ics sync button compatible with Apple Calendar, Google Calendar, and Microsoft Outlook.
                   </div>
                </div>
                <div class="faq-item reveal">
                   <div class="faq-q">
                      How does the WhatsApp Messaging Campaign work?
                      <span class="faq-ico">+</span>
                   </div>
                   <div class="faq-a">
                      In Self-Managed, we configure copy templates that you can send out directly with dynamic guest variables. In Full Service, we handle the entire process of formatting and broadcasting individual invites to your entire list.
                   </div>
                </div>
                <div class="faq-item reveal">
                   <div class="faq-q">
                      How many events and functions can be added?
                      <span class="faq-ico">+</span>
                   </div>
                   <div class="faq-a">
                      Unlimited events are supported. You can include Haldi, Mehendi, Sangeet, Wedding, Reception, and private family dinners with distinct locations and times.
                   </div>
                </div>
                <div class="faq-item reveal">
                   <div class="faq-q">
                      Is a Web Invitation included with Wedding OS (Self-Managed)?
                      <span class="faq-ico">+</span>
                   </div>
                   <div class="faq-a">
                      Yes. Wedding OS (Self-Managed) comes with the complete interactive Web Invitation suite included at no extra cost, featuring unlimited events, theme styling, and unlimited personalized link variants for all your guests.
                   </div>
                </div>
                <div class="faq-item reveal">
                   <div class="faq-q">
                      How long does it take to get everything live?
                      <span class="faq-ico">+</span>
                   </div>
                   <div class="faq-a">
                      Wedding OS setups are configured and ready within 3-5 business days.
                   </div>
                </div>
             </div>
          </div>
       </div>

       <footer class="ss-footer">
          <p style="margin-bottom: 0.5rem;">
             <a href="#privacy" style="color: var(--text-muted); text-decoration: none; margin-right: 1rem;">Privacy Policy</a>
             <a href="#terms" style="color: var(--text-muted); text-decoration: none;">Terms &amp; Conditions</a>
          </p>
          <p>© Paresh Bafna Studio - Shaadi Saathi.</p>
       </footer>
    </div>
    `;
}