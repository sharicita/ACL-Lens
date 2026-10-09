# ACL Lens

**Analyze and compare detailed access permissions across users, roles, tables, records, and fields.**

ACL Lens is a ServiceNow scoped application (Fluent / ServiceNow SDK). It shows what a user or role can create, read, write and delete, table by table and field by field, and which ACLs decided each result. You can:

- **Compare** up to 8 users and roles side by side, including their roles: shared, direct, group and inherited.
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
