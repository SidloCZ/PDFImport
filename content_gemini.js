/**
 * Content Script pro Google Gemini (https://gemini.google.com/*)
 * Automatické vkládání PDF s interaktivním Debug panelem
 */

(() => {
  let isProcessing = false;
  let lastReceivedFile = null;
  const debugLogs = [];

  function log(msg, type = "info") {
    const time = new Date().toLocaleTimeString();
    const entry = `[${time}] ${msg}`;
    console.log(`[PDF Import] ${entry}`);
    debugLogs.push({ time, msg, type });
    updateDebugUI();
  }

  // Inicializace Debug UI
  createDebugPanel();

  // Naslouchání zprávám z background skriptu
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    log(`Přijata zpráva: ${message.action}`);
    if (message.action === "PROCESS_PENDING_PDF") {
      checkAndInsertPdf();
      sendResponse({ status: "processing" });
    }
    return true;
  });

  // Kontrola po načtení stránky
  window.addEventListener("load", () => {
    log("Stránka načtena (load event)");
    setTimeout(checkAndInsertPdf, 1500);
  });

  // Kontrola při přímém spuštění
  setTimeout(checkAndInsertPdf, 1500);

  /**
   * Zkontroluje pending PDF v úložišti a provede vložení
   */
  async function checkAndInsertPdf() {
    if (isProcessing) {
      log("Zpracování již probíhá, přeskakuji.");
      return;
    }

    try {
      const storage = await chrome.storage.local.get("pendingPdf");
      const pending = storage.pendingPdf;

      if (!pending || !pending.dataUrl) {
        log("Žádné čekající PDF v úložišti.");
        return;
      }

      if (Date.now() - pending.timestamp > 300000) {
        log("Čekající PDF je starší než 5 minut, mažu.");
        await chrome.storage.local.remove("pendingPdf");
        return;
      }

      isProcessing = true;
      log(`Nalezeno PDF v úložišti: ${pending.filename} (${(pending.size / 1024).toFixed(1)} KB)`);
      showToast(`Zpracovávám: <strong>${escapeHtml(pending.filename)}</strong>...`, "info");

      // Převod zpět na File
      const res = await fetch(pending.dataUrl);
      const blob = await res.blob();
      const file = new File([blob], pending.filename, {
        type: pending.mimeType || "application/pdf",
        lastModified: Date.now()
      });

      lastReceivedFile = file;

      // Počkáme na načtení chatu
      log("Hledám chatovací pole Gemini...");
      const ready = await waitForGeminiReady(12000);
      if (!ready) {
        log("Chatovací pole Gemini nebylo nalezeno v limitu 12s!", "error");
        showToast("Vstupní pole chatu Gemini nebylo nalezeno.", "warning");
        isProcessing = false;
        return;
      }

      // Provedení pokusu o vložení
      await executeUploadWorkflow(file, pending.prompt);

      // Vymažeme až po zpracování
      await chrome.storage.local.remove("pendingPdf");

    } catch (err) {
      log(`Chyba: ${err.message}`, "error");
      console.error(err);
      showToast("Došlo k chybě při vkládání PDF.", "error");
    } finally {
      isProcessing = false;
    }
  }

  /**
   * Kompletní workflow nahrání a ověření
   */
  async function executeUploadWorkflow(file, optionalPrompt) {
    log(`--- Zahajuji vkládání: ${file.name} ---`);
    let success = false;

    // KROK 1: Analýza stávajících inputů
    log("KROK 1: Hledám vhodné input[type='file']...");
    const inputs = Array.from(document.querySelectorAll('input[type="file"]'));
    log(`Nalezeno celkem ${inputs.length} prvků input[type='file'] na stránce.`);

    inputs.forEach((inp, i) => {
      log(`  Input #${i}: accept="${inp.accept}", id="${inp.id}", class="${inp.className.slice(0, 40)}"`);
    });

    // Zkusíme najít input specifický pro chat (nebo s accept obsahujícím pdf či *)
    const chatInput = inputs.find(inp => {
      const acc = (inp.accept || "").toLowerCase();
      return acc.includes("pdf") || acc.includes("*") || acc.includes("document") || inp.multiple;
    }) || inputs[0];

    if (chatInput) {
      log(`Zkouším vložit do nalezeného input[type='file'] (accept="${chatInput.accept}")...`);
      const assigned = assignFilesToInput(chatInput, file);
      if (assigned) {
        log("Čekám 1.5s na reakci Gemini...");
        await sleep(1500);
        if (checkIfAttachmentAppeared()) {
          log("✅ Soubor detekován v rozhraní chatu po input change!", "success");
          success = true;
        } else {
          log("Input change nevedl k zobrazení přílohy, zkouším další metody.");
        }
      }
    }

    // KROK 2: Kliknutí na tlačítko '+' a hledání menu "Nahrát soubor"
    if (!success) {
      log("KROK 2: Hledám tlačítko '+' v liště zprávy...");
      const plusBtn = findPlusButton();
      if (plusBtn) {
        log(`Tlačítko '+' nalezeno (${plusBtn.tagName}, aria-label="${plusBtn.getAttribute('aria-label')}"). Klikám...`);
        plusBtn.click();
        await sleep(600);

        // Hledáme položku menu
        log("Hledám položku v otevřeném menu (Upload / Nahrát)...");
        const menuItems = Array.from(document.querySelectorAll('[role="menuitem"], .mat-mdc-menu-item, mat-menu-item, button'));
        const uploadItem = menuItems.find(el => {
          const t = (el.textContent || el.getAttribute('aria-label') || "").toLowerCase();
          return t.includes("nahrát") || t.includes("upload") || t.includes("soubor") || t.includes("z tohoto zařízení");
        });

        if (uploadItem) {
          log(`Nalezena položka menu: "${uploadItem.textContent.trim().slice(0, 30)}".`);
          
          // Zkontrolujeme, zda se neobjevil nový input[type='file']
          const newInputs = Array.from(document.querySelectorAll('input[type="file"]'));
          log(`Po otevření menu je na stránce ${newInputs.length} input[type='file'].`);
          
          const freshInput = newInputs[newInputs.length - 1];
          if (freshInput) {
            log("Zkouším přiřadit soubor do nejnovějšího input[type='file']...");
            assignFilesToInput(freshInput, file);
            await sleep(1500);
            if (checkIfAttachmentAppeared()) {
              success = true;
            }
          }
        } else {
          log("Položka menu pro nahrání souboru nebyla identifikována.");
        }
      } else {
        log("Tlačítko '+' nebylo nalezeno.");
      }
    }

    // KROK 3: Simulace Drag & Drop na chat a celou stránku
    if (!success) {
      log("KROK 3: Zkouším simulaci Drag & Drop...");
      const targets = [
        document.querySelector("rich-textarea"),
        document.querySelector(".input-area-container"),
        document.querySelector('div[contenteditable="true"]'),
        document.querySelector("main"),
        document.body
      ].filter(Boolean);

      for (const target of targets) {
        log(`Simuluji Drop na <${target.tagName.toLowerCase()} class="${(target.className || '').slice(0, 30)}">...`);
        simulateDrop(target, file);
        await sleep(800);
        if (checkIfAttachmentAppeared()) {
          log("[OK] Příloha se úspěšně objevila po Drag & Drop!", "success");
          success = true;
          break;
        }
      }
    }

    // KROK 4: Simulace Clipboard Paste
    if (!success) {
      log("KROK 4: Zkouším simulaci Clipboard Paste...");
      const editable = findChatInput();
      if (editable) {
        editable.focus();
        const dt = new DataTransfer();
        dt.items.add(file);
        const pasteEvent = new ClipboardEvent("paste", {
          bubbles: true,
          cancelable: true,
          clipboardData: dt
        });
        editable.dispatchEvent(pasteEvent);
        log("Paste událost odeslána, čekám...");
        await sleep(1500);
        if (checkIfAttachmentAppeared()) {
          log("[OK] Příloha se objevila po Paste události!", "success");
          success = true;
        }
      }
    }

    // Vyhodnocení
    if (success) {
      showToast(`Soubor <strong>${escapeHtml(file.name)}</strong> byl vložen do Gemini!`, "success");
      if (optionalPrompt && optionalPrompt.trim().length > 0) {
        await insertPromptText(optionalPrompt.trim());
      }
    } else {
      showToast(`Nepodařilo se vložit soubor automaticky. Podrobnosti v Debug panelu.`, "warning");
      log("[CHYBA] Žádná z metod nevedla k zobrazení přílohy v Gemini.", "error");
    }
  }

  function assignFilesToInput(input, file) {
    try {
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
      input.dispatchEvent(new Event("input", { bubbles: true }));
      return true;
    } catch (e) {
      log(`Chyba při assignFilesToInput: ${e.message}`, "error");
      return false;
    }
  }

  function simulateDrop(element, file) {
    const dt = new DataTransfer();
    dt.items.add(file);

    element.dispatchEvent(new DragEvent("dragenter", { bubbles: true, cancelable: true, dataTransfer: dt }));
    element.dispatchEvent(new DragEvent("dragover", { bubbles: true, cancelable: true, dataTransfer: dt }));
    element.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: dt }));
  }

  /**
   * Zkontroluje, zda se v Gemini UI reálně objevila připojená příloha
   */
  function checkIfAttachmentAppeared() {
    const attachmentSelectors = [
      'mat-chip',
      '[class*="attachment"]',
      '[class*="file-preview"]',
      '[class*="file-chip"]',
      'button[aria-label*="odstranit" i]',
      'button[aria-label*="remove" i]',
      'button[aria-label*="delete" i]',
      '.file-container'
    ];

    for (const sel of attachmentSelectors) {
      const el = document.querySelector(sel);
      if (el && el.offsetParent !== null) {
        log(`Detekována příloha přes selektor: "${sel}"`);
        return true;
      }
    }
    return false;
  }

  function findPlusButton() {
    const chatInput = findChatInput();
    const container = chatInput ? (chatInput.closest('.input-area-container, .input-area, form') || chatInput.parentElement.parentElement) : document;

    const buttons = Array.from(container.querySelectorAll("button, [role='button']"));
    
    // Hledáme tlačítko s ikonou plus nebo příslušným aria-label
    return buttons.find(btn => {
      const label = (btn.getAttribute("aria-label") || btn.getAttribute("title") || "").toLowerCase();
      if (label.includes("přidat") || label.includes("add") || label.includes("upload") || label.includes("soubor")) {
        return true;
      }
      // Hledání SVG s křížkem / plusem
      const svgs = btn.querySelectorAll("svg");
      return svgs.length > 0;
    });
  }

  function waitForGeminiReady(timeoutMs = 12000) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const interval = setInterval(() => {
        if (findChatInput()) {
          clearInterval(interval);
          resolve(true);
        } else if (Date.now() - startTime > timeoutMs) {
          clearInterval(interval);
          resolve(false);
        }
      }, 250);
    });
  }

  function findChatInput() {
    return (
      document.querySelector('rich-textarea [contenteditable="true"]') ||
      document.querySelector('.ql-editor[contenteditable="true"]') ||
      document.querySelector('div[contenteditable="true"]') ||
      document.querySelector('textarea')
    );
  }

  async function insertPromptText(text) {
    const input = findChatInput();
    if (!input) return;

    input.focus();
    await sleep(200);
    const inserted = document.execCommand("insertText", false, text);
    if (!inserted) {
      input.textContent = text;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }

  /**
   * Vytvoření interaktivního Debug Panelu na stránce (Neo-Brutalist Design)
   */
  function createDebugPanel() {
    if (document.getElementById("pdf-import-debug-hud")) return;

    const hud = document.createElement("div");
    hud.id = "pdf-import-debug-hud";
    hud.style.cssText = `
      position: fixed;
      top: 16px;
      right: 16px;
      width: 440px;
      max-height: 85vh;
      background: #f4efe6;
      border: 3px solid #000000;
      box-shadow: 5px 5px 0px 0px #000000;
      color: #000000;
      font-family: 'Space Mono', monospace;
      font-size: 11px;
      z-index: 9999999;
      display: none;
      flex-direction: column;
      overflow: hidden;
      transition: transform 0.15s ease;
    `;

    hud.innerHTML = `
      <div style="background: #fef08a; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #000000;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="background: #000000; color: #ffffff; font-size: 10px; font-weight: 900; padding: 1px 5px;">DEBUG</span>
          <strong style="color: #000000; font-size: 13px; font-family: 'Space Grotesk', sans-serif; font-weight: 900;">PDF TO AI // PANEL (Alt+D)</strong>
        </div>
        <div style="display: flex; gap: 6px;">
          <button id="pdf-debug-clear" style="background: #ffffff; border: 2px solid #000000; box-shadow: 2px 2px 0px 0px #000000; color: #000000; font-weight: bold; padding: 3px 8px; cursor: pointer; font-size: 10px; font-family: inherit;">VYČISTIT</button>
          <button id="pdf-debug-toggle" style="background: #ffe600; border: 2px solid #000000; box-shadow: 2px 2px 0px 0px #000000; color: #000000; font-weight: bold; padding: 3px 8px; cursor: pointer; font-size: 10px; font-family: inherit;">SKRÝT</button>
        </div>
      </div>
      <div id="pdf-debug-logs" style="padding: 12px; flex: 1; overflow-y: auto; max-height: 400px; display: flex; flex-direction: column; gap: 6px; line-height: 1.4; background: #ffffff; font-weight: 700;">
        <div style="color: #666666;">Čekám na aktivitu...</div>
      </div>
      <div style="padding: 10px; background: #fef08a; border-top: 3px solid #000000; display: flex; gap: 8px; flex-wrap: wrap;">
        <button id="pdf-btn-inspect" style="flex: 1; background: #00d2ff; color: #000000; border: 2px solid #000000; box-shadow: 2px 2px 0px 0px #000000; padding: 8px; cursor: pointer; font-weight: 900; font-size: 11px; font-family: 'Space Grotesk', sans-serif; text-transform: uppercase;">PROZKOUMAT DOM</button>
        <button id="pdf-btn-retry" style="flex: 1; background: #ff2a85; color: #ffffff; border: 2px solid #000000; box-shadow: 2px 2px 0px 0px #000000; padding: 8px; cursor: pointer; font-weight: 900; font-size: 11px; font-family: 'Space Grotesk', sans-serif; text-transform: uppercase;">OPAKOVAT VLOŽENÍ</button>
      </div>
    `;

    document.body.appendChild(hud);

    document.getElementById("pdf-debug-clear").addEventListener("click", () => {
      debugLogs.length = 0;
      updateDebugUI();
    });

    document.getElementById("pdf-debug-toggle").addEventListener("click", () => {
      toggleDebugHUD();
    });

    document.getElementById("pdf-btn-inspect").addEventListener("click", inspectDOM);

    document.getElementById("pdf-btn-retry").addEventListener("click", async () => {
      if (lastReceivedFile) {
        log("Spouštím manuální opakování...");
        await executeUploadWorkflow(lastReceivedFile, "");
      } else {
        log("Nemám uložený žádný soubor v paměti. Stiskněte Alt+G na PDF stránce.", "warning");
      }
    });

    // Klávesová zkratka Alt+D nebo Ctrl+Shift+D pro zobrazení/skrytí Debug Panelu
    window.addEventListener("keydown", (e) => {
      if ((e.altKey && e.key.toLowerCase() === "d") || (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "d")) {
        e.preventDefault();
        toggleDebugHUD();
      }
    });
  }

  function toggleDebugHUD() {
    const hud = document.getElementById("pdf-import-debug-hud");
    if (!hud) return;
    const isHidden = hud.style.display === "none";
    hud.style.display = isHidden ? "flex" : "none";
    if (isHidden) {
      updateDebugUI();
    }
  }

  function showDebugPanel() {
    const hud = document.getElementById("pdf-import-debug-hud");
    if (hud) {
      hud.style.display = "flex";
      updateDebugUI();
    }
  }

  function updateDebugUI() {
    const logsEl = document.getElementById("pdf-debug-logs");
    if (!logsEl) return;

    logsEl.innerHTML = debugLogs.map(item => {
      let bg = "#f8fafc";
      let border = "#000000";
      let color = "#000000";

      if (item.type === "error") {
        bg = "#fee2e2";
        border = "#ef4444";
        color = "#991b1b";
      } else if (item.type === "warning") {
        bg = "#fef3c7";
        border = "#f59e0b";
        color = "#92400e";
      } else if (item.type === "success") {
        bg = "#dcfce7";
        border = "#10b981";
        color = "#065f46";
      }

      return `<div style="background: ${bg}; border: 1px solid ${border}; border-left: 4px solid ${border}; padding: 4px 8px; color: ${color}; word-break: break-all;"><span style="color: #64748b; font-size: 10px;">[${item.time}]</span> ${escapeHtml(item.msg)}</div>`;
    }).join("");

    logsEl.scrollTop = logsEl.scrollHeight;
  }

  /**
   * Detailní diagnostika prvků chatu
   */
  function inspectDOM() {
    log("=== INSPEKCE DOM STRUKTURY GEMINI ===");
    const input = findChatInput();
    log(`Chat Input: ${input ? `<${input.tagName.toLowerCase()} class="${input.className}">` : 'NENALEZEN'}`);

    const fileInputs = document.querySelectorAll('input[type="file"]');
    log(`Počet input[type="file"]: ${fileInputs.length}`);
    fileInputs.forEach((inp, i) => {
      log(`  [File #${i}] accept="${inp.accept}" multiple=${inp.multiple} id="${inp.id}" class="${inp.className.slice(0, 30)}"`);
    });

    const buttons = document.querySelectorAll('button, [role="button"]');
    log(`Počet tlačítek celkem: ${buttons.length}`);
    const relevantBtns = Array.from(buttons).filter(b => {
      const t = (b.textContent + " " + b.getAttribute("aria-label") + " " + b.className).toLowerCase();
      return t.includes("add") || t.includes("přidat") || t.includes("upload") || t.includes("nahrát") || t.includes("file");
    });
    log(`Relevantní tlačítka (${relevantBtns.length}):`);
    relevantBtns.forEach((b, i) => {
      log(`  [Btn #${i}] aria-label="${b.getAttribute('aria-label')}" text="${b.textContent.trim().slice(0, 20)}"`);
    });
  }

  /**
   * Neo-Brutalist Toast notifikace
   */
  function showToast(htmlContent, type = "info") {
    let container = document.getElementById("pdf-import-toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "pdf-import-toast-container";
      container.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 999999;
        display: flex;
        flex-direction: column;
        gap: 12px;
        pointer-events: none;
        font-family: 'Space Grotesk', -apple-system, sans-serif;
      `;
      document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    const colors = {
      info: { bg: "#fef08a", tag: "#000000", tagColor: "#ffffff", title: "INFO" },
      success: { bg: "#86efac", tag: "#000000", tagColor: "#ffffff", title: "SUCCESS" },
      warning: { bg: "#fde047", tag: "#ff6b35", tagColor: "#000000", title: "POZOR" },
      error: { bg: "#fca5a5", tag: "#ff2a85", tagColor: "#ffffff", title: "CHYBA" }
    };
    const c = colors[type] || colors.info;

    toast.style.cssText = `
      background: ${c.bg};
      color: #000000;
      border: 3px solid #000000;
      box-shadow: 4px 4px 0px 0px #000000;
      padding: 12px 16px;
      font-size: 13px;
      font-weight: 700;
      line-height: 1.4;
      max-width: 380px;
      opacity: 0;
      transform: translateY(14px);
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      pointer-events: auto;
    `;
    toast.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
        <span style="background: ${c.tag}; color: ${c.tagColor}; font-family: 'Space Mono', monospace; font-size: 10px; font-weight: 900; padding: 1px 5px; border: 1px solid #000000;">${c.title}</span>
        <span style="font-family: 'Space Mono', monospace; font-size: 11px; font-weight: 700;">PDF TO AI</span>
      </div>
      <div>${htmlContent}</div>
    `;
    container.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.opacity = "1";
      toast.style.transform = "translateY(0)";
    });

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(10px)";
      setTimeout(() => toast.remove(), 250);
    }, type === "error" ? 6000 : 3500);
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.innerText = str;
    return div.innerHTML;
  }
})();
