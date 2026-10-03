# Store listing (xdcget)

The webxdc app store is the curated list in [webxdc/xdcget](https://codeberg.org/webxdc/xdcget). It feeds [webxdc.org/apps](https://webxdc.org/apps/), the store bots and the mini app picker in Delta Chat.

Checklist for maintainers:

- [x] Public repository under the MIT license
- [x] Tagged release with `creator-studio.xdc` attached (the store takes the first `.xdc` asset in name order, so the Monaco build is named `monaco-creator-studio.xdc` to sort after it)
- [x] `manifest.toml` with `name` and `source_code_url`
- [x] `icon.png` (512 × 512) inside the `.xdc`
- [x] `npm run test:artifact` passes for both packages

## Catalog entry

```ini
[app:yosvanyalain-creator-studio]
category = tool
source_code_url = https://github.com/YosvanyAlain/creator-studio
description = Create mini apps, with or without code
    Pick one of 20 apps, change it with visual blocks or code, try it as
    several people and share it in the chat. Pixel art, sounds, tools and
    interactive lessons included. Works offline.
```

After each release, make sure both `.xdc` files are attached and the tag matches the version in `src/app/shell.js`.
