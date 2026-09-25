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
  copilot: {
    id: "copilot",
    name: "Copilot",
    fullName: "Microsoft (Copilot)",
    urlMatchPatterns: ["*://copilot.microsoft.com/*"],
    newTabUrl: "https://copilot.microsoft.com/"
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
  } else if (message.action === "PROCESS_PDF_URL") {
    (async () => {
      try {
        await processPdfUrl(
          message.url,
          message.title || "document.pdf",
          sender.tab ? sender.tab.id : null
        );
      } catch (err) {
        console.error("[PDF Import] Error processing PDF URL from web page button:", err);
      }
    })();
    sendResponse({ status: "ok" });
    return true;
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

async function getLocalFileInfo(url) {
  await ensureOffscreenDocument();
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({
      action: "OFFSCREEN_GET_FILE_INFO",
      url: url
    }, (res) => {
      if (chrome.runtime.lastError) {
        return reject(new Error(chrome.runtime.lastError.message));
      }
      if (!res || !res.success) {
        return reject(new Error(res?.error || "Failed to inspect local file."));
      }
      resolve(res);
    });
  });
}

async function storeLocalFilePendingPdf(params) {
  await ensureOffscreenDocument();
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({
      action: "OFFSCREEN_STORE_PENDING_PDF",
      url: params.url,
      filename: params.filename,
      prompt: params.prompt,
      targetAi: params.targetAi,
      targetAiName: params.targetAiName
    }, (res) => {
      if (chrome.runtime.lastError) {
        return reject(new Error(chrome.runtime.lastError.message));
      }
      if (!res || !res.success) {
        return reject(new Error(res?.error || "Failed to store local file."));
      }
      resolve(res);
    });
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Listens until a tab finishes loading its final destination,
 * waiting through any anti-bot or security challenge interstitials.
 */
function waitForTabReady(tabId, timeoutMs = 25000) {
  return new Promise((resolve, reject) => {
    let timer = null;

    function cleanup() {
      if (timer) clearTimeout(timer);
      chrome.tabs.onUpdated.removeListener(onUpdated);
      chrome.tabs.onRemoved.removeListener(onRemoved);
    }

    timer = setTimeout(() => {
      cleanup();
      chrome.tabs.get(tabId).then((tab) => {
        if (tab && tab.url && !isRestrictedUrl(tab.url)) {
          resolve(tab);
        } else {
          reject(new Error("Timeout waiting for PDF to load in tab."));
        }
      }).catch(() => reject(new Error("Timeout waiting for PDF to load in tab.")));
    }, timeoutMs);

    function onRemoved(removedTabId) {
      if (removedTabId === tabId) {
        cleanup();
        reject(new Error("PDF tab was closed before loading completed."));
      }
    }

    function onUpdated(updatedTabId, changeInfo, updatedTab) {
      if (updatedTabId !== tabId) return;

      if (changeInfo.status === "complete") {
        const title = (updatedTab.title || "").toLowerCase();
        // If Cloudflare or anti-bot challenge interstitial is still displaying, wait for actual PDF navigation
        if (
          title.includes("just a moment") ||
          title.includes("cloudflare") ||
          title.includes("security check") ||
          title.includes("attention required")
        ) {
          console.log("[PDF Import] Security challenge in progress, waiting for final PDF navigation...");
          return;
        }

        cleanup();
        resolve(updatedTab);
      }
    }

    chrome.tabs.onUpdated.addListener(onUpdated);
    chrome.tabs.onRemoved.addListener(onRemoved);
  });
}

/**
 * Handles protected PDF links (HTTP 403, Cloudflare challenge, or anti-hotlinking)
 * by opening the URL in a browser tab so Chrome navigates natively with top-level
 * request headers, clearing anti-bot challenges and establishing session cookies.
 */
async function handleProtectedPdfViaTab(url, fallbackTitle) {
  console.log(`[PDF Import] Protected PDF link detected (403/WAF). Opening tab to clear protection: ${url}`);
  setBadge("LOAD", "#4E82EE");

  let navTab = null;
  try {
    navTab = await chrome.tabs.create({ url: url, active: true });
    const loadedTab = await waitForTabReady(navTab.id, 25000);
    console.log(`[PDF Import] Protected tab navigation completed: ${loadedTab.url} ("${loadedTab.title}")`);

    // Settle delay for cookies, clearance tokens, and disk cache
    await sleep(600);

    const finalUrl = loadedTab.url || url;
    const finalTitle = loadedTab.title || fallbackTitle;

    // Retry processPdfUrl with isRetry = true so it doesn't loop
    await processPdfUrl(finalUrl, finalTitle, navTab.id, true);

    // If import and dispatch succeeded, close the temporary bypass tab
    if (navTab && navTab.id) {
      chrome.tabs.remove(navTab.id).catch(() => {});
    }
  } catch (err) {
    console.error("[PDF Import] Failed to process protected PDF via tab navigation:", err);
    clearBadge();
    notifyError(err.message || "Failed to download protected PDF.");
  }
}

/**
 * Fetches PDF directly within the source tab context.
 * This sends the webpage's active cookies, session tokens, and Referer header,
 * resolving HTTP 403 Forbidden errors caused by anti-hotlinking protection or gated sessions.
 */
async function fetchPdfViaTab(tabId, url) {
  if (!tabId) {
    throw new Error("No source tab available for tab-context fetch.");
  }
  const tab = await chrome.tabs.get(tabId).catch(() => null);
  if (!tab || !tab.url || isRestrictedUrl(tab.url)) {
    throw new Error("Cannot execute script in restricted tab.");
  }

  const results = await chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: async (targetUrl) => {
      try {
        const resp = await fetch(targetUrl, {
          credentials: "include",
          headers: {
            "Accept": "application/pdf,application/xhtml+xml,text/html;q=0.9,*/*;q=0.8"
          }
        });
        if (!resp.ok) {
          return { error: `Tab fetch failed (${resp.status}: ${resp.statusText})` };
        }

        const disposition = resp.headers.get("content-disposition") || "";
        const contentType = resp.headers.get("content-type") || "";
        const blob = await resp.blob();

        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve({
              success: true,
              dataUrl: reader.result,
              size: blob.size,
              mimeType: contentType || blob.type || "application/pdf",
              contentDisposition: disposition,
              responseUrl: resp.url
            });
          };
          reader.onerror = () => resolve({ error: "Failed to read downloaded data in tab" });
          reader.readAsDataURL(blob);
        });
      } catch (err) {
        return { error: err.message || "Tab fetch network error" };
      }
    },
    args: [url]
  });

  if (results && results[0] && results[0].result) {
    if (results[0].result.error) {
      throw new Error(results[0].result.error);
    }
    if (results[0].result.success) {
      return results[0].result;
    }
  }
  throw new Error("No data returned from tab-context fetch.");
}

/**
 * Downloads the PDF and opens or activates target AI platform
 */
async function processPdfUrl(url, fallbackTitle, sourceTabId, isRetry = false) {
  if (isRestrictedUrl(url)) {
    chrome.runtime.openOptionsPage();
    return;
  }

  if (!sourceTabId) {
    try {
      const [curTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (curTab && curTab.id) sourceTabId = curTab.id;
    } catch (e) {}
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

      console.log("[PDF Import] Inspecting local file via offscreen document:", url);
      const fileInfo = await getLocalFileInfo(url);
      const sizeBytes = fileInfo.size;

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

      if (sizeBytes > thresholdBytes) {
        await openLargePdfDialog({
          url: url,
          filename: filename,
          sizeBytes: sizeBytes,
          sourceTabId: sourceTabId,
          targetAi: aiInfo.id,
          targetAiName: aiInfo.name,
          defaultPrompt: settings.defaultPrompt,
          reuseTab: settings.reuseTab,
          autoAction: settings.largePdfAction
        });
        return;
      }

      // Small file: store directly to storage via offscreen document
      console.log("[PDF Import] Storing local file via offscreen document:", filename);
      await storeLocalFilePendingPdf({
        url: url,
        filename: filename,
        prompt: settings.defaultPrompt,
        targetAi: aiInfo.id,
        targetAiName: aiInfo.name
      });

      await openOrActivateAi(aiInfo, settings.reuseTab);
      setBadge("OK", "#34A853");
      setTimeout(() => clearBadge(), 3000);
      return;
    }

    // 2. Fetch PDF (Direct background fetch with automatic tab-context fallback for 403 / anti-hotlink)
    console.log("[PDF Import] Fetching PDF:", url);
    let blob = null;
    let base64Data = null;
    let filename = "";
    let mimeType = "application/pdf";
    let sizeBytes = 0;

    try {
      const response = await fetch(url, {
        credentials: "include",
        headers: {
          "Accept": "application/pdf,application/xhtml+xml,text/html;q=0.9,*/*;q=0.8"
        }
      });

      const contentType = response.headers.get("content-type") || "";

      if (!response.ok || (contentType.includes("text/html") && isLikelyPdf(url, fallbackTitle))) {
        if (!isRetry && (response.status === 403 || response.status === 401 || response.status === 503 || contentType.includes("text/html"))) {
          console.warn(`[PDF Import] Direct fetch returned ${response.status} (${contentType}). Opening protected tab...`);
          return await handleProtectedPdfViaTab(url, fallbackTitle);
        }
        throw new Error(`Download error (${response.status}: ${response.statusText})`);
      }

      filename = extractFilename(response, url, fallbackTitle);
      if (!filename.toLowerCase().endsWith(".pdf")) {
        filename += ".pdf";
      }

      const contentLength = response.headers.get("content-length");
      if (contentLength) {
        sizeBytes = parseInt(contentLength, 10);
        if (!isNaN(sizeBytes)) {
          if (sizeBytes > absoluteMaxBytes) {
            handleSizeLimitExceeded(sizeBytes, absoluteMaxBytes);
            return;
          }
          if (sizeBytes > thresholdBytes) {
            await openLargePdfDialog({
              url: url,
              filename: filename,
              sizeBytes: sizeBytes,
              sourceTabId: sourceTabId,
              targetAi: aiInfo.id,
              targetAiName: aiInfo.name,
              defaultPrompt: settings.defaultPrompt,
              reuseTab: settings.reuseTab,
              autoAction: settings.largePdfAction
            });
            return;
          }
        }
      }

      blob = await response.blob();
      sizeBytes = blob.size;
      mimeType = blob.type || "application/pdf";

      if (sizeBytes > absoluteMaxBytes) {
        handleSizeLimitExceeded(sizeBytes, absoluteMaxBytes);
        return;
      }

      if (sizeBytes > thresholdBytes) {
        await openLargePdfDialog({
          url: url,
          filename: filename,
          sizeBytes: sizeBytes,
          sourceTabId: sourceTabId,
          targetAi: aiInfo.id,
          targetAiName: aiInfo.name,
          defaultPrompt: settings.defaultPrompt,
          reuseTab: settings.reuseTab,
          autoAction: settings.largePdfAction
        });
        return;
      }

      base64Data = await blobToBase64(blob);
    } catch (bgFetchErr) {
      console.warn("[PDF Import] Direct background fetch failed:", bgFetchErr.message);

      // If direct background fetch failed due to 403/401/503 or network protection and hasn't been retried
      if (!isRetry && (
        bgFetchErr.message.includes("403") ||
        bgFetchErr.message.includes("401") ||
        bgFetchErr.message.includes("503") ||
        bgFetchErr.message.includes("Failed to fetch")
      )) {
        console.log(`[PDF Import] Attempting protected PDF tab navigation fallback for: ${url}`);
        return await handleProtectedPdfViaTab(url, fallbackTitle);
      }

      // If already retried or source tab exists, fallback to fetching inside webpage context
      if (sourceTabId) {
        console.log(`[PDF Import] Attempting tab-context fetch fallback in tab #${sourceTabId}...`);
        try {
          const tabResult = await fetchPdfViaTab(sourceTabId, url);
          base64Data = tabResult.dataUrl;
          sizeBytes = tabResult.size;
          mimeType = tabResult.mimeType || "application/pdf";

          if (sizeBytes > absoluteMaxBytes) {
            handleSizeLimitExceeded(sizeBytes, absoluteMaxBytes);
            return;
          }

          filename = extractFilename(tabResult.contentDisposition, tabResult.responseUrl || url, fallbackTitle);
          if (!filename.toLowerCase().endsWith(".pdf")) {
            filename += ".pdf";
          }

          if (sizeBytes > thresholdBytes) {
            await openLargePdfDialog({
              url: url,
              filename: filename,
              sizeBytes: sizeBytes,
              sourceTabId: sourceTabId,
              targetAi: aiInfo.id,
              targetAiName: aiInfo.name,
              defaultPrompt: settings.defaultPrompt,
              reuseTab: settings.reuseTab,
              autoAction: settings.largePdfAction
            });
            return;
          }

          console.log(`[PDF Import] Tab-context fetch succeeded for ${filename} (${(sizeBytes / 1024 / 1024).toFixed(2)} MB)`);
        } catch (tabFetchErr) {
          console.error("[PDF Import] Tab-context fetch fallback also failed:", tabFetchErr);
          throw bgFetchErr;
        }
      } else {
        throw bgFetchErr;
      }
    }

    console.log(`[PDF Import] PDF ready: ${filename}, size: ${(sizeBytes / 1024 / 1024).toFixed(2)} MB`);

    // 4. Store pending PDF
    await chrome.storage.local.set({
      pendingPdf: {
        filename: filename,
        dataUrl: base64Data,
        size: sizeBytes,
        mimeType: mimeType,
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
 * Sanitizes filename by stripping raw HTML tags, publisher slug artifacts, and illegal characters
 */
function sanitizeFilename(name) {
  if (!name) return "";
  let clean = name;
  // Decode HTML entities
  clean = clean
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'");
  // Strip raw HTML tags (e.g. <div class="title">...</div>, <span>, <i>, <b>)
  clean = clean.replace(/<[^>]*>/g, " ");
  // Strip publisher slug artifacts like div-class-title-...-div (e.g. Cambridge Core)
  clean = clean.replace(/^(?:div[-_]?class[-_]?title[-_]?|div[-_]?title[-_]?)/i, "");
  clean = clean.replace(/[-_]div(?=\.pdf$|$)/i, "");
  // Replace illegal filename characters
  clean = clean.replace(/[\\/:*?"<>|]/g, "_");
  // Normalize whitespace and underscores
  clean = clean.replace(/\s+/g, " ").replace(/_+/g, "_").trim();
  clean = clean.replace(/^[_\s-]+|[_\s-]+$/g, "");
  return clean;
}

/**
 * Extract meaningful filename
 */
function extractFilename(responseOrDisposition, url, fallbackTitle) {
  let disposition = "";
  if (typeof responseOrDisposition === "string") {
    disposition = responseOrDisposition;
  } else if (responseOrDisposition && typeof responseOrDisposition.headers?.get === "function") {
    disposition = responseOrDisposition.headers.get("content-disposition") || "";
  }
  if (disposition) {
    const matchUtf8 = disposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (matchUtf8 && matchUtf8[1]) {
      const decoded = decodeURIComponent(matchUtf8[1].replace(/["']/g, ""));
      return sanitizeFilename(decoded);
    }
    const matchSimple = disposition.match(/filename="?([^";]+)"?/i);
    if (matchSimple && matchSimple[1]) {
      return sanitizeFilename(matchSimple[1].trim());
    }
  }

  try {
    const parsedUrl = new URL(url);
    const pathname = parsedUrl.pathname;
    const parts = pathname.split("/").filter(Boolean);
    if (parts.length > 0) {
      const lastPart = decodeURIComponent(parts[parts.length - 1]);
      if (lastPart.toLowerCase().endsWith(".pdf")) {
        const sanitized = sanitizeFilename(lastPart);
        if (sanitized && sanitized !== ".pdf") {
          return sanitized.endsWith(".pdf") ? sanitized : sanitized + ".pdf";
        }
      }
      if (parts.length >= 2 && lastPart) {
        const sanitized = sanitizeFilename(lastPart);
        if (sanitized && sanitized !== ".pdf") {
          return sanitized.endsWith(".pdf") ? sanitized : sanitized + ".pdf";
        }
      }
    }
  } catch (e) {}

  if (fallbackTitle && fallbackTitle !== "document.pdf") {
    const cleaned = sanitizeFilename(fallbackTitle);
    if (cleaned.length > 0 && cleaned !== ".pdf") {
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
  chrome.notifications.create({
    type: "basic",
    iconUrl: "icons/icon128.png",
    title: "PDFImport",
    message: String(message || "Failed to process PDF.")
  }).catch(() => {});
}
