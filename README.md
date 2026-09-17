# PDF to AI Chat Fast Import (Opera / Chromium Rozšíření)

Rozšíření pro prohlížeč **Opera** (a jakýkoliv Chromium prohlížeč), které umožňuje na **1 kliknutí nebo klávesovou zkratku** automaticky načíst a vložit otevřený PDF dokument přímo do **Google Gemini** chatu – bez nutnosti ručního stahování souboru na disk a jeho následného nahrávání.

Funguje jak pro **online vědecké články a weby** (např. *ASM Journals, ScienceDirect, arXiv, Nature*), tak pro **lokální PDF soubory z disku** (`file:///...`).

---

## Jak nainstalovat rozšíření do Opery

1. Otevřete prohlížeč **Opera**.
2. Do adresního řádku zadejte:
   ```text
   opera://extensions
   ```

   *(Případně klikněte na ikonu kostičky rozšíření vpravo nahoře a zvolte **Spravovat rozšíření**).*
3. V pravém horním rohu stránky zapněte přepínač **Vývojářský režim** (*Developer Mode*).
4. Klikněte na nově zobrazené tlačítko **Načíst rozbalené** (*Load unpacked*).
5. Vyberte složku s tímto staženým projektem (kde se nachází soubor `manifest.json`).
6. Rozšíření se ihned načte a objeví se v seznamu!

---

## DŮLEŽITÉ: Povolení pro lokální soubory (file:///)

Pokud chcete odesílat i PDF soubory, které máte uložené v počítači a otevřené v Opeře (cesta začínající na `file:///`):

1. Na stránce `opera://extensions` najděte kartu **PDF to AI Chat Fast Import**.
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

* Můžete nastavit **výchozí prompt**, který se po vložení souboru automaticky vyplní do chatu (např. *„Shrň klíčová zjištění a metodiku tohoto článku:“*).
* Můžete zvolit, zda se má vždy přepnout do již otevřené záložky Gemini, nebo otevírat nová.

---

## Varianta B (Vlastní PDF Viewer)

Kompletní technická dokumentace a návrh na nahrazení nativního PDF prohlížeče vlastním HTML5 PDF.js viewerem s plovoucím SVG tlačítkem přímo přes dokument se nachází v souboru:
* [DOCS_VARIANTA_B.md](DOCS_VARIANTA_B.md)
