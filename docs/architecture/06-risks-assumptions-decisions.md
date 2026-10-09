# 06 — Risks, Assumptions & Decisions

## 1. Known vs verified vs assumed

| Item | Status | Evidence |
|---|---|---|
| Analysis, comparison, matrix, details drawer, history, rerun + drift | **Verified on PDI** | Runs ALR0001001–1005; `itil` vs `admin` 1,500 tables |
| Role-only user can use the app; admin routes refused (403) | **Verified on PDI** | Test user `acl.lens.tester` |
| Scope search ranking (`x_` → custom apps first) | Verified by query as admin; UI verified as role-only (no scopes visible, by design) | `sys_scope` query |
| Tooltips, animations, restyle, tips | **Verified on PDI** (role-only user) | Screenshots during build |
| Settings view, clearing, retention job, archive/restore | **Built and installed; not clicked through as admin** | Records present: properties, `sysauto_script`, UI action |
| Provider form UI policy and Test connection | **Installed; not exercised as admin** | — |
| AI answer from a real model | **Verified on PDI** | Anthropic provider; 4 test questions as the role-only user (build log 1.6) |
| Now Assist invocation | **Unverified** | No callable skill on PDI |
| Engine rules (matching order, deny-unless, admin, elevation, `public`) | Offline tests + PDI spot checks | `tests/offline/engine.test.js` |
| App works after SDK 4.13.6 + overrides | **Verified on PDI** | ALR0001009: same results as before the upgrade (3.5 s) |

## 2. Decision log

| ID | Decision | Record |
|---|---|---|
| D-01 | Evaluate ACLs statically; report record-dependent outcomes as Conditional | [ADR-0001](../adr/ADR-0001-static-acl-evaluation.md) |
| D-02 | Store results as chunked JSON rows; the run record holds the summary | [ADR-0002](../adr/ADR-0002-run-history-storage.md) |
| D-03 | Provider-agnostic, read-only assistant; tools run as the user; MCP endpoint | [ADR-0003](../adr/ADR-0003-ai-provider-agnostic-read-only.md) |
| D-04 | Styles embedded in the JS bundle | [ADR-0004](../adr/ADR-0004-styles-in-js-bundle.md) |
| D-05 | History on by default; admin clearing; retention off by default (90 days, delete or archive) | [ADR-0005](../adr/ADR-0005-history-governance.md) |
| D-06 | Plain React components on Horizon tokens instead of `@servicenow/react-components` | Matches the SDK 4.11 `typescript.react` template; the matrix needs custom cells |
| D-07 | ~~Scope uses the PDI company code~~ Superseded by D-13 | — |
| D-08 | Server modules import each other with explicit `.ts` extensions | The platform module resolver requires them ([build log 1.1](../build-log.md)) |
| D-09 | Default Anthropic model `claude-opus-5-5`, effort `medium`, refusal fallback on | Admin can change the model per provider |
| D-11 | Assistant ACL detail is strict (decision A): ACL names, rule levels and roles only for users who can read `sys_security_acl` | Build log 1.7; ADR-0003 amended |
| D-12 | Provider endpoint must match its Type, HTTPS only, custom gateways by explicit opt-in; provider errors scrubbed of key fragments | Build log 1.7 |
| D-13 | Source uses the placeholder scope `x_acllens`; real scope, instance and app sys_id live in git-ignored install profiles; guided setup | [ADR-0007](../adr/ADR-0007-placeholder-scope-and-install-profiles.md) |
| D-10 | No source upload to the instance; SDK kept current; same-major `overrides` for vulnerable build-tool dependencies | [ADR-0006](../adr/ADR-0006-dependency-supply-chain.md) |

## 3. Risks

| ID | Risk | Mitigation |
|---|---|---|
| R-01 | Users read *Granted* as "can see every record" | Legend and tooltips; known limits ([03 §7](03-access-evaluation-engine.md#7-known-limits)); assistant guidance on query BRs and data filters |
| R-02 | Large analyses hit the REST transaction quota | 1,500-table default cap; per-phase timings; filters |
| R-03 | `x_acllens.user` over-granted | Documented as sensitive; grant through a group |
| R-04 | Security metadata sent to an external LLM | Admin-only provider config; prefer Now Assist; documented ([04 §6](04-security-architecture.md)) |
| R-05 | Instance serves a stale CSS asset after deploy | Styles in the JS bundle ([ADR-0004](../adr/ADR-0004-styles-in-js-bundle.md)) |
| R-06 | The Test connection UI action's `require` path contains the package version | Comment in `settings.now.ts`; [dev setup](../dev-setup.md) checklist |
| R-07 | Now Assist response shape differs from the parser's expectations | Tolerant parsing; Test connection shows the exact error |
| R-08 | Platform ACL semantics change in a future release | Engine is isolated in `evaluator.ts` with offline tests |
| R-10 | Provider misconfiguration sends an API key to the wrong service (happened once: Anthropic key sent to an OpenAI endpoint because Type was free text) | Type is a dropdown; unknown types are refused; Anthropic endpoint normalized. Rotate any key sent to the wrong service. Endpoint-vs-type host check and key-fragment masking added (build log 1.7) |
| R-11 | Installing from the project root (`x_acllens`) on an instance that already has a profile install creates a second app | `npm run deploy` always uses a profile; documented in dev setup and ADR-0007 |
| R-12 | Older git commits contain the development instance name and company code | Documented; fresh repository or history rewrite before publishing ([install-and-deploy §9](../install-and-deploy.md#9-keeping-the-repository-publishable)) |
| R-09 | Unfixed advisories in build tooling: `braces` (high, DoS) and `sprintf-js` (moderate, DoS); third-party packages not code-reviewed | Not shipped to the instance; needs attacker-controlled input to a local build; re-check on each SDK upgrade; Dependabot |

## 4. Assumptions

- Deny-unless ACLs use the same first-matching-level rule as allow-if ACLs.
- Admin implicitly satisfies non-elevated role requirements (as `hasRole` does).
- `sys_user_has_role.state=active` reflects effective role grants.

## 5. Open items

| ID | Item |
|---|---|
| O-01 | Verify Settings, clearing, retention and Test connection as an admin |
| O-02 | ~~Configure a provider and verify live assistant answers~~ Done for the role-only user (build log 1.6); admin user still to check |
| O-03 | Decide whether assistant conversations need their own retention setting |
| O-04 | Optional: an extra required role (e.g. `security_admin`) for the analysis engine |
| O-05 | If Now Assist Skill Kit becomes available, verify the skill call and response parsing |
| O-06 | Enable GitHub Dependabot alerts and private vulnerability reporting on the repository |
| O-08 | ~~Decide `evaluate_access` detail~~ Done: strict (D-11) |
| O-09 | ~~Endpoint check and key masking~~ Done (D-12) |
| O-07 | Remove `overrides` once the SDK ships fixed versions; re-check `braces` / `sprintf-js` for fixes |
