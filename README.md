# ACL Lens

**Analyze and compare detailed access permissions across users, roles, tables, records, and fields.**

ACL Lens is a ServiceNow scoped application (Fluent / ServiceNow SDK). It shows what a user, role or group can do on each table and field (create, read, write, delete and the other table operations such as list edit, query and reporting), which ACLs and security data filters decided each result, and it can confirm any result live with the platform's own access evaluation. You can:

- **Compare** up to 8 users, roles and groups side by side, including their roles: shared, direct, group and inherited.
- **Check live** (admins): the same evaluation as the platform's Access Analyzer (overall access, security data filters, ACLs, access handlers, data filtration, execution time), next to ACL Lens's prediction.
- **Report** on a dashboard: pre-built high-risk, vulnerability, overview and comparison reports from saved runs, which users can customize and arrange.
- **Explain** conditional results by showing the condition or script behind them.
- **Export** a server-side comparison report (CSV, JSON, PDF).
- **Keep a history** of runs you can reopen and rerun. A rerun saves a new run that references the original and shows what changed.
- **Ask** a read-only AI Security Assistant (also available as an MCP server). It only sees what the signed-in user can see.

## Install

👉 **[INSTALL.md](INSTALL.md)**: step-by-step options for everyone, including a guided setup page:

```bash
npm run setup
```

Already set up? Update the install with `npm run deploy`.

## Documentation

**[docs/README.md](docs/README.md)** covers the overview, architecture, access engine, security, AI assistant and MCP, data dictionary, API reference, user guide, [install and deployment](docs/install-and-deploy.md), developer setup, build log and ADRs.

## Development

```bash
npm ci
npm test              # offline tests
npm run deploy:build  # build with your install profile
```

The source uses the placeholder scope `x_acllens`. Your real scope and instance stay in the git-ignored `acl-lens.local.json`, so this repository can be shared publicly ([how it works](docs/install-and-deploy.md#2-how-the-scope-works)).

## License

[MIT](LICENSE) © 2026 sharicita. Security reports: see [SECURITY.md](SECURITY.md).
