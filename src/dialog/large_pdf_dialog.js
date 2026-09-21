/**
 * Large PDF Optimization Dialog Controller
 * Handles user choice: 1) Compress PDF, 2) Text Only
 * Neo-brutalist UI, no emojis, full English and Czech support.
 */

(() => {
  let session = null;
  let isAborted = false;

  // DOM elements
  const elValFileName = document.getElementById("valFileName");
  const elValFileSize = document.getElementById("valFileSize");
  const elValTargetAi = document.getElementById("valTargetAi");

  const elChoices = document.getElementById("choicesContainer");
  const elProgress = document.getElementById("progressContainer");
  const elProgressStatus = document.getElementById("progressStatus");
  const elProgressBarFill = document.getElementById("progressBarFill");
  const elProgressDetails = document.getElementById("progressDetails");
  const elResultSummary = document.getElementById("resultSummary");
  const elAlertBanner = document.getElementById("alertBanner");
  const elFooter = document.getElementById("dialogFooter");

  const elBtnCompress = document.getElementById("btnCompress");
  const elBtnText = document.getElementById("btnText");
  const elBtnCancel = document.getElementById("btnCancel");
  const elChkStrip = document.getElementById("chkStripImages");

  // Tiny 1x1 transparent PNG for stripped images
  const TINY_PNG_B64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

  // Localization strings
  const I18N = {
    cs: {
      dialogTitle: "Velký PDF dokument",
      dialogSubtitle: "Soubor přesahuje doporučený limit AI chatů. Zvolte způsob přípravy.",
      labelFileName: "Soubor:",
      labelFileSize: "Velikost:",
      labelTargetAi: "Cílová AI:",
      titleCompress: "1. Komprese PDF",
      descCompress: "Optimalizuje obrázky a skeny. Zachová text, fonty, rozvržení i čitelnost grafů.",
      labelStripImages: "Odstranit obrázky úplně (pouze text a vektorová grafika)",
      btnCompressText: "Komprimovat a odeslat",
      titleText: "2. Pouze text",
      descText: "Okamžitá extrakce čitelného textu do souboru .txt. Zmenšení o 99.9 %, nulová zátěž pro AI.",
      btnTextText: "Extrahovat text a odeslat",
      btnCancel: "Zrušit",
      statusDownloading: "1/3 Stahování souboru...",
      statusProcessingCompress: "2/3 Optimalizace a komprese PDF...",
      statusProcessingText: "2/3 Extrakce textové vrstvy...",
      statusSaving: "3/3 Příprava pro odeslání do AI...",
      statusDone: "Hotovo! Přesměrování do chatu...",
      warnNoText: "Upozornění: Dokument neobsahuje čitelnou textovou vrstvu (pravděpodobně sken bez OCR). Pro zachování obsahu zvolte Kompresi PDF.",
      errorDownload: "Nepodařilo se stáhnout původní PDF soubor.",
      errorProcess: "Chyba při zpracování souboru: ",
      summaryCompress: (orig, comp, pct) => `Původní velikost: ${orig} MB -> Nová: ${comp} MB (-${pct} %)`,
      summaryText: (orig, chars) => `Text extrahován: ${chars} znaků (Původně: ${orig} MB)`
    },
    en: {
      dialogTitle: "Large PDF Document",
      dialogSubtitle: "File exceeds standard AI platform limits. Choose how to prepare it.",
      labelFileName: "File:",
      labelFileSize: "Size:",
      labelTargetAi: "Target AI:",
      titleCompress: "1. Compress PDF",
      descCompress: "Downscale high-res images and scans. Preserves text, fonts, layout, and visual readability.",
      labelStripImages: "Remove images completely (smallest file, text only)",
      btnCompressText: "Compress & Import",
      titleText: "2. Text Only",
      descText: "Instant extraction of readable text into a .txt file. 99.9% size reduction, zero image overhead.",
      btnTextText: "Extract Text & Import",
      btnCancel: "Cancel",
      statusDownloading: "1/3 Downloading file...",
      statusProcessingCompress: "2/3 Optimizing and compressing PDF...",
      statusProcessingText: "2/3 Extracting text layer...",
      statusSaving: "3/3 Finalizing for AI platform...",
      statusDone: "Complete! Forwarding to chat...",
      warnNoText: "Warning: Document has no readable text layer (likely scanned without OCR). Please use 'Compress PDF' to preserve visual pages.",
      errorDownload: "Failed to download the original PDF file.",
      errorProcess: "Error processing file: ",
      summaryCompress: (orig, comp, pct) => `Original: ${orig} MB -> New: ${comp} MB (-${pct} %)`,
      summaryText: (orig, chars) => `Text extracted: ${chars} characters (Original: ${orig} MB)`
    }
  };

  let currentLang = "en";

  // Initialize dialog
  async function init() {
    try {
      // Determine language
      const settings = await chrome.storage.sync.get({ userLanguage: "auto" });
      if (settings.userLanguage && settings.userLanguage !== "auto") {
        currentLang = settings.userLanguage === "cs" ? "cs" : "en";
      } else {
        const uiLang = (chrome.i18n.getUILanguage() || "en").toLowerCase();
        currentLang = uiLang.startsWith("cs") ? "cs" : "en";
      }
      applyLocalization();

      // Retrieve session
      const stored = await chrome.storage.local.get("largePdfSession");
      session = stored.largePdfSession;

      if (!session || !session.url) {
        showError("No active large PDF session found.");
        return;
      }

      // Populate file info
      elValFileName.textContent = session.filename || "document.pdf";
      const sizeMb = session.sizeBytes ? (session.sizeBytes / (1024 * 1024)).toFixed(1) : "—";
      elValFileSize.textContent = `${sizeMb} MB`;
      elValTargetAi.textContent = session.targetAiName || "AI";

      // Bind events
      elBtnCompress.addEventListener("click", onCompressClicked);
      elBtnText.addEventListener("click", onTextClicked);
      elBtnCancel.addEventListener("click", onCancelClicked);

    } catch (e) {
      showError(e.message);
    }
  }

  function applyLocalization() {
    const texts = I18N[currentLang] || I18N.en;
    document.getElementById("dialogTitle").textContent = texts.dialogTitle;
    document.getElementById("dialogSubtitle").textContent = texts.dialogSubtitle;
    document.getElementById("labelFileName").textContent = texts.labelFileName;
    document.getElementById("labelFileSize").textContent = texts.labelFileSize;
    document.getElementById("labelTargetAi").textContent = texts.labelTargetAi;
    document.getElementById("titleCompress").textContent = texts.titleCompress;
    document.getElementById("descCompress").textContent = texts.descCompress;
    document.getElementById("labelStripImages").textContent = texts.labelStripImages;
    document.getElementById("btnCompressText").textContent = texts.btnCompressText;
    document.getElementById("titleText").textContent = texts.titleText;
    document.getElementById("descText").textContent = texts.descText;
    document.getElementById("btnTextText").textContent = texts.btnTextText;
    document.getElementById("btnCancel").textContent = texts.btnCancel;
  }

  function showError(msg) {
    elAlertBanner.textContent = msg;
    elAlertBanner.style.display = "block";
  }

  function hideError() {
    elAlertBanner.style.display = "none";
  }

  function setProgress(status, pct, details) {
    elProgressStatus.textContent = status;
    elProgressBarFill.style.width = `${Math.min(100, Math.max(0, pct))}%`;
    if (details) {
      elProgressDetails.textContent = details;
    }
  }

  function switchToProgressView() {
    elChoices.style.display = "none";
    elProgress.style.display = "flex";
    hideError();
  }

  function switchToChoicesView() {
    elChoices.style.display = "flex";
    elProgress.style.display = "none";
  }

  async function onCancelClicked() {
    isAborted = true;
    await chrome.storage.local.remove("largePdfSession");
    window.close();
  }

  /**
   * Downloads the PDF file with progress monitoring
   */
  async function downloadPdfArrayBuffer(url) {
    const texts = I18N[currentLang] || I18N.en;
    setProgress(texts.statusDownloading, 10, "Fetching document stream...");

    const fetchOptions = url.startsWith("file://") ? {} : { credentials: "include" };
    const response = await fetch(url, fetchOptions);
    if (!response.ok) {
      throw new Error(`${texts.errorDownload} (${response.status}: ${response.statusText})`);
    }

    const contentLength = response.headers.get("content-length");
    const totalBytes = contentLength ? parseInt(contentLength, 10) : session.sizeBytes || 0;

    if (!response.body || !window.ReadableStream) {
      const buffer = await response.arrayBuffer();
      setProgress(texts.statusDownloading, 40, "Download completed.");
      return buffer;
    }

    const reader = response.body.getReader();
    let receivedBytes = 0;
    const chunks = [];

    while (true) {
      if (isAborted) throw new Error("Processing cancelled by user.");
      const { done, value } = await reader.read();
      if (done) break;

      chunks.push(value);
      receivedBytes += value.length;

      if (totalBytes > 0) {
        const pct = Math.round((receivedBytes / totalBytes) * 40);
        const mb = (receivedBytes / (1024 * 1024)).toFixed(1);
        const totalMb = (totalBytes / (1024 * 1024)).toFixed(1);
        setProgress(texts.statusDownloading, 5 + pct, `${mb} MB / ${totalMb} MB (${Math.round((receivedBytes / totalBytes) * 100)}%)`);
      } else {
        const mb = (receivedBytes / (1024 * 1024)).toFixed(1);
        setProgress(texts.statusDownloading, 25, `${mb} MB downloaded...`);
      }
    }

    const allBytes = new Uint8Array(receivedBytes);
    let position = 0;
    for (const chunk of chunks) {
      allBytes.set(chunk, position);
      position += chunk.length;
    }

    return allBytes.buffer;
  }

  /**
   * Action 1: Compress PDF
   */
  async function onCompressClicked() {
    const texts = I18N[currentLang] || I18N.en;
    try {
      switchToProgressView();
      const stripImages = elChkStrip.checked;

      // 1. Download
      const arrayBuffer = await downloadPdfArrayBuffer(session.url);
      if (isAborted) return;

      // 2. Load with pdf-lib
      setProgress(texts.statusProcessingCompress, 45, "Loading PDF structure...");
      const PDFLibInstance = window.PDFLib;
      if (!PDFLibInstance) {
        throw new Error("pdf-lib library not found.");
      }

      const pdfDoc = await PDFLibInstance.PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
      const pages = pdfDoc.getPages();
      setProgress(texts.statusProcessingCompress, 55, `Processing ${pages.length} pages...`);

      let tinyRef = null;
      if (stripImages) {
        const tinyPngBytes = Uint8Array.from(atob(TINY_PNG_B64), c => c.charCodeAt(0));
        const embeddedTiny = await pdfDoc.embedPng(tinyPngBytes);
        tinyRef = embeddedTiny.ref;
      }

      // Downsample / optimize images
      let processedImages = 0;
      const indirectObjects = pdfDoc.context.enumerateIndirectObjects();

      for (let i = 0; i < indirectObjects.length; i++) {
        if (isAborted) return;
        const [ref, obj] = indirectObjects[i];

        if (obj instanceof PDFLibInstance.PDFRawStream || obj instanceof PDFLibInstance.PDFStream) {
          const dict = obj.dict;
          if (!dict) continue;
          const subtype = dict.get(PDFLibInstance.PDFName.of("Subtype"));
          if (subtype && subtype.toString() === "/Image") {
            processedImages++;
            const pct = 55 + Math.round((i / indirectObjects.length) * 25);
            setProgress(texts.statusProcessingCompress, pct, `Optimizing embedded image #${processedImages}...`);

            if (stripImages && tinyRef) {
              // Replace image stream with 1x1 image
              const tinyObj = pdfDoc.context.lookup(tinyRef);
              if (tinyObj) {
                obj.contents = tinyObj.contents;
                obj.dict = tinyObj.dict;
              }
            } else {
              // Downscale large image
              try {
                const streamBytes = obj.getContents();
                const filter = dict.get(PDFLibInstance.PDFName.of("Filter"))?.toString() || "";
                const optimizedBytes = await compressImageBytes(streamBytes, filter, 1200, 0.65);
                if (optimizedBytes && optimizedBytes.length < streamBytes.length) {
                  const embeddedJpg = await pdfDoc.embedJpg(optimizedBytes);
                  const newObj = pdfDoc.context.lookup(embeddedJpg.ref);
                  if (newObj) {
                    obj.contents = newObj.contents;
                    obj.dict = newObj.dict;
                  }
                }
              } catch (imgErr) {
                // If single image fails, skip and continue
              }
            }
          }
        }
      }

      // 3. Save
      setProgress(texts.statusSaving, 85, "Saving optimized document...");
      const optimizedPdfBytes = await pdfDoc.save({ useObjectStreams: true });
      const origMb = (arrayBuffer.byteLength / (1024 * 1024)).toFixed(1);
      const newMb = (optimizedPdfBytes.byteLength / (1024 * 1024)).toFixed(1);
      const pctSaved = Math.max(0, Math.round(((arrayBuffer.byteLength - optimizedPdfBytes.byteLength) / arrayBuffer.byteLength) * 100));

      elResultSummary.textContent = texts.summaryCompress(origMb, newMb, pctSaved);
      elResultSummary.style.display = "block";
      setProgress(texts.statusDone, 100, elResultSummary.textContent);

      // Convert to Base64
      const blob = new Blob([optimizedPdfBytes], { type: "application/pdf" });
      const dataUrl = await blobToBase64(blob);

      let cleanName = session.filename || "document.pdf";
      if (!cleanName.toLowerCase().endsWith(".pdf")) cleanName += ".pdf";
      const baseName = cleanName.replace(/\.pdf$/i, "");
      const finalFileName = `${baseName}_optimized.pdf`;

      // Store in pendingPdf
      await chrome.storage.local.set({
        pendingPdf: {
          filename: finalFileName,
          dataUrl: dataUrl,
          size: blob.size,
          mimeType: "application/pdf",
          prompt: session.defaultPrompt || "",
          targetAi: session.targetAi,
          targetAiName: session.targetAiName,
          timestamp: Date.now()
        }
      });

      // Notify background to open tab
      await chrome.runtime.sendMessage({
        action: "LARGE_PDF_COMPLETED",
        reuseTab: session.reuseTab !== false
      });

      setTimeout(() => window.close(), 900);

    } catch (err) {
      if (isAborted) return;
      switchToChoicesView();
      showError(texts.errorProcess + err.message);
    }
  }

  /**
   * Action 2: Extract Text
   */
  async function onTextClicked() {
    const texts = I18N[currentLang] || I18N.en;
    try {
      switchToProgressView();

      // 1. Download
      const arrayBuffer = await downloadPdfArrayBuffer(session.url);
      if (isAborted) return;

      // 2. Extract text with PDF.js
      setProgress(texts.statusProcessingText, 45, "Loading text extractor...");
      const pdfjs = window.pdfjsLib;
      if (!pdfjs) {
        throw new Error("pdfjsLib library not found.");
      }

      pdfjs.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL("src/vendor/pdf.worker.min.js");

      const loadingTask = pdfjs.getDocument({
        data: new Uint8Array(arrayBuffer),
        isEvalSupported: false,
        useSystemFonts: true
      });

      const pdf = await loadingTask.promise;
      const numPages = pdf.numPages;
      const textParts = [];
      let totalChars = 0;

      for (let i = 1; i <= numPages; i++) {
        if (isAborted) return;
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        let lastY = null;
        let pageStr = "";
        for (const item of textContent.items) {
          if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
            pageStr += "\n";
          } else if (pageStr.length > 0 && !pageStr.endsWith("\n") && !pageStr.endsWith(" ")) {
            pageStr += " ";
          }
          pageStr += item.str;
          lastY = item.transform[5];
        }

        const trimmed = pageStr.trim();
        if (trimmed.length > 0) {
          textParts.push(`--- Page ${i} ---\n${trimmed}`);
          totalChars += trimmed.length;
        }

        const pct = 45 + Math.round((i / numPages) * 35);
        setProgress(texts.statusProcessingText, pct, `Extracting page ${i} of ${numPages}...`);
      }

      // Check if text exists (scanned PDF detection)
      if (totalChars < 50) {
        switchToChoicesView();
        showError(texts.warnNoText);
        return;
      }

      const fullText = textParts.join("\n\n");
      const origMb = (arrayBuffer.byteLength / (1024 * 1024)).toFixed(1);
      elResultSummary.textContent = texts.summaryText(origMb, totalChars.toLocaleString());
      elResultSummary.style.display = "block";
      setProgress(texts.statusSaving, 90, elResultSummary.textContent);

      // Create .txt Blob
      const textBlob = new Blob([fullText], { type: "text/plain;charset=utf-8" });
      const dataUrl = await blobToBase64(textBlob);

      let cleanName = session.filename || "document.pdf";
      const baseName = cleanName.replace(/\.pdf$/i, "");
      const finalFileName = `${baseName}_text.txt`;

      // Store in pendingPdf
      await chrome.storage.local.set({
        pendingPdf: {
          filename: finalFileName,
          dataUrl: dataUrl,
          size: textBlob.size,
          mimeType: "text/plain",
          prompt: session.defaultPrompt || "",
          targetAi: session.targetAi,
          targetAiName: session.targetAiName,
          timestamp: Date.now()
        }
      });

      // Notify background to open tab
      await chrome.runtime.sendMessage({
        action: "LARGE_PDF_COMPLETED",
        reuseTab: session.reuseTab !== false
      });

      setProgress(texts.statusDone, 100, texts.statusDone);
      setTimeout(() => window.close(), 900);

    } catch (err) {
      if (isAborted) return;
      switchToChoicesView();
      showError(texts.errorProcess + err.message);
    }
  }

  /**
   * Helper: Downsamples image stream via Canvas
   */
  async function compressImageBytes(bytes, filter, maxDim = 1200, quality = 0.65) {
    let mime = "image/jpeg";
    if (filter.includes("FlateDecode")) mime = "image/png";

    const blob = new Blob([bytes], { type: mime });
    let imgBitmap = null;
    try {
      imgBitmap = await createImageBitmap(blob);
    } catch (e) {
      return null;
    }

    let width = imgBitmap.width;
    let height = imgBitmap.height;

    // Skip if already small
    if (width <= maxDim && height <= maxDim && blob.size < 200 * 1024) {
      imgBitmap.close();
      return null;
    }

    if (width > maxDim || height > maxDim) {
      if (width > height) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(imgBitmap, 0, 0, width, height);
    imgBitmap.close();

    return new Promise((resolve) => {
      canvas.toBlob((outBlob) => {
        if (!outBlob) return resolve(null);
        outBlob.arrayBuffer().then(buf => resolve(new Uint8Array(buf)));
      }, "image/jpeg", quality);
    });
  }

  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // Run on load
  document.addEventListener("DOMContentLoaded", init);
})();
