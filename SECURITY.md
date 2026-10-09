# Security policy

ACL Lens reads security configuration (ACLs, roles, users) on ServiceNow instances, so security reports are welcome and taken seriously.

## Reporting a vulnerability

Please **don't open a public issue** for security problems. Use GitHub's private reporting instead: **Security → Report a vulnerability** on this repository.

Include what you found, how to reproduce it, and the impact you expect. You'll get an acknowledgement as soon as possible.

## Scope and design

- The app only **reads** platform security data; it never changes ACLs, roles or users.
- Users see results through their own permissions; the AI assistant and its MCP tools run with the signed-in user's access (`GlideRecordSecure`).
- AI provider API keys are stored encrypted on the instance and never leave it except to the configured provider endpoint.

Details: [docs/architecture/04-security-architecture.md](docs/architecture/04-security-architecture.md).

## Never commit secrets

Instance URLs, logins, company codes and keys belong in the git-ignored `acl-lens.local.json` or the operating system's credential store, never in this repository. See [docs/install-and-deploy.md §9](docs/install-and-deploy.md#9-keeping-the-repository-publishable).
