# Plan: evaluate API access (OAuth scopes, REST API access policies, API-level ACLs)

Status: **Phase 0 complete** (2026-10-27, confirmed on pdi1; see `03-access-evaluation-engine.md` §9). **Phase 1 code complete; Phase 2 under way (1.2.0: request field, lookups, run form, explanations on conditional cells)**. Not yet verified on an instance. Phase 1: engine logic, types, loader (`api-loader.ts`), `analyze.ts` wiring (`analyze(refs, filter, api?)`), the `account.ts` message, cross-scope privileges and 45 offline tests (type-check clean). The loader and the lookups have not run against the instance yet. Phases 3–4 not started. Owner: Eric. Created 2026-10-27.

## Goal

Replace the "not evaluated" limit for machine and API-only accounts with a real evaluation of the three controls that sit in front of record ACLs when a request arrives through a REST API:

1. **OAuth auth scopes** — whether the token's OAuth client (Application Registry, `oauth_entity`) holds the auth scope that a REST API requires.
2. **REST API access policies** — whether the authentication method the integration uses (Basic, OAuth, ID token, API key, certificate…) is allowed for that API, version, resource, method and (for the Table API) table.
3. **API-level ACLs** — `REST_Endpoint` ACLs on the API / resource (Scripted REST "Default ACLs" and resource "ACLs"), plus the table's web-service access switch for the Table API.

The result for each table becomes: **record access (today's engine) ∩ API gate**. Static, read-only, same status model (G / C / D / N).

## How the platform decides (research summary — verify in Phase 0)

| Control | Rule | Source |
|---|---|---|
| Auth scope | An API is restricted only if it has a REST API Auth Scope record. The OAuth entity must be linked to that same scope. The `useraccount` scope reaches every API. New OAuth entities have no scopes. Application Registry *Scope restriction* (`scope_restriction_status`: `unrestricted` / `useraccount` / `restricted` = "Securely scoped") — `restricted` refuses APIs without a scope ("Access to unscoped api is not allowed"); behaviour of the other two against unscoped APIs still to confirm in Phase 4. | ServiceNow docs: REST API Auth Scope; Community thread (Zurich) |
| Access policy | Policies map REST API (+version, resource, method, table) to allowed inbound auth profiles. When several match, the most specific wins: method+resource+version → method+resource → resource+version (all methods) → resource (all methods) → method+version (all resources) → method (all resources) → version (all methods, all versions) → global (not all methods) → global (all methods). Non-global always beats global. | ServiceNow docs: Create REST API access policy; API access policy prioritization |
| Scripted REST ACLs | Resource *Requires authentication*, *Requires ACL authorization*, resource *ACLs* (empty → API *Default ACLs*). The caller needs **one** of the listed ACLs. ACL type must be `REST_Endpoint`. | ServiceNow docs: Scripted REST APIs |
| Table API | Table must allow web-service access (`sys_db_object.ws_access`), then record ACLs apply as today. The Table API is a built-in processor (path `now/table`), **not** a `sys_ws_definition`. | Confirmed in Phase 0 (structure); ACL behaviour per platform docs |

**Not resolvable statically (stays Conditional, with a reason):** adaptive-authentication / IP conditions on auth profiles, tokens from an external IdP (scope comes from the IdP), which auth method a given integration actually uses when the user doesn't say.

## Phase 0 — confirm the data model on the PDI (no code)

Use `now-sdk query` against `pdi1` and record the answers in `docs/architecture/03-access-evaluation-engine.md`:

- [x] Table + columns for **REST API Access Policies** (`sys_api_access_policy`) and its auth-profile mapping table (`sys_auth_profile_mapping`); columns for API, version, resource, method, table, global, apply-to-all flags, active.
- [x] Table + columns for **inbound auth profiles** (`inbound_auth_profile`) and their type: the type is the subclass (`std_http_auth` with `type` = `access_token` / `oidc_token` / `mTLS` / `basic_auth`; `http_key_auth`; `http_body_auth`). No HMAC type found.
- [x] Table + columns for **REST API Auth Scope** records (`sys_api_access_scope`), the API ↔ scope link (`api_path`), and the `oauth_entity` ↔ scope link (`oauth_entity_auth_scope_mapping`); `useraccount` is a row in `sys_auth_scope`; `oauth_entity.scope_restriction_status` = `unrestricted` / `useraccount` / `restricted`.
- [x] Scripted REST: `sys_ws_definition` (`enforce_acl` = Default ACLs) and `sys_ws_operation` (`requires_authentication`, `requires_acl_authorization`, `requires_snc_internal_role`, `enforce_acl`). Column names confirmed.
- [x] `sys_security_acl.type` = `REST_Endpoint` (reference to `sys_security_type`); ACLs are linked from `enforce_acl` on the definition / resource, **not** matched by name or path.
- [x] The Table API is **not** a `sys_ws_definition`: match on `api_path` (`now/table`, `now/stats`). `sys_db_object.ws_access` is the web-service switch.
- [x] Read roles recorded per table (`api_service_admin`, `web_service_admin`, `oauth_admin`, `miac_admin`); a cross-scope read privilege is needed for **every** Phase 0 table. Open: `oauth_entity` read roles, `http_key_auth` / `http_body_auth` roles.
- [x] Release guards: field list recorded in §9. Only the Australia release was available; older releases untested.

Exit: confirmed names in `03-access-evaluation-engine.md` §9. Phases 1–4 adjusted below (marked *Phase 0:*).

## Phase 1 — engine (server, offline-testable)

New module `src/server/engine/api-access.ts` (pure logic + a loader in the same style as `data-filters.ts`):

- [x] **Types** (`types.ts`, mirrored in `src/client/types.ts`; done, `ApiGate` carries per-operation `ops` / `pol`):
  - `ApiContext` (run input): `{ api: 'table' | '<sys_ws_definition id>', authProfile?: string | 'any', oauthEntity?: string }`. *Phase 0:* the engine resolves `api` to an **`api_path`** (`now/table` for the Table API, `<namespace>/<service_id>` for scripted APIs), because policies and scopes match on the path. An auth profile is one `inbound_auth_profile` sys_id; one pinned to an OAuth entity (`std_http_auth.oauth_entity`) only matches that entity.
  - `ApiGate` per table: `{ s: Status; ws?: boolean; policy?: { id, allowed: boolean | 'C', lvl }; scope?: { id, result: 'P'|'F'|'C', reason }; ep?: AclOutcome[] }`.
  - New reason codes: `wsoff`, `authblocked`, `noscope`, `unscoped`, `useraccount`, `ext` (IdP/adaptive – conditional).
  - `TableResult.api?: ApiGate` (optional → old runs still load).
- [x] **Policy matcher** implementing the 9-level prioritization above (pure function, unit-tested per level) — `policyLevel` / `policyDecision` in `api-access.ts`.
- [x] **Scope check** (`scopeDecision`): API scope set vs OAuth entity scope set, `useraccount`, `scope_restriction_status` (`restricted` refuses unscoped APIs; `unrestricted` / `useraccount` unconfirmed → Conditional until Phase 4 settles them).
- [x] **Endpoint ACLs** (`endpointDecision`; the loader still has to resolve the ACL records): reuse `Evaluator` for `REST_Endpoint` ACLs (roles, admin overrides, conditions/scripts → C), resolved from `enforce_acl` on the definition (default) and resource (override). Any one passing ACL = pass. Also check `requires_authentication`, `requires_acl_authorization` and `requires_snc_internal_role`.
- [x] *Phase 0:* cross-scope privileges added (`keys.ts` entries arrive with the next build). The loader reads configuration with `GlideRecordSecure` and `isValid()` / `isValidField()` guards; an unreadable table is listed in `ApiInputs.hidden` and makes the gate Conditional with reason `hidden`; a missing table counts as no data. Original note: add read-only cross-scope privileges for the 13 tables in §9 to `cross-scope.now.ts`, and guard every table/column with `isValid()` / `isValidField()`; a hidden or missing table yields Conditional ("not visible" / "not available on this release"), never Denied.
- [x] **Fold** into the cell (`applyApiGate`, wired into `evaluateTable` in `analyze.ts` right after `applyDataFilters`; after `applyDataFilters`): gate D → cell D (keep ACL-only status in `acl`), gate C → G becomes C, gate pass → unchanged. Record `api` on the cell like `df`.
- [x] Only applied when the run has an `ApiContext` — UI-only runs are unchanged (`ctx.api` is unset, `TableResult.api` absent).
- [x] `account.ts` warning: with an API context it says what was evaluated (done). **Deferred to Phase 2:** the "suggest setting one" sentence for runs without a context, because the run-form control it points to doesn't exist yet.
- [ ] Not covered in Phase 1: `fieldDetail` (the per-field drill-down) ignores the API context, and `requires_authentication` is not checked (every subject is an authenticated user).

## Phase 2 — REST + UI

- [x] `lens-api.now.ts` / `handlers.ts`: accept `api` on run requests; lookup endpoints for REST APIs, auth profiles and OAuth entities (`GlideRecordSecure`, `queryText()` sanitising, results limited to what the user can read). *Phase 0:* the API picker offers the built-in Table API (`now/table`) plus `sys_ws_definition` rows; role-only users will usually get empty lookups (reads need `api_service_admin` / `web_service_admin` / `oauth_admin`), so say so in the form. Done in 1.2.0: `api` travels inside the run `filter` (so reruns repeat it) and is validated by `normalizeApiContext`; four lookup routes under `/api-access/`.
- [x] Run form: an **"Evaluate as API access"** section (collapsed by default; opened automatically for machine / AI agent / web-service-only / integration users): API (default Table API), authentication method, OAuth application. ⓘ field hints per `servicenow.md` §7. Done in 1.2.0 (`ApiAccessPanel`; the section opens for such users but the box stays unticked until the user ticks it, so a run never changes meaning silently; resource picker added for Scripted REST APIs).
- [ ] Status cells: an `API` marker beside `df`; clicking a cell explains the gate in place (policy matched + level, scope result, endpoint ACLs, web-service switch) with record links. *Partly done in 1.2.0:* clicking a Conditional cell and the table drawer explain the gate (`ApiGateNote`). Still to do: the `API` marker beside `df`, and an explanation for Denied cells (they are not clickable yet), with policy level and record links.
- [ ] Table details drawer: new **API access** tab.
- [x] Subject card / run header: show the API context used. Run header done in 1.2.0; the subject card does not show it.
- [ ] Comparison, drift, exports (CSV/JSON) and the reporting dashboard carry the new fields; rank logic unchanged.
- [ ] AI assistant tools (`src/server/ai/tools.ts`) and MCP: expose the gate in the evaluation view; read-only.

## Phase 3 — live check

- [ ] Live check stays record-level (the platform has no server API to replay an OAuth request). Show the static API gate next to the live result and say plainly that the gate is static. Do **not** issue real REST calls with tokens.

## Phase 4 — tests, docs, release

- [ ] Offline tests (`tests/offline/engine.test.js`): each prioritization level, global vs non-global, inactive policy ignored, `useraccount`, secured-scopes-only, no scope on API, endpoint ACL one-of semantics, web-service off, fold rules, old runs without `api`.
- [ ] PDI verification (pdi1) as role-only user and admin: create throwaway auth scope, OAuth entity, access policy and scripted REST API; confirm each D/C/G outcome; confirm with a real REST call where practical; delete the throwaway records.
- [ ] Docs: ADR-0008 (static API-gate evaluation), update `03-access-evaluation-engine.md` §1/§4/§7, `user-guide.md` ("Machine and API-only accounts"), `data-dictionary.md`, `api-reference.md`, `build-log.md`, `lessons-learned.md`.
- [ ] Before push: `npm test`, build type-checks, `git grep` for instance identifiers.

## Out of scope

Domain separation, SOAP / GraphQL / JSONv2 processors, outbound OAuth, rate limits, IP access controls (`ip_access`), and replaying real tokens.

## Proposed replacement user-guide text (after release)

> **Machine and API-only accounts** — When a user is a machine identity, an AI agent identity, *Web service access only*, or an internal integration user, set **Evaluate as API access** on the run (it opens automatically). ACL Lens then also checks the API's auth scope against the chosen OAuth application, the REST API access policy for the chosen authentication method, the API's REST endpoint ACLs and the table's web-service access. Anything it can't resolve statically (adaptive authentication conditions, tokens from an external identity provider) shows as Conditional with the reason.
