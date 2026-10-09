import { AnalysisResult, Comparison, DiffRow, Status, SubjectResult, TABLE_OPS } from '../types'

/** How a subject holds a role: given explicitly (direct, group, the selected role) or inherited. */
export type Holding = 'explicit' | 'inherited' | ''

function isExplicit(kind: string | undefined, via: string) {
    if (kind) return kind === 'direct' || kind === 'group' || kind === 'selected'
    return !/inherit|contain/i.test(via)
}

export interface RoleRow {
    role: string
    held: Holding[]
    /** every subject has it */
    shared: boolean
    /** every subject has it explicitly */
    explicitAll: boolean
}

export function roleRows(cmp: Comparison, subjects: SubjectResult[]): RoleRow[] {
    const by: { [key: string]: { [role: string]: boolean } } = {}
    for (const sr of subjects) {
        const m: { [role: string]: boolean } = {}
        for (const src of sr.subject.roleSources || []) m[src.role] = m[src.role] || isExplicit(src.kind, src.via || '')
        by[sr.subject.key] = m
    }
    return cmp.roles.map((r) => {
        const held: Holding[] = r.has.map((h, i) => {
            if (!h) return ''
            const m = by[cmp.subjects[i].key]
            return m && m[r.role] === false ? 'inherited' : 'explicit'
        })
        const shared = r.has.every((h) => h)
        return { role: r.role, held, shared, explicitAll: shared && held.every((x) => x === 'explicit') }
    })
}

export interface TableRow {
    t: string
    l: string
    /** differing record + field cells on this table */
    diffs: number
    /** record (CRUD) status per subject, in TABLE_OPS order */
    ops: Status[][]
}

export function tableRows(results: AnalysisResult, cmp: Comparison | null): TableRow[] {
    const count: { [t: string]: number } = {}
    if (cmp) for (const d of cmp.diffs) count[d.t] = (count[d.t] || 0) + 1
    const first = results.subjects[0]
    if (!first) return []
    return first.tables.map((t, ti) => ({
        t: t.t,
        l: t.l,
        diffs: count[t.t] || 0,
        ops: results.subjects.map((s) => TABLE_OPS.map((op) => (s.tables[ti] ? s.tables[ti].ops[op].s : 'N'))),
    }))
}

export type ListKind = 'roles-explicit' | 'roles-inherited' | 'roles-unshared' | 'tables' | 'tables-differ' | 'fields-differ' | 'crud-differ'

export const LIST_TITLES: { [k in ListKind]: string } = {
    'roles-explicit': 'Explicit roles in common',
    'roles-inherited': 'Inherited roles in common',
    'roles-unshared': 'Roles not shared',
    tables: 'Tables compared',
    'tables-differ': 'Tables that differ',
    'fields-differ': 'Field rules that differ',
    'crud-differ': 'Table (CRUD) rules that differ',
}

export function isListKind(v: string | null): v is ListKind {
    return !!v && v in LIST_TITLES
}

export function filterRoles(rows: RoleRow[], kind: ListKind): RoleRow[] {
    if (kind === 'roles-explicit') return rows.filter((r) => r.explicitAll)
    if (kind === 'roles-inherited') return rows.filter((r) => r.shared && !r.explicitAll)
    return rows.filter((r) => !r.shared)
}

export function filterDiffs(diffs: DiffRow[], kind: ListKind): DiffRow[] {
    return diffs.filter((d) => (kind === 'fields-differ' ? d.kind === 'field' : d.kind === 'table'))
}

/** Address of a report list; opened in a new window. */
export function listUrl(runId: string, kind: ListKind): string {
    const p = new URLSearchParams({ view: 'list', id: runId, list: kind })
    return `${window.location.pathname}?${p}`
}
