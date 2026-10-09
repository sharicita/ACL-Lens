# Install and Deployment Reference

The step-by-step guide for end users is **[INSTALL.md](../INSTALL.md)** at the project root. This page explains how installation works, covers every scenario, and lists the rules for keeping the repository safe to publish.

## 1. Scenarios at a glance

| Scenario | Recommended route | Commands / screens |
|---|---|---|
| First install from GitHub, any skill level | Guided setup | `npm run setup` |
| First install, no local tools | ServiceNow IDE Git clone of a scoped branch | GitHub Action *Prepare a branch with my scope*, then IDE: clone, build, install |
| Classic admin hand-off | Update set XML | `npm run package`, then *Retrieved Update Sets → Import Update Set from XML* |
| Update an existing install | Same profile | `npm run deploy` |
| Several instances (PDI, dev, test) | One profile per instance | `npm run deploy -- --profile <name>` |
| Move between your own instances, no source | Publish to update set | App record → *Publish to Update Set* → export XML → import |
| Company dev → test → prod pipeline | Application repository or CI/CD | *Publish to application repository*; or `now-sdk` in CI with stored credentials |
| Undo an install | Rollback context | Link printed by every install |

## 2. How the scope works

Every custom ServiceNow app has a **scope**, such as `x_12345_acllens`. It prefixes the app's tables (`x_12345_acllens_run`), roles (`x_12345_acllens.user`), properties, REST path and UI page. Normally the scope starts with the instance's company code (system property `glide.appcreator.company.code`). The SDK warns when it doesn't.

To keep the repository free of any one company's code:

- **The committed source uses the placeholder `x_acllens` everywhere**, with a neutral `scopeId`.
- **An install profile** supplies the real values. Profiles live in `acl-lens.local.json` (git-ignored):

  ```json
  {
      "default": "pdi",
      "profiles": {
          "pdi": {
              "instance": "https://dev12345.service-now.com",
              "alias": "pdi",
              "scope": "x_12345_acllens",
              "scopeId": "<sys_id of the sys_app record>"
          }
      }
  }
  ```

  | Field | Meaning |
  |---|---|
  | `alias` | The SDK login (`now-sdk auth`) used to install. The credentials themselves stay in the OS credential store. |
  | `scope` | The app scope on that instance, at most 18 characters. |
  | `scopeId` | The `sys_app` sys_id. **Reuse the installed app's sys_id to update it in place.** A new random ID creates a separate app. |

- **`npm run deploy`** copies the project into `.deploy/<profile>/` (git-ignored) and replaces `x_acllens` with the profile's scope in the copy. It then runs `now-sdk build` and `now-sdk install --auth <alias>` there.
- New record keys the SDK adds to the copy's `keys.ts` are copied back to `src/fluent/generated/keys.ts`, with the placeholder restored. Commit that file.
- **`tools/scope.mjs <scope>`** rewrites a checkout in place. Use it only for a branch or fork that the ServiceNow IDE builds directly. The *Prepare a branch with my scope* GitHub Action runs it. Never commit the result to `main`.

> **In these docs**, `x_acllens` means *your* scope. On an instance where the scope is `x_12345_acllens`, the role `x_acllens.user` is `x_12345_acllens.user`.

## 3. Commands

| Command | What it does |
|---|---|
| `npm run setup` | Guided setup page (see §4) |
| `npm run deploy` | Build and install the default profile |
| `npm run deploy -- --profile test` | Same, for a named profile |
| `npm run deploy:build` | Profile build only (checks it compiles) |
| `npm run package` | Profile build plus `now-sdk pack`. The installable ZIP goes to `.deploy/<profile>/target/` |
| `npm run profile -- list` | Show profiles (`*` marks the default) |
| `npm run profile -- add <name> --alias <login> --scope <scope> [--scope-id <id>] [--instance <url>] [--default]` | Add or replace a profile |
| `npm run profile -- default <name>` | Change the default profile |
| `npm run build` | Build the neutral source (`x_acllens`) for type checks only; **never install this from the project root on an instance that has a profile install** (it would create a second app) |
| `npm test` | Offline tests |

## 4. The guided setup

`npm run setup` starts `tools/setup/server.mjs`, a small web server that uses only Node's built-in modules. It works before `npm ci` and adds no dependencies.

| Step | What happens |
|---|---|
| 1 Get ready | Checks the Node.js version (20.18+) and whether the SDK is installed. It can run `npm ci`, which uses the exact lockfile versions. |
| 2 Connect | Lists saved SDK logins, or adds one with `now-sdk auth --add … --username … --password-stdin`. |
| 3 Scope | Reads `glide.appcreator.company.code` and the existing ACL Lens apps (`now-sdk query`). Offers *Update the existing install* (reusing its sys_id) or a new scope, checks the name is free, and saves the profile. |
| 4 Install | Runs the profile build and install, shows progress, and puts the full output under *Show technical details*. |
| 5 Next steps | Links to the app, the role list and AI providers, and the docs. |

**Security design**

- Listens on `127.0.0.1` only, on a random port.
- Every API call needs a random one-time key. The key is passed in the address fragment (`#…`), which browsers never send over the network, and is then kept in session storage.
- The `Host` header must be `127.0.0.1:<port>` or `localhost:<port>`, which blocks DNS rebinding. A strict Content Security Policy is applied, with no third-party scripts.
- Passwords go from the form straight to the SDK's stdin. The SDK stores them in the operating system's credential store. The setup never writes or logs them and masks them in error messages.
- Only one job runs at a time. The server stops when you select *Close the setup*, or after an hour without activity.

## 5. ServiceNow IDE route

The ServiceNow IDE recognizes a Fluent app by `now.config.json` at the repository root, clones it from Git, and builds and installs it on the instance.

- [Connect a Git provider (basic auth)](https://www.servicenow.com/docs/r/application-development/servicenow-ide-family-release/connect-git-provider-basic-auth.html)
- [Clone a Git repository](https://www.servicenow.com/docs/r/9Lur8HBNLjdzEcjznSAFzA/zPOBplNM6ma_Hk0Xu2u9Ag)
- [Build and install an application](https://www.servicenow.com/docs/r/guL1zqmJkV9eywMq_6qu~w/C3HitdE1nAOhpGuuqNmd1Q)

Clone the `scope/<your scope>` branch created by the GitHub Action, or `main` to install as `x_acllens`. Make changes in the repository, not in the instance editor, because `packageSourceCodeOnInstance` is `false`.

## 6. Update sets and packages

- `npm run package` produces the SDK's installable ZIP for your profile's scope: update set XML plus `package_inventory.csv`.
- **Public release (maintainers):** build the neutral source and pack it at the root (`npx now-sdk build && npx now-sdk pack`). Attach the ZIP to a GitHub release named for `package.json`'s `version`. This package installs as `x_acllens`.
- Import: *System Update Sets → Retrieved Update Sets → Import Update Set from XML*, then *Preview* and *Commit*. [ServiceNow: system update sets](https://www.servicenow.com/docs/r/application-development/system-update-sets/system-update-sets.html)

## 7. What carries over between instances

| Part of the app | Moves? |
|---|---|
| Tables, roles, ACLs, UI page, REST API, menu, properties (defaults), UI actions | Yes |
| Role assignments | No: assign `x_acllens.user` / `.admin` again |
| Run history (`x_acllens_run`, `_run_data`) | No: it is data, not app metadata |
| AI providers and API keys | No: keys are encrypted per instance and never exported |
| Changed property values | No: they return to the defaults |

## 8. Generative AI on personal developer instances

Now Assist, the Now Assist Skill Kit and other ServiceNow generative AI capabilities are **not available on Personal Developer Instances**. ServiceNow staff confirm this in the Community. On a PDI the assistant shows *No AI provider is available* until you add an external provider (Anthropic Claude, an OpenAI-compatible API, or Azure OpenAI; see [05](architecture/05-ai-assistant-and-mcp.md)). On a licensed instance, an admin must first activate Now Assist and the generic LLM capability.

## 9. Keeping the repository publishable

The repository is designed to be safe to make public:

| Never commit | Where it lives instead |
|---|---|
| Instance URLs, logins, company code, real scope, app sys_id | `acl-lens.local.json` (git-ignored) |
| Passwords, OAuth tokens | OS credential store, managed by `now-sdk auth` |
| AI provider API keys | Encrypted field on the instance (`x_acllens_ai_provider.api_key`) |
| Per-profile build copies | `.deploy/` (git-ignored) |

Before publishing, search the tracked files for your own identifiers:

```bash
git grep -n -i -e "<your company code>" -e "<your instance name>" -e "<your email>"
```

**Git history:** these rules protect new commits only. Commits made before the switch to the placeholder scope still contain the original instance name and scope. To publish a repository whose history is clean, either start a fresh repository from the current files (`git init`, one commit) or rewrite history with a tool such as `git filter-repo`. Rewriting history needs a force push and affects everyone with a clone.
