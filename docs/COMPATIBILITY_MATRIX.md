# Compatibility — Webxdc Creator Studio 1.4.4

## Messengers

| Client | Notes |
|--------|--------|
| Delta Chat (Android / iOS / Desktop) | Primary target. Full webxdc API. |
| Other webxdc-capable messengers | Should work if they implement the core API (`sendUpdate`, `setUpdateListener`, `sendToChat`). |

## Browser / demo

Opening the built demo HTML in a normal browser uses a mock webxdc. Useful for layout and blocks, not for real multi-peer behaviour.

## Automated tests

`npm test` runs unit + UI (jsdom) suites. Chromium E2E scripts live under `tests/` but are not part of the default `npm test` run.

## API surface (honest)

| API | Status |
|-----|--------|
| `sendUpdate` / `setUpdateListener` | Confirmed |
| `sendToChat` | Confirmed |
| `selfAddr` / `selfName` | Confirmed |
| `sendUpdateInterval` / `sendUpdateMaxSize` | Confirmed |
| `joinRealtimeChannel` | Experimental (DC ≥ 1.48) |
| `importFiles` | Client-dependent |
| Network / remote servers | Not available (by design) |
