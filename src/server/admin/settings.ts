import { gs, GlideDateTime, GlideSysAttachment } from '@servicenow/glide'
import { chunk, gr } from '../engine/glide.ts'
import { DATA_TABLE, RUN_TABLE } from '../engine/storage.ts'

export const PROPS = {
    historyEnabled: 'x_acllens.history.enabled',
    retentionEnabled: 'x_acllens.history.retention.enabled',
    retentionDays: 'x_acllens.history.retention.days',
    retentionAction: 'x_acllens.history.retention.action',
    instanceTheme: 'x_acllens.ui.instance_theme',
    mcpEnabled: 'x_acllens.mcp.enabled',
}

export interface Settings {
    history_enabled: boolean
    retention_enabled: boolean
    retention_days: number
    retention_action: 'delete' | 'archive'
    instance_theme: boolean
    mcp_enabled: boolean
}

export function historyEnabled(): boolean {
    return gs.getProperty(PROPS.historyEnabled, 'true') !== 'false'
}

export function instanceTheme(): boolean {
    return gs.getProperty(PROPS.instanceTheme, 'false') === 'true'
}

export function mcpEnabled(): boolean {
    return gs.getProperty(PROPS.mcpEnabled, 'false') === 'true'
}

export function getSettings(): Settings {
    const days = parseInt(gs.getProperty(PROPS.retentionDays, '90'), 10)
    return {
        history_enabled: historyEnabled(),
        retention_enabled: gs.getProperty(PROPS.retentionEnabled, 'false') === 'true',
        retention_days: isNaN(days) || days < 1 ? 90 : days,
        retention_action: gs.getProperty(PROPS.retentionAction, 'delete') === 'archive' ? 'archive' : 'delete',
        instance_theme: instanceTheme(),
        mcp_enabled: mcpEnabled(),
    }
}

function setProperty(name: string, value: string) {
    const p = gr('sys_properties')
    if (!p.get('name', name)) throw new Error(`Property ${name} is missing - reinstall the application`)
    p.setValue('value', value)
    p.update()
}

export function saveSettings(input: Partial<Settings>): Settings {
    if (input.history_enabled !== undefined) setProperty(PROPS.historyEnabled, input.history_enabled ? 'true' : 'false')
    if (input.retention_enabled !== undefined) setProperty(PROPS.retentionEnabled, input.retention_enabled ? 'true' : 'false')
    if (input.retention_days !== undefined) {
        const d = Math.floor(Number(input.retention_days))
        if (!(d >= 1 && d <= 3650)) throw new Error('Retention days must be between 1 and 3650')
        setProperty(PROPS.retentionDays, String(d))
    }
    if (input.mcp_enabled !== undefined) setProperty(PROPS.mcpEnabled, input.mcp_enabled ? 'true' : 'false')
    if (input.instance_theme !== undefined) setProperty(PROPS.instanceTheme, input.instance_theme ? 'true' : 'false')
    if (input.retention_action !== undefined) setProperty(PROPS.retentionAction, input.retention_action === 'archive' ? 'archive' : 'delete')
    return getSettings()
}

export interface ClearRequest {
    mode: 'all' | 'range' | 'older_than'
    /** yyyy-mm-dd, inclusive (range mode) */
    from?: string
    to?: string
    /** older_than mode */
    days?: number
    include_archived?: boolean
}

function validDate(s?: string): string {
    if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new Error('Dates must be in YYYY-MM-DD format')
    return s
}

/** Encoded query selecting the runs a clear request targets. */
function clearQuery(req: ClearRequest): string {
    const parts: string[] = []
    if (req.mode === 'range') {
        const from = validDate(req.from)
        const to = validDate(req.to)
        if (from > to) throw new Error('"From" must be on or before "To"')
        // dates are interpreted in the signed-in admin's time zone
        const start = new GlideDateTime()
        start.setDisplayValueInternal(`${from} 00:00:00`)
        const end = new GlideDateTime()
        end.setDisplayValueInternal(`${to} 23:59:59`)
        parts.push(`sys_created_on>=${start.getValue()}`)
        parts.push(`sys_created_on<=${end.getValue()}`)
    } else if (req.mode === 'older_than') {
        const days = Math.floor(Number(req.days))
        if (!(days >= 1)) throw new Error('Enter a number of days (1 or more)')
        const cutoff = new GlideDateTime()
        cutoff.addDaysUTC(-days)
        parts.push(`sys_created_on<${cutoff.getValue()}`)
    } else if (req.mode !== 'all') throw new Error('Unknown clear mode')
    if (!req.include_archived) parts.push('archived=false')
    return parts.join('^')
}

export function previewClear(req: ClearRequest) {
    const r = gr(RUN_TABLE)
    const q = clearQuery(req)
    if (q) r.addEncodedQuery(q)
    r.query()
    return { count: r.getRowCount() }
}

function deleteRuns(query: string): number {
    const ids: string[] = []
    const r = gr(RUN_TABLE)
    if (query) r.addEncodedQuery(query)
    r.query()
    while (r.next()) ids.push(r.getUniqueValue())
    const att = new GlideSysAttachment()
    for (const part of chunk(ids, 200)) {
        const d = gr(DATA_TABLE)
        d.addQuery('run', 'IN', part.join(','))
        d.deleteMultiple()
        // remove exported CSV attachments with their run
        const rr = gr(RUN_TABLE)
        rr.addQuery('sys_id', 'IN', part.join(','))
        rr.query()
        while (rr.next()) {
            try {
                const a = att.getAttachments(RUN_TABLE, rr.getUniqueValue()) as any
                const attIds: string[] = []
                while (a.next()) attIds.push(a.getUniqueValue())
                for (const id of attIds) att.deleteAttachment(id)
            } catch (e) {
                /* attachment cleanup is best effort */
            }
            rr.deleteRecord()
        }
    }
    return ids.length
}

export function clearHistory(req: ClearRequest) {
    const deleted = deleteRuns(clearQuery(req))
    gs.info(`ACL Lens: ${gs.getUserName()} cleared ${deleted} run(s) from history (${JSON.stringify(req)})`)
    return { deleted }
}

/** Daily job: delete or archive runs older than the retention period, when enabled. */
export function applyRetention() {
    const s = getSettings()
    if (!s.retention_enabled) return
    const cutoff = new GlideDateTime()
    cutoff.addDaysUTC(-s.retention_days)
    const query = `sys_created_on<${cutoff.getValue()}^archived=false`
    if (s.retention_action === 'delete') {
        const n = deleteRuns(`sys_created_on<${cutoff.getValue()}`)
        gs.info(`ACL Lens retention: deleted ${n} run(s) older than ${s.retention_days} days`)
        return
    }
    const r = gr(RUN_TABLE)
    r.addEncodedQuery(query)
    r.query()
    let n = 0
    while (r.next()) {
        r.setValue('archived', true)
        r.update()
        n++
    }
    gs.info(`ACL Lens retention: archived ${n} run(s) older than ${s.retention_days} days`)
}

/** Permanently deletes one run with its result data and attachments. */
export function deleteRun(runId: string) {
    if (!/^[0-9a-f]{32}$/.test(runId || '')) throw new Error('Run not found')
    const r = gr(RUN_TABLE)
    if (!r.get(runId)) throw new Error('Run not found')
    const number = r.getValue('number')
    deleteRuns(`sys_id=${runId}`)
    gs.info(`ACL Lens: ${gs.getUserName()} deleted run ${number}`)
    return { deleted: 1, number }
}

export function setArchived(runId: string, archived: boolean) {
    const r = gr(RUN_TABLE)
    if (!r.get(runId)) throw new Error('Run not found')
    r.setValue('archived', archived)
    r.update()
    return { sys_id: runId, archived }
}
