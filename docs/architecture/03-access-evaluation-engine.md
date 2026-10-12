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
