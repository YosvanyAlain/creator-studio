# Changelog

## 3.0.0

A rebuild from scratch with the same name, the same purpose and the same saved data.

**Look and feel**
* New design system, own line icons, a new app icon and an animated start screen.
* Five tabs (Home, Learn, Create, My apps, Settings) with their own back history; wide screens get a side rail.
* Light and dark themes, three text sizes and a reduced motion option.

**Create**
* All 20 templates rewritten: games, group apps, organizers, tools and creative apps. Each one has a live two-phone preview and fields (title, options, colors, levels) to adapt it before creating.
* Templates are generated in the language of the app, English or Spanish, with no mixed texts.
* Three starters (blocks, code, game) and a wizard that suggests an app from a few answers.

**Workspace**
* Blocks: new card-based editor with a searchable palette, typed fields with a live code preview, move mode, nested blocks, undo and redo. Hand-edited code is detected and never overwritten without asking.
* Code: CodeMirror 6 with suggestions above the phone keyboard, a symbol bar, word explanations, 30 components and gentle syntax hints.
* Monaco (larger build): same features as the default editor, colors from the app theme, the same explanations in its suggestions; switches on and off without closing the project.
* Test: one to four simulated people, adjustable delay and lost messages, console and stored data.
* Share: pre-flight checks with quick fixes, icon, `.xdc` export.

**Studio**
* Pixel art from 16 to 128 px with pinch zoom, layers, frames, onion skin and GIF export.
* Photo editor with adjustments, presets, crop, rotate and pixelate.
* Sound maker with 12 presets and variations, plus a four-track music editor. Songs made in 2.x still play.

**Tools (new)**
* Color and contrast checker, palettes and scales; gradients; shadows; icon maker; QR codes with styles; JSON fixer and viewer; regular expressions; Base64, URL and HTML encoding; sample data.

**Learn (new)**
* 20 interactive lessons in five tracks with quizzes, ordering, fill-in and live playgrounds; levels, streaks and medals.
* Searchable reference of HTML, CSS, JavaScript and webxdc; glossary; troubleshooting guide; global search.

**Projects and data**
* Same storage as 2.x: projects, version history and settings carry over on update. Backups from 2.x import as before.
* Automatic history copies while you work, manual named versions, restore or open as a copy.
* Larger limits: 300 files and 24 MB per project.

**Quality**
* The Monaco build is now `monaco-creator-studio.xdc`, so the app store always hands out the light `creator-studio.xdc`.
* New automated tests: engine checks, every screen in both languages, templates with two peers, both packages, and an update from real 2.0 data.

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
