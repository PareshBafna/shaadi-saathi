/**
 * ============================================================
 * Project : Shaadi Saathi
 * File    : api.js
 * Purpose : Initializes and exports the Supabase client.
 * ============================================================
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './credentials.js';

export { SUPABASE_URL, SUPABASE_ANON_KEY };
export const supabaseUrl = SUPABASE_URL;
export const supabaseKey = SUPABASE_ANON_KEY;

// Initialize Supabase client directly
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);