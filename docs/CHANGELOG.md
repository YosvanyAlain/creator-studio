# Changelog

## 2.0.0

**Look and navigation**
* New visual identity: refined colour tokens, cards, icons and a bottom tab bar on phones
* Home with quick actions; calmer preview banner; consistent sheets with descriptions

**Code editor**
* CodeMirror 6 replaces the built-in editor in both packages: syntax highlighting on phones, bracket matching, search, autocomplete
* File manager with folders (create, rename, move, delete)
* One undo timeline for text edits and file operations; saving generated code never overwrites hand-written files without asking

**Game engine and blocks**
* New engine (`G`) for 2D, 3D and pixel games, injected into the app only when a game block is used
* 53 game blocks: stage, sprites, clones, pixel art, images, tile maps, physics, platformer and keyboard / pad movement, collisions, scenes, camera follow and shake, particles, HUD, sound effects, melodies, 3D shapes, live multiplayer
* Visual painters for pixel art and tile maps inside the blocks
* **Quick game**: platformer, space shooter and catch-the-fruit starters built from editable blocks; an untouched page becomes a full-screen game page
* Two-screen preview relays realtime messages, so multiplayer games can be tried before sharing

**Media editors**
* Image editor opens the tapped file; pixel-art PNGs reopen as editable grids; sizes up to 64×64; mirror drawing, redo, flip / rotate / shift; confirmation before replacing another file
* Sound editor opens the tapped file and edits any project audio (WAV, MP3, OGG…) with waveform, play, trim, fades, speed and gain
* WAV reader handles extra chunks, stereo, 24-bit and float files

**Templates and validator**
* Group chat, dashboard, multimedia and lesson templates rewritten with clean, commented code; all template code uses `const` / `let`
* Every `sendUpdate` call (templates and generated blocks) passes `''` as the deprecated second argument, as the spec asks; empty `info` texts are no longer sent
* Validator: flags the deprecated `sendUpdate` argument, empty required block values and optional fields correctly; no longer asks purely local apps to load `webxdc.js`

**Fixes**
* Creating a project from a template without a name no longer fails
* Smaller app icon (256 px)

## 1.4.5

* Two builds: `creator-studio.xdc` without Monaco (~290 KB, was 1.5 MB) and `creator-studio-monaco.xdc` with it
* Monaco trimmed to the syntax packs the editor uses, and its icon font added (search and suggestion icons were blank)
* Blocks on small screens: tapping a block in the palette closes the sheet so its card and **Add block** button are reachable
* The palette starts closed when it would cover the workspace
* Storage detection fixed: IndexedDB was always reported as unavailable on the Home card and in the Inspector
* Home shows one environment card (webxdc, storage, editor) instead of two that contradicted each other
* Spanish UI: no more English labels (Validation, generated code, status values); default file names follow the language
* Browser demo no longer injects its banner into template code and previews
* Source comments and generated code comments in English
* Test suites updated to the current UI; the final package test unpacks the build by itself

## 1.4.4 — Clean rebuild

* Repository history reset to a single release baseline
* UI languages reduced to English and Spanish (auto-detect + manual switch)
* Critical bug fixes (blocks codegen, undo of binary assets, timers, validator, sendToChat format)

Download from [GitHub Releases](https://github.com/YosvanyAlain/creator-studio/releases/latest).
