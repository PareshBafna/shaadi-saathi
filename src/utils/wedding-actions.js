/**
 * ============================================================
 * Project : Shaadi Saathi
 * File    : wedding-actions.js
 * Purpose : Shared wedding-related actions (Create Wedding, and
 *           future actions like Archive/Delete Wedding) that are
 *           triggered from multiple pages (Dashboard, Weddings
 *           listing). Centralized here to avoid duplicating
 *           modal/toast wiring logic across pages.
 * Author  : Paresh Bafna
 * ============================================================
 */

import { openModal } from "../components/modals/modal.js";
import { showToast } from "../components/toast/toast.js";

/**
 * Opens the Create Wedding modal and wires up its Cancel/Create
 * actions. On confirm, closes the modal, shows a success toast,
 * and invokes the optional `onCreated` callback so the calling
 * page can refresh its own view (e.g. re-render a wedding list).
 *
 * @param {Object} [params]
 * @param {() => void} [params.onCreated] - Called after a wedding is successfully created.
 * @returns {void}
 *
 * @example
 * import { openCreateWeddingModal } from "../../utils/wedding-actions.js";
 *
 * createButton({
 *   label: "Create Wedding",
 *   icon: "plus",
 *   onClick: () => openCreateWeddingModal({ onCreated: () => refreshWeddingsList() }),
 * });
 */
export function openCreateWeddingModal({ onCreated = () => {} } = {}) {
  const modal = openModal({
    title: "Create Wedding",
    content: "Wedding creation form goes here.",
    size: "md",
    actions: [
      { label: "Cancel", variant: "ghost" },
      {
        label: "Create",
        variant: "primary",
        closesModal: false, // stays open until save completes
        onClick: async () => {
          // TODO: await saveWedding() once the service layer exists
          modal.close();
          showToast({ message: "Wedding Created", type: "success" });
          onCreated();
        },
      },
    ],
  });

  if (typeof window !== "undefined" && window.lucide) {
    window.lucide.createIcons();
  }
}