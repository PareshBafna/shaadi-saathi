import { supabase } from '../config/api.js';

export const weddingService = {
    async getWeddingsByUser() {
        // DEV BYPASS: Fetch all weddings without checking auth session
        const { data, error } = await supabase
            .from('weddings')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data || [];
    },

    async getWeddingById(weddingId) {
        const { data, error } = await supabase
            .from('weddings')
            .select('*')
            .eq('id', weddingId)
            .single();
            
        if (error) throw error;
        return data;
    },

    async getDashboardStats(weddingId) {
        // Fetch guests for this wedding to calculate stats
        const { data: guests, error: guestsError } = await supabase
            .from('guests')
            .select('rsvp_status, dietary_pref')
            .eq('wedding_id', weddingId);
            
        if (guestsError) throw guestsError;

        // Fetch events count
        const { count: eventsCount, error: eventsError } = await supabase
            .from('events')
            .select('*', { count: 'exact', head: true })
            .eq('wedding_id', weddingId);

        if (eventsError) throw eventsError;

        // Calculate dynamic stats from the database
        const stats = {
            totalGuests: guests ? guests.length : 0,
            rsvp: {
                attending: guests ? guests.filter(g => g.rsvp_status === 'attending').length : 0,
                pending: guests ? guests.filter(g => g.rsvp_status === 'pending').length : 0,
                declined: guests ? guests.filter(g => g.rsvp_status === 'declined').length : 0
            },
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
};