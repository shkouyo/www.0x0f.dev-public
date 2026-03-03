function isWrapped(table) {
  const parent = table.parentElement;
  return parent instanceof HTMLElement && parent.classList.contains("md-table-scroll");
}

function wrapTable(table) {
  if (!(table instanceof HTMLTableElement) || isWrapped(table)) return;
  const parent = table.parentNode;
  if (!parent) return;

  const wrapper = document.createElement("div");
  wrapper.className = "md-table-scroll";
  wrapper.tabIndex = 0;
  wrapper.setAttribute("aria-label", "表格横向滚动区域");

  parent.insertBefore(wrapper, table);
  wrapper.appendChild(table);
}

export function setupMarkdownTables(root = document) {
  const scope = root instanceof Element || root instanceof Document ? root : document;
  const tables = scope.querySelectorAll(".markdown-body table");
  for (const table of tables) {
    wrapTable(table);
  }
}
