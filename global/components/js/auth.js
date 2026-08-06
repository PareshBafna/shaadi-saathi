import { supabase } from '../../../database/js/api.js';

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

// Check local storage AND database for a valid session
export async function validateSession() {
    const storedId = localStorage.getItem('shaadi_user_id');
    
    if (!storedId) return null;

    // Verify against database to ensure user still exists and get latest role
    const { data: user, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', storedId)
        .single();

    if (error || !user) {
        localStorage.removeItem('shaadi_user_id');
        return null;
    }

    window.currentUser = user;
    return user;
}

export async function registerUser({ name, phone, password }) {
    const cleanedPhone = cleanPhoneNumber(phone);
    
    const { data: existingUser } = await supabase
        .from('user_profiles')
        .select('id').eq('phone', cleanedPhone).single();

    if (existingUser) throw new Error("Phone number is already registered. Please log in.");

    const { data: newUser, error } = await supabase
        .from('user_profiles')
        .insert([{
            name: name.trim(),
            phone: cleanedPhone,
            password: password.trim(), 
            role: 'guest',
            is_verified: false,
            verification_code: generateVerificationCode()
        }])
        .select()
        .single();

    if (error) throw error;
    
    localStorage.setItem('shaadi_user_id', newUser.id);
    return newUser;
}

export async function loginUser({ phone, password, inviteCode }) {
    const cleanedPhone = cleanPhoneNumber(phone);

    const { data: user, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('phone', cleanedPhone)
        .single();

    if (error || !user) throw new Error("User not found. Please register first.");

    if (inviteCode) {
        const { data: guestMatch } = await supabase
            .from('guests').select('id')
            .eq('phone', cleanedPhone).eq('invite_code', inviteCode.trim().toUpperCase()).single();

        if (guestMatch) {
            await supabase.from('user_profiles').update({ is_verified: true }).eq('id', user.id);
            user.is_verified = true;
        } else {
            throw new Error("Invalid Invite Code for this phone number.");
        }
    } else {
        if (user.password !== password.trim()) throw new Error("Incorrect password.");
    }

    localStorage.setItem('shaadi_user_id', user.id);
    return user;
}

export function logoutUser() {
    localStorage.removeItem('shaadi_user_id');
    window.location.replace('/login.html');
}