import { supabase } from './api.js';

export async function getWeddingsByUser() {
    const { data, error } = await supabase
        .from('weddings')
        .select('*')
        .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
}

export async function getWeddingById(weddingId) {
    const { data, error } = await supabase
        .from('weddings')
        .select('*')
        .eq('id', weddingId)
        .single();
        
    if (error) throw error;
    return data;
}

export async function getDashboardStats(weddingId) {
    const { data: guests, error: guestsError } = await supabase
        .from('guests')
        .select('dietary_pref')
        .eq('wedding_id', weddingId);
        
    if (guestsError) throw guestsError;

    const { count: eventsCount, error: eventsError } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('wedding_id', weddingId);

    if (eventsError) throw eventsError;

    const stats = {
        totalGuests: guests ? guests.length : 0,
        totalEvents: eventsCount || 0,
        dietary: {
            veg: guests ? guests.filter(g => g.dietary_pref === 'veg').length : 0,
            jain: guests ? guests.filter(g => g.dietary_pref === 'jain').length : 0,
            non_veg: guests ? guests.filter(g => g.dietary_pref === 'non_veg').length : 0,
            egg: guests ? guests.filter(g => g.dietary_pref === 'egg').length : 0
        }
    };

    return stats;
}

export const weddingService = {
    getWeddingsByUser,
    getWeddingById,
    getDashboardStats
};