# Known limitations — Webxdc Creator Studio 1.4.4

* **Preview ≠ real chat.** The preview iframe uses a local mock of webxdc. Updates never leave the screen. Always test in a real chat before sharing.
* **Collaboration** uses only `window.webxdc.sendUpdate` of the current chat. No external server. Presence is off by default.
* **Import Deflate.** Requires `DecompressionStream` where available; Store method always works.
* **Monaco** is optional and does not ship full TypeScript language services. If it fails to load, the textarea editor remains available.
* **System back gesture** is owned by the messenger / OS. Studio does not override it.
* **Project limits:** 200 files, 2 MB per file, 12 MB total; images ≤ 1.5 MB.
* **No network** inside mini apps: no CDNs, remote fonts, or external APIs.
