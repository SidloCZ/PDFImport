/**
 * Content Script for PDFImport - Multi-AI Platform Support (Debug Enabled)
 * Supports Top 10 AI platforms (Claude, ChatGPT, Kimi, Hy4/Yuanbao, DeepSeek, Gemini, GLM, Meta AI, Qwen, Grok, Perplexity) + Custom URLs (OpenRouter, etc.)
 */

(() => {
  let isProcessing = false;
  let lastReceivedFile = null;
  let debugModeEnabled = true;
  const debugLogs = [];

  const hostname = window.location.hostname.toLowerCase();

  // Detect active AI platform
  function detectPlatform() {
    if (hostname.includes("claude.ai")) return { id: "claude", name: "Claude" };
    if (hostname.includes("chatgpt.com") || hostname.includes("chat.openai.com")) return { id: "chatgpt", name: "ChatGPT" };
    if (hostname.includes("kimi.com") || hostname.includes("kimi.moonshot.cn")) return { id: "kimi", name: "Kimi" };
    if (hostname.includes("yuanbao.tencent.com") || hostname.includes("hunyuan.tencent.com")) return { id: "tencent", name: "Hy4" };
    if (hostname.includes("deepseek.com")) return { id: "deepseek", name: "DeepSeek" };
    if (hostname.includes("gemini.google.com")) return { id: "gemini", name: "Gemini" };
    if (hostname.includes("chatglm.cn") || hostname.includes("z.ai")) return { id: "glm", name: "GLM" };
    if (hostname.includes("meta.ai")) return { id: "meta", name: "Meta AI" };
    if (hostname.includes("tongyi.ai") || hostname.includes("qwen.ai")) return { id: "qwen", name: "Qwen" };
    if (hostname.includes("grok.com") || hostname.includes("x.com")) return { id: "grok", name: "Grok" };
    if (hostname.includes("perplexity.ai")) return { id: "perplexity", name: "Perplexity" };
    if (hostname.includes("openrouter.ai")) return { id: "openrouter", name: "OpenRouter" };
    return { id: "custom", name: "AI" };
  }

  const currentPlatform = detectPlatform();

  function log(msg, type = "info") {
    const time = new Date().toLocaleTimeString();
    const entry = `[${time}] ${msg}`;
    console.log(`[PDF Import - ${currentPlatform.name}] ${entry}`);
    debugLogs.push({ time, msg, type });
    updateDebugUI();
  }

  // Load debug settings and initialize HUD
  chrome.storage.sync.get({ debugMode: true }).then((settings) => {
    debugModeEnabled = settings.debugMode !== false;
    createDebugPanel();
    createDebugTogglePill();
    log(`Platform initialized: ${currentPlatform.name} (${window.location.hostname})`);
  }).catch(() => {
    createDebugPanel();
    createDebugTogglePill();
    log(`Platform initialized: ${currentPlatform.name}`);
  });

  // Message listener from background worker
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    log(`Received action message: ${message.action}`);
    if (message.action === "PROCESS_PENDING_PDF") {
      openDebugHud();
      checkAndInsertPdf();
      sendResponse({ status: "processing" });
    }
    return true;
  });

  // Check storage on page load
  window.addEventListener("load", () => {
    log("Page load completed");
    setTimeout(checkAndInsertPdf, 1500);
  });

  setTimeout(checkAndInsertPdf, 1500);

  function i18n(key, substitutions, fallback) {
    if (typeof chrome !== "undefined" && chrome.i18n && chrome.i18n.getMessage) {
      const msg = chrome.i18n.getMessage(key, substitutions);
      if (msg) return msg;
    }
    return fallback || key;
  }

  function openDebugHud() {
    const hud = document.getElementById("pdf-import-debug-hud");
    if (hud) hud.style.display = "flex";
  }

  /**
   * Checks local storage for pending PDF and executes insertion
   */
  async function checkAndInsertPdf() {
    if (isProcessing) {
      log("Processing already in progress, skipping.");
      return;
    }

    try {
      const storage = await chrome.storage.local.get("pendingPdf");
      const pending = storage.pendingPdf;

      if (!pending || !pending.dataUrl) {
        return;
      }

      if (Date.now() - pending.timestamp > 300000) {
        log("Pending PDF older than 5 minutes, clearing.");
        await chrome.storage.local.remove("pendingPdf");
        return;
      }

      isProcessing = true;
      openDebugHud();
      const targetAiName = pending.targetAiName || currentPlatform.name;
      log(`Pending PDF found: ${pending.filename} (${(pending.size / 1024).toFixed(1)} KB) targeting ${targetAiName}`);
      showToast(i18n("toastProcessing", [escapeHtml(pending.filename)], `Processing: <strong>${escapeHtml(pending.filename)}</strong>...`), "info");

      // Convert DataURL back to File
      const res = await fetch(pending.dataUrl);
      const blob = await res.blob();
      const file = new File([blob], pending.filename, {
        type: pending.mimeType || "application/pdf",
        lastModified: Date.now()
      });

      lastReceivedFile = file;

      // Wait for chat input
      log(`Waiting for ${targetAiName} chat input ready...`);
      const ready = await waitForChatReady(15000);
      if (!ready) {
        log(`Chat input not found within 15s timeout!`, "error");
        showToast(i18n("toastChatNotFound", [targetAiName], `${targetAiName} chat input was not found within timeout.`), "warning");
        isProcessing = false;
        return;
      }

      // Execute multi-tier upload workflow
      await executeUploadWorkflow(file, pending.prompt, targetAiName);

      // Clear pending PDF upon completion
      await chrome.storage.local.remove("pendingPdf");

    } catch (err) {
      log(`Error: ${err.message}`, "error");
      console.error(err);
      showToast(i18n("toastError", null, "An error occurred while inserting the PDF."), "error");
    } finally {
      isProcessing = false;
    }
  }

  /**
   * Multi-tier resilient upload workflow
   */
  async function executeUploadWorkflow(file, optionalPrompt, targetAiName) {
    log(`--- Starting insertion workflow: ${file.name} ---`);
    let success = false;

    // STEP 1: Look for suitable input[type="file"]
    log("STEP 1: Inspecting input[type='file'] elements...");
    const inputs = Array.from(document.querySelectorAll('input[type="file"]'));
    log(`Found ${inputs.length} input[type='file'] element(s) on page.`);

    inputs.forEach((inp, i) => {
      log(`  Input #${i}: id="${inp.id || ''}", accept="${inp.accept || ''}", visible=${inp.offsetParent !== null}`);
    });

    const chatInput = inputs.find(inp => {
      const acc = (inp.accept || "").toLowerCase();
      return acc.includes("pdf") || acc.includes("txt") || acc.includes("text") || acc.includes("*") || acc.includes("document") || inp.multiple;
    }) || inputs[0];

    if (chatInput) {
      log(`Assigning file to input[type='file'] (accept="${chatInput.accept || 'all'}")...`);
      const assigned = assignFilesToInput(chatInput, file);
      if (assigned) {
        log("Waiting 1.5s for response...");
        await sleep(1500);
        if (checkIfAttachmentAppeared()) {
          log("[OK] File detected in chat interface after input change!", "success");
          success = true;
        } else {
          log("Input change did not result in confirmed attachment chip, trying Step 2.");
        }
      }
    }

    // STEP 2: Click attach / plus button to reveal / trigger input
    if (!success) {
      log("STEP 2: Searching for attach / upload button...");
      const attachBtn = findAttachButton();
      if (attachBtn) {
        const btnLabel = attachBtn.getAttribute("aria-label") || attachBtn.getAttribute("title") || attachBtn.textContent.trim();
        log(`Attach button found (<${attachBtn.tagName.toLowerCase()}> label="${btnLabel}"). Clicking...`);
        attachBtn.click();
        await sleep(600);

        const newInputs = Array.from(document.querySelectorAll('input[type="file"]'));
        log(`After click, ${newInputs.length} input[type='file'] element(s) present.`);

        const menuItems = Array.from(document.querySelectorAll('[role="menuitem"], .mat-mdc-menu-item, button, li, a'));
        const uploadItem = menuItems.find(el => {
          const t = (el.textContent || el.getAttribute("aria-label") || "").toLowerCase();
          return t.includes("upload") || t.includes("nahrát") || t.includes("soubor") || t.includes("file") || t.includes("上传") || t.includes("文件");
        });

        if (uploadItem) {
          log(`Found menu upload item: "${uploadItem.textContent.trim().slice(0, 30)}". Clicking...`);
          uploadItem.click();
          await sleep(500);
        }

        const freshInput = Array.from(document.querySelectorAll('input[type="file"]')).pop();
        if (freshInput) {
          log("Assigning file to latest input[type='file']...");
          assignFilesToInput(freshInput, file);
          await sleep(1500);
          if (checkIfAttachmentAppeared()) {
            log("[OK] File detected in chat interface after attach button trigger!", "success");
            success = true;
          }
        }
      } else {
        log("Attach button not found.");
      }
    }

    // STEP 3: Drag & Drop simulation
    if (!success) {
      log("STEP 3: Simulating Drag & Drop...");
      const targets = [
        findChatInput(),
        document.querySelector("#prompt-textarea"),
        document.querySelector("rich-textarea"),
        document.querySelector(".ProseMirror"),
        document.querySelector(".input-area-container"),
        document.querySelector("form"),
        document.querySelector("main"),
        document.body
      ].filter(Boolean);

      for (const target of targets) {
        log(`Simulating drop on <${target.tagName.toLowerCase()} class="${(target.className || '').slice(0, 30)}">...`);
        simulateDrop(target, file);
        await sleep(800);
        if (checkIfAttachmentAppeared()) {
          log("[OK] Attachment verified after Drag & Drop!", "success");
          success = true;
          break;
        }
      }
    }

    // STEP 4: Clipboard Paste simulation
    if (!success) {
      log("STEP 4: Simulating Clipboard Paste event...");
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
        log("Paste event dispatched, checking...");
        await sleep(1500);
        if (checkIfAttachmentAppeared()) {
          log("[OK] Attachment verified after Paste event!", "success");
          success = true;
        }
      }
    }

    // Evaluate result
    const displayAi = targetAiName || currentPlatform.name;
    if (success) {
      showToast(i18n("toastSuccess", [escapeHtml(file.name), displayAi], `File <strong>${escapeHtml(file.name)}</strong> was inserted into ${displayAi}!`), "success");
      if (optionalPrompt && optionalPrompt.trim().length > 0) {
        log(`Typing prompt text into chat input...`);
        await insertPromptText(optionalPrompt.trim());
      }
    } else {
      openDebugHud();
      showToast(i18n("toastFallbackWarning", null, "Could not insert file automatically. See Debug panel for details."), "warning");
      log("[FAIL] Automatic attachment insertion was not confirmed by DOM.", "error");
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
      log(`Error in assignFilesToInput: ${e.message}`, "error");
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
   * Checks if an attachment card/chip has appeared in the DOM
   */
  function checkIfAttachmentAppeared() {
    const selectors = [
      'mat-chip',
      '[class*="attachment"]',
      '[class*="file-preview"]',
      '[class*="file-chip"]',
      '[class*="file-item"]',
      '[data-testid*="attachment"]',
      '[data-testid*="file"]',
      'button[aria-label*="remove" i]',
      'button[aria-label*="delete" i]',
      'button[aria-label*="odstranit" i]',
      'button[aria-label*="删除" i]',
      '.file-container'
    ];

    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && el.offsetParent !== null) {
        log(`Attachment element verified via selector: "${sel}"`);
        return true;
      }
    }
    return false;
  }

  function findAttachButton() {
    const chatInput = findChatInput();
    const container = chatInput ? (chatInput.closest("form, .input-area-container, .input-area, [class*='chat-input']") || chatInput.parentElement.parentElement) : document;
    const buttons = Array.from(container.querySelectorAll("button, [role='button'], label[for]"));

    return buttons.find(btn => {
      const label = (
        btn.getAttribute("aria-label") ||
        btn.getAttribute("title") ||
        btn.getAttribute("data-testid") ||
        btn.textContent ||
        ""
      ).toLowerCase();

      if (
        label.includes("attach") ||
        label.includes("upload") ||
        label.includes("file") ||
        label.includes("add") ||
        label.includes("připojit") ||
        label.includes("přidat") ||
        label.includes("soubor") ||
        label.includes("上传") ||
        label.includes("文件")
      ) {
        return true;
      }

      return btn.querySelectorAll("svg").length > 0;
    });
  }

  function waitForChatReady(timeoutMs = 15000) {
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
      document.querySelector("#prompt-textarea") ||
      document.querySelector("rich-textarea [contenteditable='true']") ||
      document.querySelector(".ProseMirror[contenteditable='true']") ||
      document.querySelector("#chat-input") ||
      document.querySelector(".ql-editor[contenteditable='true']") ||
      document.querySelector("div[contenteditable='true']") ||
      document.querySelector("textarea")
    );
  }

  async function insertPromptText(text) {
    const input = findChatInput();
    if (!input) return;

    input.focus();
    await sleep(200);

    if (input.tagName.toLowerCase() === "textarea") {
      input.value = text;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    } else {
      const inserted = document.execCommand("insertText", false, text);
      if (!inserted) {
        input.textContent = text;
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }
  }

  /**
   * Generates an in-memory valid PDF file for immediate testing
   */
  function createSamplePdfFile() {
    const minimalPdf = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >> endobj
4 0 obj << /Length 44 >> stream
BT /F1 24 Tf 100 700 Td (PDFImport Test Document) ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000010 00000 n 
0000000060 00000 n 
0000000117 00000 n 
0000000213 00000 n 
trailer << /Size 5 /Root 1 0 R >>
startxref
306
%%EOF`;
    const blob = new Blob([minimalPdf], { type: "application/pdf" });
    return new File([blob], `test_sample_${Date.now().toString().slice(-4)}.pdf`, {
      type: "application/pdf",
      lastModified: Date.now()
    });
  }

  /**
   * Exports full diagnostic report to clipboard
   */
  function copyDebugLogs() {
    const time = new Date().toISOString();
    const chatInput = findChatInput();
    const attachBtn = findAttachButton();
    const inputs = Array.from(document.querySelectorAll('input[type="file"]'));

    let report = `=== PDFIMPORT DIAGNOSTIC REPORT ===\n`;
    report += `Timestamp: ${time}\n`;
    report += `Platform: ${currentPlatform.name} (id: ${currentPlatform.id})\n`;
    report += `URL: ${window.location.href}\n`;
    report += `Title: ${document.title}\n`;
    report += `User-Agent: ${navigator.userAgent}\n`;
    report += `Viewport: ${window.innerWidth}x${window.innerHeight}\n\n`;

    report += `--- DOM ELEMENTS ---\n`;
    report += `File inputs count: ${inputs.length}\n`;
    inputs.forEach((inp, idx) => {
      report += `  [Input #${idx}] accept="${inp.accept || ''}" id="${inp.id || ''}" class="${inp.className || ''}" visible=${inp.offsetParent !== null}\n`;
    });

    report += `Chat input: ${chatInput ? `<${chatInput.tagName.toLowerCase()} id="${chatInput.id || ''}" class="${chatInput.className || ''}" contenteditable="${chatInput.getAttribute('contenteditable')}">` : "NOT FOUND"}\n`;
    report += `Attach button: ${attachBtn ? `<${attachBtn.tagName.toLowerCase()} aria-label="${attachBtn.getAttribute('aria-label') || ''}" class="${attachBtn.className || ''}">` : "NOT FOUND"}\n\n`;

    report += `--- CHRONOLOGICAL LOGS (${debugLogs.length}) ---\n`;
    debugLogs.forEach(entry => {
      report += `[${entry.time}] [${entry.type}] ${entry.msg}\n`;
    });
    report += `===================================\n`;

    navigator.clipboard.writeText(report).then(() => {
      const copyBtn = document.getElementById("pdf-debug-copy");
      if (copyBtn) {
        const origText = copyBtn.textContent;
        copyBtn.textContent = i18n("debugPanelCopied", null, "COPIED!");
        copyBtn.style.background = "#00f59b";
        setTimeout(() => {
          copyBtn.textContent = origText;
          copyBtn.style.background = "#ffe600";
        }, 2000);
      }
      showToast("Diagnostic logs copied to clipboard!", "success");
    }).catch((err) => {
      log(`Clipboard copy failed: ${err.message}`, "error");
    });
  }

  /**
   * Floating toggle badge in bottom-right corner
   */
  function createDebugTogglePill() {
    if (document.getElementById("pdf-import-debug-pill")) return;
    const pill = document.createElement("button");
    pill.id = "pdf-import-debug-pill";
    pill.type = "button";
    pill.textContent = "DEBUG HUD";
    pill.style.cssText = `
      position: fixed;
      bottom: 12px;
      right: 12px;
      z-index: 9999998;
      background: #000000;
      color: #ffffff;
      border: 2px solid #000000;
      box-shadow: 2px 2px 0px 0px #ffe600;
      padding: 4px 10px;
      font-family: 'Space Mono', monospace;
      font-size: 10px;
      font-weight: 700;
      cursor: pointer;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      transition: transform 0.1s ease;
    `;
    pill.addEventListener("mouseenter", () => {
      pill.style.transform = "translate(-1px, -1px)";
    });
    pill.addEventListener("mouseleave", () => {
      pill.style.transform = "none";
    });
    pill.addEventListener("click", () => {
      const hud = document.getElementById("pdf-import-debug-hud");
      if (hud) {
        hud.style.display = hud.style.display === "none" ? "flex" : "none";
      }
    });
    document.body.appendChild(pill);
  }

  /**
   * Neo-Brutalist Debug HUD Panel
   */
  function createDebugPanel() {
    if (document.getElementById("pdf-import-debug-hud")) return;

    const hud = document.createElement("div");
    hud.id = "pdf-import-debug-hud";
    hud.style.cssText = `
      position: fixed;
      top: 16px;
      right: 16px;
      width: 460px;
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
          <span style="background: #000000; color: #ffffff; padding: 2px 6px; font-weight: 700; font-size: 10px;">PDFIMPORT</span>
          <span style="font-weight: 700; font-size: 12px; letter-spacing: -0.5px;">${escapeHtml(currentPlatform.name)} DEBUG HUD</span>
        </div>
        <div style="display: flex; gap: 6px;">
          <button id="pdf-debug-copy" style="background: #ffe600; color: #000; border: 2px solid #000; box-shadow: 1px 1px 0px 0px #000; padding: 3px 8px; font-weight: 700; font-size: 10px; cursor: pointer;">${i18n("debugPanelCopy", null, "COPY LOGS")}</button>
          <button id="pdf-debug-clear" style="background: #ffffff; border: 2px solid #000; padding: 3px 6px; font-weight: 700; font-size: 10px; cursor: pointer;">${i18n("debugPanelClear", null, "CLEAR")}</button>
          <button id="pdf-debug-close" style="background: #ffffff; border: 2px solid #000; padding: 3px 6px; font-weight: 700; font-size: 10px; cursor: pointer;">${i18n("debugPanelHide", null, "HIDE")}</button>
        </div>
      </div>
      <div id="pdf-debug-logs" style="padding: 12px; max-height: 48vh; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; background: #ffffff;">
        <div style="color: #666; font-style: italic;">${i18n("debugWaitingActivity", null, "Waiting for activity...")}</div>
      </div>
      <div style="padding: 10px 14px; background: #f4efe6; border-top: 3px solid #000000; display: flex; gap: 8px; justify-content: space-between; align-items: center;">
        <button id="pdf-debug-test" style="background: #00f59b; color: #000; border: 2px solid #000; box-shadow: 2px 2px 0px 0px #000; padding: 6px 12px; font-weight: 700; font-size: 10px; cursor: pointer;">${i18n("debugPanelTest", null, "TEST INSERTION")}</button>
        <div style="display: flex; gap: 6px;">
          <button id="pdf-debug-inspect" style="background: #00d2ff; color: #000; border: 2px solid #000; box-shadow: 2px 2px 0px 0px #000; padding: 6px 10px; font-weight: 700; font-size: 10px; cursor: pointer;">${i18n("debugPanelInspect", null, "INSPECT DOM")}</button>
          <button id="pdf-debug-retry" style="background: #ffffff; color: #000; border: 2px solid #000; box-shadow: 2px 2px 0px 0px #000; padding: 6px 10px; font-weight: 700; font-size: 10px; cursor: pointer;">${i18n("debugPanelRetry", null, "RETRY INSERT")}</button>
        </div>
      </div>
    `;

    document.body.appendChild(hud);

    document.getElementById("pdf-debug-close").addEventListener("click", () => {
      hud.style.display = "none";
    });

    document.getElementById("pdf-debug-clear").addEventListener("click", () => {
      debugLogs.length = 0;
      const logContainer = document.getElementById("pdf-debug-logs");
      if (logContainer) logContainer.innerHTML = `<div style="color: #666; font-style: italic;">${i18n("debugWaitingActivity", null, "Waiting for activity...")}</div>`;
    });

    document.getElementById("pdf-debug-copy").addEventListener("click", () => {
      copyDebugLogs();
    });

    document.getElementById("pdf-debug-inspect").addEventListener("click", () => {
      inspectPlatformDOM();
    });

    document.getElementById("pdf-debug-test").addEventListener("click", () => {
      log("--- Initiating Test Insertion with Sample PDF ---");
      const sampleFile = createSamplePdfFile();
      lastReceivedFile = sampleFile;
      executeUploadWorkflow(sampleFile, "Please analyze and summarize this sample PDF document:", currentPlatform.name);
    });

    document.getElementById("pdf-debug-retry").addEventListener("click", () => {
      if (lastReceivedFile) {
        log("Retrying insertion from last received file...");
        executeUploadWorkflow(lastReceivedFile, "", currentPlatform.name);
      } else {
        log("No cached file available for retry.", "warning");
      }
    });

    // Keyboard shortcut to toggle HUD: Ctrl+Shift+D
    window.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.shiftKey && e.code === "KeyD") {
        hud.style.display = hud.style.display === "none" ? "flex" : "none";
      }
    });
  }

  function updateDebugUI() {
    const container = document.getElementById("pdf-debug-logs");
    if (!container) return;

    if (debugLogs.length === 0) {
      container.innerHTML = `<div style="color: #666; font-style: italic;">${i18n("debugWaitingActivity", null, "Waiting for activity...")}</div>`;
      return;
    }

    container.innerHTML = debugLogs.map(l => {
      let color = "#000000";
      let bg = "transparent";
      if (l.type === "error") { color = "#d32f2f"; bg = "#ffebee"; }
      if (l.type === "success") { color = "#2e7d32"; bg = "#e8f5e9"; }
      if (l.type === "warning") { color = "#ed6c02"; bg = "#fff3e0"; }
      return `<div style="color: ${color}; background: ${bg}; padding: 2px 4px; word-break: break-all; font-size: 11px;">[${l.time}] ${escapeHtml(l.msg)}</div>`;
    }).join("");

    container.scrollTop = container.scrollHeight;
  }

  function inspectPlatformDOM() {
    log(`=== DOM INSPECTION FOR ${currentPlatform.name} ===`);
    const inputs = document.querySelectorAll('input[type="file"]');
    log(`File inputs count: ${inputs.length}`);
    inputs.forEach((inp, idx) => {
      log(`  Input #${idx}: accept="${inp.accept || ''}", id="${inp.id || ''}", class="${inp.className.slice(0, 30)}", visible=${inp.offsetParent !== null}`);
    });

    const chatInput = findChatInput();
    if (chatInput) {
      log(`Chat input element: <${chatInput.tagName.toLowerCase()}> id="${chatInput.id || ''}" class="${(chatInput.className || '').slice(0, 40)}" contenteditable="${chatInput.getAttribute('contenteditable')}"`);
    } else {
      log(`Chat input element NOT found.`, "warning");
    }

    const attachBtn = findAttachButton();
    if (attachBtn) {
      log(`Attach button: <${attachBtn.tagName.toLowerCase()}> aria-label="${attachBtn.getAttribute('aria-label') || ''}" class="${attachBtn.className.slice(0, 30)}"`);
    } else {
      log(`Attach button NOT found.`, "warning");
    }
  }

  /**
   * Neo-brutalist Toast Notification
   */
  function showToast(htmlContent, type = "info") {
    const id = "pdf-import-toast";
    let toast = document.getElementById(id);
    if (!toast) {
      toast = document.createElement("div");
      toast.id = id;
      document.body.appendChild(toast);
    }

    let bg = "#ffffff";
    let borderColor = "#000000";
    if (type === "success") bg = "#bbf7d0";
    if (type === "error") bg = "#fecaca";
    if (type === "warning") bg = "#fef08a";

    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 99999999;
      background: ${bg};
      color: #000000;
      border: 3px solid ${borderColor};
      box-shadow: 4px 4px 0px 0px #000000;
      padding: 12px 18px;
      font-family: 'Space Grotesk', -apple-system, sans-serif;
      font-size: 13px;
      font-weight: 700;
      line-height: 1.4;
      max-width: 380px;
      display: flex;
      align-items: center;
      gap: 12px;
    `;

    toast.innerHTML = `
      <div style="flex: 1;">${htmlContent}</div>
      <button id="pdf-toast-close" style="background: none; border: none; font-size: 16px; cursor: pointer; font-weight: 900; line-height: 1;">x</button>
    `;

    document.getElementById("pdf-toast-close").addEventListener("click", () => {
      toast.remove();
    });

    setTimeout(() => {
      if (document.getElementById(id)) {
        toast.remove();
      }
    }, 6000);
  }

  function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/[&<>"']/g, (m) => {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m];
    });
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
})();
