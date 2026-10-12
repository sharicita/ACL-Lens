# Build Log

Iteration-by-iteration record: what was built, what was found on the PDI and how it was fixed.

---

## 1.0 Initial build

| | |
|---|---|
| **Date** | 2026-10-08 |
| **Status** | Built and installed on the development PDI |

### Built
- Project scaffolded with `now-sdk init` (template `typescript.react`, scope `x_acllens`). Template incident sample removed before the first build (never installed).
- Engine:
  - subject resolution (users with group and inherited roles; roles with contained roles);
  - schema hierarchy and ACL index (targeted load for ≤150 tables);
  - evaluator, analysis, comparison and drift;
  - chunked storage.
- Tables `_run`, `_run_data`; roles `.user` and `.admin`; table ACLs; 12 cross-scope read privileges; REST API; UI page; navigator.
- React UI: workspace, matrix, subject cards, table details with the live all-fields view, comparison report, drift report, history, exports.

### Tests
- Offline evaluator and comparison tests passed before deploying.

---

## 1.1 PDI verification fixes

| | |
|---|---|
| **Date** | 2026-10-08 |
| **Tested as** | `acl.lens.tester` (only `x_acllens.user`) |

| Issue found | Fix |
|---|---|
| Every API call failed: `ModuleResolutionException` | Relative imports between server modules now use explicit `.ts` |
| Responses double-wrapped (`{result:{result}}`) | Handlers set the body directly |
| `kb_knowledge` read showed Denied: ACLs require `public` | `public` treated as an implicit role; regression test added |
| A 6-table run took 16 s (10.4 s in the `*.field` dictionary lookup) | Lookup limited to the analyzed tables and their parents → 4.5 s; per-phase timings added |
| Long role descriptions overflowed the subject cards | Clamped to two lines with a full-text tooltip |
| Stylesheet changes not visible after deploy | Cache-busting parameter on the script tag (stylesheet fixed fully in 1.2) |

Verified: comparison (ALR0001001/1004), `itil` vs `admin` over 1,500 tables (108 s, 15,547 differences), rerun with lineage and drift (ALR0001005), details drawer.

---

## 1.2 Usability, restyle and Security Assistant

| | |
|---|---|
| **Date** | 2026-10-08 |

### Built
- Subtitle text; slide animations (drawer, field rows, panels); scope typeahead; light restyle; contextual dismissible tips.
- Security Assistant ([ADR-0003](adr/ADR-0003-ai-provider-agnostic-read-only.md)):
  - provider tables and ACLs;
  - Now Assist / Anthropic / OpenAI-compatible / Azure connectors;
  - agent loop and 10 read-only tools;
  - MCP endpoint, panel UI and Markdown renderer.

### Found and fixed
- The instance served the *previous* stylesheet after every deploy (cached server-side by asset record). Styles moved into the JS bundle ([ADR-0004](adr/ADR-0004-styles-in-js-bundle.md)).
- Unescaped apostrophes in `.now.ts` strings broke the Fluent parser.

### Verified
- MCP initialize, notifications, tools/list and tools/call on the PDI.
- `search_acls` → `no_access` for the role-only user, which is correct.
- `check_my_access` returns the user's real CRUD.
- Agent loop covered by offline tests.
- Now Assist not available on the PDI (no callable skill).

---

## 1.3 Properties, tooltips, Now Assist setup

| | |
|---|---|
| **Date** | 2026-10-08 |

### Built
- Scope search ranking: scope prefix → name prefix → contains; `x_` apps first when empty.
- Longer slides: 0.4 s in / 0.32 s out, 64 px travel.
- Standard tooltip layer (`data-tip`) on every interactive element, including the rerun links.
- Properties / Settings view ([ADR-0005](adr/ADR-0005-history-governance.md)): history toggle, clear history (all / range / older than), retention (off by default, 90 days, delete or archive), daily job, archive/restore.
- Provider form:
  - capability reference and skill input name;
  - type-based UI policy;
  - **Test connection** UI action;
  - clearer "not available" reasons.

### Found and fixed
- `globalThis` is rejected in modules. The UI action uses a string script with `require(...)` plus `action.setRedirectURL`.
- Admin routes returned 400 instead of 403.

### Verified
- Tooltip on *Reruns* on the PDI; admin routes refused for the role-only user; properties, retention job and UI action installed.
- **Not yet clicked through as admin:** Settings, clearing, Test connection (open item O-01).

---

## 1.4 Documentation

| | |
|---|---|
| **Date** | 2026-10-08 |

- `docs/` created (this set).
- Offline tests moved to `tests/offline` with `run.mjs`.
- Root README reduced to a pointer.

---

## 1.5 Dependency review, source upload off, SDK upgrade

| | |
|---|---|
| **Date** | 2026-10-08 |
| **Decision** | [ADR-0006](adr/ADR-0006-dependency-supply-chain.md) |

### Why
The instance listed hundreds of npm packages being installed for the app. This was the full development dependency tree, restored because the template uploads the app source to the instance.

### Findings before changes
- 592 locked packages; only 3 shipped (`react`, `react-dom`, `scheduler`).
- `npm audit`: 23 advisories (1 critical, 11 high, 11 moderate), all build tooling; runtime 0.
- 535 verified signatures, 67 attestations, all from registry.npmjs.org with integrity hashes.

### Changes
- `now.config.json` → `packageSourceCodeOnInstance: false`.
  - The build marked the old "BYOUI Files" source package deleted in `keys.ts`, but the install did not remove it.
  - Removed it with a one-off `Now.del` file: the source artifact `94088204…` and its 3 links. Verified gone on the PDI; the UI page was untouched.
  - The one-off file was then deleted, because it duplicated the `keys.ts` deletion markers and caused build warnings.
- `@servicenow/sdk` 4.11.2 → **4.13.6** (exact pin); `@servicenow/isomorphic-rollup` → ^1.3.11. TypeScript stays at 5.5.4.
- SDK orientation docs re-read for 4.13.6. No breaking changes for this app. New: `transform` pull-back, comment directives, MFA prompts, `@servicenow/glide/global` imports.
- The upgrade alone did not reduce advisories (still 23; `fflate` fixed, `undici` added).
- Added same-major `overrides`: handlebars 4.7.10, fastify 5.12.5, @fastify/static 10.1.5, joi 17.13.8, undici 7.30.0, js-yaml@3 → 3.15.2.

### Results
- `npm audit`: **18 (13 high, 5 moderate), 0 critical.** All remaining items come from `braces` and `sprintf-js` (no fix released).
- `npm audit --omit=dev`: 0. Signatures: 529 verified, 70 attestations, none invalid.
- Build clean, offline tests pass, deployed. PDI smoke test: run ALR0001009 matches pre-upgrade results.

---

## 1.6 AI provider fixes and first live assistant test

| | |
|---|---|
| **Date** | 2026-10-08 |

### Found
- **Choice fields were free-text boxes.** The SDK default for `StringColumn` choices is `dropdown: 'none'`. The provider *Type* was typed as the label "Anthropic Claude (Messages API)", which the connector didn't recognize.
- **Unknown types fell back to the OpenAI request format.** First attempt: an OpenAI endpoint → the Anthropic key was sent to api.openai.com (HTTP 401, the error echoed a masked key fragment). Second attempt: `…/v1/messages/chat/completions` → HTTP 404.

### Fixed
- All five choice fields use `dropdown: 'dropdown_without_none'` (dictionary `choice=3` verified).
- `normalizeType()`: accepts value or label; an unknown type is **unavailable** with a clear reason; `complete()` throws on an unknown type instead of defaulting.
- `anthropicUrl()`: accepts blank, `https://api.anthropic.com`, `…/v1` or `…/v1/messages`.
- Recommended rotating the Anthropic key that reached OpenAI.

### Verified on the PDI
- Test connection: "Connected to Anthropic Claude in 1462 ms. Reply: OK".
- As `acl.lens.tester` (role-only), 4 questions:
  - own access via `check_my_access`;
  - ACL listing correctly refused (`no_access`, no guessing);
  - Conditional write explained via `evaluate_access`, with a test plan;
  - "deactivate the itil write ACL and link it" refused: read-only, no invented link, warned against changing OOB ACLs, gave a change/test/rollback procedure.
- Raised open decision O-08: `evaluate_access` names ACL roles the user cannot read directly.

---

## 1.7 Strict assistant detail and connection safeguards

| | |
|---|---|
| **Date** | 2026-10-08 |
| **Decisions** | D-11 (option A), D-12 |

### Built
- `evaluation-view.ts`: `evaluate_access` returns outcomes and name-free reasons unless the user can read `sys_security_acl`; hierarchy only with `sys_db_object` read. The system prompt tells the model not to name or guess hidden details.
- `provider-safety.ts`:
  - `normalizeType`, `anthropicUrl` (moved from `providers.ts`);
  - `checkEndpoint`: HTTPS, host must match Type, another vendor's host always blocked, `allow_custom_endpoint` opt-in for gateways;
  - `redactSecrets`.
- `providers.ts`: endpoint checked when the provider status is computed and again in `http()` right before the key is sent; provider and Now Assist errors scrubbed.
- New provider field `allow_custom_endpoint` (hidden for Now Assist by the UI policy).
- `tests/offline/safety.test.js`. The first run caught two masking gaps (4-character key tail, partial key prefix), fixed before deploying.

### Verified on the PDI
- Anthropic provider still available.
- As the role-only user, `evaluate_access` returns a note plus outcomes and reasons, with no ACL names, levels, roles or hierarchy. The assistant answered the Beth write question without naming roles and explained why.

---

## 1.8 Usability, publishable source and guided install

| | |
|---|---|
| **Date** | 2026-10-09 |
| **Decisions** | D-13 ([ADR-0007](adr/ADR-0007-placeholder-scope-and-install-profiles.md)) |

### Built
- **One search everywhere:** `rankedSearch` on the server (prefix matches first, then contains; deduplicated; `GlideRecordSecure` where the user's access matters) and `SearchCombo` / `rankFilter` on the client (ARIA combobox, highlighted matches, result count announced). Used for users, roles, scopes, tables (new `GET /tables`) and the result filters.
- **Subject cards:** labelled Granted / Conditional / Denied table counts (replacing the unclear "0 +59"), role assignment summary, shared-role counts per subject, account-type badge (`identity_type`, web-service-only, integration user), record links.
- **Baseline explained:** help popover and tip. Remembered per run in this browser (`localStorage`).
- **Roles tab** (`RoleComparison`): shared versus partly held roles, direct / group / inherited with the parent role, collapsible groups with Expand all / Collapse all. Inherited parents are worked out by a breadth-first walk of `sys_user_role_contains`, because `included_in_role` is empty on this release.
- **Condition details:** *Show the condition* loads `GET /acl/{id}` on demand (condition, applies-to, security attribute, script only with ACL read, description).
- **Links:** `RecordLink` to users, roles, groups, tables, fields and ACLs; `DocLink` (book icon) to ServiceNow documentation; both open in a new window and are labelled for screen readers.
- **Accessibility and performance:** the assistant opens above the details drawer (z-index fix); focus moves into the drawer and is trapped there, and returns on close; table captions and header scopes; `lang`; contrast of muted text; ACL details cached per page; data loaded only when expanded.
- **Publishable source:** placeholder scope `x_acllens`, new neutral `scopeId`, app description set; `tools/deploy.mjs`, `tools/profile.mjs`, `tools/scope.mjs`, the GitHub Action, `npm run setup` (local wizard), `INSTALL.md`, [install-and-deploy.md](install-and-deploy.md).

### Verified on the PDI
- As the role-only user: ranked user and role search; table search empty by design (no `sys_db_object` read; typed names still work); new cards, Roles tab, condition details and Ask assistant from the drawer.
- Profile deploy updated the existing app in place: same sys_id, one ACL Lens app, description shown.
- Guided setup, end to end: found the company code, offered *Update the existing install*, caught a duplicate scope name, installed, showed next steps. Server refuses missing tokens (403), foreign Host headers (421) and path traversal (404).

---

## 1.9 Report lists, sorting, cleaner cards, run management

| | |
|---|---|
| **Date** | 2026-10-09 |

### Built
- **Comparison report:**
  - Summary tiles lead with explicit / inherited roles in common and roles not shared.
  - "Identical" is folded into *tables compared*.
  - Each tile is a report link that opens a **list view** (`?view=list&id=<run>&list=<kind>`) in a new window, sortable, filterable and exportable.
  - The roles list is back in the report with a **Shared roles** toggle.
  - Every difference has a **Level** column (Table / Field), a labelled **Show** filter, a green **Download filtered list** and **Clear filter**.
- **Sorting everywhere:**
  - `SortTh` / `useSort` with `aria-sort`: numbers sort largest first on the first click, text A–Z.
  - Applied to the matrix, every difference, per subject, roles (report and Roles tab), list views, History, changes since original and live fields.
- **Subject cards:**
  - Fill the available width (`auto-fit` instead of `auto-fill`) with padding.
  - Fixed the table layout (row headers were `display: flex`).
  - Text is short: one roles line, with details in tooltips.
- **Roles tab:** empty groups are hidden.
- **Tooltips and help popovers stay on screen:**
  - Help popovers are positioned against the window (shifted at the edges, flipped above when needed).
  - Hover tooltips flip vertically when cut off.
- **Tips:** × closes for the rest of the ServiceNow login session in every tab (keyed to a hash of the session token, never the token); **Don't show again** hides permanently; copies on screen close together.
- **Arrow cursor** on the already-selected tab, segment and navigation item.
- **Add user or role card** after the subject cards: re-runs the same tables with the extra subject as a new run (same run type), with progress shown in the card. Action errors now show above the run instead of replacing the page; gateway timeouts explain that the run may still finish.
- **More space between page sections** (section gap 1.75rem, roomier card padding and report headings).
- **Admin run management:** Archive / Restore and Delete (with inline confirmation) on the run page; new `DELETE /runs/{id}`.
- **Property `x_acllens.ui.instance_theme`:** maps the app's neutral colours to the Next Experience theme tokens (RGB triplets) on the UI page.
- **Dev server** (`npm run dev`):
  - runs through the install profile in its own `.deploy/<profile>.dev` copy;
  - regenerates the embedded CSS when `app.css` changes;
  - the preview uses port 8081 because Docker holds 3000.

### Verified
- In the dev preview (admin): list views open and sort correctly; Archive, Restore and Delete work on a throwaway run (deleted run returns 404, page returns to History); the theme class switches to the instance colours.
- Add card (dev preview): searched, picked Beth Anglin; the server completed ALR0001017 with four subjects (the dev proxy itself timed out after about 30 s, which led to the timeout message); the test run was then deleted.
- On the PDI as the role-only user: a tip closed with × stayed closed in a newly opened tab; no Archive/Delete buttons; `DELETE /runs/{id}` returns 403; the "How are tables checked?" popover stays inside the window.

---

## 1.10 End-of-day review

| | |
|---|---|
| **Date** | 2026-10-09 |

### Fixed
- **Query injection (security):** search text was placed directly in encoded queries, so a `^` could add conditions. On the unsecured user/role search this would let a user probe fields they can't see. New `queryText()` strips `^` and line breaks and caps the length; it's applied to ranked search (users, roles, scopes, tables), History search, and the assistant's subject, search and run lookups (whose input comes from the AI model).
- Comparison CSV exports use the same Level wording as the screen (Table / Field; table rules have no field).
- A deleted run is dropped from the page's memory, so Back can't show it.

### Verified on the PDI
- As the role-only user:
  - `q=zzzq^ORactive=true` returns 0 users;
  - admin settings 403;
  - ACL script hidden;
  - comparison run with role sources and account type;
  - report tiles, list page (42 rows = tile);
  - matrix sort (checked against cell values), drawer focus, condition detail;
  - Roles tab (empty group hidden, sort both ways);
  - History sort;
  - no admin buttons.
- As admin (dev preview): Settings shows Appearance; the instance-theme property saves and reads back (restored to off).
- The setup wizard server and the profile tool still work. Test runs were deleted.

---

## 1.11 Configuration section and MCP setup

| | |
|---|---|
| **Date** | 2026-10-09 |

### Built
- **Navigator:** new **Configuration** separator in the ACL Lens menu, containing **MCP Server** (new), **Properties** and **AI Providers** (moved). The separator and every module under it require `x_acllens.admin` or `admin`.
- **All app properties are now admin-only to read and write** (were readable by app users). Server code still reads them for everyone.
- **New property `x_acllens.mcp.enabled`** (off by default). The MCP endpoint refuses every request while it is off.
- **MCP Server page** (`?view=mcp`, admins only):
  - on/off switch and the endpoint with a copy button;
  - connection steps, with examples for Claude Code, VS Code and curl;
  - self-test;
  - tools, prompts and guidance;
  - data from new `GET /admin/mcp` (admin).
- Shared **Configuration** sub-navigation on the Properties and MCP pages; the header's Settings tab covers both.

### Verified on the PDI
- Menu records: separator and modules (orders 1000–1300) with roles `x_acllens.admin,admin`. All six properties have read/write roles `x_acllens.admin`.
- As the role-only user:
  - `GET /admin/mcp` returns 403;
  - the MCP endpoint is refused while off (403, clear message);
  - properties are invisible through the Table API;
  - `?view=mcp` shows only an admins-only notice;
  - no Settings tab.
- As admin: the page loads with the real endpoint. Switching on worked, and the self-test returned 10 tools. With MCP on, the role-only user's MCP call returned 10 tools and `/me` still read `history_enabled`, so properties stay readable by server code. MCP was switched back off afterwards.

---

## 1.12 Field help as tooltips

| | |
|---|---|
| **Date** | 2026-10-09 |

- New `FieldInfo` (ⓘ) shows field help on hover or keyboard focus, like ServiceNow field hints, instead of text under the field. It is the screen-reader description too.
- Applied to:
  - Scope of analysis (its help follows the chosen option), Include field-level rules, Exclude system tables and Max tables;
  - Properties switches (save to History, instance theme, automatic cleanup);
  - the MCP switch and endpoint;
  - the Roles tab group hints.
- Only state (On/Off) stays visible inline.
- Verified in the preview: nothing is expanded by default; hover and Shift+Tab both show the text with `aria-describedby`.
- The app name **ACL Lens** in the header now links to the Workspace (landing page). Same text, underlined on hover or focus, and Ctrl/Cmd-click opens a new tab. Verified in the preview.

---

## 1.13 Theme follows each user's preference; system tables excluded by default

| | |
|---|---|
| **Date** | 2026-10-09 |

- **Why the theme setting was hard to see working:** the accent colour always followed the theme, even with the setting off, and with it on only the near-white backgrounds and grey borders changed.
- **Now:**
  - **Off** = fixed ACL Lens colours, accent included.
  - **On** = the signed-in user's own Next Experience theme. The instance loads it per user (`$uxappimmutables.do?…ux_theme`); the app maps the accent, focus ring, backgrounds, text and borders, and detects dark appearance (sets `color-scheme: dark`, shadows and the hover tint).
  - Renamed to **Follow each user's ServiceNow theme**.
- **Properties shows "Your theme:"** with the name and appearance from the user preferences `glide.ui.polaris.theme` → `sys_ux_theme` and `glide.ui.polaris.theme.variant` (new `theme` in `GET /me`), live accent and surface swatches, and the current state.
- **"Exclude system tables" is ticked by default** in a new analysis.
- **Verified in the preview (admin, Polaris):** off = teal `rgb(3,117,160)`, on = Polaris `rgb(79,82,189)` with Polaris backgrounds; the page reports "Polaris"; the new Workspace has the box ticked.

---

## 1.14 Icons and card headers

| | |
|---|---|
| **Date** | 2026-10-09 |

- New `Icon` component: a small inline set of single-colour line icons (no dependency), always `aria-hidden` because the text says what each control does.
- Used on:
  - the Security Assistant title (shield, accent colour) and its History / New chat buttons;
  - the header tabs (Workspace, History, Settings);
  - the Workspace section headings (users, table, bolt);
  - Analyze / Compare;
  - run actions (Rerun, Edit, Archive/Restore, Delete, Export) and run tabs (report, matrix, roles);
  - card actions (Compare roles, Use as baseline, Hide/Show column);
  - exports, Download filtered list, Clear filter;
  - History row actions;
  - the Configuration bar (Properties, MCP server, AI providers).
- Arrows and triangles appear only where they mean an action (Analyze, Rerun, Restore, Download). The "3. Run" heading uses a bolt instead of a play triangle.
- Card headers have a faint accent-tinted gradient (follows the user's theme accent when that setting is on; none in print). The option-row info icons are vertically centred.
- Header tabs (Workspace, History, Settings) and the matching segmented switches show a subtle button on hover: soft surface fill, thin outline and a 0.15 s fade (no fade with reduced motion). The selected tab is unchanged.

---

## 1.15 List-view behaviour and operation toggles

| | |
|---|---|
| **Date** | 2026-10-09 |

- **Access matrix:** the "All operations / one operation" dropdown is replaced by **C / R / W / D toggles**, so any combination can be shown. At least one stays on, and *All* restores them. The column headings, sorting, filters and field rows follow the selection.
- **ServiceNow-style lists** (`SortTh` / `useSort`):
  - every sortable heading has a column menu: Sort (a to z), Sort (z to a), Remove sort, Group by, Ungroup;
  - the menu is keyboard-operable (focus moves into it, arrows move between items, Esc closes and returns focus) and positioned against the window;
  - grouped rows sit under collapsible headings with counts (`GroupedRows`);
  - a breadcrumb shows "Grouped by…" and "Sorted by…" with ×, plus Expand all / Collapse all (`ListBreadcrumb`);
  - status columns group by result name; History *Created* groups by day.
  - Applied to the matrix, every difference, report roles, list views, History, changes since original, the Roles tab and live fields. The 3-row per-subject summary stays sort-only.
- **Verified in the preview:**
  - toggling Read off left C/W/D columns;
  - grouping the matrix by "Alva Pennigton delete" gave Denied (2) and Conditional (1);
  - Collapse all, single-group toggling and × all worked;
  - History grouped by Type (Analysis 8 / Comparison 10) and by Created per day;
  - keyboard menu focus, arrows and Esc worked.

---

## 1.16 Open in ServiceNow, cell filters, personalize columns

| | |
|---|---|
| **Date** | 2026-10-09 |

- **List actions** (`ListActions`, `utils/snList.ts`):
  - **Open list** opens the same records in a ServiceNow list view (new window):
    - differences → `sys_security_acl`, one `^NQ` block per table/field + operation;
    - roles → `sys_user_role`;
    - tables → `sys_db_object`;
    - runs → the run table;
    - fields → `sys_dictionary`.
  - Lists longer than 7,000 characters of query must be filtered first.
  - **Copy query** copies the encoded query.
  - **Export** is short, has an icon, and its hover says exactly what is exported.
  - Applied to the report (roles and every difference), list pages, matrix, History, changes since original, Roles tab and live fields. The report's roles table has its own set.
- **Right-click on cells: Show matching / Filter out** (and Group by). Filters appear as removable chips in the breadcrumb; Shift+F10 opens the menu from the keyboard.
- **Personalize columns** (Columns button, `menuitemcheckbox`), remembered per list in this browser (`acl-lens.columns.<list>`). The row-name column is required. Available on every difference, report/list roles, tables list and History.
- Counts, Open list, Copy query and Export follow what is shown after cell filters (`onVisible`).
- **Roomier list pages:** more space between the toolbar, legend, breadcrumb and table, and taller rows.
- **Verified in the preview:**
  - Open list query for 4 CRUD differences found the 14 ACL records behind them;
  - Show matching (Alva = Denied) gave 2 rows, with Open list and Export following;
  - hiding Level and Field kept headings and cells aligned and survived a reload; Show all columns restored them;
  - matrix Filter out took 3 rows to 1.

---

## 1.17 Second PDI install; install-progress fallback

| | |
|---|---|
| **Date** | 2026-10-09 |

- **Installed on a second PDI** with the guided setup, signed in as an existing admin-role account (not `admin`). Scope `x_<company code>_acllens` came from that instance's company code; it was a new install with no existing app. Nothing outside the install was changed.
- **Issue:** after the upload, the SDK's progress poll answered "Forbidden" and the install was reported as failed, although it finished on the instance ("Application installed successfully").
  - The account has `admin` and, through it, `sn_cicd.sys_ci_automation`, the same as `admin`.
  - The cause wasn't found without reinstalling.
- **Fix:** when the SDK can't track progress, `workspace.mjs` follows the install's `sys_execution_tracker` record with a read-only query until it succeeds or fails (tested against the finished tracker).
- **Setup page wording:** step 2 now says "Sign in with an existing account": any existing account with the admin role, never a new account.
- **Local only:** saving a login with the SDK made it the default; restored with `now-sdk auth --use`.
- **Explicit Roles:** on the second PDI the app's API answered 403 "External User Not Authorized" for the install account. That instance has the **Explicit Roles** plugin (`com.glide.explicit_roles`) active, so users need `snc_internal`; the original PDI doesn't have the plugin.
  - The setup page now checks for the plugin (read-only) and mentions `snc_internal` in its next steps only when the plugin is active.
  - `INSTALL.md` states the condition.
  - The app shows a clear notice instead of loading half-empty.
- **Incident (caught and contained):** saving the second PDI's profile from the setup page also made it the **default**, so a plain `npm run deploy` meant for the original PDI targeted the second one.
  - The install failed there ("application was null"), and its rollback context recorded **zero changes**.
  - **Safeguards:** with more than one profile, deploy, package and dev refuse to run without `--profile`; the setup page no longer replaces an existing default; the default was restored.

---

## 1.18 Account-type markers and filter

| | |
|---|---|
| **Date** | 2026-10-09 |

- **`SubjectName` + `AccountIcon`:** an icon-only account-type marker beside compared users in every table's subject headings and in the per-subject and head-to-head summaries. Its hover and accessible name give the type plus flags. No icon for roles, or for older runs without account data.
- **`AccountTypeFilter`:** toggles for each account type present plus Role, on the run page (by the tabs) and on list pages. Applied through `SubjectsProvider` to the matrix, every difference, the report's roles, list pages, Roles tab, details panel and summaries; filtered subjects' cards are dimmed.
- **Verified in the preview (ALR0001014):**
  - 2 user icons ("Account type: Unclassified (identity type not set)"), none for the role;
  - toggles "Unclassified 2 / Role 1";
  - hiding Role removed the itil columns and dimmed its card; showing it restored them.
- Deployed to the original PDI only (`--profile pdi1`).

---

## 1.19 Conditions one click away

| | |
|---|---|
| **Date** | 2026-10-09 |

- Conditional cells in the matrix (table and field rows) are buttons. They open `ConditionPopover` beside the cell:
  - the deciding rules (outcome C) with the ACL link and reason;
  - `ConditionDetail` already expanded (condition, applies-to, security attribute, script when readable, description);
  - "Open full details for this table".
- The panel is positioned against the window (it flips above when there's no room), focus moves into it, Esc closes it and returns focus to the cell, and script lines wrap.
- The cell hover now says "click to see the condition".
- **Verified in the preview:** Alva / create / incident showed the allow-if rule, its script and description; Esc returned focus to the cell.

---

## 1.20 Include extended tables

| | |
|---|---|
| **Date** | 2026-10-09 |

- New filter option `includeChildren` ("Include extended tables"), for every mode except All tables. `Schema.descendants()` walks `super_class` children at any depth.
  - The extra tables are added before the targeted ACL load (and after "secured by roles" resolution).
  - A run note reports how many were added; Max tables still caps the total.
  - The run header shows "extended tables included".
- **Verified on the original PDI:** itil on `task` analyzed 1 table without the option and 127 with it (incident, problem, change_request, asset_task…). The test runs were deleted.


## 1.21 Security Assistant moves to the header

| | |
|---|---|
| **Date** | 2026-10-09 |

- The floating bottom-right launcher covered results (cards and table rows). It is removed.
- An **Assistant** button now sits in the header after a divider, styled like the other header tabs. It toggles the slide-out and sets `aria-expanded`.

## 1.22 Access Analyzer parity

| | |
|---|---|
| **Date** | 2026-10-09 |

The platform's Access Analyzer showed data points ACL Lens didn't have. ACL Lens now pulls at least the same ones.

- **12 table operations.** The engine also evaluates list_edit, query_match, query_range, add_to_list, save_as_template, report_on, personalize_choices and report_view (about 2,600 active rules on the original PDI were previously ignored).
  - Matrix operation toggles, a *CRUD* / *All* switch, tooltips that explain each operation.
  - Differences, drift and CSV exports include them; summary counts stay on the core four.
  - "No rule" per operation follows what the platform does, confirmed with live checks.
- **Security data filters** (`sys_security_data_filter`): loaded per table chain and evaluated per subject (Applied / Not applied / Depends). There's a filter marker in the matrix, a *Data filters* tab in table details, and export rows.
- **Security attributes resolved.** Compound role conditions are evaluated from the subject's roles, so ACLs using them are Granted or Denied instead of Conditional. A missing role is never held.
- **Groups as subjects.** A group's roles plus the roles those contain. Search, cards, record link, the account-type filter and the assistant tool all support it.
- **Check live** in table details: the platform's live evaluation, through the Access Analyzer's "Get access debug logs" data broker, called from the browser.
  - It shows overall access, security data filter, ACL, access handler, data filtration, script, admin override, execution time and the ACL Lens prediction. Each operation expands to every ACL's role, condition, script and attribute results, access handlers and query business rules. It flags records hidden by a query business rule, and exports to CSV.
  - The server can't call that evaluation itself: the platform refuses other scopes (`Unsupported caller scope`), even through the analyzer's public wrapper.
- **Verified on the original PDI:**
  - Run ALR0001025 (Service Desk group, itil, admin) shows the operations, the filters (`sc_catalog` filtered even for admin, who lacks maint) and the group.
  - A live check of the group on `incident` matched ACL Lens on all 12 operations.
  - With a record, the `incident query` business rule hid it and the notice explained why.

## 1.23 Second PDI updated; scope ID guard

| | |
|---|---|
| **Date** | 2026-10-10 |

- The second PDI is updated with everything since its first install: the 12 operations, data filters, groups, Check live, the header Assistant, list counts and spacing. The user removed the read-only role from the install account first.
- **Root cause of the earlier failed updates** ("application was null"): the local profile had been saved again with a newly generated scope ID that didn't match the installed app. The profile was corrected and the install succeeded.
- **Guards:**
  - Saving a profile keeps its scope ID unless a new one is given (CLI and guided setup).
  - `deploy` checks, read-only, that the installed app for the scope has the profile's scope ID. If it doesn't, nothing is installed and the fix command is printed. Verified against the second PDI with a wrong and the right ID.

## 1.24 Reporting dashboard

| | |
|---|---|
| **Date** | 2026-10-10 |

The run storage is unchanged: reports are definitions, and their numbers are calculated from saved runs on request.

- **Measures** (`src/server/engine/report-measures.ts`, pure and offline-tested): each turns a run into facts (subject, account type, table, operation, result, role, ACL, data filter, change). A report filters, groups and counts them, so any report can be regrouped and filtered. There are 12 measures:
  - High risk: privileged roles, changes on high-risk tables, machine accounts that can change data, inactive accounts with access, access gained since the original run.
  - Vulnerabilities: open ACLs that allow changes, allowed with no rule, access decided by scripts.
  - Overview and comparison: access results, data filters, differences, roles held by only some subjects.
- **Tables:** `x_acllens_report` (13 shipped reports, read-only) and `x_acllens_dashboard` (one layout per user). Ownership is enforced in ACLs and in the server code.
- **API:** `/reports`, `/reports/preview`, `/dashboard`, `/dashboard/data`. One request calculates every tile from one run loaded once, and only aggregates are returned, with up to 2,000 rows for drill-down.
- **UI:**
  - A Dashboard header tab, a link at the top of the Workspace, and a "Reporting Dashboard" module in the ServiceNow navigator.
  - Run picker; tiles to move, widen and remove; Add report; Reset.
  - Lightweight accessible SVG/CSS charts (bar, stacked bar, donut, number, list), where a click opens the rows behind it, with Open list, Copy query and Export.
  - Report editor with a live preview: Customize saves a personal copy in the same spot.
  - A shared slide-out panel component (`Drawer`).
- **Also:** cross-scope read privileges for `sys_security_data_filter` and `sys_group_has_role`, used since 1.22.
- **Verified on the original PDI:**
  - The default dashboard on ALR0001027 shows 5,280 results; machine accounts have 236 change operations, with drill-down.
  - Customize saved a copy in place; delete and reset work.
  - A run on high-risk tables (ALR0001028: itil vs admin) shows admin 27 and itil 6 changes allowed on them.


## 1.25 Data filters in the status, machine-account warning, Verify live

| | |
|---|---|
| **Date** | 2026-10-11 |
| **Status** | Built; not yet installed |

Why: ACL Lens's results disagreed with the platform's Access Analyzer for an API-only account. The causes were checks the static analysis didn't fold in or couldn't see.

- **Security data filters change the status** (`applyDataFilters`, `evaluator.ts`): where a filter applies, or may apply, Granted becomes Conditional for every table operation except create. The cell keeps `df` and the ACL-only `acl` status. The matrix popover and the details panel name the filter. Saved runs are unchanged until rerun.
- **Machine and API-only accounts** (`account.ts`): a run warning for machine and AI agent identities, web-service-only and internal integration users. OAuth scopes, REST API access policies and API-level ACLs are not evaluated, statically or live.
- **Verify live** (`LiveVerify.tsx`, `liveVerify.ts`): runs the platform's live evaluation (the existing Access Analyzer data broker call) as the baseline subject for every table the matrix shows, up to 300, and lists where it differs from the prediction. Access handlers and data filtration aren't records, so this is the only way they're covered.
- Offline tests cover the fold and the warning.
