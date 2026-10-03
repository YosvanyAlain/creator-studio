# Compatibility — Webxdc Creator Studio 2.0.0

## Messengers

| Client | Notes |
|--------|--------|
| Delta Chat (Android / iOS / Desktop) | Primary target. Full webxdc API. |
| Other webxdc-capable messengers | Should work if they implement the core API (`sendUpdate`, `setUpdateListener`, `sendToChat`). |

## Browser / demo

Opening the built demo HTML in a normal browser uses a mock webxdc. Useful for layout and blocks, not for real multi-peer behaviour.

## Automated tests

`npm test` runs the unit and UI (jsdom) suites. `npm run test:browser` builds both packages and runs the Chromium end-to-end suites against the sources and the unpacked `.xdc` files.

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
