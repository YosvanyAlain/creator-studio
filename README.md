# Webxdc Creator Studio

Create and edit [webxdc](https://webxdc.org) mini apps from inside [Delta Chat](https://delta.chat) — without leaving the chat and without runtime dependencies.

One `creator-studio.xdc` covers the full loop:

```
create → edit (code / blocks) → preview → validate → export .xdc
```

| | |
|---|---|
| **Version** | 1.4.4 |
| **License** | MIT |
| **Runtime deps** | 0 |
| **Languages** | English, Español |

---

## Quick start

1. Download **[creator-studio.xdc](https://github.com/YosvanyAlain/creator-studio/releases/latest)** (or build it locally).
2. Send it as an attachment in a Delta Chat (or other webxdc) chat.
3. Tap **Start**.

### Local build

```bash
python3 build.py
# → creator-studio.xdc
```

Requires Python 3. Node is not needed to package.

```bash
# Tests (optional)
npm install
npm test
```

---

## What it does

* **Multi-file editor** with file tree, autosave, search, undo/redo, fullscreen; optional Monaco
* **Visual blocks** (260+) with codegen and HTML placeholders
* **Pages and components** — real HTML/CSS/JS in the project
* **Preview** sandboxed with a mock webxdc
* **Validator** (structure, network, API, blocks, compatibility)
* **Export / import** `.xdc` (ZIP Deflate/Store)
* **Templates**: games, group chat, dashboard, multimedia, lessons, productivity…
* **In-app course** and help
* **Pixel-art and 8-bit audio** editors
* **Persistence** IndexedDB → localStorage mirror → memory, with snapshots
* **Light / dark** theme

---

## Repository layout

```
├── xdc-src/           # Mini app source (packaged as-is)
├── build.py   build.sh
├── docs/              # Changelog, limitations, store notes
├── tests/             # Unit + jsdom + Chromium
└── tools/             # Utilities
```

The webxdc artefact is a **ZIP** with a `.xdc` extension: `index.html` at the root; `manifest.toml` and `icon.png` optional. **Do not** ship `webxdc.js` (the messenger provides it).

---

## Documentation

* [Changelog](docs/CHANGELOG.md)
* [Known limitations](docs/KNOWN_LIMITATIONS.md)
* [Compatibility](docs/COMPATIBILITY_MATRIX.md)
* [Store listing](docs/STORE_SUBMISSION.md)
* [Contributing](CONTRIBUTING.md) · [Security](SECURITY.md)
* Official spec: [webxdc.org/docs](https://webxdc.org/docs/)

---

## License

[MIT](LICENSE) · © project contributors
