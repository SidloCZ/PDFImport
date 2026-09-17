# Plán implementace a publikace rozšíření (PDFImport)

Tento dokument shrnuje architektonický a vizuální styl aplikace, cenové a licenční podmínky pro publikaci v obchodech s doplňky (Opera Add-ons, Chrome Web Store) a konkrétní kroky potřebné pro úspěšné vydání.

---

## 1. Vizuální identita a designový styl aplikace

Rozhraní aplikace (stránka s možnostmi, notifikační toasty a diagnostické panely) se řídí principy **Neo-brutalismu** propojeného s **funkčním minimalismem**.

### Klíčové vizuální prvky:
* **Neo-brutalistické ohraničení a stíny:**
  * Silné černé rámečky: `border: 3px solid #000000;`
  * Ostré, tvrdé vržené stíny bez rozostření: `box-shadow: 4px 4px 0px 0px #000000;`
  * Interaktivní haptická odezva: při najetí myší `6px 6px`, při stisknutí `2px 2px` (efekt mechanického zamáčknutí).
* **Barevná paleta:**
  * Pozadí: světle hlinitý / papírový odstín `--bg-clay: #f4efe6;`
  * Karty: čistě bílá `--bg-card: #ffffff;`
  * Signální akcenty: sytě žlutá (`#ffe600`), jemně žlutá (`#fef08a`), limetková (`#00f59b`), azurová (`#00d2ff`), oranžová (`#ff6b35`) a růžová (`#ff2a85`).
* **Typografie:**
  * Hlavní text a výrazné nadpisy: geometrický bezpatkový font **Space Grotesk**.
  * Systémové štítky, kód a klávesové zkratky: neproporcionální font **Space Mono**.

### Závazná projektová pravidla (AGENTS.md):
* **Méně je více:** Jednoduchost, čistota a eliminace zbytečného vizuálního balastu.
* **Striktní zákaz emoji:** V celém projektu (uživatelské rozhraní, kontextové nabídky, toasty, tlačítka, kód, loga i commit zprávy) se nesmí používat žádné emotikony.
* **SVG ikony místo emoji:** Pro vizuální záchytné body se používají výhradně čisté vektorové SVG symboly.
* **Jazyková podpora:** Výchozím jazykem je angličtina (EN), plně podporovaným sekundárním jazykem čeština (CS).

---

## 2. Cenové podmínky publikace v obchodech

| Obchod | Poplatek | Frekvence platby | Podmínky a limity |
| :--- | :--- | :--- | :--- |
| **Opera Add-ons** | **0 USD (Zdarma)** | Žádná | Bez poplatků za registraci či schvalování. Uživatelé Opery navíc mohou instalovat i přímo z Chrome Web Store. |
| **Chrome Web Store** | **5 USD (cca 115 Kč)** | Jednorázově | Poplatek za aktivaci vývojářského účtu (Google Pay / platební karta). Platí natrvalo pro až 20 rozšíření. |
| **Microsoft Edge Add-ons** | **0 USD (Zdarma)** | Žádná | Registrace a publikace doplňků pro Edge je bezplatná. |
| **Firefox Add-ons (AMO)** | **0 USD (Zdarma)** | Žádná | Bezplatné v případě budoucího rozšíření pro Firefox. |

---

## 3. Akční plán kroků pro publikaci (Checklist)

### Fáze 1: Příprava zdrojového kódu a metadat
1. **Manifest (manifest.json):**
   * Zkontrolovat sémantickou verzi (`version: "1.0.0"`).
   * Ověřit lokalizované názvy a popisy v `_locales/en/messages.json` a `_locales/cs/messages.json`.
   * Zkontrolovat deklarovaná oprávnění (`permissions: ["storage", "activeTab", "contextMenus"]`) a minimalizovat požadované přístupy pro hladké schválení.
2. **Kód a bezpečnost:**
   * Odstranit nebo vypnout dočasné vývojové debugovací logy v `src/content_gemini.js` a `src/background.js`.
   * Ověřit dodržení Content Security Policy (CSP).

### Fáze 2: Grafické podklady pro obchody (Store Assets)
1. **Ikony aplikace:**
   * 16x16, 48x48 a 128x128 px (vygenerováno v adresáři `icons/` pomocí skriptu `scripts/generate_icons.py`).
2. **Propagační grafika (vyžadováno Chrome Web Store / Opera, ukládat do `assets/`):**
   * Malá propagační dlaždice: 440 x 280 px.
   * Screenshoty rozhraní: 1280 x 800 px nebo 640 x 400 px (screenshot stránky nastavení a ukázka vložení do Gemini chatu).
   * Marquee banner (volitelný): 1400 x 560 px.
   * Zdrojová vektorová a rastrová loga: uložena v `assets/branding/`.

### Fáze 3: Právní náležitosti a Zásady ochrany soukromí (Privacy Policy)
1. Připravit jednoduchou stránku Privacy Policy (např. na GitHub Pages):
   * Prohlášení o tom, že rozšíření neshromažďuje ani neodesílá žádné osobní údaje na cizí servery.
   * Veškeré operace s PDF a komunikace s Gemini probíhá lokálně v prohlížeči uživatele.
2. Vyplnit formulář "Single Purpose Description" (vysvětlení hlavního účelu: okamžité předání otevřeného PDF do chatu AI bez nutnosti ukládání na disk).

### Fáze 4: Sestavení balíčku a nahrání
1. **Vytvoření produkčního ZIP archivu:**
   * Spustit automatický balicí skript:
     ```bash
     python scripts/pack_extension.py
     ```
   * Skript automaticky načte verzi z `manifest.json` a vytvoří čistý ZIP archiv v adresáři `dist/` (např. `dist/pdfimport-v1.0.0.zip`).
   * Zahrnuty jsou pouze distribuční položky: `manifest.json`, `src/`, `icons/`, `_locales/`.
   * Automaticky jsou vynechány: `.git/`, `assets/`, `docs/`, `scripts/`, `dist/` a interní poznámky.
2. **Nahrání do vývojářské konzole:**
   * Opera: [addons.opera.com/developer](https://addons.opera.com/developer/)
   * Chrome: [chrome.google.com/webstore/devconsole](https://chrome.google.com/webstore/devconsole/)
