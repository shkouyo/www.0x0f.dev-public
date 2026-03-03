import { cfg } from "./modules/config.js";
import { setupBackToTop, setupNavMenuPanel, setupSidebarWidgets, setupPostCardNavigation, setupAnchorScroll } from "./modules/ui.js";
import { applyTheme, getStoredTheme, setupThemeButtons } from "./modules/theme.js";
import { setupSearch } from "./modules/search.js";
import { setupAvatarParallax, setupCoverParallax, initOverlayScrollbars, initPhotoSwipe } from "./modules/media.js";
import { initSwup } from "./modules/swup.js";
import { setupMarkdownTables } from "./modules/markdown-table.js";
import { setupCodeBlocks } from "./modules/codeblock.js";
import { setupToc } from "./modules/toc.js";

function onPageView() {
  setupAvatarParallax();
  setupCoverParallax();
  setupMarkdownTables(document);
  setupCodeBlocks(document);
  initPhotoSwipe();
  setupToc(cfg);
  setTimeout(() => {
    document.documentElement.style.setProperty("--content-delay", `${cfg.layout.contentDelayMs}ms`);
  }, 30);
}

function bootstrap() {
  if (window.matchMedia("(hover: none)").matches || window.matchMedia("(pointer: coarse)").matches) {
    document.documentElement.classList.add("touch-device");
  } else {
    document.documentElement.classList.remove("touch-device");
  }

  applyTheme(getStoredTheme(cfg));
  requestAnimationFrame(() => {
    document.documentElement.classList.remove("theme-preload");
  });

  document.documentElement.style.setProperty("--content-delay", `${cfg.layout.contentDelayMs}ms`);
  document.documentElement.style.setProperty("--motion-factor", "1");

  setupThemeButtons(cfg);
  setupNavMenuPanel();
  setupSidebarWidgets(cfg);
  setupPostCardNavigation();
  setupSearch(cfg);
  setupBackToTop(cfg);
  setupAvatarParallax();
  setupCoverParallax();
  setupMarkdownTables(document);
  setupCodeBlocks(document);
  setupAnchorScroll(cfg);
  setupToc(cfg);
  initOverlayScrollbars();
  initPhotoSwipe();
  initSwup(cfg, onPageView);
}

bootstrap();
