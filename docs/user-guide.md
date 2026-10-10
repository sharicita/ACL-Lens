# User Guide

Open **ACL Lens → Access Workspace**. Hover over (or tab to) any control for a tooltip. Field help works like ServiceNow field hints: hover or tab to the small **ⓘ** next to a field to read it; nothing is expanded on the page by default.

- **Tips (💡)** suggest what to try next. **×** closes a tip for the rest of your ServiceNow session, in every tab (it can come back after you next sign in); **Don't show again** hides it for good in this browser.
- **Lists work like ServiceNow list views:**
  - Select a column heading to sort: text A–Z first, numbers and access levels largest first. Select again to reverse.
  - Each heading has a **column menu** (⋮, shown on hover or focus) with *Sort (a to z)*, *Sort (z to a)*, *Remove sort*, **Group by** that column, and *Ungroup*.
  - Grouped rows sit under collapsible headings with counts, for example *Type: Comparison (10)*.
  - A bar above the list shows what is applied ("Grouped by …", "Sorted by …"); select **×** to remove one. **Expand all / Collapse all** work on the groups.
  - Status columns group by result (Granted, Conditional, Denied…); History's *Created* groups by day.
  - **Right-click a cell** (or Shift+F10) for **Show matching** / **Filter out**. Each filter appears in the bar above the list, removable with ×. The same menu offers *Group by*.
  - **Columns** (on the right of that bar) personalizes a list: untick columns to hide them (the row name always stays). The choice is remembered per list in this browser; *Show all columns* restores them.
  - **Open list** opens the same items as real records in a ServiceNow list view in a new window:
    - differences → their ACL records (each table or field with its operation);
    - roles → *sys_user_role*;
    - tables → *sys_db_object*;
    - runs → run records;
    - fields → dictionary entries.

    Your own permissions apply there. Very long lists must be filtered first.
  - **Copy query** copies the ServiceNow encoded query for those records, to paste into any list filter.
  - **Export** downloads what is shown as CSV; hover it to see exactly what is included.

## 1. Run an analysis

1. **Users, roles and groups.** Choose *User*, *Role* or *Group* and start typing.
   - Users include all their roles: direct, through groups, and inherited. Roles include every role they contain. Groups include the roles they give their members (and the roles those contain): what a new member gets from the group alone.
   - Add up to 8.
2. **Which tables?**
   - *Tables secured by these roles* (best start): tables whose ACLs name one of the subjects' roles.
   - *Specific tables* / *Table name starts with*: type and pick from the list, or press Enter to use what you typed.
   - *Application scope*: custom `x_` apps appear first, and only scopes you can read are listed.
   - *All tables*: *Exclude system tables* (ticked by default) keeps it focused.
   - Options: *Include extended tables* (also analyze every table that extends the selected ones, at any depth; e.g. `task` adds `incident`, `problem`, `change_request`…), *Include field-level rules*, *Max tables* (default 1,500).
3. **Run.** *Analyze* shows the subjects side by side. *Analyze + run comparison script* also produces the comparison report. Give it a name to find it later in History.

> Comparing against `admin` or other broad roles touches thousands of tables. Use a table list or prefix.

**Search works the same everywhere** (users, roles, tables, scopes and the filters on results):
- Results that **start with** what you typed come first, then results that contain it.
- Matches are highlighted.
- Use ↑/↓ and Enter to pick, Esc to close.
- Lists only show records you are allowed to read.

**Help is always nearby.** Each **?** button opens a short explanation (Esc closes it). Each **book icon** opens the matching ServiceNow documentation in a new window. Each **↗ icon** opens the record itself (user, role, group, table, field or ACL) in a new window, with your own permissions.

## 2. Read the results

### Account types

- **Account icon:** wherever users are compared (matrix, report, roles, list pages, details panel, summaries), a small icon beside a user's name shows the **account type**: human, machine / service, AI agent, or unclassified. Hover over it (or tab to it) to read it, for example *Account type: Machine / service account · API only*. Roles have no icon. Runs saved before account types were recorded show no icon.
- **Account types filter:** next to the result tabs, and on list pages, toggles for each type in the run (and **Role**) hide or show those subjects in every table on the page. Hidden subjects' cards are dimmed. At least one type stays shown; **All** shows everything again.

### Subject cards

One card per user or role:

| Part | What it tells you |
|---|---|
| Name **↗** | Opens the user or role record |
| Account badge (users) | **Human**, **Machine / service**, **AI agent** or **Unclassified**, from the user's *Identity type*. **API only** means *Web service access only*; **integration** means an internal integration user. |
| Flags | *admin*, *inactive*, *no roles* (hover for what each means) |
| Table counts | For each operation: how many of the analyzed tables are **Granted**, **Conditional** or **Denied** for this subject |
| *N roles · M only here* | How many roles, and how many no other subject has. Hover for how they are assigned and how many are shared with each other subject |
| **Compare roles** | Opens the *Roles* tab with the full detail |

Cards stay short on purpose; the tables in the tabs and report lists hold the detail.

**Add user or role** (the dashed card with **+**, after the last subject): pick a user or role to add. The same tables are analyzed again with everyone plus your choice, and the result opens as a **new run** (the current run is unchanged). Up to 8 subjects.

### The baseline

The **baseline** is the user or role that everyone else is compared to **on this screen**.
- In the matrix, a result that differs from the baseline gets a **purple outline**.
- The first subject is the baseline until you choose **Use as baseline** on another card.

| Question | Answer |
|---|---|
| Does it change the saved run or the report? | No. It only changes the purple outlines you see. The comparison report always compares everyone with everyone. |
| Is it remembered? | Yes, for this run, **in this browser**. It is still set when you come back later, even after signing out. |
| Does it carry to other runs, devices or people? | No. Each run starts with its first subject as the baseline for everyone else. |

### Matrix
- **Click any C (Conditional) cell** (table or field row) to see right there **why it's Conditional**: the rule(s) that decide record by record, with the condition, the script (if you can read ACL scripts) and the description already open. *Open full details* goes to the table panel. Esc closes it.
- **G** Granted · **C** Conditional (decided per record or session) · **D** Denied · **–** No rule. For create/read/write/delete, no rule means the instance default (`glide.sm.default_mode`) applies. For the other operations the platform has its own answer: *query_match* and *report_on* are allowed, *list_edit*, *add_to_list*, *save_as_template* and *personalize_choices* are blocked. Hover a cell to see which.
- **Operations:** C, R, W, D show by default. Turn on the other table operations the platform checks: **LE** list_edit (edit from a list), **QM** query_match (filter with is / is not / is empty), **QR** query_range (filter with starts with, contains, greater than… and sort), **AL** add_to_list (personalize list columns), **ST** save_as_template, **RO** report_on (create reports), **PC** personalize_choices, **RV** report_view (see the table in reports). *All* shows every operation and **Reset** returns to C, R, W, D; at least one stays on. Runs saved before these operations were analyzed show C, R, W, D only; **Rerun** them to get the rest.
- **Security data filters:** a filter icon beside a table name means the table (or a table it extends) has security data filters. They hide rows even where the ACLs grant access. The icon is highlighted when a filter applies to someone shown; hover it for each subject's result.
- The bar above every list starts with the **record count**, worded like a ServiceNow list: "23 tables", "1 to 100 of 340 tables" when only the first rows are shown, and "(filtered from N)" after *Show matching* / *Filter out*.
- Other filters: *Differences only*, *Hide tables nobody can access*, and a text filter.
- The **▸** arrow expands field rules: *all other fields (\*)* plus fields with their own rules.

### Roles tab
Compares the subjects' roles in collapsible groups:
- With several subjects: **Held by only some subjects** (these explain most differences) and **Shared by every subject**.
- With one subject: **Assigned directly**, **Granted through groups** and **Inherited from other roles**.
- Use **Expand all** or **Collapse all**, or open one group at a time.
- **Show how each role is assigned** labels each role as *Direct*, *Group: name* (the group links to its record) or *Inherited: parent role*.
- Runs saved before this view existed show less detail; **Rerun** them to get it.

### Table details (click a table name)
- **Record rules:** for each operation, the ACL level that matched and every rule checked. Deny-unless rules must all pass; any one allow-if rule is enough. *Other operations* (list edit, query, reports…) are under a collapsible section.
- **Security attributes** that are role checks (most platform attributes, such as *HasAdminRole*) are worked out exactly from the subject's roles. Only scripted or other attributes stay Conditional.
- **Data filters** (when the table has any): each security data filter with its mode (*Filter if* / *Filter unless*), security attribute, the filter itself, where it comes from, and **Applied / Not applied / Depends** for each subject.
- **Check live** (needs the `admin`, `user_admin` or `access_analyzer_admin` role, enforced by the platform): pick a subject, optionally a record sys_id and a field, and select *Check live*. The platform evaluates access right now, exactly like its **Access Analyzer**, and ACL Lens shows the same columns: *Overall access*, *Security data filter*, *ACL*, *Access handler*, *Data filtration*, *Script*, *Admin override*, *Execution time*, plus **ACL Lens prediction** for comparison. Expand an operation (**▸**) for every ACL checked (roles, condition, script and security attribute results), access handlers, data filters and query business rules. With a record, conditions and scripts are evaluated for that record; if a query business rule hides the record from the subject, ACL Lens says so. *Export* downloads it as CSV. Nothing is saved or changed.
- **Conditional results:** select **Show the condition** (or *script* / *security attribute*) under a rule. It shows what the record must match, the script (if you are allowed to read ACL scripts) and the rule's description. Nothing loads until you ask.
- Header links open the **table definition** and its **records**. Rule names open the ACL record; field names open the dictionary entry.
- *Field rules → Load all fields (live)* evaluates every column, with CSV export.
- *Ask assistant* starts a chat about the table. The assistant opens on top of the details panel.
- Keyboard: focus moves into the panel when it opens, Tab stays inside it, and Esc or *Close* returns you to the table you came from.

## 3. Comparison report

**Summary tiles** work like a report: hover or focus a tile for its definition, and **select it to open the full list in a new window** (sortable, filterable, exportable to CSV).

| Tile | Meaning |
|---|---|
| Explicit roles in common | Roles every subject was given explicitly: directly, through a group, or (for a role) the role itself |
| Inherited roles in common | Roles every subject has, where at least one gets it only because another role contains it |
| Roles not shared | Roles only some subjects hold. These usually explain the differences |
| Tables compared | Tables in the analysis. *N with identical access* = every subject gets exactly the same result for every record operation and field rule on that table |
| Tables differ | Tables with at least one different record or field result |
| Field rules differ | Field × operation pairs (read/write on a field) with a different result |
| Table (CRUD) rules differ | Table × operation pairs (create/read/write/delete on whole records) with a different result |

- **Per subject** and **Head to head** count table × operation cells per subject and per pair.
- **Roles:** every role with a ✓ per subject (marked *inherited* when it only comes from another role).
  - Untick **Shared roles** to list only the roles that differ.
  - *How each role is assigned* opens the Roles tab.
- **Every difference:** filter by text and choose **Show**: *Table and field rules*, *Table (CRUD) rules* or *Field rules*. The **Level** column says which each row is; table rules show "—" in the Field column.
  - Once a filter is set, a green **Download filtered list** button exports just those rows as CSV, and **Clear filter** resets it.
  - **Export comparison CSV** (top) always exports everything. The same CSV is attached to the run record.

## 4. History and reruns

- **History** lists saved runs. Search by number, name or subject.
- **Rerun** re-evaluates the same users, roles and tables with today's data. It saves a new run linked to the original and shows **Changes since original run** (status changes and roles added or removed). This is useful as before/after evidence in a change record.
- **Exports:** comparison CSV, full or filtered matrix CSV, raw JSON, Print / save as PDF.
- **Admins:** *Archive* hides a run without deleting it; *Show archived* → *Restore* brings it back.
- **Admins, on a run page:** **Archive** / **Restore**, and **Delete**. Delete asks for confirmation first and permanently removes the run, its results and attachments (its reruns are kept but lose the link back).
- If an admin has turned History off, runs still display but aren't saved and can't be rerun.

## 5. Security Assistant

- Click **Assistant** in the header (top right, after Settings). It knows the run and table you have open.
- Ask, for example:
  - *"Why can't Abel update incidents?"*
  - *"Review the ACLs on incident against best practices."*
  - *"How should I secure a new custom table?"*
- It only looks up what **you** can access and never changes anything. If you lack access to something, it says so.
- Answers include steps, testing and rollback. Tools used are listed under each answer. **History** reopens earlier chats.

## 6. Configuration (ACL Lens admins)

Everything that configures the app sits under **ACL Lens → Configuration** in the navigator, and under the **Settings** tab in the app. Only `admin` and `x_acllens.admin` can see or change it.

| Module | What it's for |
|---|---|
| **Properties** | The settings below |
| **MCP Server** | Turn the MCP endpoint on or off, copy the endpoint, follow the steps to connect an AI tool, test it, and see the tools it offers |
| **AI Providers** | The Security Assistant's AI connection |

### Properties

| Setting | Effect |
|---|---|
| Save runs to History | Off: runs aren't stored |
| Clean up old runs automatically | Daily at 02:30; keep N days (default 90); then delete or archive |
| Clear history now | Older than N days / date range / all; optionally include archived. **Preview** shows the count first; deleting can't be undone |
| Follow each user's ServiceNow theme | Off (default): ACL Lens's own fixed colours. On: everyone sees ACL Lens in the theme they chose in ServiceNow (*Preferences → Theme*), including dark appearance: accent, backgrounds, text and borders. The page shows **Your theme** with a live preview. Access colours never change |

### MCP server

Lets AI tools outside ServiceNow (for example Claude Code or VS Code) use ACL Lens's read-only security tools. It is **off by default**.

1. **ACL Lens → Configuration → MCP Server**: turn on **Allow MCP clients** (saved immediately).
2. Each person connects as themselves (OAuth recommended) and needs the ACL Lens user role. Tools run with that person's permissions and can't change anything.
3. Copy the example for your tool, then use **Test the endpoint now**.

Turning it off makes the endpoint refuse every request straight away.

### AI providers

**AI Providers** (admin): configure Now Assist (not available on free developer instances) or an external provider, then use **Test connection**. The endpoint must belong to the chosen Type (HTTPS). Tick *Allow custom endpoint* only for an approved company AI gateway. See [05 §2](architecture/05-ai-assistant-and-mcp.md#2-providers).
