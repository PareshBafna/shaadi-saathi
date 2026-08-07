export function renderSample() {
    const wrapper = document.createElement('section');
    wrapper.style.cssText = "width: 100%; box-sizing: border-box;";

    wrapper.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-8);">
            <div>
                <h1 style="font-size: var(--font-size-3xl); font-weight: var(--font-weight-bold); color: var(--color-text-primary); margin: 0;">Sample Celebration</h1>
                <p style="color: var(--color-text-secondary); margin: var(--space-2) 0 0 0; font-size: var(--font-size-base);">A public preview of the Shaadi Saathi experience.</p>
            </div>
        </div>

        <div style="background: var(--color-white); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-8); text-align: center; margin-top: var(--space-6);">
            <div style="background: var(--color-bg-muted); width: 64px; height: 64px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto var(--space-4);">
                <i data-lucide="sparkles" style="width: 32px; height: 32px; color: var(--color-primary);"></i>
            </div>
            <h2 style="font-size: var(--font-size-xl); font-weight: var(--font-weight-bold); color: var(--color-text-primary); margin-bottom: var(--space-2);">Welcome to the Sample Experience</h2>
            <p style="color: var(--color-text-secondary); max-width: 500px; margin: 0 auto var(--space-6); line-height: 1.5;">
                This section is accessible to everyone regardless of role (Creator, Host, or Guest). It serves as a functional preview of a wedding dashboard and calendar view.
            </p>
            <button style="background: var(--color-primary); color: var(--color-text-on-accent); border: none; padding: var(--space-2) var(--space-5); border-radius: var(--radius-sm); font-weight: var(--font-weight-semibold); cursor: pointer; font-size: var(--font-size-sm);">
                Explore Sample Calendar
            </button>
        </div>
    `;

    return wrapper;
}