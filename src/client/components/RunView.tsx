import React, { useEffect, useRef, useState } from 'react'
import { LensApi } from '../services/LensApi'
import { RunPayload, RunRecord } from '../types'
import { exportComparisonCsv, exportDriftCsv, exportJson, exportMatrixCsv } from '../utils/exports'
import { setTitle } from '../utils/nav'
import AccessMatrix from './AccessMatrix'
import ComparisonReport from './ComparisonReport'
import DriftReport from './DriftReport'
import RunHeader from './RunHeader'
import SubjectCards from './SubjectCards'
import { Legend } from './StatusCell'
import TableDetail from './TableDetail'
import RoleComparison from './RoleComparison'
import Tip from './Tip'
import { useAssistant } from '../assistant/AssistantContext'
import Icon from './Icon'

interface Props {
    runId: string
    cached?: RunPayload
    onRunComplete: (p: RunPayload) => void
    onOpenRun: (id: string) => void
    onEdit: (p: RunPayload) => void
    isAdmin?: boolean
    /** called after the run is deleted (e.g. go back to History) */
    onDeleted: () => void
}

type Tab = 'comparison' | 'matrix' | 'roles'

// the baseline is a per-viewer display choice: remembered in this browser, per run
const BASELINE_KEY = 'acl-lens.baseline.'
function readBaseline(runId: string): string {
    try {
        return window.localStorage.getItem(BASELINE_KEY + runId) || ''
    } catch (e) {
        return ''
    }
}
function writeBaseline(runId: string, key: string) {
    try {
        window.localStorage.setItem(BASELINE_KEY + runId, key)
    } catch (e) {
        /* storage unavailable - the choice lasts until the page is left */
    }
}

export default function RunView({ runId, cached, onRunComplete, onOpenRun, onEdit, isAdmin, onDeleted }: Props) {
    const [payload, setPayload] = useState<RunPayload | null>(cached || null)
    const [error, setError] = useState('')
    const [busy, setBusy] = useState('')
    const [actionError, setActionError] = useState('')
    const [hidden, setHidden] = useState<Set<string>>(new Set())
    const [baseline, setBaseline] = useState('')
    const [detail, setDetail] = useState<number | null>(null)
    const [reruns, setReruns] = useState<RunRecord[]>([])
    const [tab, setTab] = useState<Tab>(cached?.comparison ? 'comparison' : 'matrix')
    const filtered = useRef<Set<string>>(new Set())
    const assistant = useAssistant()

    useEffect(() => {
        if (runId.indexOf('unsaved-') === 0) {
            if (!payload) setError('This run was not saved because History is turned off. Run it again from the Workspace.')
            return
        }
        if (!payload) {
            LensApi.getRun(runId)
                .then((p) => {
                    setPayload(p)
                    if (p.comparison) setTab('comparison')
                })
                .catch((e) => setError(e.message))
        }
        LensApi.listRuns({ original: runId, limit: 20 })
            .then(setReruns)
            .catch(() => setReruns([]))
    }, [runId])

    useEffect(() => {
        if (!payload) return
        assistant.setContext({
            view: 'run',
            run_id: payload.run.sys_id,
            run_number: payload.run.number,
            subjects: (payload.results?.subjects || []).map((s) => `${s.subject.label} (${s.subject.type})`),
        })
        return () => assistant.setContext({})
    }, [payload])

    useEffect(() => {
        if (payload) {
            setTitle(`ACL Lens – ${payload.run.number}${payload.run.name ? ' ' + payload.run.name : ''}`)
            const subs = payload.results?.subjects || []
            if (!baseline && subs.length) {
                const saved = readBaseline(payload.run.sys_id)
                setBaseline(subs.some((s) => s.subject.key === saved) ? saved : subs[0].subject.key)
            }
        }
    }, [payload])

    if (error) return <div className="lens-alert lens-alert--critical">{error}</div>
    if (!payload) return <p className="lens-muted">Loading run…</p>

    const { run, results, comparison, drift } = payload
    const fileBase = `${run.number}${run.name ? '-' + run.name : ''}`

    const act = async (label: string, fn: () => Promise<RunPayload>) => {
        setBusy(label)
        setActionError('')
        try {
            onRunComplete(await fn())
        } catch (e: any) {
            // keep this run on screen; a gateway timeout usually means the run is still being saved
            setActionError(
                /\(50[234]\)/.test(String(e.message))
                    ? 'This is taking longer than the connection allows. The new run may still finish: check History in a minute.'
                    : e.message
            )
        } finally {
            setBusy('')
        }
    }

    const chooseBaseline = (key: string) => {
        setBaseline(key)
        writeBaseline(run.sys_id, key)
    }

    const tabs: { id: Tab; label: string; tip: string }[] = []
    if (comparison) tabs.push({ id: 'comparison', label: 'Comparison report', tip: 'Totals, head-to-head counts and every difference found by the comparison script.' })
    tabs.push({ id: 'matrix', label: 'Side-by-side matrix', tip: 'Every table and operation for every subject.' })
    tabs.push({ id: 'roles', label: 'Roles', tip: 'Which roles each subject has, which are shared, and how each was assigned.' })

    const toggleHidden = (key: string) => {
        const next = new Set(hidden)
        next.has(key) ? next.delete(key) : next.add(key)
        if (results && next.size >= results.subjects.length) return
        setHidden(next)
    }

    return (
        <div className="lens-run-view">
            <RunHeader
                run={run}
                reruns={reruns}
                busy={busy}
                canCompare={!!results && results.subjects.length > 1 && !comparison}
                onRerun={() => act('rerun', () => LensApi.rerun(run.sys_id))}
                onCompare={() =>
                    act('compare', () =>
                        LensApi.createRun({
                            name: run.name,
                            run_type: 'compare',
                            subjects: run.subjects.map((s) => ({ type: s.type, id: s.id })),
                            filter: run.filter,
                        })
                    )
                }
                onEdit={() => onEdit(payload)}
                onOpenRun={onOpenRun}
                onExportMatrix={(onlyFiltered) => results && exportMatrixCsv(results, fileBase, onlyFiltered ? filtered.current : undefined)}
                onExportJson={() => exportJson(payload, fileBase)}
                onExportComparison={comparison ? () => exportComparisonCsv(comparison, fileBase) : undefined}
                isAdmin={isAdmin}
                onArchive={async (archived) => {
                    setBusy('archive')
                    setActionError('')
                    try {
                        await LensApi.archiveRun(run.sys_id, archived)
                        setPayload({ ...payload, run: { ...run, archived } })
                    } catch (e: any) {
                        setActionError(e.message)
                    } finally {
                        setBusy('')
                    }
                }}
                onDelete={async () => {
                    setBusy('delete')
                    setActionError('')
                    try {
                        await LensApi.deleteRun(run.sys_id)
                        onDeleted()
                    } catch (e: any) {
                        setActionError(e.message)
                        setBusy('')
                    }
                }}
            />
            {actionError && (
                <div className="lens-alert lens-alert--critical" role="alert">
                    {actionError}
                </div>
            )}
            {!comparison && results && results.subjects.length > 1 && (
                <Tip id="run-compare">
                    "Run comparison script" saves a comparison run with totals, head-to-head counts, role differences and an exportable list of every difference.
                </Tip>
            )}
            {run.original_run && !drift?.total && (
                <Tip id="run-rerun-same">Reruns re-evaluate with live roles and ACLs. "Changes since original" lists anything that moved.</Tip>
            )}
            {run.status === 'error' && <div className="lens-alert lens-alert--critical">This run failed: {run.error_message}</div>}
            {results && (
                <>
                    {results.warnings.length > 0 && (
                        <div className="lens-alert lens-alert--warning" role="status">
                            <ul>
                                {results.warnings.map((w) => (
                                    <li key={w}>{w}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {drift && run.original_run && (
                        <DriftReport drift={drift} originalNumber={run.original_number} onOpenOriginal={() => onOpenRun(run.original_run)} onExport={() => exportDriftCsv(drift, fileBase)} />
                    )}
                    {results.subjects.length > 1 ? (
                        <Tip id="run-baseline">
                            The <strong>baseline</strong> is the subject everyone else is compared to on this screen; results that differ from it get a purple outline. Change it with "Use as baseline" on a card. Your choice is remembered in this browser for this run.
                        </Tip>
                    ) : (
                        <Tip id="run-single">Use "Add user or role" (the card with the +) to compare this access side by side with someone else.</Tip>
                    )}
                    <SubjectCards
                        subjects={results.subjects}
                        defaultDeny={results.defaultDeny}
                        hidden={hidden}
                        baseline={baseline}
                        onToggle={toggleHidden}
                        onBaseline={chooseBaseline}
                        onShowRoles={() => setTab('roles')}
                        addBusy={busy.indexOf('Adding') === 0 ? busy : ''}
                        onAdd={(sub) =>
                            act(`Adding ${sub.label}…`, () =>
                                LensApi.createRun({
                                    name: run.name,
                                    run_type: run.run_type,
                                    subjects: run.subjects.map((x) => ({ type: x.type, id: x.id })).concat([{ type: sub.type, id: sub.id }]),
                                    filter: run.filter,
                                })
                            )
                        }
                    />
                    <div className="lens-run-view__bar">
                        <div className="lens-segment" role="tablist" aria-label="Result views">
                            {tabs.map((t) => (
                                <button
                                    key={t.id}
                                    type="button"
                                    role="tab"
                                    id={`tab-${t.id}`}
                                    aria-selected={tab === t.id}
                                    aria-controls="run-tabpanel"
                                    className={`lens-segment__item${tab === t.id ? ' lens-segment__item--on' : ''}`}
                                    onClick={() => setTab(t.id)}
                                    data-tip={t.tip}
                                >
                                    <Icon name={t.id === 'comparison' ? 'report' : t.id === 'matrix' ? 'grid' : 'users'} />
                                    {t.label}
                                </button>
                            ))}
                        </div>
                        {tab !== 'roles' && <Legend defaultDeny={results.defaultDeny} />}
                    </div>
                    {tab === 'matrix' && (
                        <Tip id="run-matrix">
                            Click a table name to see exactly which ACLs matched and why. Use the ▸ arrow to expand field rules, and "Differences only" to cut the list down.
                        </Tip>
                    )}
                    <div id="run-tabpanel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
                        {tab === 'comparison' && comparison && (
                            <ComparisonReport
                                runId={run.sys_id}
                                cmp={comparison}
                                subjects={results.subjects}
                                fileBase={fileBase}
                                onExport={() => exportComparisonCsv(comparison, fileBase)}
                                onShowRoles={() => setTab('roles')}
                            />
                        )}
                        {tab === 'matrix' && (
                            <AccessMatrix results={results} hidden={hidden} baseline={baseline} onOpenTable={setDetail} onFilteredChange={(s) => (filtered.current = s)} onExport={() => exportMatrixCsv(results, fileBase, filtered.current)} />
                        )}
                        {tab === 'roles' && <RoleComparison subjects={results.subjects} />}
                    </div>
                    {detail !== null && <TableDetail results={results} index={detail} onClose={() => setDetail(null)} />}
                </>
            )}
        </div>
    )
}
