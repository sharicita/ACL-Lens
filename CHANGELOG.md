# Changelog

All notable changes to ACL Lens are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## How versions and commits work

- **Commit messages** follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/): `type(scope): summary`, for example `feat(api-access): evaluate REST API access policies`. Types: `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `build`, `chore`. A breaking change adds `!` after the type or a `BREAKING CHANGE:` footer.
- **Version bumps** are made in the commit that causes them: `feat` raises the minor version, `fix` the patch version and a breaking change the major version. `docs`, `test`, `refactor`, `perf`, `build` and `chore` commits don't bump the version.
- **A bumping commit also updates** `package.json` and `package-lock.json` (and the `require()` path in `src/fluent/settings.now.ts`, which contains the version), this file and the version table in `docs/README.md`. It is tagged `vX.Y.Z` locally. Tags are pushed only when you push.
- Changes not yet released are listed under **Unreleased**.

## [Unreleased]

## [1.8.1] - 2026-11-06

### Changed
- The "Allow if" tag on ACL rules is now blue instead of green, so it no longer looks like a pass beside a rule that failed. The tag names the rule type; the rule's result is shown next to it.

## [1.8.0] - 2026-11-06

### Added
- **Save as report** on a run page adds a chart of that run to a dashboard tab. The report keeps showing that run, whatever the dashboard's **Data from** says.
- **Dashboard tabs.** Add tabs with their own titles and descriptions, and drag them to change the order. Arrow buttons do the same from the keyboard.
- **Drag reports** by their title bar to move them on a tab, or drop them on another tab. The arrow buttons and a "Move to another tab" menu do the same from the keyboard.
- **Fill a tab.** A new or empty tab asks what to put on it. Each run you choose under **Show data from** appears as a pill you can remove, and becomes a report of that run's data. **Choose specific reports** optionally adds reports from your other tabs. **Add report** offers the same on any tab.
- "?" help for dashboard tabs and which run a report uses.

### Changed
- The report cards are now inside the dashboard card, so the page reads as one section.
- The dashboard is saved as tabs. An existing dashboard becomes one tab called Overview. The layout column grew from 4,000 to 65,000 characters to hold them. A browser tab still showing the old page can't save its layout until it is refreshed.

### Fixed
- Dashboards on large runs no longer recalculate every time. Requests for a large run took about 40 seconds and held up everything else in the session, including saving tabs, which could fail with "Request failed (502)". Results that are slow to work out are now stored with the run, the page keeps what it has already loaded, and saves are retried with **Save again** instead of being lost. The first view of a large run is still slow.
- The dashboard no longer says there's no saved run when a request failed.

## [1.7.0] - 2026-11-06

### Added
- **Evaluate as API access** now includes Machine Identity Access Control (MIAC). A table the user's MIAC doesn't list, or a request none of its referenced policies cover, shows as Denied with the reason. Machine accounts show Conditional when no MIAC names them, when several disagree, or when the records can't be read or recognized on the instance. Human accounts no MIAC names are unaffected. Checked with offline tests only: not yet run on an instance that has MIAC records, and its column names are unconfirmed.

### Documentation
- The user guide and engine document no longer say REST API access policies, OAuth scopes and API-level ACLs are "not evaluated"; that has been out of date since 1.2.0.

## [1.6.0] - 2026-11-06

### Added
- **Run next set.** When more tables match than one run can cover, the run page shows which tables it covers and offers **Run next set**, which continues alphabetically with the same subjects and filters and saves a new run. Runs saved before this version offer it too.
- "?" help for Max tables and run sets.

## [1.5.0] - 2026-11-06

### Added
- **Largest saved result (MB)** setting, backed by the property `x_acllens.run.max_result_mb` (default 256, allowed 8 to 4096; ACL Lens admins can change it on the Properties page). A run whose result is bigger fails with a message that names the property, and its partly saved rows are removed.

### Changed
- On Settings, **Clear history now** is now part of the **History** section, and History is at the bottom of the page. **Save settings** appears in a bar that stays in view whenever there are unsaved changes.

### Fixed
- Very large runs (for example all tables with record and field rules) no longer fail with "String object would exceed maximum permitted size of 33554432". Results are now saved in parts instead of as one string, and runs already in History still open. A comparison CSV that is too large to attach is skipped with a warning instead of failing the run. Checked with offline tests only: not yet run on an instance with a result that large.

## [1.4.0] - 2026-11-06

### Changed
- Colors, shapes and motion now come from the app-forge Harbor theme (`src/client/styles/app-forge/theme.css`), which is embedded ahead of `app.css` in the JS bundle. Harbor was based on this app, so the change is small: secondary text is darker for contrast (`#6b7783` to `#58646f`), and borders and a few status colors shift slightly. Where the instance sets no font, text uses the system font instead of Lato.
- The page stays light even when the operating system is in dark mode. "Follow each user's ServiceNow theme" works as before.
- Checked in a local test page with sample data, not on a PDI.

## [1.3.2] - 2026-11-06

### Fixed
- The page no longer scrolls sideways at phone width (320px and 375px): the header and its tabs wrap, the operation picker wraps inside its card, the comparison summary table scrolls inside its own container, and workspace cards no longer overflow at 320px. Tabs and operation buttons are 44px tall on phones. Below 48rem the header scrolls with the page instead of staying fixed at the top. Desktop layout is unchanged.

### Known issues
- At phone width many other controls are still under 44px tall and text inputs are under 16px. Checked in a local test page with sample data, not on a PDI.

### Documentation
- Documents moved to the app-forge layout (`docs/guides/`, `docs/reference/`, `docs/operations/`, `docs/project/`), with links updated, and a new `CONTRIBUTING.md`. Older changelog entries keep the paths they had at the time.

## [1.3.1] - 2026-11-06

### Fixed
- Phone browsers now lay the app out at the device width instead of a zoomed-out desktop page (viewport tag in `src/client/index.html`). Desktop browsers are unaffected.

### Known issues
- At phone width the header tabs push the page to about 690px wide, so the whole page scrolls sideways, and the operation picker in the access matrix runs past its card. Most controls are under 44px tall and text inputs are under 16px. Checked in a local test page with sample data, not on a PDI.

### Changed
- Build tools: ServiceNow SDK 4.13.6 → 4.14.0 and `@servicenow/isomorphic-rollup` → 1.3.13, with patched `fastify`, `joi`, `undici` and `zod` through `overrides`. `npm audit` goes from 10 high, 12 moderate and 1 low to 17 moderate, all in development tools. Nothing shipped to the instance changes. Not yet verified on a PDI.

## [1.3.0] - 2026-11-06

### Added
- Live verification now checks each field rule in the run as well as each table's operations (one platform check each, up to 300 in one go). Field rows and the CSV export show the field.
- A Result column in Live verification (Agrees, Differs, Conditional), and rows the platform resolved for a Conditional result are shown by default; only agreeing rows are hidden.

### Fixed
- Live verification did nothing on ServiceNow pages: Prototype.js replaces `Array.from` with a version that ignores the map function, so no checks started. Offline tests didn't show it.
- Live verification now says so when it stops on an error or when the platform returns no operations, instead of ending silently.

## [1.2.1] - 2026-10-27

### Fixed
- The table web-service access switch (`sys_db_object.ws_access`) was read as always on, so a table with it switched off still passed the API gate. Found when verifying 1.2.0 on a PDI.
- The API explanation on a Denied operation now reads "deny this operation".

## [1.2.0] - 2026-10-27

### Added
- **Evaluate as API access** on the run form (collapsed by default, expanded when a machine, AI agent, web-service-only or integration user is selected): choose the REST API, authentication method, OAuth application and, for Scripted REST APIs, the resource. The choice is saved with the run, so reruns repeat it, and the run header shows it.
- Clicking a Conditional cell, and the table details drawer, explain how the API access checks limited a result.
- Lookup endpoints under `/api-access/` for APIs, resources, authentication profiles and OAuth applications, limited to what the signed-in user can read.
- Request validation for the API context (`normalizeApiContext`): values that could reach a query are refused with a 400.

### Changed
- User search flags machine, AI agent, web-service-only and integration users.

### Not yet available
- Denied cells and the table details drawer have no dedicated API tab yet, and comparison, drift, exports, the reporting dashboard and the AI assistant don't carry the gate (Phase 2 continues).

## [1.1.0] - 2026-10-27

### Added
- API access evaluation engine (not yet reachable from the UI): the REST API access policy, OAuth auth scope, Scripted REST endpoint ACL and web-service access checks, folded into the table status when a run has an API context. `analyze()` takes an optional `ApiContext`; runs without one are unchanged.
- Read-only cross-scope privileges for the 13 platform tables behind those checks.
- 45 offline tests for the policy matcher, scope check, endpoint ACLs, gate and fold.

### Changed
- `accountWarning` says what was evaluated when an API context is set.

### Documentation
- The API access data model confirmed on a PDI (`docs/architecture/03-access-evaluation-engine.md` §9) and the phased plan in `docs/plans/api-access-evaluation.md`.

## [1.0.0] - 2026-10-27

Baseline. The version line starts here; earlier work used informal numbers (the `0.1`–`0.7` rows in the change log in `docs/README.md` and the `1.x` iterations in `docs/build-log.md`).

### Added
- Analysis engine, access matrix, comparison, drift and history.
- Security Assistant (AI) and MCP server, read-only and running as the user.
- Reporting dashboard, security data filters in the status, Verify live as the baseline and the 12-operation Access Analyzer parity.
- Guided setup (`npm run setup`), install profiles and publishable source with a placeholder scope.
