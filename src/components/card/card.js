/**
 * ============================================================
 * Project : Shaadi Saathi
 * File    : card.js
 * Purpose : Reusable Card component factory. Used across
 *           dashboard stats, wedding listings, guest summaries,
 *           and any boxed content container. All cards in the
 *           app must be created through this single factory to
 *           avoid duplicate card markup or styling.
 * Author  : Paresh Bafna
 * ============================================================
 */

/**
 * @typedef {Object} CardOptions
 * @property {string} [title]        - Card title text.
 * @property {string} [subtitle]     - Card subtitle text, shown below title.
 * @property {string} [icon]         - Lucide icon name shown in the card header.
 * @property {HTMLElement|DocumentFragment|string} [content] - Main body content.
 * @property {HTMLElement} [footer]  - Optional footer element (e.g. actions row).
 * @property {"default"|"outlined"|"elevated"} [variant="default"] - Visual style.
 * @property {boolean} [hoverable=false] - Whether card lifts on hover (for clickable cards).
 * @property {boolean} [clickable=false] - Whether the whole card is clickable.
 * @property {(event: MouseEvent) => void} [onClick] - Click handler (requires clickable=true).
 */

/**
 * Creates a fully-styled Card container element.
 *
 * @param {CardOptions} options - Configuration options for the card.
 * @returns {HTMLDivElement} The constructed card element.
 *
 * @example
 * const statCard = createCard({
 *   title: "Active Weddings",
 *   subtitle: "Currently being planned",
 *   icon: "heart",
 *   content: "12",
 *   variant: "elevated",
 * });
 * document.querySelector("#stats-grid").appendChild(statCard);
 */
export function createCard(options = {}) {
  const {
    title = "",
    subtitle = "",
    icon = "",
    content = "",
    footer = null,
    variant = "default",
    hoverable = false,
    clickable = false,
    onClick = null,
  } = options;

  const card = document.createElement("div");
  card.classList.add("card", `card--${variant}`);

  if (hoverable) card.classList.add("card--hoverable");
  if (clickable) card.classList.add("card--clickable");

  if (clickable) {
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
  }

  if (title || subtitle || icon) {
    card.appendChild(buildCardHeader({ title, subtitle, icon }));
  }

  if (content) {
    card.appendChild(buildCardBody(content));
  }

  if (footer) {
    const footerWrap = document.createElement("div");
    footerWrap.classList.add("card__footer");
    footerWrap.appendChild(footer);
    card.appendChild(footerWrap);
  }

  if (clickable && typeof onClick === "function") {
    card.addEventListener("click", onClick);
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onClick(event);
      }
    });
  }

  return card;
}

/**
 * Builds the card header block containing icon, title, and subtitle.
 *
 * @param {Object} params
 * @param {string} params.title
 * @param {string} params.subtitle
 * @param {string} params.icon
 * @returns {HTMLDivElement}
 */
function buildCardHeader({ title, subtitle, icon }) {
  const header = document.createElement("div");
  header.classList.add("card__header");

  if (icon) {
    const iconWrap = document.createElement("div");
    iconWrap.classList.add("card__icon");
    const iconEl = document.createElement("i");
    iconEl.setAttribute("data-lucide", icon);
    iconWrap.appendChild(iconEl);
    header.appendChild(iconWrap);
  }

  if (title || subtitle) {
    const textWrap = document.createElement("div");
    textWrap.classList.add("card__header-text");

    if (title) {
      const titleEl = document.createElement("h3");
      titleEl.classList.add("card__title");
      titleEl.textContent = title;
      textWrap.appendChild(titleEl);
    }

    if (subtitle) {
      const subtitleEl = document.createElement("p");
      subtitleEl.classList.add("card__subtitle");
      subtitleEl.textContent = subtitle;
      textWrap.appendChild(subtitleEl);
    }

    header.appendChild(textWrap);
  }

  return header;
}

/**
 * Builds the card body wrapper, accepting either plain text,
 * an HTMLElement, or a DocumentFragment as content.
 *
 * @param {HTMLElement|DocumentFragment|string} content
 * @returns {HTMLDivElement}
 */
function buildCardBody(content) {
  const body = document.createElement("div");
  body.classList.add("card__body");

  if (typeof content === "string") {
    body.textContent = content;
  } else if (content instanceof Node) {
    body.appendChild(content);
  }

  return body;
}