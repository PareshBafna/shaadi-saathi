import { supabase } from '../../database/js/api.js';
import { buildSpecificHeader, buildSpecificStats } from './wedding-details-data.js';
import { buildEventItinerarySection } from './wedding-details-events.js';
import { buildVariantsSection } from './wedding-details-invite-variants.js';
import { buildHostListSection } from './wedding-details-hosts.js';
import { buildWeddingUserListSection } from './wedding-details-users.js';
import { buildGuestListSection } from './wedding-details-guests.js';

export function renderWeddingDetails(weddingId) {
    document.body.style.overflowX = 'hidden';

    const wrapper = document.createElement("div");
    wrapper.className = "wedding-details-wrapper"; 
    
    if (typeof window.checkSessionOrShowAlert === 'function' && !window.checkSessionOrShowAlert()) {
        wrapper.innerHTML = `
            <div class="wedding-details-section">
                <div class="wedding-details-loading-state">Please log in to view wedding details.</div>
            </div>
        `;
        return wrapper;
    }

    wrapper.innerHTML = `
        <div class="wedding-details-section">
            <div class="wedding-details-loading-state">Loading wedding details...</div>
        </div>
    `;

    loadWeddingData(wrapper, weddingId);

    window.__refreshCurrentWeddingDetails = () => {
        if (document.body.contains(wrapper)) {
            loadWeddingData(wrapper, weddingId);
        }
    };

    const updateHandler = () => {
        if (document.body.contains(wrapper)) {
            loadWeddingData(wrapper, weddingId);
        } else {
            window.removeEventListener('weddingDataUpdated', updateHandler);
            window.removeEventListener('weddingsDataUpdated', updateHandler);
        }
    };
    window.removeEventListener('weddingDataUpdated', updateHandler);
    window.removeEventListener('weddingsDataUpdated', updateHandler);
    window.addEventListener('weddingDataUpdated', updateHandler);
    window.addEventListener('weddingsDataUpdated', updateHandler);

    return wrapper;
}

async function loadWeddingData(container, weddingId) {
    const dashboardWeddingsUrl = '#weddings';
    
    const showSwalError = async (title, text) => {
        if (typeof Swal === 'undefined') {
            await new Promise((resolve) => {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11';
                script.onload = resolve;
                document.head.appendChild(script);
            });
        }

        Swal.fire({
            icon: 'error',
            title: title,
            text: text,
            confirmButtonText: "Go Back to Weddings",
            allowOutsideClick: false,
            allowEscapeKey: false,
            confirmButtonColor: 'var(--color-primary)'
        }).then(() => {
            window.location.hash = dashboardWeddingsUrl;
        });
    };

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!weddingId || (!uuidRegex.test(weddingId) && weddingId !== '00000000-0000-0000-0000-000000000000')) {
        showSwalError("Invalid Link", "The wedding link is broken or invalid.");
        return;
    }

    try {
        const curUser = window.currentUser || { role: 'guest' };

        const { data: wedding, error: weddingError } = await supabase.from('weddings').select('*').eq('id', weddingId).maybeSingle();
        
        if (weddingError || !wedding) {
            showSwalError("Error", "Incorrect wedding details. Please contact Admin.");
            return;
        }

        const { data: webInvite } = await supabase.from('wedding_web_invite').select('id').eq('wedding_id', weddingId).maybeSingle();
        const hasWebInvite = !!webInvite;

        const { data: variantsData } = await supabase.from('invite_variants').select('*').eq('wedding_id', weddingId);
        const variants = (variantsData || []).sort((a, b) => {
            const countA = a.selected_event_ids?.length || 0;
            const countB = b.selected_event_ids?.length || 0;
            if (countB !== countA) {
                return countB - countA;
            }
            return (a.variant_name || '').localeCompare(b.variant_name || '');
        });

        const { data: allSysUsers, error: sysUsersErr } = await supabase.from('users').select('id, name, phone, role');
        if (sysUsersErr) throw sysUsersErr;

        const { data: rawHosts } = await supabase.from('wedding_hosts').select('*').eq('wedding_id', weddingId);
        const { data: rawWUsers } = await supabase.from('wedding_users').select('*').eq('wedding_id', weddingId);

        const hosts = (rawHosts || []).map(h => {
            const u = allSysUsers.find(u => u.id === h.user_id) || {};
            return { ...h, name: u.name, phone: u.phone };
        });
        
        const wUsers = (rawWUsers || []).map(w => {
            const u = allSysUsers.find(u => u.id === w.user_id) || {};
            return { ...w, name: u.name, phone: u.phone };
        });

        const isCreator = curUser.role === 'creator';
        const isHost = hosts.some(h => h.user_id === curUser.id);
        const isWeddingUser = wUsers.some(w => w.user_id === curUser.id);
        
        const todayTime = new Date();
        todayTime.setHours(0, 0, 0, 0);
        const endDateTime = new Date(wedding.end_date);
        endDateTime.setHours(0, 0, 0, 0);
        const isArchived = endDateTime.getTime() < todayTime.getTime();

        const canConfig = (isCreator || isHost) && !isArchived; 
        const canViewAll = isCreator || isHost || isWeddingUser; 
        const isWebInviteOnly = wedding.invitation_type === 'web_invite_only';
        const allowsVariants = isWebInviteOnly ? (wedding.allow_variants !== false) : true;

        window.__weddingContext = {
            weddingId,
            wedding,
            allSysUsers,
            assignedIds: new Set([...hosts.map(h => h.user_id), ...wUsers.map(w => w.user_id)]),
            canConfig,
            isCreator,
            curUserId: curUser.id,
            variants
        };

        const { data: allEvents, error: eventsError } = await supabase.from('wedding_events').select('*').eq('wedding_id', weddingId).order('date', { ascending: true }).order('time', { ascending: true });
        if (eventsError) throw eventsError;

        const { data: guests, error: guestsError } = await supabase.from('guests').select('*').eq('wedding_id', weddingId);
        if (guestsError && !isWebInviteOnly) throw guestsError;

        if (guests) {
            guests.forEach(g => {
                if (g.variant_id) {
                    const matchedVar = variants.find(v => v.id === g.variant_id);
                    if (matchedVar) {
                        g.variant_name = matchedVar.variant_name;
                        g.invited_events = matchedVar.selected_event_ids || [];
                    } else {
                        g.variant_name = 'No Variant Assigned';
                        g.invited_events = [];
                    }
                } else {
                    g.variant_name = 'No Variant Assigned';
                    g.invited_events = [];
                }
            });
        }

        let filteredEvents = [];
        if (!canViewAll) { 
            const cleanedUserPhone = curUser.phone ? curUser.phone.replace(/[^0-9]/g, '') : null;
            const baseUserPhone = cleanedUserPhone ? cleanedUserPhone.slice(-10) : null;

            const currentGuest = guests?.find(g => {
                const cleanedGuestPhone = g.phone ? g.phone.replace(/[^0-9]/g, '') : null;
                return baseUserPhone && cleanedGuestPhone && cleanedGuestPhone.endsWith(baseUserPhone);
            });

            const invitedEventIds = currentGuest && currentGuest.invited_events ? currentGuest.invited_events : [];
            filteredEvents = allEvents ? allEvents.filter(e => invitedEventIds.includes(e.id)) : [];
        } else {
            filteredEvents = allEvents || []; 
        }

        const displayEventCount = canViewAll ? (allEvents?.length || 0) : filteredEvents.length;

        container.innerHTML = "";
        container.appendChild(buildSpecificHeader(wedding, hasWebInvite, variants));
        
        const statsSection = buildSpecificStats(wedding, displayEventCount, guests?.length || 0, hosts, canViewAll && !isWebInviteOnly, isWebInviteOnly);
        if (statsSection) container.appendChild(statsSection);
        
        container.appendChild(buildEventItinerarySection(wedding, filteredEvents, canConfig));

        if (allowsVariants && canViewAll) {
            container.appendChild(buildVariantsSection(wedding, variants, allEvents, guests, canConfig));
        }

        if (canViewAll && !isWebInviteOnly) {
            container.appendChild(buildHostListSection(wedding, hosts, canConfig, isCreator, curUser.id));
            container.appendChild(buildWeddingUserListSection(wedding, wUsers, canConfig));
            const guestSection = buildGuestListSection(wedding, guests, allEvents, variants, canConfig, isCreator);
            if (guestSection) container.appendChild(guestSection);
        }

        if (window.lucide) window.lucide.createIcons();

    } catch (error) {
        console.error("Error loading wedding details:", error);
        showSwalError("Error", error?.message || "Failed to load wedding details.");
    }
}