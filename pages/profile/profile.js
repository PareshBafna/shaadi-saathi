import { supabase } from '../../database/js/api.js';
import { showSweetAlert } from '../../global/js/sweet-alert-message.js';

export function renderProfile() {
    if (typeof window.checkSessionOrShowAlert === 'function' && !window.checkSessionOrShowAlert()) {
        const wrapper = document.createElement('section');
        wrapper.className = "profile-page-wrapper";
        wrapper.innerHTML = `
            <div class="profile-card">
                <div class="profile-loading-state">Please log in to manage your profile.</div>
            </div>
        `;
        return wrapper;
    }

    const wrapper = document.createElement('section');
    wrapper.className = "profile-page-wrapper";

    const curUser = window.currentUser || {};

    wrapper.innerHTML = `
        <div class="profile-container">
            <!-- PERSONAL INFORMATION CARD -->
            <div class="profile-card">
                <div class="profile-card__header">
                    <h2 class="profile-card__title">Personal Information</h2>
                    <p class="profile-card__subtitle">Update your account display name</p>
                </div>
                
                <form id="profileNameForm" novalidate class="profile-form">
                    <div class="profile-field-group">
                        <label class="profile-label">Phone Number</label>
                        <input type="text" value="${curUser.phone || ''}" disabled class="profile-input">
                    </div>

                    <div class="profile-field-group">
                        <label class="profile-label">Full Name *</label>
                        <input type="text" id="profileNameInput" value="${(curUser.name || '').replace(/"/g, '&quot;')}" required placeholder="Enter your full name" class="profile-input ${curUser.name ? 'profile-input--valid' : 'profile-input--invalid'}">
                    </div>

                    <button type="submit" id="btnUpdateName" class="profile-btn-submit">
                        <i data-lucide="check"></i> Save Name
                    </button>
                </form>
            </div>

            <!-- SECURITY / CHANGE PIN CARD -->
            <div class="profile-card">
                <div class="profile-card__header">
                    <h2 class="profile-card__title">Security Settings</h2>
                    <p class="profile-card__subtitle">Update your 6-digit login PIN</p>
                </div>
                
                <form id="profilePinForm" novalidate class="profile-form">
                    <div class="profile-field-group">
                        <label class="profile-label">Current PIN *</label>
                        <input type="text" id="profileCurrentPin" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" oninput="this.value = this.value.replace(/[^0-9]/g, '');" placeholder="Enter current 6-digit PIN" class="profile-input profile-input--invalid">
                    </div>

                    <div class="profile-field-group">
                        <label class="profile-label">New PIN *</label>
                        <input type="text" id="profileNewPin" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" oninput="this.value = this.value.replace(/[^0-9]/g, '');" placeholder="Enter new 6-digit PIN" disabled class="profile-input">
                    </div>

                    <div class="profile-field-group">
                        <label class="profile-label">Confirm New PIN *</label>
                        <input type="text" id="profileConfirmPin" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" oninput="this.value = this.value.replace(/[^0-9]/g, '');" placeholder="Re-enter new 6-digit PIN" disabled class="profile-input">
                    </div>

                    <button type="submit" id="btnUpdatePin" class="profile-btn-submit">
                        <i data-lucide="lock"></i> Update PIN
                    </button>
                </form>
            </div>
        </div>
    `;

    setTimeout(() => {
        initProfileEvents(wrapper);
        if (window.lucide) window.lucide.createIcons();
    }, 50);

    return wrapper;
}

function initProfileEvents(container) {
    const nameInput = container.querySelector('#profileNameInput');
    const currentPinInput = container.querySelector('#profileCurrentPin');
    const newPinInput = container.querySelector('#profileNewPin');
    const confirmPinInput = container.querySelector('#profileConfirmPin');

    let isCurrentPinVerified = false;

    // Input border validity listeners
    nameInput.addEventListener('input', () => {
        if (nameInput.value.trim() === '') {
            nameInput.classList.add('profile-input--invalid');
            nameInput.classList.remove('profile-input--valid');
        } else {
            nameInput.classList.remove('profile-input--invalid');
            nameInput.classList.add('profile-input--valid');
        }
    });

    currentPinInput.addEventListener('input', () => {
        if (currentPinInput.value.trim().length === 6) {
            currentPinInput.classList.remove('profile-input--invalid');
            currentPinInput.classList.add('profile-input--valid');
        } else {
            currentPinInput.classList.add('profile-input--invalid');
            currentPinInput.classList.remove('profile-input--valid');
            // If they modify current PIN after verification, lock new fields back down
            if (isCurrentPinVerified) {
                isCurrentPinVerified = false;
                newPinInput.disabled = true;
                confirmPinInput.disabled = true;
                newPinInput.value = '';
                confirmPinInput.value = '';
                newPinInput.classList.remove('profile-input--valid', 'profile-input--invalid');
                confirmPinInput.classList.remove('profile-input--valid', 'profile-input--invalid');
            }
        }
    });

    [newPinInput, confirmPinInput].forEach(el => {
        el.addEventListener('input', () => {
            if (el.value.trim().length === 6) {
                el.classList.remove('profile-input--invalid');
                el.classList.add('profile-input--valid');
            } else {
                el.classList.add('profile-input--invalid');
                el.classList.remove('profile-input--valid');
            }
        });
    });

    // 1. Handle Name Form
    const nameForm = container.querySelector('#profileNameForm');
    nameForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newName = nameInput.value.trim();

        if (!newName) {
            nameInput.classList.add('profile-input--invalid');
            nameInput.classList.remove('profile-input--valid');
            showSweetAlert('error', 'Missing Information', 'Please enter your full name.');
            return;
        }

        const userId = window.currentUser?.id || localStorage.getItem('ss_user_id');
        if (!userId) {
            showSweetAlert('error', 'Session Error', 'User session not found. Please log in again.');
            return;
        }

        try {
            const { error } = await supabase
                .from('users')
                .update({ name: newName })
                .eq('id', userId);

            if (error) throw error;

            if (window.currentUser) {
                window.currentUser.name = newName;
            }

            showSweetAlert('success', 'Updated!', 'Your name has been updated successfully.');
        } catch (err) {
            showSweetAlert('error', 'Update Failed', err.message);
        }
    });

    // 2. Handle PIN Form
    const pinForm = container.querySelector('#profilePinForm');
    pinForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const currentPin = currentPinInput.value.trim();
        const newPin = newPinInput.value.trim();
        const confirmPin = confirmPinInput.value.trim();

        if (!currentPin) {
            currentPinInput.classList.add('profile-input--invalid');
            showSweetAlert('error', 'Missing Current PIN', 'Please enter your current 6-digit PIN.');
            return;
        }

        if (!/^\d{6}$/.test(currentPin)) {
            currentPinInput.classList.add('profile-input--invalid');
            showSweetAlert('error', 'Invalid PIN Length', 'Current PIN must be exactly 6 digits.');
            return;
        }

        const userId = window.currentUser?.id || localStorage.getItem('ss_user_id');
        if (!userId) {
            showSweetAlert('error', 'Session Error', 'User session not found. Please log in again.');
            return;
        }

        try {
            // If current PIN hasn't been verified yet, verify it first against the database
            if (!isCurrentPinVerified) {
                const { data: user, error: fetchErr } = await supabase
                    .from('users')
                    .select('pin')
                    .eq('id', userId)
                    .single();

                if (fetchErr) throw fetchErr;

                if (user.pin !== currentPin) {
                    currentPinInput.classList.add('profile-input--invalid');
                    currentPinInput.classList.remove('profile-input--valid');
                    showSweetAlert('error', 'Incorrect PIN', 'The current PIN you entered is incorrect. Please try again.');
                    return;
                }

                // Current PIN verified successfully: unlock New PIN & Confirm PIN inputs
                isCurrentPinVerified = true;
                currentPinInput.disabled = true; // Lock current PIN field so it cannot change
                newPinInput.disabled = false;
                confirmPinInput.disabled = false;
                showSweetAlert('success', 'PIN Verified', 'Current PIN verified. Please enter your new PIN.');
                return;
            }

            // If already verified, validate and apply the new PIN change
            if (!newPin) {
                newPinInput.classList.add('profile-input--invalid');
                showSweetAlert('error', 'Missing New PIN', 'Please enter your new 6-digit PIN.');
                return;
            }

            if (!/^\d{6}$/.test(newPin)) {
                newPinInput.classList.add('profile-input--invalid');
                showSweetAlert('error', 'Invalid PIN Length', 'New PIN must be exactly 6 digits.');
                return;
            }

            if (newPin === currentPin) {
                newPinInput.classList.add('profile-input--invalid');
                showSweetAlert('warning', 'Same PIN Entered', 'Your new PIN must be different from your current PIN.');
                return;
            }

            if (!confirmPin) {
                confirmPinInput.classList.add('profile-input--invalid');
                showSweetAlert('error', 'Confirm New PIN', 'Please re-enter your new 6-digit PIN to confirm.');
                return;
            }

            if (newPin !== confirmPin) {
                confirmPinInput.classList.add('profile-input--invalid');
                showSweetAlert('error', 'PINs Do Not Match', 'The new PIN and confirmation PIN do not match. Please verify and try again.');
                return;
            }

            const { error: updateErr } = await supabase
                .from('users')
                .update({ pin: newPin })
                .eq('id', userId);

            if (updateErr) throw updateErr;

            if (window.currentUser) {
                window.currentUser.pin = newPin;
            }

            // Reset form fields, re-lock fields, and clear validation state
            currentPinInput.value = '';
            newPinInput.value = '';
            confirmPinInput.value = '';
            
            isCurrentPinVerified = false;
            currentPinInput.disabled = false;
            newPinInput.disabled = true;
            confirmPinInput.disabled = true;

            [currentPinInput, newPinInput, confirmPinInput].forEach(el => {
                el.classList.remove('profile-input--valid');
                el.classList.add('profile-input--invalid');
            });

            showSweetAlert('success', 'PIN Updated!', 'Your 6-digit PIN has been changed successfully.');
        } catch (err) {
            showSweetAlert('error', 'Update Failed', err.message);
        }
    });
}