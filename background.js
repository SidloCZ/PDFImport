/**
 * Background Service Worker pro PDF to Gemini Fast Import
 */

// Inicializace kontextového menu při instalaci / startu
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "send_current_pdf",
    title: "✨ Odeslat toto PDF do Gemini (Alt+G)",
    contexts: ["page", "action"]
  });

  chrome.contextMenus.create({
    id: "send_link_pdf",
    title: "✨ Odeslat odkazované PDF do Gemini",
    contexts: ["link"]
  });
});

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

    // 2. Stažení PDF souboru
    console.log("[PDF Import] Stahuji PDF:", url);
    const response = await fetch(url, {
      credentials: "include" // Pro zachování cookies na vědeckých portálech
    });

    if (!response.ok) {
      throw new Error(`Chyba při stahování (${response.status}: ${response.statusText})`);
    }

    // Určení názvu souboru
    let filename = extractFilename(response, url, fallbackTitle);
    if (!filename.toLowerCase().endsWith(".pdf")) {
      filename += ".pdf";
    }

    // Načtení dat a převod na base64
    const blob = await response.blob();
    const base64Data = await blobToBase64(blob);

    console.log(`[PDF Import] PDF úspěšně načteno: ${filename}, velikost: ${(blob.size / 1024 / 1024).toFixed(2)} MB`);

    // 3. Načtení uživatelských předvoleb
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

  return "dokument_" + Date.now().toString().slice(-4) + ".pdf";
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
    title: "Vyžadováno oprávnění pro lokální soubory",
    message: "Pro import souborů 'file:///' povolte v Opeře na stránce opera://extensions volbu 'Povolit přístup k adresám URL souborů'."
  }).catch(() => {
    // Fallback pokud notifications API není dostupné
    console.warn("Povolte 'Povolit přístup k adresám URL souborů' v opera://extensions");
  });
}

function notifyError(message) {
  console.error("[PDF Import Error]", message);
}
