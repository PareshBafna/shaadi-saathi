import { supabase } from '../../config/api.js';

/**
 * Fetches all families for a specific wedding.
 * @param {string} weddingId - The active wedding UUID.
 * @returns {Promise<Array>} Array of family objects.
 */
export async function getFamilies(weddingId) {
    const { data, error } = await supabase
        .from('families')
        .select('*')
        .eq('wedding_id', weddingId)
        .order('family_name', { ascending: true });

    if (error) {
        console.error("Error fetching families:", error);
        throw error;
    }
    
    return data;
}

/**
 * Creates a new family group for a wedding.
 * @param {string} weddingId - The active wedding UUID.
 * @option {string} familyName - Name of the family (e.g., "Bafna Family").
 * @returns {Promise<Object>} The created family record.
 */
export async function createFamily(weddingId, familyName) {
    const { data, error } = await supabase
        .from('families')
        .insert([{ wedding_id: weddingId, family_name: familyName }])
        .select()
        .single();

    if (error) {
        console.error("Error creating family:", error);
        throw error;
    }

    return data;
}

/**
 * Assigns a specific guest to a family.
 * @param {string} guestId - The guest UUID.
 * @param {string} familyId - The family UUID.
 * @returns {Promise<Object>} The updated guest record.
 */
export async function assignGuestToFamily(guestId, familyId) {
    const { data, error } = await supabase
        .from('guests')
        .update({ family_id: familyId })
        .eq('id', guestId)
        .select()
        .single();

    if (error) {
        console.error("Error assigning guest to family:", error);
        throw error;
    }

    return data;
}