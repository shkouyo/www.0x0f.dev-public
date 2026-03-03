const boundOutside = new Set();
const SIDEBAR_DESKTOP_MIN_WIDTH = 1024;

export function byId(id) {
  return document.getElementById(id);
}

export function closeOnOutside(panelId, ignoredIds) {
  if (boundOutside.has(panelId)) return;
  boundOutside.add(panelId);

  document.addEventListener("click", (event) => {
    const panel = byId(panelId);
    if (!panel) return;
    const target = event.target;
    if (!(target instanceof Node)) return;

    for (const id of ignoredIds) {
      const el = byId(id);
      if (el && (el === target || el.contains(target))) return;
    }
    panel.classList.add("float-panel-closed");
  });
}

export function closeFloatPanelsExcept(exceptIds = []) {
  const except = new Set(exceptIds.filter(Boolean));
  document.querySelectorAll(".float-panel").forEach((panel) => {
    if (!(panel instanceof HTMLElement)) return;
    if (panel.id && except.has(panel.id)) return;
    panel.classList.add("float-panel-closed");
  });
}

export function setupBackToTop(cfg) {
  const btn = byId("back-to-top-btn");
  if (!btn || btn.dataset.bound) return;
  btn.dataset.bound = "1";

  const onScroll = () => {
    const y = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop;
    if (y > cfg.layout.backToTopThresholdPx) btn.classList.remove("hide");
    else btn.classList.add("hide");
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  btn.addEventListener("click", () => window.scroll({ top: 0, behavior: "smooth" }));
  onScroll();
}

export function setupNavMenuPanel() {
  const panel = byId("nav-menu-panel");
  const links = document.querySelectorAll(".nav-links a");
  if (!panel || !links.length) return;

  panel.replaceChildren();
  Array.from(links).forEach((a) => {
    const href = a.getAttribute("href") || "#";
    const target = a.getAttribute("target");
    const rel = a.getAttribute("rel");
    const external = a.hasAttribute("data-external");
    const labelNode = a.querySelector(".nav-link-label");
    const label = (labelNode?.textContent || a.textContent || "").trim();

    const item = document.createElement("a");
    item.className = `btn-plain scale-animation nav-menu-link${external ? " is-external" : ""}`;
    item.setAttribute("href", href);
    if (target) item.setAttribute("target", target);
    if (rel) item.setAttribute("rel", rel);
    if (external) item.setAttribute("data-external", "");

    const text = document.createElement("span");
    text.className = "nav-menu-link-label";
    text.textContent = label;
    item.appendChild(text);

    const indicator = document.createElement("span");
    indicator.className = "material-symbols-rounded nav-menu-link-arrow";
    indicator.textContent = external ? "arrow_outward" : "chevron_right";
    item.appendChild(indicator);

    panel.appendChild(item);
  });

  const switchBtn = byId("nav-menu-switch");
  if (switchBtn && !switchBtn.dataset.bound) {
    switchBtn.dataset.bound = "1";
    switchBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const opening = panel.classList.contains("float-panel-closed");
      if (opening) {
        closeFloatPanelsExcept(["nav-menu-panel"]);
        panel.classList.remove("float-panel-closed");
      } else {
        panel.classList.add("float-panel-closed");
      }
    });
  }

  closeOnOutside("nav-menu-panel", ["nav-menu-panel", "nav-menu-switch"]);
}

function syncSidebarWidgetToggle(widget, collapsed) {
  const toggle = widget.querySelector("[data-widget-toggle]");
  if (!(toggle instanceof HTMLButtonElement)) return;

  const label = toggle.querySelector("[data-widget-toggle-label]");
  const icon = toggle.querySelector("[data-widget-toggle-icon]");
  const moreLabel = toggle.dataset.labelMore || "更多";
  const lessLabel = toggle.dataset.labelLess || "收起";

  toggle.setAttribute("aria-expanded", collapsed ? "false" : "true");
  if (label) label.textContent = collapsed ? moreLabel : lessLabel;
  if (icon) icon.textContent = collapsed ? "more_horiz" : "expand_less";
}

function updateSidebarWidgetExpandedHeight(widget) {
  const body = widget.querySelector("[data-widget-body]");
  if (!(body instanceof HTMLElement)) return;
  widget.style.setProperty("--sidebar-widget-expanded-height", `${body.scrollHeight}px`);
}

export function setupSidebarWidgets(cfg) {
  const widgets = Array.from(document.querySelectorAll("[data-sidebar-widget]"));
  if (!widgets.length) return;

  const collapseCfg = (cfg && cfg.sidebar && cfg.sidebar.collapse) || {};
  const collapsedHeight = collapseCfg.collapsedHeight || "7.5rem";
  document.documentElement.style.setProperty("--sidebar-widget-collapsed-height", collapsedHeight);

  const desktopQuery = window.matchMedia(`(min-width: ${SIDEBAR_DESKTOP_MIN_WIDTH}px)`);
  let wasDesktop = desktopQuery.matches;

  widgets.forEach((widget) => {
    const toggle = widget.querySelector("[data-widget-toggle]");
    if (!(toggle instanceof HTMLButtonElement) || toggle.dataset.bound) return;
    toggle.dataset.bound = "1";
    toggle.addEventListener("click", (event) => {
      event.preventDefault();
      if (!desktopQuery.matches) return;
      if (!widget.classList.contains("is-collapsible")) return;
      updateSidebarWidgetExpandedHeight(widget);
      const collapsed = !widget.classList.contains("is-collapsed");
      widget.classList.toggle("is-collapsed", collapsed);
      widget.dataset.userState = collapsed ? "collapsed" : "expanded";
      syncSidebarWidgetToggle(widget, collapsed);
    });
  });

  const applyState = (forceReset = false) => {
    const desktop = desktopQuery.matches;

    widgets.forEach((widget) => {
      const count = Number(widget.getAttribute("data-widget-count")) || 0;
      const limit = Number(widget.getAttribute("data-widget-limit")) || 0;
      const attrCollapsible = widget.getAttribute("data-widget-collapsible");
      const toggle = widget.querySelector("[data-widget-toggle]");
      const wrap = widget.querySelector("[data-widget-toggle-wrap]");
      updateSidebarWidgetExpandedHeight(widget);
      const meetsThreshold = limit > 0 && count >= limit;
      const enabledByAttr = attrCollapsible !== "false";
      const canCollapseOnDesktop = enabledByAttr && meetsThreshold;

      if (!desktop) {
        widget.classList.remove("is-collapsible", "is-collapsed");
        widget.dataset.userState = "expanded";
        if (toggle instanceof HTMLButtonElement) {
          toggle.hidden = true;
          toggle.setAttribute("aria-hidden", "true");
        }
        if (wrap instanceof HTMLElement) wrap.hidden = true;
        syncSidebarWidgetToggle(widget, false);
        return;
      }

      if (!canCollapseOnDesktop) {
        widget.classList.remove("is-collapsible", "is-collapsed");
        widget.dataset.userState = "expanded";
        if (toggle instanceof HTMLButtonElement) {
          toggle.hidden = true;
          toggle.setAttribute("aria-hidden", "true");
        }
        if (wrap instanceof HTMLElement) wrap.hidden = true;
        syncSidebarWidgetToggle(widget, false);
        return;
      }

      widget.classList.add("is-collapsible");
      if (forceReset || !widget.dataset.userState) widget.dataset.userState = "collapsed";
      const collapsed = widget.dataset.userState !== "expanded";
      widget.classList.toggle("is-collapsed", collapsed);
      if (toggle instanceof HTMLButtonElement) {
        toggle.hidden = false;
        toggle.removeAttribute("aria-hidden");
      }
      if (wrap instanceof HTMLElement) wrap.hidden = false;
      syncSidebarWidgetToggle(widget, collapsed);
    });
  };

  const onViewportChange = () => {
    const isDesktop = desktopQuery.matches;
    const switched = isDesktop !== wasDesktop;
    applyState(switched);
    wasDesktop = isDesktop;
  };

  applyState(false);

  let resizeRaf = 0;
  const onResize = () => {
    if (resizeRaf) cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => {
      resizeRaf = 0;
      widgets.forEach((widget) => updateSidebarWidgetExpandedHeight(widget));
    });
  };

  if (!document.documentElement.dataset.sidebarWidgetViewportBound) {
    document.documentElement.dataset.sidebarWidgetViewportBound = "1";
    if (typeof desktopQuery.addEventListener === "function") desktopQuery.addEventListener("change", onViewportChange);
    else if (typeof desktopQuery.addListener === "function") desktopQuery.addListener(onViewportChange);
    window.addEventListener("resize", onResize, { passive: true });
  }
}

export function setupPostCardNavigation() {
  if (document.documentElement.dataset.postCardNavBound) return;
  document.documentElement.dataset.postCardNavBound = "1";

  const interactiveSelector = "a, button, input, textarea, select, label, [role='button']";

  document.addEventListener("click", (event) => {
    if (window.innerWidth >= SIDEBAR_DESKTOP_MIN_WIDTH) return;
    if (event.defaultPrevented) return;

    const target = event.target;
    if (!(target instanceof Element)) return;

    const card = target.closest(".post-card[data-post-url]");
    if (!(card instanceof HTMLElement)) return;

    if (target.closest(interactiveSelector)) return;

    const selection = window.getSelection();
    if (selection && String(selection).trim()) return;

    const titleLink = card.querySelector(".post-title-link");
    if (titleLink instanceof HTMLAnchorElement) {
      titleLink.click();
      return;
    }

    const url = card.getAttribute("data-post-url");
    if (url) window.location.assign(url);
  });
}

export function setupAnchorScroll(cfg) {
  if (document.documentElement.dataset.anchorBound) return;
  document.documentElement.dataset.anchorBound = "1";

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const link = target.closest(".zola-anchor");
    if (!(link instanceof HTMLAnchorElement)) return;
    const hash = link.getAttribute("href");
    if (!hash || !hash.startsWith("#")) return;

    const heading = document.querySelector(hash);
    if (!(heading instanceof HTMLElement)) return;
    event.preventDefault();

    const y = heading.getBoundingClientRect().top + window.scrollY - cfg.layout.anchorOffsetPx;
    window.scrollTo({ top: y, behavior: "smooth" });
    history.replaceState(null, "", hash);
  });
}
