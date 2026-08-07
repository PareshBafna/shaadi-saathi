let activeModal = null;

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

  if (activeModal) activeModal.close();

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
    if (activeModal && activeModal.overlay === overlay) activeModal = null;
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
    const closeBtn = document.createElement("button");
    closeBtn.innerHTML = "&times;";
    closeBtn.classList.add("modal__close-btn");
    closeBtn.addEventListener('click', onCloseClick);
    header.appendChild(closeBtn);
  }

  return header;
}

function buildModalBody(content) {
  const body = document.createElement("div");
  body.classList.add("modal__body");

  if (typeof content === "string") {
    body.innerHTML = content; 
  } else if (content instanceof Node) {
    body.appendChild(content);
  }

  return body;
}

function buildModalFooter(actions, close) {
  const footer = document.createElement("div");
  footer.classList.add("modal__footer");

  actions.forEach((action) => {
    const btn = document.createElement("button");
    btn.textContent = action.label;
    
    // Quick inline styling based on requested variant
    if(action.variant === 'primary') {
        btn.style.cssText = "padding: var(--space-2) var(--space-4); background: var(--color-primary); color: var(--color-text-on-accent); border: none; font-weight: var(--font-weight-semibold); cursor: pointer; border-radius: var(--radius-sm); font-size: var(--font-size-sm);";
    } else {
        btn.style.cssText = "padding: var(--space-2) var(--space-3); background: transparent; border: none; color: var(--color-text-secondary); font-weight: var(--font-weight-medium); cursor: pointer; border-radius: var(--radius-sm); font-size: var(--font-size-sm);";
    }

    btn.addEventListener('click', (event) => {
      if (typeof action.onClick === "function") action.onClick(event);
      if (action.closesModal !== false) close();
    });

    footer.appendChild(btn);
  });

  return footer;
}

export function closeActiveModal() {
  if (activeModal) activeModal.close();
}