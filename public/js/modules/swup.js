function pathsEqual(a, b) {
  const x = (a || "").replace(/^\/|\/$/g, "").toLowerCase();
  const y = (b || "").replace(/^\/|\/$/g, "").toLowerCase();
  return x === y;
}

export function initSwup(cfg, onPageView) {
  const SwupCtor = window.Swup;
  if (!SwupCtor) return;

  const swup = new SwupCtor({
    containers: ["#swup-container", "#toc"],
    animationSelector: '[class*="transition-swup-"]',
    animateHistoryBrowsing: true,
    cache: true,
    ignoreVisit: (_url, { el } = {}) => {
      if (!(el instanceof Element)) return false;
      if (el.closest("[data-no-swup]")) return true;
      if (el.closest("[data-external]")) return true;

      if (el.closest('[target="_blank"]')) return true;
      if (el.closest('[rel~="external"]')) return true;
      return false;
    },
  });

  swup.hooks.on("visit:start", ({ to }) => {
    const onHome = pathsEqual(new URL(to.url, window.location.origin).pathname, cfg.homePath || "/");
    document.body.classList.toggle("is-home", onHome);
    document.documentElement.style.setProperty("--content-delay", "0ms");
    const tocWrapper = document.getElementById("toc-wrapper");
    if (tocWrapper) tocWrapper.classList.add("toc-not-ready");
  });

  swup.hooks.on("page:view", () => {
    onPageView();
  });

  swup.hooks.on("visit:end", () => {
    window.setTimeout(() => {
      const tocWrapper = document.getElementById("toc-wrapper");
      if (tocWrapper) tocWrapper.classList.remove("toc-not-ready");
    }, 200);
  });
}
