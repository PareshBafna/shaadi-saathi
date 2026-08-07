export function createBadge({ label, tone = "neutral" }) {
    const badge = document.createElement("span");
    badge.classList.add("badge", `badge--${tone}`);
    badge.textContent = label;
    return badge;
}