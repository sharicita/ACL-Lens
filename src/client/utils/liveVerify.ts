import { AnalysisResult, Cell, FIELD_OPS, Status, SubjectResult } from '../types'
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
    /** the field checked, or '' for the table operations */
    field: string
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

/** At most this many platform checks (one per table, plus one per field rule) in one go. */
export const VERIFY_MAX_CHECKS = 300
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

/** One platform check: a table's operations, or one field's create/read/write. */
interface Check {
    ti: number
    field: string
}

/** The checks for the given tables: each table, then each field with an explicit rule in the run. */
export function verifyChecks(subject: SubjectResult, tables: number[]): Check[] {
    const out: Check[] = []
    for (const ti of tables) {
        out.push({ ti, field: '' })
        for (const f of subject.tables[ti].fields) if (f.f !== '*') out.push({ ti, field: f.f })
    }
    return out
}

export async function verifyLive(args: {
    results: AnalysisResult
    subject: SubjectResult
    /** table indexes to check (their field rules are checked too) */
    tables: number[]
    ops: string[]
    onProgress: (p: VerifyProgress, rows: VerifyRow[]) => void
    isCancelled: () => boolean
}): Promise<VerifyRow[]> {
    const { results, subject, ops, onProgress, isCancelled } = args
    const checks = verifyChecks(subject, args.tables).slice(0, VERIFY_MAX_CHECKS)
    const dd = results.defaultDeny
    const rows: VerifyRow[] = []
    let next = 0
    let done = 0
    const worker = async () => {
        while (next < checks.length && !isCancelled()) {
            const { ti, field } = checks[next++]
            const t = subject.tables[ti]
            const cells: { [op: string]: Cell } = field ? (t.fields.find((f) => f.f === field) || { ops: {} }).ops : t.ops
            try {
                const live = await runLiveCheck({ subject: { type: subject.subject.type, id: subject.subject.id, label: subject.subject.label }, table: t.t, field, ops: field ? (FIELD_OPS as string[]) : ops })
                for (const o of live.operations) {
                    const cell = cells[o.op]
                    if (!cell) continue
                    const verdict = compareOperation(cell.s, o, dd)
                    rows.push({ ti, table: t.t, label: t.l, field, op: o.op, predicted: cell.s, live: o, verdict, reason: liveReason(o) })
                }
            } catch (e: any) {
                rows.push({ ti, table: t.t, label: t.l, field, op: '', predicted: 'N', live: null, verdict: 'error', reason: e && e.message ? e.message : String(e) })
                // a refusal (role, plugin) fails the same way for every check: stop early
                if (/refused|could not run/.test(String(e && e.message))) next = checks.length
            }
            done++
            onProgress({ done, total: checks.length }, rows.slice())
        }
    }
    // not Array.from({ length }, fn): ServiceNow pages replace Array.from with a version that ignores fn for non-iterables
    const workers: Promise<void>[] = []
    for (let i = 0; i < Math.min(CONCURRENCY, checks.length); i++) workers.push(worker())
    await Promise.all(workers)
    return rows
}
