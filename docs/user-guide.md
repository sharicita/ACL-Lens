# User Guide

Open **ACL Lens → Access Workspace**. Hover over (or tab to) any control for a tooltip. Field help works like ServiceNow field hints: hover or tab to the small **ⓘ** next to a field to read it; nothing is expanded on the page by default.

- **Tips (💡)** suggest what to try next. **×** closes a tip for the rest of your ServiceNow session, in every tab (it can come back after you next sign in); **Don't show again** hides it for good in this browser.
- **Sorting:** every list of results can be sorted. Select a column heading: text sorts A–Z first, numbers and access levels largest / most access first; select again to reverse.

## 1. Run an analysis

1. **Users and roles.** Choose *User* or *Role* and start typing.
   - Users include all their roles: direct, through groups, and inherited. Roles include every role they contain.
   - Add up to 8.
2. **Which tables?**
   - *Tables secured by these roles* (best start): tables whose ACLs name one of the subjects' roles.
   - *Specific tables* / *Table name starts with*: type and pick from the list, or press Enter to use what you typed.
   - *Application scope*: custom `x_` apps appear first, and only scopes you can read are listed.
   - *All tables*: tick *Exclude system tables* to keep it focused.
   - Options: *Include field-level rules*, *Max tables* (default 1,500).
3. **Run.** *Analyze* shows the subjects side by side. *Analyze + run comparison script* also produces the comparison report. Give it a name to find it later in History.

> Comparing against `admin` or other broad roles touches thousands of tables. Use a table list or prefix.

**Search works the same everywhere** (users, roles, tables, scopes and the filters on results):
- Results that **start with** what you typed come first, then results that contain it.
- Matches are highlighted.
- Use ↑/↓ and Enter to pick, Esc to close.
- Lists only show records you are allowed to read.

**Help is always nearby.** Each **?** button opens a short explanation (Esc closes it). Each **book icon** opens the matching ServiceNow documentation in a new window. Each **↗ icon** opens the record itself (user, role, group, table, field or ACL) in a new window, with your own permissions.

## 2. Read the results

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
- **G** Granted · **C** Conditional (decided per record or session) · **D** Denied · **–** No rule (instance default applies).
- Filters: *Differences only*, *Hide tables nobody can access*, operation focus, text filter.
- The **▸** arrow expands field rules: *all other fields (\*)* plus fields with their own rules.

### Roles tab
Compares the subjects' roles in collapsible groups:
- With several subjects: **Held by only some subjects** (these explain most differences) and **Shared by every subject**.
- With one subject: **Assigned directly**, **Granted through groups** and **Inherited from other roles**.
- Use **Expand all** or **Collapse all**, or open one group at a time.
- **Show how each role is assigned** labels each role as *Direct*, *Group: name* (the group links to its record) or *Inherited: parent role*.
- Runs saved before this view existed show less detail; **Rerun** them to get it.

### Table details (click a table name)
- For each operation, the ACL level that matched and every rule checked. Deny-unless rules must all pass; any one allow-if rule is enough.
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

- Click **Security Assistant** (bottom right). It knows the run and table you have open.
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
| **MCP Server** | Turn the MCP endpoint on or off, copy the endpoint, follow the steps to connect an AI tool, test it, and see the tools it offers |
| **Properties** | The settings below |
| **AI Providers** | The Security Assistant's AI connection |

### Properties

| Setting | Effect |
|---|---|
| Save runs to History | Off: runs aren't stored |
| Clean up old runs automatically | Daily at 02:30; keep N days (default 90); then delete or archive |
| Clear history now | Older than N days / date range / all; optionally include archived. **Preview** shows the count first; deleting can't be undone |
| Use the instance theme | Off (default): ACL Lens's own light theme. On: backgrounds, text and borders follow the instance's Next Experience theme. Access colours never change |

### MCP server

Lets AI tools outside ServiceNow (for example Claude Code or VS Code) use ACL Lens's read-only security tools. It is **off by default**.

1. **ACL Lens → Configuration → MCP Server**: turn on **Allow MCP clients** (saved immediately).
2. Each person connects as themselves (OAuth recommended) and needs the ACL Lens user role. Tools run with that person's permissions and can't change anything.
3. Copy the example for your tool, then use **Test the endpoint now**.

Turning it off makes the endpoint refuse every request straight away.

### AI providers

**AI Providers** (admin): configure Now Assist (not available on free developer instances) or an external provider, then use **Test connection**. The endpoint must belong to the chosen Type (HTTPS). Tick *Allow custom endpoint* only for an approved company AI gateway. See [05 §2](architecture/05-ai-assistant-and-mcp.md#2-providers).
