# API Reference

Base path: `/api/x_acllens/lens` (`x_acllens` = your app scope).

- **Authentication:** ServiceNow session (the UI sends `X-UserToken: g_ck`), basic, or OAuth.
- **Authorization:** every route requires `x_acllens.user`; routes marked **admin** require `x_acllens.admin` (403 otherwise).
- **Responses:** the platform wraps bodies as `{ "result": <body> }`. Errors are `{ "result": { "error": { "message" } } }` with 400 / 403 / 404. **Exception:** `/mcp` returns raw JSON-RPC.

## Analysis and history

| Method | Path | Body / query | Returns |
|---|---|---|---|
| GET | `/subjects` | `type=user\|role`, `q`, `limit` | `[{id, label, sub}]`, ranked (prefix matches first). Users match user name, name, first/last name and email; roles match name and description |
| GET | `/scopes` | `q` | Up to 10 `{scope, name}` the caller can read (`GlideRecordSecure`). Ranked: scope starts with `q` → name starts with `q` → contains. Empty `q`: custom (`x_`) apps first |
| POST | `/runs` | `{name?, run_type: analyze\|compare, subjects: [{type, id}], filter}` | `{run, results, comparison, drift}`. With history off, `run.unsaved=true` and nothing is stored |
| GET | `/runs` | `q`, `type`, `original`, `limit` (≤200), `archived=true` | Run records (newest first) with `rerun_count` |
| GET | `/runs/{id}` | — | `{run, results, comparison, drift}` |
| POST | `/runs/{id}/rerun` | — | New run whose `original_run` = `{id}`, including drift |
| POST | `/runs/{id}/archive` **admin** | `{archived: boolean}` | `{sys_id, archived}` |
| DELETE | `/runs/{id}` **admin** | — | `{deleted: 1, number}`. Removes the run, its `_run_data` rows and attachments |
| GET | `/fields` | `table`, `subjects=user:<id>,role:<id>` | Live evaluation of every column of `table` |
| GET | `/tables` | `q` | `{results: [{name, label, scope}], prefixCount}`: tables the caller can read in `sys_db_object` (`GlideRecordSecure`), ranked by name then label; `prefixCount` = tables whose name starts with `q` |
| GET | `/acl/{id}` | — | `{name, operation, decision, description, roles, condition, condition_query, applies_to, security_attribute, has_script, script, script_hidden, admin_overrides}`. `script` is returned only when the caller can read `sys_security_acl`; otherwise `script_hidden=true` |
| GET | `/me` | — | `{user, is_admin, history_enabled, instance_theme}` |
| GET | `/admin/mcp` **admin** | — | MCP setup information (see the MCP section) |

`filter`:
- `mode`: `secured_by_roles` · `tables` · `prefix` · `scope` · `all`
- `value`: comma-separated tables or prefixes, or a scope
- `includeFields` (default true), `excludeSystem`, `maxTables` (default 1,500; max 5,000)

## Settings (admin)

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/admin/settings` | — | `{history_enabled, retention_enabled, retention_days, retention_action}` |
| PUT | `/admin/settings` | Any subset of the above (`retention_days` 1–3650) | Saved settings |
| POST | `/admin/history/preview` | `{mode: all\|range\|older_than, from?, to? (YYYY-MM-DD, admin time zone), days?, include_archived?}` | `{count}` |
| POST | `/admin/history/clear` | Same | `{deleted}` (runs, result chunks and CSV attachments) |

## Assistant

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/ai/status` | — | `{active: {name, type, model} \| null, providers: [{name, type, available, reason}], is_admin}` |
| POST | `/ai/chat` | `{conversation_id?, message, context?: {run_id, run_number, subjects, table}}` | `{conversation_id, title, answer, tools_used, provider}` |
| GET | `/ai/conversations` | — | The caller's conversations |
| GET | `/ai/conversations/{id}` | — | Messages (caller's own only) |

## MCP — `POST /mcp`

Stateless JSON-RPC 2.0 (MCP `2025-06-18`). Single requests or batches; notifications return 202.

**Off by default.** While the property `x_acllens.mcp.enabled` is false, every request gets HTTP 403 with JSON-RPC error `-32003`. Admins turn it on under *ACL Lens → Configuration → MCP Server*. Setup information for that page comes from `GET /admin/mcp` (**admin**): `{enabled, endpoint, protocol_version, transport, required_role, tools, prompts, resources}`.

| Method | Notes |
|---|---|
| `initialize` | `serverInfo.name = acl-lens`; capabilities: tools, prompts, resources; `instructions` = operating rules |
| `ping` | |
| `tools/list`, `tools/call` | 10 read-only tools ([05 §4](architecture/05-ai-assistant-and-mcp.md#4-read-only-tools-toolsts)). Results come as text content; `isError` when the tool reports an error such as `no_access` |
| `resources/list`, `resources/read` | `acl-lens://guidance/{evaluation\|troubleshooting\|design\|testing\|scripted\|scoped_apps}` |
| `prompts/list`, `prompts/get` | `troubleshoot_access(user, table, operation?, field?)`, `design_acls(table, requirements)`, `review_acl(acl)` |

Example:

```bash
curl -u <user>:<password> -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"check_my_access","arguments":{"table":"incident"}}}' \
  https://<instance>.service-now.com/api/x_acllens/lens/mcp
```
