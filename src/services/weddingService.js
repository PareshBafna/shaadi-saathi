import { supabase } from '../config/api.js';

export class WeddingService {

    constructor(storageService) {
        this.storageService = storageService;
    }

    async getAll() {
        return await this.storageService.get("weddings");
    }

    async create(wedding) {
        
    }

    async update(id, wedding) {
        
    }

    async delete(id) {
        
    }

}

export const weddingService = {
    /**
     * Fetch all weddings hosted by the currently authenticated user
     */
    async getWeddingsByUser() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('weddings')
            .select('*')
            .eq('user_id', user.id)
            .order('wedding_date', { ascending: true });

        if (error) throw new Error(error.message);
        return data;
    },

    /**
     * Fetch a single wedding by ID
     */
    async getWeddingById(weddingId) {
        const { data, error } = await supabase
            .from('weddings')
            .select('*')
            .eq('id', weddingId)
            .single();

        if (error) throw new Error(error.message);
        return data;
    },

    /**
     * Create a new wedding workspace
     */
    async createWedding(weddingData) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('weddings')
            .insert([{ ...weddingData, user_id: user.id }])
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    },

    /**
     * Update wedding metadata or theme config JSON
     */
    async updateWedding(weddingId, updateData) {
        const { data, error } = await supabase
            .from('weddings')
            .update({
                ...updateData,
                updated_at: new Date().toISOString()
            })
            .eq('id', weddingId)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    },

    /**
     * Aggregate live metrics for the host dashboard
     */
    async getDashboardStats(weddingId) {
        // 1. Fetch guest list with family side info
        const { data: guests, error: guestError } = await supabase
            .from('guests')
            .select(`
                id,
                rsvp_status,
                dietary_pref,
                family:families(side)
            `)
            .eq('wedding_id', weddingId);

        if (guestError) throw new Error(guestError.message);

        // 2. Fetch event count
        const { count: eventsCount, error: eventError } = await supabase
            .from('events')
            .select('id', { count: 'exact', head: true })
            .eq('wedding_id', weddingId);

        if (eventError) throw new Error(eventError.message);

        // 3. Compute live counts
        const stats = {
            totalGuests: guests.length,
            totalEvents: eventsCount || 0,
            rsvp: { attending: 0, pending: 0, declined: 0 },
            dietary: { veg: 0, non_veg: 0, jain: 0, egg: 0 },
            sides: { bride: 0, groom: 0, mutual: 0 }
        };

        guests.forEach(guest => {
            if (stats.rsvp[guest.rsvp_status] !== undefined) {
                stats.rsvp[guest.rsvp_status]++;
            }
            if (stats.dietary[guest.dietary_pref] !== undefined) {
                stats.dietary[guest.dietary_pref]++;
            }
            
            const side = guest.family?.side || 'mutual';
            if (stats.sides[side] !== undefined) {
                stats.sides[side]++;
            }
        });

        return stats;
    }
};