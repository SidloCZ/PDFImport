/**
 * Background Service Worker pro PDF to Gemini Fast Import
 */

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

  const titleCurrent = lang === "cs" ? "Odeslat PDF do Gemini (Alt+G)" : "Send PDF to Gemini (Alt+G)";
  const titleLink = lang === "cs" ? "Odeslat odkazované PDF do Gemini" : "Send linked PDF to Gemini";

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
}

chrome.runtime.onInstalled.addListener(setupContextMenus);
chrome.runtime.onStartup.addListener(setupContextMenus);
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "LANGUAGE_CHANGED") {
    setupContextMenus();
  }
});
setupContextMenus();

// Obsluha kliknutí na ikonu na liště
chrome.action.onClicked.addListener(async (tab) => {
  if (tab && tab.url) {
    await processPdfUrl(tab.url, tab.title || "document.pdf", tab.id);
  }
});

// Obsluha klávesové zkratky (např. Alt+G)
chrome.commands.onCommand.addListener(async (command) => {
  if (command === "send-pdf-to-gemini") {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTab && activeTab.url) {
      await processPdfUrl(activeTab.url, activeTab.title || "document.pdf", activeTab.id);
    }
  }
});

// Obsluha položek v kontextovém menu
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "send_link_pdf" && info.linkUrl) {
    await processPdfUrl(info.linkUrl, "document.pdf", tab ? tab.id : null);
  } else if (info.menuItemId === "send_current_pdf" && tab && tab.url) {
    await processPdfUrl(tab.url, tab.title || "document.pdf", tab.id);
  }
});

const MAX_PDF_SIZE_MB = 50;
const MAX_PDF_SIZE_BYTES = MAX_PDF_SIZE_MB * 1024 * 1024;

/**
 * Zpracuje PDF adresu, stáhne data a předá je do záložky Gemini
 */
async function processPdfUrl(url, fallbackTitle, sourceTabId) {
  try {
    setBadge("...", "#4E82EE");

    // 1. Zjistíme, zda jde o file:/// URL a zda máme potřebná oprávnění
    const isFileUrl = url.startsWith("file://");
    if (isFileUrl) {
      const isAllowed = await chrome.extension.isAllowedFileSchemeAccess();
      if (!isAllowed) {
        setBadge("ERR", "#D32F2F");
        showFileAccessWarning();
        return;
      }
    }

    // 2. Rychlá kontrola velikosti před plným stažením pomocí HEAD požadavku (pokud jde o HTTP/HTTPS)
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
        // Některé servery nepodporují HEAD nebo blokují CORS; pokračujeme k GET
      }
    }

    // 3. Stažení PDF souboru
    console.log("[PDF Import] Stahuji PDF:", url);
    const response = await fetch(url, {
      credentials: "include" // Pro zachování cookies na vědeckých portálech
    });

    if (!response.ok) {
      throw new Error(`Chyba při stahování (${response.status}: ${response.statusText})`);
    }

    // Kontrola hlavičky Content-Length z GET odpovědi
    const contentLength = response.headers.get("content-length");
    if (contentLength) {
      const sizeBytes = parseInt(contentLength, 10);
      if (!isNaN(sizeBytes) && sizeBytes > MAX_PDF_SIZE_BYTES) {
        handleSizeLimitExceeded(sizeBytes, MAX_PDF_SIZE_BYTES);
        return;
      }
    }

    // Určení názvu souboru
    let filename = extractFilename(response, url, fallbackTitle);
    if (!filename.toLowerCase().endsWith(".pdf")) {
      filename += ".pdf";
    }

    // Načtení dat a kontrola reálné velikosti blob
    const blob = await response.blob();
    if (blob.size > MAX_PDF_SIZE_BYTES) {
      handleSizeLimitExceeded(blob.size, MAX_PDF_SIZE_BYTES);
      return;
    }

    const base64Data = await blobToBase64(blob);

    console.log(`[PDF Import] PDF úspěšně načteno: ${filename}, velikost: ${(blob.size / 1024 / 1024).toFixed(2)} MB`);

    // 4. Načtení uživatelských předvoleb
    const settings = await chrome.storage.sync.get({
      reuseTab: true,
      defaultPrompt: ""
    });

    // 4. Uložení připraveného PDF do lokálního úložiště
    await chrome.storage.local.set({
      pendingPdf: {
        filename: filename,
        dataUrl: base64Data,
        size: blob.size,
        mimeType: blob.type || "application/pdf",
        prompt: settings.defaultPrompt,
        timestamp: Date.now()
      }
    });

    // 5. Nalezení nebo otevření záložky Gemini
    await openOrActivateGemini(settings.reuseTab);
    setBadge("OK", "#34A853");
    setTimeout(() => clearBadge(), 3000);

  } catch (err) {
    console.error("[PDF Import] Chyba:", err);
    setBadge("ERR", "#D32F2F");
    setTimeout(() => clearBadge(), 4000);
    notifyError(err.message || "Nepodařilo se stáhnout PDF soubor.");
  }
}

/**
 * Nalezne existující záložku Gemini nebo vytvoří novou a pošle signál k vložení
 */
async function openOrActivateGemini(reuseTab) {
  let targetTab = null;

  if (reuseTab) {
    const tabs = await chrome.tabs.query({ url: "*://gemini.google.com/*" });
    if (tabs && tabs.length > 0) {
      // Preferujeme záložku v aktuálním okně nebo první nalezenou
      targetTab = tabs[0];
      await chrome.tabs.update(targetTab.id, { active: true });
      if (targetTab.windowId) {
        await chrome.windows.update(targetTab.windowId, { focused: true });
      }
    }
  }

  if (!targetTab) {
    targetTab = await chrome.tabs.create({
      url: "https://gemini.google.com/app",
      active: true
    });
  }

  // Pošleme notifikaci do záložky (pokud už je načtená)
  setTimeout(() => {
    chrome.tabs.sendMessage(targetTab.id, { action: "PROCESS_PENDING_PDF" }).catch(() => {
      // Pokud content script ještě neběží (např. nová záložka se načítá),
      // vyzvedne si data sám z chrome.storage.local po startu.
    });
  }, 400);
}

/**
 * Pomocná funkce pro extrakci smysluplného názvu souboru
 */
function extractFilename(response, url, fallbackTitle) {
  // Zkouška Content-Disposition hlavičky
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

  // Zkouška z URL adresy
  try {
    const parsedUrl = new URL(url);
    const pathname = parsedUrl.pathname;
    const parts = pathname.split("/").filter(Boolean);
    if (parts.length > 0) {
      const lastPart = decodeURIComponent(parts[parts.length - 1]);
      if (lastPart.toLowerCase().endsWith(".pdf")) {
        return lastPart;
      }
      // Vědecké články např. doi/pdf/10.1128/aem.00763-26 -> aem.00763-26.pdf
      if (parts.length >= 2 && lastPart) {
        return lastPart + ".pdf";
      }
    }
  } catch (e) {
    // Ignorovat chybu parsování URL
  }

  // Fallback z titulku záložky
  if (fallbackTitle && fallbackTitle !== "document.pdf") {
    const cleaned = fallbackTitle.replace(/[\\/:*?"<>|]/g, "_").trim();
    if (cleaned.length > 0) {
      return cleaned.endsWith(".pdf") ? cleaned : cleaned + ".pdf";
    }
  }

  const prefix = chrome.i18n.getMessage("defaultFileNamePrefix") || "document_";
  return prefix + Date.now().toString().slice(-4) + ".pdf";
}

/**
 * Převede Blob na Base64 Data URL
 */
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Nastaví odznak na ikoně
 */
function setBadge(text, color) {
  chrome.action.setBadgeText({ text });
  if (color) {
    chrome.action.setBadgeBackgroundColor({ color });
  }
}

function clearBadge() {
  chrome.action.setBadgeText({ text: "" });
}

/**
 * Upozornění na chybějící oprávnění k lokálním souborům
 */
function showFileAccessWarning() {
  chrome.notifications.create({
    type: "basic",
    iconUrl: "icons/icon128.png",
    title: chrome.i18n.getMessage("fileAccessWarningTitle") || "File URL permission required",
    message: chrome.i18n.getMessage("fileAccessWarningMessage") || "To import 'file:///' local files, please enable 'Allow access to file URLs' on the browser extensions page."
  }).catch(() => {
    // Fallback pokud notifications API není dostupné
    console.warn("[PDF Import] Please enable 'Allow access to file URLs' in extension settings");
  });
}

/**
 * Upozornění na překročení maximální velikosti PDF
 */
function handleSizeLimitExceeded(sizeBytes, maxBytes) {
  const sizeMb = (sizeBytes / (1024 * 1024)).toFixed(1);
  const limitMb = (maxBytes / (1024 * 1024)).toFixed(0);

  console.warn(`[PDF Import] PDF soubor přesahuje limit: ${sizeMb} MB > ${limitMb} MB`);
  setBadge("SIZE", "#D32F2F");
  setTimeout(() => clearBadge(), 5000);

  const title = chrome.i18n.getMessage("fileSizeLimitErrorTitle") || "PDF file is too large";
  const rawMsg = chrome.i18n.getMessage("fileSizeLimitErrorMessage", [sizeMb, limitMb]);
  const message = rawMsg || `The file size (${sizeMb} MB) exceeds the maximum allowed limit of ${limitMb} MB for Gemini.`;

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

