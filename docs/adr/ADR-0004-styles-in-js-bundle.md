# ADR-0004: Ship Styles Inside the Cache-Busted JS Bundle

| | |
|---|---|
| **Status** | Accepted 2026-10-08 |
| **Relates to** | [02 §5](../architecture/02-system-architecture.md#5-build-pipeline), [build log 1.2](../build-log.md) |

## Context
The SDK's client build published `app.css` as a separate theme asset. After each deploy the instance kept serving the **previous** stylesheet:
- the asset URL's version hash changed, but the content was stale;
- the attachment held the new file;
- only a cache flush helped, once.

The JS bundle is loaded with a cache-busting parameter (`uxpcb`) and always updates.

## Decision
- `now.prebuild.mjs` copies `src/client/app.css` into `src/client/styles.generated.ts` (`export const APP_CSS`).
- `main.tsx` injects it as a `<style>` element. No CSS file is imported.
- `styles.generated.ts` stays in the project, because the SDK type check runs before the prebuild.

## Consequences
- Style changes appear on the next deploy with no cache flush.
- Developers edit `app.css` only. The generated file is overwritten on every build.
- The bundle is ~36 KB larger (uncompressed).
