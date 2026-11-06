# Changelog

All notable changes to ACL Lens are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## How versions and commits work

- **Commit messages** follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/): `type(scope): summary`, for example `feat(api-access): evaluate REST API access policies`. Types: `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `build`, `chore`. A breaking change adds `!` after the type or a `BREAKING CHANGE:` footer.
- **Version bumps** are made in the commit that causes them: `feat` raises the minor version, `fix` the patch version and a breaking change the major version. `docs`, `test`, `refactor`, `perf`, `build` and `chore` commits don't bump the version.
- **A bumping commit also updates** `package.json` and `package-lock.json` (and the `require()` path in `src/fluent/settings.now.ts`, which contains the version), this file and the version table in `docs/README.md`. It is tagged `vX.Y.Z` locally. Tags are pushed only when you push.
- Changes not yet released are listed under **Unreleased**.

## [Unreleased]

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
