import { supabase } from './api.js';
import Papa from 'https://cdn.jsdelivr.net/npm/papaparse/+esm';

export const guestService = {
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

    async addGuest(guestData) {
        const inviteCode = guestData.invite_code || Math.random().toString(36).substring(2, 8).toUpperCase();

        const { data, error } = await supabase
            .from('guests')
            .insert([{ ...guestData, invite_code: inviteCode }])
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    },

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

    async deleteGuest(guestId) {
        const { error } = await supabase
            .from('guests')
            .delete()
            .eq('id', guestId);

        if (error) throw new Error(error.message);
        return true;
    }
};

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