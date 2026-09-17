let currentLang = "en";
const locales = {};

document.addEventListener("DOMContentLoaded", async () => {
  const reuseTabEl = document.getElementById("reuseTab");
  const defaultPromptEl = document.getElementById("defaultPrompt");
  const saveBtn = document.getElementById("saveBtn");
  const saveStatus = document.getElementById("saveStatus");
  const presetBtns = document.querySelectorAll(".preset-btn");
  const langBtnEn = document.getElementById("langBtnEn");
  const langBtnCs = document.getElementById("langBtnCs");

  // Load language message catalogs
  await loadLocales();

  // Load saved settings
  const settings = await chrome.storage.sync.get({
    reuseTab: true,
    defaultPrompt: "",
    userLanguage: "auto"
  });

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

    await chrome.storage.sync.set({
      reuseTab: reuseTabEl.checked,
      defaultPrompt: defaultPromptEl.value,
      userLanguage: currentLang
    });

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
