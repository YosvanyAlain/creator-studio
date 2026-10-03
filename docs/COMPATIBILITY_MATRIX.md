# Compatibility — Webxdc Creator Studio 3.0.0

## Messengers

| Client | Notes |
|---|---|
| Delta Chat (Android, iOS, Desktop) | Primary target. |
| Other webxdc messengers | Work if they provide the core API (`sendUpdate`, `setUpdateListener`, `sendToChat`). |

## Updating from 2.x

3.0 reads the same storage as 2.x: the `webxdc-creator-studio` IndexedDB database, the localStorage mirror, the `wcs-snapshots-v1` history database and the `wcs_settings` preferences. Projects, blocks, binary files, history and settings stay as they were. Backup files from 2.x import unchanged. The automated tests replay storage captured from the published 2.0 app.

## webxdc API used by the Studio

| API | Use |
|---|---|
| `sendToChat` | Sending exported `.xdc` files, images, sounds and backups to a chat. |
| File picker | Importing images, sounds, `.xdc` files and backups. |
| Network | Never used. |

## Apps you build

The live preview simulates one to four people with a local webxdc, including `joinRealtimeChannel` for multiplayer games. Realtime channels in a real chat need a client that supports them (Delta Chat 1.48 or newer).

## Browsers

`demo/creator-studio-demo.html` (from `python3 build.py`) runs in a normal browser with a mock webxdc. The automated tests use Chromium.
