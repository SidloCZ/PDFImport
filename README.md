# PDFImport – PDF to AI – Fast Import (Opera / Chromium Extension)

[English](README.md) | [Čeština](README.cs.md)

Browser extension for **Opera** (and any Chromium-based browser) that enables you to instantly load and attach any opened PDF document directly into **Google Gemini** chat with **1 click or a keyboard shortcut** - without having to download files to disk and manually re-upload them.

Works seamlessly with **online scientific papers and websites** (e.g., *ASM Journals, ScienceDirect, arXiv, Nature*) as well as **local PDF files on your disk** (`file:///...`).

---

## Installation Guide (Opera & Chromium Browsers)

1. Open **Opera** (or Chrome, Brave, Edge).
2. Enter the following URL into your address bar:
   ```text
   opera://extensions
   ```
   *(Or click the extensions cube icon in the top right corner and select **Manage extensions**).*
3. Toggle on **Developer mode** in the top right corner.
4. Click the **Load unpacked** button.
5. Select this project directory (the folder containing `manifest.json`).
6. The extension is installed and ready to use.

---

## IMPORTANT: Local File Access (file:///)

If you want to import local PDF files opened from your hard drive (`file:///...` paths):

1. Go to `opera://extensions` (or your browser's extensions page).
2. Find **PDFImport** and click **Details**.
3. Toggle on **"Allow access to file URLs"**.
   *(This security permission is required by Chromium for any extension accessing local files).*

---

## How to Use

When viewing any PDF article (e.g. [AEM Journal PDF](https://journals.asm.org/doi/pdf/10.1128/aem.00763-26)) or a local PDF file:

### Option 1: Keyboard Shortcut (Fastest)

* Press **`Alt + G`**.
* The extension fetches the PDF data in the background, focuses or opens Gemini, and attaches the file directly into the chat prompt.

### Option 2: Toolbar Icon

* Click the extension icon in your browser's extension toolbar.

### Option 3: Context Menu

* Right-click anywhere on a PDF page or on a link pointing to a PDF, and select **Send PDF to Gemini (Alt+G)**.

---

## Preferences and Default Prompt

Right-click the extension icon and select **Options**:

* **Default prompt**: Configure a template prompt that is automatically typed into Gemini after the PDF is attached (e.g., *"Summarize the key findings, methodology, and conclusions of this paper:"*).
* **Tab reuse**: Choose whether to switch to an already opened Gemini tab or always open a new tab.

---

## File Size Limits

The extension operates completely in browser memory and supports PDF documents up to **50 MB** (aligned with the Gemini limit). Files exceeding 50 MB are stopped before downloading to save bandwidth, and a warning notification is displayed.

---

## Project Structure

```text
PDFImport/
├── manifest.json              # Extension manifest (MV3)
├── src/                       # Extension source code (service worker, content script, options UI)
├── icons/                     # Runtime browser icons
├── _locales/                  # Localization files (English and Czech)
├── assets/                    # Graphic brand assets and store promotional media
├── docs/                      # Technical documentation, publishing plan, and roadmap
└── scripts/                   # Development and packaging automation
```

---

## Building for Release

To create a clean distribution ZIP package for Chrome Web Store and Opera Add-ons:

```bash
python scripts/pack_extension.py
```

The packaged archive will be saved in `dist/` (e.g. `dist/pdfimport-v1.0.0.zip`).

---

## Architecture: Custom PDF Viewer (Variant B)

Technical documentation and architectural design for replacing the browser's built-in PDF viewer with an HTML5 PDF.js viewer featuring a floating action button directly overlaid on the document is available in:
* [DOCS_VARIANTA_B.md](docs/DOCS_VARIANTA_B.md)

