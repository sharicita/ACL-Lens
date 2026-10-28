# 03 — Access Evaluation Engine

Source: `src/server/engine/` (`subjects.ts`, `schema.ts`, `acl-index.ts`, `evaluator.ts`, `analyze.ts`, `compare.ts`).
Decision: [ADR-0001](../adr/ADR-0001-static-acl-evaluation.md).

## 1. Inputs

| Input | Source |
|---|---|
| User effective roles | `sys_user_has_role` where `state=active` (direct, group-granted via `granted_by`, inherited) |
| Role effective roles | The role plus a breadth-first walk of `sys_user_role_contains` |
| Implicit roles | `public` (held by every session, never stored in `sys_user_has_role`) |
| Elevated roles | `sys_user_role.elevated_privilege=true` |
| ACLs | `sys_security_acl` where `type=record`, `active=true`, operation ∈ create/read/write/delete. Fields read: decision type, admin overrides, condition, advanced + script, security attribute (when *Existing*), applies-to, scope |
| ACL roles | `sys_security_acl_role` |
| Table hierarchy | `sys_db_object.super_class` |
| `*.field` relevance | `sys_dictionary` (limited to the analyzed tables and their parents) |
| Default mode | `glide.sm.default_mode` |

## 2. Matching order

The **first level that has at least one ACL for the operation** is evaluated, separately for allow-if and deny-unless rules:

- **Table:** `table` → parent → … → `*`
- **Field:** `table.field` → `parent.field` → `*.field` → `table.*` → `parent.*` → `*.*`

## 3. Evaluating one ACL for a subject

In order:
1. Admin with *Admin overrides* → **Pass** (`admin`).
2. Roles: the subject holds none of them → **Fail** (`norole`). Exception: admin holds any non-elevated role (`adminrole`). If only elevated roles match, the result is flagged `elev`.
3. Security attribute: always-pass ones (`UserIsAuthenticated`, `AlwaysTrue`) pass; `HasNobodyRole` fails; `HasAdminRole` fails for non-admins (`attrfail`); anything else → **Conditional** (`attr`).
4. Advanced script → **Conditional** (`script`); condition → `cond`; applies-to → `scope`; elevation only → `elev`.
5. Otherwise → **Pass** (`role` or `open`).

## 4. Combining into a status

| Status | Rule |
|---|---|
| **D** Denied | Any matched deny-unless ACL fails, or the matched allow-if ACLs all fail |
| **G** Granted | At least one allow-if ACL passes and no deny-unless is conditional |
| **C** Conditional | No outright pass, but at least one ACL is conditional (or a deny-unless is conditional) |
| **N** No rule | No ACL at any level. `glide.sm.default_mode` decides (deny on most instances) |

**Security data filters** are then folded in (`applyDataFilters` in `evaluator.ts`). When any filter on the table or a parent applies to the subject (*A*) or may apply (*C*, its security attribute can't be resolved statically), every **G** table operation except `create` becomes **C**: only rows inside the filter are reachable. `C` stays `C`; `D` and `N` are unchanged. The cell records `df` (A or C) and, when the status changed, the ACL-only status in `acl`. `create` is exempt because inserting a record doesn't query existing rows. Field cells are not changed: they describe the field rule only.

Each cell stores the matched level (`lvl`), the deny-unless level (`dlvl`) and each evaluated ACL with its result and reason code. That's what the Table details drawer explains.

## 5. Which fields are listed

- Per table, the stored run lists `*` ("all other fields") plus every field with an explicit rule on the table, a parent, or `*.field`. A `*.field` counts only where the column exists in the hierarchy.
- *Load all fields (live)* evaluates every dictionary column, including inherited ones.
- Field results are the field rule only. Effective field access also needs record access.

## 6. Comparison and drift (`compare.ts`)

- **Rank** for "more access": G = 2, C = 1, D = 0, N = 0 (or 2 when default mode is allow).
- **Comparison:**
  - totals per subject;
  - identical vs different tables;
  - *exclusive* cells (only one subject has access);
  - pairwise *aMore / bMore / same*;
  - role matrix;
  - every differing table and field cell.
- **Drift** (reruns): the per-subject cells whose status changed, plus roles added or removed. Up to 2,000 cells are stored.

## 7. Known limits

| Not evaluated | Effect on results | How to check |
|---|---|---|
| Conditions, scripts, non-trivial security attributes | Shown as **Conditional** with the reason | Read the ACL (details drawer); test with impersonation |
| Query business rules, before-query rules | Rows may be hidden even when ACLs allow | Assistant troubleshooting guidance; live check with a record |
| Security data filters | Folded in: Granted becomes Conditional where a filter applies (§4) | Data filters tab; live check |
| Access handlers, data filtration | Not readable as records: they only appear in the platform's live evaluation | **Verify live** (whole run, as the baseline) or the **Live** tab (one table) |
| OAuth token scopes, REST API access policies, API-level ACLs | Not evaluated, statically or live; machine, AI agent, web-service-only and integration users get a run warning (`account.ts`) | Test through the integration |
| Domain separation | Not modelled | Test in the domain |
| UI policies / client scripts | Fields may be hidden or read-only on forms | Form testing |
| Non-record ACL types (REST, UI page, client-callable…) | Not shown | Platform ACL list |
| Role elevation state | Elevated-only access shown as **Conditional** (`elev`) | — |

## 8. Accuracy fixes found on the PDI

- **`public` role:** ACLs requiring `public` were treated as failing (`kb_knowledge` read showed Denied). Fixed by treating `public` as implicit; there is a regression test in `tests/offline/engine.test.js`.
- The evaluator is covered by offline tests:
  - inheritance;
  - deny-unless;
  - admin overrides;
  - elevated roles;
  - field precedence;
  - security attributes;
  - comparison counts.

## 9. API access data model (confirmed on the PDI)

Phase 0 of [the API access plan](../plans/api-access-evaluation.md). Confirmed with `now-sdk query` against the `pdi1` profile (Australia release, patch 1). All tables are in the `global` scope and extend `sys_metadata`. Read-only; nothing was written.

### Tables and columns

| Control | Table (label) | Columns the engine needs |
|---|---|---|
| Access policy | `sys_api_access_policy` (API Access Policies) | `active`, `name`, `api` (choice, stores the **label**, e.g. "Table API"), **`api_path`** (the key, e.g. `now/table`, `now/stats`, `<namespace>/<service_id>`), `version` (choice; `latest`, a version id, or empty), `api_resource` (e.g. `/now/table/{tableName}`), `http_method` (GET, POST, PUT, PATCH, DELETE), `api_tablename` (glide_list of table names), `apply_all_versions`, `apply_all_methods`, `apply_all_resources`, `apply_all_tables`, `apply_global`, `apply_all`, `all_authn_scheme_authenticate_header` |
| Policy to profile | `sys_auth_profile_mapping` (Inbound authentication profile) | `api_access_policy` (to `sys_api_access_policy`), `inbound_auth_profile` (to `inbound_auth_profile`). One row per allowed profile. |
| Inbound auth profile | `inbound_auth_profile` (Authentication Profile) | `name`, `active`, `description`, `auth_processor`. The method lives on the subclass (`sys_class_name`), see finding 3. |
| Auth scope | `sys_auth_scope` (Authentication Scope) | `name`, `description`. `useraccount` is a normal row ("Full access to all REST APIS"). |
| API to scope | `sys_api_access_scope` (REST API Auth Scope) | `active`, `name`, `auth_scope` (to `sys_auth_scope`), `api`, **`api_path`**, `version`, `api_resource`, `http_method`, `apply_all_versions`, `apply_all_methods`, `apply_all_resources`, `disable_client_restriction` |
| OAuth entity to scope | `oauth_entity_auth_scope_mapping` (Auth Scopes) | `oauth_entity` (to `oauth_entity`), `auth_scope` (to `sys_auth_scope`) |
| OAuth entity | `oauth_entity` | `name`, `active`, `type` (`client`, `oauth_provider`), **`scope_restriction_status`**, `only_rest_processor`, `client_id`, `user` |
| Scripted REST API | `sys_ws_definition` | `name`, `namespace`, `service_id`, `base_uri` (e.g. `/api/now/ace`), `active`, `is_versioned`, `default_version`, **`enforce_acl`** (glide_list to `sys_security_acl`: the Default ACLs) |
| Scripted REST resource | `sys_ws_operation` | `name`, `active`, `web_service_definition`, `web_service_version`, `http_method`, `relative_path`, `operation_uri`, `requires_authentication`, `requires_acl_authorization`, `requires_snc_internal_role`, **`enforce_acl`** (glide_list to `sys_security_acl`) |
| Version | `sys_ws_version` | `web_service_definition`, `version` (integer), `version_id` (e.g. `v1`), `is_default`, `active`, `deprecated` |
| Table web-service switch | `sys_db_object` | **`ws_access`** (boolean, "Allow access to this table via web services", default true) |
| Endpoint ACL | `sys_security_acl` | `type` (to `sys_security_type`, name `REST_Endpoint`), `operation`, `active`, `admin_overrides`, `decision_type`, `condition`, `script`, `advanced`; roles in `sys_security_acl_role` |

### Findings that differ from, or sharpen, the plan

1. **Policies and scopes match on `api_path`, not on a `sys_ws_definition` reference.** `api` is a choice holding the display label. The path is `namespace/service_id` for scripted APIs (`base_uri` minus `/api/`) and a fixed string for built-in processors (`now/table`, `now/stats`).
2. **The Table API is not a `sys_ws_definition`.** No definition has `service_id=table` or `base_uri=/api/now/table`; the same goes for Aggregate (`now/stats`). They are built-in processors. The engine treats `api: 'table'` as the literal path `now/table` and does not look up a definition. Table API ACLs are the normal record ACLs.
3. **Inbound auth profile method = `sys_class_name` plus `type`.** `inbound_auth_profile` has no type column:

   | Method | `sys_class_name` | Discriminator |
   |---|---|---|
   | OAuth token | `std_http_auth` | `type = access_token` |
   | ID token (OIDC) | `std_http_auth` | `type = oidc_token` |
   | Certificate (mTLS) | `std_http_auth` | `type = mTLS` |
   | Basic | `std_http_auth` | `type = basic_auth` |
   | API key | `http_key_auth` | `auth_parameter` (to `sys_token_auth_parameter`) |
   | WSSE / body | `http_body_auth` | `type` (string) |

   `auth_processor = true` marks the "none public processors" profiles (all inactive here). The plan's **HMAC** type was not found; drop it unless a later release adds it.
4. **`std_http_auth.oauth_entity` can pin a profile to one OAuth application** (set on "OAuth Authentication for Build Agent Service", empty on the generic "OAuth token"). A pinned profile only matches that application.
5. **`scope_restriction_status` values** are `unrestricted` (Broadly scoped), `useraccount` (Useraccount scoped) and `restricted` (Securely scoped), not "Secured scopes only". The plan's "refuse unscoped APIs" rule maps to `restricted`. Not yet confirmed (needs a throwaway test in Phase 4): how `unrestricted` and `useraccount` behave against an API with no scope row.
6. **Scope rows carry the same apply-all flags as policies**, plus `disable_client_restriction`. Seeded example: `AutoGen-snsync_read+Table API` (all versions, methods and resources).
7. **REST_Endpoint ACLs are linked by reference, not by name.** The ACL `name` is free text (`/api/sn_wwna/wwna/`, `Financials core REST Endpoint Security`). Resolve them from `sys_ws_definition.enforce_acl` and `sys_ws_operation.enforce_acl`. The type's name and sys_id are both `REST_Endpoint`; query with `type.name=REST_Endpoint`. Sampled ACLs: operation `execute`, `decision_type = allow`, `admin_overrides = true`.
8. **`sys_ws_operation.requires_snc_internal_role`** exists alongside `requires_authentication` and `requires_acl_authorization`. Add it as a further check in Phase 1.
9. **Choice values for `api` and `version` are not in `sys_choice`** (dynamic choices). Match on `api_path`; show `api` only as a label.
10. **Seed data is small** (5 policies, 4 profile mappings, 2 scope rows, 2 scopes, 7 OAuth entity mappings). Phase 4 needs throwaway records for every prioritization level. The two Table API policies ("Table GET/POST API Access Policy") are inactive.

### Read access (the app reads as the signed-in user)

| Table | Read roles found (besides `admin`) |
|---|---|
| `sys_api_access_policy` | `api_service_admin`, `web_service_admin`, `miac_admin` |
| `sys_auth_profile_mapping`, `inbound_auth_profile`, `std_http_auth` | `api_service_admin`, `web_service_admin` |
| `sys_api_access_scope` | `api_service_admin`, `web_service_admin` |
| `sys_auth_scope` | `api_service_admin`, `web_service_admin`, `oauth_admin` |
| `oauth_entity_auth_scope_mapping` | `oauth_admin` |
| `sys_ws_definition`, `sys_ws_operation`, `sys_ws_version` | `web_service_admin` |
| `oauth_entity` | Table, field (`.name`, `.type`, `.active`, `.*`) and related `oauth_entity_scope` / `oauth_entity_profile*` read ACLs exist. **Roles not captured; to confirm.** |
| `sys_db_object` (`ws_access`) | Already read by the app |

A role-only ACL Lens user will see little or nothing here. Reads use `GlideRecordSecure`, and the engine must report "not visible to you" rather than "no policy" when ACLs hide the rows. Admins see everything. `http_key_auth` and `http_body_auth` roles were not checked.

**Cross-scope privileges.** `src/fluent/security/cross-scope.now.ts` covers `sys_db_object`, `sys_dictionary`, `sys_scope`, `sys_security_*`, `sys_user*` and the group and role tables. **None of the Phase 0 tables are covered.** Each needs a read privilege: `sys_api_access_policy`, `sys_auth_profile_mapping`, `inbound_auth_profile`, `std_http_auth`, `http_key_auth`, `http_body_auth`, `sys_api_access_scope`, `sys_auth_scope`, `oauth_entity_auth_scope_mapping`, `oauth_entity`, `sys_ws_definition`, `sys_ws_operation`, `sys_ws_version`.

### Release guards

Queried on the Australia release (`glide-australia-02-11-2026__patch1`); older releases were not available to test. Guard with `isValid()` on each table and `isValidField()` on `sys_ws_operation.requires_snc_internal_role`, `oauth_entity.scope_restriction_status`, `sys_api_access_policy.apply_global` / `api_tablename`, `sys_api_access_scope.disable_client_restriction` and `sys_db_object.ws_access`. When a table or column is missing, the gate result is "not available on this release" (Conditional), never Denied.
