let currentLang = "en";
const locales = {};
let selectedAi = "gemini";

document.addEventListener("DOMContentLoaded", async () => {
  const reuseTabEl = document.getElementById("reuseTab");
  const debugModeEl = document.getElementById("debugMode");
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
    debugMode: true,
    largePdfThreshold: "30",
    largePdfAction: "ask",
    defaultPrompt: "",
    userLanguage: "auto"
  });

  const largePdfThresholdEl = document.getElementById("largePdfThreshold");
  const largePdfActionEl = document.getElementById("largePdfAction");
  if (largePdfThresholdEl) largePdfThresholdEl.value = String(settings.largePdfThreshold || "30");
  if (largePdfActionEl) largePdfActionEl.value = settings.largePdfAction || "ask";

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
  if (debugModeEl) debugModeEl.checked = settings.debugMode !== false;
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

  // Language switch handlers
  if (langBtnEn) {
    langBtnEn.addEventListener("click", async () => {
      if (currentLang !== "en") {
        currentLang = "en";
        await chrome.storage.sync.set({ userLanguage: "en" });
        localizePage("en");
        chrome.runtime.sendMessage({ action: "LANGUAGE_CHANGED", language: "en" }).catch(() => {});
      }
    });
  }

  if (langBtnCs) {
    langBtnCs.addEventListener("click", async () => {
      if (currentLang !== "cs") {
        currentLang = "cs";
        await chrome.storage.sync.set({ userLanguage: "cs" });
        localizePage("cs");
        chrome.runtime.sendMessage({ action: "LANGUAGE_CHANGED", language: "cs" }).catch(() => {});
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

  // Save settings handler
  saveBtn.addEventListener("click", async () => {
    saveBtn.disabled = true;
    saveBtn.textContent = getMsg("btnSaving") || "Saving...";

    const customUrlVal = customAiUrlEl ? customAiUrlEl.value.trim() : "https://openrouter.ai/chat";

    await chrome.storage.sync.set({
      targetAi: selectedAi,
      customAiUrl: customUrlVal,
      reuseTab: reuseTabEl.checked,
      debugMode: debugModeEl ? debugModeEl.checked : true,
      largePdfThreshold: largePdfThresholdEl ? largePdfThresholdEl.value : "30",
      largePdfAction: largePdfActionEl ? largePdfActionEl.value : "ask",
      defaultPrompt: defaultPromptEl.value,
      userLanguage: currentLang
    });

    // Notify background script to update context menu labels
    chrome.runtime.sendMessage({
      action: "TARGET_AI_CHANGED",
      targetAi: selectedAi,
      customAiUrl: customUrlVal
    }).catch(() => {});

    saveStatus.textContent = getMsg("statusSaved") || "Settings saved!";
    saveBtn.disabled = false;
    saveBtn.textContent = getMsg("btnSaveSettings") || "Save settings";

    setTimeout(() => {
      saveStatus.textContent = "";
    }, 2500);
  });
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
