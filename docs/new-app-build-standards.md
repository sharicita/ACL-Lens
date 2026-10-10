# New App Build Standards

The baseline every new ServiceNow app (ServiceNow SDK / Fluent) should meet from day one. It collects every usability, functionality, UX/UI, security, accessibility, documentation and process requirement that came up while building ACL Lens. Use it in three ways:

- **Starting an app:** work through §1–§4 before writing features.
- **Building a screen:** treat §5–§9 as its definition of done.
- **Before each release:** run the checks in §12–§13.

Each item says **what**, and where useful **why**, in one line. ACL Lens is the reference implementation. File names in `code` point to working examples in this repository, and the reasoning behind each item is in [lessons-learned.md](lessons-learned.md).

---

## 1. Project setup and repository

**Public-safe from the first commit**
- [ ] **Placeholder scope** in all source (`x_<app>`), never a real company code. *Why: once a real scope or instance name is committed, publishing needs a fresh repo or a history rewrite.*
- [ ] **Install profiles** in a git-ignored file (`<app>.local.json`): instance URL, login alias, real scope, app `sys_id`. *(`tools/lib/profiles.mjs`)*
- [ ] **Profile builds** in a git-ignored copy (`.deploy/<profile>/`) with the scope rewritten; new `keys.ts` entries copied back with the placeholder. *(`tools/lib/workspace.mjs`)*
- [ ] `npm run deploy` **always goes through a profile**; never install the placeholder scope on an instance that has the real one (it would create a second app).
- [ ] **With two or more profiles, commands that change an instance require `--profile`.** Setup flows never replace an existing default.
- [ ] `.gitignore` covers profiles, `.deploy/`, `.now/`, `dist/`, `target/`, test builds and tool folders.
- [ ] No instance names, company codes, emails, local paths or sys_ids of installed apps in tracked files. Check with `git grep` before every push.
- [ ] Secrets are never stored in the repo: logins live in the OS credential store (`now-sdk auth`), API keys in encrypted fields on the instance.

**Repository files**
- [ ] `README.md`: one-line description, what it does, link to `INSTALL.md` and `docs/`, development commands, license.
- [ ] `INSTALL.md`: options for every audience (see §2), plain language, tables and collapsible extras.
- [ ] `LICENSE` (MIT by default) and `package.json` `license` to match.
- [ ] `SECURITY.md`: private vulnerability reporting, the app's security design, "never commit secrets".
- [ ] App **description** set in `now.config.json` and `package.json`.

**npm scripts**
- [ ] `setup` (guided wizard), `deploy`, `deploy:build`, `package`, `profile`, `dev` (profile-based), `test`, `build`.

**GitHub**
- [ ] **Actions:** allow only the owner's actions, pin to full commit SHAs, require approval for outside contributors, read-only default token, no PR approvals by Actions.
- [ ] **Security:** private vulnerability reporting and Dependabot alerts on.
- [ ] **About:** description and topics (e.g. `servicenow`, `servicenow-sdk`).

## 2. Installation and deployment

- [ ] **Guided setup** (`npm run setup`): a local, dependency-free web page bound to `127.0.0.1` with a one-time token in the URL fragment, a Host-header check and a strict CSP. Steps: get ready (Node, `npm ci`) → connect (password piped to `--password-stdin`, never stored) → scope (from `glide.appcreator.company.code`; detect an existing install and offer **update**; check name collisions) → install (progress, rollback link) → next steps. *(`tools/setup/`)*
- [ ] **`INSTALL.md` options:** guided setup (recommended); ServiceNow IDE / Studio from Git (with a GitHub Action that prepares a branch with the user's scope); update set file; copy between instances; updating, rollback and uninstall; troubleshooting; what doesn't carry over (roles, data, keys, changed properties).
- [ ] Reuse the installed app's `sys_app` sys_id so updates happen in place.
- [ ] **Dev server** through the profile, in its own copy (`.deploy/<profile>.dev`), mirroring `src/` and regenerating embedded CSS. Expect port 3000 or the next free one from 8081.
- [ ] `packageSourceCodeOnInstance: false`. Patch build-tool advisories with same-major `overrides`; never `npm audit fix --force`.
- [ ] Document **PDI limits** up front (no Now Assist / generative AI on Personal Developer Instances).

## 3. ServiceNow SDK / Fluent engineering

- [ ] Server modules import each other with **explicit `.ts`**; Glide APIs come from `@servicenow/glide`; no `globalThis`.
- [ ] Scripted REST handlers call `response.setBody(data)`; the platform adds `{ result }`.
- [ ] **Embed CSS in the JS bundle** (prebuild → `styles.generated.ts`, committed), because separately published CSS is cached on the instance.
- [ ] Choice columns set `dropdown: 'dropdown_without_none'` (the default is free text).
- [ ] Never delete `Table()` / `Record()` / API definitions without deciding the upgrade delete (`keys.ts`). Never hand-edit `keys.ts`.
- [ ] `.now.ts` text with apostrophes uses double quotes.
- [ ] A string-script UI action's `require()` path contains scope and version: keep it in step.
- [ ] Use `now-sdk query` for instance data and `now-sdk explain` for SDK docs. Read each subcommand's `--help` first.
- [ ] Platform data quirks worth knowing:
  - the `public` role is implicit;
  - derive inherited roles from `sys_user_role_contains`;
  - `sys_user.identity_type` gives the account type;
  - Next Experience theme tokens are RGB triplets.

## 4. Security

- [ ] **Two roles minimum:** `<scope>.user` (use the app) and `<scope>.admin` (configure it). Platform `admin` passes every check.
- [ ] **Admin rules enforced on the server** (REST 403), not only by hiding UI. Verify both.
- [ ] **Least privilege in data access:** user-facing searches and tools use `GlideRecordSecure`. Results mirror the signed-in user's access, and empty results are expected for low-privilege users.
- [ ] **Never concatenate user or AI text into encoded queries:** strip `^` and line breaks (`queryText()`) or use `addQuery(field, op, value)`.
- [ ] **App configuration is admin-only to read and write** (properties' read/write roles = admin). Server code still reads the values with `gs.getProperty`.
- [ ] **Optional integrations off by default** (e.g. MCP endpoint): admin switch, clear refusal message when off.
- [ ] **AI features:**
  - read-only tools that run as the user;
  - provider type is a dropdown, and unknown types are refused;
  - the endpoint host must match the type, over HTTPS only, with custom gateways an explicit opt-in;
  - provider errors are scrubbed of key fragments (with tests);
  - ACL details are shown only to users who can read ACLs.
- [ ] **Destructive actions** (delete) are admin-only, need an inline confirmation, and log who did it. Offer **archive** as the safer alternative.
- [ ] Local tools never store passwords, and the agent never handles credentials directly.

## 5. Navigation and structure

- [ ] **Application menu:** main modules first (e.g. Workspace, History), then a **Configuration** separator visible to `admin` and `<scope>.admin` only, containing **Properties** (first), then integrations (e.g. MCP Server), then provider/config lists. *Everything that configures the app lives under Configuration.*
- [ ] Every module and the separator carry roles; the in-app Settings tab is shown to admins only.
- [ ] **Header:**
  - app name (links to the landing page, underlined on hover) and a one-line description;
  - nav tabs with icons and a subtle button on hover;
  - the selected tab uses the arrow cursor.
- [ ] Admin pages share a small **Configuration bar** (Properties | integrations | provider lists).
- [ ] Deep links for every view (`?view=…&id=…`) so pages open in new windows and can be bookmarked.

## 6. Visual design (UI)

- [ ] **Light, quiet, modern**: soft neutrals, subtle borders, colour reserved for meaning.
- [ ] **Theme option** (admin property, off by default): follow each user's ServiceNow theme (accent, surfaces, text, borders, dark appearance). Off = the app's own fixed colours. Show "Your theme:" with a live preview.
- [ ] **Card headers** have a faint accent-tinted gradient; cards are padded and fill the available width (`repeat(auto-fit, minmax(min(100%, Npx), 1fr))`, never `auto-fill`).
- [ ] **Generous spacing** between page sections (~1.75rem) and inside cards.
- [ ] **Subtle single-colour icons** on navigation, section headings, primary actions, tabs and exports (`aria-hidden`).
- [ ] **No decorative arrows or triangles**: arrows only on controls that do what the arrow suggests (expand, go, play, download).
- [ ] **Cursors:** pointer for actions, the default arrow for the already-selected option, `help` for info icons.
- [ ] **Hover feedback:** subtle button shape on tabs and segmented switches.
- [ ] Status colours are fixed and explained in a legend (e.g. Granted / Conditional / Denied), never themed away.
- [ ] Respect `prefers-reduced-motion`. Animations are short (≈0.15–0.4s).

## 7. Content, help and guidance (UX)

- [ ] **Never assume knowledge.** Every app-specific term (e.g. "baseline") is explained where it appears, including whether a choice **persists** and for whom.
- [ ] **Every number has a label** saying exactly what is counted, plus a tooltip with the definition. Remove figures you can't define in one sentence.
- [ ] **Field help works like ServiceNow field hints:** an ⓘ beside the label shows it on hover or focus. Never always-visible text under fields; show only state (e.g. On/Off) inline.
- [ ] **"?" help popovers** for concepts; **book-icon links** to vendor docs (new window, descriptive accessible name).
- [ ] **Tooltips everywhere** they help (`data-tip`), positioned against the viewport so they are never cut off.
- [ ] **Tips:** × closes for the rest of the login session in every tab; a separate "Don't show again" hides it for good.
- [ ] **Cards are concise:** the most important facts in a few words. Detail lives in tooltips, tabs or list views.
- [ ] **Hide empty or irrelevant sections.**
- [ ] **Filters use the same words as the columns they act on;** add a column for whatever is filtered.
- [ ] **Explanations sit next to the result:** clicking a status (e.g. Conditional) shows why in place, with a link to the full details; never make users hunt through a separate panel.
- [ ] **Summary tiles act like a report:** each opens its full list (new window).
- [ ] **Every record mentioned links to it** (open-record icon, new window, labelled).
- [ ] **Add-new affordances sit where the items are** (e.g. a subtle dashed "+ Add" card next to existing cards, focusing its search box when opened).
- [ ] **Action errors show inline**, never by replacing the page. Long requests that time out say the work may still finish and where to check.
- [ ] **Sensible defaults**, e.g. exclude system tables, include field rules.

## 8. Lists and tables (ServiceNow list-view baseline)

Every data list provides:
- [ ] **Sorting** by clicking a heading (text A–Z first; numbers and levels largest first; again to reverse) with `aria-sort`.
- [ ] **Column menu** per heading (⋮ on hover/focus): Sort (a to z), Sort (z to a), Remove sort, **Group by**, Ungroup. Keyboard operable.
- [ ] **Grouping:** collapsible group headings with counts (e.g. *Type: Comparison (10)*), **Expand all / Collapse all**, readable group names (statuses by result, dates by day).
- [ ] **Right-click a cell → Show matching / Filter out** (and Group by), Shift+F10 from the keyboard.
- [ ] **Breadcrumb bar** showing filters, grouping and sort, each removable with ×.
- [ ] **Personalize columns** (Columns button), remembered per list; the row-name column always stays.
- [ ] **Text filter** with the same ranked search as everywhere (§9); a count like "2 of 4"; a subtle **Clear filter** when filtered.
- [ ] **Open list:** the same records in a native ServiceNow list view (encoded query; `^NQ` for exact pairs), new window, the user's own permissions.
- [ ] **Copy query** (the encoded query) and a short **Export** with an icon whose hover names exactly what is exported. Export is highlighted (green) when a filter is active.
- [ ] Counts, Open list, Copy query and Export always follow **what is shown** after filters.
- [ ] Multi-choice filters use **toggles** (any combination, at least one on), not one-or-all dropdowns.
- [ ] Large lists page ("Show more") rather than render everything.

## 9. Forms, search and controls

- [ ] **One search behaviour app-wide:** prefix matches first, then contains; highlighted matches; ↑/↓, Enter, Esc; result count announced; only records the user can read; typed values allowed when lookup is impossible.
- [ ] Comboboxes follow the ARIA combobox pattern (`aria-activedescendant`, listbox, live region).
- [ ] Segmented switches (User/Role, tabs) use radio or tab roles with clear selected state.
- [ ] Opening an inline panel focuses its first input.
- [ ] Settings use switches for booleans, with Save / Discard for grouped settings and immediate save only where labelled.

## 10. Accessibility (WCAG 2.2 AA)

- [ ] Text contrast ≥ 4.5:1 (muted text included); decorative-only colours separate.
- [ ] Visible focus ring on every control; logical tab order.
- [ ] **Drawers and dialogs:** focus moves in, Tab is trapped, Esc closes, focus returns to the opener.
- [ ] **Popovers, menus and tooltips:** positioned against the viewport, flipped and clamped to stay on screen, closed with Esc, and announced (`aria-describedby`, `role=menu`, `menuitem` / `menuitemcheckbox`).
- [ ] Tables have captions (visually hidden if needed), `scope` on headers, `aria-sort` on sortable columns.
- [ ] Icons are `aria-hidden`; icon-only buttons have accessible names; "(opens in a new window)" on new-window links.
- [ ] Live regions announce counts and status changes; `lang` set on the page.
- [ ] `[hidden]` always wins (`display: none !important`); overlays follow a z-index scale (drawer < assistant < tooltip).

## 11. Admin and data management

- [ ] **Properties page** (admin): one section per concern, an ⓘ on each setting, Save / Discard.
- [ ] **History governance** when the app stores runs or records: on/off switch, clear now (all, date range, or older than N days, with a preview count), automatic retention (off by default; 90 days; delete or archive).
- [ ] **Per-item management** where the item is viewed: Archive / Restore and Delete (confirmed), admin-only in both UI and API.
- [ ] **Reruns / versions** save a new record linked to the original and show what changed.
- [ ] **Exports:** CSV (Excel-friendly, BOM), JSON, print / PDF.

## 12. Performance

- [ ] Load expensive detail **on demand** (expand, hover, "Load all") and cache it per page.
- [ ] Cap broad queries (e.g. max tables) with a visible setting, and show timings for long runs.
- [ ] Memoize derived lists; page long tables; avoid re-rendering whole pages for small actions.
- [ ] Ship minimal runtime dependencies (server code: none; UI: the framework only).

## 13. Testing and verification

- [ ] **Offline tests** with Glide fakes for pure logic and safety code; run before every deploy (`npm test`).
- [ ] **Verify every feature on a PDI as a role-only user and as admin:** admin UI hidden **and** API 403 for non-admins.
- [ ] Test destructive actions on **throwaway records** you create, then confirm they're gone.
- [ ] Confirm state through the DOM (row order, `aria-*`) rather than screenshots alone; re-query elements after re-renders.
- [ ] Check keyboard paths: Tab, Shift+Tab, Esc, arrows, Shift+F10.
- [ ] Before pushing: tests pass, the build type-checks, `git grep` shows no instance identifiers.
- [ ] After deploys, remind users to hard-refresh (Ctrl+Shift+R).

## 14. Documentation set (`docs/`)

- [ ] `README.md` index with status, version and change log.
- [ ] `architecture/` 01 overview and scope · 02 system architecture · 03 core engine · 04 security · 05 integrations / AI · 06 risks, assumptions and decisions.
- [ ] `data-dictionary.md` (tables, columns, properties with roles, menu), `api-reference.md`, `user-guide.md`, `install-and-deploy.md`, `dev-setup.md`.
- [ ] `build-log.md`: one entry per iteration (built, fixed, verified).
- [ ] `adr/`: one ADR per significant decision.
- [ ] `lessons-learned.md`: what happened → what to do next time. **Update it every build**, and copy reusable lessons into this standard.

## 15. Working process

- [ ] Deliver in small, verified increments: build → test → deploy to the PDI → check in the browser → document → commit and push.
- [ ] Mid-task requests are queued and handled in the same pass. Confirm anything destructive, credential-related or outward-facing before doing it.
- [ ] Read the SDK orientation docs for each new project; check each CLI subcommand's `--help` before first use.
- [ ] On Windows, write multi-line edit scripts to a file instead of shell heredocs (apostrophes break them).
- [ ] Keep memory and this standard in sync with new lessons.
