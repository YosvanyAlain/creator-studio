# Known limitations — Webxdc Creator Studio 3.0.0

* **The preview is a simulation.** The Test tab runs your app as one to four local people with a mock webxdc. Updates never leave your device. Try the app in a real chat before sharing it widely.
* **Project limits:** 300 files, 24 MB per project, 3 MB per text file and 4 MB per image or sound.
* **Monaco** ships only in `monaco-creator-studio.xdc`. It has syntax colors and the Studio's own suggestions and explanations, but not the heavy HTML, CSS and TypeScript language services. On phones the default editor is the better choice.
* **Multiplayer games** use `joinRealtimeChannel`, which needs a client that supports realtime webxdc (Delta Chat 1.48 or newer). Without it, games run for one player.
* **Sounds** are saved as WAV. Opening MP3, OGG or M4A files depends on the codecs of the device.
* **Importing compressed `.xdc` files** needs `DecompressionStream`, available in current webviews.
* **The system back gesture** belongs to the messenger and the operating system; the Studio uses its own back button.
* **No network** inside mini apps: no CDNs, remote fonts or online APIs, in the Studio or in the apps you build.
