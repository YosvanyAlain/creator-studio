# Webxdc Creator Studio

Create and edit [webxdc](https://webxdc.org) mini apps from inside [Delta Chat](https://delta.chat) — without leaving the chat and without runtime dependencies.

One app covers the full loop:

```
create → edit (code / blocks) → preview → validate → export .xdc
```

| | |
|---|---|
| **Version** | 2.0.0 |
| **License** | MIT |
| **Runtime deps** | 0 |
| **Languages** | English, Español |

---

## Download

Two builds of the same app are attached to every [release](https://github.com/YosvanyAlain/creator-studio/releases/latest):

| File | Size | For |
|---|---|---|
| **creator-studio.xdc** | ~510 KB | Everyone. Light to send and receive in chats. |
| **creator-studio-monaco.xdc** | ~1.6 MB | Desktop users who also want the optional Monaco editor. |

Send the file as an attachment in any Delta Chat chat (or another webxdc messenger) and tap **Start**.

### Local build

```bash
python3 build.py
# → creator-studio.xdc, creator-studio-monaco.xdc, demo/creator-studio-demo.html
```

Requires Python 3. Builds are reproducible (same sources, same bytes).

```bash
# Tests (optional)
npm install
npm test               # unit + jsdom UI
npm run test:browser   # Chromium end-to-end, including both built packages
```

---

## What it does

* **Code editor** (CodeMirror 6) with syntax highlighting on phones, folders, search, autosave and one undo timeline for text and file operations; optional Monaco on desktop
* **Visual blocks** (313 in 24 categories) with live code generation and HTML placeholders
* **2D / 3D / pixel game engine** driven by 53 game blocks: sprites, emoji, pixel art, tile maps, physics, platformer and top-down movement, collisions, scenes, camera, particles, sound effects, melodies, touch pad and live multiplayer
* **Quick game**: one tap builds a complete, editable block program (platformer, space shooter, catch the fruit)
* **Pixel-art and image editor**: pen, eraser, fill, picker, mirror drawing, flip / rotate / shift, photo → pixel art, filters, crop and resize; reopens its own PNGs as editable grids
* **Sound editor**: 8-bit effects, melodies, recording, and editing of any project audio (trim, fades, speed, gain) with a waveform
* **Pages and components** — real HTML/CSS/JS in the project
* **Preview** sandboxed with a mock webxdc, including a two-screen mode with realtime relay
* **Validator** (structure, network, API usage against the spec, blocks, compatibility)
* **Export / import** `.xdc` (ZIP Deflate/Store)
* **Templates**: games, group chat, dashboard, multimedia, lessons, productivity…
* **In-app course** and help
* **Persistence** IndexedDB → localStorage mirror → memory, with snapshots
* **Light / dark** theme

---

## Repository layout

```
├── xdc-src/           # Mini app source (packaged as-is)
├── build.py   build.sh
├── docs/              # Changelog, limitations, store notes
├── tests/             # Unit + jsdom + Chromium
└── tools/             # Utilities (tools/cm rebuilds the CodeMirror bundle)
```

A webxdc app is a **ZIP** with a `.xdc` extension: `index.html` at the root; `manifest.toml` and `icon.png` optional. **Do not** ship `webxdc.js` (the messenger provides it).

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

[MIT](LICENSE) · © project contributors · CodeMirror © Marijn Haverbeke and others (MIT, see `xdc-src/vendor/LICENSE-codemirror.txt`) · Monaco Editor © Microsoft (MIT, see `xdc-src/monaco/LICENSE-monaco.txt`)
