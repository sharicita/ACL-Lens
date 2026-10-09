# 01 — Overview & Scope

## 1. Problem

The platform's Access Analyzer answers one question at a time and doesn't show the whole picture. Administrators need to see quickly:
- which tables a user or role can create, read, write and delete;
- which field rules change that;
- **why**, meaning which ACL matched and what made it pass or fail;
- how two or more users or roles differ, in a form that can be shared and kept as evidence.

## 2. Users and roles

| Persona | Role | Can |
|---|---|---|
| Security / platform analyst | `x_acllens.user` | Analyze and compare users and roles, view and rerun history, export, use the Security Assistant |
| ACL Lens administrator | `x_acllens.admin` (contains `.user`) | Everything above, plus Settings (history, clearing, retention), archive/restore runs, AI provider configuration, Run Records list |
| System administrator | `admin` | Passes all role checks (platform behaviour) |

> `x_acllens.user` is a **sensitive role**: holders can see the access, ACL rules and role assignments of any user or role, because that is the purpose of the tool. Grant it only to people who audit security ([04 §2](04-security-architecture.md)).

## 3. Features

| Area | Feature |
|---|---|
| Workspace | Pick up to 8 users and/or roles; choose the tables (secured by these roles · list · name prefix · application scope with typeahead · all); include field rules; exclude system tables; max tables |
| Matrix | Tables × subjects × C/R/W/D; baseline subject with purple "differs" outlines; differences only; hide tables nobody can access; operation focus; hide subject columns; expandable field rules |
| Table details | For every subject and operation: the matched ACL level, every evaluated ACL (allow-if / deny-unless, roles, condition/script flags, pass/fail reason, link). Live **all-fields** evaluation with CSV export |
| Comparison script | Server-side diff: totals, identical vs different tables, exclusive access, head-to-head counts, role matrix, every record and field difference; CSV export (also attached to the run) |
| History | Every run saved with number, lineage (*Rerun of* / *Reruns*), drift report on reruns, archive/restore (admin) |
| Settings (admin) | History on/off; clear history now (all / range / older than N days); daily retention (off by default, 90 days, delete or archive) |
| Security Assistant | Chat panel with screen context; read-only tools; Now Assist or an external provider; saved conversations |
| MCP server | The assistant's tools, guidance resources and prompts over JSON-RPC for external AI clients |
| Usability | Contextual dismissible tips, standard tooltips on every control, light theme on Horizon tokens, slide animations, print/PDF |

## 4. Product boundary

**In scope**
- Record-type ACLs (`type=record`) for create, read, write and delete, at table and field level.
- Effective roles: direct, group-granted, inherited and contained roles; elevated-privilege roles; implicit `public`.
- Deny-unless and allow-if ACLs, admin overrides, security attributes (known ones resolved statically).

**Out of scope (by design)**
- **Changing anything** in the instance's security configuration. The app and the assistant are read-only; the only writes are the app's own runs, settings and conversations.
- Evaluating conditions or scripts against specific records. These are reported as *Conditional* ([ADR-0001](../adr/ADR-0001-static-acl-evaluation.md)). For the signed-in user's own live access, the assistant's `check_my_access` tool asks the platform directly.
- Query business rules, data filters, domain separation, client scripts/UI policies, and non-record ACL types (REST, UI page, client-callable…). These are listed in [03 §7](03-access-evaluation-engine.md#7-known-limits) so results are read correctly.

## 5. Navigator

**ACL Lens** → Access Workspace · Run History · Run Records (admin) · AI Providers (admin) · Properties (admin).
Page: `/x_acllens_lens.do` (`?view=workspace|history|run&id=…|settings`).
