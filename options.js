document.addEventListener("DOMContentLoaded", async () => {
  const reuseTabEl = document.getElementById("reuseTab");
  const defaultPromptEl = document.getElementById("defaultPrompt");
  const saveBtn = document.getElementById("saveBtn");
  const saveStatus = document.getElementById("saveStatus");
  const presetBtns = document.querySelectorAll(".preset-btn");

  // Načtení uložených hodnot
  const settings = await chrome.storage.sync.get({
    reuseTab: true,
    defaultPrompt: ""
  });

  reuseTabEl.checked = settings.reuseTab;
  defaultPromptEl.value = settings.defaultPrompt;

  // Tlačítka pro přednastavené prompty
  presetBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      defaultPromptEl.value = btn.getAttribute("data-text");
    });
  });

  // Uložení nastavení
  saveBtn.addEventListener("click", async () => {
    saveBtn.disabled = true;
    saveBtn.textContent = "Ukládám...";

    await chrome.storage.sync.set({
      reuseTab: reuseTabEl.checked,
      defaultPrompt: defaultPromptEl.value
    });

    saveStatus.textContent = "✓ Nastavení uloženo!";
    saveBtn.disabled = false;
    saveBtn.textContent = "Uložit nastavení";

    setTimeout(() => {
      saveStatus.textContent = "";
    }, 2500);
  });
});
