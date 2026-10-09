# ADR-0006: Dependency and Supply-Chain Policy

| | |
|---|---|
| **Status** | Accepted 2026-10-08 |
| **Relates to** | [04 §7](../architecture/04-security-architecture.md#7-dependencies-and-supply-chain), [dev setup](../dev-setup.md#7-dependency-maintenance) |

## Context
The instance listed hundreds of npm packages "installed" for the app. Investigation showed:
- The app was configured to upload its source to the instance (`packageSourceCodeOnInstance: true`, the SDK template default). The instance then restored the whole development dependency tree from the npm registry.
- Of 592 locked packages, **only 3 ship in the app**: `react`, `react-dom` and `scheduler`, bundled into the UI page. Server modules contain no third-party code. The other 589 are build tooling (the ServiceNow SDK and what it depends on).
- `npm audit` reported 23 advisories (1 critical), all in build tooling; 0 in shipped code.

Nobody reviewed the packages line by line. Signatures and hashes prove origin and integrity, not the absence of malicious code.

## Decision
1. **No source upload to the instance:** `packageSourceCodeOnInstance: false`. The instance receives only built metadata and the bundled UI page. The previously uploaded source package was removed (build log 1.5). Source lives in the GitHub repository.
2. **Keep the shipped surface minimal:** server-side code uses no third-party packages; the UI ships only React. New runtime dependencies need review.
3. **Stay current on the SDK** (`@servicenow/sdk` pinned exactly, now 4.13.6) and the client bundler (`@servicenow/isomorphic-rollup` ^1.3.11).
4. **Patch inner build-tool dependencies with npm `overrides`** when a fix exists *within the same major version*. Never force a major-version change and never use `npm audit fix --force`, which would downgrade the SDK to 3.0.3.
5. **Verify on every dependency change:** `npm audit`, `npm audit --omit=dev` (must be 0), `npm audit signatures` (no invalid or missing), integrity hashes present, registry = `registry.npmjs.org`, then build, offline tests, deploy and smoke-test on the PDI.
6. **Reproducible installs:** commit `package-lock.json`; use `npm ci`. npm's install-script blocking stays on (no third-party install scripts run).

## Consequences
- The app can no longer be edited in ServiceNow's on-instance editor. Changes go through the repository.
- After applying overrides: 18 advisories remain (13 high, 5 moderate), all in build tooling and all caused by two packages with **no released fix**: `braces` (DoS on deeply nested glob patterns, reached through the SDK's file watcher and glob matching) and `sprintf-js` (DoS on crafted format strings, via the SBOM generator). Both need attacker-controlled input to the local build. They are tracked as R-09.
- Overrides must be reviewed when the SDK is upgraded. Remove each one once the SDK ships the fixed version itself.
