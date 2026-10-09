# Chrome Web Store & Opera Add-ons Store Listings

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
