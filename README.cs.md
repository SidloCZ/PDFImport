# PDFImport – PDF to AI – Fast Import (Opera / Chromium Rozšíření)

[English](README.md) | [Čeština](README.cs.md)

Rozšíření pro prohlížeč **Opera** (a jakýkoliv Chromium prohlížeč), které umožňuje na **1 kliknutí nebo klávesovou zkratku** automaticky načíst a vložit otevřený PDF dokument přímo do **Google Gemini** chatu – bez nutnosti ručního stahování souboru na disk a jeho následného nahrávání.

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
* Rozšíření stáhne PDF data na pozadí, aktivuje záložku Gemini a soubor ihned vloží do zprávy.

### Možnost 2: Ikona v liště

* Klikněte na ikonu rozšíření v pravém horním rohu lišty prohlížeče.

### Možnost 3: Kontextové menu

* Kdekoliv na stránce nebo na odkazu vedoucím na PDF klikněte pravým tlačítkem myši a zvolte **Odeslat PDF do Gemini (Alt+G)**.

---

## Předvolby a automatický prompt

Klikněte na ikonu rozšíření pravým tlačítkem a zvolte **Možnosti** (*Options*):

* Můžete nastavit **výchozí prompt**, který se po vložení souboru automaticky vyplní do chatu (k dispozici jsou předvolby **Rychlé shrnutí**, **Klíčové body**, **Peer Review** a **Feynman**).
* Můžete zvolit, zda se má vždy přepnout do již otevřené záložky Gemini, nebo otevírat nová.

---

## Limity velikosti souborů

Rozšíření pracuje výhradně v operační paměti prohlížeče a podporuje PDF dokumenty až do velikosti **50 MB** (což odpovídá limitu Gemini). Pokud soubor limit 50 MB přesáhne, stahování se zastaví ještě před přenesením celého souboru pro úsporu dat a uživatel je upozorněn notifikací.

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

Výsledný ZIP archiv se vygeneruje do složky `dist/` (např. `dist/pdfimport-v1.0.0.zip`).

---

## Varianta B (Vlastní PDF Viewer)

Kompletní technická dokumentace a návrh na nahrazení nativního PDF prohlížeče vlastním HTML5 PDF.js viewerem s plovoucím tlačítkem přímo přes dokument se nachází v souboru:
* [DOCS_VARIANTA_B.md](docs/DOCS_VARIANTA_B.md)

