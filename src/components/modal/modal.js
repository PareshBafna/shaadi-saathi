/**
 * ============================================================
 * Project : Shaadi Saathi
 * File    : modal.js
 * Purpose : Reusable Modal component factory. Used for Create
 *           Wedding, Add Guest, confirmations (delete/danger
 *           actions), and any other overlay dialog in the app.
 *           All modals must be created through this single
 *           factory to avoid duplicate overlay/dialog markup.
 * Author  : Paresh Bafna
 * ============================================================
 */

import { createButton } from "../button/button.js";

/**
 * @typedef {Object} ModalOptions
 * @property {string} title - Modal header title text.
 * @property {HTMLElement|DocumentFragment|string} content - Modal body content.
 * @property {"sm"|"md"|"lg"} [size="md"] - Modal width size.
 * @property {boolean} [closeOnOverlayClick=true] - Whether clicking the backdrop closes the modal.
 * @property {boolean} [showCloseButton=true] - Whether to show the "X" close icon in the header.
 * @property {Array<ModalAction>} [actions] - Footer action buttons (e.g. Cancel, Confirm).
 * @property {() => void} [onClose] - Callback fired when the modal is closed (any method).
 */

/**
 * @typedef {Object} ModalAction
 * @property {string} label
 * @property {"primary"|"secondary"|"danger"|"ghost"|"outline"} [variant="secondary"]
 * @property {boolean} [closesModal=true] - Whether clicking this action also closes the modal.
 * @property {(event: MouseEvent) => void} [onClick]
 */

/**
 * Tracks the currently open modal instance so only one modal
 * can be active at a time, and so ESC-key handling always
 * targets the correct instance.
 *
 * @type {{ overlay: HTMLElement, close: () => void } | null}
 */
let activeModal = null;

/**
 * Creates and immediately opens a Modal dialog, mounted to
 * document.body. Returns a controller object so calling code
 * can close it programmatically (e.g. after an async save).
 *
 * @param {ModalOptions} options - Configuration options for the modal.
 * @returns {{ close: () => void, overlay: HTMLElement }} Modal controller.
 *
 * @example
 * const modal = openModal({
 *   title: "Create Wedding",
 *   content: formElement,
 *   actions: [
 *     { label: "Cancel", variant: "ghost" },
 *     { label: "Create", variant: "primary", onClick: handleCreate, closesModal: false },
 *   ],
 * });
 * // later, after async save succeeds:
 * modal.close();
 */
export function openModal(options = {}) {
  const {
    title = "",
    content = "",
    size = "md",
    closeOnOverlayClick = true,
    showCloseButton = true,
    actions = [],
    onClose = null,
  } = options;

  // Close any existing modal before opening a new one.
  if (activeModal) {
    activeModal.close();
  }

  const overlay = document.createElement("div");
  overlay.classList.add("modal-overlay");

  const modal = document.createElement("div");
  modal.classList.add("modal", `modal--${size}`);
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  if (title) modal.setAttribute("aria-label", title);

  const close = () => {
    overlay.remove();
    document.removeEventListener("keydown", handleKeydown);
    if (activeModal && activeModal.overlay === overlay) {
      activeModal = null;
    }
    if (typeof onClose === "function") onClose();
  };

  const handleKeydown = (event) => {
    if (event.key === "Escape") close();
  };

  modal.appendChild(buildModalHeader({ title, showCloseButton, onCloseClick: close }));
  modal.appendChild(buildModalBody(content));

  if (actions.length > 0) {
    modal.appendChild(buildModalFooter(actions, close));
  }

  overlay.appendChild(modal);

  if (closeOnOverlayClick) {
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) close();
    });
  }

  document.addEventListener("keydown", handleKeydown);
  document.body.appendChild(overlay);

  activeModal = { overlay, close };
  return activeModal;
}

/**
 * Builds the modal header (title + optional close button).
 *
 * @param {Object} params
 * @param {string} params.title
 * @param {boolean} params.showCloseButton
 * @param {() => void} params.onCloseClick
 * @returns {HTMLDivElement}
 */
function buildModalHeader({ title, showCloseButton, onCloseClick }) {
  const header = document.createElement("div");
  header.classList.add("modal__header");

  if (title) {
    const titleEl = document.createElement("h2");
    titleEl.classList.add("modal__title");
    titleEl.textContent = title;
    header.appendChild(titleEl);
  }

  if (showCloseButton) {
    const closeBtn = createButton({
      icon: "x",
      iconOnly: true,
      ariaLabel: "Close modal",
      variant: "ghost",
      size: "sm",
      onClick: onCloseClick,
    });
    closeBtn.classList.add("modal__close-btn");
    header.appendChild(closeBtn);
  }

  return header;
}

/**
 * Builds the modal body wrapper, accepting text, an HTMLElement,
 * or a DocumentFragment as content.
 *
 * @param {HTMLElement|DocumentFragment|string} content
 * @returns {HTMLDivElement}
 */
function buildModalBody(content) {
  const body = document.createElement("div");
  body.classList.add("modal__body");

  if (typeof content === "string") {
    body.textContent = content;
  } else if (content instanceof Node) {
    body.appendChild(content);
  }

  return body;
}

/**
 * Builds the modal footer action row from a list of action
 * definitions, wiring each button to close the modal by default
 * unless `closesModal: false` is explicitly set.
 *
 * @param {ModalAction[]} actions
 * @param {() => void} close
 * @returns {HTMLDivElement}
 */
function buildModalFooter(actions, close) {
  const footer = document.createElement("div");
  footer.classList.add("modal__footer");

  actions.forEach((action) => {
    const {
      label,
      variant = "secondary",
      closesModal = true,
      onClick = null,
    } = action;

    const button = createButton({
      label,
      variant,
      onClick: (event) => {
        if (typeof onClick === "function") onClick(event);
        if (closesModal) close();
      },
    });

    footer.appendChild(button);
  });

  return footer;
}

/**
 * Closes the currently active modal, if one is open. Useful for
 * closing a modal from outside the component that opened it
 * (e.g. a global keyboard shortcut or navigation guard).
 *
 * @returns {void}
 */
export function closeActiveModal() {
  if (activeModal) activeModal.close();
}