# Known limitations — Webxdc Creator Studio 2.0.0

* **Preview ≠ real chat.** The preview iframe uses a local mock of webxdc. Updates never leave the screen. Always test in a real chat before sharing.
* **Collaboration** uses only `window.webxdc.sendUpdate` of the current chat. No external server. Presence is off by default.
* **Import Deflate.** Requires `DecompressionStream` where available; Store method always works.
* **Code editor.** Both packages use CodeMirror 6. Monaco ships only in `creator-studio-monaco.xdc`, with syntax highlighting but without the HTML/CSS/TypeScript language services.
* **Game multiplayer** uses `joinRealtimeChannel`, which needs a client that supports realtime webxdc (Delta Chat ≥ 1.48). Without it, games run single-player.
* **Sound editor** saves edited audio as WAV. Decoding MP3 / OGG / M4A depends on the webview's codecs.
* **Template starter apps are in Spanish.** Template names and descriptions follow the UI language, but the code they create (texts, comments) is Spanish.
* **System back gesture** is owned by the messenger / OS. Studio does not override it.
* **Project limits:** 200 files, 2 MB per file, 12 MB total; images ≤ 1.5 MB.
* **No network** inside mini apps: no CDNs, remote fonts, or external APIs.
