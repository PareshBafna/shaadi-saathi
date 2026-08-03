/**
 * Global SweetAlert2 wrapper
 * @param {Object} options
 * @param {'success' | 'error' | 'warning' | 'info' | 'question'} options.icon - The type of alert
 * @param {string} options.title - The title of the alert
 * @param {string} [options.text] - The detailed message
 * @param {number} [options.timer] - Auto-close timer in milliseconds (e.g., 2000)
 */
export function showAlert({ icon, title, text = '', timer = null }) {
    const config = {
        icon: icon,
        title: title,
        text: text,
        confirmButtonColor: 'var(--color-primary)', // Standardize your button color
    };

    // If a timer is passed, we generally want to hide the confirm button
    if (timer) {
        config.timer = timer;
        config.showConfirmButton = false;
    } else {
        config.showConfirmButton = true;
    }

    return Swal.fire(config);
}