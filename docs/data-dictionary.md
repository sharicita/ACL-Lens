# Data Dictionary

All tables are in scope `x_acllens`. Access rules are in [04 §3](architecture/04-security-architecture.md#3-record-acls-installed).

## Tables

### `x_acllens_run` — ACL Lens Run (history)

One record per analysis or comparison. Display field: `number` (`ALR` + 7 digits, from 1000).

| Column | Type | Notes |
|---|---|---|
| `number` | string(40), read-only | Auto-numbered |
| `name` | string(200) | Optional label entered by the user |
| `run_type` | string choice | `analyze` · `compare` |
| `status` | string choice | `running` · `complete` · `error` |
| `subject_summary` | string(1000) | "A vs B" (compare) or "A, B" (analyze) |
| `subjects` | string(4000) | JSON `[{type, id, label}]` — labels stored so renamed users/roles still read correctly |
| `filter` | string(4000) | JSON `{mode, value, includeFields, excludeSystem, maxTables}` |
| `summary` | string(8000) | JSON: totals, warnings, per-subject counts, comparison summary, drift total and notes |
| `original_run` | reference → run | *Rerun of* (cascade: clear) |
| `run_by` | reference → `sys_user` | |
| `table_count`, `diff_count`, `duration_ms` | integer | |
| `error_message` | string(4000) | When `status=error` |
| `archived` | boolean | Hidden from History unless *Show archived* |

Attachments: `acl-lens-comparison.csv` on comparison runs.

### `x_acllens_run_data` — ACL Lens Run Data

Large payloads split into ordered chunks of 60,000 characters ([ADR-0002](adr/ADR-0002-run-history-storage.md)).

| Column | Type | Notes |
|---|---|---|
| `run` | reference → run, mandatory | Cascade: delete |
| `kind` | string choice | `results` · `comparison` · `drift` |
| `seq` | integer | Chunk order |
| `payload` | string(65000) | JSON fragment |

Index: `run_kind_seq` (`run`, `kind`, `seq`).

**Payload shapes** (TypeScript in `src/server/engine/types.ts`, `compare.ts`):
- `results` — `AnalysisResult`:
  - `defaultDeny`, `filter`, `tableCount`, `truncated`, `warnings`, `timings`;
  - `acls[]` (only the ACLs referenced by the run);
  - `ops[]`: the table operations evaluated: `create`, `read`, `write`, `delete`, `list_edit`, `query_match`, `query_range`, `add_to_list`, `save_as_template`, `report_on`, `personalize_choices`, `report_view`. Missing on older runs, which hold the first four only;
  - `dataFilters[]` (security data filters referenced by the run) → `{id, table, mode: if|unless, filter, securityAttribute, description}`;
  - `subjects[]` → `{subject (type user|role|group), counts (first four operations), tables[] → {t, l, ops{<operation>: Cell}, fields[] → {f, ops}, sdf?[] → {i: dataFilterIndex, r: A (applied) | N (not applied) | C (depends)}}}`.
  - `Cell` = `{s: G|C|D|N, lvl, dlvl?, a[] → {i: aclIndex, r: P|C|F, c: reason}}`.
- `comparison` — `{subjects, defaultDeny, summary, roles[], pairs[], diffs[]}`.
- `drift` — `{total, truncated, notes[], rows[]}`.

### `x_acllens_report` — ACL Lens Report

Report definitions for the reporting dashboard. No access data is stored: results are calculated from saved runs when the dashboard asks.

| Column | Type | Notes |
|---|---|---|
| `name` | string(100), mandatory | |
| `description` | string(1000) | |
| `category` | string choice | `overview` · `high_risk` · `vulnerability` · `comparison` |
| `measure` | string(40), mandatory | `access` · `differences` · `privileged` · `high_risk_tables` · `machine_changes` · `inactive_access` · `open_acls` · `no_rule_allowed` · `scripted` · `data_filters` · `unshared_roles` · `access_gained` (`src/server/engine/report-measures.ts`) |
| `chart` | string choice | `tile` (number) · `bar` · `donut` · `list` |
| `options` | string(4000) | JSON: `ops`, `statuses`, `kinds`, `tables`, `tableText`, `roles`, `groupBy`, `limit` |
| `owner` | reference → `sys_user` | Empty on shipped reports |
| `shared` | boolean | Shown to all ACL Lens users (set by ACL Lens admins) |
| `system` | boolean, read-only | Shipped with the app; never edited (Customize makes a copy) |
| `on_default` | boolean | Part of the default dashboard |
| `copied_from` | reference → report, cascade clear | |
| `order` | integer | Default dashboard order |

ACLs: read shipped, shared and your own reports; create, write and delete your own (ACL Lens admins: any non-shipped report, and sharing).

### `x_acllens_dashboard` — ACL Lens Dashboard

One per user who changed their dashboard (without one, the default applies).

| Column | Type | Notes |
|---|---|---|
| `owner` | reference → `sys_user`, mandatory | |
| `layout` | string(4000) | JSON `[{report, size: 1\|2}]` |
| `run` | reference → run, cascade clear | Run the reports use; empty = latest complete, non-archived run |

ACLs: each user reads and changes only their own.

### `x_acllens_ai_provider` — ACL Lens AI Provider

| Column | Type | Notes |
|---|---|---|
| `name` | string(100), mandatory | |
| `type` | string choice (dropdown) | `now_assist` · `anthropic` · `openai_compatible` · `azure_openai` |
| `active`, `is_default` | boolean | Now Assist is preferred whenever it's available |
| `order` | integer | Tie-breaker |
| `endpoint` | string(1000) | Not used by Now Assist |
| `model` | string(200) | Default for Anthropic: `claude-opus-5-5` |
| `allow_custom_endpoint` | boolean | Default off. Allows an approved gateway host for Anthropic/Azure; never allows another vendor's API host |
| `api_key` | password2 | Encrypted; never returned by APIs |
| `capability` | reference → `sys_one_extend_capability` | Now Assist skill to call |
| `skill_input` | string(100) | Default `prompt` |
| `capability_id` | string(32), hidden | Legacy; read if `capability` is empty |
| `max_tokens`, `timeout_seconds` | integer | 16000 / 120 |
| `notes` | string(1000) | |

Seed record (first install only): **Now Assist** (`type=now_assist`, order 10).

### `x_acllens_ai_conversation` / `x_acllens_ai_message`

| Table | Columns |
|---|---|
| conversation | `title`, `user` (→ `sys_user`, mandatory), `provider` (→ provider), `run` (→ run, cascade clear), `message_count` |
| message | `conversation` (→ conversation, cascade delete), `seq`, `role` (`user` · `assistant`), `content` (65000), `tools_used` (4000), `provider_name` |

## System properties

| Property | Type | Default | Read / write roles |
|---|---|---|---|
| `x_acllens.history.enabled` | boolean | `true` | admin / admin |
| `x_acllens.history.retention.enabled` | boolean | `false` | admin / admin |
| `x_acllens.history.retention.days` | integer | `90` | admin / admin |
| `x_acllens.history.retention.action` | choicelist `delete,archive` | `delete` | admin / admin |
| `x_acllens.ui.instance_theme` | boolean | `false` | admin / admin |
| `x_acllens.mcp.enabled` | boolean | `false` | admin / admin |

"admin" here means `x_acllens.admin` (the platform `admin` role passes every role check). The app's server code still reads these values for every user.

## Other installed metadata

| Type | Name / key | Purpose |
|---|---|---|
| Roles | `x_acllens.user`, `x_acllens.admin` | [04 §2](architecture/04-security-architecture.md#2-roles) |
| UI page | `x_acllens_lens.do` | React SPA (`direct: true`) |
| Scripted REST API | `ACL Lens` (`serviceId: lens`) | [API reference](api-reference.md) |
| Scheduled job | `ACL Lens - history retention` (daily 02:30) | No-op unless retention is on |
| UI policy | "Show only the fields used by the selected provider type" | Provider form |
| UI action | `Test connection` (provider form, admin) | Saves and tests the provider |
| Application menu | `ACL Lens`: Access Workspace, Run History, Run Records, and a **Configuration** separator (admins only) with Properties, MCP Server and AI Providers | [01 §5](architecture/01-overview-and-scope.md#5-navigator) |
| Cross-scope privileges | 13 read + 1 execute | [04 §4](architecture/04-security-architecture.md#4-cross-scope-privileges-all-allowed) |
| Server modules | every file in `src/server` | `sys_module` records |
