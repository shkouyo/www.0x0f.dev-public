const raw = window.ZULARI_CONFIG || {};

function asNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function asBool(value, fallback) {
  return typeof value === "boolean" ? value : fallback;
}

function asString(value, fallback) {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function asHexColor(value, fallback) {
  const str = asString(value, fallback).trim();
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(str) ? str : fallback;
}

export const cfg = {
  appearance: {
    mode: asString(raw.appearance && raw.appearance.mode, "auto"),
    accent: asHexColor(raw.appearance && raw.appearance.accent, "#cba6f7"),
  },
  layout: {
    anchorOffsetPx: asNumber(raw.layout && raw.layout.anchorOffsetPx, 90),
    backToTopThresholdPx: Math.max(0, asNumber(raw.layout && raw.layout.backToTopThresholdPx, 320)),
    contentDelayMs: Math.max(0, asNumber(raw.layout && raw.layout.contentDelayMs, 150)),
  },
  codeblock: {
    enabled: asBool(raw.codeblock && raw.codeblock.enabled, true),
    showLanguageBadge: asBool(raw.codeblock && raw.codeblock.showLanguageBadge, true),
    showCopyButton: asBool(raw.codeblock && raw.codeblock.showCopyButton, true),
    showLineNumbers: asBool(raw.codeblock && raw.codeblock.showLineNumbers, true),
    languageBadgeUppercase: asBool(raw.codeblock && raw.codeblock.languageBadgeUppercase, true),
  },
  search: {
    enabled: asBool(raw.search && raw.search.enabled, true),
    format: asString(raw.search && raw.search.format, "javascript"),
    baseName: asString(raw.search && raw.search.baseName, "search_index"),
    language: asString(raw.search && raw.search.language, "en"),
    maxResults: 10,
    excerptLength: 130,
    excerptContext: 42,
    minQueryLength: 1,
    maxTokens: 8,
    highlight: true,
    keyboardNavigation: true,
  },
  sidebar: {
    collapse: {
      collapsedHeight: asString(raw.sidebar && raw.sidebar.collapse && raw.sidebar.collapse.collapsedHeight, "7.5rem"),
    },
  },
  homePath: asString(raw.homePath, "/"),
  toc: {
    depth: Math.min(3, Math.max(1, asNumber(raw.toc && raw.toc.depth, 2))),
  },
};
