# Lessons Learned

What this build taught us, so the next ServiceNow / Fluent app is faster and better. The reusable rules are compiled into the checklist [new-app-build-standards.md](new-app-build-standards.md). Each entry is **what happened → what to do next time**. Newest additions go at the end of each section; the [build log](build-log.md) has the full history.

---

## 1. Requirements and UX expectations

These came up repeatedly as feedback. Build them in from the start.

| # | Lesson | Do next time |
|---|---|---|
| U-01 | Users asked several times for things a polished app should do by default (tooltips, sorting, clear labels). | Start with the **UX baseline** in §9 as the definition of done for every screen. |
| U-02 | Numbers without context ("0 +59", "identical") confused users. | Every number gets a label that says *what is counted*, plus a tooltip with the exact definition. Never show a figure you can't define in one sentence. |
| U-03 | Cards became crowded with lists ("Shares 0 with…"). | Cards hold the **most important facts in a few words**; details go into tooltips, tabs or table/list views. |
| U-04 | Terms like "baseline" were assumed knowledge. | Explain every app-specific term where it appears (a "?" help popover), including whether a choice persists and for whom. |
| U-05 | "Record" in a filter didn't match anything in the table below. | Filters and the columns they act on use the **same words**. Add a column for whatever the filter filters on. |
| U-06 | Empty sections ("No roles.") added noise. | Hide anything that is empty or not relevant in the current context. |
| U-07 | Summary tiles that only filtered in place were easy to miss. | Summary figures should act like a report: link to a full list (new window), sortable, filterable, exportable. |
| U-08 | Users want to jump to the underlying data. | Link every record mentioned (users, roles, groups, tables, fields, ACLs) with a small "open record" icon in a new window, and link relevant vendor docs with a book icon. |
| U-09 | Filtered views lacked follow-up actions. | When a filter is active, offer **Download filtered list** (green) and a subtle **Clear filter**; hide both when no filter is set. |
| U-10 | Destructive or management actions were only in one place (History). | Put manage actions (archive, restore, delete) where the user is looking at the item, admin-only, with an inline confirmation for permanent deletes. |
| U-11 | A closable tip had only ×, then × reappeared in new windows. | Closable tips get × (closed for the rest of the **login session, in every tab**) **and** a separate "Don't show again" (permanent). Key the session to a hash of the session token, not per-tab storage. |
| U-12 | The selected tab still showed a hand cursor. | Selected/current options use the default arrow; only actions get the pointer. |
| U-13 | Admins wanted the app to match the instance. | Offer an admin property to follow the instance theme (Next Experience tokens), off by default. |
| U-14 | Adding someone to a comparison meant going back to the Workspace. | Put an "add" affordance where the items are: a subtle dashed card, same size as the others, with + and a label; open the picker in place and focus the search box. |
| U-15 | Pages felt dense. | Use generous spacing between page sections (≈1.75rem) and inside cards. |
| U-17 | Field help text sat on the page under fields. | Keep help out of the way like ServiceNow field hints: an ⓘ next to the label shows it on hover or keyboard focus (announced as the description). Show only state (e.g. On/Off) inline. |
| U-18 | Plain screens were harder to scan. | Add subtle single-colour icons to navigation, section headings, primary actions, tabs and exports (decorative, `aria-hidden`), and give card headers a faint accent gradient. **Never use an arrow or triangle as a decorative icon**: arrows imply an action (expand, go, play), so use them only on controls that do that. |
| U-19 | A one-or-all dropdown limited the operation filter; lists couldn't be grouped. | Use toggle buttons for multi-choice filters (keep one selected). Give data lists ServiceNow list-view behaviour: column menu (sort a–z / z–a, group by, ungroup), collapsible group rows with counts, a removable breadcrumb, expand / collapse all. |
| U-20 | Users wanted to act on query results in ServiceNow itself. | Every queried list gets **Open list** (same records in a native list via an encoded query: `^NQ` for exact pairs), **Copy query** and a short **Export** whose hover names what is exported. Add right-click Show matching / Filter out and per-list column personalization; counts and exports always follow what is shown. |
| U-16 | An action error wiped the whole page. | Show action errors inline next to the action; keep the page usable. |

## 2. ServiceNow SDK / Fluent

| # | Lesson | Do next time |
|---|---|---|
| S-01 | Server modules failed at runtime (`ModuleResolutionException`). | Relative imports between server modules **must use explicit `.ts`** extensions. |
| S-02 | REST responses were double-wrapped (`{result:{result}}`). | Scripted REST handlers call `response.setBody(data)`; the platform adds `{result}`. |
| S-03 | `globalThis` is rejected by the SDK linter. | Import Glide APIs from `@servicenow/glide`; never touch `globalThis`. |
| S-04 | Separately published CSS assets stayed cached on the instance. | Embed CSS in the cache-busted JS bundle (prebuild generates `styles.generated.ts`); keep the generated file committed because the type check runs before the prebuild. |
| S-05 | The dev server (`now-sdk run dev`) doesn't run the prebuild. | A dev wrapper must regenerate embedded CSS when `app.css` changes. |
| S-06 | Choice fields rendered as free text (`dropdown: 'none'` is the default). | Always set `dropdown: 'dropdown_without_none'` (or similar) on choice columns. |
| S-07 | Deleting Fluent records can propagate deletes through `keys.ts`. | Never remove a `Table()`/`Record()`/API definition without deciding whether the delete should reach installed instances; don't leave `Now.del` cleanup files in place. |
| S-08 | `.now.ts` single-quoted strings with apostrophes break the Fluent parser. | Use double quotes or template literals for text with apostrophes. |
| S-09 | The SDK hides its `package.json` behind package `exports`. | Locate the SDK CLI via `require.resolve.paths()` and look for `@servicenow/sdk/bin/index.js`. |
| S-10 | The dev server's port 3000 is hard-coded; it falls back to 8081+ when busy. | Don't fight it: point previews at 8081 when something else (Docker) owns 3000. |
| S-11 | A string-script UI action `require()` path includes scope **and package version**. | Update it when either changes (or rewrite it at build time). |
| S-12 | The SDK can do a lot without a browser. | Use `now-sdk query` for instance data and `now-sdk auth --print` / the credential store instead of handling passwords; `explain` for docs. |

## 3. Platform behaviour (data and security)

| # | Lesson | Do next time |
|---|---|---|
| P-01 | ACLs requiring the `public` role showed as Denied. | Treat `public` as an implicit role for everyone. |
| P-02 | `*.field` lookups were slow. | Load the ACL index once per analysis and target the tables in scope. |
| P-03 | `sys_user_has_role.included_in_role*` are empty on this release. | Derive inherited-role parents with a breadth-first walk of `sys_user_role_contains`. |
| P-04 | Account type lives in `sys_user.identity_type` (human, machine, ai_agent, unclassified) plus `web_service_access_only` / `internal_integration_user`. | Guard with `isValidField` for older releases. |
| P-05 | Searches must mirror the caller's access. | Use `GlideRecordSecure` for anything user-facing (scopes, tables, assistant tools); expect empty results for low-privilege users and allow typed input. |
| P-06 | Next Experience theme tokens are available on UI pages as RGB triplets (`--now-color_background--primary`, `--now-color_text--primary`, `--now-color_border--*`). | Use `rgb(var(--token, fallback))` so pages work with and without a theme. |
| P-07 | Now Assist / generative AI is not available on Personal Developer Instances. | Document it up front; test AI features with an external provider on PDIs. |

## 4. AI assistant and providers

| # | Lesson | Do next time |
|---|---|---|
| A-01 | A free-text provider "Type" sent an Anthropic key to an OpenAI endpoint. | Provider type is a dropdown; unknown types are refused; the endpoint host must match the type (HTTPS only), with custom gateways as an explicit opt-in. |
| A-02 | Error messages echoed key fragments. | Scrub provider errors (`redactSecrets`) and unit-test the masking (tests caught two gaps). |
| A-03 | The assistant must never see more than the user. | All tools run with the user's permissions (`GlideRecordSecure`); hide ACL names/roles from users who can't read ACLs ("strict" detail). |
| A-05 | User and AI text was concatenated into encoded queries (`^` adds conditions). | Sanitize every free-text value before it goes into an encoded query (`queryText()`), especially for unsecured lookups and AI-tool input; prefer `addQuery(field, op, value)`. |
| A-04 | Anthropic defaults. | `claude-opus-5-5`, effort medium, prompt caching, refusal fallback; keep the model admin-configurable. |

## 5. Publishing, install and supply chain

| # | Lesson | Do next time |
|---|---|---|
| D-01 | The scope carried the developer's company code, and docs named the instance. | From day one, commit a **placeholder scope** (`x_<app>`) and keep instance values in a git-ignored profile file; build a scoped copy per profile. |
| D-02 | Early commits contained instance identifiers. | Start with the placeholder before the first commit; otherwise a public release needs a fresh repo or a history rewrite. |
| D-03 | Non-technical users need an install path. | Ship a dependency-free local setup wizard (127.0.0.1, one-time token in the URL fragment, Host check, CSP), an `INSTALL.md` with options for every audience, and a GitHub Action for no-tools installs. |
| D-04 | Reusing an installed app's `sys_app` sys_id as the profile `scopeId` updates in place. | Detect existing installs (query `sys_app`) and offer "update" by default; check scope collisions; propose the scope from `glide.appcreator.company.code`. |
| D-05 | Deploy and the dev server shared one build folder and broke each other. | Give each long-running process its own working copy. |
| D-06 | The instance listed hundreds of npm packages because source upload was on. | Set `packageSourceCodeOnInstance: false`; patch build-tool advisories with same-major `overrides`; never `npm audit fix --force`. |
| D-07 | Running `now-sdk install` from the root (placeholder scope) would create a second app. | Make `npm run deploy` always go through a profile. |
| D-09 | An install succeeded on the instance, but the SDK couldn't read its progress ("Forbidden") and reported a failure. | Never treat a lost progress poll as failure: follow the install's `sys_execution_tracker` record (read-only) and report its real result. Don't re-run an install that may still be running. |
| D-10 | Users read "Add a new login" as creating an account and assumed only `admin` worked. | Word sign-in steps as "Sign in with an existing account" and say any existing account with the needed role works. Saving an SDK login can change the default login, so restore it afterwards. |
| D-08 | The SDK dev-server proxy timed out (504) on a 40-second analysis that the instance completed. | Long requests may time out through proxies: tell the user the work may still finish and where to look; consider async jobs for long runs. |

## 6. Accessibility and layout

| # | Lesson | Do next time |
|---|---|---|
| X-01 | Tooltips and help popovers were cut off at the screen edge or inside cards. | Position floating UI against the viewport (`position: fixed`), clamp to the edges, flip above or below, reposition on scroll/resize, and cap width at `100vw − 16px`. |
| X-02 | A drawer's "Ask assistant" opened behind the drawer. | Keep a z-index scale for overlays (drawer < assistant < tooltip). |
| X-03 | Cards were squished with empty space beside them. | Use `repeat(auto-fit, minmax(min(100%, Npx), 1fr))`, not `auto-fill`. Don't put `display: flex` on table cells. |
| X-04 | `hidden` didn't hide elements whose class set `display`. | Add `[hidden] { display: none !important }`. |
| X-05 | Sorting needs to be announced. | Sortable headers are buttons inside `<th aria-sort>`; numbers sort largest-first on the first click. |
| X-06 | Drawers trap focus. | Move focus in on open, trap Tab, return focus to the opener on close; Esc closes. |
| X-07 | Muted text failed contrast. | Keep muted text ≥ 4.5:1; use a separate "faint" colour only for decoration. |

## 7. Tooling (Windows, shell, editing)

| # | Lesson | Do next time |
|---|---|---|
| T-01 | Bash heredocs containing apostrophes failed. | Write multi-line edit scripts to the scratchpad and run them, or use the editor tool. |
| T-02 | Regex escapes were mangled through bash → python. | Prefer exact-string replacements with asserts (fail loudly if the anchor is missing). |
| T-03 | Credential-printing commands are blocked by the agent's safety rules. | Read the SDK source for formats instead of printing tokens; never handle passwords directly. |
| T-04 | The preview tool reads `launch.json` from the session's original folder. | If the session moved folders, add a matching `launch.json` there using `npm --prefix <project>`. |
| T-05 | Stale browser element references clicked the wrong thing. | Re-query (`find`) after navigation or re-render; take a fresh screenshot before coordinate clicks. |

## 8. Testing and verification

| # | Lesson | Do next time |
|---|---|---|
| V-01 | Offline tests with Glide fakes caught engine and masking bugs before deploy. | Keep pure logic in modules testable with fakes; run `npm test` before every deploy. |
| V-02 | Admin and non-admin behaviour differ. | Verify as a role-only test user for every feature: UI hides admin actions *and* the API returns 403. |
| V-03 | Destructive features need safe tests. | Create a throwaway record, test on it, and confirm it's gone (404). |
| V-04 | Screenshots can predate a re-render. | Confirm state with DOM queries (e.g. row order, `aria-sort`) rather than screenshots alone. |
| V-05 | Users saw old UI after deploys. | Mention a hard refresh (Ctrl+Shift+R) after each deploy. |

## 9. UX baseline (definition of done for every screen)

- Field help is an ⓘ tooltip (hover/focus), never always-visible text under fields.
- Subtle decorative icons on navigation, headings and main actions; arrows only where they mean an action.
- Labels say exactly what is counted; tooltips define terms; "?" help explains app concepts, including whether settings persist.
- Cards: short, scannable, with detail one click away (tab, list view or record link).
- Every data table: sortable headers (`aria-sort`), a text filter where useful, CSV export; when filtered, a green download-filtered button and a subtle clear-filter button.
- Every record mentioned links to the record (new window, labelled "(new window)"); vendor docs use a book icon with descriptive alt text.
- Empty or irrelevant sections are hidden.
- Floating UI stays on screen; overlays have a z-index scale; focus is managed in drawers and popovers.
- Selected options show the arrow cursor; actions show the pointer.
- Closable tips: × hides for the login session (all tabs), plus a separate "Don't show again".
- Generous spacing between sections; add-new affordances (dashed + card) next to the items they extend.
- Admin-only actions are hidden from others **and** refused by the API.
- Optional: follow the instance theme via an admin property.
