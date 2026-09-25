=== PDFIMPORT DIAGNOSTIC REPORT ===
Timestamp: 2026-09-25T17:01:38.339Z
Platform: Gemini (id: gemini)
URL: https://gemini.google.com/app
Title: Google Gemini
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.120 Safari/537.36
Viewport: 1536x698

--- DOM ELEMENTS ---
File inputs count: 0
Chat input: <div id="" class="ql-editor textarea new-input-ui" contenteditable="true">
Attach button: NOT FOUND

--- CHRONOLOGICAL LOGS (22) ---
[19:00:59] [info] Platform initialized: Gemini (gemini.google.com)
[19:00:59] [info] Received action message: PROCESS_PENDING_PDF
[19:00:59] [info] Pending PDF found: 505-Article Text-10809-12846-10-20260828.pdf (1428.5 KB) targeting Gemini
[19:00:59] [info] Waiting for Gemini chat input ready...
[19:00:59] [info] --- Starting insertion workflow: 505-Article Text-10809-12846-10-20260828.pdf ---
[19:00:59] [info] STEP 1: Inspecting input[type='file'] elements...
[19:00:59] [info] Found 0 input[type='file'] element(s) on page.
[19:00:59] [info] STEP 2: Searching for attach / upload button...
[19:00:59] [info] Attach button not found.
[19:00:59] [info] STEP 3: Simulating Drag & Drop...
[19:00:59] [info] Simulating drop on <textarea class="gds-body-l">...
[19:01:00] [info] Processing already in progress, skipping.
[19:01:00] [info] Simulating drop on <div class="input-area-container is-zero-s">...
[19:01:01] [info] Simulating drop on <main class="chat-app">...
[19:01:02] [info] Page load completed
[19:01:02] [info] Simulating drop on <body class="overflow-hidden ssr-nav-open e">...
[19:01:03] [info] STEP 4: Simulating Clipboard Paste event...
[19:01:03] [info] Paste event dispatched, checking...
[19:01:03] [info] Processing already in progress, skipping.
[19:01:04] [info] Attachment element verified via selector: "[class*="attachment"]"
[19:01:04] [success] [OK] Attachment verified after Paste event!
[19:01:04] [info] Typing prompt text into chat input...
===================================

it does import it twice, I think it should only limit itself to importing once and then check if it was imported or ask the user to retry with the second way. 