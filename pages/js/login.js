import { registerUser, loginUser } from '../../global/components/js/auth.js';

export function renderLogin() {
    const container = document.createElement('div');
    
    // Centers the login card
    container.style.cssText = `
        display: flex; align-items: center; justify-content: center;
        min-height: 80vh; width: 100%;
    `;

    container.innerHTML = `
        <div style="background: var(--color-white, #ffffff); border: 1px solid var(--color-border, #e2e8f0); border-radius: var(--radius-lg, 12px); padding: var(--space-8, 32px); width: 100%; max-width: 400px; box-shadow: var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.1)); font-family: var(--font-family-sans, system-ui, sans-serif);">
            
            <!-- LOGIN VIEW -->
            <div id="login-view">
                <div style="text-align: center; margin-bottom: var(--space-6, 24px);">
                    <h1 style="margin: 0 0 var(--space-2, 8px) 0; font-family: var(--font-family-display, inherit); color: var(--color-text-primary, #0f172a); font-size: var(--font-size-3xl, 1.5rem); font-weight: var(--font-weight-bold, 700);">Welcome Back</h1>
                    <p style="margin: 0; color: var(--color-text-secondary, #64748b); font-size: var(--font-size-sm, 0.875rem);">Enter your phone and PIN to access your account</p>
                </div>
                
                <div style="display: flex; flex-direction: column; gap: var(--space-4, 16px);">
                    <div style="text-align: left;">
                        <label style="display:block; font-size:var(--font-size-sm, 0.875rem); color:var(--color-text-secondary, #64748b); margin-bottom:4px; font-weight: var(--font-weight-medium, 500);">Phone Number *</label>
                        <input type="tel" id="login-phone" placeholder="e.g., +91 9876543210" style="width:100%; background:var(--color-bg, #f8fafc); border:1px solid var(--color-border, #e2e8f0); color:var(--color-text-primary, #0f172a); padding:var(--space-3, 12px); border-radius:var(--radius-sm, 6px); outline:none; transition: border-color 0.2s; box-sizing: border-box; font-family: inherit; font-size: var(--font-size-sm, 0.875rem);" required>
                    </div>

                    <div style="text-align: left;">
                        <label style="display:block; font-size:var(--font-size-sm, 0.875rem); color:var(--color-text-secondary, #64748b); margin-bottom:4px; font-weight: var(--font-weight-medium, 500);">4-Digit PIN *</label>
                        <input type="password" id="login-pin" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" placeholder="Enter 4-digit PIN" style="width:100%; background:var(--color-bg, #f8fafc); border:1px solid var(--color-border, #e2e8f0); color:var(--color-text-primary, #0f172a); padding:var(--space-3, 12px); border-radius:var(--radius-sm, 6px); outline:none; transition: border-color 0.2s; box-sizing: border-box; font-family: inherit; font-size: var(--font-size-sm, 0.875rem);" required>
                    </div>

                    <button id="btn-login" style="width: 100%; padding: var(--space-3, 12px); background: var(--color-primary, #0f172a); color: #ffffff; border: none; border-radius: var(--radius-sm, 6px); font-weight: var(--font-weight-semibold, 600); cursor: pointer; transition: opacity 0.2s; margin-top: var(--space-2, 8px); font-size: var(--font-size-sm, 0.875rem); font-family: inherit;" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">Log In</button>
                </div>
                
                <div style="text-align: center; margin-top: var(--space-6, 24px); font-size: var(--font-size-sm, 0.875rem); color: var(--color-text-secondary, #64748b);">
                    Don't have an account? <button id="btn-show-register" style="background: none; border: none; color: var(--color-primary, #0f172a); font-weight: var(--font-weight-semibold, 600); cursor: pointer; text-decoration: underline; padding: 0; font-family: inherit;">Register here</button>
                </div>
            </div>

            <!-- REGISTER VIEW -->
            <div id="register-view" style="display: none;">
                <div style="text-align: center; margin-bottom: var(--space-6, 24px);">
                    <h1 style="margin: 0 0 var(--space-2, 8px) 0; font-family: var(--font-family-display, inherit); color: var(--color-text-primary, #0f172a); font-size: var(--font-size-3xl, 1.5rem); font-weight: var(--font-weight-bold, 700);">Create Account</h1>
                    <p style="margin: 0; color: var(--color-text-secondary, #64748b); font-size: var(--font-size-sm, 0.875rem);">Register to start using Shaadi Saathi</p>
                </div>
                
                <div style="display: flex; flex-direction: column; gap: var(--space-4, 16px);">
                    <div style="text-align: left;">
                        <label style="display:block; font-size:var(--font-size-sm, 0.875rem); color:var(--color-text-secondary, #64748b); margin-bottom:4px; font-weight: var(--font-weight-medium, 500);">Full Name *</label>
                        <input type="text" id="reg-name" placeholder="e.g., Rahul Sharma" style="width:100%; background:var(--color-bg, #f8fafc); border:1px solid var(--color-border, #e2e8f0); color:var(--color-text-primary, #0f172a); padding:var(--space-3, 12px); border-radius:var(--radius-sm, 6px); outline:none; transition: border-color 0.2s; box-sizing: border-box; font-family: inherit; font-size: var(--font-size-sm, 0.875rem);" required>
                    </div>
                    
                    <div style="text-align: left;">
                        <label style="display:block; font-size:var(--font-size-sm, 0.875rem); color:var(--color-text-secondary, #64748b); margin-bottom:4px; font-weight: var(--font-weight-medium, 500);">Phone Number *</label>
                        <input type="tel" id="reg-phone" placeholder="e.g., +91 9876543210" style="width:100%; background:var(--color-bg, #f8fafc); border:1px solid var(--color-border, #e2e8f0); color:var(--color-text-primary, #0f172a); padding:var(--space-3, 12px); border-radius:var(--radius-sm, 6px); outline:none; transition: border-color 0.2s; box-sizing: border-box; font-family: inherit; font-size: var(--font-size-sm, 0.875rem);" required>
                    </div>

                    <div style="text-align: left;">
                        <label style="display:block; font-size:var(--font-size-sm, 0.875rem); color:var(--color-text-secondary, #64748b); margin-bottom:4px; font-weight: var(--font-weight-medium, 500);">Create 4-Digit PIN *</label>
                        <input type="password" id="reg-pin" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" placeholder="Create a 4-digit PIN" style="width:100%; background:var(--color-bg, #f8fafc); border:1px solid var(--color-border, #e2e8f0); color:var(--color-text-primary, #0f172a); padding:var(--space-3, 12px); border-radius:var(--radius-sm, 6px); outline:none; transition: border-color 0.2s; box-sizing: border-box; font-family: inherit; font-size: var(--font-size-sm, 0.875rem);" required>
                    </div>

                    <button id="btn-register" style="width: 100%; padding: var(--space-3, 12px); background: var(--color-primary, #0f172a); color: #ffffff; border: none; border-radius: var(--radius-sm, 6px); font-weight: var(--font-weight-semibold, 600); cursor: pointer; transition: opacity 0.2s; margin-top: var(--space-2, 8px); font-size: var(--font-size-sm, 0.875rem); font-family: inherit;" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">Register</button>
                </div>
                
                <div style="text-align: center; margin-top: var(--space-6, 24px); font-size: var(--font-size-sm, 0.875rem); color: var(--color-text-secondary, #64748b);">
                    Already registered? <button id="btn-show-login" style="background: none; border: none; color: var(--color-primary, #0f172a); font-weight: var(--font-weight-semibold, 600); cursor: pointer; text-decoration: underline; padding: 0; font-family: inherit;">Log In</button>
                </div>
            </div>
        </div>
    `;

    // Dynamic Red/Green Validation Borders
    setTimeout(() => {
        ['login-phone', 'login-pin', 'reg-name', 'reg-phone', 'reg-pin'].forEach(id => {
            const el = container.querySelector(`#${id}`);
            if (el) {
                el.style.borderColor = el.value.trim() === '' ? 'var(--color-border)' : 'green';
                
                el.addEventListener('input', () => {
                    el.style.borderColor = el.value.trim() === '' ? 'red' : 'green';
                });
            }
        });
    }, 50);

    // View Toggles
    const loginView = container.querySelector('#login-view');
    const registerView = container.querySelector('#register-view');
    const btnShowRegister = container.querySelector('#btn-show-register');
    const btnShowLogin = container.querySelector('#btn-show-login');

    btnShowRegister.addEventListener('click', () => { 
        loginView.style.display = 'none'; 
        registerView.style.display = 'block'; 
        container.querySelectorAll('input').forEach(el => el.style.borderColor = 'var(--color-border)');
    });
    
    btnShowLogin.addEventListener('click', () => { 
        registerView.style.display = 'none'; 
        loginView.style.display = 'block'; 
        container.querySelectorAll('input').forEach(el => el.style.borderColor = 'var(--color-border)');
    });

    // Handle Login
    container.querySelector('#btn-login').addEventListener('click', async () => {
        const requiredFields = [
            { id: 'login-phone', name: "Phone Number" },
            { id: 'login-pin', name: "4-Digit PIN" }
        ];

        let isValid = true; 
        let firstEmpty = null;

        requiredFields.forEach(field => {
            const el = container.querySelector(`#${field.id}`);
            if (!el.value.trim()) { 
                el.style.borderColor = "red"; 
                isValid = false; 
                if(!firstEmpty) firstEmpty = field.name; 
            } else { 
                el.style.borderColor = "green"; 
            }
        });

        if (!isValid) {
            return Swal.fire({ icon: 'warning', title: 'Missing Info', text: `Please fill out: ${firstEmpty}` });
        }
        
        const phone = container.querySelector('#login-phone').value.trim();
        const pin = container.querySelector('#login-pin').value.trim();

        if (!/^\d{4}$/.test(pin)) {
            container.querySelector('#login-pin').style.borderColor = "red";
            return Swal.fire({ icon: 'warning', title: 'Invalid PIN', text: 'PIN must be exactly 4 digits.' });
        }

        try {
            const user = await loginUser({ phone, pin });
            window.currentUser = user; 
            window.location.hash = user.role === 'creator' ? '#dashboard' : '#weddings';
            window.location.reload();
        } catch (err) {
            if (err.message.includes("User not found")) {
                Swal.fire({
                    icon: 'warning', 
                    title: 'Not Registered', 
                    text: 'User is not registered. Please register first.',
                    confirmButtonText: 'Go to Register', 
                    confirmButtonColor: '#0f172a'
                }).then((res) => { 
                    if (res.isConfirmed) btnShowRegister.click(); 
                });
            } else {
                Swal.fire({ icon: 'error', title: 'Login Failed', text: err.message });
            }
        }
    });

    // Handle Registration
    container.querySelector('#btn-register').addEventListener('click', async () => {
        const requiredFields = [
            { id: 'reg-name', name: "Full Name" },
            { id: 'reg-phone', name: "Phone Number" },
            { id: 'reg-pin', name: "4-Digit PIN" }
        ];

        let isValid = true; 
        let firstEmpty = null;

        requiredFields.forEach(field => {
            const el = container.querySelector(`#${field.id}`);
            if (!el.value.trim()) { 
                el.style.borderColor = "red"; 
                isValid = false; 
                if(!firstEmpty) firstEmpty = field.name; 
            } else { 
                el.style.borderColor = "green"; 
            }
        });

        if (!isValid) {
            return Swal.fire({ icon: 'warning', title: 'Missing Info', text: `Please fill out: ${firstEmpty}` });
        }

        const name = container.querySelector('#reg-name').value.trim();
        const phone = container.querySelector('#reg-phone').value.trim();
        const pin = container.querySelector('#reg-pin').value.trim();

        if (!/^\d{4}$/.test(pin)) {
            container.querySelector('#reg-pin').style.borderColor = "red";
            return Swal.fire({ icon: 'warning', title: 'Invalid PIN', text: 'PIN must be exactly 4 digits.' });
        }

        try {
            const user = await registerUser({ name, phone, pin });
            window.currentUser = user;
            window.location.hash = user.role === 'creator' ? '#dashboard' : '#weddings';
            window.location.reload();
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Registration Failed', text: err.message });
        }
    });

    return container;
}