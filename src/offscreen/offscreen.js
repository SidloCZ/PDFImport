/**
 * Offscreen Document Script for PDFImport
 * Runs in a DOM window context to allow fetching local file:/// resources
 * when "Allow access to file URLs" is granted by the user.
 */

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Action 1: Get file metadata only (size, mimeType) - takes ~50 bytes over IPC
  if (message.action === "OFFSCREEN_GET_FILE_INFO") {
    (async () => {
      try {
        const response = await fetch(message.url);
        if (!response.ok && !(message.url.startsWith("file://") && response.status === 0)) {
          throw new Error(`Failed to read local file (${response.status}: ${response.statusText})`);
        }

        const blob = await response.blob();
        sendResponse({
          success: true,
          size: blob.size,
          mimeType: blob.type || "application/pdf"
        });
      } catch (err) {
        sendResponse({
          success: false,
          error: err.message || "Failed to inspect local file."
        });
      }
    })();
    return true;
  }

  // Action 2: Store file directly to chrome.storage.local from offscreen window (bypasses 64 MiB IPC message limit)
  if (message.action === "OFFSCREEN_STORE_PENDING_PDF") {
    (async () => {
      try {
        const response = await fetch(message.url);
        if (!response.ok && !(message.url.startsWith("file://") && response.status === 0)) {
          throw new Error(`Failed to read local file (${response.status}: ${response.statusText})`);
        }

        const blob = await response.blob();
        const reader = new FileReader();

        reader.onloadend = async () => {
          try {
            await chrome.storage.local.set({
              pendingPdf: {
                filename: message.filename,
                dataUrl: reader.result,
                size: blob.size,
                mimeType: blob.type || "application/pdf",
                prompt: message.prompt || "",
                targetAi: message.targetAi,
                targetAiName: message.targetAiName,
                timestamp: Date.now()
              }
            });

            // Send tiny acknowledgment back to background worker
            sendResponse({
              success: true,
              size: blob.size
            });
          } catch (storageErr) {
            sendResponse({
              success: false,
              error: storageErr.message || "Failed to save file to local storage."
            });
          }
        };

        reader.onerror = () => {
          sendResponse({
            success: false,
            error: "Failed to convert local file to DataURL."
          });
        };

        reader.readAsDataURL(blob);
      } catch (err) {
        sendResponse({
          success: false,
          error: err.message || "Failed to fetch local file."
        });
      }
    })();
    return true;
  }

  // Action 3: Legacy fetch handler with 30 MB size guard to prevent IPC message overflow
  if (message.action === "OFFSCREEN_FETCH_LOCAL_FILE") {
    (async () => {
      try {
        const response = await fetch(message.url);
        if (!response.ok && !(message.url.startsWith("file://") && response.status === 0)) {
          throw new Error(`Failed to read local file (${response.status}: ${response.statusText})`);
        }

        const blob = await response.blob();
        if (blob.size > 30 * 1024 * 1024) {
          sendResponse({
            success: false,
            error: "File exceeds 30 MB IPC limit. Use OFFSCREEN_STORE_PENDING_PDF instead.",
            size: blob.size
          });
          return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
          sendResponse({
            success: true,
            dataUrl: reader.result,
            size: blob.size,
            mimeType: blob.type || "application/pdf"
          });
        };
        reader.onerror = () => {
          sendResponse({
            success: false,
            error: "Failed to convert local file to DataURL."
          });
        };
        reader.readAsDataURL(blob);
      } catch (err) {
        sendResponse({
          success: false,
          error: err.message || "Failed to fetch local file."
        });
      }
    })();
    return true;
  }
});
