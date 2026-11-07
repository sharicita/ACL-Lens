// What the Security Assistant is told about the page it is opened over. Each page describes itself
// in a few short lines of plain facts (no row data), sent with every question. Tested offline.
import type { AnalysisFilter, AnalysisResult, Comparison, DriftResult, RunRecord } from '../types'
import type { DashTab, ReportData } from '../dashboard/types'

export interface ScreenContext {
    run_id?: string
    run_number?: string
    subjects?: string[]
    table?: string
    view?: string
    /** the page's name, shown in the panel */
    page?: string
    /** the dashboard tab that is open, shown in the panel */
    tab?: string
    /** what the page shows right now */
    summary?: string[]
}

const STATUS: { [s: string]: string } = { G: 'Granted', C: 'Conditional', D: 'Denied', N: 'No rule' }
const FILTER: { [m: string]: string } = { secured_by_roles: 'tables secured by the subjects’ roles', tables: 'specific tables', prefix: 'table name starts with', scope: 'application scope', all: 'all tables' }

const n = (x: number) => x.toLocaleString('en-US')

function runName(r: RunRecord): string {
    return `${r.number}${r.name ? ` "${r.name}"` : ''}`
}

function filterText(f: AnalysisFilter | undefined): string {
    if (!f) return ''
    const parts = [`${FILTER[f.mode] || f.mode}${f.value ? `: ${f.value}` : ''}`]
    if (f.includeFields === false) parts.push('record rules only')
    if (f.excludeSystem) parts.push('system tables excluded')
    if (f.startAfter) parts.push(`starting after table ${f.startAfter}`)
    if (f.api) parts.push('evaluated as API access')
    return parts.join(', ')
}

/** One report as it appears on screen: its total and largest groups. */
export function reportLine(name: string, data?: ReportData): string {
    if (!data) return `Report "${name}": still calculating.`
    if (data.error) return `Report "${name}": could not be calculated (${data.error}).`
    const from = data.source ? ` from run ${data.source.number} (sys_id ${data.source.sys_id})` : ''
    const groups = (data.groups || [])
        .slice(0, 8)
        .map((g) => `${g.label} ${n(g.value)}`)
        .join(', ')
    return `Report "${name}"${from}: ${n(data.total)} ${data.unit}${groups ? `, by ${data.groupBy || 'group'}: ${groups}` : ''}.${data.note ? ` ${data.note}` : ''}`
}

export function dashboardContext(args: { tab?: DashTab; shownRun: RunRecord | null; reports: { name: string; data?: ReportData }[]; detail?: string }): ScreenContext {
    const { tab, shownRun, reports, detail } = args
    const sources = reports.map((r) => r.data && r.data.source).filter((s) => !!s) as NonNullable<ReportData['source']>[]
    const everyReportSame = reports.length > 0 && sources.length === reports.length && sources.every((s) => s.sys_id === sources[0].sys_id)
    const summary: string[] = []
    if (tab) summary.push(`Dashboard tab "${tab.title}"${tab.description ? `: ${tab.description}` : ''}. ${reports.length} report${reports.length === 1 ? '' : 's'} on it.`)
    if (shownRun && !everyReportSame) summary.push(`The dashboard's Data from run is ${runName(shownRun)} (sys_id ${shownRun.sys_id}): ${shownRun.subject_summary || 'no subjects recorded'}.`)
    for (const r of reports) summary.push(reportLine(r.name, r.data))
    if (detail) summary.push(detail)
    return {
        view: 'dashboard',
        page: 'Reporting dashboard',
        tab: tab ? tab.title : undefined,
        run_id: everyReportSame ? sources[0].sys_id : shownRun ? shownRun.sys_id : undefined,
        run_number: everyReportSame ? sources[0].number : shownRun ? shownRun.number : undefined,
        summary,
    }
}

const VIEW_NAME: { [v: string]: string } = { comparison: 'Comparison report', matrix: 'Side-by-side matrix', roles: 'Roles' }

export function runContext(payload: { run: RunRecord; results: AnalysisResult | null; comparison: Comparison | null; drift: DriftResult | null }, view: string): ScreenContext {
    const { run, results, comparison, drift } = payload
    const summary = [`Run ${runName(run)} (${run.run_type === 'compare' ? 'comparison' : 'analysis'}), created ${run.created}, ${n(run.table_count)} tables, ${filterText(run.filter)}. Showing: ${VIEW_NAME[view] || view}.`]
    if (run.status === 'error') summary.push(`This run failed: ${run.error_message}`)
    if (results) {
        const c = results.coverage
        if (c) summary.push(`Covers tables ${n(c.from)} to ${n(c.to)} of ${n(c.total)} matched, so counts are for this set only.`)
        for (const s of results.subjects) {
            const ops = Object.keys(s.counts)
                .map((op) => `${op}: ${n(s.counts[op].G || 0)} granted, ${n(s.counts[op].C || 0)} conditional, ${n(s.counts[op].D || 0)} denied`)
                .join('; ')
            summary.push(`${s.subject.label} (${s.subject.type}, ${s.subject.roles.length} roles). ${ops}.`)
        }
    }
    if (comparison) {
        const x = comparison.summary
        summary.push(`Comparison: ${n(x.tablesCompared)} tables compared, ${n(x.tablesDifferent)} differ, ${n(x.tablesIdentical)} identical; ${n(x.tableCellsDifferent)} table cells and ${n(x.fieldCellsDifferent)} field cells differ.`)
    }
    if (drift && run.original_run) summary.push(`Changes since original run ${run.original_number}: ${n(drift.total)}.`)
    return {
        view: 'run',
        page: 'Run',
        run_id: run.sys_id,
        run_number: run.number,
        subjects: (results ? results.subjects : []).map((s) => `${s.subject.label} (${s.subject.type})`),
        summary,
    }
}

/** The table-details panel: each subject's result for each table operation. */
export function tableLine(table: string, rows: { label: string; ops: { [op: string]: { s: string } } }[]): string {
    const who = rows.map((r) => {
        const ops = Object.keys(r.ops)
            .map((op) => `${op} ${STATUS[r.ops[op].s] || r.ops[op].s}`)
            .join(', ')
        return `${r.label}: ${ops}`
    })
    return `Table details are open for ${table}. ${who.join('. ')}.`
}

export function workspaceContext(draft: { name?: string; subjects: { label: string; type: string }[]; filter: AnalysisFilter }): ScreenContext {
    const summary = [`Setting up a run${draft.name ? ` named "${draft.name}"` : ''}: tables to analyze are ${filterText(draft.filter)}.`]
    summary.push(draft.subjects.length ? `Subjects chosen: ${draft.subjects.map((s) => `${s.label} (${s.type})`).join(', ')}.` : 'No subjects chosen yet.')
    return { view: 'workspace', page: 'Workspace', summary }
}

export function historyContext(runs: RunRecord[], filtered: boolean): ScreenContext {
    const summary = [`${n(runs.length)} saved runs listed${filtered ? ' (filtered)' : ''}.`]
    for (const r of runs.slice(0, 15)) summary.push(`${runName(r)}: ${r.run_type}, ${r.status}, ${r.subject_summary || 'no subjects'}, ${r.created}.`)
    return { view: 'history', page: 'History', summary }
}
