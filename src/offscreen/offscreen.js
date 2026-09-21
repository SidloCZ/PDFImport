/**
 * Offscreen Document Script for PDFImport
 * Runs in a DOM window context to allow fetching local file:/// resources
 * when "Allow access to file URLs" is granted by the user.
 */

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "OFFSCREEN_FETCH_LOCAL_FILE") {
    (async () => {
      try {
        const response = await fetch(message.url);
        if (!response.ok) {
          throw new Error(`Failed to read local file (${response.status}: ${response.statusText})`);
        }

        const blob = await response.blob();
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
    return true; // Keep message channel open for async response
  }
});
