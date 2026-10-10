import React, { useEffect, useState } from 'react'
import { LensApi } from '../services/LensApi'
import { RunPayload, RunRecord } from '../types'
import Tip from './Tip'
import SortTh, { GroupedRows, ListBreadcrumb, useSort } from './SortTh'
import Icon from './Icon'
import ListActions from './ListActions'
import { bySysIds } from '../utils/snList'
import { download, toCsv } from '../utils/download'

interface Props {
    isAdmin: boolean
    historyEnabled: boolean
    onOpen: (id: string) => void
    onRunComplete: (p: RunPayload) => void
}

export default function HistoryView({ isAdmin, historyEnabled, onOpen, onRunComplete }: Props) {
    const [archived, setArchived] = useState(false)
    const [reload, setReload] = useState(0)
    const [runs, setRuns] = useState<RunRecord[]>([])
    const [q, setQ] = useState('')
    const [type, setType] = useState('')
    const [loading, setLoading] = useState(true)
    const [busy, setBusy] = useState('')
    const sorter = useSort(runs, {
        run: (r) => r.number,
        type: (r) => r.run_type,
        subjects: (r) => r.subject_summary || r.subjects.map((s) => s.label || s.id).join(', '),
        tables: (r) => r.table_count,
        diffs: (r) => (r.run_type === 'compare' ? r.diff_count : null),
        created: (r) => r.created,
    }, {
        groupLabel: {
            type: (r) => (r.run_type === 'compare' ? 'Comparison' : 'Analysis'),
            created: (r) => (r.created || '').substring(0, 10),
            diffs: (r) => (r.run_type === 'compare' ? String(r.diff_count) : '—'),
        },
    })
    const [error, setError] = useState('')

    useEffect(() => {
        setLoading(true)
        const t = setTimeout(() => {
            LensApi.listRuns({ q, type, limit: 100, archived })
                .then((r) => {
                    setRuns(r)
                    setError('')
                })
                .catch((e) => setError(e.message))
                .finally(() => setLoading(false))
        }, 250)
        return () => clearTimeout(t)
    }, [q, type, archived, reload])

    const toggleArchive = async (r: RunRecord) => {
        setBusy(r.sys_id)
        setError('')
        try {
            await LensApi.archiveRun(r.sys_id, !archived)
            setReload((n) => n + 1)
        } catch (e: any) {
            setError(e.message)
        } finally {
            setBusy('')
        }
    }

    const rerun = async (id: string) => {
        setBusy(id)
        setError('')
        try {
            onRunComplete(await LensApi.rerun(id))
        } catch (e: any) {
            setError(e.message)
        } finally {
            setBusy('')
        }
    }

    return (
        <section className="lens-card" aria-labelledby="hist-title">
            <div className="lens-card__header lens-mx__toolbar">
                <h2 id="hist-title">Run history</h2>
                <input className="lens-input lens-mx__search" placeholder="Search number, name or subject…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search history" />
                <select className="lens-input lens-input--narrow" value={type} onChange={(e) => setType(e.target.value)} aria-label="Run type">
                    <option value="">All types</option>
                    <option value="analyze">Analyses</option>
                    <option value="compare">Comparisons</option>
                </select>
                {isAdmin && (
                    <label className="lens-check" data-tip="Archived runs are kept but hidden from History. Retention can archive old runs automatically.">
                        <input type="checkbox" checked={archived} onChange={(e) => setArchived(e.target.checked)} /> Show archived
                    </label>
                )}
                {loading && <span className="lens-muted">Loading…</span>}
                <span className="lens-history__actions-bar">
                    <ListActions
                        list={bySysIds('x_acllens_run', runs.map((r) => r.sys_id), `these ${runs.length} runs`)}
                        onExport={() => {
                            const out: unknown[][] = [['Run', 'Name', 'Type', 'Subjects', 'Tables', 'Differences', 'Original run', 'Created', 'Run by']]
                            for (const r of sorter.rows)
                                out.push([r.number, r.name, r.run_type === 'compare' ? 'Comparison' : 'Analysis', r.subject_summary, r.table_count, r.run_type === 'compare' ? r.diff_count : '', r.original_number || '', r.created, r.run_by])
                            download(`acl-lens-history.csv`, toCsv(out), 'text/csv;charset=utf-8')
                        }}
                        exportWhat={`the ${runs.length} runs listed${q || type ? ' (filtered)' : ''}`}
                        filtered={!!(q || type)}
                    />
                </span>
            </div>
            {error && <div className="lens-alert lens-alert--critical">{error}</div>}
            <div className="lens-card__body lens-card__body--tight">
                {!historyEnabled && <p className="lens-note">History is turned off, so new runs are not being saved. Existing runs are still listed.</p>}
                <Tip id="history-rerun">
                    Rerun a saved run after changing roles or ACLs: it saves a new run linked to the original and shows exactly what changed. Handy as before/after evidence in a change record.
                </Tip>
            </div>
            <div className="lens-mx__scroll">
                <ListBreadcrumb sorter={sorter} />
                <table className="lens-mx lens-mx--compact lens-history">
                    <thead>
                        <tr>
                            <SortTh sorter={sorter} col="run">
                                Run
                            </SortTh>
                            <SortTh sorter={sorter} col="type">
                                Type
                            </SortTh>
                            <SortTh sorter={sorter} col="subjects">
                                Subjects
                            </SortTh>
                            <SortTh sorter={sorter} col="tables">
                                Tables
                            </SortTh>
                            <SortTh sorter={sorter} col="diffs">
                                Differences
                            </SortTh>
                            <th scope="col">Lineage</th>
                            <SortTh sorter={sorter} col="created">
                                Created
                            </SortTh>
                            <th>
                                <span className="lens-sr">Actions</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <GroupedRows sorter={sorter} colSpan={8} render={(r) => (
                            <tr key={r.sys_id}>
                                <th scope="row">
                                    <button type="button" className="lens-link" onClick={() => onOpen(r.sys_id)}>
                                        {r.number}
                                    </button>
                                    {r.name && <div className="lens-muted">{r.name}</div>}
                                    {r.status !== 'complete' && <span className={`lens-pill lens-pill--${r.status}`}>{r.status}</span>}
                                </th>
                                <td>
                                    <span className={`lens-pill lens-pill--${r.run_type}`}>{r.run_type === 'compare' ? 'Comparison' : 'Analysis'}</span>
                                </td>
                                <td>{r.subject_summary || r.subjects.map((s) => s.label || s.id).join(', ')}</td>
                                <td>{r.table_count}</td>
                                <td>{r.run_type === 'compare' ? r.diff_count : '—'}</td>
                                <td>
                                    {r.original_run && (
                                        <button
                                            type="button"
                                            className="lens-link"
                                            onClick={() => onOpen(r.original_run)}
                                            data-tip={`This run repeated ${r.original_number} with live data. Click to open the original.`}
                                        >
                                            ↳ rerun of {r.original_number}
                                        </button>
                                    )}
                                    {!!r.rerun_count && (
                                        <div className="lens-muted" data-tip="Number of later runs that repeated this one. Open the run to see links to each.">
                                            {r.rerun_count} rerun(s)
                                        </div>
                                    )}
                                    {r.summary?.drift && <div className="lens-muted">{r.summary.drift.total} change(s)</div>}
                                </td>
                                <td>
                                    {r.created}
                                    <div className="lens-muted">{r.run_by}</div>
                                </td>
                                <td className="lens-history__actions">
                                    <button type="button" className="lens-btn lens-btn--tertiary" onClick={() => onOpen(r.sys_id)} data-tip="Open the saved results of this run.">
                                        Open
                                    </button>
                                    <button
                                        type="button"
                                        className="lens-btn lens-btn--secondary"
                                        disabled={!!busy}
                                        onClick={() => rerun(r.sys_id)}
                                        data-tip="Re-evaluate with live data. Saves a new run linked to this one and shows what changed."
                                    >
                                        <Icon name="rerun" size={14} />
                                        {busy === r.sys_id ? 'Working…' : 'Rerun'}
                                    </button>
                                    {isAdmin && (
                                        <button
                                            type="button"
                                            className="lens-btn lens-btn--ghost"
                                            disabled={!!busy}
                                            onClick={() => toggleArchive(r)}
                                            data-tip={archived ? 'Restore this run to History.' : 'Hide this run from History without deleting it. Show archived runs to restore it.'}
                                        >
                                            <Icon name={archived ? 'restore' : 'archive'} size={14} />
                                            {archived ? 'Restore' : 'Archive'}
                                        </button>
                                    )}
                                </td>
                            </tr>
                        )} />
                    </tbody>
                </table>
                {!loading && !runs.length && <p className="lens-empty">No runs yet. Analyze something in the Workspace and it will appear here.</p>}
            </div>
        </section>
    )
}
