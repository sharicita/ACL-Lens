# 05 — AI Assistant & MCP

Source: `src/server/ai/` · Decision: [ADR-0003](../adr/ADR-0003-ai-provider-agnostic-read-only.md).

## 1. What it does

- Helps users **troubleshoot access**, **review ACLs** and **design ACLs and security** for platform and custom applications.
- Follows ServiceNow and industry best practice:
  - least privilege;
  - roles over scripts;
  - never edit out-of-box ACLs;
  - test with impersonation in sub-production;
  - capture changes in update sets or the owning application;
  - elevate `security_admin` only when needed;
  - always have a rollback.
- Recommended changes always come with steps, a test plan (positive and negative cases), precautions and rollback.

## 2. Providers

| Type | Configuration (ACL Lens → AI Providers) | Call |
|---|---|---|
| `now_assist` (seeded record "Now Assist") | **Now Assist skill / capability** (reference to `sys_one_extend_capability`), **Skill input name** (default `prompt`) | `sn_one_extend.OneExtendUtil.execute({ executionRequests: [{ payload: { <input>: prompt }, capabilityId }] })` |
| `anthropic` | API key; endpoint: blank, the API base `https://api.anthropic.com`, `…/v1` or the full `…/v1/messages` (all normalized); model (default `claude-opus-5-5`) | Messages API, `anthropic-version: 2023-06-01`, effort `medium`, prompt caching. Server-side refusal fallback (`fallbacks: "default"`) for current models |
| `openai_compatible` | Base URL ending in `/v1`, API key, model | `POST {base}/chat/completions` |
| `azure_openai` | Full chat/completions URL including `api-version`, API key | `api-key` header |

**Selection order:** Now Assist when available → the provider marked *Default* → lowest *Order*.

**Connection safeguards** (`provider-safety.ts`, checked when the provider's status is computed and again immediately before each request):
- **HTTPS only.**
- **Endpoint must match the Type.** Anthropic → `*.anthropic.com`; Azure OpenAI → `*.azure.com` / `*.azure-api.net`. A key is **never** sent to another vendor's well-known API host (e.g. an Anthropic provider pointing at `api.openai.com` is blocked, even with *Allow custom endpoint*). OpenAI-compatible is generic, so any HTTPS host is allowed.
- **Allow custom endpoint** (off by default) lets an admin use an approved internal AI gateway or proxy for Anthropic/Azure.
- **Key masking:** provider error text is scrubbed before anyone sees it: the full key, a partial echo starting with its first 8 characters, its last 4 characters, `sk-…` style fragments, masked `****` runs and `Bearer`/`api-key` values.

**Type safety:** *Type* is a dropdown. A stored label (e.g. typed text) is mapped to its type. Any **unrecognized type makes the provider unavailable**; the connector never falls back to another API format, because that would send the API key to the wrong service.

A UI policy shows only the fields that apply to the selected type. The **Test connection** button saves the form, sends a short prompt, and shows the reply time or the exact error.

### Connecting Now Assist (PDI findings, 2026-10-08)

The PDI has Now Assist Core and AI Admin Hub. Its only skill configs are *Form Autocomplete* and an inactive *Now Assist Context Menu*, and there is no generic prompt capability. **Now Assist Skill Kit is not installed.** Using Now Assist to build applications doesn't give custom apps a skill they can call.

To connect it:
1. Install **Now Assist Skill Kit** (System Definition → Plugins), if your entitlement includes it.
2. Create a skill with one string input `prompt`, whose prompt body is that input. Choose a provider (e.g. Now LLM Service), test it, and publish.
3. On the Now Assist provider record, select the skill and keep *Skill input name* = `prompt`.
4. Click **Test connection**.

Without a callable skill, use an external provider marked *Default*.

## 3. Agent loop (`agent.ts`)

- **System prompt** = operating rules + tool catalog + response protocol. It is identical on every request, so providers can cache it.
- **Screen context:** the run number and sys_id, the subjects and the selected table are prefixed to the user's message.
- **Response protocol:** the model returns one JSON object, either `{"action":"tool",…}` or `{"action":"answer","content":"markdown"}`. The parser tolerates fenced or chatty replies; anything unparseable becomes the answer.
- **Limits:** at most 6 tool calls per turn; tool output truncated at 8,000 characters; the last 12 messages of history are resent.
- **History** is resent as plain text. No provider thinking or reasoning blocks are replayed, so the Anthropic history-editing check never applies.

## 4. Read-only tools (`tools.ts`)

All lookups use `GlideRecordSecure` as the signed-in user. A table the user can't read returns `{"error":"no_access"}`, and the assistant tells the user instead of guessing.

| Tool | Purpose |
|---|---|
| `best_practices` | Built-in guidance: evaluation, troubleshooting, design, testing, scripted, scoped_apps |
| `check_my_access` | **Live platform** check of the user's own C/R/W/D on a table or record (`canRead/canCreate/…`) |
| `find_subject` | Find users/roles the user can see |
| `get_roles` | A user's roles with how they were granted, or a role's contained roles |
| `search_acls` / `get_acl` | ACL definitions the user can read (most non-admins can't) |
| `describe_table` | Hierarchy, scope and columns |
| `evaluate_access` | ACL Lens engine for one subject/table/field. **Outcomes and general reasons only**, unless the user can read `sys_security_acl`; then it also returns ACL names, matched levels and required roles. The table hierarchy is included only if the user can read `sys_db_object`. The subject must be visible to the user |
| `search_records` | Up to 10 records the user can read, with links |
| `get_lens_run` | Summary and sample differences of a saved run |

## 5. MCP server (`mcp.ts`)

- **Endpoint:** `POST /api/x_acllens/lens/mcp`. Stateless JSON-RPC 2.0, protocol `2025-06-18`. It writes the raw JSON-RPC body (bypassing the platform's `{result}` wrapper). Notifications return 202.
- **Methods:** `initialize` (its instructions are the system prompt), `ping`, `tools/list` (with `readOnlyHint` annotations), `tools/call`, `resources/list|read` (`acl-lens://guidance/<topic>`), `prompts/list|get` (`troubleshoot_access`, `design_acls`, `review_acl`).
- **Auth:** normal ServiceNow authentication (basic or OAuth bearer). The caller needs `x_acllens.user`, and every tool runs as that caller.
- **Off by default:** property `x_acllens.mcp.enabled` (admin-only). When off, the endpoint answers 403 / JSON-RPC `-32003` before doing anything else.
- **Admin page:** *ACL Lens → Configuration → MCP Server*. It has the on/off switch, the endpoint, connection steps for Claude Code, VS Code and curl, a self-test (`tools/list` as the admin) and the tool, prompt and guidance lists (`GET /admin/mcp`, admin only).
- **Not used by the in-app assistant**, which calls the same tools directly. MCP is only for outside AI tools.

## 6. Storage

Conversations (`_ai_conversation`) and messages (`_ai_message`) are stored per user. The panel's **History** button reopens them. The UI shows which tools were used for each answer.

## 7. Verification status

| Item | Status |
|---|---|
| MCP initialize / notifications / tools/list / tools/call | Verified on the PDI (role-only user; access mirroring confirmed) |
| Tools enforce the user's access | Verified (`search_acls` → `no_access`; `check_my_access` returns the user's real CRUD) |
| Agent loop (parsing, tool feedback, context, history, step cap, ownership) | Offline tests (`tests/offline/agent.test.js`) |
| A live answer from a language model | **Verified on PDI** (2026-10-08, Anthropic `claude-opus-5-5`, role-only user). 4 questions: own access (`check_my_access`), ACL listing correctly refused (`no_access`), Conditional explanation (`evaluate_access`), request to deactivate an ACL refused with safe-change guidance and no invented link |
| `evaluate_access` hides ACL detail from users who can't read ACLs (decision A) | **Verified on PDI**: role-only user gets outcomes and reasons only; the assistant explains Beth's Conditional write without naming roles and says why |
| Endpoint check and key masking | Offline tests (`tests/offline/safety.test.js`, including the api.openai.com case); live provider still passes |
| Now Assist call shape | **Not verified** — no callable skill on the PDI; response parsing is tolerant |
