/**
 * Content Script for PDFImport - In-page Quick Import Buttons
 * Injects an unobtrusive, compact import button next to PDF links and buttons across websites.
 */

(() => {
  if (window.__pdfImportLinksInjected) {
    return;
  }
  window.__pdfImportLinksInjected = true;

  let isEnabled = true;
  let activeAiName = "Gemini";
  let userLang = "en";
  let isScanning = false;
  let mutationTimer = null;

  const AI_NAMES = {
    claude: "Claude",
    chatgpt: "ChatGPT",
    kimi: "Kimi",
    tencent: "Hy4",
    deepseek: "DeepSeek",
    gemini: "Gemini",
    glm: "GLM",
    meta: "Meta AI",
    qwen: "Qwen",
    grok: "Grok",
    perplexity: "Perplexity",
    copilot: "Copilot",
    custom: "AI"
  };

  const ICONS = {
    doc: '<svg class="pdfimport-btn-icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 1.5A1.5 1.5 0 0 0 2.5 3v10A1.5 1.5 0 0 0 4 14.5h8a1.5 1.5 0 0 0 1.5-1.5V6L9 1.5H4zM8.5 2.5 12 6H8.5V2.5zM5.5 8h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1 0-1zm0 2h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1 0-1z"/></svg>',
    spinner: '<svg class="pdfimport-btn-icon pdfimport-spinner" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.5a6.5 6.5 0 1 0 6.5 6.5A.75.75 0 0 0 16 8a8 8 0 1 1-8-8 .75.75 0 0 0 0 1.5z"/></svg>',
    check: '<svg class="pdfimport-btn-icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/></svg>',
    error: '<svg class="pdfimport-btn-icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/></svg>'
  };

  function resolveLanguage(langPref) {
    if (langPref === "cs") return "cs";
    if (langPref === "en") return "en";
    const uiLang = (chrome.i18n && chrome.i18n.getUILanguage ? chrome.i18n.getUILanguage() : "en").toLowerCase();
    return uiLang.startsWith("cs") ? "cs" : "en";
  }

  function resolveAiName(targetAi, customUrl) {
    if (targetAi === "custom" && customUrl && customUrl.trim()) {
      try {
        const parsed = new URL(customUrl.trim());
        return parsed.hostname.replace(/^www\./, "");
      } catch (e) {
        return "AI";
      }
    }
    return AI_NAMES[targetAi] || "AI";
  }

  async function loadSettings() {
    try {
      const settings = await chrome.storage.sync.get({
        enablePagePdfButtons: true,
        targetAi: "gemini",
        customAiUrl: "https://openrouter.ai/chat",
        userLanguage: "auto"
      });

      isEnabled = settings.enablePagePdfButtons !== false;
      activeAiName = resolveAiName(settings.targetAi, settings.customAiUrl);
      userLang = resolveLanguage(settings.userLanguage);
    } catch (e) {
      console.warn("[PDFImport] Could not load settings, using defaults:", e);
    }
  }

  function getTooltip() {
    return userLang === "cs"
      ? `Importovat PDF do ${activeAiName} (PDFImport)`
      : `Import PDF to ${activeAiName} (PDFImport)`;
  }

  function isLikelyPdfLink(a) {
    if (!a || !a.href) return false;
    const href = a.href;

    if (!href.startsWith("http://") && !href.startsWith("https://") && !href.startsWith("file:///")) {
      return false;
    }

    if (a.dataset.pdfimportInjected === "true") return false;
    if (a.closest(".pdfimport-btn")) return false;
    if (a.closest("template, noscript, script, style, head")) return false;

    // 1. Direct extension in URL: e.g. path/file.pdf, file.pdf?token=123, file.pdf#page=1
    if (/\.pdf($|[?#])/i.test(href)) {
      return true;
    }

    // 2. Explicit download attribute or type
    const downloadAttr = a.getAttribute("download");
    if (downloadAttr && /\.pdf$/i.test(downloadAttr.trim())) {
      return true;
    }
    if (a.type && a.type.toLowerCase().includes("application/pdf")) {
      return true;
    }

    // 3. Academic & repository PDF URL patterns (arXiv, OpenReview, etc.)
    try {
      const url = new URL(href);
      const path = url.pathname.toLowerCase();

      // arXiv: arxiv.org/pdf/2401.00001
      if (url.hostname.includes("arxiv.org") && path.startsWith("/pdf/")) {
        return true;
      }
      // OpenReview: openreview.net/pdf?id=...
      if (url.hostname.includes("openreview.net") && path.startsWith("/pdf")) {
        return true;
      }
      // Common parameters: ?format=pdf, ?download=pdf, ?file=...pdf
      const format = url.searchParams.get("format");
      const download = url.searchParams.get("download");
      const file = url.searchParams.get("file");
      if (format === "pdf" || download === "pdf" || (file && file.toLowerCase().endsWith(".pdf"))) {
        return true;
      }
    } catch (e) {}

    // 4. Button-like links whose visible text or aria-label specifically indicates PDF document download
    const label = (a.getAttribute("aria-label") || a.title || a.textContent || "").trim().toLowerCase();
    if (label === "pdf" || label === "[pdf]" || label === "download pdf" || label === "stáhnout pdf" || label === "full text (pdf)") {
      try {
        const url = new URL(href);
        if (url.pathname !== "/" && url.pathname !== "") {
          return true;
        }
      } catch (e) {}
    }

    return false;
  }

  function extractLinkTitle(link) {
    if (link.getAttribute("download")) {
      const d = link.getAttribute("download").trim();
      if (d) return d;
    }

    const titleAttr = link.getAttribute("title");
    if (titleAttr && titleAttr.trim().length > 3) {
      return titleAttr.trim();
    }

    const ariaLabel = link.getAttribute("aria-label");
    if (ariaLabel && ariaLabel.trim().length > 3) {
      return ariaLabel.trim();
    }

    const text = (link.textContent || "").trim();
    const lowerText = text.toLowerCase();
    if (text.length > 3 && !["pdf", "[pdf]", "download", "download pdf", "stáhnout", "stáhnout pdf"].includes(lowerText)) {
      return text;
    }

    try {
      const parsed = new URL(link.href);
      const parts = parsed.pathname.split("/");
      const last = parts[parts.length - 1];
      if (last && last.toLowerCase().endsWith(".pdf")) {
        return decodeURIComponent(last);
      }
    } catch (e) {}

    return document.title || "document.pdf";
  }

  function setButtonState(btn, state) {
    btn.dataset.state = state;
    if (state === "loading") {
      btn.innerHTML = `${ICONS.spinner}<span class="pdfimport-btn-text">...</span>`;
      btn.title = userLang === "cs" ? `Importuji do ${activeAiName}...` : `Importing to ${activeAiName}...`;
    } else if (state === "success") {
      btn.innerHTML = `${ICONS.check}<span class="pdfimport-btn-text">OK</span>`;
      btn.title = userLang === "cs" ? `Odesláno do ${activeAiName}!` : `Sent to ${activeAiName}!`;
    } else if (state === "error") {
      btn.innerHTML = `${ICONS.error}<span class="pdfimport-btn-text">ERR</span>`;
      btn.title = userLang === "cs" ? "Chyba při odesílání" : "Error sending PDF";
    } else {
      btn.innerHTML = `${ICONS.doc}<span class="pdfimport-btn-text">AI</span>`;
      btn.title = getTooltip();
      btn.setAttribute("aria-label", getTooltip());
    }
  }

  function insertButtonForLink(a) {
    if (!isEnabled) return;
    if (a.dataset.pdfimportInjected === "true") return;

    let target = a;
    if (a.parentElement && (a.parentElement.tagName === "BUTTON" || a.parentElement.getAttribute("role") === "button")) {
      target = a.parentElement;
    }

    // Skip if an existing button is already next to this target
    const nextEl = target.nextElementSibling;
    if (nextEl && nextEl.classList.contains("pdfimport-btn")) {
      a.dataset.pdfimportInjected = "true";
      return;
    }
    const prevEl = target.previousElementSibling;
    if (prevEl && prevEl.classList.contains("pdfimport-btn") && prevEl.dataset.pdfimportUrl === a.href) {
      a.dataset.pdfimportInjected = "true";
      return;
    }

    a.dataset.pdfimportInjected = "true";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pdfimport-btn";
    btn.dataset.pdfimportUrl = a.href;
    setButtonState(btn, "normal");

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleButtonClick(btn, a);
    });

    btn.addEventListener("mousedown", (e) => {
      e.stopPropagation();
    });

    if (target.parentNode) {
      target.parentNode.insertBefore(btn, target.nextSibling);
    }
  }

  async function handleButtonClick(btn, link) {
    if (btn.dataset.state === "loading") return;

    setButtonState(btn, "loading");

    const pdfUrl = link.href;
    const title = extractLinkTitle(link);

    try {
      chrome.runtime.sendMessage({
        action: "PROCESS_PDF_URL",
        url: pdfUrl,
        title: title
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.warn("[PDFImport]", chrome.runtime.lastError.message);
          setButtonState(btn, "error");
          setTimeout(() => setButtonState(btn, "normal"), 2000);
          return;
        }
        setButtonState(btn, "success");
        setTimeout(() => setButtonState(btn, "normal"), 2500);
      });
    } catch (err) {
      console.error("[PDFImport] Send error:", err);
      setButtonState(btn, "error");
      setTimeout(() => setButtonState(btn, "normal"), 2000);
    }
  }

  function scanForPdfLinks() {
    if (!isEnabled) return;
    if (isScanning) return;
    isScanning = true;

    try {
      const selector = 'a[href*=".pdf" i], a[href*=".PDF"], a[href*="/pdf/" i], a[type="application/pdf"], a[download$=".pdf" i], a[href*="format=pdf" i], a[href*="download=pdf" i]';
      const links = document.querySelectorAll(selector);
      for (let i = 0; i < links.length; i++) {
        const a = links[i];
        if (isLikelyPdfLink(a)) {
          insertButtonForLink(a);
        }
      }
    } finally {
      isScanning = false;
    }
  }

  function removeAllButtons() {
    const btns = document.querySelectorAll(".pdfimport-btn");
    btns.forEach((b) => b.remove());
    const links = document.querySelectorAll('[data-pdfimport-injected="true"]');
    links.forEach((l) => l.removeAttribute("data-pdfimport-injected"));
  }

  function updateAllButtonTooltips() {
    const btns = document.querySelectorAll(".pdfimport-btn");
    btns.forEach((btn) => {
      if (btn.dataset.state === "normal") {
        btn.title = getTooltip();
        btn.setAttribute("aria-label", getTooltip());
      }
    });
  }

  // Storage listener for dynamic preference changes
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync") return;
    if (changes.enablePagePdfButtons !== undefined) {
      isEnabled = changes.enablePagePdfButtons.newValue !== false;
      if (!isEnabled) {
        removeAllButtons();
      } else {
        scanForPdfLinks();
      }
    }
    if (changes.targetAi || changes.customAiUrl || changes.userLanguage) {
      loadSettings().then(() => {
        updateAllButtonTooltips();
      });
    }
  });

  // Setup DOM observer for dynamic content
  function initObserver() {
    const observer = new MutationObserver(() => {
      if (!isEnabled) return;
      if (mutationTimer) clearTimeout(mutationTimer);
      mutationTimer = setTimeout(scanForPdfLinks, 200);
    });

    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
      scanForPdfLinks();
    } else {
      document.addEventListener("DOMContentLoaded", () => {
        observer.observe(document.body, { childList: true, subtree: true });
        scanForPdfLinks();
      });
    }
  }

  // Initialization
  loadSettings().then(() => {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        initObserver();
      });
    } else {
      initObserver();
    }
  });
})();
