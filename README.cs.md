# PDFImport – PDF to AI – Fast Import (Opera / Chromium Rozšíření)

[English](README.md) | [Čeština](README.cs.md)

Rozšíření pro prohlížeč **Opera** (a jakýkoliv Chromium prohlížeč), které umožňuje na **1 kliknutí nebo klávesovou zkratku** automaticky načíst a vložit otevřený PDF dokument přímo do vašeho oblíbeného **AI chatu** – bez nutnosti ručního stahování souboru na disk a jeho následného nahrávání.

Nativně podporuje **10 nejlepších AI platforem** a možnost zadat libovolnou **vlastní URL**:

* **Anthropic** (Claude)
* **OpenAI** (ChatGPT)
* **Google** (Gemini)
* **DeepSeek**
* **Microsoft** (Copilot)
* **Moonshot** (Kimi)
* **Tencent** (Hy4 / Yuanbao)
* **Z.ai** (GLM)
* **Meta** (Meta AI)
* **Alibaba** (Qwen)
* **SpaceXAI** (Grok)
* **Perplexity**
* **Vlastní AI platforma / URL** (OpenRouter, Poe, lokální WebUI apod.)

Funguje jak pro **online vědecké články a weby** (např. *ASM Journals, ScienceDirect, arXiv, Nature*), tak pro **lokální PDF soubory z disku** (`file:///...`).

---

## Jak nainstalovat rozšíření do Opery

1. Otevřete prohlížeč **Opera** (nebo jiný Chromium prohlížeč).
2. Do adresního řádku zadejte:
   ```text
   opera://extensions
   ```
   *(Případně klikněte na ikonu kostičky rozšíření vpravo nahoře a zvolte **Spravovat rozšíření**).*
3. V pravém horním rohu stránky zapněte přepínač **Vývojářský režim** (*Developer Mode*).
4. Klikněte na nově zobrazené tlačítko **Načíst rozbalené** (*Load unpacked*).
5. Vyberte složku s tímto staženým projektem (kde se nachází soubor `manifest.json`).
6. Rozšíření se ihned načte a objeví se v seznamu.

---

## DŮLEŽITÉ: Povolení pro lokální soubory (file:///)

Pokud chcete odesílat i PDF soubory, které máte uložené v počítači a otevřené v prohlížeči (cesta začínající na `file:///`):

1. Na stránce `opera://extensions` najděte kartu **PDFImport**.
2. Klikněte na tlačítko **Podrobnosti** (*Details*).
3. Zapněte přepínač **„Povolit přístup k adresám URL souborů“** (*Allow access to file URLs*).
   *(Tuto bezpečnostní volbu vyžaduje jádro Chromium pro všechna rozšíření přistupující k lokálnímu disku).*

---

## Jak rozšíření používat

Máte otevřený jakýkoliv PDF článek (např. [AEM Journal PDF](https://journals.asm.org/doi/pdf/10.1128/aem.00763-26)) nebo lokální PDF:

### Možnost 1: Klávesová zkratka (Nejrychlejší)

* Stiskněte **`Alt + G`**.
* Rozšíření stáhne PDF data na pozadí, aktivuje záložku vybrané AI a soubor ihned vloží do zprávy.

### Možnost 2: Ikona v liště

* Klikněte na ikonu rozšíření v pravém horním rohu lišty prohlížeče.

### Možnost 3: Kontextové menu (Chytré a dynamické)

* **Trvalé nebo kontextové zobrazení**: Nastavitelné v Možnostech. Při zaškrtnutí je položka k dispozici pořád na všech stránkách. Při odškrtnutí se zobrazuje pouze kontextově: u odkazů, obrázků a otevřených PDF.
* **Detekce PDF odkazů**: Při kliknutí pravým tlačítkem na odkaz se nabízí možnost **Odeslat odkazované PDF**.

---

## Nastavení a volba cílové AI

Klikněte na ikonu rozšíření pravým tlačítkem a zvolte **Možnosti** (*Options*):

* **Cílová AI platforma**: Vyberte mezi Claude, ChatGPT, Kimi, Hy4, DeepSeek, Gemini, GLM, Meta AI, Qwen, Grok, nebo Vlastní URL.
* **Vlastní adresa AI chatu**: Při volbě „Custom URL“ zadejte libovolnou adresu (např. `https://openrouter.ai/chat`).
* **Použít již otevřenou záložku**: Zvolte, zda se má přepnout do otevřené záložky dané AI, nebo otevírat nová.
* **Položka v menu pravého tlačítka**: Volba mezi trvalým zobrazením na všech stránkách nebo pouze kontextovým zobrazením u odkazů, obrázků a otevřených PDF.
* **Automatický prompt**: Nastavte šablonu dotazu, která se po vložení souboru automaticky vyplní do chatu (k dispozici jsou předvolby **Rychlé shrnutí**, **Klíčové body**, **Peer Review** a **Feynman**).
* **Jediný pokus o vložení a spolehlivé ověření**: Nikdy nespouští vícenásobné přetažení nebo vložení současně. Využívá zacílené dotazování na přítomnost čipu přílohy (až 5 sekund) zohledňující dobu nahrávání na server a v případě nepotvrzení nabídne tlačítko pro okamžité opakování alternativní metodou.
* **Limity velikosti a akce při velkém PDF**: Nastavení prahové hodnoty (20, 30, 50, 100 MB) a výchozí akce (vždy se zeptat, automaticky komprimovat, pouze text).
* **Návrhy změn a hlášení chyb**: Přímo ze stránky nastavení můžete odeslat námět nebo nahlásit chybu s automatickým předvyplněním textu i diagnostických dat do nového GitHub Issue.
* **Jazyk rozšíření**: Přepínejte mezi češtinou a angličtinou.

---

## Limity velikosti souborů a optimalizace velkých PDF

Rozšíření obsahuje inteligentní **optimalizátor velkých PDF**, který zajišťuje bezproblémový import i u masivních dokumentů (např. 100–300 MB):

* **Detekce překročení limitu (výchozí 30 MB / nastavitelné)**: Pokud PDF překročí hranici (nebo limity cílové AI, jako je strop 30 MB na Claude.ai), otevře se přehledný minimalistický dialog pro přípravu souboru.
* **1. Komprese PDF (Optimalizované PDF)**: Zmenší rozlišení vložených tiskových fotografií, rastrů a skenů na efektivní webové rozlišení (JPEG 65 %, max 1200 px) nebo volitelně odstraní obrázky úplně. Zachovává kompletní vektorový text, sazbu stránek i čitelnost schémat a grafů.
* **2. Pouze text (Extrakce textové vrstvy)**: Bleskově vytáhne veškerý čitelný text do samostatné přílohy `.txt`. Zmenší datovou velikost až o 99.9 % a eliminuje zbytečnou spotřebu tokenů a přenosových limitů u všech AI.
* **100% zpracování v prohlížeči**: Veškerá komprese a extrakce probíhá lokálně na vašem počítači pomocí vestavěných knihoven (`pdf-lib` a `pdf.js`), žádná data se neposílají na žádný externí server.

---

## Struktura projektu

```text
PDFImport/
├── manifest.json              # Vstupní manifest rozšíření (MV3)
├── src/                       # Zdrojový kód (service worker, content script, rozhraní nastavení)
├── icons/                     # Ikony rozšíření pro prohlížeč
├── _locales/                  # Lokalizační soubory (čeština a angličtina)
├── assets/                    # Grafické materiály loga a propagační grafika pro obchody
├── docs/                      # Technická dokumentace, plán publikace a todolist
└── scripts/                   # Automatizační a pomocné skripty
```

---

## Sestavení produkčního balíčku

Pro vytvoření čistého distribučního ZIP archivu pro Chrome Web Store a Opera Add-ons spusťte:

```bash
python scripts/pack_extension.py
```

Výsledný ZIP archiv se vygeneruje do složky `dist/` (např. `dist/pdfimport-v1.3.4.zip`).
