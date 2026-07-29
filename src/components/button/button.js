/**
 * ============================================================
 * Project : Shaadi Saathi
 * File    : button.js
 * Purpose : Reusable Button component factory. Every clickable
 *           action button in the application (primary, secondary,
 *           danger, ghost, icon-only) must be created through
 *           this single factory to avoid duplicate button markup
 *           or styling anywhere in the app.
 * Author  : Paresh Bafna
 * ============================================================
 */

/**
 * @typedef {Object} ButtonOptions
 * @property {string} [label]        - Visible text label of the button.
 * @property {string} [icon]         - Lucide icon name (e.g. "plus", "trash-2").
 * @property {"left"|"right"} [iconPosition="left"] - Icon placement relative to label.
 * @property {"primary"|"secondary"|"danger"|"ghost"|"outline"} [variant="primary"] - Visual style.
 * @property {"sm"|"md"|"lg"} [size="md"] - Button size.
 * @property {boolean} [fullWidth=false]  - Whether button stretches to 100% width.
 * @property {boolean} [disabled=false]   - Whether button is disabled.
 * @property {boolean} [loading=false]    - Whether button shows a loading spinner.
 * @property {boolean} [iconOnly=false]   - Whether button renders as icon-only (no label).
 * @property {string} [type="button"]     - Native button type attribute.
 * @property {string} [ariaLabel]          - Accessible label (required if iconOnly).
 * @property {(event: MouseEvent) => void} [onClick] - Click handler.
 */

/**
 * Creates a fully-styled, accessible <button> element.
 *
 * @param {ButtonOptions} options - Configuration options for the button.
 * @returns {HTMLButtonElement} The constructed button element.
 *
 * @example
 * const saveBtn = createButton({
 *   label: "Save Changes",
 *   icon: "check",
 *   variant: "primary",
 *   onClick: () => saveWedding(),
 * });
 * document.body.appendChild(saveBtn);
 */
export function createButton(options = {}) {
  const {
    label = "",
    icon = "",
    iconPosition = "left",
    variant = "primary",
    size = "md",
    fullWidth = false,
    disabled = false,
    loading = false,
    iconOnly = false,
    type = "button",
    ariaLabel = "",
    onClick = null,
  } = options;

  if (iconOnly && !ariaLabel) {
    console.warn(
      "[Button] iconOnly buttons must provide an ariaLabel for accessibility."
    );
  }

  const button = document.createElement("button");
  button.type = type;

  button.classList.add("button", `button--${variant}`, `button--${size}`);

  if (fullWidth) button.classList.add("button--full-width");
  if (iconOnly) button.classList.add("button--icon-only");
  if (loading) button.classList.add("button--loading");

  button.disabled = Boolean(disabled || loading);

  if (ariaLabel) {
    button.setAttribute("aria-label", ariaLabel);
  }

  button.appendChild(buildButtonContent({ label, icon, iconPosition, iconOnly, loading }));

  if (typeof onClick === "function") {
    button.addEventListener("click", (event) => {
      if (button.disabled) return;
      onClick(event);
    });
  }

  return button;
}

/**
 * Builds the inner content (icon + label + spinner) of a button
 * as a single fragment, respecting icon position and loading state.
 *
 * @param {Object} params
 * @param {string} params.label
 * @param {string} params.icon
 * @param {"left"|"right"} params.iconPosition
 * @param {boolean} params.iconOnly
 * @param {boolean} params.loading
 * @returns {DocumentFragment}
 */
function buildButtonContent({ label, icon, iconPosition, iconOnly, loading }) {
  const fragment = document.createDocumentFragment();

  if (loading) {
    fragment.appendChild(buildSpinner());
    if (!iconOnly && label) {
      fragment.appendChild(buildLabelSpan(label));
    }
    return fragment;
  }

  const iconEl = icon ? buildIcon(icon) : null;

  if (iconEl && iconPosition === "left") {
    fragment.appendChild(iconEl);
  }

  if (!iconOnly && label) {
    fragment.appendChild(buildLabelSpan(label));
  }

  if (iconEl && iconPosition === "right") {
    fragment.appendChild(iconEl);
  }

  if (iconOnly && iconEl && !fragment.contains(iconEl)) {
    fragment.appendChild(iconEl);
  }

  return fragment;
}

/**
 * Builds a Lucide <i> icon placeholder element. Actual icon
 * rendering is performed by lucide.createIcons() after the
 * button is mounted to the DOM.
 *
 * @param {string} iconName - Lucide icon name.
 * @returns {HTMLElement}
 */
function buildIcon(iconName) {
  const icon = document.createElement("i");
  icon.setAttribute("data-lucide", iconName);
  icon.classList.add("button__icon");
  return icon;
}

/**
 * Builds the text label span of a button.
 *
 * @param {string} label
 * @returns {HTMLSpanElement}
 */
function buildLabelSpan(label) {
  const span = document.createElement("span");
  span.classList.add("button__label");
  span.textContent = label;
  return span;
}

/**
 * Builds the loading spinner element shown when loading=true.
 *
 * @returns {HTMLSpanElement}
 */
function buildSpinner() {
  const spinner = document.createElement("span");
  spinner.classList.add("button__spinner");
  spinner.setAttribute("aria-hidden", "true");
  return spinner;
}