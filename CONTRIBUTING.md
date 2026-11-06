# Contributing

## Branches and pull requests

- Work on a short-lived branch from `main` (for example `feat/export-csv`). Never commit directly to `main`.
- Commit and push each verified increment to your branch. Plain pushes only, never force.
- Open a pull request to `main`. It merges after CI passes and a person approves it.

## Commits and versions

Use [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/): `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `perf:`, `build:`, `chore:`. Add `!` or a `BREAKING CHANGE:` footer for breaking changes. The type decides the version bump: `fix` → PATCH, `feat` → MINOR, breaking → MAJOR.

A commit that bumps the version also updates several files and gets a tag. The full list is in [CHANGELOG.md](CHANGELOG.md#how-versions-and-commits-work).

## Before you open a pull request

- Run `npm test` and `npm run build` and fix every failure. Never skip or delete a test to make it pass.
- Update the documentation the change touches, add an entry to `CHANGELOG.md`, and add a build-log entry in `docs/project/build-log.md`.
- No secrets, instance names or real data in any tracked file. See [SECURITY.md](SECURITY.md).

Documentation layout and what goes where: [docs/README.md](docs/README.md).
