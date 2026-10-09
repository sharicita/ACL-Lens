# ADR-0003: Provider-Agnostic, Read-Only AI Assistant with an MCP Server

| | |
|---|---|
| **Status** | Accepted 2026-10-08 |
| **Relates to** | [05](../architecture/05-ai-assistant-and-mcp.md), [04](../architecture/04-security-architecture.md) |

## Context
The assistant must help troubleshoot and design ACLs, prefer Now Assist, allow an admin-specified provider, never modify the system, and never reveal more than the signed-in user may see. Providers differ in tool-calling support (Now Assist skills take a prompt; external APIs differ in format).

## Decision
1. **Provider abstraction.**
   - Types: `now_assist` (via `OneExtendUtil` and an admin-selected skill), `anthropic`, `openai_compatible`, `azure_openai`.
   - Order: Now Assist when available → *Default* → *Order*.
   - Keys are stored encrypted, and providers are admin-only.
2. **Uniform JSON action protocol** instead of vendor tool-calling, so every provider, including a single-prompt Now Assist skill, drives the same loop. At most 6 tool calls per turn.
3. **Read-only tools running as the user** (`GlideRecordSecure`). The only exception is `evaluate_access`, which reuses the app's engine under the same access model as the matrix ([ADR-0001](ADR-0001-static-acl-evaluation.md)). The only writes are the user's own conversation records.
4. **Same tools over MCP** (`/mcp`, stateless JSON-RPC) with guidance resources and prompts, for external AI clients authenticated as a ServiceNow user.
5. **Guard rails:** a fixed system prompt (read-only, cite only tool data, best practices, test and rollback); links only from tool results and only to this instance; no raw HTML rendering.

## Amendment (2026-10-08)
- `evaluate_access` no longer exposes ACL names, matched levels or required roles to users who cannot read `sys_security_acl`. They get outcomes and general reasons only, which matches the rule that the assistant only offers what the user can access (it previously followed the matrix's access model).
- Provider calls are guarded: Type dropdown with unknown types refused; HTTPS; endpoint host must match the Type, and another vendor's host is always blocked; custom gateways only by explicit opt-in; provider errors scrubbed of key fragments.

## Consequences
- Works with or without Now Assist. Behaviour is the same across providers.
- Text-protocol tool calls are slightly less robust than native tool use. Mitigated by a tolerant parser and offline tests.
- Security metadata may be sent to an external provider when one is configured. This is an admin decision, documented in 04 §6.
