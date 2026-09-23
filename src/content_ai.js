/**
 * Content Script for PDFImport - Multi-AI Platform Support
 * Supports Top 10 AI platforms (Claude, ChatGPT, Kimi, Hy4/Yuanbao, DeepSeek, Gemini, GLM, Meta AI, Qwen, Grok, Perplexity) + Custom URLs (OpenRouter, etc.)
 */

(() => {
  let isProcessing = false;
  let lastReceivedFile = null;

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
    if (hostname.includes("copilot.microsoft.com")) return { id: "copilot", name: "Copilot" };
    if (hostname.includes("openrouter.ai")) return { id: "openrouter", name: "OpenRouter" };
    return { id: "custom", name: "AI" };
  }

  const currentPlatform = detectPlatform();

  function log(msg, type = "info") {
    if (type === "error") {
      console.error(`[PDF Import - ${currentPlatform.name}] ${msg}`);
    } else {
      console.log(`[PDF Import - ${currentPlatform.name}] ${msg}`);
    }
  }

  // Message listener from background worker
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    log(`Received action message: ${message.action}`);
    if (message.action === "PROCESS_PENDING_PDF") {
      checkAndInsertPdf();
      sendResponse({ status: "processing" });
    }
    return true;
  });

  // Check storage on page load
  window.addEventListener("load", () => {
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
      showToast(i18n("toastFallbackWarning", null, "Could not insert file automatically. Please attach the file manually."), "warning");
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
