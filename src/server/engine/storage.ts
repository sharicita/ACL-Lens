import { gs, GlideSysAttachment } from '@servicenow/glide'
import { gr } from './glide.ts'
import { queryText } from './search.ts'

export const RUN_TABLE = 'x_acllens_run'
export const DATA_TABLE = 'x_acllens_run_data'
const CHUNK = 60000

export type BlobKind = 'results' | 'comparison' | 'drift'

/** Stores a JSON payload across ordered rows of the run data table (avoids field size limits). */
export function saveBlob(runId: string, kind: BlobKind, payload: unknown) {
    const text = JSON.stringify(payload)
    for (let seq = 0, pos = 0; pos < text.length || seq === 0; seq++, pos += CHUNK) {
        const d = gr(DATA_TABLE)
        d.initialize()
        d.setValue('run', runId)
        d.setValue('kind', kind)
        d.setValue('seq', seq)
        d.setValue('payload', text.substring(pos, pos + CHUNK))
        d.insert()
    }
}

export function loadBlob<T>(runId: string, kind: BlobKind): T | null {
    const d = gr(DATA_TABLE)
    d.addQuery('run', runId)
    d.addQuery('kind', kind)
    d.orderBy('seq')
    d.query()
    let text = ''
    let found = false
    while (d.next()) {
        found = true
        text += d.getValue('payload') || ''
    }
    return found && text ? (JSON.parse(text) as T) : null
}

export interface RunMeta {
    name: string
    runType: 'analyze' | 'compare'
    subjects: unknown
    filter: unknown
    originalRun?: string
}

export function createRun(meta: RunMeta): string {
    const r = gr(RUN_TABLE)
    r.initialize()
    r.setValue('name', meta.name || '')
    r.setValue('run_type', meta.runType)
    r.setValue('status', 'running')
    r.setValue('subjects', JSON.stringify(meta.subjects))
    r.setValue('filter', JSON.stringify(meta.filter))
    r.setValue('run_by', gs.getUserID())
    if (meta.originalRun) r.setValue('original_run', meta.originalRun)
    return r.insert()
}

export function finishRun(runId: string, values: { [k: string]: string | number }) {
    const r = gr(RUN_TABLE)
    if (!r.get(runId)) return
    for (const k in values) r.setValue(k, values[k])
    r.update()
}

export function attachText(runId: string, fileName: string, contentType: string, content: string) {
    try {
        const r = gr(RUN_TABLE)
        if (r.get(runId)) new GlideSysAttachment().write(r, fileName, contentType, content)
    } catch (e) {
        gs.warn(`ACL Lens: could not attach ${fileName} to run ${runId}: ${e}`)
    }
}

function safeJson(text: string, fallback: unknown) {
    try {
        return text ? JSON.parse(text) : fallback
    } catch (e) {
        return fallback
    }
}

export function runToJson(r: any) {
    return {
        sys_id: r.getUniqueValue(),
        number: r.getValue('number'),
        name: r.getValue('name') || '',
        run_type: r.getValue('run_type'),
        status: r.getValue('status'),
        subjects: safeJson(r.getValue('subjects'), []),
        subject_summary: r.getValue('subject_summary') || '',
        filter: safeJson(r.getValue('filter'), {}),
        summary: safeJson(r.getValue('summary'), {}),
        original_run: r.getValue('original_run') || '',
        original_number: r.getValue('original_run') ? r.getDisplayValue('original_run') : '',
        run_by: r.getDisplayValue('run_by'),
        created: r.getDisplayValue('sys_created_on'),
        duration_ms: parseInt(r.getValue('duration_ms') || '0', 10),
        table_count: parseInt(r.getValue('table_count') || '0', 10),
        diff_count: parseInt(r.getValue('diff_count') || '0', 10),
        error_message: r.getValue('error_message') || '',
        archived: r.getValue('archived') === '1' || r.getValue('archived') === 'true',
    }
}

export function getRun(runId: string) {
    const r = gr(RUN_TABLE)
    return r.get(runId) ? runToJson(r) : null
}

export function listRuns(opts: { limit: number; text?: string; type?: string; originalRun?: string; archived?: boolean }) {
    const r = gr(RUN_TABLE)
    r.addQuery('archived', !!opts.archived)
    if (opts.type) r.addQuery('run_type', opts.type)
    if (opts.originalRun) r.addQuery('original_run', opts.originalRun)
    const text = queryText(opts.text || '')
    if (text) r.addEncodedQuery(`nameLIKE${text}^ORnumberLIKE${text}^ORsubject_summaryLIKE${text}`)
    r.orderByDesc('sys_created_on')
    r.setLimit(opts.limit)
    r.query()
    const out = []
    while (r.next()) {
        const row = runToJson(r) as any
        // rerun count for lineage display
        const c = gr(RUN_TABLE)
        c.addQuery('original_run', row.sys_id)
        c.query()
        row.rerun_count = c.getRowCount()
        out.push(row)
    }
    return out
}
