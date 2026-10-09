# ADR-0007: Placeholder Scope and Local Install Profiles

| | |
|---|---|
| **Status** | Accepted 2026-10-09 |
| **Relates to** | [Install & Deployment](../install-and-deploy.md), [INSTALL.md](../../INSTALL.md) |

## Context
- The repository should be safe to make public, and anyone should be able to install it.
- The scope (`x_<company code>_acllens`) appears in about 300 places: tables, roles, properties, REST path, UI page, `keys.ts` and a UI action's `require` path.
- The scope carries the developer instance's company code. `now.config.json` also held the installed app's sys_id, and the docs named the instance.
- Every installer needs a different scope, because the SDK warns when the scope doesn't start with the instance's vendor prefix.

## Decision
1. **The committed source uses the placeholder scope `x_acllens`** and a neutral `scopeId`. No instance name, company code, login or app sys_id is committed.
2. **Install profiles** (`acl-lens.local.json`, git-ignored) hold each instance's login alias, scope and scopeId. Reusing an installed app's sys_id updates that app in place.
3. **Profile builds run in a copy** (`.deploy/<profile>/`, git-ignored). The placeholder is replaced there, and `now-sdk build` / `install` / `pack` run there with the root `node_modules` linked in. New keys are copied back to `keys.ts` with the placeholder restored.
4. **Guided setup** (`npm run setup`): a local, dependency-free web page that creates the SDK login (password piped to `--password-stdin`, never stored by us), proposes the scope from `glide.appcreator.company.code`, detects an existing install, and installs.
5. **IDE and Git route:** `tools/scope.mjs` and the *Prepare a branch with my scope* GitHub Action write a scope into a branch, for the ServiceNow IDE to build directly.

## Consequences
- ✅ The source contains no personal or company data; installs on several instances each keep their own scope.
- ✅ Existing installs are updated in place: verified on the development PDI with no duplicate app.
- ⚠️ `npm run build` / `now-sdk install` from the root would install `x_acllens` as a separate app. Use `npm run deploy` instead, as documented.
- ⚠️ Git history from before this change still contains the original identifiers. Publishing a clean history needs a fresh repository or a history rewrite ([install-and-deploy §9](../install-and-deploy.md#9-keeping-the-repository-publishable)).
