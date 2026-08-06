import { registerUser, loginUser, validateSession } from '../../../global/components/js/auth.js';
import { showAlert } from '../../../global/components/js/alerts.js';

document.addEventListener('DOMContentLoaded', async () => {
    
    // Auto-redirect if they visit login.html but are already logged in
    const existingUser = await validateSession();
    if (existingUser) {
        redirectBasedOnRole(existingUser.role);
        return;
    }

    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');

    function redirectBasedOnRole(role) {
        const targetHash = role === 'creator' ? '#dashboard' : '#weddings';
        window.location.replace(`/index.html${targetHash}`);
    }

    tabLogin.addEventListener('click', () => {
        tabLogin.classList.add('active');
        tabRegister.classList.remove('active');
        loginForm.style.display = 'flex';
        registerForm.style.display = 'none';
    });

    tabRegister.addEventListener('click', () => {
        tabRegister.classList.add('active');
        tabLogin.classList.remove('active');
        registerForm.style.display = 'flex';
        loginForm.style.display = 'none';
    });

    document.getElementById('btn-register').addEventListener('click', async () => {
        const name = document.getElementById('reg-name').value.trim();
        const phone = document.getElementById('reg-phone').value.trim();
        const password = document.getElementById('reg-password').value.trim();

        if (!name || !phone || !password) return showAlert({ icon: 'warning', title: 'Missing Info', text: 'Fill all fields.' });

        try {
            const user = await registerUser({ name, phone, password });
            redirectBasedOnRole(user.role);
        } catch (err) {
            showAlert({ icon: 'error', title: 'Registration Failed', text: err.message });
        }
    });

    document.getElementById('btn-login').addEventListener('click', async () => {
        const phone = document.getElementById('login-phone').value.trim();
        const password = document.getElementById('login-password').value.trim();
        const inviteCode = document.getElementById('login-invite-code').value.trim();

        if (!phone || (!password && !inviteCode)) return showAlert({ icon: 'warning', title: 'Missing Info', text: 'Enter phone and password/code.' });

        try {
            const user = await loginUser({ phone, password, inviteCode });
            redirectBasedOnRole(user.role);
        } catch (err) {
            showAlert({ icon: 'error', title: 'Login Failed', text: err.message });
        }
    });
});