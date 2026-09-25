/**
 * Offscreen Document Script for PDFImport
 * Runs in a DOM window context to allow fetching local file:/// resources
 * when "Allow access to file URLs" is granted by the user.
 * Note: chrome.storage is NOT accessible in offscreen documents.
 * File data is returned to the background service worker to be stored in chrome.storage.local.
 */

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Action 1: Get file metadata only (size, mimeType)
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

  // Action 2: Read file as DataURL and send/stream back to background service worker
  if (message.action === "OFFSCREEN_FETCH_LOCAL_FILE" || message.action === "OFFSCREEN_STORE_PENDING_PDF") {
    (async () => {
      try {
        const response = await fetch(message.url);
        if (!response.ok && !(message.url.startsWith("file://") && response.status === 0)) {
          throw new Error(`Failed to read local file (${response.status}: ${response.statusText})`);
        }

        const blob = await response.blob();
        const reader = new FileReader();

        reader.onloadend = () => {
          const dataUrl = reader.result;
          const CHUNK_SIZE = 15 * 1024 * 1024; // 15 MB chunk size (safe under 64 MB message limit)

          if (dataUrl.length <= CHUNK_SIZE) {
            sendResponse({
              success: true,
              dataUrl: dataUrl,
              size: blob.size,
              mimeType: blob.type || "application/pdf",
              isChunked: false
            });
          } else {
            const totalChunks = Math.ceil(dataUrl.length / CHUNK_SIZE);
            const transferId = "xfer_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);

            sendResponse({
              success: true,
              size: blob.size,
              mimeType: blob.type || "application/pdf",
              isChunked: true,
              transferId: transferId,
              totalChunks: totalChunks,
              chunkIndex: 0,
              data: dataUrl.slice(0, CHUNK_SIZE)
            });

            // Send remaining chunks
            (async () => {
              for (let i = 1; i < totalChunks; i++) {
                await new Promise((r) => setTimeout(r, 25));
                await chrome.runtime.sendMessage({
                  action: "OFFSCREEN_TRANSFER_CHUNK",
                  transferId: transferId,
                  chunkIndex: i,
                  totalChunks: totalChunks,
                  data: dataUrl.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)
                });
              }
            })();
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
});
