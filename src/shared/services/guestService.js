import { supabase } from '../../config/api.js';
import Papa from 'https://cdn.jsdelivr.net/npm/papaparse/+esm';

export const guestService = {
    /**
     * Fetch all guests for a specific wedding (including family details)
     */
    async getGuestsByWedding(weddingId) {
        const { data, error } = await supabase
            .from('guests')
            .select(`
                *,
                family:families(id, family_name, side)
            `)
            .eq('wedding_id', weddingId)
            .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);
        return data;
    },

    /**
     * Fetch guest and wedding metadata by unique invite code (for public RSVP view)
     */
    async getGuestByInviteCode(inviteCode) {
        const { data, error } = await supabase
            .from('guests')
            .select(`
                *,
                wedding:weddings(id, couple_names, wedding_date, cover_image_url),
                family:families(id, family_name)
            `)
            .eq('invite_code', inviteCode)
            .single();

        if (error) throw new Error('Invalid or expired invitation code.');
        return data;
    },

    /**
     * Create a single guest record
     */
    async addGuest(guestData) {
        // Auto-generate a 6-character unique invite code if not provided
        const inviteCode = guestData.invite_code || Math.random().toString(36).substring(2, 8).toUpperCase();

        const { data, error } = await supabase
            .from('guests')
            .insert([{ ...guestData, invite_code: inviteCode }])
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    },

    /**
     * Bulk import guests (e.g. from CSV/Excel parsing)
     */
    async bulkAddGuests(guestsArray) {
        const formattedGuests = guestsArray.map(guest => ({
            ...guest,
            invite_code: guest.invite_code || Math.random().toString(36).substring(2, 8).toUpperCase()
        }));

        const { data, error } = await supabase
            .from('guests')
            .insert(formattedGuests)
            .select();

        if (error) throw new Error(error.message);
        return data;
    },

    /**
     * Update RSVP status & dietary preference (Public/Guest action)
     */
    async updateRSVP(guestId, rsvpStatus, dietaryPref) {
        const { data, error } = await supabase
            .from('guests')
            .update({
                rsvp_status: rsvpStatus,
                dietary_pref: dietaryPref,
                updated_at: new Date().toISOString()
            })
            .eq('id', guestId)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    },

    /**
     * Delete a guest
     */
    async deleteGuest(guestId) {
        const { error } = await supabase
            .from('guests')
            .delete()
            .eq('id', guestId);

        if (error) throw new Error(error.message);
        return true;
    }
};

/**
 * Parses a CSV file and batch-inserts guest records into Supabase.
 * @param {File} file - The uploaded CSV file.
 * @param {string} weddingId - The active wedding UUID.
 * @returns {Promise<Object>} Result object with status and inserted count.
 */
export async function importGuestsFromCSV(file, weddingId) {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                try {
                    const guestsToInsert = results.data.map(row => ({
                        wedding_id: weddingId,
                        name: row.Name || row.name || 'Unnamed Guest',
                        phone: row.Phone || row.phone || null,
                        email: row.Email || row.email || null,
                        invite_code: Math.random().toString(36).substring(2, 10).toUpperCase(),
                        rsvp_status: 'pending',
                        dietary_pref: (row.Diet || row.dietary_pref || 'veg').toLowerCase()
                    }));

                    const { data, error } = await supabase
                        .from('guests')
                        .insert(guestsToInsert)
                        .select();

                    if (error) throw error;

                    resolve({ success: true, count: data.length, data });
                } catch (err) {
                    reject({ success: false, error: err.message });
                }
            },
            error: (err) => {
                reject({ success: false, error: err.message });
            }
        });
    });
}

/**
 * Fetches all guests for a specific wedding.
 * @param {string} weddingId - The active wedding UUID.
 * @returns {Promise<Array>} Array of guest objects.
 */
export async function getGuests(weddingId) {
    const { data, error } = await supabase
        .from('guests')
        .select(`
            *,
            families ( family_name )
        `)
        .eq('wedding_id', weddingId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching guests:", error);
        throw error;
    }
    
    return data;
}