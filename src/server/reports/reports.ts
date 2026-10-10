import { gs } from '@servicenow/glide'
import { gr } from '../engine/glide.ts'
import { loadRun } from '../engine/runs.ts'
import { getRun } from '../engine/storage.ts'
import { HIGH_RISK_TABLES, measure, measureCatalog, PRIVILEGED_ROLES, ReportDef, ReportOptions, runReport } from '../engine/report-measures.ts'
import { ALL_TABLE_OPS } from '../engine/types.ts'

const REPORT = 'x_acllens_report'
const DASHBOARD = 'x_acllens_dashboard'
const ADMIN_ROLE = 'x_acllens.admin'

export interface ReportJson {
    sys_id: string
    name: string
    description: string
    category: string
    measure: string
    chart: ReportDef['chart']
    options: ReportOptions
    owner: string
    owner_name: string
    shared: boolean
    system: boolean
    on_default: boolean
    copied_from: string
    mine: boolean
    can_edit: boolean
}

const bool = (v: string) => v === '1' || v === 'true'

function parse(text: string): ReportOptions {
    try {
        return text ? JSON.parse(text) : {}
    } catch (e) {
        return {}
    }
}

function toJson(r: any): ReportJson {
    const me = gs.getUserID()
    const system = bool(r.getValue('system'))
    const mine = r.getValue('owner') === me
    return {
        sys_id: r.getUniqueValue(),
        name: r.getValue('name') || '',
        description: r.getValue('description') || '',
        category: r.getValue('category') || 'overview',
        measure: r.getValue('measure') || '',
        chart: (r.getValue('chart') || 'bar') as ReportDef['chart'],
        options: parse(r.getValue('options')),
        owner: r.getValue('owner') || '',
        owner_name: r.getValue('owner') ? r.getDisplayValue('owner') : '',
        shared: bool(r.getValue('shared')),
        system,
        on_default: bool(r.getValue('on_default')),
        copied_from: r.getValue('copied_from') || '',
        mine,
        can_edit: !system && (mine || gs.hasRole(ADMIN_ROLE)),
    }
}

function visible(r: any): boolean {
    return bool(r.getValue('system')) || bool(r.getValue('shared')) || r.getValue('owner') === gs.getUserID() || gs.hasRole(ADMIN_ROLE)
}

/** Reports the signed-in user can see: shipped, shared and their own. */
export function listReports(): ReportJson[] {
    const r = gr(REPORT)
    r.orderBy('order')
    r.orderBy('name')
    r.query()
    const out: ReportJson[] = []
    while (r.next()) if (visible(r)) out.push(toJson(r))
    return out
}

function getReport(id: string): any {
    const r = gr(REPORT)
    if (!r.get(id) || !visible(r)) throw new Error('Report not found')
    return r
}

function clean(def: any): { name: string; description: string; category: string; measure: string; chart: string; options: ReportOptions } {
    const m = measure(String(def.measure || ''))
    if (!m) throw new Error('Choose what the report measures')
    const chart = ['tile', 'bar', 'donut', 'list'].indexOf(def.chart) >= 0 ? def.chart : 'bar'
    const o = def.options || {}
    const strings = (v: unknown) => (Array.isArray(v) ? v.map((x) => String(x)).filter((x) => !!x).slice(0, 200) : undefined)
    const options: ReportOptions = {
        ops: strings(o.ops),
        statuses: strings(o.statuses),
        kinds: strings(o.kinds),
        tables: strings(o.tables),
        roles: strings(o.roles),
        tableText: o.tableText ? String(o.tableText).substring(0, 100) : undefined,
        groupBy: o.groupBy === '' ? '' : m.dims.indexOf(o.groupBy) >= 0 ? o.groupBy : m.groupBy,
        limit: o.limit ? Math.max(1, Math.min(50, parseInt(String(o.limit), 10) || 10)) : undefined,
    }
    const name = String(def.name || '').trim().substring(0, 100)
    if (!name) throw new Error('Give the report a name')
    return {
        name,
        description: String(def.description || '').substring(0, 1000),
        category: ['overview', 'high_risk', 'vulnerability', 'comparison'].indexOf(def.category) >= 0 ? def.category : m.category,
        measure: m.id,
        chart,
        options: JSON.parse(JSON.stringify(options)),
    }
}

/** Creates the user's own report, or updates one they may edit. Shipped reports are never changed. */
export function saveReport(def: any): ReportJson {
    const v = clean(def)
    let r: any
    if (def.sys_id) {
        r = getReport(String(def.sys_id))
        if (!toJson(r).can_edit) throw new Error('This report is read-only. Customize it to save your own copy.')
    } else {
        r = gr(REPORT)
        r.initialize()
        r.setValue('owner', gs.getUserID())
        r.setValue('order', 500)
        if (def.copied_from) r.setValue('copied_from', String(def.copied_from))
    }
    r.setValue('name', v.name)
    r.setValue('description', v.description)
    r.setValue('category', v.category)
    r.setValue('measure', v.measure)
    r.setValue('chart', v.chart)
    r.setValue('options', JSON.stringify(v.options))
    // only ACL Lens admins share reports with everyone
    if (gs.hasRole(ADMIN_ROLE) && def.shared !== undefined) r.setValue('shared', !!def.shared)
    const id = def.sys_id ? (r.update(), r.getUniqueValue()) : r.insert()
    return toJson(getReport(id))
}

export function deleteReport(id: string) {
    const r = getReport(id)
    if (!toJson(r).can_edit) throw new Error('This report is read-only')
    r.deleteRecord()
    return { deleted: true }
}

// ---- dashboards ---------------------------------------------------------------

export interface Tile {
    report: string
    size: 1 | 2
}

function defaultLayout(): Tile[] {
    const r = gr(REPORT)
    r.addQuery('on_default', true)
    r.addQuery('system', true)
    r.orderBy('order')
    r.query()
    const out: Tile[] = []
    while (r.next()) out.push({ report: r.getUniqueValue(), size: 1 })
    return out
}

function myDashboard(): any {
    const d = gr(DASHBOARD)
    d.addQuery('owner', gs.getUserID())
    d.setLimit(1)
    d.query()
    return d.next() ? d : null
}

export function getDashboard() {
    const d = myDashboard()
    let layout: Tile[] = defaultLayout()
    let custom = false
    let run = ''
    if (d) {
        try {
            const saved = JSON.parse(d.getValue('layout') || '[]')
            if (Array.isArray(saved)) {
                layout = saved
                custom = true
            }
        } catch (e) {
            /* keep the default */
        }
        run = d.getValue('run') || ''
    }
    return { layout, custom, run }
}

export function saveDashboard(body: any) {
    const layout: Tile[] = Array.isArray(body.layout)
        ? body.layout
              .filter((t: any) => t && /^[0-9a-f]{32}$/.test(String(t.report)))
              .slice(0, 40)
              .map((t: any) => ({ report: String(t.report), size: t.size === 2 ? 2 : 1 }))
        : []
    let d = myDashboard()
    if (!d) {
        d = gr(DASHBOARD)
        d.initialize()
        d.setValue('owner', gs.getUserID())
    }
    d.setValue('layout', JSON.stringify(layout))
    if (body.run !== undefined) d.setValue('run', /^[0-9a-f]{32}$/.test(String(body.run)) ? String(body.run) : '')
    if (d.isNewRecord()) d.insert()
    else d.update()
    return getDashboard()
}

/** Back to the default dashboard (the user's own reports are kept). */
export function resetDashboard() {
    const d = myDashboard()
    if (d) d.deleteRecord()
    return getDashboard()
}

// ---- data -------------------------------------------------------------------

/** The newest complete, non-archived run. */
function latestRunId(): string {
    const r = gr('x_acllens_run')
    r.addQuery('status', 'complete')
    r.addQuery('archived', false)
    r.orderByDesc('sys_created_on')
    r.setLimit(1)
    r.query()
    return r.next() ? r.getUniqueValue() : ''
}

function loadPayload(runId: string) {
    const id = runId && /^[0-9a-f]{32}$/.test(runId) ? runId : latestRunId()
    if (!id) return null
    const loaded = loadRun(id)
    if (!loaded || !loaded.results) return null
    return loaded
}

/** Calculates every tile of a dashboard from one run (loaded once). Only aggregates are returned. */
export function dashboardData(body: any) {
    const loaded = loadPayload(String(body.run || ''))
    if (!loaded) return { run: null, reports: {} }
    const ids: string[] = Array.isArray(body.reports) ? body.reports.map((x: unknown) => String(x)).slice(0, 40) : []
    const reports: { [id: string]: unknown } = {}
    for (const id of ids) {
        try {
            const r = toJson(getReport(id))
            reports[id] = runReport({ measure: r.measure, chart: r.chart, options: r.options }, loaded as any)
        } catch (e: any) {
            reports[id] = { error: e && e.message ? e.message : String(e) }
        }
    }
    return { run: loaded.run, reports }
}

/** One unsaved definition (the editor's live preview). */
export function previewReport(body: any) {
    const loaded = loadPayload(String(body.run || ''))
    if (!loaded) return { run: null, data: null }
    const v = clean({ name: 'preview', ...(body.report || {}) })
    return { run: loaded.run, data: runReport({ measure: v.measure, chart: v.chart as ReportDef['chart'], options: v.options }, loaded as any) }
}

export function reportCatalog() {
    return { measures: measureCatalog(), highRiskTables: HIGH_RISK_TABLES, privilegedRoles: PRIVILEGED_ROLES, operations: ALL_TABLE_OPS, latestRun: latestRunId() ? getRun(latestRunId()) : null }
}
