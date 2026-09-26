let currentLang = "en";
const locales = {};
let selectedAi = "gemini";

document.addEventListener("DOMContentLoaded", async () => {
  const reuseTabEl = document.getElementById("reuseTab");
  const defaultPromptEl = document.getElementById("defaultPrompt");
  const saveBtn = document.getElementById("saveBtn");
  const saveStatus = document.getElementById("saveStatus");
  const presetBtns = document.querySelectorAll(".preset-btn");
  const langBtnEn = document.getElementById("langBtnEn");
  const langBtnCs = document.getElementById("langBtnCs");
  const aiCards = document.querySelectorAll(".ai-card");
  const customUrlBox = document.getElementById("customUrlBox");
  const customAiUrlEl = document.getElementById("customAiUrl");

  // Load language message catalogs
  await loadLocales();

  // Load saved settings
  const settings = await chrome.storage.sync.get({
    targetAi: "gemini",
    customAiUrl: "https://openrouter.ai/chat",
    reuseTab: true,
    enableContextMenu: true,
    enablePagePdfButtons: true,
    largePdfThreshold: "30",
    largePdfAction: "ask",
    defaultPrompt: "",
    userLanguage: "auto"
  });

  const largePdfThresholdEl = document.getElementById("largePdfThreshold");
  const largePdfActionEl = document.getElementById("largePdfAction");
  const enableContextMenuEl = document.getElementById("enableContextMenu");
  const enablePagePdfButtonsEl = document.getElementById("enablePagePdfButtons");
  if (largePdfThresholdEl) largePdfThresholdEl.value = String(settings.largePdfThreshold || "30");
  if (largePdfActionEl) largePdfActionEl.value = settings.largePdfAction || "ask";
  if (enableContextMenuEl) enableContextMenuEl.checked = settings.enableContextMenu !== false;
  if (enablePagePdfButtonsEl) enablePagePdfButtonsEl.checked = settings.enablePagePdfButtons !== false;

  selectedAi = settings.targetAi || "gemini";
  if (customAiUrlEl) {
    customAiUrlEl.value = settings.customAiUrl || "https://openrouter.ai/chat";
  }

  // Update active AI card
  updateActiveAiCard(selectedAi);

  // Determine active language
  if (settings.userLanguage && settings.userLanguage !== "auto") {
    currentLang = settings.userLanguage;
  } else {
    const uiLang = (chrome.i18n.getUILanguage() || "en").toLowerCase();
    currentLang = uiLang.startsWith("cs") ? "cs" : "en";
  }

  // Localize page content
  localizePage(currentLang);

  reuseTabEl.checked = settings.reuseTab;
  defaultPromptEl.value = settings.defaultPrompt;

  // AI card selection handler
  aiCards.forEach((card) => {
    card.addEventListener("click", () => {
      const aiId = card.getAttribute("data-ai");
      if (aiId) {
        selectedAi = aiId;
        updateActiveAiCard(selectedAi);
      }
    });
  });

  function updateActiveAiCard(aiId) {
    aiCards.forEach((card) => {
      card.classList.toggle("active", card.getAttribute("data-ai") === aiId);
    });

    if (customUrlBox) {
      customUrlBox.style.display = aiId === "custom" ? "block" : "none";
    }
  }

  // More AI Platforms toggle button handler
  const toggleMorePlatformsBtn = document.getElementById("toggleMorePlatformsBtn");
  const aiMoreContainer = document.getElementById("aiMoreContainer");
  const toggleMorePlatformsText = document.getElementById("toggleMorePlatformsText");

  function setMorePlatformsExpanded(expanded) {
    if (!aiMoreContainer || !toggleMorePlatformsBtn) return;
    if (expanded) {
      aiMoreContainer.style.display = "block";
      toggleMorePlatformsBtn.classList.add("expanded");
      if (toggleMorePlatformsText) {
        toggleMorePlatformsText.setAttribute("data-i18n", "btnShowLessPlatforms");
        toggleMorePlatformsText.textContent = getMsg("btnShowLessPlatforms") || "Show less";
      }
    } else {
      aiMoreContainer.style.display = "none";
      toggleMorePlatformsBtn.classList.remove("expanded");
      if (toggleMorePlatformsText) {
        toggleMorePlatformsText.setAttribute("data-i18n", "btnShowMorePlatforms");
        toggleMorePlatformsText.textContent = getMsg("btnShowMorePlatforms") || "Show more platforms";
      }
    }
  }

  if (toggleMorePlatformsBtn) {
    toggleMorePlatformsBtn.addEventListener("click", () => {
      const isExpanded = toggleMorePlatformsBtn.classList.contains("expanded");
      setMorePlatformsExpanded(!isExpanded);
    });
  }

  // Auto-expand if the saved selected AI is inside aiMoreContainer
  if (aiMoreContainer && aiMoreContainer.querySelector(`.ai-card[data-ai="${selectedAi}"]`)) {
    setMorePlatformsExpanded(true);
  }

  // Language switch handlers
  if (langBtnEn) {
    langBtnEn.addEventListener("click", async () => {
      if (currentLang !== "en") {
        currentLang = "en";
        await chrome.storage.sync.set({ userLanguage: "en" });
        localizePage("en");
        chrome.runtime.sendMessage({ action: "LANGUAGE_CHANGED", language: "en" }).catch(() => { });
      }
    });
  }

  if (langBtnCs) {
    langBtnCs.addEventListener("click", async () => {
      if (currentLang !== "cs") {
        currentLang = "cs";
        await chrome.storage.sync.set({ userLanguage: "cs" });
        localizePage("cs");
        chrome.runtime.sendMessage({ action: "LANGUAGE_CHANGED", language: "cs" }).catch(() => { });
      }
    });
  }

  // Preset buttons handler
  presetBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const presetKey = btn.getAttribute("data-preset-key");
      if (presetKey) {
        defaultPromptEl.value = getMsg(presetKey) || "";
      } else {
        defaultPromptEl.value = "";
      }
    });
  });

  let saveTimer = null;
  function showSaveFeedback() {
    if (!saveStatus) return;
    saveStatus.textContent = getMsg("statusSaved") || "Settings saved!";
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveStatus.textContent = "";
    }, 2000);
  }

  // Instant save on toggle switches and dropdown options
  if (enablePagePdfButtonsEl) {
    enablePagePdfButtonsEl.addEventListener("change", async () => {
      await chrome.storage.sync.set({ enablePagePdfButtons: enablePagePdfButtonsEl.checked });
      showSaveFeedback();
    });
  }

  if (reuseTabEl) {
    reuseTabEl.addEventListener("change", async () => {
      await chrome.storage.sync.set({ reuseTab: reuseTabEl.checked });
      showSaveFeedback();
    });
  }

  if (enableContextMenuEl) {
    enableContextMenuEl.addEventListener("change", async () => {
      await chrome.storage.sync.set({ enableContextMenu: enableContextMenuEl.checked });
      const customUrlVal = customAiUrlEl ? customAiUrlEl.value.trim() : "https://openrouter.ai/chat";
      chrome.runtime.sendMessage({
        action: "CONTEXT_MENUS_CHANGED",
        targetAi: selectedAi,
        customAiUrl: customUrlVal
      }).catch(() => { });
      showSaveFeedback();
    });
  }

  if (largePdfThresholdEl) {
    largePdfThresholdEl.addEventListener("change", async () => {
      await chrome.storage.sync.set({ largePdfThreshold: largePdfThresholdEl.value });
      showSaveFeedback();
    });
  }

  if (largePdfActionEl) {
    largePdfActionEl.addEventListener("change", async () => {
      await chrome.storage.sync.set({ largePdfAction: largePdfActionEl.value });
      showSaveFeedback();
    });
  }

  // Save settings handler
  saveBtn.addEventListener("click", async () => {
    saveBtn.disabled = true;
    saveBtn.textContent = getMsg("btnSaving") || "Saving...";

    const customUrlVal = customAiUrlEl ? customAiUrlEl.value.trim() : "https://openrouter.ai/chat";

    await chrome.storage.sync.set({
      targetAi: selectedAi,
      customAiUrl: customUrlVal,
      reuseTab: reuseTabEl.checked,
      enableContextMenu: enableContextMenuEl ? enableContextMenuEl.checked : true,
      enablePagePdfButtons: enablePagePdfButtonsEl ? enablePagePdfButtonsEl.checked : true,
      largePdfThreshold: largePdfThresholdEl ? largePdfThresholdEl.value : "30",
      largePdfAction: largePdfActionEl ? largePdfActionEl.value : "ask",
      defaultPrompt: defaultPromptEl.value,
      userLanguage: currentLang
    });

    // Notify background script to update context menu labels & visibility
    chrome.runtime.sendMessage({
      action: "CONTEXT_MENUS_CHANGED",
      targetAi: selectedAi,
      customAiUrl: customUrlVal
    }).catch(() => { });

    showSaveFeedback();
    saveBtn.disabled = false;
    saveBtn.textContent = getMsg("btnSaveSettings") || "Save settings";
  });

  // Feedback & GitHub Issue handler
  const feedbackTypeEl = document.getElementById("feedbackType");
  const feedbackTitleEl = document.getElementById("feedbackTitle");
  const feedbackBodyEl = document.getElementById("feedbackBody");
  const feedbackSendBtn = document.getElementById("feedbackSendBtn");
  const feedbackStatusEl = document.getElementById("feedbackStatus");

  if (feedbackSendBtn) {
    feedbackSendBtn.addEventListener("click", () => {
      const bodyText = feedbackBodyEl ? feedbackBodyEl.value.trim() : "";
      const customTitle = feedbackTitleEl ? feedbackTitleEl.value.trim() : "";
      const type = feedbackTypeEl ? feedbackTypeEl.value : "feature";

      if (!bodyText && !customTitle) {
        if (feedbackStatusEl) {
          feedbackStatusEl.textContent = getMsg("feedbackEmptyAlert") || "Please enter at least a brief description of your request or issue.";
          feedbackStatusEl.style.color = "#b91c1c";
          feedbackStatusEl.style.background = "#fee2e2";
          feedbackStatusEl.style.display = "inline-block";
          setTimeout(() => {
            feedbackStatusEl.style.display = "none";
          }, 4000);
        }
        if (feedbackBodyEl) feedbackBodyEl.focus();
        return;
      }

      // Title prefix based on issue type
      let prefix = "[Feature]";
      if (type === "bug") prefix = "[Bug]";
      else if (type === "feedback") prefix = "[Feedback]";

      let title = customTitle;
      if (!title) {
        const firstLine = bodyText.split("\n")[0].trim().slice(0, 60);
        title = `${prefix} ${firstLine}`;
      } else if (!title.startsWith("[")) {
        title = `${prefix} ${title}`;
      }

      // Format markdown body with diagnostic details
      const manifest = chrome.runtime.getManifest();
      const extVersion = manifest ? manifest.version : "1.4.6";
      const browserInfo = navigator.userAgent;

      const fullBody = [
        bodyText || "(No description provided)",
        "",
        "---",
        "**Environment / Diagnostika:**",
        `- PDFImport: v${extVersion}`,
        `- Target AI: ${selectedAi}`,
        `- Browser: ${browserInfo}`
      ].join("\n");

      const githubIssueUrl = `https://github.com/SidloCZ/PDFImport/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(fullBody)}`;

      window.open(githubIssueUrl, "_blank", "noopener,noreferrer");

      if (feedbackStatusEl) {
        feedbackStatusEl.textContent = getMsg("feedbackOpened") || "GitHub Issue opened in a new tab!";
        feedbackStatusEl.style.color = "#059669";
        feedbackStatusEl.style.background = "#d1fae5";
        feedbackStatusEl.style.display = "inline-block";
        setTimeout(() => {
          feedbackStatusEl.style.display = "none";
        }, 4000);
      }
    });
  }
});

async function loadLocales() {
  try {
    const [enRes, csRes] = await Promise.all([
      fetch(chrome.runtime.getURL("_locales/en/messages.json")),
      fetch(chrome.runtime.getURL("_locales/cs/messages.json"))
    ]);
    locales.en = await enRes.json();
    locales.cs = await csRes.json();
  } catch (err) {
    console.warn("[PDFImport] Could not load message catalogs, falling back to chrome.i18n:", err);
  }
}

function getMsg(key) {
  if (locales[currentLang] && locales[currentLang][key]) {
    return locales[currentLang][key].message;
  }
  return chrome.i18n.getMessage(key) || "";
}

function localizePage(lang) {
  document.documentElement.lang = lang;

  // Update active state on language buttons
  const langBtnEn = document.getElementById("langBtnEn");
  const langBtnCs = document.getElementById("langBtnCs");
  if (langBtnEn) langBtnEn.classList.toggle("active", lang === "en");
  if (langBtnCs) langBtnCs.classList.toggle("active", lang === "cs");

  // Elements with data-i18n
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    const msg = getMsg(key);
    if (msg) {
      el.textContent = msg;
    }
  });

  // Elements with data-i18n-placeholder
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    const msg = getMsg(key);
    if (msg) {
      el.setAttribute("placeholder", msg);
    }
  });
}
