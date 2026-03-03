import { byId, closeOnOutside, closeFloatPanelsExcept } from "./ui.js";

const SEARCH_TEXT = {
  noResults: "没有匹配结果",
  hint: "输入关键词开始搜索",
  loading: "正在加载搜索索引...",
  error: "搜索索引加载失败，请稍后重试",
};

function normalizeIndex(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((it) => ({
    title: String(it.title || "(Untitled)"),
    url: String(it.permalink || it.url || "#"),
    description: String(it.description || ""),
    body: String(it.body || it.content || ""),
  }));
}

function normalizeElasticlunrIndex(raw) {
  if (!raw || typeof raw !== "object") return [];
  const store = raw.documentStore;
  if (!store || typeof store !== "object" || !store.docs || typeof store.docs !== "object") return [];

  return Object.entries(store.docs).map(([id, doc]) => {
    const item = doc && typeof doc === "object" ? doc : {};
    return {
      title: String(item.title || "(Untitled)"),
      url: String(item.permalink || item.url || item.id || id || "#"),
      description: String(item.description || item.summary || ""),
      body: String(item.body || item.content || ""),
    };
  });
}

function normalizeLoadedIndex(raw) {
  const fromArray = normalizeIndex(raw);
  if (fromArray.length) return fromArray;
  return normalizeElasticlunrIndex(raw);
}

function buildIndexUrls(cfg) {
  const base = (cfg.homePath || "/").replace(/\/$/, "");
  const baseName = String(cfg.search.baseName || "search_index")
    .trim()
    .replace(/\.(js|json)$/i, "") || "search_index";
  const language = String(cfg.search.language || "").trim().toLowerCase();
  const shortLanguage = language.includes("-") ? language.split("-")[0] : "";
  const format = String(cfg.search.format || "elasticlunr_javascript").toLowerCase();
  const preferredExt = format.endsWith("_json") ? "json" : "js";
  const fallbackExt = preferredExt === "json" ? "js" : "json";

  const baseNames = [baseName];
  if (language) baseNames.push(`${baseName}.${language}`);
  if (shortLanguage && shortLanguage !== language) baseNames.push(`${baseName}.${shortLanguage}`);

  const fileNames = [];
  for (const name of baseNames) {
    fileNames.push(`${name}.${preferredExt}`);
  }
  for (const name of baseNames) {
    fileNames.push(`${name}.${fallbackExt}`);
  }

  const roots = base && base !== "/" ? [base, ""] : [""];
  const urls = [];

  for (const root of roots) {
    for (const fileName of fileNames) {
      const candidate = `${root}/${fileName}`.replace(/\/{2,}/g, "/");
      urls.push(candidate.startsWith("/") ? candidate : `/${candidate}`);
    }
  }

  return [...new Set(urls)];
}

function loadScript(url) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = url;
    script.async = true;
    script.onload = () => {
      script.remove();
      resolve();
    };
    script.onerror = () => {
      script.remove();
      reject(new Error(`script-load-failed:${url}`));
    };
    document.head.appendChild(script);
  });
}

async function loadSearchIndex(cfg) {
  if (Array.isArray(window.__zulari_search_index_cache__)) {
    return window.__zulari_search_index_cache__;
  }
  if (window.__zulari_search_index_cache_promise__) {
    return window.__zulari_search_index_cache_promise__;
  }

  const promise = (async () => {
    const urls = buildIndexUrls(cfg);

    for (const url of urls) {
      try {
        let rawIndex = null;
        if (url.endsWith(".json")) {
          const response = await fetch(url, { credentials: "same-origin" });
          if (!response.ok) throw new Error(`index-fetch-failed:${url}`);
          rawIndex = await response.json();
        } else {
          window.searchIndex = null;
          await loadScript(url);
          rawIndex = window.searchIndex;
        }

        const items = normalizeLoadedIndex(rawIndex);
        if (items.length) return items;
      } catch (_) {
        // continue
      }
    }
    throw new Error("search-index-load-failed");
  })();

  window.__zulari_search_index_cache_promise__ = promise;
  try {
    const items = await promise;
    window.__zulari_search_index_cache__ = items;
    return items;
  } finally {
    window.__zulari_search_index_cache_promise__ = null;
  }
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeSearchText(text) {
  const raw = String(text || "");
  return raw
    .replaceAll("🔗", " ")
    .replace(/\p{Extended_Pictographic}/gu, " ")
    .replace(/\s{2,}/g, " ");
}

function tokenizeQuery(value, cfg) {
  const tokens = normalizeSearchText(value)
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);

  const deduped = [...new Set(tokens)];
  return deduped.slice(0, cfg.search.maxTokens);
}

function highlightText(text, tokens, enabled) {
  const safe = escapeHtml(normalizeSearchText(text));
  if (!enabled || !tokens.length) return safe;

  const sortedTokens = [...tokens].sort((a, b) => b.length - a.length);
  let highlighted = safe;

  for (const token of sortedTokens) {
    const tokenSafe = escapeRegExp(escapeHtml(token));
    if (!tokenSafe) continue;
    const re = new RegExp(`(${tokenSafe})`, "gi");
    highlighted = highlighted.replace(re, "<mark>$1</mark>");
  }

  // Merge adjacent highlights so queries like "1" over "11" produce one continuous mark.
  highlighted = highlighted.replace(/<\/mark>\s*<mark>/gi, "");
  return highlighted;
}

function scoreItem(item, tokens, query) {
  const title = item.title.toLowerCase();
  const desc = item.description.toLowerCase();
  const body = item.body.toLowerCase();
  const q = query.toLowerCase();

  let score = 0;
  let titleHits = 0;
  let descHits = 0;
  let bodyHits = 0;

  if (q && title.includes(q)) score += 80;
  if (q && desc.includes(q)) score += 24;
  if (q && body.includes(q)) score += 12;

  for (const token of tokens) {
    const allowBody = token.length > 1;

    if (title.includes(token)) {
      titleHits += 1;
      score += 35;
      if (title.startsWith(token)) score += 10;
    }

    if (desc.includes(token)) {
      descHits += 1;
      score += 12;
      if (desc.startsWith(token)) score += 4;
    }

    if (allowBody && body.includes(token)) {
      bodyHits += 1;
      score += 6;
    }
  }

  if (tokens.length > 1) {
    const matchedTokenCount = tokens.filter((token) => title.includes(token) || desc.includes(token) || body.includes(token)).length;
    if (matchedTokenCount === tokens.length) score += 20;
  }

  if (score <= 0) return null;

  let hitSource = "body";
  if (titleHits > 0) hitSource = "title";
  else if (descHits > 0) hitSource = "description";

  return { score, hitSource };
}

function pickExcerpt(item, tokens, cfg) {
  const maxLen = cfg.search.excerptLength;
  const headContext = cfg.search.excerptContext;
  const sources = [normalizeSearchText(item.description), normalizeSearchText(item.body)];

  let chosen = "";
  let hitAt = -1;

  for (const source of sources) {
    const lower = source.toLowerCase();
    const firstHit = tokens.reduce((min, token) => {
      const idx = lower.indexOf(token);
      if (idx < 0) return min;
      if (min < 0) return idx;
      return Math.min(min, idx);
    }, -1);

    if (firstHit >= 0) {
      chosen = source;
      hitAt = firstHit;
      break;
    }
  }

  if (!chosen) chosen = sources[0] || sources[1] || "";
  if (!chosen) return "";

  if (hitAt < 0) return chosen.slice(0, maxLen);

  const start = Math.max(0, hitAt - headContext);
  const end = Math.min(chosen.length, start + maxLen);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < chosen.length ? "..." : "";
  return `${prefix}${chosen.slice(start, end)}${suffix}`;
}

function stateItem(label, cls) {
  return `<li class="search-state ${cls}">${escapeHtml(label)}</li>`;
}

export function setupSearch(cfg) {
  if (!cfg.search.enabled) return;

  const panel = byId("search-panel");
  const results = byId("search-results");
  const desktopInput = byId("search-input-desktop");
  const mobileInput = byId("search-input");
  const switchBtn = byId("search-switch");
  const desktopBar = byId("search-bar");

  if (!panel || !results) return;
  if (panel.dataset.bound) return;
  panel.dataset.bound = "1";

  let index = [];
  let indexStatus = "loading";
  let visibleItems = [];
  let activeIndex = -1;
  let currentQuery = "";

  const isPanelOpen = () => !panel.classList.contains("float-panel-closed");

  const setActive = (nextIndex, shouldScroll = true) => {
    activeIndex = nextIndex;
    const links = results.querySelectorAll(".search-result-item");

    links.forEach((link, idx) => {
      const active = idx === activeIndex;
      link.classList.toggle("is-active", active);
      link.setAttribute("aria-selected", active ? "true" : "false");
      if (active && shouldScroll) {
        link.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    });
  };

  const openPanel = (focusMobile = false) => {
    closeFloatPanelsExcept(["search-panel"]);
    panel.classList.remove("float-panel-closed");
    if (focusMobile && mobileInput && window.innerWidth < 1024) mobileInput.focus();
  };

  const closePanel = () => {
    panel.classList.add("float-panel-closed");
    activeIndex = -1;
  };

  const renderState = (kind) => {
    visibleItems = [];
    activeIndex = -1;
    if (kind === "hint") {
      results.innerHTML = stateItem(SEARCH_TEXT.hint, "search-hint");
    } else if (kind === "loading") {
      results.innerHTML = stateItem(SEARCH_TEXT.loading, "search-loading");
    } else if (kind === "error") {
      results.innerHTML = stateItem(SEARCH_TEXT.error, "search-error");
    } else if (kind === "empty") {
      results.innerHTML = stateItem(SEARCH_TEXT.noResults, "search-empty");
    } else {
      results.innerHTML = "";
    }
  };

  const renderResults = (items, tokens) => {
    visibleItems = items.slice(0, cfg.search.maxResults);
    activeIndex = -1;

    results.innerHTML = visibleItems
      .map((entry, idx) => {
        const excerpt = pickExcerpt(entry, tokens, cfg);
        const title = highlightText(entry.title, tokens, cfg.search.highlight);
        const excerptHtml = highlightText(excerpt, tokens, cfg.search.highlight);

        return `<li>
          <a href="${entry.url}" role="option" aria-selected="false" data-index="${idx}" class="search-result-item">
            <div class="search-result-title-wrap">
              <span class="search-result-title">${title}</span>
              <span class="material-symbols-rounded search-result-arrow">chevron_right</span>
            </div>
            <p class="search-result-excerpt">${excerptHtml}</p>
          </a>
        </li>`;
      })
      .join("");
  };

  const searchWithScore = (query, tokens) => {
    const scored = [];
    for (const item of index) {
      const meta = scoreItem(item, tokens, query);
      if (!meta) continue;
      scored.push({ ...item, ...meta });
    }
    scored.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
    return scored;
  };

  const runSearch = (value, openWhenEmpty = false) => {
    currentQuery = String(value || "").trim();
    const tokens = tokenizeQuery(currentQuery, cfg);

    if (!currentQuery || currentQuery.length < cfg.search.minQueryLength || !tokens.length) {
      if (openWhenEmpty) {
        renderState("none");
        openPanel(false);
      } else {
        renderState("none");
        closePanel();
      }
      return;
    }

    openPanel(false);

    if (indexStatus === "loading") {
      renderState("loading");
      return;
    }
    if (indexStatus === "error") {
      renderState("error");
      return;
    }

    const matched = searchWithScore(currentQuery.toLowerCase(), tokens);
    if (!matched.length) {
      renderState("empty");
      return;
    }

    renderResults(matched, tokens);
  };

  loadSearchIndex(cfg)
    .then((items) => {
      index = items;
      indexStatus = "ready";
      if (currentQuery) runSearch(currentQuery, true);
    })
    .catch(() => {
      indexStatus = "error";
      if (currentQuery) runSearch(currentQuery, true);
    });

  const onInput = (value) => {
    if (desktopInput) desktopInput.value = value;
    if (mobileInput) mobileInput.value = value;
    runSearch(value, window.innerWidth < 1024);
  };

  const onKeydown = (event) => {
    if (!cfg.search.keyboardNavigation) return;
    if (!isPanelOpen()) return;

    if (event.key === "Escape") {
      closePanel();
      return;
    }

    if (!visibleItems.length) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      const next = activeIndex < visibleItems.length - 1 ? activeIndex + 1 : 0;
      setActive(next);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      const next = activeIndex > 0 ? activeIndex - 1 : visibleItems.length - 1;
      setActive(next);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const targetIndex = activeIndex >= 0 ? activeIndex : 0;
      const target = visibleItems[targetIndex];
      if (target && target.url) window.location.href = target.url;
    }
  };

  results.addEventListener("mousemove", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const link = target.closest(".search-result-item");
    if (!(link instanceof HTMLElement)) return;
    const idx = Number(link.dataset.index);
    if (Number.isInteger(idx) && idx >= 0) setActive(idx, false);
  });

  if (desktopInput && !desktopInput.dataset.bound) {
    desktopInput.dataset.bound = "1";

    desktopInput.addEventListener("focus", () => {
      if (desktopBar) desktopBar.classList.add("search-focus");
      runSearch(desktopInput.value, false);
    });

    desktopInput.addEventListener("blur", () => {
      if (desktopBar) desktopBar.classList.remove("search-focus");
    });

    desktopInput.addEventListener("input", (event) => {
      onInput(event.target.value);
    });

    desktopInput.addEventListener("keydown", onKeydown);
  }

  if (mobileInput && !mobileInput.dataset.bound) {
    mobileInput.dataset.bound = "1";
    mobileInput.addEventListener("focus", () => {
      runSearch(mobileInput.value, true);
      openPanel(false);
    });
    mobileInput.addEventListener("input", (event) => {
      onInput(event.target.value);
    });
    mobileInput.addEventListener("keydown", onKeydown);
  }

  if (switchBtn && !switchBtn.dataset.bound) {
    switchBtn.dataset.bound = "1";
    switchBtn.addEventListener("click", () => {
      const baseValue = desktopInput ? desktopInput.value : mobileInput ? mobileInput.value : "";
      onInput(baseValue);
      openPanel(true);
    });
  }

  if (!window.__zulari_search_esc_bound) {
    window.__zulari_search_esc_bound = true;
    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closePanel();
    });
  }

  closeOnOutside("search-panel", ["search-panel", "search-bar", "search-switch", "search-input-desktop", "search-bar-inside"]);
}
