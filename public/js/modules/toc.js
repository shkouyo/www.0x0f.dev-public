let state = null;

function decodeHash(hash) {
  if (!hash || hash.length < 2 || hash[0] !== "#") return "";
  try {
    return decodeURIComponent(hash.slice(1));
  } catch (_err) {
    return hash.slice(1);
  }
}

function isInRange(value, min, max) {
  return min < value && value < max;
}

function clearState() {
  if (!state) return;
  if (state.observer) state.observer.disconnect();
  if (state.inner && state.handleAnchorClick) {
    state.inner.removeEventListener("click", state.handleAnchorClick, true);
  }
  state = null;
}

function toggleActiveHeading() {
  if (!state) return;
  const { active, entries, indicator, inner } = state;
  if (!entries.length) return;

  let i = active.length - 1;
  let min = active.length - 1;
  let max = -1;

  while (i >= 0 && !active[i]) {
    entries[i].classList.remove("visible");
    i -= 1;
  }

  while (i >= 0 && active[i]) {
    entries[i].classList.add("visible");
    min = Math.min(min, i);
    max = Math.max(max, i);
    i -= 1;
  }

  while (i >= 0) {
    entries[i].classList.remove("visible");
    i -= 1;
  }

  if (!indicator || !inner || min > max) {
    if (indicator) indicator.style.opacity = "0";
    return;
  }

  const parentOffset = inner.getBoundingClientRect().top;
  const scrollOffset = inner.scrollTop;
  const first = entries[min];
  const last = entries[max];
  const top = first.getBoundingClientRect().top - parentOffset + scrollOffset;
  const bottom = last.getBoundingClientRect().bottom - parentOffset + scrollOffset;
  indicator.style.opacity = "1";
  indicator.style.top = `${top}px`;
  indicator.style.height = `${Math.max(0, bottom - top)}px`;
}

function scrollToActiveHeading() {
  if (!state || state.anchorNavTarget || !state.inner) return;
  const { inner } = state;
  const visibleEntries = Array.from(document.querySelectorAll("#toc .visible"));
  if (!visibleEntries.length) return;

  const topmost = visibleEntries[0];
  const bottommost = visibleEntries[visibleEntries.length - 1];
  const tocHeight = inner.clientHeight;
  let top = topmost.offsetTop - 32;

  if (bottommost.getBoundingClientRect().bottom - topmost.getBoundingClientRect().top >= 0.9 * tocHeight) {
    top = bottommost.offsetTop - tocHeight * 0.8;
  }

  inner.scrollTo({
    top: Math.max(0, top),
    left: 0,
    behavior: "smooth",
  });
}

function fallback() {
  if (!state || !state.sections.length) return;
  const { sections, active } = state;
  for (let i = 0; i < sections.length; i += 1) {
    const section = sections[i];
    if (!(section instanceof HTMLElement)) continue;
    const offsetTop = section.getBoundingClientRect().top;
    const offsetBottom = section.getBoundingClientRect().bottom;
    if (
      isInRange(offsetTop, 0, window.innerHeight)
      || isInRange(offsetBottom, 0, window.innerHeight)
      || (offsetTop < 0 && offsetBottom > window.innerHeight)
    ) {
      active[i] = true;
    } else if (offsetTop > window.innerHeight) {
      break;
    }
  }
}

function update() {
  requestAnimationFrame(() => {
    toggleActiveHeading();
    scrollToActiveHeading();
  });
}

function markVisibleSection(observerEntries) {
  if (!state) return;
  observerEntries.forEach((entry) => {
    const idx = state.sectionIdxMap.get(entry.target);
    if (idx !== undefined) state.active[idx] = entry.isIntersecting;
    if (entry.isIntersecting && state.anchorNavTarget === state.headings[idx]) {
      state.anchorNavTarget = null;
    }
  });

  if (!state.active.includes(true)) fallback();
  update();
}

function initToc(cfg, wrapper, inner, toc) {
  const entries = Array.from(toc.querySelectorAll("a.toc-entry[href^='#']"));
  if (!entries.length) {
    wrapper.classList.add("toc-hide");
    return;
  }

  const headings = [];
  const sections = [];
  const sectionIdxMap = new Map();

  entries.forEach((entry) => {
    const id = decodeHash(entry.hash);
    const heading = id ? document.getElementById(id) : null;
    if (!(heading instanceof HTMLElement)) return;
    const section = heading.parentElement instanceof HTMLElement ? heading.parentElement : heading;
    sectionIdxMap.set(section, headings.length);
    headings.push(heading);
    sections.push(section);
  });

  if (!headings.length) {
    wrapper.classList.add("toc-hide");
    return;
  }

  const indicator = toc.querySelector("#active-indicator");
  const active = new Array(headings.length).fill(false);

  const handleAnchorClick = (event) => {
    const anchor = event.composedPath().find((el) => el instanceof HTMLAnchorElement);
    if (!(anchor instanceof HTMLAnchorElement)) return;
    if (!anchor.matches("a.toc-entry[href^='#']")) return;
    const id = decodeHash(anchor.hash);
    const heading = id ? document.getElementById(id) : null;
    if (!(heading instanceof HTMLElement)) return;

    event.preventDefault();
    state.anchorNavTarget = heading;
    const offset = cfg && cfg.layout ? Number(cfg.layout.anchorOffsetPx) || 90 : 90;
    const y = heading.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: y, behavior: "smooth" });
    history.replaceState(null, "", `#${id}`);
  };

  const observer = new IntersectionObserver(markVisibleSection, { threshold: 0 });
  sections.forEach((section) => observer.observe(section));

  state = {
    observer,
    wrapper,
    inner,
    toc,
    entries,
    headings,
    sections,
    sectionIdxMap,
    active,
    indicator: indicator instanceof HTMLElement ? indicator : null,
    handleAnchorClick,
    anchorNavTarget: null,
  };

  inner.addEventListener("click", handleAnchorClick, { capture: true });
  fallback();
  update();
  wrapper.classList.remove("toc-hide");
  wrapper.classList.remove("toc-not-ready");
}

export function setupToc(cfg) {
  const wrapper = document.getElementById("toc-wrapper");
  const inner = document.getElementById("toc-inner-wrapper");
  const toc = document.getElementById("toc");
  if (!(wrapper instanceof HTMLElement) || !(inner instanceof HTMLElement) || !(toc instanceof HTMLElement)) return;

  clearState();

  const onloadNode = document.querySelector(".markdown-body.onload-animation");
  if (onloadNode instanceof HTMLElement) {
    let initialized = false;
    const run = () => {
      if (initialized) return;
      initialized = true;
      initToc(cfg, wrapper, inner, toc);
    };
    onloadNode.addEventListener("animationend", run, { once: true });
    window.setTimeout(run, 420);
    return;
  }

  initToc(cfg, wrapper, inner, toc);
}
