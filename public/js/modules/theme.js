import { byId, closeOnOutside, closeFloatPanelsExcept } from "./ui.js";

const THEME_KEY = "zulari-theme";
const DESKTOP_THEME_PANEL_MIN_WIDTH = 1024;

function setSchemeIcon(theme) {
  const icon = byId("scheme-icon");
  if (!icon) return;
  if (theme === "light") icon.textContent = "wb_sunny";
  else if (theme === "dark") icon.textContent = "dark_mode";
  else icon.textContent = "radio_button_partial";
}

export function getStoredTheme(cfg) {
  return localStorage.getItem(THEME_KEY) || cfg.appearance.mode || "auto";
}

export function applyTheme(theme) {
  const html = document.documentElement;
  if (theme === "dark") {
    html.classList.add("dark");
    html.style.colorScheme = "dark";
    setSchemeIcon("dark");
    return;
  }
  if (theme === "light") {
    html.classList.remove("dark");
    html.style.colorScheme = "light";
    setSchemeIcon("light");
    return;
  }
  const useDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  html.classList.toggle("dark", useDark);
  html.style.colorScheme = useDark ? "dark" : "light";
  setSchemeIcon("auto");
}

function syncThemeButtons(theme) {
  document.querySelectorAll(".mode-btn").forEach((btn) => {
    btn.classList.toggle("current-theme-btn", btn.getAttribute("data-theme-value") === theme);
  });
}

function saveAndApplyTheme(theme) {
  localStorage.setItem(THEME_KEY, theme);
  applyTheme(theme);
  syncThemeButtons(theme);
}

export function setupThemeButtons(cfg) {
  const switchBtn = byId("scheme-switch");
  const panel = byId("light-dark-panel");
  const seq = ["light", "dark", "auto"];

  if (switchBtn && !switchBtn.dataset.bound) {
    switchBtn.dataset.bound = "1";
    switchBtn.addEventListener("click", (event) => {
      const touchLike = window.matchMedia("(hover: none)").matches || window.innerWidth < DESKTOP_THEME_PANEL_MIN_WIDTH;
      if (touchLike && panel) {
        event.stopPropagation();
        const opening = panel.classList.contains("float-panel-closed");
        if (opening) {
          closeFloatPanelsExcept(["light-dark-panel"]);
          panel.classList.remove("float-panel-closed");
        } else {
          panel.classList.add("float-panel-closed");
        }
        return;
      }
      const current = getStoredTheme(cfg);
      const idx = Math.max(0, seq.indexOf(current));
      saveAndApplyTheme(seq[(idx + 1) % seq.length]);
    });

    switchBtn.addEventListener("mouseenter", () => {
      const touchLike = window.matchMedia("(hover: none)").matches || window.innerWidth < DESKTOP_THEME_PANEL_MIN_WIDTH;
      if (!touchLike && panel) {
        closeFloatPanelsExcept(["light-dark-panel"]);
        panel.classList.remove("float-panel-closed");
      }
    });
  }

  if (panel && !panel.dataset.bound) {
    panel.dataset.bound = "1";
    panel.addEventListener("mouseleave", () => panel.classList.add("float-panel-closed"));
  }

  document.querySelectorAll("[data-theme-value]").forEach((btn) => {
    if (btn.dataset.bound) return;
    btn.dataset.bound = "1";
    btn.addEventListener("click", (e) => {
      const theme = e.currentTarget.getAttribute("data-theme-value") || "auto";
      saveAndApplyTheme(theme);
      if (panel) panel.classList.add("float-panel-closed");
    });
  });

  syncThemeButtons(getStoredTheme(cfg));

  if (!document.documentElement.dataset.themeMediaBound) {
    document.documentElement.dataset.themeMediaBound = "1";
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", () => {
      if (getStoredTheme(cfg) === "auto") applyTheme("auto");
    });
  }

  closeOnOutside("light-dark-panel", ["light-dark-panel", "scheme-switch"]);
}
