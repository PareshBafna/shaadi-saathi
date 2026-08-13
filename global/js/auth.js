import { supabase } from '../../database/js/api.js';

const ADMIN_WHATSAPP_NUMBER = "919791146838";

export function cleanPhoneNumber(phone) {
    return phone.replace(/[^0-9+]/g, '');
}

function generateVerificationCode() {
    return 'VERIFY-' + Math.floor(100000 + Math.random() * 900000);
}

export function getWhatsAppVerificationLink(verificationCode, name) {
    const message = `Hi Shaadi Saathi, please verify my account.\n\nName: ${name}\nCode: ${verificationCode}`;
    return `https://wa.me/${ADMIN_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export async function validateSession() {
    const storedId = localStorage.getItem('ss_user_id');
    
    if (!storedId || storedId === 'undefined' || storedId === 'null') {
        localStorage.removeItem('ss_user_id');
        return null;
    }

    // Updated: Querying the new 'users' table
    const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', storedId)
        .maybeSingle();

    if (error || !user) {
        localStorage.removeItem('ss_user_id');
        return null;
    }

    window.currentUser = user;
    return user;
}

export async function registerUser({ name, phone, pin }) {
    if (!/^\d{4}$/.test(pin)) {
        throw new Error("PIN must be exactly 4 digits.");
    }

    const cleanedPhone = cleanPhoneNumber(phone);
    
    // Updated: Querying the new 'users' table
    const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('phone', cleanedPhone)
        .maybeSingle(); 

    if (existingUser) throw new Error("Phone number is already registered. Please log in.");

    // Updated: Inserting into 'users' table and using the 'pin' column
    const { data: newUser, error } = await supabase
        .from('users')
        .insert([{
            name: name.trim(),
            phone: cleanedPhone,
            pin: pin, 
            role: 'guest',
            is_verified: false,
            verification_code: generateVerificationCode()
        }])
        .select()
        .single();

    if (error) throw error;
    
    localStorage.setItem('ss_user_id', newUser.id);
    return newUser;
}

export async function loginUser({ phone, pin }) {
    const cleanedPhone = cleanPhoneNumber(phone);

    // Updated: Querying the new 'users' table
    const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('phone', cleanedPhone)
        .maybeSingle();

    if (error || !user) throw new Error("User not found. Please register first.");

    // Updated: Checking against the new 'pin' column
    if (user.pin !== pin) {
        throw new Error("Incorrect PIN. Please try again.");
    }

    localStorage.setItem('ss_user_id', user.id);
    return user;
}

export function logoutUser() {
    localStorage.removeItem('ss_user_id');
    window.location.replace('/index.html#login');
    window.location.reload();
}