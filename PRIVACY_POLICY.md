# Privacy Policy for PDFImport

Last updated: September 26, 2026

PDFImport ("the extension") is an open-source browser extension developed by SidloCZ. This Privacy Policy explains our practices regarding user data and privacy.

---

## 1. Single Purpose and Overview

PDFImport has a single purpose: to allow users to quickly import and forward open or linked PDF documents into supported AI chat platforms (such as Google Gemini, Anthropic Claude, OpenAI ChatGPT, DeepSeek, and others) directly from their browser.

## 2. Zero Data Collection and Tracking

* **No Personal Data Collected**: The extension does not collect, record, track, profile, or transmit any personally identifiable information (PII).
* **No Telemetry or Analytics**: There are no tracking scripts, analytics libraries, cookies, or remote reporting mechanisms included in the extension.
* **No Remote Servers**: PDFImport does not operate or communicate with any external backend servers. All data processing occurs strictly client-side within the local browser sandbox.

## 3. How Data and Permissions Are Used

PDFImport only requests permissions strictly necessary to execute user-initiated actions:

* **Host Permissions (`<all_urls>`, `file:///*`)**:
  * Used to detect PDF links and download user-selected PDF files directly from the web or local disk.
  * No web page content, browsing history, or form inputs are ever recorded or sent anywhere.
* **`storage` and `unlimitedStorage`**:
  * Used to save user preferences (e.g. preferred AI platform, language, prompt presets) in `chrome.storage.sync`.
  * Used to hold temporary PDF file buffers in `chrome.storage.local` during transfer between tabs or during client-side PDF optimization. Data is cleared once transfer is completed.
* **`tabs` and `activeTab`**:
  * Used to locate existing AI chat tabs or open a new chat tab and focus it when you send a PDF.
* **`scripting`**:
  * Used to inspect active tab DOM structure upon user command to identify embedded PDF viewer instances.
* **`offscreen`**:
  * Used to process and fetch local files (`file:///`) within Chrome's Manifest V3 security boundaries.
* **`contextMenus`**:
  * Used to display right-click context menu options ("Send PDF to AI").
* **`notifications`**:
  * Used solely to present localized status alerts (e.g., successful import or file size warnings) to the user.

## 4. Third-Party AI Services

When you choose to send a PDF to a supported AI service (e.g., Gemini, Claude, ChatGPT, DeepSeek), the document and your specified prompt are uploaded directly to that AI provider's interface within your own authenticated browser session. Once sent to the AI service, your interactions are governed by that respective provider's terms of service and privacy policy:

* Google Gemini: [https://policies.google.com/privacy](https://policies.google.com/privacy)
* Anthropic Claude: [https://www.anthropic.com/legal/privacy](https://www.anthropic.com/legal/privacy)
* OpenAI ChatGPT: [https://openai.com/policies/privacy-policy](https://openai.com/policies/privacy-policy)
* DeepSeek: [https://www.deepseek.com/privacy](https://www.deepseek.com/privacy)

PDFImport is independent and not affiliated with, sponsored, or endorsed by any of the aforementioned AI platforms.

## 5. Open Source Code

The full source code of PDFImport is publicly available under the Apache 2.0 License for auditing and transparency at:
[https://github.com/SidloCZ/PDFImport](https://github.com/SidloCZ/PDFImport)

## 6. Contact

If you have questions regarding this Privacy Policy or the security of PDFImport, please submit an issue on GitHub:
[https://github.com/SidloCZ/PDFImport/issues](https://github.com/SidloCZ/PDFImport/issues)

---

# Zásady ochrany osobních údajů (Privacy Policy)

Poslední aktualizace: 26. září 2026

PDFImport je open-source rozšíření pro webové prohlížeče vyvíjené autorem SidloCZ. Tyto zásady ochrany osobních údajů vysvětlují přístup k ochraně vašeho soukromí.

## 1. Hlavní účel rozšíření

Rozšíření má jediný účel: umožnit uživatelům rychle a jednoduše předat otevřené nebo odkazované PDF dokumenty do vybraných AI chatovacích platforem (např. Google Gemini, Claude, ChatGPT, DeepSeek).

## 2. Žádný sběr ani sledování dat

* **Neshromažďujeme osobní údaje**: Rozšíření neshromažďuje, neukládá ani nepředává žádné osobní údaje, historii prohlížení ani obsah čtených souborů.
* **Žádná telemetrie**: Rozšíření neobsahuje žádné analytické ani sledovací skripty.
* **Žádné externí servery**: PDFImport nekomunikuje s žádnými vlastními servery. Veškeré operace probíhají výhradně lokálně v prohlížeči.

## 3. Oprávnění a jejich využití

* **Přístup k adresám (`<all_urls>`, `file:///*`)**: Slouží výhradně ke stažení PDF souboru, který si uživatel zvolil k importu do AI.
* **Úložiště (`storage`, `unlimitedStorage`)**: Ukládání uživatelských předvoleb a dočasná úschova zpracovávaného PDF souboru před jeho vložením do chatu.
* **Karty (`tabs`, `activeTab`)**: Vyhledání otevřeného panelu s AI nebo otevření nového.
* **Skriptování (`scripting`)**: Detekce vloženého PDF prohlížeče na aktivní stránce.
* **Offscreen (`offscreen`)**: Lokální zpracování souborů v souladu s bezpečnostním modelem Chrome Manifest V3.

## 4. Zdrojový kód

Zdrojový kód je transparentně dostupný pod licencí Apache 2.0 na:
[https://github.com/SidloCZ/PDFImport](https://github.com/SidloCZ/PDFImport)
