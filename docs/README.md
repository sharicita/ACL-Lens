# ACL Lens — Documentation

| | |
|---|---|
| **Application** | ACL Lens (`x_acllens`, a placeholder for your scope), a ServiceNow scoped application built with Fluent / Now SDK 4.13.6 |
| **Status** | **Working build on a development PDI**. Core analysis, comparison, history and settings were verified on the PDI. The AI assistant's language-model step has only been tested offline (see [06](architecture/06-risks-assumptions-decisions.md)) |
| **Version** | `0.0.1` (package.json) |
| **Date** | 2026-10-09 |
| **Owner** | Project owner (PDI admin) |

ACL Lens shows clearly what a **user or role can create, read, write and delete**, table by table and field by field. It explains **which ACLs decided each result and why**. You can open several users and roles side by side, run a server-side **comparison script** with exportable results, and keep a **history** of runs you can reopen and rerun. A read-only **Security Assistant** (AI) helps troubleshoot and design ACLs while seeing only what the signed-in user can see.

## Documents

| # | Document | Covers |
|---|---|---|
| 01 | [Overview & Scope](architecture/01-overview-and-scope.md) | Purpose, users and roles, features, product boundary (what it does and does not do) |
| 02 | [System Architecture](architecture/02-system-architecture.md) | Components, request flow, project layout, build pipeline, performance |
| 03 | [Access Evaluation Engine](architecture/03-access-evaluation-engine.md) | How access is computed: matching order, statuses, reason codes, comparison, drift, known limits |
| 04 | [Security Architecture](architecture/04-security-architecture.md) | Roles, ACLs, cross-scope privileges, data exposure, secrets, retention, threat model |
| 05 | [AI Assistant & MCP](architecture/05-ai-assistant-and-mcp.md) | Provider abstraction, Now Assist setup, agent loop, read-only tools, MCP server, guard rails |
| 06 | [Risks, Assumptions & Decisions](architecture/06-risks-assumptions-decisions.md) | Decision log, verified vs unverified items, risks, open items |
| — | [Data Dictionary](data-dictionary.md) | Tables, columns, properties, roles and every metadata record the app installs |
| — | [API Reference](api-reference.md) | REST endpoints and MCP methods |
| — | [User Guide](user-guide.md) | How to use the Workspace, matrix, details, comparison, history, assistant and settings |
| — | [Install & Deployment](install-and-deploy.md) | Every install route (guided setup, ServiceNow IDE, update sets, multiple instances), how scopes and profiles work, keeping the repo publishable. End-user steps: [INSTALL.md](../INSTALL.md) |
| — | [Developer Setup](dev-setup.md) | Prerequisites, build/deploy, conventions, tests, troubleshooting |
| — | [New App Build Standards](new-app-build-standards.md) | The reusable baseline for every new ServiceNow app: setup, install, security, navigation, UI/UX, lists, accessibility, docs and process (checklist) |
| — | [Lessons Learned](lessons-learned.md) | What this build taught us, and the UX baseline for future builds |
| — | [Build Log](build-log.md) | What was built in each iteration, issues found on the PDI and how they were fixed |
| — | [ADRs](adr/) | Architecture decision records |

## Architecture decision records

| ADR | Title | Status |
|---|---|---|
| [ADR-0001](adr/ADR-0001-static-acl-evaluation.md) | Static ACL evaluation instead of impersonation | Accepted |
| [ADR-0002](adr/ADR-0002-run-history-storage.md) | Run history storage in chunked JSON rows | Accepted |
| [ADR-0003](adr/ADR-0003-ai-provider-agnostic-read-only.md) | Provider-agnostic, read-only AI assistant with an MCP server | Accepted |
| [ADR-0004](adr/ADR-0004-styles-in-js-bundle.md) | Ship styles inside the cache-busted JS bundle | Accepted |
| [ADR-0005](adr/ADR-0005-history-governance.md) | Admin-controlled history, clearing and retention | Accepted |
| [ADR-0006](adr/ADR-0006-dependency-supply-chain.md) | Dependency and supply-chain policy | Accepted |
| [ADR-0007](adr/ADR-0007-placeholder-scope-and-install-profiles.md) | Placeholder scope and local install profiles | Accepted |

## Summary (one page)

1. **Scoped app, no global changes.** Everything ships in `x_acllens`: tables, roles, ACLs, a scripted REST API, a React UI page, a scheduled job, properties and navigator modules. The app only *reads* platform security data.
2. **Static, explainable evaluation.** The engine reads `sys_security_acl`, its roles, the subject's effective roles and the table hierarchy, then applies the platform's matching order. Results the platform decides per record (conditions, scripts, security attributes, elevation) are reported as **Conditional** rather than guessed ([ADR-0001](adr/ADR-0001-static-acl-evaluation.md)).
3. **Compare and track.** Up to 8 users/roles side by side; a server-side comparison script; every run saved with lineage (*Rerun of*) and a drift report against the original.
4. **Governed history.** Admins can turn history off, clear it (all / date range / older than N days) and enable daily retention (off by default; 90 days; delete or archive).
5. **Read-only AI with the user's own permissions.** Now Assist is preferred when a callable skill exists; otherwise an admin-configured Anthropic, OpenAI-compatible or Azure OpenAI provider is used. Tools use `GlideRecordSecure`, so the assistant can never reveal more than the user could read. The same tools are exposed as an **MCP server**.

## Change log

| Version | Date | Change |
|---|---|---|
| 0.7 | 2026-10-09 | Report list views, sorting everywhere, cleaner cards, tooltips kept on screen, tips with "Don't show again", admin archive/delete on the run page, instance-theme property, lessons learned |
| 0.6 | 2026-10-09 | Publishable source (placeholder scope `x_acllens`, local install profiles), guided setup (`npm run setup`), INSTALL.md, scope GitHub Action; unified ranked search; baseline explained; Roles tab; condition details; record and documentation links; account-type badges; accessibility fixes |
| 0.5 | 2026-10-08 | Supply chain: source upload to the instance turned off (uploaded source package removed); SDK 4.11.2 → 4.13.6; npm overrides for patched build-tool dependencies; ADR-0006 |
| 0.4 | 2026-10-08 | Documentation set created in `docs/` (this folder); offline tests moved into `tests/offline` |
| 0.3 | 2026-10-08 | Properties/Settings (history toggle, clearing, retention), archive/restore, standard tooltips, scope search ranking, longer slide animations, Now Assist skill selection + Test connection |
| 0.2 | 2026-10-08 | Security Assistant (AI) + MCP server, contextual tips, lighter restyle, scope typeahead, slide animations |
| 0.1 | 2026-10-08 | Initial build: analysis engine, matrix, comparison, history/rerun; PDI fixes (module paths, response shape, `public` role, performance) |
