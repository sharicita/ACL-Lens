import { AnalysisResult, Status, SubjectResult } from '../types'
import { LiveOperation, runLiveCheck } from './liveCheck'
import { rank } from './status'

/**
 * "Verify live": runs the platform's live access evaluation (the Access Analyzer's, which evaluates
 * as the subject) for every table in a run, and lines it up with ACL Lens's prediction. It covers
 * what the static analysis can't see: access handlers, data filtration, and the platform's own
 * reading of every ACL. Read-only; results stay in the browser.
 */

/**
 * agree    - the platform's table-level answer matches the prediction
 * differs  - Granted / Denied / No rule was predicted, and the platform says otherwise
 * resolved - Conditional was predicted; the platform's table-level answer is shown for reference
 * error    - the live check could not run for this table
 */
export type Verdict = 'agree' | 'differs' | 'resolved' | 'error'

export interface VerifyRow {
    ti: number
    table: string
    label: string
    op: string
    predicted: Status
    live: LiveOperation | null
    verdict: Verdict
    /** why the platform's answer differs, or the error */
    reason: string
}

export interface VerifyProgress {
    done: number
    total: number
}

/** The tables the live check can't be run on more than this many times in one go. */
export const VERIFY_MAX_TABLES = 300
const CONCURRENCY = 3

/** What the prediction means for a live answer: true = allowed, false = blocked, null = depends. */
function expected(s: Status, defaultDeny: boolean, op: string): boolean | null {
    if (s === 'C') return null
    return rank(s, defaultDeny, op) > 0
}

/** The step that made the platform's answer, in the order it checks them. */
export function liveReason(o: LiveOperation): string {
    const parts: string[] = []
    if (o.accessHandler === 'blocked') {
        const h = o.steps.filter((s) => s.type === 'Access Handler' && s.status === 'blocked').map((s) => s.name)
        parts.push(`Blocked by access handler${h.length ? ` ${h.join(', ')}` : ''}`)
    } else if (o.dataFiltration === 'blocked') parts.push('Blocked by data filtration')
    else if (o.acl === 'blocked') {
        const a = o.acls.filter((x) => x.status === 'blocked').map((x) => x.name)
        parts.push(`The platform's ACL check blocked it${a.length ? ` (${Array.from(new Set(a)).join(', ')})` : ''}`)
    } else if (o.overall === 'passed') parts.push(o.acl === 'passed' ? "The platform's ACL check passed" : 'No rule blocked it')
    if (o.securityDataFilter === 'applied') parts.push('a security data filter applies')
    if (o.insights) parts.push(o.insights)
    return parts.join('; ')
}

export function compareOperation(predicted: Status, o: LiveOperation, defaultDeny: boolean): Verdict {
    const want = expected(predicted, defaultDeny, o.op)
    if (want === null) return 'resolved'
    return want === (o.overall === 'passed') ? 'agree' : 'differs'
}

export async function verifyLive(args: {
    results: AnalysisResult
    subject: SubjectResult
    /** table indexes to check */
    tables: number[]
    ops: string[]
    onProgress: (p: VerifyProgress, rows: VerifyRow[]) => void
    isCancelled: () => boolean
}): Promise<VerifyRow[]> {
    const { results, subject, ops, onProgress, isCancelled } = args
    const tables = args.tables.slice(0, VERIFY_MAX_TABLES)
    const dd = results.defaultDeny
    const rows: VerifyRow[] = []
    let next = 0
    let done = 0
    const worker = async () => {
        while (next < tables.length && !isCancelled()) {
            const ti = tables[next++]
            const t = subject.tables[ti]
            try {
                const live = await runLiveCheck({ subject: { type: subject.subject.type, id: subject.subject.id, label: subject.subject.label }, table: t.t, ops })
                for (const o of live.operations) {
                    const cell = t.ops[o.op]
                    if (!cell) continue
                    const verdict = compareOperation(cell.s, o, dd)
                    rows.push({ ti, table: t.t, label: t.l, op: o.op, predicted: cell.s, live: o, verdict, reason: verdict === 'agree' ? '' : liveReason(o) })
                }
            } catch (e: any) {
                rows.push({ ti, table: t.t, label: t.l, op: '', predicted: 'N', live: null, verdict: 'error', reason: e && e.message ? e.message : String(e) })
                // a refusal (role, plugin) fails the same way for every table: stop early
                if (/refused|could not run/.test(String(e && e.message))) next = tables.length
            }
            done++
            onProgress({ done, total: tables.length }, rows.slice())
        }
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, tables.length) }, worker))
    return rows
}
