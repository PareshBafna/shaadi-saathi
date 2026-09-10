import { supabase } from '../../database/js/api.js';
import { showSweetAlert } from '../../global/js/sweet-alert-message.js';

// Replace with your real Cloudflare Turnstile Site Key
const TURNSTILE_SITE_KEY = '0x4AAAAAAEutjFdHF82YBfYP';

let turnstileWidgetLogin = null;
let turnstileWidgetReg = null;
let turnstileTokenLogin = null;
let turnstileTokenReg = null;

function cleanPhoneNumber(phone) {
    return phone.replace(/[^0-9+]/g, '');
}

function generateVerificationCode() {
    return 'VERIFY-' + Math.floor(100000 + Math.random() * 900000);
}

async function verifyTurnstileToken(token) {
    // If testing on pure localhost without local wrangler functions, bypass
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        try {
            const res = await fetch('/api/verify-turnstile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token })
            });
            if (res.status === 404) {
                console.warn('Local environment without cloudflare functions runner detected. Skipping server validation.');
                return true;
            }
            const data = await res.json();
            return data.success;
        } catch (e) {
            console.warn('Backend verify skipped on local server:', e);
            return true;
        }
    }

    const res = await fetch('/api/verify-turnstile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
    });
    const data = await res.json();
    return data.success;
}

export async function validateSession() {
    const storedId = localStorage.getItem('ss_user_id');
    
    if (!storedId || storedId === 'undefined' || storedId === 'null') {
        localStorage.removeItem('ss_user_id');
        return null;
    }

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
    if (!/^\d{6}$/.test(pin)) {
        throw new Error("PIN must be exactly 6 digits.");
    }

    const cleanedPhone = cleanPhoneNumber(phone);
    
    const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('phone', cleanedPhone)
        .maybeSingle(); 

    if (existingUser) throw new Error("Phone number is already registered. Please log in.");

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

    const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('phone', cleanedPhone)
        .maybeSingle();

    if (error || !user) throw new Error("User not found. Please register first.");

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

function getRoleRedirectHash(role) {
    if (role === 'creator') return '#dashboard';
    if (role === 'host' || role === 'wedding_user') return '#weddings';
    return '#calendar';
}

function mountTurnstileWidgets(container) {
    if (!window.turnstile) {
        setTimeout(() => mountTurnstileWidgets(container), 250);
        return;
    }

    const loginEl = container.querySelector('#cf-turnstile-login');
    if (loginEl && turnstileWidgetLogin === null) {
        try {
            turnstileWidgetLogin = window.turnstile.render(loginEl, {
                sitekey: TURNSTILE_SITE_KEY,
                theme: 'dark',
                callback: (token) => { turnstileTokenLogin = token; },
                'expired-callback': () => { turnstileTokenLogin = null; },
                'error-callback': () => { turnstileTokenLogin = null; }
            });
        } catch (e) {
            console.error("Turnstile login render error:", e);
        }
    }

    const regEl = container.querySelector('#cf-turnstile-reg');
    if (regEl && turnstileWidgetReg === null) {
        try {
            turnstileWidgetReg = window.turnstile.render(regEl, {
                sitekey: TURNSTILE_SITE_KEY,
                theme: 'dark',
                callback: (token) => { turnstileTokenReg = token; },
                'expired-callback': () => { turnstileTokenReg = null; },
                'error-callback': () => { turnstileTokenReg = null; }
            });
        } catch (e) {
            console.error("Turnstile reg render error:", e);
        }
    }
}

export function renderLogin() {
    turnstileWidgetLogin = null;
    turnstileWidgetReg = null;
    turnstileTokenLogin = null;
    turnstileTokenReg = null;

    const container = document.createElement('div');
    container.className = 'login-page-wrapper';

    container.innerHTML = `
        <div class="login-card">
            
            <!-- LOGIN VIEW -->
            <div id="login-view">
                <div class="login-header">
                    <h1>Welcome Back</h1>
                    <p>Enter your phone and 6-digit PIN to access your account</p>
                </div>
                
                <div class="login-form-group">
                    <div class="login-field-container">
                        <label class="login-label">Phone Number *</label>
                        <input type="tel" id="login-phone" oninput="this.value = this.value.replace(/[^0-9]/g, '');" placeholder="e.g., 919876543210" class="login-input" required>
                    </div>

                    <div class="login-field-container">
                        <label class="login-label">6-Digit PIN *</label>
                        <input type="password" id="login-pin" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" oninput="this.value = this.value.replace(/[^0-9]/g, '');" placeholder="Enter 6-digit PIN" class="login-input" required>
                    </div>

                    <div id="cf-turnstile-login" style="margin: 0.85rem 0; display: flex; justify-content: center; min-height: 65px;"></div>

                    <button id="btn-login" class="login-submit-btn">Log In</button>
                </div>
                
                <div class="login-switch-footer">
                    Don't have an account? <button id="btn-show-register" class="login-switch-btn">Register here</button>
                </div>
            </div>

            <!-- REGISTER VIEW -->
            <div id="register-view" class="login-view--hidden">
                <div class="login-header">
                    <h1>Create Account</h1>
                    <p>Register to start using Shaadi Saathi</p>
                </div>
                
                <div class="login-form-group">
                    <div class="login-field-container">
                        <label class="login-label">Full Name *</label>
                        <input type="text" id="reg-name" placeholder="e.g., Rahul Sharma" class="login-input" required>
                    </div>
                    
                    <div class="login-field-container">
                        <label class="login-label">Phone Number *</label>
                        <input type="tel" id="reg-phone" oninput="this.value = this.value.replace(/[^0-9]/g, '');" placeholder="e.g., 919876543210" class="login-input" required>
                    </div>

                    <div class="login-field-container">
                        <label class="login-label">Create 6-Digit PIN *</label>
                        <input type="password" id="reg-pin" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" oninput="this.value = this.value.replace(/[^0-9]/g, '');" placeholder="Create a 6-digit PIN" class="login-input" required>
                    </div>

                    <div id="cf-turnstile-reg" style="margin: 0.85rem 0; display: flex; justify-content: center; min-height: 65px;"></div>

                    <button id="btn-register" class="login-submit-btn">Register</button>
                </div>
                
                <div class="login-switch-footer">
                    Already registered? <button id="btn-show-login" class="login-switch-btn">Log In</button>
                </div>
            </div>
        </div>
    `;

    setTimeout(() => {
        ['login-phone', 'login-pin', 'reg-name', 'reg-phone', 'reg-pin'].forEach(id => {
            const el = container.querySelector(`#${id}`);
            if (el) {
                const updateValidationState = () => {
                    if (el.value.trim() === '') {
                        el.classList.remove('login-input--valid');
                        el.classList.remove('login-input--invalid');
                    } else {
                        el.classList.remove('login-input--invalid');
                        el.classList.add('login-input--valid');
                    }
                };
                el.addEventListener('input', updateValidationState);
            }
        });

        mountTurnstileWidgets(container);
    }, 50);

    const loginView = container.querySelector('#login-view');
    const registerView = container.querySelector('#register-view');
    const btnShowRegister = container.querySelector('#btn-show-register');
    const btnShowLogin = container.querySelector('#btn-show-login');

    const hashChangeCleanup = () => {
        const modalBackdrops = document.querySelectorAll('.modal-backdrop, .swal2-container');
        modalBackdrops.forEach(b => b.remove());
        window.removeEventListener('hashchange', hashChangeCleanup);
    };
    window.addEventListener('hashchange', hashChangeCleanup);

    btnShowRegister.addEventListener('click', () => { 
        loginView.classList.add('login-view--hidden'); 
        registerView.classList.remove('login-view--hidden'); 
        container.querySelectorAll('input').forEach(el => {
            el.classList.remove('login-input--valid');
            el.classList.remove('login-input--invalid');
        });
    });
    
    btnShowLogin.addEventListener('click', () => { 
        registerView.classList.add('login-view--hidden'); 
        loginView.classList.remove('login-view--hidden'); 
        container.querySelectorAll('input').forEach(el => {
            el.classList.remove('login-input--valid');
            el.classList.remove('login-input--invalid');
        });
    });

    container.querySelector('#btn-login').addEventListener('click', async () => {
        const requiredFields = [
            { id: 'login-phone', name: "Phone Number" },
            { id: 'login-pin', name: "6-Digit PIN" }
        ];

        let isValid = true; 
        let firstEmpty = null;

        requiredFields.forEach(field => {
            const el = container.querySelector(`#${field.id}`);
            if (!el.value.trim()) { 
                el.classList.remove('login-input--valid');
                el.classList.add('login-input--invalid'); 
                isValid = false; 
                if (!firstEmpty) firstEmpty = field.name; 
            } else { 
                el.classList.remove('login-input--invalid');
                el.classList.add('login-input--valid'); 
            }
        });

        if (!isValid) {
            return showSweetAlert('error', 'Missing Info', `Please fill out: ${firstEmpty}`);
        }

        if (window.turnstile && !turnstileTokenLogin) {
            return showSweetAlert('warning', 'Security Check', 'Please verify the security check before logging in.');
        }
        
        const phone = container.querySelector('#login-phone').value.trim();
        const pin = container.querySelector('#login-pin').value.trim();

        if (!/^\d{6}$/.test(pin)) {
            const pinEl = container.querySelector('#login-pin');
            pinEl.classList.remove('login-input--valid');
            pinEl.classList.add('login-input--invalid');
            return showSweetAlert('error', 'Invalid PIN', 'PIN must be exactly 6 digits.');
        }

        try {
            // Validate Turnstile on server
            if (turnstileTokenLogin) {
                const isValidToken = await verifyTurnstileToken(turnstileTokenLogin);
                if (!isValidToken) {
                    throw new Error("Security verification failed. Please try again.");
                }
            }

            const user = await loginUser({ phone, pin });
            window.currentUser = user; 
            window.location.hash = getRoleRedirectHash(user.role);
            window.location.reload();
        } catch (err) {
            if (window.turnstile && turnstileWidgetLogin !== null) {
                window.turnstile.reset(turnstileWidgetLogin);
                turnstileTokenLogin = null;
            }
            if (err.message.includes("User not found")) {
                showSweetAlert('error', 'Not Registered', 'User is not registered. Please register first.', null, 'Go to Register', () => { btnShowRegister.click(); });
            } else {
                showSweetAlert('error', 'Login Failed', err.message);
            }
        }
    });

    container.querySelector('#btn-register').addEventListener('click', async () => {
        const requiredFields = [
            { id: 'reg-name', name: "Full Name" },
            { id: 'reg-phone', name: "Phone Number" },
            { id: 'reg-pin', name: "6-Digit PIN" }
        ];

        let isValid = true; 
        let firstEmpty = null;

        requiredFields.forEach(field => {
            const el = container.querySelector(`#${field.id}`);
            if (!el.value.trim()) { 
                el.classList.remove('login-input--valid');
                el.classList.add('login-input--invalid'); 
                isValid = false; 
                if (!firstEmpty) firstEmpty = field.name; 
            } else { 
                el.classList.remove('login-input--invalid');
                el.classList.add('login-input--valid'); 
            }
        });

        if (!isValid) {
            return showSweetAlert('error', 'Missing Info', `Please fill out: ${firstEmpty}`);
        }

        if (window.turnstile && !turnstileTokenReg) {
            return showSweetAlert('warning', 'Security Check', 'Please verify the security check before registering.');
        }

        const name = container.querySelector('#reg-name').value.trim();
        const phone = container.querySelector('#reg-phone').value.trim();
        const pin = container.querySelector('#reg-pin').value.trim();

        if (!/^\d{6}$/.test(pin)) {
            const regPinEl = container.querySelector('#reg-pin');
            regPinEl.classList.remove('login-input--valid');
            regPinEl.classList.add('login-input--invalid');
            return showSweetAlert('error', 'Invalid PIN', 'PIN must be exactly 6 digits.');
        }

        try {
            // Validate Turnstile on server
            if (turnstileTokenReg) {
                const isValidToken = await verifyTurnstileToken(turnstileTokenReg);
                if (!isValidToken) {
                    throw new Error("Security verification failed. Please try again.");
                }
            }

            const user = await registerUser({ name, phone, pin });
            window.currentUser = user;
            window.location.hash = getRoleRedirectHash(user.role);
            window.location.reload();
        } catch (err) {
            if (window.turnstile && turnstileWidgetReg !== null) {
                window.turnstile.reset(turnstileWidgetReg);
                turnstileTokenReg = null;
            }
            showSweetAlert('error', 'Registration Failed', err.message);
        }
    });

    return container;
}