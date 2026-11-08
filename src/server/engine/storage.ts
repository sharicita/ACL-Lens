import { gs, GlideSysAttachment } from '@servicenow/glide'
import { gr } from './glide.ts'
import { queryText } from './search.ts'

export const RUN_TABLE = 'x_acllens_run'
export const DATA_TABLE = 'x_acllens_run_data'
const ADMIN_ROLE = 'x_acllens.admin'
const CHUNK = 60000
/** Target size of one stored part. Parts are parsed one at a time, so this bounds the largest string held. */
const PART_SIZE = 500000
/** Items in a list longer than this are stored as separate parts. */
const DETACH_OVER = 20

/** Application property (ACL Lens > Properties): the most a single saved run result may take, in MB. */
export const MAX_RESULT_PROP = 'x_acllens.run.max_result_mb'
export const DEFAULT_MAX_RESULT_MB = 256
export const MIN_MAX_RESULT_MB = 8
export const MAX_MAX_RESULT_MB = 4096

export function maxResultMb(): number {
    const n = parseInt(gs.getProperty(MAX_RESULT_PROP, String(DEFAULT_MAX_RESULT_MB)), 10)
    if (isNaN(n)) return DEFAULT_MAX_RESULT_MB
    return Math.min(MAX_MAX_RESULT_MB, Math.max(MIN_MAX_RESULT_MB, n))
}

export type BlobKind = 'results' | 'comparison' | 'drift' | 'report'

type Path = (string | number)[]
interface Detached {
    path: Path
    items: unknown[]
}

function shallowCopy(o: any): any {
    const c: any = {}
    for (const k in o) c[k] = o[k]
    return c
}

/**
 * Splits a payload into a small "skeleton" plus the long lists taken out of it: top-level lists, and
 * the `tables` list of each entry in a list such as `subjects`. The payload itself is not changed.
 */
export function detachLists(payload: any): { skeleton: any; lists: Detached[] } {
    const lists: Detached[] = []
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return { skeleton: payload, lists }
    const skeleton = shallowCopy(payload)
    for (const k in payload) {
        const v = payload[k]
        if (!Array.isArray(v) || !v.length) continue
        if (v.every((x: any) => x && typeof x === 'object' && Array.isArray(x.tables))) {
            skeleton[k] = v.map((x: any) => {
                const c = shallowCopy(x)
                c.tables = []
                return c
            })
            v.forEach((x: any, i: number) => lists.push({ path: [k, i, 'tables'], items: x.tables }))
        } else if (v.length > DETACH_OVER) {
            skeleton[k] = []
            lists.push({ path: [k], items: v })
        }
    }
    return { skeleton, lists }
}

/** Puts detached items back into the rebuilt object. */
function attach(root: any, path: Path, items: unknown[]) {
    let target = root
    for (const step of path) target = target[step]
    for (const item of items) target.push(item)
}

/**
 * Stores a JSON payload across ordered rows of the run data table (avoids field size limits).
 *
 * The stored text is a sequence of parts separated by a newline (JSON never contains a raw one):
 * the first part is the payload with its long lists emptied, each later part is
 * `{"p": path, "t": [items]}`. No single string ever holds the whole payload, so the 32 MB
 * server string limit does not cap the size of a run. The total is capped by the
 * `x_acllens.run.max_result_mb` property instead. `key` tells apart several blobs of one kind.
 */
export function saveBlob(runId: string, kind: BlobKind, payload: unknown, key?: string) {
    const limit = maxResultMb() * 1024 * 1024
    let buffer = ''
    let seq = 0
    let total = 0
    let first = true

    const writeRow = (text: string) => {
        const d = gr(DATA_TABLE)
        d.initialize()
        d.setValue('run', runId)
        d.setValue('kind', kind)
        if (key) d.setValue('cache_key', key)
        d.setValue('seq', seq++)
        d.setValue('payload', text)
        d.insert()
    }
    const emit = (part: string) => {
        total += part.length + 1
        if (total > limit) {
            throw new Error(
                `The result is larger than the ${maxResultMb()} MB saved-result limit. Narrow the filter, or an ACL Lens admin can raise the "${MAX_RESULT_PROP}" property (Properties page).`
            )
        }
        buffer += (first ? '' : '\n') + part
        first = false
        while (buffer.length >= CHUNK) {
            writeRow(buffer.substring(0, CHUNK))
            buffer = buffer.substring(CHUNK)
        }
    }

    try {
        const { skeleton, lists } = detachLists(payload)
        emit(JSON.stringify(skeleton))
        for (const list of lists) {
            let batch: string[] = []
            let size = 0
            const flush = () => {
                if (!batch.length) return
                emit(`{"p":${JSON.stringify(list.path)},"t":[${batch.join(',')}]}`)
                batch = []
                size = 0
            }
            for (const item of list.items) {
                const s = JSON.stringify(item)
                batch.push(s)
                size += s.length + 1
                if (size >= PART_SIZE) flush()
            }
            flush()
        }
        if (buffer.length || seq === 0) writeRow(buffer)
    } catch (e) {
        deleteBlob(runId, kind, key)
        throw e
    }
}

/** Removes every stored row of one blob (used when a save fails part-way). */
export function deleteBlob(runId: string, kind: BlobKind, key?: string) {
    const d = gr(DATA_TABLE)
    d.addQuery('run', runId)
    d.addQuery('kind', kind)
    if (key) d.addQuery('cache_key', key)
    d.deleteMultiple()
}

/** Reads a blob written by {@link saveBlob}, or one saved by older versions as a single JSON string. */
export function loadBlob<T>(runId: string, kind: BlobKind, key?: string): T | null {
    const d = gr(DATA_TABLE)
    d.addQuery('run', runId)
    d.addQuery('kind', kind)
    if (key) d.addQuery('cache_key', key)
    d.orderBy('seq')
    d.query()
    let root: any = null
    let found = false
    let pending = ''
    const consume = (part: string) => {
        if (!part) return
        const parsed = JSON.parse(part)
        if (root === null) root = parsed
        else attach(root, parsed.p, parsed.t)
    }
    while (d.next()) {
        found = true
        pending += d.getValue('payload') || ''
        let nl = pending.indexOf('\n')
        while (nl >= 0) {
            consume(pending.substring(0, nl))
            pending = pending.substring(nl + 1)
            nl = pending.indexOf('\n')
        }
    }
    consume(pending)
    return found && root !== null ? (root as T) : null
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

/** Saved runs are private: the person who ran one, and ACL Lens admins. */
export function mayReadRun(runBy: string, userId: string, isAdmin: boolean): boolean {
    return isAdmin || (!!runBy && runBy === userId)
}

function isLensAdmin(): boolean {
    return gs.hasRole(ADMIN_ROLE)
}

/** A run the signed-in user may see. Someone else's run looks the same as one that doesn't exist. */
export function getRun(runId: string) {
    const r = gr(RUN_TABLE)
    if (!r.get(runId) || !mayReadRun(r.getValue('run_by'), gs.getUserID(), isLensAdmin())) return null
    return runToJson(r)
}

/** Limits a query on the run table to the runs the signed-in user may see. */
export function onlyReadableRuns(r: any) {
    if (!isLensAdmin()) r.addQuery('run_by', gs.getUserID())
}

export function listRuns(opts: { limit: number; text?: string; type?: string; originalRun?: string; archived?: boolean }) {
    const r = gr(RUN_TABLE)
    onlyReadableRuns(r)
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
