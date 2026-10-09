# Chrome Web Store, Microsoft Edge Add-ons & Opera Add-ons Store Listings

Tento dokument obsahuje oficiální texty pro zápis v obchodech s doplňky (Chrome Web Store, Opera Add-ons).

---

## 1. Důvod zamítnutí "Yellow Argon" (Keyword Stuffing / Spam v klíčových slovech)

Google Chrome Web Store zakazuje v popisech doplňků uvádět dlouhé výčty značek, konkurentů nebo klíčových slov (tzv. *keyword stuffing* dle [Spam FAQ](https://developer.chrome.com/webstore/spam-faq#keyword-spam)).

Původní text:
> "Claude, ChatGPT, Google Gemini, DeepSeek, Microsoft Copilot, Kimi, Tencent Yuanbao, Z.ai (GLM), Meta AI, Alibaba Qwen, Grok, Perplexity, and LMSYS AI Arena."

byl robotem vyhodnocen jako snaha manipulovat vyhledávací algoritmus obchodu prostřednictvím výčtu cizích ochranných známek a jmen AI modelů.

### Pravidla pro bezproblémové schválení:
1. Neuvádět nekonečný čárkami oddělený seznam 10+ AI služeb.
2. Místo výčtu značek popsat funkci: integrace s předními webovými AI asistenty a podpora vlastních URL rozhraní.
3. Zaměřit se na uživatelskou hodnotu (funkce, klávesové zkratky, optimalizace velkých PDF, ochrana soukromí).
4. Žádné emoji (v souladu s pravidly projektu).

---

## 2. Texty pro Chrome Web Store Developer Console

### English (United States) – Primary

**Summary / Short Description (max 132 chars):**
```
Instantly import open PDF documents and online links into your preferred AI chat assistant without manual downloading.
```

**Detailed Description:**
```markdown
PDF to AI – Fast Import streamlines your workflow by eliminating the tedious friction of downloading PDF documents, saving them to disk, finding them in your file manager, and dragging them into your AI workspace.

With a single keyboard shortcut or click, PDF documents are fetched directly and forwarded into your active AI chat session.

KEY CAPABILITIES

• One-Click Import: Send any currently viewed PDF (including online URLs, local file:/// files, and embedded PDF viewer pages) straight to AI with Alt+G.
• Context Menu Integration: Right-click any hyperlink pointing to a PDF document on web pages, Google Scholar, arXiv, or PubMed to import it directly.
• Smart PDF Optimizer: Built-in local optimization dialog detects oversized documents and helps you extract specific page ranges or compress files before sending.
• Universal AI Compatibility: Configured out of the box to work seamlessly with leading web AI assistants and supports custom WebUI and LLM URLs.
• Intelligent Prompt Injection: Automatically pastes your default analysis prompt alongside attached files for instant answers.
• Local & Private: Runs entirely within your browser. No middleman servers, no analytics, no external tracking.

HOW TO USE

1. Open any PDF document in your browser (or right-click a PDF link).
2. Press Alt+G (or click the extension icon / context menu).
3. Your selected AI assistant opens automatically with the document attached and ready for your prompt.

PRIVACY & SECURITY

PDF to AI adheres to strict data privacy principles. The extension processes document data exclusively in your local browser session and communicates directly with your chosen assistant. No user data or document contents are ever collected, stored, or transmitted to third-party tracking servers.
```

---

### Čeština (Czech)

**Stručný popis (max 132 znaků):**
```
Automaticky a bleskově vloží otevřený PDF dokument do AI chatu bez nutnosti ručního stahování.
```

**Podrobný popis:**
```markdown
PDF to AI – Fast Import odstraňuje zdlouhavé a opakované stahování PDF dokumentů na disk, jejich vyhledávání ve složce stažených souborů a ruční přetahování do webového chatu umělé inteligence.

Jediným kliknutím nebo klávesovou zkratkou se otevřený dokument předá přímo do vašeho aktivního AI asistenta.

HLAVNÍ FUNKCE

• Import jedním kliknutím: Přeneste aktuálně otevřený PDF dokument (včetně webových odkazů, lokálních souborů file:/// i vestavěného prohlížeče) pomocí zkratky Alt+G.
• Kontextová nabídka: Klikněte pravým tlačítkem myši na jakýkoliv odkaz směřující na PDF (např. na webu, Google Scholar, arXiv nebo PubMed) a pošlete jej přímo do AI.
• Chytrá optimalizace: Automatická detekce velkých souborů s možností rychlého výběru stránek nebo zmenšení velikosti před odesláním.
• Univerzální kompatibilita: Připraveno pro okamžitou spolupráci s předními webovými AI asistenty i vlastními URL adresami.
• Automatický prompt: Možnost nastavit výchozí zadání (např. shrnutí dokumentu), které se automaticky vloží společně se souborem.
• Bezpečí a soukromí: Rozšíření běží výhradně lokálně ve vašem prohlížeči. Žádné prostřední servery, žádné sledování ani shromažďování dat.

JAK ROZŠÍŘENÍ POUŽÍVAT

1. Otevřete v prohlížeči libovolný PDF dokument (nebo klikněte pravým tlačítkem na odkaz na PDF).
2. Stiskněte zkratku Alt+G (nebo klikněte na ikonu rozšíření v liště / volbu v menu).
3. Otevře se váš nastavený AI asistent s připojeným dokumentem, připravený k práci.

OCHRANA SOUKROMÍ

PDF to AI klade důraz na maximální bezpečnost. Rozšíření zpracovává soubory výhradně lokálně ve vašem prohlížeči. Vaše dokumenty ani osobní údaje nejsou nikdy ukládány na cizí servery ani předávány třetím stranám.
```

---

## 3. Postup pro opětovné odeslání ke schválení (Chrome Web Store)

1. Otevřete [Chrome Web Store Developer Console](https://chrome.google.com/webstore/devconsole).
2. Vyberte položku **PDF to AI – Fast Import**.
3. Přejděte do sekce **Záznam v obchodě (Store listing)**:
   - Upravte **Popis (Detailed description)** pro angličtinu i češtinu výše uvedenými texty (odstraněn seznam značek).
4. Pokud Google požaduje nahrání nového balíčku kvůli verzi:
   - Spusťte: `python scripts/pack_extension.py`
   - V sekci **Balíček (Package)** nahrajte nový `dist/chrome/pdfimport-v1.6.1.zip`.
5. Klikněte na **Odeslat ke kontrole (Submit for review)**.

---

## 4. Společné údaje pro Chrome a Edge

### Kategorie

Vyberte:

```text
Productivity
```

### Website

```text
https://github.com/SidloCZ/PDFImport
```

### Support contact detail

```text
https://github.com/SidloCZ/PDFImport/issues
```

### Privacy policy URL

```text
https://github.com/SidloCZ/PDFImport/blob/main/PRIVACY_POLICY.md
```

### Search terms / tags

Použijte nejvýše těchto sedm výrazů. Každý má nejvýše dvě slova a neobsahuje seznam konkurenčních značek:

**English:**
```text
PDF import
AI chat
PDF assistant
PDF summary
PDF reader
PDF tools
PDF analysis
```

**Čeština:**
```text
PDF import
AI chat
PDF asistent
shrnutí PDF
čtení PDF
PDF nástroje
analýza PDF
```

### Promo assets

| Language | Small promotional tile | Large promotional tile |
|---|---|---|
| English | `assets/promo_tile_en_440x280.png` | `assets/promo_tile_en_1400x560.png` |
| Czech | `assets/promo_tile_cs_440x280.png` | `assets/promo_tile_cs_1400x560.png` |

Požadované rozměry jsou přesně `440 x 280 px` a `1400 x 560 px`.

---

## 5. Privacy practices a oprávnění

Texty jsou připravené v angličtině, protože je vyžaduje a posuzuje tým obchodu.

### Single purpose description

```text
PDF to AI – Fast Import lets users directly attach open or linked PDF documents to their chosen AI chat interface with one click or a keyboard shortcut, without manually downloading and re-uploading files.
```

### `activeTab` justification

```text
Used after a user action from the toolbar, keyboard shortcut, or context menu to inspect the current tab and detect the active PDF document or PDF viewer.
```

### `tabs` justification

```text
Used to find and reuse an existing AI chat tab, or open and activate a new tab when needed.
```

### `storage` justification

```text
Used to save user preferences such as the selected AI platform, custom AI URL, tab reuse setting, language, and prompt templates.
```

### `unlimitedStorage` justification

```text
Used to temporarily hold PDF data and extracted text during client-side transfer and processing. Temporary data is removed after the operation completes.
```

### `notifications` justification

```text
Used to display local status messages and warnings about PDF size limits, required permissions, or failed transfers.
```

### `scripting` justification

```text
Used after a user action to inspect the active tab and detect embedded PDF viewers or resolve the direct PDF document URL.
```

### `contextMenus` justification

```text
Used to provide right-click actions for importing the current PDF or a PDF linked on the page.
```

### `offscreen` justification

```text
Used for client-side processing of local file URLs and PDF optimization, including compression and text extraction, without a backend server.
```

### `file:///*` justification

```text
Required to access local PDF files only when the user explicitly imports a PDF opened from the local computer.
```

### Host permission justification

```text
Required to fetch PDF documents from websites and local file URLs after the user explicitly requests an import. Host access also allows the extension to interact with supported AI chat pages so the selected PDF can be attached. The extension does not collect browsing history or send data to any developer-controlled server.
```

### Remote code

Vyberte:

```text
No, I am not using remote code
```

Leave the remote-code justification empty if it is optional. All extension code and bundled PDF libraries are included in the package; the extension does not load or execute remote code.

### Data usage

Leave all user-data categories unchecked. The extension does not collect data for developer-controlled storage, analytics, or tracking. The PDF is sent to the AI service only after an explicit user action and only to the service selected by the user.

If the form shows certification statements, check all three only when they accurately reflect the submitted build:

- The extension does not sell user data or transfer it to the developer's servers.
- The extension does not use user data for purposes unrelated to its single purpose.
- The extension does not use user data for creditworthiness or lending decisions.

---

## 6. Certification notes for Chrome and Edge

When the submission form asks whether testers need credentials or other information, select:

```text
Yes, I need to provide credentials, accounts, or other info for testers
```

Use these notes, staying below the 2,000-character limit:

```text
No developer-provided credentials are required. The extension does not have its own account system or backend.

To test the complete workflow, reviewers should use their own account on one supported web-based AI chat service. The selected service may require the reviewer to sign in separately. The extension only transfers the PDF after the user explicitly starts the import.

Test steps:
1. Open the extension options and select an AI chat service.
2. Sign in to that service using the reviewer's own account.
3. Open an online PDF or a local PDF file.
4. Start the import with Alt+G, the extension toolbar button, or the context menu.
5. Verify that the selected AI chat opens and the PDF is attached.

For local files, enable Allow access to file URLs in the browser's extension settings. Large PDFs can be tested using the optimization dialog, which offers compression or text extraction.

No credentials are embedded in the extension, and no credentials or document data are sent to the developer. All document processing is performed locally in the browser. The document is sent only to the AI service selected by the user.
```

---

## 7. Microsoft Edge Add-ons submission

1. Open the Microsoft Partner Center listing for **PDF to AI – Fast Import**.
2. Complete **Properties** with the category, website, and support URL from section 4.
3. Complete **Privacy** using the single-purpose and permission texts from section 5.
4. Leave all data categories unchecked, select **No** for remote code, and add the certification notes from section 6.
5. Add the English and Czech descriptions from section 2.
6. Upload the language-specific promo tiles from section 4.
7. Upload the current package:

```text
dist/edge/pdfimport-v1.6.1.zip
```

8. Save the draft and publish it for certification.

---

## 8. Chrome Web Store privacy submission

For Chrome, use the same privacy and permission disclosures from sections 5 and 6. For a new package, build the current archives with:

```bash
python scripts/pack_extension.py
```

Then upload:

```text
dist/chrome/pdfimport-v1.6.1.zip
```

The extension was previously rejected under the **Yellow Argon** reference because the listing contained a long comma-separated list of AI brand names. Keep descriptions and search terms focused on the extension's function rather than listing competing services.
