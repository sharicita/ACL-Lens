import { AnalysisResult, Comparison, DriftResult, FIELD_OPS, RunPayload, TABLE_OPS } from '../types'
import { download, safeName, toCsv } from './download'
import { statusText } from './status'

/** Full access matrix: one row per table and per explicit field rule. */
export function exportMatrixCsv(results: AnalysisResult, fileBase: string, onlyTables?: Set<string>) {
    const subs = results.subjects
    const dd = results.defaultDeny
    const head = ['Level', 'Table', 'Table label', 'Field', 'Operation']
        .concat(subs.map((s) => `${s.subject.label} (${s.subject.type})`))
        .concat(['Different'])
    const rows: unknown[][] = [head]
    subs[0]?.tables.forEach((t, ti) => {
        if (onlyTables && !onlyTables.has(t.t)) return
        for (const op of TABLE_OPS) {
            const st = subs.map((s) => s.tables[ti].ops[op].s)
            rows.push(['table', t.t, t.l, '', op].concat(st.map((x) => statusText(x, dd))).concat([new Set(st).size > 1 ? 'yes' : '']))
        }
        t.fields.forEach((f, fi) => {
            for (const op of FIELD_OPS) {
                const st = subs.map((s) => s.tables[ti].fields[fi]?.ops[op].s || 'N')
                rows.push(['field', t.t, t.l, f.f === '*' ? '* (all other fields)' : f.f, op].concat(st.map((x) => statusText(x, dd))).concat([new Set(st).size > 1 ? 'yes' : '']))
            }
        })
    })
    download(`${safeName(fileBase)}-matrix.csv`, toCsv(rows), 'text/csv;charset=utf-8')
}

export function exportComparisonCsv(cmp: Comparison, fileBase: string) {
    const head = ['Level', 'Table', 'Table label', 'Field', 'Operation'].concat(cmp.subjects.map((s) => `${s.label} (${s.type})`))
    const rows: unknown[][] = [head]
    for (const d of cmp.diffs) {
        rows.push([d.kind === 'table' ? 'Table' : 'Field', d.t, d.l, d.kind === 'table' ? '' : d.f === '*' ? '* (all other fields)' : d.f, d.op].concat(d.statuses.map((s) => statusText(s, cmp.defaultDeny))))
    }
    rows.push([])
    rows.push(['Roles'].concat(cmp.subjects.map((s) => s.label)))
    for (const r of cmp.roles) rows.push([r.role].concat(r.has.map((h) => (h ? 'yes' : ''))))
    download(`${safeName(fileBase)}-comparison.csv`, toCsv(rows), 'text/csv;charset=utf-8')
}

/** The differences currently shown in the comparison report (after the user's filter). */
export function exportFilteredDiffsCsv(cmp: Comparison, diffs: Comparison['diffs'], fileBase: string, filterText: string) {
    const rows: unknown[][] = [[`Filtered: ${filterText} (${diffs.length} of ${cmp.diffs.length} differences)`], []]
    rows.push(['Level', 'Table', 'Table label', 'Field', 'Operation'].concat(cmp.subjects.map((s) => `${s.label} (${s.type})`)))
    for (const d of diffs) rows.push([d.kind === 'table' ? 'Table' : 'Field', d.t, d.l, d.kind === 'table' ? '' : d.f === '*' ? '* (all other fields)' : d.f, d.op].concat(d.statuses.map((s) => statusText(s, cmp.defaultDeny))))
    download(`${safeName(fileBase)}-differences-filtered.csv`, toCsv(rows), 'text/csv;charset=utf-8')
}

export function exportDriftCsv(drift: DriftResult, fileBase: string) {
    const rows: unknown[][] = [['Subject', 'Level', 'Table', 'Field', 'Operation', 'Original', 'Rerun']]
    for (const r of drift.rows) rows.push([r.subject, r.kind, r.t, r.f, r.op, statusText(r.from, true), statusText(r.to, true)])
    download(`${safeName(fileBase)}-changes.csv`, toCsv(rows), 'text/csv;charset=utf-8')
}

export function exportJson(payload: RunPayload, fileBase: string) {
    download(`${safeName(fileBase)}.json`, JSON.stringify(payload, null, 2), 'application/json')
}
