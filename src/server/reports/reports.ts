import { gs } from '@servicenow/glide'
import { gr } from '../engine/glide.ts'
import { loadRun } from '../engine/runs.ts'
import { deleteBlob, getRun, loadBlob, saveBlob } from '../engine/storage.ts'
import { HIGH_RISK_TABLES, measure, measureCatalog, PRIVILEGED_ROLES, ReportDef, ReportOptions, runReport } from '../engine/report-measures.ts'
import { ALL_TABLE_OPS } from '../engine/types.ts'
import { cleanTabs, layoutJson, readLayout, Tile } from './dashboard-layout.ts'
import { CACHE_OVER_MS, reportCacheKey } from './report-cache.ts'

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

const SYS_ID = /^[0-9a-f]{32}$/
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
        run: SYS_ID.test(String(o.run || '')) ? String(o.run) : undefined,
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
    const { tabs, custom } = readLayout(d ? d.getValue('layout') : '', defaultLayout())
    return { tabs, custom, run: d ? d.getValue('run') || '' : '' }
}

export function saveDashboard(body: any) {
    const layout = layoutJson(cleanTabs(body.tabs))
    let d = myDashboard()
    if (!d) {
        d = gr(DASHBOARD)
        d.initialize()
        d.setValue('owner', gs.getUserID())
    }
    d.setValue('layout', layout)
    if (body.run !== undefined) d.setValue('run', SYS_ID.test(String(body.run)) ? String(body.run) : '')
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

function chooseRun(runId: string): string {
    return runId && SYS_ID.test(runId) ? runId : latestRunId()
}

function loadPayload(runId: string) {
    const id = chooseRun(runId)
    if (!id) return null
    const loaded = loadRun(id)
    if (!loaded || !loaded.results) return null
    return loaded
}

/** Loads each run at most once per request, and remembers which ones are slow to load. */
function runLoader() {
    const loaded: { [run: string]: ReturnType<typeof loadPayload> } = {}
    const slow: { [run: string]: boolean } = {}
    return {
        get(id: string) {
            if (loaded[id] === undefined) {
                const started = new Date().getTime()
                loaded[id] = loadPayload(id)
                slow[id] = new Date().getTime() - started >= CACHE_OVER_MS
            }
            return loaded[id]
        },
        isSlow: (id: string) => !!slow[id],
    }
}

/**
 * A report's result for one run. A saved run never changes, so a result that was slow to work out is
 * stored with the run and reused, which spares loading the whole run again. Stored results are
 * removed with the run. Returns null when the run or its results no longer exist.
 */
function cachedReport(runId: string, def: { measure: string; chart: ReportDef['chart']; options: ReportOptions }, runs: ReturnType<typeof runLoader>) {
    const { key, text } = reportCacheKey(def)
    try {
        const hit = loadBlob<{ def: string; data: unknown }>(runId, 'report', key)
        if (hit && hit.def === text) return hit.data
    } catch (e) {
        // two sessions stored it at once: start again
        deleteBlob(runId, 'report', key)
    }
    const loaded = runs.get(runId)
    if (!loaded) return null
    const started = new Date().getTime()
    const data = runReport(def, loaded as any)
    if (runs.isSlow(runId) || new Date().getTime() - started >= CACHE_OVER_MS) {
        try {
            saveBlob(runId, 'report', { def: text, data }, key)
        } catch (e) {
            gs.warn(`ACL Lens: could not store a calculated report for run ${runId}: ${e}`)
        }
    }
    return data
}

/**
 * Calculates the given tiles. A report saved from a run always uses that run; the others use the
 * run the dashboard shows. Only aggregates are returned.
 */
export function dashboardData(body: any) {
    const shown = chooseRun(String(body.run || ''))
    const ids: string[] = Array.isArray(body.reports) ? body.reports.map((x: unknown) => String(x)).slice(0, 40) : []
    const runs = runLoader()
    const reports: { [id: string]: unknown } = {}
    for (const id of ids) {
        try {
            const r = toJson(getReport(id))
            const pinned = r.options.run || ''
            const runId = pinned || shown
            const data: any = runId ? cachedReport(runId, { measure: r.measure, chart: r.chart, options: r.options }, runs) : null
            if (!data) {
                if (pinned) reports[id] = { error: 'The run this report was saved from no longer exists. Edit the report to use the run the dashboard shows, or remove it.' }
                continue
            }
            const source = pinned ? getRun(pinned) : null
            reports[id] = source ? { ...data, source: { sys_id: source.sys_id, number: source.number, name: source.name, created: source.created } } : data
        } catch (e: any) {
            reports[id] = { error: e && e.message ? e.message : String(e) }
        }
    }
    return { run: shown ? getRun(shown) : null, reports }
}

/** One unsaved definition (the editor's live preview). */
export function previewReport(body: any) {
    const v = clean({ name: 'preview', ...(body.report || {}) })
    const runId = chooseRun(v.options.run || String(body.run || ''))
    const data = runId ? cachedReport(runId, { measure: v.measure, chart: v.chart as ReportDef['chart'], options: v.options }, runLoader()) : null
    return data ? { run: getRun(runId), data } : { run: null, data: null }
}

export function reportCatalog() {
    return { measures: measureCatalog(), highRiskTables: HIGH_RISK_TABLES, privilegedRoles: PRIVILEGED_ROLES, operations: ALL_TABLE_OPS, latestRun: latestRunId() ? getRun(latestRunId()) : null }
}
