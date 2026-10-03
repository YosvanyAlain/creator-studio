# Listing on webxdc.org (xdcget)

The store is the curated list in [webxdc/xdcget](https://codeberg.org/webxdc/xdcget). It feeds [webxdc.org/apps](https://webxdc.org/apps/), chat store bots, and Delta Chat’s mini-app picker.

This file is a checklist for maintainers.

## Requirements

- [x] Public GitHub repo: https://github.com/YosvanyAlain/creator-studio
- [x] MIT license
- [x] Tagged GitHub Release with `creator-studio.xdc` (see [latest](https://github.com/YosvanyAlain/creator-studio/releases/latest))
- [x] `manifest.toml` with `name` + `source_code_url` pointing at this repo
- [x] `icon.png` inside the `.xdc`

## xdcget.ini snippet

```ini
[app]
# Use the values expected by xdcget for this repository
```

After each release, confirm the `.xdc` asset is attached to the GitHub Release so the store can pick it up.
