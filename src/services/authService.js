import { supabase } from '../config/api.js';

export const authService = {
    /**
     * Sign in an existing user
     */
    async signIn(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) throw new Error(error.message);
        return data;
    },

    /**
     * Register a new user
     */
    async signUp(email, password) {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        });
        if (error) throw new Error(error.message);
        return data;
    },

    /**
     * Log the current user out
     */
    async signOut() {
        const { error } = await supabase.auth.signOut();
        if (error) throw new Error(error.message);
    },

    /**
     * Get the current active session
     */
    async getSession() {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw new Error(error.message);
        return session;
    }
};