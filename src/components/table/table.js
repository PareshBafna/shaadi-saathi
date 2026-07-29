/**
 * ============================================================
 * Project : Shaadi Saathi
 * File    : table.js
 * Purpose : Reusable Table component factory. Used primarily
 *           for the Guest Database (Guest Management), but also
 *           applicable anywhere tabular data needs to be shown
 *           (audit logs, vendor lists, etc). All tables in the
 *           app must be created through this single factory to
 *           avoid duplicate table markup or styling.
 * Author  : Paresh Bafna
 * ============================================================
 */

import { createBadge } from "../badge/badge.js";

/**
 * @typedef {Object} TableColumn
 * @property {string} key - Property key to read from each row object.
 * @property {string} label - Column header text.
 * @property {"text"|"badge"|"custom"} [type="text"] - How to render cell content.
 * @property {string} [statusKey] - When type="badge", the row property holding the status value (defaults to `key`).
 * @property {(row: Object) => (HTMLElement|string)} [render] - Custom cell renderer, required when type="custom".
 * @property {boolean} [sortable=false] - Whether clicking the header sorts by this column.
 * @property {"left"|"center"|"right"} [align="left"] - Text alignment of the column.
 * @property {string} [width] - Optional fixed width (e.g. "120px").
 */

/**
 * @typedef {Object} TableOptions
 * @property {TableColumn[]} columns - Column definitions.
 * @property {Object[]} rows - Row data objects.
 * @property {string} [emptyMessage="No records found."] - Message shown when rows is empty.
 * @property {string} [rowKey="id"] - Property used as the unique row key (for future diffing/selection).
 * @property {(row: Object) => void} [onRowClick] - Optional row click handler.
 * @property {Array<{ icon: string, label: string, onClick: (row: Object) => void }>} [rowActions] - Per-row action icon buttons shown in a trailing actions column.
 */

/**
 * Creates a fully-styled, sortable Table element.
 *
 * @param {TableOptions} options - Configuration options for the table.
 * @returns {HTMLDivElement} A wrapper element containing the table (for horizontal scroll on small screens).
 *
 * @example
 * const guestTable = createTable({
 *   columns: [
 *     { key: "name", label: "Name", sortable: true },
 *     { key: "city", label: "City" },
 *     { key: "attendanceStatus", label: "Status", type: "badge" },
 *   ],
 *   rows: guestList,
 *   emptyMessage: "No guests added yet.",
 *   rowActions: [
 *     { icon: "pencil", label: "Edit", onClick: (row) => editGuest(row) },
 *     { icon: "trash-2", label: "Delete", onClick: (row) => deleteGuest(row) },
 *   ],
 * });
 */
export function createTable(options = {}) {
  const {
    columns = [],
    rows = [],
    emptyMessage = "No records found.",
    rowKey = "id",
    onRowClick = null,
    rowActions = [],
  } = options;

  const wrapper = document.createElement("div");
  wrapper.classList.add("table-wrapper");

  const table = document.createElement("table");
  table.classList.add("table");

  // Internal sort state, scoped to this table instance.
  let sortState = { key: null, direction: "asc" };

  const renderTable = () => {
    table.innerHTML = "";
    table.appendChild(buildTableHead(columns, rowActions, sortState, (col) => {
      handleSortClick(col);
    }));

    const sortedRows = applySorting(rows, sortState);

    if (sortedRows.length === 0) {
      table.appendChild(buildEmptyRow(columns.length + (rowActions.length > 0 ? 1 : 0), emptyMessage));
    } else {
      const tbody = document.createElement("tbody");
      sortedRows.forEach((row) => {
        tbody.appendChild(buildTableRow({ row, columns, rowKey, onRowClick, rowActions }));
      });
      table.appendChild(tbody);
    }
  };

  const handleSortClick = (col) => {
    if (!col.sortable) return;

    if (sortState.key === col.key) {
      sortState.direction = sortState.direction === "asc" ? "desc" : "asc";
    } else {
      sortState = { key: col.key, direction: "asc" };
    }

    renderTable();
  };

  renderTable();
  wrapper.appendChild(table);

  return wrapper;
}

/**
 * Sorts rows by the current sort state. Returns a new array;
 * does not mutate the original rows.
 *
 * @param {Object[]} rows
 * @param {{ key: string|null, direction: "asc"|"desc" }} sortState
 * @returns {Object[]}
 */
function applySorting(rows, sortState) {
  if (!sortState.key) return rows;

  const sorted = [...rows].sort((a, b) => {
    const valA = a[sortState.key];
    const valB = b[sortState.key];

    if (valA == null) return 1;
    if (valB == null) return -1;

    if (typeof valA === "number" && typeof valB === "number") {
      return valA - valB;
    }

    return String(valA).localeCompare(String(valB));
  });

  return sortState.direction === "desc" ? sorted.reverse() : sorted;
}

/**
 * Builds the <thead> of the table, including sort indicators
 * and an actions column header if row actions are configured.
 *
 * @param {TableColumn[]} columns
 * @param {Array} rowActions
 * @param {{ key: string|null, direction: "asc"|"desc" }} sortState
 * @param {(col: TableColumn) => void} onHeaderClick
 * @returns {HTMLTableSectionElement}
 */
function buildTableHead(columns, rowActions, sortState, onHeaderClick) {
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");

  columns.forEach((col) => {
    const th = document.createElement("th");
    th.classList.add("table__header-cell", `table__header-cell--${col.align || "left"}`);
    if (col.width) th.style.width = col.width;

    const labelWrap = document.createElement("span");
    labelWrap.classList.add("table__header-label");
    labelWrap.textContent = col.label;
    th.appendChild(labelWrap);

    if (col.sortable) {
      th.classList.add("table__header-cell--sortable");

      const sortIcon = document.createElement("i");
      sortIcon.classList.add("table__sort-icon");
      const isActive = sortState.key === col.key;
      sortIcon.setAttribute(
        "data-lucide",
        isActive ? (sortState.direction === "asc" ? "arrow-up" : "arrow-down") : "arrow-up-down"
      );
      if (isActive) th.classList.add("table__header-cell--sorted");
      th.appendChild(sortIcon);

      th.addEventListener("click", () => onHeaderClick(col));
    }

    headRow.appendChild(th);
  });

  if (rowActions.length > 0) {
    const actionsHeader = document.createElement("th");
    actionsHeader.classList.add("table__header-cell", "table__header-cell--right");
    actionsHeader.textContent = "Actions";
    headRow.appendChild(actionsHeader);
  }

  thead.appendChild(headRow);
  return thead;
}

/**
 * Builds a single <tr> for a row, rendering each column's cell
 * according to its type, plus a trailing actions cell if configured.
 *
 * @param {Object} params
 * @param {Object} params.row
 * @param {TableColumn[]} params.columns
 * @param {string} params.rowKey
 * @param {(row: Object) => void} params.onRowClick
 * @param {Array} params.rowActions
 * @returns {HTMLTableRowElement}
 */
function buildTableRow({ row, columns, rowKey, onRowClick, rowActions }) {
  const tr = document.createElement("tr");
  tr.classList.add("table__row");

  if (row[rowKey] != null) {
    tr.setAttribute("data-row-key", row[rowKey]);
  }

  if (typeof onRowClick === "function") {
    tr.classList.add("table__row--clickable");
    tr.addEventListener("click", () => onRowClick(row));
  }

  columns.forEach((col) => {
    tr.appendChild(buildTableCell(row, col));
  });

  if (rowActions.length > 0) {
    tr.appendChild(buildActionsCell(row, rowActions));
  }

  return tr;
}

/**
 * Builds a single <td> cell, rendering text, a status badge,
 * or custom content depending on the column's `type`.
 *
 * @param {Object} row
 * @param {TableColumn} col
 * @returns {HTMLTableCellElement}
 */
function buildTableCell(row, col) {
  const td = document.createElement("td");
  td.classList.add("table__cell", `table__cell--${col.align || "left"}`);

  const value = row[col.key];

  if (col.type === "badge") {
    const statusValue = row[col.statusKey || col.key];
    td.appendChild(createBadge({ status: statusValue }));
  } else if (col.type === "custom" && typeof col.render === "function") {
    const rendered = col.render(row);
    if (rendered instanceof Node) {
      td.appendChild(rendered);
    } else {
      td.textContent = rendered ?? "";
    }
  } else {
    td.textContent = value ?? "—";
  }

  return td;
}

/**
 * Builds the trailing actions cell containing one icon button
 * per configured row action (e.g. Edit, Delete).
 *
 * @param {Object} row
 * @param {Array<{ icon: string, label: string, onClick: (row: Object) => void }>} rowActions
 * @returns {HTMLTableCellElement}
 */
function buildActionsCell(row, rowActions) {
  const td = document.createElement("td");
  td.classList.add("table__cell", "table__cell--right", "table__cell--actions");

  rowActions.forEach((action) => {
    const btn = document.createElement("button");
    btn.classList.add("table__action-btn");
    btn.setAttribute("aria-label", action.label);
    btn.innerHTML = `<i data-lucide="${action.icon}"></i>`;
    btn.addEventListener("click", (event) => {
      event.stopPropagation();
      action.onClick(row);
    });
    td.appendChild(btn);
  });

  return td;
}

/**
 * Builds the empty-state row shown when there are no rows to display.
 *
 * @param {number} colSpan - Total number of columns to span across.
 * @param {string} message
 * @returns {HTMLTableSectionElement}
 */
function buildEmptyRow(colSpan, message) {
  const tbody = document.createElement("tbody");
  const tr = document.createElement("tr");
  const td = document.createElement("td");

  td.colSpan = colSpan;
  td.classList.add("table__empty-cell");
  td.textContent = message;

  tr.appendChild(td);
  tbody.appendChild(tr);
  return tbody;
}