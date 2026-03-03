import { cfg } from "./config.js";

const TOUCH_QUERY = "(hover: none), (pointer: coarse)";

function normalizeLanguage(raw) {
  const value = String(raw || "").trim().toLowerCase().replace(/[_\s]+/g, "-");
  if (!value) return "TEXT";
  const alias = {
    plaintext: "text",
    "plain-text": "text",
    shellscript: "bash",
    yml: "yaml",
    py: "python",
    js: "javascript",
    ts: "typescript",
    md: "markdown",
  };
  const normalized = alias[value] || value;
  return cfg.codeblock.languageBadgeUppercase ? normalized.toUpperCase() : normalized;
}

function getCodeNode(pre) {
  return pre.querySelector("code");
}

function trimLeadingWhitespaceTextNode(code) {
  const first = code && code.firstChild;
  if (!first || first.nodeType !== Node.TEXT_NODE) return;
  if (!/^\s*$/.test(first.nodeValue || "")) return;
  code.removeChild(first);
}

function readLanguage(code) {
  const fromDataset = (code && code.dataset && code.dataset.lang) || "";
  if (fromDataset) return normalizeLanguage(fromDataset);
  const className = (code && code.className) || "";
  const match = className.match(/language-([A-Za-z0-9_+-]+)/);
  return normalizeLanguage(match ? match[1] : "");
}

function extractCodeText(code) {
  const lines = Array.from(code.querySelectorAll(".giallo-l"));
  if (lines.length) {
    return lines
      .map((line) => {
        const clone = line.cloneNode(true);
        clone.querySelectorAll(".giallo-ln").forEach((el) => el.remove());
        return clone.textContent || "";
      })
      .join("\n")
      .replace(/\n+$/, "");
  }
  return (code.textContent || "").replace(/\n+$/, "");
}

function ensureCopyButton(pre, code) {
  if (!cfg.codeblock.showCopyButton) return;
  if (pre.querySelector(".code-copy-btn")) return;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "code-copy-btn";
  button.setAttribute("aria-label", "复制代码");
  button.innerHTML = `
    <span class="material-symbols-rounded code-copy-icon">content_copy</span>
    <span class="code-copy-text">复制</span>
  `;

  let resetTimer = null;
  button.addEventListener("click", async () => {
    const text = extractCodeText(code);
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      button.dataset.state = "success";
      const icon = button.querySelector(".code-copy-icon");
      const label = button.querySelector(".code-copy-text");
      if (icon) icon.textContent = "check";
      if (label) label.textContent = "已复制";
    } catch (_) {
      button.dataset.state = "error";
      const label = button.querySelector(".code-copy-text");
      if (label) label.textContent = "复制失败";
    } finally {
      if (resetTimer) window.clearTimeout(resetTimer);
      resetTimer = window.setTimeout(() => {
        button.dataset.state = "";
        const icon = button.querySelector(".code-copy-icon");
        const label = button.querySelector(".code-copy-text");
        if (icon) icon.textContent = "content_copy";
        if (label) label.textContent = "复制";
      }, 1400);
    }
  });

  pre.appendChild(button);
}

function setupLineNumbers(pre, code) {
  if (!cfg.codeblock.showLineNumbers) return;
  const lines = code.querySelectorAll(".giallo-l");
  if (!lines.length) return;

  const hasNativeLinenos = !!code.querySelector(".giallo-ln");
  if (hasNativeLinenos) {
    pre.classList.add("has-native-linenos");
  } else {
    pre.classList.add("has-auto-linenos");
  }
}

function setupTouchBehavior(pre) {
  if (!window.matchMedia(TOUCH_QUERY).matches) return;

  let hideTimer = null;
  const show = () => {
    pre.classList.add("touch-actions-visible");
    if (hideTimer) window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => {
      pre.classList.remove("touch-actions-visible");
    }, 1800);
  };

  pre.addEventListener("pointerdown", (event) => {
    if (event.target && event.target.closest(".code-copy-btn")) return;
    show();
  });
}

export function setupCodeBlocks(root = document) {
  if (!cfg.codeblock.enabled) return;
  const scope = root && root.querySelectorAll ? root : document;
  const blocks = scope.querySelectorAll(".markdown-body pre.giallo");
  blocks.forEach((pre) => {
    if (pre.dataset.codeblockReady === "1") return;
    const code = getCodeNode(pre);
    if (!code) return;
    trimLeadingWhitespaceTextNode(code);

    if (cfg.codeblock.showLanguageBadge) {
      pre.dataset.language = readLanguage(code);
      pre.classList.add("has-language-badge");
    }

    setupLineNumbers(pre, code);
    ensureCopyButton(pre, code);
    setupTouchBehavior(pre);
    pre.dataset.codeblockReady = "1";
  });
}
