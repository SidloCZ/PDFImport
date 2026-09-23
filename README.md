# PDFImport – PDF to AI – Fast Import (Opera / Chromium Extension)

[English](README.md) | [Čeština](README.cs.md)

Browser extension for **Opera** (and any Chromium-based browser) that enables you to instantly load and attach any opened PDF document directly into your favorite **AI chat platform** with **1 click or a keyboard shortcut** - without having to download files to disk and manually re-upload them.

Supports the **Top 10 AI platforms** out of the box, plus any **Custom AI URL**:

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
* **Custom AI URL** (OpenRouter, Poe, Local WebUI, etc.)

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
* The extension fetches the PDF data in the background, focuses or opens your selected AI platform, and attaches the file directly into the chat prompt.

### Option 2: Toolbar Icon

* Click the extension icon in your browser's extension toolbar.

### Option 3: Context Menu (Smart & Dynamic)

* **Always or Contextual Modes**: Configurable in Options. When enabled, always available everywhere. When set to contextual mode, it appears only on links, images, and open PDF documents.
* **Direct PDF Link Detection**: Right-clicking a link shows **Send linked PDF to [Selected AI]**.

---

## Preferences and Target AI Selection

Right-click the extension icon and select **Options**:

* **Target AI Platform**: Choose between Claude, ChatGPT, Kimi, Hy4, DeepSeek, Gemini, GLM, Meta AI, Qwen, Grok, or Custom URL.
* **Custom AI Web URL**: When "Custom URL" is selected, enter any URL (e.g. `https://openrouter.ai/chat`).
* **Tab reuse**: Choose whether to switch to an already opened AI tab or always open a new tab.
* **Right-Click Context Menu**: Choose whether to always display the item in the right-click menu or show it contextually only for links, images, and open PDFs.
* **Default prompt**: Configure a template prompt that is automatically typed into the chat after the PDF is attached (with built-in presets for **Quick Summary**, **Key Points**, **Peer Review**, and **Feynman**).
* **File Size Limits & Large PDF Action**: Configure the large file threshold (20, 30, 50, 100 MB) and preferred action (always ask, auto-compress, or text only).
* **Feedback & Issue Reporting**: Submit feature proposals or bug reports directly from Options with automatic diagnostic environment info pre-filled into a new GitHub Issue.
* **Extension Language**: Switch between English and Czech.

---

## File Size Limits & Large PDF Optimization

The extension features an intelligent **Large PDF Optimizer** to ensure seamless uploads even with heavy documents (e.g. 100–300 MB):

* **Threshold Detection (Default 30 MB / Configurable)**: When a PDF exceeds the threshold (or target AI platform limits like Claude's 30 MB ceiling), a clean optimization dialog is presented.
* **1. Compress PDF (Optimized PDF)**: Downscales embedded high-resolution graphics, photos, and scans to balanced web resolutions (JPEG 65%, max 1200px) or completely strips images if chosen. Retains vector text, typography, layout, and visual diagram readability.
* **2. Text Only (Extracted Text)**: Instantly extracts all readable text layers into a lightweight `.txt` attachment. Reduces size by up to 99.9%, eliminating token and upload overhead across all AI platforms.
* **100% Client-Side**: All compression and text extraction runs directly in your browser using bundled WebAssembly / JS engines (`pdf-lib` and `pdf.js`) with zero data leaving your machine.

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

The packaged archive will be saved in `dist/` (e.g. `dist/pdfimport-v1.2.0.zip`).
