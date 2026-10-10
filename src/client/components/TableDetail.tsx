import React, { useEffect, useMemo, useRef, useState } from 'react'
import { rankFilter } from '../utils/rank'
import DocLink from './DocLink'
import RecordLink, { recordUrl } from './RecordLink'
import SortTh, { GroupedRows, ListBreadcrumb, useSort } from './SortTh'
import { LensApi } from '../services/LensApi'
import { AnalysisResult, EXTRA_OPS, FIELD_OPS, FieldDetail, TABLE_OPS } from '../types'
import DataFilterList from './DataFilterList'
import LiveCheck from './LiveCheck'
import { download, safeName, toCsv } from '../utils/download'
import { OP_HELP, OP_SHORT, rank, statusText } from '../utils/status'
import AclList from './AclList'
import { StatusCell } from './StatusCell'
import Tip from './Tip'
import Icon from './Icon'
import { useAssistant } from '../assistant/AssistantContext'
import ListActions from './ListActions'
import { fieldsOf } from '../utils/snList'
import SubjectName from './SubjectName'
import { useSubjectVisible } from './SubjectName'

interface Props {
    results: AnalysisResult
    index: number
    canLiveCheck?: boolean
    onClose: () => void
}

export default function TableDetail({ results, index, canLiveCheck, onClose }: Props) {
    const subs = results.subjects
    const subjectVisible = useSubjectVisible()
    const shownSubs = subs.filter((s) => subjectVisible(s.subject.key))
    const table = subs[0].tables[index]
    const dd = results.defaultDeny
    const [tab, setTab] = useState<'table' | 'fields' | 'filters' | 'live'>('table')
    const [live, setLive] = useState<FieldDetail | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [q, setQ] = useState('')
    const [diffOnly, setDiffOnly] = useState(false)
    const [closing, setClosing] = useState(false)
    const panelRef = useRef<HTMLDivElement>(null)

    // move focus into the dialog on open and give it back to the opener on close
    useEffect(() => {
        const opener = document.activeElement as HTMLElement | null
        panelRef.current?.focus()
        return () => opener?.focus?.()
    }, [])

    // keep Tab inside the dialog
    const trapTab = (e: React.KeyboardEvent) => {
        if (e.key !== 'Tab' || !panelRef.current) return
        const f = panelRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])')
        if (!f.length) return
        const first = f[0]
        const last = f[f.length - 1]
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault()
            last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault()
            first.focus()
        }
    }
    const assistant = useAssistant()

    // slide out, then unmount
    const requestClose = () => {
        if (closing) return
        setClosing(true)
        setTimeout(onClose, 320)
    }

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && requestClose()
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [closing])

    useEffect(() => {
        const prev = assistant.context
        assistant.setContext({ ...prev, table: table.t })
        return () => assistant.setContext({ ...prev, table: undefined })
    }, [table.t])

    const loadFields = async () => {
        setLoading(true)
        setError('')
        try {
            setLive(await LensApi.fields(table.t, subs.map((s) => ({ type: s.subject.type, id: s.subject.id }))))
        } catch (e: any) {
            setError(e.message)
        } finally {
            setLoading(false)
        }
    }

    const liveRows = useMemo(() => {
        if (!live) return []
        const rows = rankFilter(live.rows, q, (r) => [r.field.name, r.field.label])
        if (!diffOnly) return rows
        return rows.filter((r) => FIELD_OPS.some((op) => new Set(live.subjects.map((s) => r.cells[s.key][op].s)).size > 1))
    }, [live, q, diffOnly])

    const liveColumns: { [key: string]: (r: (typeof liveRows)[number]) => string | number } = { field: (r) => r.field.label || r.field.name }
    if (live) for (const sub of live.subjects) for (const op of FIELD_OPS) liveColumns[`${sub.key}:${op}`] = (r) => rank(r.cells[sub.key][op].s, dd)
    const liveGroupLabel: { [key: string]: (r: (typeof liveRows)[number]) => string } = {}
    if (live) for (const sub of live.subjects) for (const op of FIELD_OPS) liveGroupLabel[`${sub.key}:${op}`] = (r) => statusText(r.cells[sub.key][op].s, dd)
    const liveSort = useSort(liveRows, liveColumns, { groupLabel: liveGroupLabel })

    const exportLive = () => {
        if (!live) return
        const head = ['Field', 'Label', 'Type', 'Defined on'].concat(live.subjects.flatMap((s) => FIELD_OPS.map((op) => `${s.label} ${op}`)))
        const rows: unknown[][] = [head]
        for (const r of liveSort.rows) rows.push([r.field.name, r.field.label, r.field.type, r.field.definedOn].concat(live.subjects.flatMap((s) => FIELD_OPS.map((op) => statusText(r.cells[s.key][op].s, dd)))))
        download(`${safeName(table.t)}-fields.csv`, toCsv(rows), 'text/csv;charset=utf-8')
    }

    return (
        <div className={`lens-drawer${closing ? ' lens-drawer--closing' : ''}`} role="dialog" aria-modal="true" aria-labelledby="drawer-title">
            <div className="lens-drawer__backdrop" onClick={requestClose} />
            <div className="lens-drawer__panel" ref={panelRef} tabIndex={-1} onKeyDown={trapTab}>
                <header className="lens-drawer__head">
                    <div>
                        <h2 id="drawer-title">{table.l}</h2>
                        <p className="lens-drawer__links">
                            <code>{table.t}</code>
                            <RecordLink href={recordUrl.table(table.t)} what={`table definition for ${table.t}`}>
                                Table definition
                            </RecordLink>
                            <RecordLink href={recordUrl.tableRecords(table.t)} what={`list of ${table.t} records`}>
                                Records
                            </RecordLink>
                        </p>
                    </div>
                    <div className="lens-actions">
                        <a
                            className="lens-btn lens-btn--tertiary"
                            href={`/sys_security_acl_list.do?sysparm_query=nameSTARTSWITH${table.t}`}
                            target="_blank"
                            rel="noreferrer"
                            data-tip="Opens the platform ACL list for this table in a new tab (needs permission to read ACLs)."
                        >
                            Open ACL list
                        </a>
                        <button
                            type="button"
                            className="lens-btn lens-btn--secondary"
                            onClick={() => assistant.ask(`Explain the access results for the ${table.t} table in this run and anything I should check.`)}
                            data-tip="Opens the Security Assistant with a question about this table."
                        >
                            <Icon name="shield" size={14} />
                            Ask assistant
                        </button>
                        <button type="button" className="lens-btn lens-btn--tertiary" onClick={requestClose} aria-label="Close details">
                            Close
                        </button>
                    </div>
                </header>
                <div className="lens-segment lens-drawer__tabs" role="tablist">
                    <button type="button" role="tab" aria-selected={tab === 'table'} className={`lens-segment__item${tab === 'table' ? ' lens-segment__item--on' : ''}`} onClick={() => setTab('table')}>
                        Record rules
                    </button>
                    <button type="button" role="tab" aria-selected={tab === 'fields'} className={`lens-segment__item${tab === 'fields' ? ' lens-segment__item--on' : ''}`} onClick={() => setTab('fields')}>
                        Field rules
                    </button>
                    {!!table.sdf && table.sdf.length > 0 && (
                        <button type="button" role="tab" aria-selected={tab === 'filters'} className={`lens-segment__item${tab === 'filters' ? ' lens-segment__item--on' : ''}`} onClick={() => setTab('filters')}>
                            Data filters ({table.sdf.length})
                        </button>
                    )}
                    <button
                        type="button"
                        role="tab"
                        aria-selected={tab === 'live'}
                        className={`lens-segment__item${tab === 'live' ? ' lens-segment__item--on' : ''}`}
                        onClick={() => setTab('live')}
                        data-tip="Ask the platform to evaluate access right now, as its Access Analyzer does, and compare with ACL Lens's prediction."
                    >
                        Check live
                    </button>
                </div>
                <div className="lens-drawer__body">
                    {tab === 'table' && (
                        <>
                        <Tip id="detail-acls">
                            Each operation shows the ACL level that matched and every rule checked there. Deny-unless rules must all pass; any one allow-if rule is enough. For a
                            Conditional result, use "Show the condition" to see what decides it. <DocLink doc="strategy" label="ServiceNow: Allow-If vs Deny-Unless and ACL best practices" />
                        </Tip>
                        <div className="lens-detail-grid" style={{ gridTemplateColumns: `repeat(${shownSubs.length}, minmax(260px, 1fr))` }}>
                            {shownSubs.map((s) => (
                                <section key={s.subject.key} className="lens-detail-col">
                                    <h3>
                                        <span className={`lens-kind lens-kind--${s.subject.type}`}>{s.subject.type}</span> {s.subject.label}
                                    </h3>
                                    {TABLE_OPS.map((op) => (
                                        <div key={op} className="lens-detail-op">
                                            <h4>{op}</h4>
                                            <AclList cell={s.tables[index].ops[op]} acls={results.acls} op={op} defaultDeny={dd} />
                                        </div>
                                    ))}
                                    {EXTRA_OPS.some((op) => s.tables[index].ops[op]) && (
                                        <details className="lens-detail-more">
                                            <summary>Other operations (list edit, query, reports…)</summary>
                                            {EXTRA_OPS.filter((op) => s.tables[index].ops[op]).map((op) => (
                                                <div key={op} className="lens-detail-op">
                                                    <h4 data-tip={OP_HELP[op]}>
                                                        {op} <span className="lens-muted">· {OP_HELP[op]}</span>
                                                    </h4>
                                                    <AclList cell={s.tables[index].ops[op]} acls={results.acls} op={op} defaultDeny={dd} />
                                                </div>
                                            ))}
                                        </details>
                                    )}
                                </section>
                            ))}
                        </div>
                        </>
                    )}
                    {tab === 'live' && <LiveCheck results={results} index={index} canRun={!!canLiveCheck} />}
                    {tab === 'filters' && <DataFilterList results={results} index={index} subjects={shownSubs} />}
                    {tab === 'fields' && (
                        <>
                            <p className="lens-muted">
                                Fields with explicit rules from this analysis are listed first. Load every column to evaluate all fields live (includes inherited fields and{' '}
                                <code>*</code> fallbacks). Effective field access also requires record access.
                            </p>
                            <table className="lens-mx lens-mx--compact">
                                <thead>
                                    <tr>
                                        <th>Field rule</th>
                                        {shownSubs.map((s) => (
                                            <th key={s.subject.key} colSpan={FIELD_OPS.length}>
                                                <SubjectName subjectKey={s.subject.key} focusable />
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {table.fields.map((f, fi) => (
                                        <tr key={f.f}>
                                            <th scope="row">{f.f === '*' ? <em>all other fields (*)</em> : <code>{f.f}</code>}</th>
                                            {shownSubs.map((s) =>
                                                FIELD_OPS.map((op) => {
                                                    const c = s.tables[index].fields[fi]?.ops[op]
                                                    return <td key={`${s.subject.key}-${op}`}>{c && <StatusCell s={c.s} op={`${OP_SHORT[op]} ${f.f}`} defaultDeny={dd} differs={c.s !== subs[0].tables[index].fields[fi]?.ops[op].s} />}</td>
                                                })
                                            )}
                                        </tr>
                                    ))}
                                    {!table.fields.length && (
                                        <tr>
                                            <td colSpan={1 + shownSubs.length * FIELD_OPS.length} className="lens-muted">
                                                Field rules were not included in this run.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                            <div className="lens-actions lens-drawer__live">
                                <button type="button" className="lens-btn lens-btn--primary" disabled={loading} onClick={loadFields}>
                                    {loading ? 'Evaluating…' : live ? 'Reload all fields' : 'Load all fields (live)'}
                                </button>
                                {live && (
                                    <>
                                        <input className="lens-input" placeholder="Filter fields…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Filter fields" />
                                        {subs.length > 1 && (
                                            <label className="lens-check">
                                                <input type="checkbox" checked={diffOnly} onChange={(e) => setDiffOnly(e.target.checked)} /> Differences only
                                            </label>
                                        )}
                                        <ListActions
                                            list={fieldsOf(live.chain && live.chain.length ? live.chain : [table.t], liveSort.rows.map((r) => r.field.name), `the dictionary entries for these ${liveSort.rows.length} fields`)}
                                            onExport={exportLive}
                                            exportWhat={`the ${liveSort.rows.length} fields shown`}
                                            filtered={liveSort.rows.length !== live.rows.length}
                                        />
                                    </>
                                )}
                            </div>
                            {error && <div className="lens-alert lens-alert--critical">{error}</div>}
                            {live && (
                                <>
                                <ListBreadcrumb sorter={liveSort} noun="fields" />
                                <table className="lens-mx lens-mx--compact">
                                    <thead>
                                        <tr>
                                            <SortTh sorter={liveSort} col="field">
                                                Field
                                            </SortTh>
                                            {live.subjects.filter((s) => subjectVisible(s.key)).map((s) => (
                                                <th key={s.key} colSpan={FIELD_OPS.length}>
                                                    <SubjectName subjectKey={s.key} label={s.label} focusable />
                                                </th>
                                            ))}
                                        </tr>
                                        <tr>
                                            <th scope="col">
                                                <span className="lens-sr">Sort by result</span>
                                            </th>
                                            {live.subjects.filter((s) => subjectVisible(s.key)).map((s) =>
                                                FIELD_OPS.map((op) => (
                                                    <SortTh key={`${s.key}-${op}`} sorter={liveSort} col={`${s.key}:${op}`} label={`${s.label} ${op}`} tip={`Sort by ${s.label}'s ${op} access (most first)`}>
                                                        {OP_SHORT[op]}
                                                    </SortTh>
                                                ))
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <GroupedRows sorter={liveSort} colSpan={live.subjects.length * FIELD_OPS.length + 1} render={(r) => (
                                            <tr key={r.field.name}>
                                                <th scope="row" title={`${r.field.type} · defined on ${r.field.definedOn}`}>
                                                    {r.field.label} <code>{r.field.name}</code>{' '}
                                                    <RecordLink href={recordUrl.field(r.field.definedOn, r.field.name)} what={`dictionary entry for ${r.field.name}`} />
                                                </th>
                                                {live.subjects.filter((s) => subjectVisible(s.key)).map((s) =>
                                                    FIELD_OPS.map((op) => {
                                                        const c = r.cells[s.key][op]
                                                        const lvl = c.lvl ? `matched ${c.lvl}` : 'no rule'
                                                        return (
                                                            <td key={`${s.key}-${op}`} title={lvl} onContextMenu={liveSort.cellMenu(`${s.key}:${op}`, r)}>
                                                                <StatusCell s={c.s} op={`${op} (${lvl})`} defaultDeny={dd} differs={c.s !== r.cells[live.subjects[0].key][op].s} subjectLabel={s.label} />
                                                            </td>
                                                        )
                                                    })
                                                )}
                                            </tr>
                                        )} />
                                    </tbody>
                                </table>
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
