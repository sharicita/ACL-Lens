import { compare, Comparison, DriftRow, rank } from './compare.ts'
import { AnalysisResult, Cell, Status, SubjectResult, TABLE_OPS } from './types.ts'

/**
 * Reporting dashboard: the measures behind every report. Each measure turns a saved run into
 * "facts" (one per subject × table × operation, role, ACL…). A report then filters the facts,
 * groups them by any dimension and counts them, so users can regroup and filter any pre-built
 * report. Pure functions, no Glide: covered by the offline tests.
 */

export type Dim = 'subject' | 'kind' | 'table' | 'operation' | 'status' | 'role' | 'acl' | 'level' | 'change' | 'filter'

export interface Fact {
    subject?: string
    kind?: string
    table?: string
    tableLabel?: string
    field?: string
    operation?: string
    status?: string
    role?: string
    acl?: string
    level?: string
    change?: string
    filter?: string
}

export interface ReportOptions {
    /** operations to include (table operations) */
    ops?: string[]
    /** result labels to include (Granted, Conditional, Denied, No rule…) */
    statuses?: string[]
    /** only these tables (high-risk list, or a user's own list) */
    tables?: string[]
    /** table name or label contains */
    tableText?: string
    /** account types to include (Human, Machine / service, Role, Group…) */
    kinds?: string[]
    /** roles that count as privileged */
    roles?: string[]
    groupBy?: Dim | ''
    /** how many groups to chart (the rest are summed as "Other") */
    limit?: number
}

export interface ReportDef {
    measure: string
    chart: 'tile' | 'bar' | 'donut' | 'list'
    options: ReportOptions
}

export interface ReportGroup {
    key: string
    label: string
    value: number
    /** per-result split for stacked bars (status label -> count) */
    parts?: { [status: string]: number }
}

export interface ReportData {
    measure: string
    unit: string
    total: number
    groupBy: Dim | ''
    groups: ReportGroup[]
    columns: { key: Dim | 'tableLabel' | 'field'; label: string }[]
    rows: Fact[]
    rowsTruncated: boolean
    /** tables in the result (for "Open list in ServiceNow") */
    tables: string[]
    note?: string
}

export interface RunPayload {
    results: AnalysisResult | null
    comparison?: Comparison | null
    drift?: { rows: DriftRow[] } | null
}

export const DIM_LABEL: { [d: string]: string } = {
    subject: 'Subject',
    kind: 'Account type',
    table: 'Table',
    operation: 'Operation',
    status: 'Result',
    role: 'Role',
    acl: 'ACL',
    level: 'Level',
    change: 'Change',
    filter: 'Data filter',
}

/** Tables whose create/write/delete access is high risk: identity, security, code and configuration. */
export const HIGH_RISK_TABLES = [
    'sys_user',
    'sys_user_role',
    'sys_user_has_role',
    'sys_user_group',
    'sys_user_grmember',
    'sys_group_has_role',
    'sys_user_role_contains',
    'sys_security_acl',
    'sys_security_acl_role',
    'sys_security_attribute',
    'sys_security_data_filter',
    'sys_properties',
    'sys_script',
    'sys_script_include',
    'sys_script_client',
    'sys_ui_action',
    'sys_ui_script',
    'sysauto_script',
    'sys_db_object',
    'sys_dictionary',
    'sys_app',
    'sys_plugins',
    'sys_rest_message',
    'sys_auth_profile_basic',
    'oauth_entity',
    'sys_certificate',
    'discovery_credentials',
    'sys_user_preference',
]

/** Roles that give broad or security-relevant power. */
export const PRIVILEGED_ROLES = ['admin', 'security_admin', 'user_admin', 'impersonator', 'maint', 'oauth_admin', 'web_service_admin', 'cert_admin', 'import_admin', 'credential_admin']

const STATUS_LABEL: { [s: string]: string } = { G: 'Granted', C: 'Conditional', D: 'Denied', N: 'No rule' }
const CHANGE_OPS = ['create', 'write', 'delete']

/** What the platform does without a rule (mirrors the client's status rules). */
const NO_RULE: { [op: string]: boolean } = {
    query_match: true,
    report_on: true,
    list_edit: false,
    add_to_list: false,
    save_as_template: false,
    personalize_choices: false,
}
function noRuleAllows(op: string, defaultDeny: boolean) {
    return op in NO_RULE ? NO_RULE[op] : !defaultDeny
}

export function kindOf(s: SubjectResult['subject']): string {
    if (s.type === 'role') return 'Role'
    if (s.type === 'group') return 'Group'
    const a = s.account
    if (!a) return 'Not recorded'
    if (a.identity === 'machine' || a.webServiceOnly || a.integrationUser) return 'Machine / service'
    if (a.identity === 'ai_agent') return 'AI agent'
    if (a.identity === 'human') return 'Human'
    return 'Unclassified'
}

function isMachine(s: SubjectResult['subject']) {
    return kindOf(s) === 'Machine / service' || kindOf(s) === 'AI agent'
}

type Ctx = { payload: RunPayload; opts: ReportOptions; emit: (f: Fact) => void }

function cells(ctx: Ctx, each: (s: SubjectResult, ti: number, op: string, cell: Cell) => void) {
    const r = ctx.payload.results
    if (!r) return
    const ops = r.ops && r.ops.length ? r.ops : TABLE_OPS
    for (const s of r.subjects)
        s.tables.forEach((t, ti) => {
            for (const op of ops) if (t.ops[op]) each(s, ti, op, t.ops[op])
        })
}

function cellFact(s: SubjectResult, ti: number, op: string, status: string): Fact {
    const t = s.tables[ti]
    return { subject: s.subject.label, kind: kindOf(s.subject), table: t.t, tableLabel: t.l, operation: op, status, level: 'Table' }
}

function canAct(st: Status, op: string, dd: boolean) {
    return st === 'G' || st === 'C' || (st === 'N' && noRuleAllows(op, dd))
}

export interface MeasureDef {
    id: string
    label: string
    category: 'overview' | 'high_risk' | 'vulnerability' | 'comparison'
    description: string
    unit: string
    dims: Dim[]
    groupBy: Dim
    facts: (ctx: Ctx) => void
    /** the result needs a comparison (2+ subjects) or a rerun */
    needs?: 'comparison' | 'drift'
}

export const MEASURES: MeasureDef[] = [
    {
        id: 'access',
        label: 'Access results',
        category: 'overview',
        description: 'Every subject × table × operation result in the run.',
        unit: 'results',
        dims: ['subject', 'kind', 'table', 'operation', 'status'],
        groupBy: 'subject',
        facts: (ctx) => cells(ctx, (s, ti, op, c) => ctx.emit(cellFact(s, ti, op, STATUS_LABEL[c.s]))),
    },
    {
        id: 'differences',
        label: 'Differences between subjects',
        category: 'comparison',
        description: 'Table and field rules where the subjects get different results.',
        unit: 'differences',
        dims: ['table', 'operation', 'level', 'subject'],
        groupBy: 'table',
        needs: 'comparison',
        facts: (ctx) => {
            const r = ctx.payload.results
            let cmp = ctx.payload.comparison
            if (!cmp && r && r.subjects.length > 1) cmp = compare(r)
            if (!cmp) return
            for (const d of cmp.diffs) {
                // credit the difference to every subject with the most access
                const best = Math.max(...d.statuses.map((x) => rank(x, cmp!.defaultDeny)))
                const top = cmp.subjects.filter((_s, i) => rank(d.statuses[i], cmp!.defaultDeny) === best).map((s) => s.label)
                ctx.emit({ table: d.t, tableLabel: d.l, field: d.f, operation: d.op, level: d.kind === 'table' ? 'Table' : 'Field', subject: top.join(', ') })
            }
        },
    },
    {
        id: 'privileged',
        label: 'Privileged roles held',
        category: 'high_risk',
        description: 'Subjects holding admin or other powerful roles (directly, through groups or inherited).',
        unit: 'role assignments',
        dims: ['subject', 'kind', 'role'],
        groupBy: 'subject',
        facts: (ctx) => {
            const r = ctx.payload.results
            if (!r) return
            const set: { [x: string]: boolean } = {}
            for (const x of ctx.opts.roles && ctx.opts.roles.length ? ctx.opts.roles : PRIVILEGED_ROLES) set[x] = true
            for (const s of r.subjects) for (const role of s.subject.roles) if (set[role]) ctx.emit({ subject: s.subject.label, kind: kindOf(s.subject), role })
        },
    },
    {
        id: 'high_risk_tables',
        label: 'Changes allowed on high-risk tables',
        category: 'high_risk',
        description: 'Create, write or delete allowed on identity, security, code and configuration tables.',
        unit: 'operations allowed',
        dims: ['subject', 'kind', 'table', 'operation', 'status'],
        groupBy: 'subject',
        facts: (ctx) => {
            const r = ctx.payload.results
            if (!r) return
            const dd = r.defaultDeny
            const list: { [t: string]: boolean } = {}
            for (const t of ctx.opts.tables && ctx.opts.tables.length ? ctx.opts.tables : HIGH_RISK_TABLES) list[t] = true
            cells(ctx, (s, ti, op, c) => {
                if (!list[s.tables[ti].t] || CHANGE_OPS.indexOf(op) < 0) return
                if (canAct(c.s, op, dd)) ctx.emit(cellFact(s, ti, op, STATUS_LABEL[c.s]))
            })
        },
    },
    {
        id: 'machine_changes',
        label: 'Machine and integration accounts that can change data',
        category: 'high_risk',
        description: 'Non-human accounts (machine identities, web-service-only and integration users) allowed to create, write or delete.',
        unit: 'operations allowed',
        dims: ['subject', 'table', 'operation', 'status'],
        groupBy: 'subject',
        facts: (ctx) => {
            const r = ctx.payload.results
            if (!r) return
            cells(ctx, (s, ti, op, c) => {
                if (!isMachine(s.subject) || CHANGE_OPS.indexOf(op) < 0) return
                if (canAct(c.s, op, r.defaultDeny)) ctx.emit(cellFact(s, ti, op, STATUS_LABEL[c.s]))
            })
        },
    },
    {
        id: 'inactive_access',
        label: 'Inactive accounts with access',
        category: 'high_risk',
        description: 'Users who are inactive but still hold roles that grant access (a risk if they are reactivated).',
        unit: 'operations allowed',
        dims: ['subject', 'table', 'operation', 'status'],
        groupBy: 'subject',
        facts: (ctx) => {
            const r = ctx.payload.results
            if (!r) return
            cells(ctx, (s, ti, op, c) => {
                if (s.subject.type !== 'user' || s.subject.active) return
                if (c.s === 'G' || c.s === 'C') ctx.emit(cellFact(s, ti, op, STATUS_LABEL[c.s]))
            })
        },
    },
    {
        id: 'open_acls',
        label: 'Open ACLs that allow changes',
        category: 'vulnerability',
        description: 'Create, write or delete granted by an ACL with no role, condition or script: anyone who can reach the table passes.',
        unit: 'operations allowed',
        dims: ['acl', 'table', 'operation', 'subject'],
        groupBy: 'acl',
        facts: (ctx) => {
            const r = ctx.payload.results
            if (!r) return
            cells(ctx, (s, ti, op, c) => {
                if (CHANGE_OPS.indexOf(op) < 0 || c.s !== 'G') return
                const open = c.a.filter((o) => o.r === 'P' && o.c === 'open' && r.acls[o.i] && r.acls[o.i].decision === 'allow')
                for (const o of open) ctx.emit({ ...cellFact(s, ti, op, 'Granted'), acl: r.acls[o.i].name })
            })
        },
    },
    {
        id: 'no_rule_allowed',
        label: 'Allowed with no rule',
        category: 'vulnerability',
        description: 'Operations no ACL protects, where the platform allows them anyway (instance default "allow", or an operation the platform allows without a rule).',
        unit: 'operations',
        dims: ['table', 'operation', 'subject'],
        groupBy: 'operation',
        facts: (ctx) => {
            const r = ctx.payload.results
            if (!r) return
            const want = ctx.opts.ops && ctx.opts.ops.length ? null : CHANGE_OPS.concat(['read'])
            cells(ctx, (s, ti, op, c) => {
                if (c.s !== 'N' || !noRuleAllows(op, r.defaultDeny)) return
                if (want && want.indexOf(op) < 0) return
                ctx.emit(cellFact(s, ti, op, 'No rule (allowed)'))
            })
        },
    },
    {
        id: 'scripted',
        label: 'Access decided by scripts',
        category: 'vulnerability',
        description: 'Results that depend on an ACL script. Scripts are not checked statically: review them, or use Check live with a record.',
        unit: 'results',
        dims: ['table', 'operation', 'subject', 'acl'],
        groupBy: 'table',
        facts: (ctx) => {
            const r = ctx.payload.results
            if (!r) return
            cells(ctx, (s, ti, op, c) => {
                if (c.s !== 'C') return
                const o = c.a.filter((x) => x.c === 'script' && r.acls[x.i])[0]
                if (o) ctx.emit({ ...cellFact(s, ti, op, 'Conditional'), acl: r.acls[o.i].name })
            })
        },
    },
    {
        id: 'data_filters',
        label: 'Security data filters',
        category: 'overview',
        description: 'Security data filters on the analyzed tables and whether they hide rows from each subject.',
        unit: 'filter results',
        dims: ['subject', 'table', 'filter', 'status'],
        groupBy: 'status',
        facts: (ctx) => {
            const r = ctx.payload.results
            if (!r || !r.dataFilters) return
            const text: { [k: string]: string } = { A: 'Applied', N: 'Not applied', C: 'Depends' }
            for (const s of r.subjects)
                for (const t of s.tables)
                    for (const o of t.sdf || []) {
                        const f = r.dataFilters[o.i]
                        if (f) ctx.emit({ subject: s.subject.label, kind: kindOf(s.subject), table: t.t, tableLabel: t.l, filter: `${f.mode} ${f.securityAttribute || '(always)'}`, status: text[o.r] })
                    }
        },
    },
    {
        id: 'unshared_roles',
        label: 'Roles held by only some subjects',
        category: 'comparison',
        description: 'Roles that explain most differences: held by some of the compared subjects but not all.',
        unit: 'role assignments',
        dims: ['role', 'subject', 'kind'],
        groupBy: 'subject',
        facts: (ctx) => {
            const r = ctx.payload.results
            if (!r || r.subjects.length < 2) return
            const count: { [role: string]: number } = {}
            for (const s of r.subjects) for (const role of s.subject.roles) count[role] = (count[role] || 0) + 1
            for (const s of r.subjects) for (const role of s.subject.roles) if (count[role] < r.subjects.length) ctx.emit({ role, subject: s.subject.label, kind: kindOf(s.subject) })
        },
    },
    {
        id: 'access_gained',
        label: 'Access gained since the original run',
        category: 'high_risk',
        description: 'On a rerun: results that gave more access than in the run it was rerun from.',
        unit: 'changes',
        dims: ['subject', 'table', 'operation', 'change', 'level'],
        groupBy: 'subject',
        needs: 'drift',
        facts: (ctx) => {
            const r = ctx.payload.results
            const d = ctx.payload.drift
            if (!r || !d) return
            for (const row of d.rows)
                if (rank(row.to, r.defaultDeny) > rank(row.from, r.defaultDeny))
                    ctx.emit({ subject: row.subject, table: row.t, field: row.f, operation: row.op, level: row.kind === 'table' ? 'Table' : 'Field', change: `${STATUS_LABEL[row.from]} → ${STATUS_LABEL[row.to]}` })
        },
    },
]

const BY_ID: { [id: string]: MeasureDef } = {}
for (const m of MEASURES) BY_ID[m.id] = m

export function measure(id: string): MeasureDef | undefined {
    return BY_ID[id]
}

function keep(f: Fact, o: ReportOptions): boolean {
    if (o.ops && o.ops.length && f.operation && o.ops.indexOf(f.operation) < 0) return false
    if (o.statuses && o.statuses.length && f.status && o.statuses.indexOf(f.status) < 0) return false
    if (o.kinds && o.kinds.length && f.kind && o.kinds.indexOf(f.kind) < 0) return false
    if (o.tableText) {
        const q = o.tableText.toLowerCase()
        if (f.table === undefined) return false
        if (f.table.toLowerCase().indexOf(q) < 0 && (f.tableLabel || '').toLowerCase().indexOf(q) < 0) return false
    }
    return true
}

const MAX_ROWS = 2000

/** Runs a report definition against a saved run. */
export function runReport(def: ReportDef, payload: RunPayload): ReportData {
    const m = BY_ID[def.measure]
    if (!m) throw new Error(`Unknown report measure ${def.measure}`)
    const o = def.options || {}
    const groupBy: Dim | '' = o.groupBy === '' ? '' : o.groupBy && m.dims.indexOf(o.groupBy) >= 0 ? o.groupBy : m.groupBy
    const groups: { [k: string]: ReportGroup } = {}
    const rows: Fact[] = []
    const tables: { [t: string]: boolean } = {}
    let total = 0
    const emit = (f: Fact) => {
        if (!keep(f, o)) return
        total++
        if (rows.length < MAX_ROWS) rows.push(f)
        if (f.table) tables[f.table] = true
        if (!groupBy) return
        const key = String((f as any)[groupBy] || '(none)')
        const g = groups[key] || (groups[key] = { key, label: groupBy === 'table' && f.tableLabel ? `${f.tableLabel} (${key})` : key, value: 0 })
        g.value++
        if (f.status && groupBy !== 'status') {
            g.parts = g.parts || {}
            g.parts[f.status] = (g.parts[f.status] || 0) + 1
        }
    }
    m.facts({ payload, opts: o, emit })

    let list = Object.keys(groups)
        .map((k) => groups[k])
        .sort((a, b) => b.value - a.value || (a.label < b.label ? -1 : 1))
    const limit = o.limit && o.limit > 0 ? Math.floor(o.limit) : def.chart === 'donut' ? 6 : 10
    if (list.length > limit) {
        const rest = list.slice(limit)
        const other: ReportGroup = { key: '__other', label: `Other (${rest.length})`, value: 0 }
        for (const g of rest) {
            other.value += g.value
            if (g.parts) {
                other.parts = other.parts || {}
                for (const p in g.parts) other.parts[p] = (other.parts[p] || 0) + g.parts[p]
            }
        }
        list = list.slice(0, limit).concat([other])
    }

    const present = m.dims.filter((d) => rows.some((f) => (f as any)[d] !== undefined && (f as any)[d] !== ''))
    const columns: ReportData['columns'] = []
    for (const d of present) {
        columns.push({ key: d, label: DIM_LABEL[d] })
        if (d === 'table' && rows.some((f) => f.field)) columns.push({ key: 'field', label: 'Field' })
    }

    const out: ReportData = { measure: m.id, unit: m.unit, total, groupBy, groups: list, columns, rows, rowsTruncated: total > rows.length, tables: Object.keys(tables).sort() }
    const r = payload.results
    if (m.needs === 'comparison' && r && r.subjects.length < 2) out.note = 'This run has one subject, so there is nothing to compare.'
    if (m.needs === 'drift' && !payload.drift) out.note = 'Only a rerun has an original run to compare with. Rerun this analysis to see changes.'
    if (m.id === 'high_risk_tables' && r && !total) {
        const list2 = o.tables && o.tables.length ? o.tables : HIGH_RISK_TABLES
        const inRun = r.subjects[0] ? r.subjects[0].tables.filter((t) => list2.indexOf(t.t) >= 0).length : 0
        if (!inRun) out.note = 'None of the high-risk tables were part of this run. Analyze them (Specific tables, with "Exclude system tables" unticked) to check them.'
    }
    return out
}

/** Every option a measure supports, for the editor. */
export function measureCatalog() {
    return MEASURES.map((m) => ({ id: m.id, label: m.label, category: m.category, description: m.description, unit: m.unit, dims: m.dims, groupBy: m.groupBy }))
}

