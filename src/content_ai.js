/**
 * Content Script for PDFImport - Multi-AI Platform Support
 * Supports Top 10 AI platforms (Claude, ChatGPT, Kimi, Hy4/Yuanbao, DeepSeek, Gemini, GLM, Meta AI, Qwen, Grok, Perplexity) + Custom URLs (OpenRouter, etc.)
 */

(() => {
  if (window.__pdfImportInjected) {
    return;
  }
  window.__pdfImportInjected = true;

  let isProcessing = false;
  let lastReceivedFile = null;
  let lastPendingPrompt = "";

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

      // Immediately claim and clear pending PDF to prevent any duplicate concurrent runs
      await chrome.storage.local.remove("pendingPdf");

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
      lastPendingPrompt = pending.prompt || "";

      // Wait for chat input
      log(`Waiting for ${targetAiName} chat input ready...`);
      const ready = await waitForChatReady(15000);
      if (!ready) {
        log(`Chat input not found within 15s timeout!`, "error");
        showToast(i18n("toastChatNotFound", [targetAiName], `${targetAiName} chat input was not found within timeout.`), "warning");
        isProcessing = false;
        return;
      }

      // Execute single upload attempt with verification
      await executeUploadWorkflow(file, lastPendingPrompt, targetAiName);

    } catch (err) {
      log(`Error: ${err.message}`, "error");
      console.error(err);
      showToast(i18n("toastError", null, "An error occurred while inserting the PDF."), "error");
    } finally {
      isProcessing = false;
    }
  }

  /**
   * Scopes chat composer container to avoid false positive matches elsewhere in DOM
   */
  function findChatInputArea() {
    const input = findChatInput();
    if (!input) return document.body;
    return (
      input.closest("form") ||
      input.closest(".input-area-container") ||
      input.closest(".input-area") ||
      input.closest("[class*='chat-input']") ||
      input.closest("[class*='input-container']") ||
      input.closest("[class*='composer']") ||
      input.parentElement?.parentElement ||
      document.body
    );
  }

  /**
   * Counts visible attachment chips within the chat input area
   */
  function countAttachments() {
    const inputArea = findChatInputArea();
    const selectors = [
      'mat-chip',
      '[class*="attachment"]',
      '[class*="file-preview"]',
      '[class*="file-chip"]',
      '[class*="file-item"]',
      '[data-testid*="attachment"]',
      '[data-testid*="file"]',
      '.file-container',
      '[class*="upload-item"]',
      '[class*="file-card"]',
      'button[aria-label*="remove" i]',
      'button[aria-label*="delete" i]',
      'button[aria-label*="odstranit" i]'
    ];

    let count = 0;
    const seen = new Set();
    for (const sel of selectors) {
      const elements = inputArea.querySelectorAll(sel);
      elements.forEach(el => {
        if (el && el.offsetParent !== null && !seen.has(el)) {
          seen.add(el);
          count++;
        }
      });
    }
    return count;
  }

  /**
   * Checks if an attachment card/chip has appeared in the DOM
   */
  function checkIfAttachmentAppeared(initialCount = 0, filename = "") {
    const currentCount = countAttachments();
    if (currentCount > initialCount) {
      return true;
    }

    if (filename) {
      const inputArea = findChatInputArea();
      const baseName = filename.replace(/\.pdf$/i, "").slice(0, 15);
      if (baseName && inputArea.textContent.includes(baseName)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Polling loop to wait for attachment confirmation
   */
  async function waitForAttachment(timeoutMs = 5000, initialCount = 0, filename = "") {
    const pollInterval = 250;
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      if (checkIfAttachmentAppeared(initialCount, filename)) {
        return true;
      }
      await sleep(pollInterval);
    }
    return checkIfAttachmentAppeared(initialCount, filename);
  }

  /**
   * Single-attempt upload workflow:
   * Only performs ONE upload method, verifies via polling, and offers user retry if unconfirmed.
   */
  async function executeUploadWorkflow(file, optionalPrompt, targetAiName) {
    log(`--- Starting single-import workflow: ${file.name} ---`);
    const initialCount = countAttachments();
    log(`Initial attachment count: ${initialCount}`);

    const chatInput = findChatInput();
    if (!chatInput) {
      log("Chat input missing during upload execution.", "error");
      return;
    }

    // Inspect if a direct file input matching pdf exists in chat area
    const inputArea = findChatInputArea();
    const directInput = Array.from(inputArea.querySelectorAll('input[type="file"]')).find(inp => {
      const acc = (inp.accept || "").toLowerCase();
      return acc.includes("pdf") || acc.includes("*") || acc.includes("document");
    });

    let methodUsed = "drop";
    if (directInput) {
      methodUsed = "fileInput";
      log(`Attempting native file input assignment (accept="${directInput.accept || 'all'}")...`);
      assignFilesToInput(directInput, file);
    } else {
      // Gemini and Copilot handle clipboard events natively in rich composer; other platforms use drop
      const preferred = (currentPlatform.id === "gemini" || currentPlatform.id === "copilot") ? "paste" : "drop";
      methodUsed = preferred;
      if (preferred === "paste") {
        log(`Attempting single Clipboard Paste on chat input (<${chatInput.tagName.toLowerCase()}>)...`);
        simulatePaste(chatInput, file);
      } else {
        log(`Attempting single Drag & Drop on chat input (<${chatInput.tagName.toLowerCase()}>)...`);
        simulateDrop(chatInput, file);
      }
    }

    log(`Waiting up to 5s for attachment confirmation...`);
    const confirmed = await waitForAttachment(5000, initialCount, file.name);
    const displayAi = targetAiName || currentPlatform.name;

    if (confirmed) {
      log(`[OK] Attachment verified via ${methodUsed}!`, "success");
      showToast(i18n("toastSuccess", [escapeHtml(file.name), displayAi], `File <strong>${escapeHtml(file.name)}</strong> was inserted into ${displayAi}!`), "success");
      if (optionalPrompt && optionalPrompt.trim().length > 0) {
        log("Typing prompt text into chat input...");
        await insertPromptText(optionalPrompt.trim());
      }
    } else {
      log(`Automatic attachment was not confirmed after single ${methodUsed} attempt.`, "warning");
      const secondaryMethod = methodUsed === "drop" ? "paste" : "drop";
      const retryLabel = secondaryMethod === "paste"
        ? i18n("toastRetryPaste", null, "Retry with Paste")
        : i18n("toastRetryDrop", null, "Retry with Drop");

      showToast(
        i18n("toastUnconfirmedWithAction", null, "File was sent, but attachment was not confirmed."),
        "warning",
        {
          label: retryLabel,
          onClick: () => {
            handleSecondaryRetry(file, secondaryMethod, optionalPrompt, targetAiName);
          }
        },
        12000
      );
    }
  }

  /**
   * User-triggered retry using secondary method
   */
  async function handleSecondaryRetry(file, method, optionalPrompt, targetAiName) {
    log(`--- Retrying insertion using ${method}: ${file.name} ---`);
    const initialCount = countAttachments();
    const chatInput = findChatInput();
    if (!chatInput) {
      showToast(i18n("toastChatNotFound", [targetAiName || currentPlatform.name], "Chat input not found."), "error");
      return;
    }

    if (method === "paste") {
      log("Simulating Clipboard Paste event on chat input...");
      simulatePaste(chatInput, file);
    } else if (method === "drop") {
      log("Simulating Drag & Drop on chat input...");
      simulateDrop(chatInput, file);
    }

    showToast(i18n("toastProcessing", [escapeHtml(file.name)], `Processing: <strong>${escapeHtml(file.name)}</strong>...`), "info");

    const confirmed = await waitForAttachment(5000, initialCount, file.name);
    const displayAi = targetAiName || currentPlatform.name;

    if (confirmed) {
      log(`[OK] Attachment verified on retry via ${method}!`, "success");
      showToast(i18n("toastSuccess", [escapeHtml(file.name), displayAi], `File <strong>${escapeHtml(file.name)}</strong> was inserted into ${displayAi}!`), "success");
      if (optionalPrompt && optionalPrompt.trim().length > 0) {
        log("Typing prompt text into chat input...");
        await insertPromptText(optionalPrompt.trim());
      }
    } else {
      log(`[FAIL] Retry via ${method} also unconfirmed.`, "error");
      showToast(i18n("toastFallbackWarning", null, "Could not insert file automatically. Please attach the file manually."), "warning");
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

  function simulatePaste(element, file) {
    try {
      element.focus();
      const dt = new DataTransfer();
      dt.items.add(file);
      const pasteEvent = new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: dt
      });
      element.dispatchEvent(pasteEvent);
      return true;
    } catch (e) {
      log(`Error in simulatePaste: ${e.message}`, "error");
      return false;
    }
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
  function showToast(htmlContent, type = "info", action = null, timeout = 6000) {
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
      max-width: 440px;
      display: flex;
      align-items: center;
      gap: 12px;
    `;

    let actionHtml = "";
    if (action && action.label) {
      actionHtml = `<button id="pdf-toast-action" style="background: #000000; color: #ffffff; border: 2px solid #000000; padding: 6px 12px; font-family: inherit; font-size: 12px; font-weight: 700; cursor: pointer; white-space: nowrap; border-radius: 0;">${escapeHtml(action.label)}</button>`;
    }

    toast.innerHTML = `
      <div style="flex: 1;">${htmlContent}</div>
      ${actionHtml}
      <button id="pdf-toast-close" style="background: none; border: none; font-size: 16px; cursor: pointer; font-weight: 900; line-height: 1; padding: 0 4px;" aria-label="Close">x</button>
    `;

    if (action && typeof action.onClick === "function") {
      const actionBtn = document.getElementById("pdf-toast-action");
      if (actionBtn) {
        actionBtn.addEventListener("click", () => {
          toast.remove();
          action.onClick();
        });
      }
    }

    document.getElementById("pdf-toast-close").addEventListener("click", () => {
      toast.remove();
    });

    if (toast.__timer) clearTimeout(toast.__timer);
    toast.__timer = setTimeout(() => {
      if (document.getElementById(id)) {
        toast.remove();
      }
    }, timeout);
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
