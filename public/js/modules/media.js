import PhotoSwipeLightbox from "../../vendor/photoswipe/photoswipe-lightbox.esm.js";

export function setupAvatarParallax() {
  const wraps = document.querySelectorAll(".avatar-wrap");
  wraps.forEach((wrap) => {
    const img = wrap.querySelector(".avatar");
    if (!(img instanceof HTMLElement) || wrap.dataset.parallaxBound) return;
    wrap.dataset.parallaxBound = "1";

    wrap.addEventListener("mousemove", (e) => {
      if (window.matchMedia("(max-width: 1024px)").matches) return;
      const rect = wrap.getBoundingClientRect();
      const dx = (e.clientX - rect.left) / rect.width - 0.5;
      const dy = (e.clientY - rect.top) / rect.height - 0.5;
      const x = dx * 10;
      const y = dy * 10;
      img.style.transform = `scale(1.07) translate(${x}px, ${y}px)`;
    });

    wrap.addEventListener("mouseleave", () => {
      img.style.transform = "scale(1) translate(0, 0)";
    });
  });
}

export function setupCoverParallax() {
  const wraps = document.querySelectorAll(".post-cover-wrap");
  wraps.forEach((wrap) => {
    const img = wrap.querySelector(".post-cover");
    if (!(img instanceof HTMLElement) || wrap.dataset.parallaxBound) return;
    wrap.dataset.parallaxBound = "1";

    wrap.addEventListener("mousemove", (e) => {
      if (window.matchMedia("(max-width: 1024px)").matches) return;
      const rect = wrap.getBoundingClientRect();
      const dx = (e.clientX - rect.left) / rect.width - 0.5;
      const dy = (e.clientY - rect.top) / rect.height - 0.5;
      const x = dx * 8;
      const y = dy * 8;
      img.style.transform = `scale(1.05) translate(${x}px, ${y}px)`;
    });

    wrap.addEventListener("mouseleave", () => {
      img.style.transform = "scale(1) translate(0, 0)";
    });
  });
}

export function initOverlayScrollbars() {
  if (document.documentElement.dataset.osInit) return;
  const api = window.OverlayScrollbarsGlobal;
  const OverlayScrollbars = api && api.OverlayScrollbars;
  if (!OverlayScrollbars) return;

  OverlayScrollbars(
    { target: document.body, cancel: { nativeScrollbarsOverlaid: true } },
    {
      scrollbars: {
        autoHide: "move",
        autoHideDelay: 500,
        autoHideSuspend: false,
      },
    }
  );
  document.documentElement.dataset.osInit = "1";
}

let lightbox;
export function initPhotoSwipe() {
  if (lightbox) lightbox.destroy();

  lightbox = new PhotoSwipeLightbox({
    gallery: ".custom-md, #post-cover",
    children: "img",
    pswpModule: () => import("../../vendor/photoswipe/photoswipe.esm.js"),
    wheelToZoom: true,
    imageClickAction: "close",
    tapAction: "close",
    arrowPrev: false,
    arrowNext: false,
    padding: { top: 20, bottom: 20, left: 20, right: 20 },
  });

  lightbox.addFilter("domItemData", (itemData, element) => {
    if (element instanceof HTMLImageElement) {
      itemData.src = element.src;
      itemData.w = element.naturalWidth || window.innerWidth;
      itemData.h = element.naturalHeight || window.innerHeight;
      itemData.msrc = element.src;
    }
    return itemData;
  });

  lightbox.init();
}
