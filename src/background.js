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
  perplexity: {
    id: "perplexity",
    name: "Perplexity",
    fullName: "Perplexity (Perplexity AI)",
    urlMatchPatterns: ["*://www.perplexity.ai/*", "*://perplexity.ai/*"],
    newTabUrl: "https://www.perplexity.ai/"
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

let isSettingUpMenus = false;

// Context menu setup
async function setupContextMenus() {
  if (isSettingUpMenus) return;
  isSettingUpMenus = true;

  try {
    const settings = await chrome.storage.sync.get({
      userLanguage: "auto",
      enableContextMenu: true
    });

    let lang = "en";
    if (settings.userLanguage && settings.userLanguage !== "auto") {
      lang = settings.userLanguage;
    } else {
      const uiLang = (chrome.i18n.getUILanguage() || "en").toLowerCase();
      lang = uiLang.startsWith("cs") ? "cs" : "en";
    }

    const aiInfo = await getActiveAiInfo();
    const aiName = aiInfo.name;

    const titleCurrent = lang === "cs" ? `Odeslat PDF do ${aiName} (Alt+G)` : `Send PDF to ${aiName} (Alt+G)`;
    const titleLink = lang === "cs" ? `Odeslat odkazované PDF do ${aiName}` : `Send linked PDF to ${aiName}`;

    const PDF_PATTERNS = [
      "*://*/*.pdf",
      "*://*/*.PDF",
      "*://*/*.pdf?*",
      "*://*/*.PDF?*",
      "*://*/*.pdf#*",
      "*://*/*.PDF#*",
      "*://*/pdf/*",
      "*://*/doi/pdf/*",
      "file:///*.pdf",
      "file:///*.PDF",
      "file:///*"
    ];

    chrome.contextMenus.removeAll(() => {
      if (chrome.runtime.lastError) {}

      if (settings.enableContextMenu) {
        // Mode 1 (Checked): Always present in context menu everywhere ("pořád")
        // 1. Link item
        chrome.contextMenus.create({
          id: "send_link_pdf",
          title: titleLink,
          contexts: ["link"]
        }, () => {
          if (chrome.runtime.lastError) {}
        });

        // 2. Current page / image / selection item
        chrome.contextMenus.create({
          id: "send_current_pdf",
          title: titleCurrent,
          contexts: ["page", "selection", "image", "frame", "editable", "video", "audio"]
        }, () => {
          if (chrome.runtime.lastError) {}
        });

      } else {
        // Mode 2 (Unchecked): Only show for links, images, or open PDF documents
        // 1. Link item (shows on any link)
        chrome.contextMenus.create({
          id: "send_link_pdf",
          title: titleLink,
          contexts: ["link"]
        }, () => {
          if (chrome.runtime.lastError) {}
        });

        // 2. Image item (shows on any image, including PDFium rendered pages)
        chrome.contextMenus.create({
          id: "send_image_pdf",
          title: titleCurrent,
          contexts: ["image"]
        }, () => {
          if (chrome.runtime.lastError) {}
        });

        // 3. Open PDF document item (page / frame / selection only when matching PDF URL)
        chrome.contextMenus.create({
          id: "send_current_pdf",
          title: titleCurrent,
          contexts: ["page", "frame", "selection"],
          documentUrlPatterns: PDF_PATTERNS
        }, () => {
          if (chrome.runtime.lastError) {}
        });

        // Check active tab for non-PDF local files
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs && tabs[0]) {
            updateTabContextMenu(tabs[0]);
          }
        });
      }
    });

    // Update action title tooltip
    chrome.action.setTitle({
      title: titleCurrent
    }).catch(() => {});
  } finally {
    isSettingUpMenus = false;
  }
}

/**
 * Updates context menu visibility for local files
 */
async function updateTabContextMenu(tab) {
  if (!tab || !tab.url) return;
  const settings = await chrome.storage.sync.get({ enableContextMenu: true });
  if (settings.enableContextMenu) {
    chrome.contextMenus.update("send_current_pdf", { visible: true }, () => {
      if (chrome.runtime.lastError) {}
    });
    return;
  }

  if (tab.url.startsWith("file://")) {
    const isPdf = isLikelyPdf(tab.url, tab.title);
    chrome.contextMenus.update("send_current_pdf", { visible: isPdf }, () => {
      if (chrome.runtime.lastError) {}
    });
  } else {
    // Ensure menu item remains visible on web pages matching documentUrlPatterns
    chrome.contextMenus.update("send_current_pdf", { visible: true }, () => {
      if (chrome.runtime.lastError) {}
    });
  }
}

chrome.runtime.onInstalled.addListener(setupContextMenus);
chrome.runtime.onStartup.addListener(setupContextMenus);

// Listen for tab changes to dynamically show/hide context menu item
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    await updateTabContextMenu(tab);
  } catch (e) {}
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" || changeInfo.url) {
    try {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (activeTab && activeTab.id === tabId) {
        await updateTabContextMenu(tab);
      }
    } catch (e) {}
  }
});

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
  if (info.menuItemId === "send_link_pdf" || info.linkUrl) {
    if (info.linkUrl && !isRestrictedUrl(info.linkUrl)) {
      await processPdfUrl(info.linkUrl, "document.pdf", tab ? tab.id : null);
      return;
    }
  }

  const tabUrl = (tab && tab.url) || "";
  const pageUrl = info.pageUrl || "";
  const srcUrl = info.srcUrl || "";

  let targetUrl = "";
  if (isLikelyPdf(tabUrl, tab?.title)) {
    targetUrl = tabUrl;
  } else if (isLikelyPdf(pageUrl)) {
    targetUrl = pageUrl;
  } else if (info.menuItemId === "send_image_pdf" && srcUrl && !isRestrictedUrl(srcUrl)) {
    targetUrl = srcUrl;
  } else if (tabUrl && !isRestrictedUrl(tabUrl)) {
    targetUrl = tabUrl;
  } else if (pageUrl && !isRestrictedUrl(pageUrl)) {
    targetUrl = pageUrl;
  } else if (srcUrl && !isRestrictedUrl(srcUrl)) {
    targetUrl = srcUrl;
  }

  if (!targetUrl || isRestrictedUrl(targetUrl)) {
    chrome.runtime.openOptionsPage();
    return;
  }

  await processPdfUrl(targetUrl, (tab && tab.title) || "document.pdf", tab ? tab.id : null);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "TARGET_AI_CHANGED" || message.action === "LANGUAGE_CHANGED" || message.action === "CONTEXT_MENUS_CHANGED") {
    setupContextMenus();
    sendResponse({ status: "ok" });
  } else if (message.action === "LARGE_PDF_COMPLETED") {
    (async () => {
      try {
        const aiInfo = await getActiveAiInfo();
        const settings = await chrome.storage.sync.get({ reuseTab: true });
        await openOrActivateAi(aiInfo, message.reuseTab !== undefined ? message.reuseTab : settings.reuseTab);
        setBadge("OK", "#34A853");
        setTimeout(() => clearBadge(), 3000);
      } catch (err) {
        console.error("[PDF Import] Error activating AI after large PDF process:", err);
      }
    })();
    sendResponse({ status: "ok" });
  }
});

const DEFAULT_LARGE_PDF_THRESHOLD_MB = 30;
const ABSOLUTE_MAX_PDF_SIZE_MB = 500;

/**
 * Opens modal dialog for large PDF optimization
 */
async function openLargePdfDialog(sessionData) {
  await chrome.storage.local.set({ largePdfSession: sessionData });
  clearBadge();

  const width = 500;
  const height = 550;
  let left = undefined;
  let top = undefined;

  try {
    const currentWin = await chrome.windows.getCurrent();
    if (currentWin.left !== undefined && currentWin.width !== undefined) {
      left = Math.round(currentWin.left + (currentWin.width - width) / 2);
      top = Math.round(currentWin.top + (currentWin.height - height) / 2);
    }
  } catch (e) {}

  chrome.windows.create({
    url: chrome.runtime.getURL("src/dialog/large_pdf_dialog.html"),
    type: "popup",
    width: width,
    height: height,
    left: left,
    top: top,
    focused: true
  });
}

async function ensureOffscreenDocument() {
  if (await chrome.offscreen.hasDocument()) return;
  await chrome.offscreen.createDocument({
    url: "src/offscreen/offscreen.html",
    reasons: ["BLOBS"],
    justification: "Reading local file:/// PDF documents"
  });
}

async function fetchLocalFile(url) {
  await ensureOffscreenDocument();
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({
      action: "OFFSCREEN_FETCH_LOCAL_FILE",
      url: url
    }, (res) => {
      if (chrome.runtime.lastError) {
        return reject(new Error(chrome.runtime.lastError.message));
      }
      if (!res || !res.success) {
        return reject(new Error(res?.error || "Failed to read local file."));
      }
      resolve(res);
    });
  });
}

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

    const settings = await chrome.storage.sync.get({
      reuseTab: true,
      defaultPrompt: "",
      largePdfThreshold: DEFAULT_LARGE_PDF_THRESHOLD_MB,
      largePdfAction: "ask"
    });

    const aiInfo = await getActiveAiInfo();
    const thresholdMb = parseInt(settings.largePdfThreshold, 10) || DEFAULT_LARGE_PDF_THRESHOLD_MB;
    const thresholdBytes = thresholdMb * 1024 * 1024;
    const absoluteMaxBytes = ABSOLUTE_MAX_PDF_SIZE_MB * 1024 * 1024;

    // 1. Check file scheme permissions and fetch for file:///
    const isFileUrl = url.startsWith("file://");
    if (isFileUrl) {
      const isAllowed = await chrome.extension.isAllowedFileSchemeAccess();
      if (!isAllowed) {
        setBadge("ERR", "#D32F2F");
        showFileAccessWarning();
        return;
      }

      console.log("[PDF Import] Reading local file via offscreen document:", url);
      const localData = await fetchLocalFile(url);
      const sizeBytes = localData.size;

      if (sizeBytes > absoluteMaxBytes) {
        handleSizeLimitExceeded(sizeBytes, absoluteMaxBytes);
        return;
      }

      let filename = fallbackTitle || "document.pdf";
      try {
        const decoded = decodeURIComponent(url);
        const parts = decoded.split("/");
        const lastPart = parts[parts.length - 1];
        if (lastPart) filename = lastPart;
      } catch (e) {}

      if (!filename.toLowerCase().endsWith(".pdf")) {
        filename += ".pdf";
      }

      if (sizeBytes > thresholdBytes && settings.largePdfAction === "ask") {
        await openLargePdfDialog({
          url: url,
          filename: filename,
          sizeBytes: sizeBytes,
          sourceTabId: sourceTabId,
          targetAi: aiInfo.id,
          targetAiName: aiInfo.name,
          defaultPrompt: settings.defaultPrompt,
          reuseTab: settings.reuseTab
        });
        return;
      }

      // Store pending PDF
      await chrome.storage.local.set({
        pendingPdf: {
          filename: filename,
          dataUrl: localData.dataUrl,
          size: sizeBytes,
          mimeType: localData.mimeType || "application/pdf",
          prompt: settings.defaultPrompt,
          targetAi: aiInfo.id,
          targetAiName: aiInfo.name,
          timestamp: Date.now()
        }
      });

      await openOrActivateAi(aiInfo, settings.reuseTab);
      setBadge("OK", "#34A853");
      setTimeout(() => clearBadge(), 3000);
      return;
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
            if (!isNaN(sizeBytes)) {
              if (sizeBytes > absoluteMaxBytes) {
                handleSizeLimitExceeded(sizeBytes, absoluteMaxBytes);
                return;
              }
              if (sizeBytes > thresholdBytes && settings.largePdfAction === "ask") {
                await openLargePdfDialog({
                  url: url,
                  filename: fallbackTitle,
                  sizeBytes: sizeBytes,
                  sourceTabId: sourceTabId,
                  targetAi: aiInfo.id,
                  targetAiName: aiInfo.name,
                  defaultPrompt: settings.defaultPrompt,
                  reuseTab: settings.reuseTab
                });
                return;
              }
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

    let filename = extractFilename(response, url, fallbackTitle);
    if (!filename.toLowerCase().endsWith(".pdf")) {
      filename += ".pdf";
    }

    const contentLength = response.headers.get("content-length");
    if (contentLength) {
      const sizeBytes = parseInt(contentLength, 10);
      if (!isNaN(sizeBytes)) {
        if (sizeBytes > absoluteMaxBytes) {
          handleSizeLimitExceeded(sizeBytes, absoluteMaxBytes);
          return;
        }
        if (sizeBytes > thresholdBytes && settings.largePdfAction === "ask") {
          await openLargePdfDialog({
            url: url,
            filename: filename,
            sizeBytes: sizeBytes,
            sourceTabId: sourceTabId,
            targetAi: aiInfo.id,
            targetAiName: aiInfo.name,
            defaultPrompt: settings.defaultPrompt,
            reuseTab: settings.reuseTab
          });
          return;
        }
      }
    }

    const blob = await response.blob();
    if (blob.size > absoluteMaxBytes) {
      handleSizeLimitExceeded(blob.size, absoluteMaxBytes);
      return;
    }

    if (blob.size > thresholdBytes && settings.largePdfAction === "ask") {
      await openLargePdfDialog({
        url: url,
        filename: filename,
        sizeBytes: blob.size,
        sourceTabId: sourceTabId,
        targetAi: aiInfo.id,
        targetAiName: aiInfo.name,
        defaultPrompt: settings.defaultPrompt,
        reuseTab: settings.reuseTab
      });
      return;
    }

    const base64Data = await blobToBase64(blob);
    console.log(`[PDF Import] PDF fetched: ${filename}, size: ${(blob.size / 1024 / 1024).toFixed(2)} MB`);

    // 4. Store pending PDF
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

    // 5. Open or focus target AI platform tab
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
