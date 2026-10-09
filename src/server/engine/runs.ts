import { gs, GlideDateTime } from '@servicenow/glide'
import { analyze, pruneAcls } from './analyze.ts'
import { compare, comparisonCsv, drift, Comparison } from './compare.ts'
import { attachText, createRun, finishRun, getRun, loadBlob, saveBlob } from './storage.ts'
import { historyEnabled } from '../admin/settings.ts'
import { AnalysisFilter, AnalysisResult, SubjectRef, TABLE_OPS } from './types.ts'

export interface RunRequest {
    name?: string
    run_type?: 'analyze' | 'compare'
    subjects: SubjectRef[]
    filter: AnalysisFilter
}

function normalizeFilter(f: AnalysisFilter | undefined): AnalysisFilter {
    const filter = f || ({ mode: 'secured_by_roles' } as AnalysisFilter)
    return {
        mode: filter.mode || 'secured_by_roles',
        value: filter.value || '',
        includeFields: filter.includeFields !== false,
        excludeSystem: !!filter.excludeSystem,
        maxTables: filter.maxTables ? Math.max(1, Math.floor(filter.maxTables)) : undefined,
    }
}

/**
 * Executes an analysis (and optionally the comparison script) and records it in history.
 * A rerun passes originalRun so the new record references the run it was created from.
 */
export function executeRun(req: RunRequest, originalRun?: string) {
    const subjects = (req.subjects || []).map((s) => ({ type: s.type === 'role' ? 'role' : 'user', id: s.id }) as SubjectRef)
    const filter = normalizeFilter(req.filter)
    const runType = req.run_type === 'compare' ? 'compare' : 'analyze'
    if (runType === 'compare' && subjects.length < 2) throw new Error('Select at least two users/roles to compare')

    if (!historyEnabled()) return executeUnsaved(req.name || '', runType, subjects, filter)

    const runId = createRun({ name: req.name || '', runType, subjects, filter, originalRun })
    const started = new Date().getTime()
    try {
        const result = pruneAcls(analyze(subjects, filter))
        // persist resolved labels so history shows names even if the user/role is later renamed
        const storedSubjects = result.subjects.map((s) => ({ type: s.subject.type, id: s.subject.id, label: s.subject.label }))
        saveBlob(runId, 'results', result)

        let comparison: Comparison | null = null
        if (runType === 'compare') {
            comparison = compare(result)
            saveBlob(runId, 'comparison', comparison)
            attachText(runId, 'acl-lens-comparison.csv', 'text/csv', comparisonCsv(comparison))
        }

        let driftResult = null
        if (originalRun) {
            const orig = loadBlob<AnalysisResult>(originalRun, 'results')
            if (orig) {
                driftResult = drift(orig, result)
                saveBlob(runId, 'drift', driftResult)
            }
        }

        const totals: { [s: string]: number } = { G: 0, C: 0, D: 0, N: 0 }
        for (const s of result.subjects) for (const op of TABLE_OPS) for (const k in totals) totals[k] += s.counts[op][k]
        const summary = {
            totals,
            warnings: result.warnings,
            truncated: result.truncated,
            subjects: result.subjects.map((s) => ({ key: s.subject.key, label: s.subject.label, roles: s.subject.roles.length, counts: s.counts })),
            comparison: comparison ? comparison.summary : null,
            drift: driftResult ? { total: driftResult.total, notes: driftResult.notes } : null,
        }
        finishRun(runId, {
            status: 'complete',
            subjects: JSON.stringify(storedSubjects),
            subject_summary: storedSubjects.map((s) => s.label).join(runType === 'compare' ? ' vs ' : ', ').substring(0, 1000),
            summary: JSON.stringify(summary).substring(0, 8000),
            table_count: result.tableCount,
            diff_count: comparison ? comparison.summary.tableCellsDifferent + comparison.summary.fieldCellsDifferent : 0,
            duration_ms: new Date().getTime() - started,
        })
        return { run: getRun(runId), results: result, comparison, drift: driftResult }
    } catch (e: any) {
        const msg = e && e.message ? e.message : String(e)
        gs.error(`ACL Lens run ${runId} failed: ${msg}`)
        finishRun(runId, { status: 'error', error_message: msg.substring(0, 4000), duration_ms: new Date().getTime() - started })
        throw e
    }
}

/** History is turned off: analyze and return the results without storing anything. */
function executeUnsaved(name: string, runType: 'analyze' | 'compare', subjects: SubjectRef[], filter: AnalysisFilter) {
    const started = new Date().getTime()
    const result = pruneAcls(analyze(subjects, filter))
    const comparison = runType === 'compare' ? compare(result) : null
    const labels = result.subjects.map((s) => s.subject.label)
    const run = {
        sys_id: `unsaved-${started}`,
        number: 'Not saved',
        name,
        run_type: runType,
        status: 'complete',
        subjects: result.subjects.map((s) => ({ type: s.subject.type, id: s.subject.id, label: s.subject.label })),
        subject_summary: labels.join(runType === 'compare' ? ' vs ' : ', '),
        filter,
        summary: {},
        original_run: '',
        original_number: '',
        run_by: gs.getUserDisplayName(),
        created: new GlideDateTime().getDisplayValue(),
        duration_ms: new Date().getTime() - started,
        table_count: result.tableCount,
        diff_count: comparison ? comparison.summary.tableCellsDifferent + comparison.summary.fieldCellsDifferent : 0,
        error_message: '',
        unsaved: true,
    }
    return { run, results: result, comparison, drift: null }
}

export function rerun(runId: string) {
    const orig = getRun(runId)
    if (!orig) throw new Error('Run not found')
    return executeRun(
        {
            name: orig.name ? `${orig.name} (rerun)` : '',
            run_type: orig.run_type,
            subjects: orig.subjects,
            filter: orig.filter,
        },
        runId
    )
}

export function loadRun(runId: string) {
    const run = getRun(runId)
    if (!run) return null
    return {
        run,
        results: loadBlob<AnalysisResult>(runId, 'results'),
        comparison: loadBlob<Comparison>(runId, 'comparison'),
        drift: loadBlob(runId, 'drift'),
    }
}
