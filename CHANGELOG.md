# Changelog

All notable changes to ACL Lens are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## How versions and commits work

- **Commit messages** follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/): `type(scope): summary`, for example `feat(api-access): evaluate REST API access policies`. Types: `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `build`, `chore`. A breaking change adds `!` after the type or a `BREAKING CHANGE:` footer.
- **Version bumps** are made in the commit that causes them: `feat` raises the minor version, `fix` the patch version and a breaking change the major version. `docs`, `test`, `refactor`, `perf`, `build` and `chore` commits don't bump the version.
- **A bumping commit also updates** `package.json` and `package-lock.json` (and the `require()` path in `src/fluent/settings.now.ts`, which contains the version), this file and the version table in `docs/README.md`. It is tagged `vX.Y.Z` locally. Tags are pushed only when you push.
- Changes not yet released are listed under **Unreleased**.

## [Unreleased]

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
