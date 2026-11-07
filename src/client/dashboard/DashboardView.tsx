import React, { useEffect, useMemo, useRef, useState } from 'react'
import { LensApi } from '../services/LensApi'
import { RunRecord } from '../types'
import Icon from '../components/Icon'
import CopyButton from '../components/CopyButton'
import { useAssistant } from '../assistant/AssistantContext'
import { dashboardContext } from '../assistant/screenContext'
import HelpTip from '../components/HelpTip'
import Tip from '../components/Tip'
import { ViewName, viewHref } from '../utils/nav'
import ReportChart, { canOverlay, hasGroups } from './ReportChart'
import ReportDetail from './ReportDetail'
import ReportEditor from './ReportEditor'
import ReportPicker from './ReportPicker'
import DashTabs from './DashTabs'
import { addTileToTab, dropAtEnd, dropTile, DropSide, moveTileToTab, readActiveTab, rowsOf, runReportDef, spanOf, SPANS, toggleRow, withSpan, writeActiveTab } from './layout'
import { Catalog, CATEGORY_LABEL, CHART_LABEL, CHART_TYPES, ChartType, DashTab, Dashboard, Report, ReportData, ReportGroup, Span, Tile } from './types'

const CHART_ICON: { [c: string]: string } = { bar: 'chartBar', overlay: 'chartOverlay', pie: 'chartPie', donut: 'chartDonut', tile: 'chartNumber', list: 'table' }

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
 * A title bar can be dragged, which stops text in it being selected. Pressing on the text lets the
 * bar stop being draggable until the mouse is released, so the text can be highlighted.
 */
const selectableText = {
    onMouseDown: (e: React.MouseEvent) => {
        const bar = (e.currentTarget as HTMLElement).closest('[draggable="true"]')
        if (!bar) return
        bar.setAttribute('draggable', 'false')
        const restore = () => {
            bar.setAttribute('draggable', 'true')
            document.removeEventListener('mouseup', restore)
        }
        document.addEventListener('mouseup', restore)
    },
}

/** Gateway errors on a large run mean "slow", not "broken". */
function friendly(e: any, slow: string): string {
    const message = String((e && e.message) || e)
    return /\(50[234]\)/.test(message) ? slow : message
}

/**
 * Reporting dashboard: pre-built and customized reports (high risk, vulnerabilities, comparisons)
 * calculated from a saved run. Each user arranges their own tabs and tiles; shipped reports are
 * read-only and "Customize" saves a personal copy.
 *
 * ServiceNow handles one request per session at a time, so a slow calculation holds up everything
 * after it, saves included. Results are therefore kept while the page is open and a report is only
 * requested when it isn't already loaded or on its way.
 */
export default function DashboardView({ isAdmin, onOpenRun, onNavigate }: Props) {
    const [reports, setReports] = useState<Report[]>([])
    const [catalog, setCatalog] = useState<Catalog | null>(null)
    const [dash, setDash] = useState<Dashboard | null>(null)
    const [runs, setRuns] = useState<RunRecord[]>([])
    const [runsLoaded, setRunsLoaded] = useState(false)
    const [loadedRun, setLoadedRun] = useState<RunRecord | null>(null)
    const [data, setData] = useState<{ [id: string]: ReportData }>({})
    const [pending, setPending] = useState(0)
    const [error, setError] = useState('')
    const [loadError, setLoadError] = useState('')
    const [saveError, setSaveError] = useState('')
    const [retry, setRetry] = useState(0)
    const [adding, setAdding] = useState(false)
    const [picking, setPicking] = useState(false)
    const [newTabRequest, setNewTabRequest] = useState(0)
    const pickerSlot = useRef<HTMLDivElement>(null)
    const [pickBusy, setPickBusy] = useState(false)
    const [editing, setEditing] = useState<{ report: Report | null } | null>(null)
    const [detail, setDetail] = useState<{ report: Report; group: ReportGroup | null } | null>(null)
    const [activeId, setActiveId] = useState(readActiveTab())
    const [dragReport, setDragReport] = useState('')
    const [dropAt, setDropAt] = useState<{ report: string; side: DropSide } | null>(null)
    const [menu, setMenu] = useState<{ report: string; kind: 'move' | 'width' } | null>(null)
    const addRef = useRef<HTMLDivElement>(null)
    const loaded = useRef<{ [report: string]: string }>({})
    const inflight = useRef<{ [key: string]: boolean }>({})
    const nextSave = useRef<{ tabs: DashTab[]; run: string } | null>(null)
    const saving = useRef(false)

    const byId = useMemo(() => {
        const m: { [id: string]: Report } = {}
        for (const r of reports) m[r.sys_id] = r
        return m
    }, [reports])
    const tabs = dash?.tabs || []
    const activeTab = tabs.filter((t) => t.id === activeId)[0] || tabs[0]
    const tiles = (activeTab?.tiles || []).filter((t) => byId[t.report])
    // cards that begin a row, so the move menu can say "Start a new row" only where it changes something
    const rowStarts = new Set(rowsOf(tiles).map((r) => r[0]))
    // the run list is newest first, so the shown run needs no request; only a run too old for the list does
    const run = (dash?.run ? runs.filter((r) => r.sys_id === dash.run)[0] : runs[0]) || loadedRun

    // first load: reports, my dashboard, recent runs
    useEffect(() => {
        ;(async () => {
            try {
                const [rep, d, rs] = await Promise.all([LensApi.reports(), LensApi.dashboard(), LensApi.listRuns({ limit: 30 })])
                setReports(rep.reports)
                setCatalog(rep.catalog)
                setDash(d)
                setRuns(rs.filter((r) => r.status === 'complete'))
                setRunsLoaded(true)
            } catch (e: any) {
                setError(e.message)
            }
        })()
    }, [])

    // tell the Security Assistant what this tab shows
    const assistant = useAssistant()
    useEffect(() => {
        if (!dash) return
        assistant.setContext(
            dashboardContext({
                tab: activeTab,
                shownRun: run,
                reports: tiles.map((t) => ({ name: byId[t.report].name, data: data[t.report] })),
                detail: detail ? `The rows behind report "${detail.report.name}"${detail.group ? `, group "${detail.group.label}"` : ''} are open.` : undefined,
            })
        )
    }, [activeTab?.id, activeTab?.title, activeTab?.description, tiles.map((t) => t.report).join(','), data, run?.sys_id, detail])
    useEffect(() => () => assistant.setContext({}), [])

    // the picker opens after the last report, which can be well below the button that asked for it
    useEffect(() => {
        if (picking) pickerSlot.current?.scrollIntoView({ block: 'nearest' })
    }, [picking])

    // what a tile's numbers depend on: its run and its definition
    const keyOf = (t: Tile) => {
        const r = byId[t.report]
        return `${r.options.run || dash?.run || 'latest'}|${JSON.stringify([r.measure, r.chart, r.options])}`
    }
    const tileKey = tiles.map((t) => `${t.report}=${keyOf(t)}`).join(',')

    // Calculate only what this tab is missing. Results arriving after the tab changed are kept, so
    // coming back doesn't ask again. Reports saved from a run go in their own request, so a large
    // run can't hold up the rest of the tab.
    useEffect(() => {
        if (!dash) return
        const need = tiles.filter((t) => loaded.current[t.report] !== keyOf(t) && !inflight.current[`${t.report}=${keyOf(t)}`])
        if (!need.length) return
        const groups: { [run: string]: Tile[] } = {}
        for (const t of need) {
            const key = byId[t.report].options.run || ''
            ;(groups[key] = groups[key] || []).push(t)
        }
        for (const pin of Object.keys(groups)) {
            const list = groups[pin]
            const keys = list.map((t) => keyOf(t))
            list.forEach((t, i) => (inflight.current[`${t.report}=${keys[i]}`] = true))
            setPending((n) => n + 1)
            LensApi.dashboardData(pin || dash.run, list.map((t) => t.report))
                .then((r) => {
                    if (!pin && r.run) setLoadedRun(r.run)
                    setData((d) => ({ ...d, ...r.reports }))
                    list.forEach((t, i) => {
                        const got = r.reports[t.report]
                        if (got && !got.error) loaded.current[t.report] = keys[i]
                    })
                    setLoadError('')
                })
                .catch((e) => setLoadError(friendly(e, 'This run is large, so its reports took longer than the connection allows. They may still finish.')))
                .finally(() => {
                    list.forEach((t, i) => delete inflight.current[`${t.report}=${keys[i]}`])
                    setPending((n) => n - 1)
                })
        }
    }, [tileKey, retry])

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

    // One save at a time, latest wins: a change made while another is on its way isn't lost or undone.
    const flushSaves = async () => {
        if (saving.current) return
        saving.current = true
        let body: { tabs: DashTab[]; run: string } | null = null
        try {
            while (nextSave.current) {
                body = nextSave.current
                nextSave.current = null
                const saved = await LensApi.saveDashboard(body)
                if (!nextSave.current) setDash(saved)
            }
            setSaveError('')
        } catch (e: any) {
            if (!nextSave.current) nextSave.current = body
            setSaveError(friendly(e, 'The instance is busy with a large run.'))
        } finally {
            saving.current = false
        }
    }
    const save = (nextTabs: DashTab[], runId?: string) => {
        const next = { tabs: nextTabs, run: runId !== undefined ? runId : dash?.run || '' }
        setDash({ tabs: nextTabs, run: next.run, custom: true })
        nextSave.current = next
        flushSaves()
    }
    const saveTiles = (list: Tile[]) => save(tabs.map((t) => (t.id === activeTab.id ? { ...t, tiles: list } : t)))
    const selectTab = (id: string) => {
        setActiveId(id)
        setPicking(false)
        writeActiveTab(id)
    }
    const reset = async () => {
        if (!window.confirm('Reset your dashboard to the default reports? Your tabs are removed. Your own reports are kept and can be added again.')) return
        nextSave.current = null
        setSaveError('')
        setDash(await LensApi.resetDashboard())
    }
    // how a card shows its report: its own choice, or the report's chart. It only changes how the
    // same numbers are drawn, so nothing is recalculated.
    const chartOf = (t: Tile): ChartType => t.chart || byId[t.report].chart
    const setChart = (report: string, chart: ChartType) =>
        saveTiles(
            tiles.map((t) => {
                if (t.report !== report) return t
                const { chart: _old, ...rest } = t
                return chart === byId[report].chart ? rest : { ...rest, chart }
            })
        )
    const setSpan = (report: string, span: Span) => {
        setMenu(null)
        saveTiles(tiles.map((t) => (t.report === report ? withSpan(t, span) : t)))
    }
    // the same moves as dragging, for keyboards and touch screens
    const moveBy = (report: string, step: -1 | 1) => {
        setMenu(null)
        const i = tiles.findIndex((t) => t.report === report)
        const other = tiles[i + step]
        if (other) saveTiles(dropTile(tiles, report, other.report, step < 0 ? 'before' : 'after'))
    }
    const remove = (i: number) => saveTiles(tiles.filter((_t, k) => k !== i))
    const add = (id: string) => {
        setAdding(false)
        save(addTileToTab(tabs, id, activeTab.id))
    }
    const moveToTab = (report: string, tabId: string) => {
        setMenu(null)
        save(moveTileToTab(tabs, report, activeTab.id, tabId))
    }
    const endDrag = () => {
        setDragReport('')
        setDropAt(null)
    }
    const dropOn = (target: string, side: DropSide) => {
        if (dragReport && dragReport !== target) saveTiles(dropTile(tiles, dragReport, target, side))
        endDrag()
    }
    // where a dragged card would land: beside this one, or under its row near the bottom edge
    const sideAt = (e: React.DragEvent, box: DOMRect): DropSide => (e.clientY > box.top + box.height * 0.72 ? 'below' : e.clientX > box.left + box.width / 2 ? 'after' : 'before')

    // a card's menus close on a click anywhere else
    useEffect(() => {
        if (!menu) return
        const away = (e: MouseEvent) => !(e.target as Element).closest('.lens-dash__menuwrap') && setMenu(null)
        const key = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(null)
        document.addEventListener('mousedown', away)
        document.addEventListener('keydown', key)
        return () => {
            document.removeEventListener('mousedown', away)
            document.removeEventListener('keydown', key)
        }
    }, [menu])

    /**
     * From the picker. Runs alone: one report of each run's data. Ticked reports alone: added as they
     * are. Both: each ticked report once per run, as a copy tied to that run.
     */
    const addPicked = async (ids: string[], from: RunRecord[]) => {
        setPickBusy(true)
        const copies: Report[] = []
        const finish = () => {
            let next = tabs
            for (const id of from.length ? copies.map((c) => c.sys_id) : ids) next = addTileToTab(next, id, activeTab.id)
            setReports((list) => list.concat(copies))
            save(next)
        }
        try {
            for (const source of from) {
                if (!ids.length) copies.push(await LensApi.saveReport(runReportDef(source) as Partial<Report>))
                for (const id of ids) {
                    const r = byId[id]
                    copies.push(
                        await LensApi.saveReport({
                            name: `${r.name} (${source.number})`.substring(0, 100),
                            description: r.description,
                            category: r.category,
                            measure: r.measure,
                            chart: r.chart,
                            options: { ...r.options, run: source.sys_id },
                            copied_from: r.sys_id,
                        } as Partial<Report> & { copied_from?: string })
                    )
                }
            }
            finish()
            setPicking(false)
        } catch (e: any) {
            // keep what was made, so trying again only needs the rest
            if (copies.length) finish()
            setSaveError(friendly(e, 'The instance is busy with a large run.'))
        } finally {
            setPickBusy(false)
        }
    }

    const onSaved = (r: Report, replaced: string | null) => {
        setReports((list) => (list.some((x) => x.sys_id === r.sys_id) ? list.map((x) => (x.sys_id === r.sys_id ? r : x)) : list.concat([r])))
        setEditing(null)
        // the chart just chosen in the editor replaces any choice made on the card
        const fresh = ({ chart: _old, ...t }: Tile, report: string): Tile => ({ ...t, report })
        if (replaced) save(tabs.map((tab) => ({ ...tab, tiles: tab.tiles.map((t) => (t.report === replaced ? fresh(t, r.sys_id) : t)) })))
        else if (tabs.some((tab) => tab.tiles.some((t) => t.report === r.sys_id && t.chart))) save(tabs.map((tab) => ({ ...tab, tiles: tab.tiles.map((t) => (t.report === r.sys_id ? fresh(t, r.sys_id) : t)) })))
        else if (!tabs.some((tab) => tab.tiles.some((t) => t.report === r.sys_id))) save(addTileToTab(tabs, r.sys_id, activeTab.id))
    }
    const onDeleted = (id: string) => {
        setReports((list) => list.filter((x) => x.sys_id !== id))
        setEditing(null)
        save(tabs.map((tab) => ({ ...tab, tiles: tab.tiles.filter((t) => t.report !== id) })))
    }

    if (error && !dash) return <div className="lens-alert lens-alert--critical">{error}</div>
    if (!dash || !catalog) return <p className="lens-muted">Loading the dashboard…</p>

    const rLabel = runLabel(run)
    const detailSource = detail && data[detail.report.sys_id] ? data[detail.report.sys_id].source : undefined
    const groupedAdd = (['high_risk', 'vulnerability', 'overview', 'comparison'] as const).map((cat) => ({ cat, list: reports.filter((r) => r.category === cat) }))
    const picker = (onCancel?: () => void) => <ReportPicker reports={reports} tabs={tabs} activeTab={activeTab} runs={runs} busy={pickBusy} onAdd={addPicked} onCancel={onCancel} />

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
                        <select className="lens-input" value={dash.run} onChange={(e) => save(tabs, e.target.value)} aria-label="Run the reports use">
                            <option value="">Latest run{!dash.run && run ? ` (${run.number})` : ''}</option>
                            {runs.map((r) => (
                                <option key={r.sys_id} value={r.sys_id}>
                                    {r.number}
                                    {r.name ? ` ${r.name}` : ''} · {(r.subject_summary || '').substring(0, 60)}
                                </option>
                            ))}
                        </select>
                    </label>
                    {run && <CopyButton text={`${run.number}${run.name ? ` ${run.name}` : ''}`} label={`the name of run ${run.number}`} />}
                    <HelpTip label="Which run do reports use?">
                        <span>
                            Reports use the run chosen under Data from, on every tab. A report made with <strong>Save as report</strong> on a run page, or added from a previous run, keeps showing that run
                            instead, and its title bar names the run.
                        </span>
                    </HelpTip>
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
                                    <div className="lens-dash__menugroup">
                                        <button
                                            type="button"
                                            role="menuitem"
                                            onClick={() => {
                                                setAdding(false)
                                                setPicking(true)
                                            }}
                                        >
                                            <strong>Add several, or from a previous run…</strong>
                                        </button>
                                    </div>
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
                                                                {on && <span className="lens-muted"> · on this tab</span>}
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
                <div className="lens-card__body lens-dash__body">
                    <Tip id="dash-intro">
                        Reports are calculated from a saved run: pick it under <em>Data from</em>. Click a bar, slice or number to see the rows behind it. Drag reports and tabs to
                        rearrange them. Reports shipped with ACL Lens are read-only: <em>Customize</em> saves your own copy.
                    </Tip>
                    {runsLoaded && !runs.length && !run && (
                        <p className="lens-alert lens-alert--warning">
                            There's no saved run to report on yet.{' '}
                            <button type="button" className="lens-link" onClick={() => onNavigate('workspace')}>
                                Run an analysis
                            </button>{' '}
                            first.
                        </p>
                    )}
                    {error && <p className="lens-alert lens-alert--critical">{error}</p>}
                    {saveError && (
                        <p className="lens-alert lens-alert--critical" role="alert">
                            Your last dashboard change isn't saved yet. {saveError}{' '}
                            <button type="button" className="lens-link" onClick={flushSaves}>
                                Save again
                            </button>
                        </p>
                    )}
                    {loadError && (
                        <p className="lens-alert lens-alert--warning" role="status">
                            {loadError}{' '}
                            <button
                                type="button"
                                className="lens-link"
                                onClick={() => {
                                    setLoadError('')
                                    setRetry(retry + 1)
                                }}
                            >
                                Try again
                            </button>
                        </p>
                    )}
                    <DashTabs
                        tabs={tabs}
                        active={activeTab.id}
                        onSelect={selectTab}
                        onChange={(next) => save(next)}
                        tileDragging={!!dragReport}
                        newTabRequest={newTabRequest}
                        onTileDrop={(tabId) => {
                            moveToTab(dragReport, tabId)
                            endDrag()
                        }}
                    />
                    {pending > 0 && (
                        <p className="lens-muted" role="status">
                            Calculating reports… A large run can take a minute the first time. After that its reports open right away.
                        </p>
                    )}
                    <div
                        id="dash-tabpanel"
                        role="tabpanel"
                        aria-labelledby={`dash-tab-${activeTab.id}`}
                        className="lens-dash__grid"
                        aria-busy={pending > 0}
                        onDragOver={(e) => {
                            // the empty space after the last card: drop there to move a report to a new row at the end
                            if (dragReport && e.target === e.currentTarget) e.preventDefault()
                        }}
                        onDrop={(e) => {
                            if (!dragReport || e.target !== e.currentTarget) return
                            e.preventDefault()
                            saveTiles(dropAtEnd(tiles, dragReport))
                            endDrag()
                        }}
                    >
                        {tiles.map((t, i) => {
                            const r = byId[t.report]
                            const d = data[t.report]
                            const span = spanOf(t)
                            const classes = ['lens-card', 'lens-dash__tile', `lens-dash__tile--span-${span}`]
                            if (t.row) classes.push('lens-dash__tile--row')
                            if (dragReport === t.report) classes.push('lens-dash__tile--dragging')
                            if (dropAt && dropAt.report === t.report) classes.push(`lens-dash__tile--drop-${dropAt.side}`)
                            // the run this card's numbers come from, opened from its title
                            const from = d && d.source ? d.source : run
                            const rowStart = rowStarts.has(i)
                            return (
                                <section
                                    key={t.report}
                                    className={classes.join(' ')}
                                    aria-label={r.name}
                                    onDragOver={(e) => {
                                        if (!dragReport || dragReport === t.report) return
                                        e.preventDefault()
                                        const side = sideAt(e, e.currentTarget.getBoundingClientRect())
                                        if (!dropAt || dropAt.report !== t.report || dropAt.side !== side) setDropAt({ report: t.report, side })
                                    }}
                                    onDrop={(e) => {
                                        if (!dragReport) return
                                        e.preventDefault()
                                        dropOn(t.report, sideAt(e, e.currentTarget.getBoundingClientRect()))
                                    }}
                                >
                                    <div
                                        className="lens-card__header lens-dash__tilehead"
                                        draggable
                                        onDragStart={(e) => {
                                            e.dataTransfer.effectAllowed = 'move'
                                            e.dataTransfer.setData('text/plain', r.name)
                                            const tile = e.currentTarget.parentElement
                                            if (tile) e.dataTransfer.setDragImage(tile, 24, 16)
                                            // after the browser has taken its picture of the card
                                            window.setTimeout(() => setDragReport(t.report), 0)
                                        }}
                                        onDragEnd={endDrag}
                                    >
                                        <div className="lens-dash__tiletop">
                                            <span className="lens-dash__grip" data-tip="Drag to move this report: drop it beside another card, near a card's bottom edge for a new row, or on another tab">
                                                <Icon name="grip" size={14} />
                                            </span>
                                            <span className={`lens-dash__cat lens-dash__cat--${r.category}`}>{CATEGORY_LABEL[r.category]}</span>
                                            <span className="lens-dash__name">
                                                <h3 data-tip={from ? undefined : r.description} {...selectableText}>
                                                    {from ? (
                                                        <a
                                                            className="lens-dash__titlelink"
                                                            href={viewHref('run', from.sys_id)}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            draggable={false}
                                                            aria-label={`${r.name}: open run ${from.number} (opens in a new window)`}
                                                            data-tip={`${r.description ? `${r.description} ` : ''}Opens run ${from.number}${d && d.source ? '' : ', the run the dashboard shows,'} in a new window.`}
                                                        >
                                                            {r.name}
                                                            <Icon name="external" size={12} />
                                                        </a>
                                                    ) : (
                                                        r.name
                                                    )}
                                                </h3>
                                                <CopyButton text={d && d.source && r.name.indexOf(d.source.number) < 0 ? `${d.source.number} ${r.name}` : r.name} label={`the name of ${r.name}`} />
                                            </span>
                                            <span className="lens-dash__views" role="group" aria-label={`Show ${r.name} as`}>
                                                {CHART_TYPES.map((c) => {
                                                    const unavailable = !!d && !d.error && (c === 'overlay' ? !canOverlay(d) : c !== 'tile' && c !== 'list' && !hasGroups(d))
                                                    return (
                                                        <button
                                                            key={c}
                                                            type="button"
                                                            className={`lens-icon-btn lens-dash__view${chartOf(t) === c ? ' lens-dash__view--on' : ''}`}
                                                            aria-pressed={chartOf(t) === c}
                                                            aria-label={CHART_LABEL[c]}
                                                            disabled={unavailable}
                                                            data-tip={unavailable ? (c === 'overlay' ? "Overlay bars need a report whose groups are broken down, and this one isn't." : 'This report has no groups to chart. Choose a Group by to use this.') : `Show as: ${CHART_LABEL[c]}`}
                                                            onClick={() => setChart(t.report, c)}
                                                        >
                                                            <Icon name={CHART_ICON[c]} size={14} />
                                                        </button>
                                                    )
                                                })}
                                            </span>
                                        </div>
                                        <span className="lens-dash__tools">
                                            <button type="button" className="lens-icon-btn" onClick={() => d && setDetail({ report: r, group: null })} disabled={!d} aria-label={`Show all rows for ${r.name}`} data-tip="Show all rows">
                                                <Icon name="list" size={14} />
                                            </button>
                                            <button type="button" className="lens-icon-btn" onClick={() => setEditing({ report: r })} aria-label={`${r.can_edit ? 'Edit' : 'Customize'} ${r.name}`} data-tip={r.can_edit ? 'Edit' : 'Customize (saves your own copy)'}>
                                                <Icon name="edit" size={14} />
                                            </button>
                                            <span className="lens-dash__menuwrap">
                                                <button type="button" className="lens-icon-btn" aria-haspopup="menu" aria-expanded={!!menu && menu.report === t.report && menu.kind === 'width'} aria-label={`Width of ${r.name}`} data-tip="Width: full row, half, two thirds or a third" onClick={() => setMenu(menu && menu.report === t.report && menu.kind === 'width' ? null : { report: t.report, kind: 'width' })}>
                                                    <Icon name="columns" size={14} />
                                                </button>
                                                {menu && menu.report === t.report && menu.kind === 'width' && (
                                                    <ul className="lens-menu__list" role="menu" aria-label={`Width of ${r.name}`}>
                                                        {SPANS.map((s) => (
                                                            <li key={s.span} role="none">
                                                                <button type="button" role="menuitemradio" aria-checked={span === s.span} onClick={() => setSpan(t.report, s.span)}>
                                                                    <span className={`lens-dash__spanicon lens-dash__spanicon--${s.span}`} aria-hidden="true" />
                                                                    {s.label}
                                                                    {span === s.span && <Icon name="check" size={12} />}
                                                                </button>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </span>
                                            <span className="lens-dash__menuwrap">
                                                <button type="button" className="lens-icon-btn" aria-haspopup="menu" aria-expanded={!!menu && menu.report === t.report && menu.kind === 'move'} aria-label={`Move ${r.name}`} data-tip="Move: earlier, later, a new row or another tab. You can also drag the card." onClick={() => setMenu(menu && menu.report === t.report && menu.kind === 'move' ? null : { report: t.report, kind: 'move' })}>
                                                    <Icon name="move" size={14} />
                                                </button>
                                                {menu && menu.report === t.report && menu.kind === 'move' && (
                                                    <ul className="lens-menu__list" role="menu" aria-label={`Move ${r.name}`}>
                                                        <li role="none">
                                                            <button type="button" role="menuitem" disabled={i === 0} onClick={() => moveBy(t.report, -1)}>
                                                                Earlier
                                                            </button>
                                                        </li>
                                                        <li role="none">
                                                            <button type="button" role="menuitem" disabled={i === tiles.length - 1} onClick={() => moveBy(t.report, 1)}>
                                                                Later
                                                            </button>
                                                        </li>
                                                        {i > 0 && (
                                                            <li role="none">
                                                                <button
                                                                    type="button"
                                                                    role="menuitem"
                                                                    onClick={() => {
                                                                        setMenu(null)
                                                                        saveTiles(toggleRow(tiles, t.report))
                                                                    }}
                                                                >
                                                                    {t.row ? 'Join the row above' : rowStart ? 'Keep on its own row' : 'Start a new row'}
                                                                </button>
                                                            </li>
                                                        )}
                                                        {tabs
                                                            .filter((x) => x.id !== activeTab.id)
                                                            .map((x) => (
                                                                <li key={x.id} role="none">
                                                                    <button type="button" role="menuitem" onClick={() => moveToTab(t.report, x.id)}>
                                                                        To {x.title}
                                                                    </button>
                                                                </li>
                                                            ))}
                                                    </ul>
                                                )}
                                            </span>
                                            <button type="button" className="lens-icon-btn" onClick={() => remove(i)} aria-label={`Remove ${r.name} from this tab`} data-tip="Remove from this tab (the report is kept)">
                                                <Icon name="close" size={14} />
                                            </button>
                                        </span>
                                    </div>
                                    <div className="lens-card__body">
                                        {!d ? <p className="lens-muted">{pending > 0 ? 'Calculating…' : 'No data.'}</p> : <ReportChart chart={chartOf(t)} data={d} compact onPick={(g) => setDetail({ report: r, group: g })} />}
                                    </div>
                                </section>
                            )
                        })}
                        {!tiles.length && <div className="lens-dash__empty">{picker()}</div>}
                        {tiles.length > 0 && picking && (
                            <div className="lens-dash__tile--span-6 lens-dash__tile--row" ref={pickerSlot}>
                                {picker(() => setPicking(false))}
                            </div>
                        )}
                        {tiles.length > 0 && !picking && (
                            <div className="lens-dash__addcard lens-dash__tile--span-3">
                                <span className="lens-subject__plus" aria-hidden="true">
                                    +
                                </span>
                                <span className="lens-muted">Add a report</span>
                                <span className="lens-dash__addactions">
                                    <button type="button" className="lens-btn lens-dash__addbtn" onClick={() => setPicking(true)} data-tip={`Choose runs or reports to add to ${activeTab.title}`}>
                                        To this tab
                                    </button>
                                    {tabs.length < 20 && (
                                        <button type="button" className="lens-btn lens-dash__addbtn" onClick={() => setNewTabRequest((n) => n + 1)} data-tip="Name a new tab, then choose what to put on it">
                                            To a new tab
                                        </button>
                                    )}
                                    <button type="button" className="lens-btn lens-dash__addbtn" onClick={() => setEditing({ report: null })} data-tip={`Build a report from scratch. It's added to ${activeTab.title}.`}>
                                        Build a new report
                                    </button>
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {editing && (
                <ReportEditor
                    report={editing.report}
                    catalog={catalog}
                    run={dash.run}
                    isAdmin={isAdmin}
                    pinLabel={editing.report && data[editing.report.sys_id] && data[editing.report.sys_id].source ? (data[editing.report.sys_id].source as NonNullable<ReportData['source']>).number : undefined}
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
                    runLabel={detailSource ? `${detailSource.number}${detailSource.name ? ` ${detailSource.name}` : ''} · ${detailSource.created}` : rLabel}
                    onOpenRun={detailSource ? () => onOpenRun(detailSource.sys_id) : run ? () => onOpenRun(run.sys_id) : undefined}
                    onClose={() => setDetail(null)}
                />
            )}
        </div>
    )
}
