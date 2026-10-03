# Listing on webxdc.org (xdcget)

The store is the curated list in [webxdc/xdcget](https://codeberg.org/webxdc/xdcget). It feeds [webxdc.org/apps](https://webxdc.org/apps/), chat store bots, and Delta Chat’s mini-app picker.

This file is a checklist for maintainers.

## Requirements

- [x] Public GitHub repo: https://github.com/YosvanyAlain/creator-studio
- [x] MIT license
- [x] Tagged GitHub Release with `creator-studio.xdc` (see [latest](https://github.com/YosvanyAlain/creator-studio/releases/latest)); the store should use this light build, not `creator-studio-monaco.xdc`
- [x] `manifest.toml` with `name` + `source_code_url` pointing at this repo
- [x] `icon.png` inside the `.xdc`

## xdcget.ini snippet

Add this entry to `xdcget.ini` in a pull request (see the repository's SUBMIT.md):

```ini
[app:creator-studio]
category = tool
source_code_url = https://github.com/YosvanyAlain/creator-studio
description = Create webxdc mini apps inside the chat
    Build mini apps with templates, visual blocks or code, preview them
    and export the .xdc without leaving Delta Chat.
```

After each release, confirm both `.xdc` assets are attached to the GitHub Release so the store can pick up `creator-studio.xdc`.
