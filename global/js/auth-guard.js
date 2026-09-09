import { supabase } from '../../database/js/api.js';
import { showSweetAlert } from './sweet-alert-message.js';

export const ADMIN_WHATSAPP_NUMBER = "919791146838";
export const publicRoutes = [
    '',
    '#',
    '#/',
    '#home',
    '#login', 
    '#privacy',
    '#terms',
    '#sample-web-invites-preview', 
    '#web-invites-preview', 
    '#web-invites-public-preview' // Public bypass
];

export function getWhatsAppVerificationLink(verificationCode, name) {
    const message = `Hi Shaadi Saathi, please verify my account.\n\nName: ${name || 'User'}\nCode: ${verificationCode || 'N/A'}`;
    return `https://wa.me/${ADMIN_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export function checkSessionOrShowAlert() {
    const userId = localStorage.getItem('ss_user_id');
    if (!userId || !window.currentUser) {
        showSweetAlert('error', 'Session Expired', 'Please log in to continue', null, 'Go To Login Page', () => {
            window.location.hash = '#login';
        });
        return false;
    }
    return true;
}
window.checkSessionOrShowAlert = checkSessionOrShowAlert;

export async function resolveDynamicUserRole(user) {
    if (!user || user.role === 'creator') return user;

    try {
        const { data: hostData } = await supabase.from('wedding_hosts').select('wedding_id').eq('user_id', user.id);
        const { data: userData } = await supabase.from('wedding_users').select('wedding_id').eq('user_id', user.id);

        const hostWeddingIds = (hostData || []).map(h => h.wedding_id);
        const userWeddingIds = (userData || []).map(u => u.wedding_id);
        const allAssignedIds = [...new Set([...hostWeddingIds, ...userWeddingIds])];

        if (allAssignedIds.length > 0) {
            const { data: activeWeddings } = await supabase.from('weddings').select('id, end_date').in('id', allAssignedIds);

            if (activeWeddings) {
                const todayTime = new Date();
                todayTime.setHours(0, 0, 0, 0); 
                
                const activeWeddingIds = activeWeddings.filter(w => {
                    const endDate = new Date(w.end_date);
                    endDate.setHours(0, 0, 0, 0);
                    return endDate.getTime() >= todayTime.getTime();
                }).map(w => w.id);
                
                if (activeWeddingIds.length > 0) {
                    const isActivelyHosting = hostWeddingIds.some(id => activeWeddingIds.includes(id));
                    user.role = isActivelyHosting ? 'host' : 'wedding_user'; 
                }
            }
        }
    } catch (err) {
        console.error("Failed to dynamically resolve role:", err);
    }

    return user;
}