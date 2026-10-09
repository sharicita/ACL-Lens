import { AnalysisResult, FIELD_OPS, Status, TABLE_OPS } from './types.ts'

export interface DiffRow {
    kind: 'table' | 'field'
    t: string
    l: string
    f: string
    op: string
    statuses: Status[]
}

export interface PairSummary {
    a: string
    b: string
    aMore: number
    bMore: number
    same: number
}

export interface Comparison {
    subjects: { key: string; label: string; type: string }[]
    defaultDeny: boolean
    summary: {
        tablesCompared: number
        tablesIdentical: number
        tablesDifferent: number
        tableCellsDifferent: number
        fieldCellsDifferent: number
        perSubject: { key: string; granted: number; conditional: number; denied: number; exclusive: number }[]
    }
    roles: { role: string; has: boolean[] }[]
    pairs: PairSummary[]
    diffs: DiffRow[]
}

/** Access strength used to decide who has "more" access. */
export function rank(s: Status, defaultDeny: boolean): number {
    if (s === 'G') return 2
    if (s === 'C') return 1
    if (s === 'N') return defaultDeny ? 0 : 2
    return 0
}

function allSame(list: Status[]): boolean {
    for (let i = 1; i < list.length; i++) if (list[i] !== list[0]) return false
    return true
}

/** Script comparison across all subjects of an analysis. */
export function compare(result: AnalysisResult): Comparison {
    const subs = result.subjects
    if (subs.length < 2) throw new Error('Comparison needs at least two subjects')
    const dd = result.defaultDeny
    const diffs: DiffRow[] = []
    let tablesIdentical = 0
    let tableCellsDifferent = 0
    let fieldCellsDifferent = 0
    const exclusive = subs.map(() => 0)
    const pairs: PairSummary[] = []
    for (let a = 0; a < subs.length; a++)
        for (let b = a + 1; b < subs.length; b++)
            pairs.push({ a: subs[a].subject.key, b: subs[b].subject.key, aMore: 0, bMore: 0, same: 0 })

    const tally = (statuses: Status[]) => {
        let p = 0
        for (let a = 0; a < subs.length; a++)
            for (let b = a + 1; b < subs.length; b++) {
                const ra = rank(statuses[a], dd)
                const rb = rank(statuses[b], dd)
                if (ra > rb) pairs[p].aMore++
                else if (rb > ra) pairs[p].bMore++
                else pairs[p].same++
                p++
            }
        const withAccess = statuses.map((s) => rank(s, dd) > 0)
        if (withAccess.filter((x) => x).length === 1) exclusive[withAccess.indexOf(true)]++
    }

    const tableCount = subs[0].tables.length
    for (let ti = 0; ti < tableCount; ti++) {
        const base = subs[0].tables[ti]
        let tableDiffers = false
        for (const op of TABLE_OPS) {
            const statuses = subs.map((s) => s.tables[ti].ops[op].s)
            tally(statuses)
            if (!allSame(statuses)) {
                tableDiffers = true
                tableCellsDifferent++
                diffs.push({ kind: 'table', t: base.t, l: base.l, f: '', op, statuses })
            }
        }
        // field rows are generated from the same ACL index, so they line up across subjects
        for (let fi = 0; fi < base.fields.length; fi++) {
            for (const op of FIELD_OPS) {
                const statuses = subs.map((s) => (s.tables[ti].fields[fi] ? s.tables[ti].fields[fi].ops[op].s : 'N'))
                if (!allSame(statuses)) {
                    tableDiffers = true
                    fieldCellsDifferent++
                    diffs.push({ kind: 'field', t: base.t, l: base.l, f: base.fields[fi].f, op, statuses })
                }
            }
        }
        if (!tableDiffers) tablesIdentical++
    }

    const roleNames: { [r: string]: boolean } = {}
    for (const s of subs) for (const r of s.subject.roles) roleNames[r] = true
    const roles = Object.keys(roleNames)
        .sort()
        .map((role) => ({ role, has: subs.map((s) => s.subject.roles.indexOf(role) >= 0) }))

    return {
        subjects: subs.map((s) => ({ key: s.subject.key, label: s.subject.label, type: s.subject.type })),
        defaultDeny: dd,
        summary: {
            tablesCompared: tableCount,
            tablesIdentical,
            tablesDifferent: tableCount - tablesIdentical,
            tableCellsDifferent,
            fieldCellsDifferent,
            perSubject: subs.map((s, i) => {
                let g = 0
                let c = 0
                let d = 0
                for (const op of TABLE_OPS) {
                    g += s.counts[op].G
                    c += s.counts[op].C
                    d += s.counts[op].D + (dd ? s.counts[op].N : 0)
                    if (!dd) g += s.counts[op].N
                }
                return { key: s.subject.key, granted: g, conditional: c, denied: d, exclusive: exclusive[i] }
            }),
        },
        roles,
        pairs,
        diffs,
    }
}

export interface DriftRow {
    subject: string
    kind: 'table' | 'field'
    t: string
    f: string
    op: string
    from: Status
    to: Status
}

/** Differences between an original run and its rerun (same subjects), capped for storage. */
export function drift(original: AnalysisResult, rerun: AnalysisResult, cap = 2000) {
    const rows: DriftRow[] = []
    let total = 0
    const notes: string[] = []
    for (const now of rerun.subjects) {
        const before = original.subjects.filter((s) => s.subject.key === now.subject.key)[0]
        if (!before) {
            notes.push(`${now.subject.label} was not in the original run`)
            continue
        }
        const added = now.subject.roles.filter((r) => before.subject.roles.indexOf(r) < 0)
        const removed = before.subject.roles.filter((r) => now.subject.roles.indexOf(r) < 0)
        if (added.length) notes.push(`${now.subject.label}: roles added ${added.join(', ')}`)
        if (removed.length) notes.push(`${now.subject.label}: roles removed ${removed.join(', ')}`)

        const prev: { [t: string]: (typeof before.tables)[number] } = {}
        for (const t of before.tables) prev[t.t] = t
        for (const t of now.tables) {
            const p = prev[t.t]
            if (!p) continue
            for (const op of TABLE_OPS) {
                if (p.ops[op].s !== t.ops[op].s) {
                    total++
                    if (rows.length < cap) rows.push({ subject: now.subject.label, kind: 'table', t: t.t, f: '', op, from: p.ops[op].s, to: t.ops[op].s })
                }
            }
            const pf: { [f: string]: (typeof p.fields)[number] } = {}
            for (const f of p.fields) pf[f.f] = f
            for (const f of t.fields) {
                const o = pf[f.f]
                if (!o) continue
                for (const op of FIELD_OPS) {
                    if (o.ops[op].s !== f.ops[op].s) {
                        total++
                        if (rows.length < cap) rows.push({ subject: now.subject.label, kind: 'field', t: t.t, f: f.f, op, from: o.ops[op].s, to: f.ops[op].s })
                    }
                }
            }
        }
        const beforeTables = before.tables.length
        if (beforeTables !== now.tables.length) notes.push(`${now.subject.label}: table set changed (${beforeTables} -> ${now.tables.length})`)
    }
    return { total, rows, notes, truncated: total > rows.length }
}

const STATUS_TEXT: { [s: string]: string } = { G: 'Granted', C: 'Conditional', D: 'Denied', N: 'No rule' }

function csvCell(v: string | number): string {
    const s = String(v === undefined || v === null ? '' : v)
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** Excel friendly CSV of the comparison differences. */
export function comparisonCsv(cmp: Comparison): string {
    const head = ['Level', 'Table', 'Table label', 'Field', 'Operation'].concat(cmp.subjects.map((s) => `${s.label} (${s.type})`))
    const lines = [head.map(csvCell).join(',')]
    for (const d of cmp.diffs) {
        const row: (string | number)[] = [d.kind, d.t, d.l, d.f, d.op].concat(d.statuses.map((s) => STATUS_TEXT[s]))
        lines.push(row.map(csvCell).join(','))
    }
    return lines.join('\r\n')
}
