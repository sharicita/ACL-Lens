# 04 — Security Architecture

## 1. Threat model

| Threat | Control |
|---|---|
| Unauthorized users read security posture | Every REST route checks `x_acllens.user`; admin routes check `x_acllens.admin` (403 otherwise). Navigator modules are role-restricted |
| The app changes security configuration | No code path writes to platform security tables. Writes are limited to the app's own tables and properties |
| The assistant reveals data the user can't see | All assistant/MCP lookups use `GlideRecordSecure` as the signed-in user; links only for records it could read; the client renders links only for this instance |
| The assistant performs changes | Tools are read-only by construction; the system prompt forbids claiming changes; the MCP tool annotations declare `readOnlyHint: true` |
| Prompt injection through instance data | Tool results are passed as data in user turns; tools cannot write; the output is rendered as React elements, never as raw HTML |
| API key exposure | `Password2` field, decrypted only server-side; provider table readable only by ACL Lens admins |
| API key sent to the wrong service | Type dropdown + unknown types refused; HTTPS only; endpoint host must match the provider Type (another vendor's host is always blocked); check repeated right before sending |
| Key fragments shown in error messages | Provider errors are scrubbed (full key, prefix/suffix echoes, `sk-…`, `****` masks, bearer values) |
| Assistant reveals ACL rules the user can't read | `evaluate_access` returns outcomes and general reasons only unless the user can read `sys_security_acl` |
| One user reads another user's AI conversations | Server filters by `user = gs.getUserID()`; record ACLs enforce the same |
| Unbounded data growth | Admin clearing tools and optional retention ([ADR-0005](../adr/ADR-0005-history-governance.md)) |

## 2. Roles

| Role | Contains | Purpose |
|---|---|---|
| `x_acllens.user` | — | Use the app. **Sensitive**: the analysis engine reads security tables with `GlideRecord` (not `GlideRecordSecure`) so it can evaluate *other* subjects. Holders can therefore see ACL definitions and role assignments for any subject they analyze |
| `x_acllens.admin` | `.user` | Settings, history governance, archive/restore, AI providers, Test connection |

## 3. Record ACLs installed

| Table | read | create | write | delete |
|---|---|---|---|---|
| `x_acllens_run` (+ `.*` read/write) | user | user | admin | admin |
| `x_acllens_run_data` (+ `.*` read) | user | user | — | admin |
| `x_acllens_ai_provider` (+ `.*` read/write) | admin | admin | admin | admin |
| `x_acllens_ai_conversation` (+ `.*` read) | user, **own only** (script) | — | — | user, own only |
| `x_acllens_ai_message` (+ `.*` read) | user, own conversation only (script) | — | — | — |

Server modules write runs and conversations with `GlideRecord`, after their own role checks and owner filters.

## 4. Cross-scope privileges (all `allowed`)

- **Read (`sys_db_object`, scope `global`):** `sys_security_acl`, `sys_security_acl_role`, `sys_security_operation`, `sys_security_attribute`, `sys_user`, `sys_user_role`, `sys_user_has_role`, `sys_user_role_contains`, `sys_user_group`, `sys_db_object`, `sys_dictionary`, `sys_scope`, `sys_one_extend_capability`.
- **Execute (`scriptable`):** `OneExtendUtil` in `sn_one_extend` (Now Assist; used only when configured).

## 5. Secrets

- AI provider API keys are stored in `api_key` (Password2) and decrypted with `getDecryptedValue()` only when calling the provider.
- Keys are never returned by any API.
- Now Assist needs no key; it runs as the platform's own Generative AI Controller.

## 6. Data retention and privacy

| Data | Where | Retention |
|---|---|---|
| Runs: subjects, filter, results, comparison, drift, CSV | `_run`, `_run_data`, attachments | Until an admin clears them, or retention deletes/archives them (off by default; 90 days when on) |
| Assistant conversations | `_ai_conversation`, `_ai_message` | Kept; owner-only access. Not covered by run retention (see [06](06-risks-assumptions-decisions.md) open items) |
| External AI processing | The provider chosen by the admin | Governed by that provider's data terms. Prompts include tool results (ACL names, role names, record display values the user could read) |

Clearing removes runs, their result chunks and their CSV attachments, and writes a system log entry naming the admin and the criteria.

## 7. Dependencies and supply chain

Policy: [ADR-0006](../adr/ADR-0006-dependency-supply-chain.md).

| Area | State (2026-10-08) |
|---|---|
| Code shipped to the instance | App code only. The UI bundle includes `react` 19.3.0, `react-dom` 19.3.0 and `scheduler` 0.28.0; server modules have no third-party code |
| Source upload to the instance | **Off** (`packageSourceCodeOnInstance: false`); the earlier uploaded source package was deleted |
| Locked packages | 588 (585 build-only) from `registry.npmjs.org`, all with integrity hashes |
| Signatures | 529 verified registry signatures, 70 verified provenance attestations, none invalid |
| `npm audit --omit=dev` | 0 vulnerabilities |
| `npm audit` (all) | 18 (13 high, 5 moderate), all in build tooling. All come from `braces` and `sprintf-js`, which have no released fix (R-09). The critical `handlebars` and the `fastify`, `@fastify/static`, `joi`, `undici` and `js-yaml` advisories were fixed with `overrides` |
| Install scripts | Blocked by npm (none ran) |
| Manual code review of third-party packages | **Not performed.** Assurance rests on minimal shipped surface, registry signatures, audits and pinning |

## 8. Operational recommendations

- Grant `x_acllens.user` to security / platform staff only, through a group.
- Use the history and retention settings to match your audit policy.
- Before you configure an external AI provider, confirm it's allowed to receive security metadata. Prefer Now Assist where it's available.
- ACL changes recommended by the assistant should go through normal change control: sub-production first, update sets, impersonation testing, rollback.
- Turn on GitHub Dependabot alerts for the repository and re-run the dependency checks ([dev setup §7](../dev-setup.md#7-dependency-maintenance)) on every upgrade.
