import React, { useEffect, useMemo, useRef, useState } from 'react'
import { LensApi } from '../services/LensApi'
import { RunRecord } from '../types'
import Icon from '../components/Icon'
import Tip from '../components/Tip'
import { ViewName } from '../utils/nav'
import ReportChart from './ReportChart'
import ReportDetail from './ReportDetail'
import ReportEditor from './ReportEditor'
import { Catalog, CATEGORY_LABEL, Dashboard, Report, ReportData, ReportGroup, Tile } from './types'

interface Props {
    isAdmin: boolean
    onOpenRun: (id: string) => void
    onNavigate: (v: ViewName) => void
}

function runLabel(r: RunRecord | null) {
    if (!r) return 'no run'
    return `${r.number}${r.name ? ` ${r.name}` : ''} · ${r.subject_summary || ''} · ${r.created}`
}

/**
 * Reporting dashboard: pre-built and customized reports (high risk, vulnerabilities, comparisons)
 * calculated from one saved run. Each user arranges their own dashboard; shipped reports are
 * read-only and "Customize" saves a personal copy.
 */
export default function DashboardView({ isAdmin, onOpenRun, onNavigate }: Props) {
    const [reports, setReports] = useState<Report[]>([])
    const [catalog, setCatalog] = useState<Catalog | null>(null)
    const [dash, setDash] = useState<Dashboard | null>(null)
    const [runs, setRuns] = useState<RunRecord[]>([])
    const [run, setRun] = useState<RunRecord | null>(null)
    const [data, setData] = useState<{ [id: string]: ReportData }>({})
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [adding, setAdding] = useState(false)
    const [editing, setEditing] = useState<{ report: Report | null } | null>(null)
    const [detail, setDetail] = useState<{ report: Report; group: ReportGroup | null } | null>(null)
    const addRef = useRef<HTMLDivElement>(null)

    const byId = useMemo(() => {
        const m: { [id: string]: Report } = {}
        for (const r of reports) m[r.sys_id] = r
        return m
    }, [reports])
    const tiles = (dash?.layout || []).filter((t) => byId[t.report])

    // first load: reports, my dashboard, recent runs
    useEffect(() => {
        ;(async () => {
            try {
                const [rep, d, rs] = await Promise.all([LensApi.reports(), LensApi.dashboard(), LensApi.listRuns({ limit: 30 })])
                setReports(rep.reports)
                setCatalog(rep.catalog)
                setDash(d)
                setRuns(rs.filter((r) => r.status === 'complete'))
            } catch (e: any) {
                setError(e.message)
                setLoading(false)
            }
        })()
    }, [])

    // (re)calculate the tiles for the chosen run
    const tileKey = tiles.map((t) => t.report).join(',')
    useEffect(() => {
        if (!dash) return
        let gone = false
        setLoading(true)
        LensApi.dashboardData(dash.run, tiles.map((t) => t.report))
            .then((r) => {
                if (gone) return
                setRun(r.run)
                setData(r.reports)
                setError('')
            })
            .catch((e) => !gone && setError(e.message))
            .finally(() => !gone && setLoading(false))
        return () => {
            gone = true
        }
    }, [dash?.run, tileKey])

    useEffect(() => {
        if (!adding) return
        const away = (e: MouseEvent) => addRef.current && !addRef.current.contains(e.target as Node) && setAdding(false)
        const key = (e: KeyboardEvent) => e.key === 'Escape' && setAdding(false)
        document.addEventListener('mousedown', away)
        document.addEventListener('keydown', key)
        return () => {
            document.removeEventListener('mousedown', away)
            document.removeEventListener('keydown', key)
        }
    }, [adding])

    const save = async (layout: Tile[], runId?: string) => {
        const next = { layout, run: runId !== undefined ? runId : dash?.run || '' }
        setDash({ layout, run: next.run, custom: true })
        try {
            setDash(await LensApi.saveDashboard(next))
        } catch (e: any) {
            setError(e.message)
        }
    }
    const reset = async () => {
        if (!window.confirm('Reset your dashboard to the default reports? Your own reports are kept and can be added again.')) return
        setDash(await LensApi.resetDashboard())
    }
    const move = (i: number, d: number) => {
        const l = tiles.slice()
        const j = i + d
        if (j < 0 || j >= l.length) return
        ;[l[i], l[j]] = [l[j], l[i]]
        save(l)
    }
    const resize = (i: number) => save(tiles.map((t, k) => (k === i ? { ...t, size: t.size === 2 ? 1 : 2 } : t)))
    const remove = (i: number) => save(tiles.filter((_t, k) => k !== i))
    const add = (id: string) => {
        setAdding(false)
        if (!tiles.some((t) => t.report === id)) save(tiles.concat([{ report: id, size: 1 }]))
    }

    const onSaved = (r: Report, replaced: string | null) => {
        setReports((list) => (list.some((x) => x.sys_id === r.sys_id) ? list.map((x) => (x.sys_id === r.sys_id ? r : x)) : list.concat([r])))
        setEditing(null)
        if (replaced) save(tiles.map((t) => (t.report === replaced ? { ...t, report: r.sys_id } : t)))
        else if (!tiles.some((t) => t.report === r.sys_id)) save(tiles.concat([{ report: r.sys_id, size: 1 }]))
        // recalculate this report
        LensApi.dashboardData(dash?.run || '', [r.sys_id]).then((x) => setData((d) => ({ ...d, ...x.reports })))
    }
    const onDeleted = (id: string) => {
        setReports((list) => list.filter((x) => x.sys_id !== id))
        setEditing(null)
        save(tiles.filter((t) => t.report !== id))
    }

    if (error && !dash) return <div className="lens-alert lens-alert--critical">{error}</div>
    if (!dash || !catalog) return <p className="lens-muted">Loading the dashboard…</p>

    const rLabel = runLabel(run)
    const groupedAdd = (['high_risk', 'vulnerability', 'overview', 'comparison'] as const).map((cat) => ({ cat, list: reports.filter((r) => r.category === cat) }))

    return (
        <div className="lens-dash">
            <section className="lens-card" aria-labelledby="dash-title">
                <div className="lens-card__header lens-dash__head">
                    <h2 id="dash-title">
                        <Icon name="report" />
                        Reporting dashboard
                    </h2>
                    <label className="lens-dash__run">
                        <span className="lens-muted">Data from</span>
                        <select className="lens-input" value={dash.run} onChange={(e) => save(tiles, e.target.value)} aria-label="Run the reports use">
                            <option value="">Latest run{!dash.run && run ? ` (${run.number})` : ''}</option>
                            {runs.map((r) => (
                                <option key={r.sys_id} value={r.sys_id}>
                                    {r.number}
                                    {r.name ? ` ${r.name}` : ''} · {(r.subject_summary || '').substring(0, 60)}
                                </option>
                            ))}
                        </select>
                    </label>
                    <span className="lens-dash__actions">
                        {run && (
                            <button type="button" className="lens-btn lens-btn--tertiary" onClick={() => onOpenRun(run.sys_id)} data-tip={`Open ${run.number}`}>
                                <Icon name="list" size={14} />
                                Open run
                            </button>
                        )}
                        <div className="lens-dash__add" ref={addRef}>
                            <button type="button" className="lens-btn lens-btn--secondary" aria-expanded={adding} aria-haspopup="true" onClick={() => setAdding(!adding)}>
                                <Icon name="grid" size={14} />
                                Add report
                            </button>
                            {adding && (
                                <div className="lens-dash__menu" role="menu" aria-label="Add a report">
                                    {groupedAdd.map(
                                        ({ cat, list }) =>
                                            list.length > 0 && (
                                                <div key={cat} className="lens-dash__menugroup">
                                                    <span className="lens-dash__menuhead">{CATEGORY_LABEL[cat]}</span>
                                                    {list.map((r) => {
                                                        const on = tiles.some((t) => t.report === r.sys_id)
                                                        return (
                                                            <button key={r.sys_id} type="button" role="menuitem" disabled={on} onClick={() => add(r.sys_id)} data-tip={r.description}>
                                                                {r.name}
                                                                {!r.system && <span className="lens-muted"> · {r.mine ? 'mine' : `shared by ${r.owner_name}`}</span>}
                                                                {on && <span className="lens-muted"> · on dashboard</span>}
                                                            </button>
                                                        )
                                                    })}
                                                </div>
                                            )
                                    )}
                                    <div className="lens-dash__menugroup">
                                        <button
                                            type="button"
                                            role="menuitem"
                                            onClick={() => {
                                                setAdding(false)
                                                setEditing({ report: null })
                                            }}
                                        >
                                            <strong>+ New report…</strong>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                        {dash.custom && (
                            <button type="button" className="lens-btn lens-btn--tertiary" onClick={reset} data-tip="Back to the default reports and layout">
                                <Icon name="restore" size={14} />
                                Reset
                            </button>
                        )}
                    </span>
                </div>
                <div className="lens-card__body lens-dash__intro">
                    <Tip id="dash-intro">
                        Reports are calculated from one saved run: pick it under <em>Data from</em>. Click a bar, slice or number to see the rows behind it. Reports shipped with
                        ACL Lens are read-only: <em>Customize</em> saves your own copy. Your layout is saved for you only.
                    </Tip>
                    {!run && !loading && (
                        <p className="lens-alert lens-alert--warning">
                            There's no saved run to report on yet.{' '}
                            <button type="button" className="lens-link" onClick={() => onNavigate('workspace')}>
                                Run an analysis
                            </button>{' '}
                            first.
                        </p>
                    )}
                    {error && <p className="lens-alert lens-alert--critical">{error}</p>}
                </div>
            </section>

            <div className="lens-dash__grid" aria-busy={loading}>
                {tiles.map((t, i) => {
                    const r = byId[t.report]
                    const d = data[t.report]
                    return (
                        <section key={t.report} className={`lens-card lens-dash__tile${t.size === 2 ? ' lens-dash__tile--wide' : ''}`} aria-label={r.name}>
                            <div className="lens-card__header lens-dash__tilehead">
                                <span className={`lens-dash__cat lens-dash__cat--${r.category}`}>{CATEGORY_LABEL[r.category]}</span>
                                <h3 data-tip={r.description}>{r.name}</h3>
                                <span className="lens-dash__tools">
                                    <button type="button" className="lens-icon-btn" onClick={() => d && setDetail({ report: r, group: null })} disabled={!d} aria-label={`Show all rows for ${r.name}`} data-tip="Show all rows">
                                        <Icon name="list" size={14} />
                                    </button>
                                    <button type="button" className="lens-icon-btn" onClick={() => setEditing({ report: r })} aria-label={`${r.can_edit ? 'Edit' : 'Customize'} ${r.name}`} data-tip={r.can_edit ? 'Edit' : 'Customize (saves your own copy)'}>
                                        <Icon name="edit" size={14} />
                                    </button>
                                    <button type="button" className="lens-icon-btn" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${r.name} earlier`} data-tip="Move earlier">
                                        ↑
                                    </button>
                                    <button type="button" className="lens-icon-btn" onClick={() => move(i, 1)} disabled={i === tiles.length - 1} aria-label={`Move ${r.name} later`} data-tip="Move later">
                                        ↓
                                    </button>
                                    <button type="button" className="lens-icon-btn" onClick={() => resize(i)} aria-label={`${t.size === 2 ? 'Narrow' : 'Widen'} ${r.name}`} data-tip={t.size === 2 ? 'Half width' : 'Full width'}>
                                        <Icon name="columns" size={14} />
                                    </button>
                                    <button type="button" className="lens-icon-btn" onClick={() => remove(i)} aria-label={`Remove ${r.name} from the dashboard`} data-tip="Remove from the dashboard (the report is kept)">
                                        <Icon name="close" size={14} />
                                    </button>
                                </span>
                            </div>
                            <div className="lens-card__body">
                                {!d ? <p className="lens-muted">{loading ? 'Calculating…' : 'No data.'}</p> : <ReportChart chart={r.chart} data={d} compact onPick={(g) => setDetail({ report: r, group: g })} />}
                            </div>
                        </section>
                    )
                })}
                {!tiles.length && (
                    <p className="lens-muted">
                        Your dashboard is empty. Use <strong>Add report</strong>, or <strong>Reset</strong> to get the default reports back.
                    </p>
                )}
            </div>

            {editing && (
                <ReportEditor
                    report={editing.report}
                    catalog={catalog}
                    run={dash.run}
                    isAdmin={isAdmin}
                    onSaved={onSaved}
                    onDeleted={onDeleted}
                    onClose={() => setEditing(null)}
                />
            )}
            {detail && data[detail.report.sys_id] && (
                <ReportDetail
                    report={detail.report}
                    data={data[detail.report.sys_id]}
                    group={detail.group}
                    runLabel={rLabel}
                    onOpenRun={run ? () => onOpenRun(run.sys_id) : undefined}
                    onClose={() => setDetail(null)}
                />
            )}
        </div>
    )
}
