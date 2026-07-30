import { supabase } from '../config/api.js';

export const eventService = {
    /**
     * Fetch all events for a specific wedding, ordered by start time
     */
    async getEventsByWedding(weddingId) {
        const { data, error } = await supabase
            .from('events')
            .select('*')
            .eq('wedding_id', weddingId)
            .order('start_time', { ascending: true });

        if (error) throw new Error(error.message);
        return data;
    },

    /**
     * Add a new wedding event
     */
    async addEvent(eventData) {
        const { data, error } = await supabase
            .from('events')
            .insert([eventData])
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    },

    /**
     * Update an existing event (e.g., change of venue or time)
     */
    async updateEvent(eventId, updateData) {
        const { data, error } = await supabase
            .from('events')
            .update(updateData)
            .eq('id', eventId)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    },

    /**
     * Delete an event
     */
    async deleteEvent(eventId) {
        const { error } = await supabase
            .from('events')
            .delete()
            .eq('id', eventId);

        if (error) throw new Error(error.message);
        return true;
    }
};