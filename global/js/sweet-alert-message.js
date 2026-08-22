export function showSweetAlert(iconOrOptions, titleStr = '', textStr = '', timerNum = null, confirmBtnText = 'OK', onConfirmCb = null) {
    let icon = 'info';
    let title = '';
    let text = '';
    let timer = null;
    let confirmButtonText = 'OK';
    let onConfirm = null;

    // Check if the arguments were passed as an object or as direct strings
    if (typeof iconOrOptions === 'object' && iconOrOptions !== null) {
        ({ icon = 'info', title = '', text = '', timer = null, confirmButtonText = 'OK', onConfirm = null } = iconOrOptions);
    } else {
        icon = iconOrOptions || 'info';
        title = titleStr;
        text = textStr;
        timer = timerNum;
        confirmButtonText = confirmBtnText;
        onConfirm = onConfirmCb;
    }

    // Success notifications or explicitly timed alerts render as top-right auto-dismissing toasts
    if (timer || icon === 'success') {
        return Swal.fire({
            icon: icon,
            title: title,
            text: text,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: timer || 3000,
            timerProgressBar: true
        });
    }

    // Standard modal dialogs (Sessions, Errors, Warnings)
    return Swal.fire({
        icon: icon,
        title: title,
        text: text,
        confirmButtonText: confirmButtonText,
        confirmButtonColor: 'var(--color-primary)',
        allowOutsideClick: false,
        allowEscapeKey: false
    }).then((result) => {
        if (result.isConfirmed && typeof onConfirm === 'function') {
            onConfirm();
        }
        return result;
    });
}

window.showSweetAlert = showSweetAlert;