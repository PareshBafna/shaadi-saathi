import { authService } from '../../services/authService.js';
import { createButton } from '../../components/button/button.js';
import { router } from '../../core/router.js';

export function renderLogin() {
    const section = document.createElement("section");
    section.classList.add("login-page");

    // Container for the form
    const formContainer = document.createElement("div");
    formContainer.classList.add("login-container", "card");

    // Header
    const header = document.createElement("h1");
    header.textContent = "Welcome to Shaadi Saathi";
    header.classList.add("login-header");

    const subtitle = document.createElement("p");
    subtitle.textContent = "Sign in to manage your wedding workspaces.";
    subtitle.classList.add("login-subtitle");

    // Error Message Container
    const errorContainer = document.createElement("div");
    errorContainer.classList.add("login-error");
    errorContainer.style.color = "var(--color-error, #ff4d4f)";
    errorContainer.style.marginBottom = "1rem";
    errorContainer.style.display = "none";

    // Form
    const form = document.createElement("form");
    form.classList.add("login-form");

    // Email Input
    const emailGroup = document.createElement("div");
    emailGroup.classList.add("form-group");
    emailGroup.innerHTML = `
        <label for="email">Email Address</label>
        <input type="email" id="email" name="email" required placeholder="name@example.com" class="form-input">
    `;

    // Password Input
    const passwordGroup = document.createElement("div");
    passwordGroup.classList.add("form-group");
    passwordGroup.innerHTML = `
        <label for="password">Password</label>
        <input type="password" id="password" name="password" required placeholder="••••••••" class="form-input">
    `;

    // Buttons
    const actionsGroup = document.createElement("div");
    actionsGroup.classList.add("login-actions");
    actionsGroup.style.display = "flex";
    actionsGroup.style.gap = "1rem";
    actionsGroup.style.marginTop = "1.5rem";

    const loginBtn = createButton({
        label: "Sign In",
        variant: "primary",
        type: "submit"
    });
    loginBtn.style.flex = "1";

    const signupBtn = createButton({
        label: "Create Account",
        variant: "outline",
        type: "button",
        onClick: async () => {
            const email = form.email.value;
            const password = form.password.value;
            
            if (!email || !password) {
                showError("Please enter both email and password to sign up.");
                return;
            }

            try {
                signupBtn.textContent = "Creating...";
                signupBtn.disabled = true;
                await authService.signUp(email, password);
                showError("Success! You can now sign in.", "success");
            } catch (err) {
                showError(err.message);
            } finally {
                signupBtn.textContent = "Create Account";
                signupBtn.disabled = false;
            }
        }
    });
    signupBtn.style.flex = "1";

    // Form Submit Handler (Login)
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = form.email.value;
        const password = form.password.value;

        try {
            loginBtn.textContent = "Signing In...";
            loginBtn.disabled = true;
            errorContainer.style.display = "none";

            await authService.signIn(email, password);
            
            // The auth listener in app.js will detect the sign-in and redirect to /dashboard
            // but we can force a manual routing just in case
            router.navigate('/dashboard');
        } catch (err) {
            showError("Invalid email or password.");
        } finally {
            loginBtn.textContent = "Sign In";
            loginBtn.disabled = false;
        }
    });

    function showError(message, type = "error") {
        errorContainer.textContent = message;
        errorContainer.style.color = type === "success" ? "var(--color-success, #52c41a)" : "var(--color-error, #ff4d4f)";
        errorContainer.style.display = "block";
    }

    // Assemble DOM
    actionsGroup.appendChild(loginBtn);
    actionsGroup.appendChild(signupBtn);
    
    form.appendChild(emailGroup);
    form.appendChild(passwordGroup);
    form.appendChild(actionsGroup);

    formContainer.appendChild(header);
    formContainer.appendChild(subtitle);
    formContainer.appendChild(errorContainer);
    formContainer.appendChild(form);

    section.appendChild(formContainer);

    return section;
}