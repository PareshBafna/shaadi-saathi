/**
 * ============================================================
 * Project : Shaadi Saathi
 * File    : api.js
 * Purpose : Initializes and exports the Supabase client.
 * ============================================================
 */

// Using the ESM CDN link for Vanilla JS without a bundler
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// TODO: Replace these with your actual Supabase project credentials
// You can find these in your Supabase Dashboard under Settings > API
const supabaseUrl = 'https://vufhmsosktkxskymfisv.supabase.co/';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1Zmhtc29za3RreHNreW1maXN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyMDk1MjgsImV4cCI6MjEwMDc4NTUyOH0.7XRBkwY7dw2nH2Jrvmp4I1M2BZAPv5j_n8cLGIB-hqk';

// Initialize the Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey);