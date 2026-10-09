# Developer Setup

## 1. Prerequisites

- Node.js 20+ (built with 24.20) and npm.
- A ServiceNow instance with admin rights (a Personal Developer Instance is fine).
- The Now SDK is installed locally from the lockfile (`@servicenow/sdk` 4.13.6).

## 2. First run

```bash
npm ci
npm run setup        # guided: login, scope, profile, install
# or by hand:
npx now-sdk auth --add https://<instance>.service-now.com --type basic --alias mypdi
npm run profile -- add mypdi --alias mypdi --scope x_<company code>_acllens
npm run deploy
```

- `auth --list` shows saved credentials (stored outside the project).
- `deploy` prints a **rollback link** for each installation.
- Then grant `x_acllens.user` (and `.admin` to administrators), preferably through a group, and open **ACL Lens → Access Workspace**.

**Another instance:** add another profile (`npm run setup` → *Install on another instance*, or `npm run profile -- add …`) and deploy with `--profile <name>`. See [install-and-deploy.md](install-and-deploy.md).

## 3. Everyday commands

| Task | Command |
|---|---|
| Build (type check + client bundle + metadata) | `npm run build` |
| Install on the instance (default profile) | `npm run deploy` |
| Build with the profile scope only | `npm run deploy:build` |
| Live UI dev server against the instance (profile scope; edits under `src/` mirrored) | `npm run dev` (port 3000, or the first free port from 8081 if 3000 is taken) |
| Installable package (update set ZIP) | `npm run package` |
| Offline tests (engine + assistant loop) | `npm test` |
| Look up instance data | `npx now-sdk query <table> -q "<encoded query>" -o json` |
| SDK documentation | `npx now-sdk explain <topic> --format=raw` |

## 4. Conventions that matter

| Rule | Why |
|---|---|
| Server modules import each other with **explicit `.ts`** (`./types.ts`) | The platform module resolver can't find extensionless paths (build log 1.1) |
| Module code imports Glide APIs from `@servicenow/glide` and must not use `globalThis` | Module sandbox; `globalThis` is rejected by the SDK linter |
| REST handlers call `response.setBody(result)` (not `{result}`) | The platform already wraps responses |
| Edit **`src/client/app.css`**; never edit `styles.generated.ts` | The prebuild regenerates it on every build; keep it committed because the type check runs before the prebuild ([ADR-0004](adr/ADR-0004-styles-in-js-bundle.md)) |
| If `package.json` `version` changes, update the `require('x_acllens/acl-lens/<version>/…')` path in `src/fluent/settings.now.ts` | The *Test connection* UI action uses a string script so it can redirect back to the form |
| Never hand-edit `src/fluent/generated/keys.ts`; commit it | It holds stable sys_ids for every record. Profile builds copy new keys back with the placeholder scope |
| Write the scope only as `x_acllens` in source; never commit a real scope, instance name or company code | Profiles replace the placeholder at build time, which keeps the repo publishable ([install-and-deploy §9](install-and-deploy.md#9-keeping-the-repository-publishable)) |
| Don't run `now-sdk install` from the project root on an instance that has a profile install | The root builds as `x_acllens` and would create a second app |
| Don't delete a `Table()` / `Record()` / API call without deciding whether the deletion should reach installed instances | Removing Fluent code creates a delete record through `keys.ts` |
| `.now.ts` strings: avoid unescaped apostrophes inside single-quoted strings | The Fluent parser fails with "ShorthandPropertyAssignment" errors |
| Fluent `Record` data: pass role names as string arrays, not Role objects | The record plugin can't serialize Role objects in data fields |

## 5. Testing

- **Offline** (`tests/offline`):
  - `engine.test.js` — matching order, deny-unless, admin overrides, elevated roles, implicit `public`, field precedence, security attributes, comparison and drift.
  - `agent.test.js` — JSON action parsing, tool loop, screen context, stable system prompt, history, step cap, conversation ownership.
  - `safety.test.js` — provider type mapping, Anthropic URL forms, endpoint checks (including the api.openai.com incident), key-fragment masking, strict ACL detail.
  - All use fakes for Glide and the provider; the pure modules are tested directly.
- **On the instance:** sign in as a user with only `x_acllens.user` to check access mirroring and refusals. Admin features need an admin session.
- **REST:** call the API from the browser console on the UI page (the session supplies `g_ck`), or with basic auth.

## 6a. Instance packaging

`now.config.json` has `packageSourceCodeOnInstance: false`, so the instance gets built metadata and the bundled UI page only. No source zip is uploaded and no npm packages are installed on the instance. Edit the app in this repository, not in the on-instance editor ([ADR-0006](adr/ADR-0006-dependency-supply-chain.md)).

## 7. Dependency maintenance

| Check | Command | Expected |
|---|---|---|
| Shipped (runtime) code | `npm audit --omit=dev` | `found 0 vulnerabilities` |
| All packages | `npm audit` | Only the known, unfixable build-tool items (R-09) |
| Origin and signatures | `npm audit signatures` | All verified; none invalid or missing |
| Reproducible install | `npm ci` | Uses `package-lock.json` exactly |

- **Upgrading the SDK:** `npm install --save-dev --save-exact @servicenow/sdk@<version>`. Then re-read the SDK orientation docs (`npx now-sdk explain quickstart --list`), build, run the offline tests, deploy and smoke-test.
- **`overrides` in `package.json`** force patched versions of the SDK's inner dependencies (handlebars, fastify, @fastify/static, joi, undici, js-yaml 3.x). After each SDK upgrade, run `npm ls <package> --all`. Remove an override once the SDK ships that version or newer itself.
- Never run `npm audit fix --force`: it would downgrade the SDK to 3.0.3.
- npm blocks third-party install scripts (swc, libxmljs2, parcel). The build doesn't need them; leave them blocked.

## 8. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `ModuleResolutionException: No module with path …` | A server import without `.ts` |
| Styles don't change after deploy | Cached separate CSS asset. Fixed by [ADR-0004](adr/ADR-0004-styles-in-js-bundle.md); hard-refresh the page |
| A run takes long | Check `results.timings` in *Export → Raw results (JSON)*; narrow the filter or lower *Max tables* |
| Assistant: "No AI provider is available" | Configure a provider; for Now Assist see [05 §2](architecture/05-ai-assistant-and-mcp.md#connecting-now-assist-pdi-findings-2026-10-08) |
| *Test connection*: "Not ready: …" | The message names what's missing (capability inactive, no key, no endpoint) |
| 403 on `/admin/*` | The caller lacks `x_acllens.admin` |
