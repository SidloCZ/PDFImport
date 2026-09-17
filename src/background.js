/**
 * Background Service Worker for PDF to AI Fast Import
 * Supports Top 10 AI platforms (Claude, ChatGPT, Kimi, Hy4/Yuanbao, DeepSeek, Gemini, GLM, Meta AI, Qwen, Grok) + Custom URL
 */

const AI_PROVIDERS = {
  claude: {
    id: "claude",
    name: "Claude",
    fullName: "Anthropic (Claude)",
    urlMatchPatterns: ["*://claude.ai/*"],
    newTabUrl: "https://claude.ai/new"
  },
  chatgpt: {
    id: "chatgpt",
    name: "ChatGPT",
    fullName: "OpenAI (ChatGPT)",
    urlMatchPatterns: ["*://chatgpt.com/*", "*://chat.openai.com/*"],
    newTabUrl: "https://chatgpt.com/"
  },
  kimi: {
    id: "kimi",
    name: "Kimi",
    fullName: "Moonshot (Kimi)",
    urlMatchPatterns: ["*://kimi.com/*", "*://kimi.moonshot.cn/*"],
    newTabUrl: "https://kimi.com/"
  },
  tencent: {
    id: "tencent",
    name: "Hy4",
    fullName: "Tencent (Hy4 / Yuanbao)",
    urlMatchPatterns: ["*://yuanbao.tencent.com/*", "*://hunyuan.tencent.com/*"],
    newTabUrl: "https://yuanbao.tencent.com/"
  },
  deepseek: {
    id: "deepseek",
    name: "DeepSeek",
    fullName: "DeepSeek",
    urlMatchPatterns: ["*://chat.deepseek.com/*"],
    newTabUrl: "https://chat.deepseek.com/"
  },
  gemini: {
    id: "gemini",
    name: "Gemini",
    fullName: "Google (Gemini)",
    urlMatchPatterns: ["*://gemini.google.com/*"],
    newTabUrl: "https://gemini.google.com/app"
  },
  glm: {
    id: "glm",
    name: "GLM",
    fullName: "Z.ai (GLM)",
    urlMatchPatterns: ["*://chatglm.cn/*", "*://z.ai/*"],
    newTabUrl: "https://chatglm.cn/"
  },
  meta: {
    id: "meta",
    name: "Meta AI",
    fullName: "Meta (Meta AI)",
    urlMatchPatterns: ["*://www.meta.ai/*", "*://meta.ai/*"],
    newTabUrl: "https://www.meta.ai/"
  },
  qwen: {
    id: "qwen",
    name: "Qwen",
    fullName: "Alibaba (Qwen)",
    urlMatchPatterns: ["*://tongyi.ai/*", "*://qwen.ai/*"],
    newTabUrl: "https://tongyi.ai/"
  },
  grok: {
    id: "grok",
    name: "Grok",
    fullName: "SpaceXAI (Grok)",
    urlMatchPatterns: ["*://grok.com/*", "*://x.com/i/grok*"],
    newTabUrl: "https://grok.com/"
  },
  custom: {
    id: "custom",
    name: "Custom AI",
    fullName: "Custom URL",
    urlMatchPatterns: [],
    newTabUrl: "https://openrouter.ai/chat"
  }
};

async function getActiveAiInfo() {
  const settings = await chrome.storage.sync.get({
    targetAi: "gemini",
    customAiUrl: "https://openrouter.ai/chat"
  });

  const provider = AI_PROVIDERS[settings.targetAi] || AI_PROVIDERS.gemini;
  let name = provider.name;
  let newTabUrl = provider.newTabUrl;
  let urlMatchPatterns = provider.urlMatchPatterns;

  if (settings.targetAi === "custom" && settings.customAiUrl && settings.customAiUrl.trim()) {
    try {
      const parsed = new URL(settings.customAiUrl.trim());
      name = parsed.hostname.replace(/^www\./, "");
      newTabUrl = parsed.href;
      urlMatchPatterns = [`*://${parsed.hostname}/*`];
    } catch (e) {
      name = "OpenRouter";
    }
  }

  return {
    id: settings.targetAi,
    name: name,
    fullName: provider.fullName,
    newTabUrl: newTabUrl,
    urlMatchPatterns: urlMatchPatterns
  };
}

// Context menu setup
async function setupContextMenus() {
  let lang = "en";
  try {
    const settings = await chrome.storage.sync.get({ userLanguage: "auto" });
    if (settings.userLanguage && settings.userLanguage !== "auto") {
      lang = settings.userLanguage;
    } else {
      const uiLang = (chrome.i18n.getUILanguage() || "en").toLowerCase();
      lang = uiLang.startsWith("cs") ? "cs" : "en";
    }
  } catch (e) {}

  const aiInfo = await getActiveAiInfo();
  const aiName = aiInfo.name;

  const titleCurrent = lang === "cs" ? `Odeslat PDF do ${aiName} (Alt+G)` : `Send PDF to ${aiName} (Alt+G)`;
  const titleLink = lang === "cs" ? `Odeslat odkazované PDF do ${aiName}` : `Send linked PDF to ${aiName}`;

  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "send_current_pdf",
      title: titleCurrent,
      contexts: ["all"]
    });

    chrome.contextMenus.create({
      id: "send_link_pdf",
      title: titleLink,
      contexts: ["link"]
    });
  });

  // Update action title tooltip
  chrome.action.setTitle({
    title: titleCurrent
  }).catch(() => {});
}

chrome.runtime.onInstalled.addListener(setupContextMenus);
chrome.runtime.onStartup.addListener(setupContextMenus);
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "LANGUAGE_CHANGED" || message.action === "TARGET_AI_CHANGED") {
    setupContextMenus();
  }
});
setupContextMenus();

/**
 * Checks if a URL is restricted by the browser
 */
function isRestrictedUrl(url) {
  if (!url) return true;
  const lower = url.toLowerCase();
  return (
    lower.startsWith("chrome://") ||
    lower.startsWith("opera://") ||
    lower.startsWith("edge://") ||
    lower.startsWith("brave://") ||
    lower.startsWith("about:") ||
    lower.startsWith("chrome-extension://") ||
    lower.startsWith("chrome-search://") ||
    lower.startsWith("devtools://") ||
    lower.startsWith("view-source:")
  );
}

/**
 * Heuristic to detect PDF by URL or title
 */
function isLikelyPdf(url, title) {
  if (!url || isRestrictedUrl(url)) return false;

  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname.toLowerCase();
    if (pathname.endsWith(".pdf") || pathname.includes("/pdf/")) {
      return true;
    }
    const format = parsed.searchParams.get("format");
    const file = parsed.searchParams.get("file");
    if (format === "pdf" || (file && file.toLowerCase().endsWith(".pdf"))) {
      return true;
    }
  } catch (e) {}

  if (title && title.trim().toLowerCase().endsWith(".pdf")) {
    return true;
  }

  return false;
}

/**
 * Checks if the tab truly contains a PDF document
 */
async function isTabPdf(tab) {
  if (!tab || !tab.url || isRestrictedUrl(tab.url)) return false;

  if (isLikelyPdf(tab.url, tab.title)) {
    return true;
  }

  if (tab.id && (tab.url.startsWith("http://") || tab.url.startsWith("https://") || tab.url.startsWith("file://"))) {
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          return document.contentType === "application/pdf" ||
                 !!document.querySelector('embed[type="application/pdf"]') ||
                 !!document.querySelector('embed[name="plugin"]') ||
                 document.body?.classList?.contains("pdf-viewer");
        }
      });
      if (results && results[0] && results[0].result) {
        return true;
      }
    } catch (e) {
      // Ignore if script injection is not allowed on this page
    }
  }

  return false;
}

// Action button click
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab || !tab.url || isRestrictedUrl(tab.url)) {
    chrome.runtime.openOptionsPage();
    return;
  }

  const isPdf = await isTabPdf(tab);
  if (!isPdf) {
    chrome.runtime.openOptionsPage();
    return;
  }

  await processPdfUrl(tab.url, tab.title || "document.pdf", tab.id);
});

// Shortcut command (Alt+G)
chrome.commands.onCommand.addListener(async (command) => {
  if (command === "send-pdf-to-gemini") {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTab && activeTab.url) {
      if (isRestrictedUrl(activeTab.url)) {
        chrome.runtime.openOptionsPage();
        return;
      }
      await processPdfUrl(activeTab.url, activeTab.title || "document.pdf", activeTab.id);
    }
  }
});

// Context menus
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "send_link_pdf" && info.linkUrl) {
    if (isRestrictedUrl(info.linkUrl)) return;
    await processPdfUrl(info.linkUrl, "document.pdf", tab ? tab.id : null);
  } else if (info.menuItemId === "send_current_pdf" && tab && tab.url) {
    if (isRestrictedUrl(tab.url)) {
      chrome.runtime.openOptionsPage();
      return;
    }
    await processPdfUrl(tab.url, tab.title || "document.pdf", tab.id);
  }
});

const MAX_PDF_SIZE_MB = 50;
const MAX_PDF_SIZE_BYTES = MAX_PDF_SIZE_MB * 1024 * 1024;

/**
 * Downloads the PDF and opens or activates target AI platform
 */
async function processPdfUrl(url, fallbackTitle, sourceTabId) {
  if (isRestrictedUrl(url)) {
    chrome.runtime.openOptionsPage();
    return;
  }

  try {
    setBadge("...", "#4E82EE");

    // 1. Check file scheme permissions for file:///
    const isFileUrl = url.startsWith("file://");
    if (isFileUrl) {
      const isAllowed = await chrome.extension.isAllowedFileSchemeAccess();
      if (!isAllowed) {
        setBadge("ERR", "#D32F2F");
        showFileAccessWarning();
        return;
      }
    }

    // 2. HEAD request size check for HTTP/HTTPS
    if (!isFileUrl) {
      try {
        const headResponse = await fetch(url, {
          method: "HEAD",
          credentials: "include"
        });
        if (headResponse.ok) {
          const headLength = headResponse.headers.get("content-length");
          if (headLength) {
            const sizeBytes = parseInt(headLength, 10);
            if (!isNaN(sizeBytes) && sizeBytes > MAX_PDF_SIZE_BYTES) {
              handleSizeLimitExceeded(sizeBytes, MAX_PDF_SIZE_BYTES);
              return;
            }
          }
        }
      } catch (e) {
        // Fall through to GET if HEAD fails or CORS blocks HEAD
      }
    }

    // 3. Fetch PDF
    console.log("[PDF Import] Fetching PDF:", url);
    const response = await fetch(url, {
      credentials: "include"
    });

    if (!response.ok) {
      throw new Error(`Download error (${response.status}: ${response.statusText})`);
    }

    const contentLength = response.headers.get("content-length");
    if (contentLength) {
      const sizeBytes = parseInt(contentLength, 10);
      if (!isNaN(sizeBytes) && sizeBytes > MAX_PDF_SIZE_BYTES) {
        handleSizeLimitExceeded(sizeBytes, MAX_PDF_SIZE_BYTES);
        return;
      }
    }

    let filename = extractFilename(response, url, fallbackTitle);
    if (!filename.toLowerCase().endsWith(".pdf")) {
      filename += ".pdf";
    }

    const blob = await response.blob();
    if (blob.size > MAX_PDF_SIZE_BYTES) {
      handleSizeLimitExceeded(blob.size, MAX_PDF_SIZE_BYTES);
      return;
    }

    const base64Data = await blobToBase64(blob);
    console.log(`[PDF Import] PDF fetched: ${filename}, size: ${(blob.size / 1024 / 1024).toFixed(2)} MB`);

    // 4. Retrieve settings
    const settings = await chrome.storage.sync.get({
      reuseTab: true,
      defaultPrompt: ""
    });

    const aiInfo = await getActiveAiInfo();

    // 5. Store pending PDF
    await chrome.storage.local.set({
      pendingPdf: {
        filename: filename,
        dataUrl: base64Data,
        size: blob.size,
        mimeType: blob.type || "application/pdf",
        prompt: settings.defaultPrompt,
        targetAi: aiInfo.id,
        targetAiName: aiInfo.name,
        timestamp: Date.now()
      }
    });

    // 6. Open or focus target AI platform tab
    await openOrActivateAi(aiInfo, settings.reuseTab);
    setBadge("OK", "#34A853");
    setTimeout(() => clearBadge(), 3000);

  } catch (err) {
    console.error("[PDF Import] Error:", err);
    setBadge("ERR", "#D32F2F");
    setTimeout(() => clearBadge(), 4000);
    notifyError(err.message || "Failed to download PDF.");
  }
}

/**
 * Finds or opens the AI tab and sends the signal to insert the PDF
 */
async function openOrActivateAi(aiInfo, reuseTab) {
  let targetTab = null;

  if (reuseTab) {
    for (const pattern of aiInfo.urlMatchPatterns) {
      const tabs = await chrome.tabs.query({ url: pattern });
      if (tabs && tabs.length > 0) {
        targetTab = tabs[0];
        await chrome.tabs.update(targetTab.id, { active: true });
        if (targetTab.windowId) {
          await chrome.windows.update(targetTab.windowId, { focused: true });
        }
        break;
      }
    }
  }

  if (!targetTab) {
    targetTab = await chrome.tabs.create({
      url: aiInfo.newTabUrl,
      active: true
    });
  }

  // Ensure content script is present for custom URLs or dynamic injection
  setTimeout(async () => {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: targetTab.id },
        files: ["src/content_ai.js"]
      });
    } catch (e) {
      // Content script may already be injected via manifest match
    }

    chrome.tabs.sendMessage(targetTab.id, { action: "PROCESS_PENDING_PDF" }).catch(() => {
      // Content script will pick it up on startup from storage if tab is still loading
    });
  }, 600);
}

/**
 * Extract meaningful filename
 */
function extractFilename(response, url, fallbackTitle) {
  const disposition = response.headers.get("content-disposition");
  if (disposition) {
    const matchUtf8 = disposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (matchUtf8 && matchUtf8[1]) {
      return decodeURIComponent(matchUtf8[1].replace(/["']/g, ""));
    }
    const matchSimple = disposition.match(/filename="?([^";]+)"?/i);
    if (matchSimple && matchSimple[1]) {
      return matchSimple[1].trim();
    }
  }

  try {
    const parsedUrl = new URL(url);
    const pathname = parsedUrl.pathname;
    const parts = pathname.split("/").filter(Boolean);
    if (parts.length > 0) {
      const lastPart = decodeURIComponent(parts[parts.length - 1]);
      if (lastPart.toLowerCase().endsWith(".pdf")) {
        return lastPart;
      }
      if (parts.length >= 2 && lastPart) {
        return lastPart + ".pdf";
      }
    }
  } catch (e) {}

  if (fallbackTitle && fallbackTitle !== "document.pdf") {
    const cleaned = fallbackTitle.replace(/[\\/:*?"<>|]/g, "_").trim();
    if (cleaned.length > 0) {
      return cleaned.endsWith(".pdf") ? cleaned : cleaned + ".pdf";
    }
  }

  const prefix = chrome.i18n.getMessage("defaultFileNamePrefix") || "document_";
  return prefix + Date.now().toString().slice(-4) + ".pdf";
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function setBadge(text, color) {
  chrome.action.setBadgeText({ text });
  if (color) {
    chrome.action.setBadgeBackgroundColor({ color });
  }
}

function clearBadge() {
  chrome.action.setBadgeText({ text: "" });
}

function showFileAccessWarning() {
  chrome.notifications.create({
    type: "basic",
    iconUrl: "icons/icon128.png",
    title: chrome.i18n.getMessage("fileAccessWarningTitle") || "File URL permission required",
    message: chrome.i18n.getMessage("fileAccessWarningMessage") || "To import 'file:///' local files, please enable 'Allow access to file URLs' on the browser extensions page."
  }).catch(() => {
    console.warn("[PDF Import] Please enable 'Allow access to file URLs' in extension settings");
  });
}

function handleSizeLimitExceeded(sizeBytes, maxBytes) {
  const sizeMb = (sizeBytes / (1024 * 1024)).toFixed(1);
  const limitMb = (maxBytes / (1024 * 1024)).toFixed(0);

  console.warn(`[PDF Import] PDF size exceeds limit: ${sizeMb} MB > ${limitMb} MB`);
  setBadge("SIZE", "#D32F2F");
  setTimeout(() => clearBadge(), 5000);

  const title = chrome.i18n.getMessage("fileSizeLimitErrorTitle") || "PDF file is too large";
  const rawMsg = chrome.i18n.getMessage("fileSizeLimitErrorMessage", [sizeMb, limitMb]);
  const message = rawMsg || `The file size (${sizeMb} MB) exceeds the maximum allowed limit of ${limitMb} MB.`;

  chrome.notifications.create({
    type: "basic",
    iconUrl: "icons/icon128.png",
    title: title,
    message: message
  }).catch(() => {
    console.warn("[PDF Import]", message);
  });
}

function notifyError(message) {
  console.error("[PDF Import Error]", message);
}
