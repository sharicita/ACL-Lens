import React, { useMemo, useState } from 'react'
import { AnalysisResult, Cell, DataFilterInfo, EXTRA_OPS, FIELD_OPS, Op, TABLE_OPS } from '../types'
import { OP_HELP, OP_SHORT, rank, statusText } from '../utils/status'
import Icon from './Icon'
import { rankFilter } from '../utils/rank'
import { StatusCell } from './StatusCell'
import SortTh, { GroupedRows, ListBreadcrumb, useSort } from './SortTh'
import ListActions from './ListActions'
import { byNames } from '../utils/snList'
import SubjectName from './SubjectName'
import { useSubjectVisible } from './SubjectName'
import ConditionPopover from './ConditionPopover'

interface Props {
    results: AnalysisResult
    hidden: Set<string>
    baseline: string
    onOpenTable: (index: number) => void
    onFilteredChange?: (tables: Set<string>) => void
    /** export the matrix rows currently shown */
    onExport?: () => void
}

const PAGE = 100

export default function AccessMatrix({ results, hidden, baseline, onOpenTable, onFilteredChange, onExport }: Props) {
    const [q, setQ] = useState('')
    const [diffsOnly, setDiffsOnly] = useState(false)
    const [hideNone, setHideNone] = useState(false)
    const [opSel, setOpSel] = useState<Set<Op>>(new Set(TABLE_OPS))
    const [limit, setLimit] = useState(PAGE)
    const [expanded, setExpanded] = useState<Set<number>>(new Set())
    const [collapsing, setCollapsing] = useState<Set<number>>(new Set())
    // the open "why Conditional" panel
    const [cond, setCond] = useState<{ anchor: HTMLElement; cell: Cell; subjectKey: string; subjectLabel: string; op: string; target: string; ti: number } | null>(null)
    const dd = results.defaultDeny
    const subjectVisible = useSubjectVisible()
    const visible = results.subjects.filter((s) => !hidden.has(s.subject.key) && subjectVisible(s.subject.key))
    const baseIdx = Math.max(0, visible.findIndex((s) => s.subject.key === baseline))
    // runs saved before the extra operations were analyzed hold only the core four
    const available = results.ops && results.ops.length ? results.ops : TABLE_OPS
    const extras = EXTRA_OPS.filter((op) => available.indexOf(op) >= 0)
    const ops = available.filter((op) => opSel.has(op))
    const coreOnly = ops.length === TABLE_OPS.length && TABLE_OPS.every((op) => opSel.has(op))
    const allOps = ops.length === available.length
    const toggleOp = (op: Op) => {
        const n = new Set(opSel)
        n.has(op) ? n.delete(op) : n.add(op)
        if (n.size) setOpSel(n)
        setLimit(PAGE)
    }

    const rows = useMemo(() => {
        const first = results.subjects[0]
        if (!first) return []
        const out: { ti: number; differs: boolean }[] = []
        // same ranking as every search box: name starts with -> label starts with -> contains
        const order = rankFilter(first.tables.map((t, ti) => ti), q, (ti) => [first.tables[ti].t, first.tables[ti].l])
        order.forEach((ti) => {
            const t = first.tables[ti]
            let differs = false
            let any = false
            for (const op of ops) {
                const st = visible.map((s) => s.tables[ti].ops[op].s)
                if (new Set(st).size > 1) differs = true
                if (st.some((x) => rank(x, dd, op) > 0)) any = true
            }
            if (!differs)
                t.fields.forEach((_f, fi) => {
                    for (const op of FIELD_OPS) {
                        if (!opSel.has(op)) continue
                        if (new Set(visible.map((s) => s.tables[ti].fields[fi]?.ops[op].s)).size > 1) differs = true
                    }
                })
            if (diffsOnly && !differs) return
            if (hideNone && !any) return
            out.push({ ti, differs })
        })
        return out
    }, [results, q, diffsOnly, hideNone, opSel, hidden])

    // optional column sort; with none chosen, rows keep the search ranking
    const sortCols: { [key: string]: (r: { ti: number; differs: boolean }) => string | number } = { table: (r) => results.subjects[0].tables[r.ti].l || results.subjects[0].tables[r.ti].t }
    for (const s of visible) for (const op of ops) sortCols[`${s.subject.key}:${op}`] = (r) => rank(s.tables[r.ti].ops[op].s, dd, op)
    const groupLabel: { [key: string]: (r: { ti: number; differs: boolean }) => string } = {}
    for (const s of visible) for (const op of ops) groupLabel[`${s.subject.key}:${op}`] = (r) => statusText(s.tables[r.ti].ops[op].s, dd, op)
    const sorter = useSort(rows, sortCols, { groupLabel })

    React.useEffect(() => {
        if (onFilteredChange) onFilteredChange(new Set(rows.map((r) => results.subjects[0].tables[r.ti].t)))
    }, [rows])

    const toggle = (ti: number) => {
        if (!expanded.has(ti)) {
            setExpanded(new Set(expanded).add(ti))
            return
        }
        // play the slide-up animation, then remove the rows
        setCollapsing((c) => new Set(c).add(ti))
        setTimeout(() => {
            setExpanded((e) => {
                const n = new Set(e)
                n.delete(ti)
                return n
            })
            setCollapsing((c) => {
                const n = new Set(c)
                n.delete(ti)
                return n
            })
        }, 260)
    }

    const diffCount = rows.filter((r) => r.differs).length
    return (
        <section className="lens-card" aria-labelledby="mx-title">
            <div className="lens-card__header lens-mx__toolbar">
                <h2 id="mx-title">Access matrix</h2>
                <input className="lens-input lens-mx__search" placeholder="Filter tables…" value={q} aria-label="Filter tables" onChange={(e) => { setQ(e.target.value); setLimit(PAGE) }} />
                <div className="lens-opsel" role="group" aria-label="Operations to show">
                    <span className="lens-opsel__label">Operations</span>
                    {available.map((op) => (
                        <button
                            key={op}
                            type="button"
                            className={`lens-opsel__op${opSel.has(op) ? ' lens-opsel__op--on' : ''}${op === extras[0] ? ' lens-opsel__op--sep' : ''}`}
                            aria-pressed={opSel.has(op)}
                            disabled={opSel.has(op) && ops.length === 1}
                            onClick={() => toggleOp(op)}
                            data-tip={opSel.has(op) && ops.length === 1 ? 'At least one operation stays selected.' : `${opSel.has(op) ? 'Hide' : 'Show'} ${op}: ${OP_HELP[op]}`}
                        >
                            {OP_SHORT[op]}
                            <span className="lens-sr"> ({op})</span>
                        </button>
                    ))}
                    {!allOps && (
                        <button type="button" className="lens-link lens-opsel__all" onClick={() => setOpSel(new Set(available))} data-tip="Show every operation">
                            All
                        </button>
                    )}
                    {!coreOnly && (
                        <button
                            type="button"
                            className="lens-btn lens-btn--tertiary lens-opsel__reset"
                            onClick={() => {
                                setOpSel(new Set(TABLE_OPS))
                                setLimit(PAGE)
                            }}
                            data-tip="Back to the default: create, read, write and delete"
                        >
                            <Icon name="restore" size={13} />
                            Reset
                        </button>
                    )}
                </div>
                {visible.length > 1 && (
                    <label className="lens-check">
                        <input type="checkbox" checked={diffsOnly} onChange={(e) => { setDiffsOnly(e.target.checked); setLimit(PAGE) }} />{' '}
                        <span data-tip="Only show tables where the visible subjects differ on any operation or field rule.">Differences only</span>
                    </label>
                )}
                <label className="lens-check">
                    <input type="checkbox" checked={hideNone} onChange={(e) => setHideNone(e.target.checked)} />{' '}
                    <span data-tip="Hide tables where every visible subject is denied for the shown operations.">Hide tables nobody can access</span>
                </label>
                <span className="lens-muted">
                    {rows.length} tables{visible.length > 1 ? ` · ${diffCount} with differences` : ''}
                </span>
                <span className="lens-mx__actions">
                    <ListActions
                        list={byNames('sys_db_object', rows.map((r) => results.subjects[0].tables[r.ti].t), `these ${rows.length} tables`)}
                        onExport={onExport}
                        exportWhat={`the matrix for the ${rows.length} tables shown`}
                        filtered={rows.length !== results.subjects[0]?.tables.length}
                    />
                </span>
            </div>
            {cond && (
                <ConditionPopover
                    anchor={cond.anchor}
                    cell={cond.cell}
                    acls={results.acls}
                    subjectLabel={cond.subjectLabel}
                    op={cond.op}
                    target={cond.target}
                    filters={filtersFor(results, cond.subjectKey, cond.ti)}
                    onOpenDetails={() => onOpenTable(cond.ti)}
                    onClose={() => setCond(null)}
                />
            )}
            <ListBreadcrumb sorter={sorter} noun="tables" limit={limit} />
            <div className="lens-mx__scroll">
                <table className="lens-mx">
                    <caption className="lens-sr">Access by table: one column per operation for each user or role</caption>
                    <thead>
                        <tr>
                            <SortTh sorter={sorter} col="table" rowSpan={2} className="lens-mx__table-h">
                                Table
                            </SortTh>
                            {visible.map((s) => (
                                <th key={s.subject.key} scope="colgroup" colSpan={ops.length} className={`lens-mx__subj${s.subject.key === baseline ? ' lens-mx__subj--base' : ''}`} title={s.subject.label}>
                                    <SubjectName subjectKey={s.subject.key} focusable />
                                </th>
                            ))}
                        </tr>
                        <tr>
                            {visible.map((s) =>
                                ops.map((op) => (
                                    <SortTh
                                        key={`${s.subject.key}-${op}`}
                                        sorter={sorter}
                                        col={`${s.subject.key}:${op}`}
                                        abbr={op}
                                        label={`${s.subject.label} ${op}`}
                                        className={`lens-mx__op${op === ops[0] ? ' lens-mx__cell--first' : ''}`}
                                        tip={`${op}: ${OP_HELP[op]}. Sort by ${s.subject.label}'s ${op} access (most first)`}
                                    >
                                        {OP_SHORT[op]}
                                    </SortTh>
                                ))
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        <GroupedRows sorter={sorter} colSpan={1 + visible.length * ops.length} limit={limit} render={({ ti, differs }) => {
                            const t = results.subjects[0].tables[ti]
                            const isOpen = expanded.has(ti) && !collapsing.has(ti)
                            const showFields = expanded.has(ti)
                            return (
                                <React.Fragment key={t.t}>
                                    <tr className={differs ? 'lens-mx__row--diff' : ''}>
                                        <th scope="row" className="lens-mx__table">
                                            {t.fields.length > 0 ? (
                                                <button type="button" className="lens-caret" aria-expanded={isOpen} aria-label={`${isOpen ? 'Hide' : 'Show'} field rules for ${t.t}`} onClick={() => toggle(ti)}>
                                                    <span className={`lens-caret__icon${isOpen ? ' lens-caret__icon--open' : ''}`}>▸</span>
                                                </button>
                                            ) : (
                                                <span className="lens-caret lens-caret--none" />
                                            )}
                                            <button type="button" className="lens-link lens-mx__name" onClick={() => onOpenTable(ti)} aria-label={`Open details for ${t.t}`} data-tip="Open details: the ACLs that matched for each subject and why, plus every field.">
                                                <span>{t.l}</span>
                                                <code>{t.t}</code>
                                            </button>
                                            <DataFilterMark results={results} ti={ti} subjects={visible.map((s) => s.subject.key)} />
                                        </th>
                                        {visible.map((s, si) =>
                                                ops.map((op) => (
                                                    <td
                                                        key={`${s.subject.key}-${op}`}
                                                        className={`lens-mx__cell${op === ops[0] ? ' lens-mx__cell--first' : ''}`}
                                                        onContextMenu={sorter.cellMenu(`${s.subject.key}:${op}`, { ti, differs })}
                                                    >
                                                        {s.tables[ti].ops[op].s === 'C' ? (
                                                            <button
                                                                type="button"
                                                                className="lens-cellbtn"
                                                                aria-haspopup="dialog"
                                                                onClick={(e) =>
                                                                    setCond({ anchor: e.currentTarget, cell: s.tables[ti].ops[op], subjectKey: s.subject.key, subjectLabel: s.subject.label, op, target: t.t, ti })
                                                                }
                                                            >
                                                                <StatusCell
                                                                    s="C"
                                                                    op={op}
                                                                    defaultDeny={dd}
                                                                    differs={visible.length > 1 && si !== baseIdx && visible[baseIdx].tables[ti].ops[op].s !== 'C'}
                                                                    subjectLabel={s.subject.label}
                                                                    clickable
                                                                />
                                                            </button>
                                                        ) : (
                                                            <StatusCell
                                                                s={s.tables[ti].ops[op].s}
                                                                op={op}
                                                                defaultDeny={dd}
                                                                differs={visible.length > 1 && si !== baseIdx && s.tables[ti].ops[op].s !== visible[baseIdx].tables[ti].ops[op].s}
                                                                subjectLabel={s.subject.label}
                                                            />
                                                        )}
                                                    </td>
                                                ))
                                            )}
                                    </tr>
                                    {showFields &&
                                        t.fields.map((f, fi) => (
                                            <tr key={`${t.t}.${f.f}`} className={`lens-mx__field${collapsing.has(ti) ? ' lens-mx__field--closing' : ''}`} style={{ animationDelay: `${Math.min(fi, 12) * 12}ms` }}>
                                                <th scope="row" className="lens-mx__fname">
                                                    {f.f === '*' ? <em>all other fields (*)</em> : <code>{f.f}</code>}
                                                </th>
                                                {visible.map((s, si) =>
                                                    ops.map((op) => {
                                                        const cell = s.tables[ti].fields[fi]?.ops[op]
                                                        if (!cell)
                                                            return <td key={`${s.subject.key}-${op}`} className={`lens-mx__cell${op === ops[0] ? ' lens-mx__cell--first' : ''}`} />
                                                        const base = visible[baseIdx].tables[ti].fields[fi]?.ops[op]
                                                        return (
                                                            <td key={`${s.subject.key}-${op}`} className={`lens-mx__cell${op === ops[0] ? ' lens-mx__cell--first' : ''}`}>
                                                                {cell.s === 'C' ? (
                                                                    <button
                                                                        type="button"
                                                                        className="lens-cellbtn"
                                                                        aria-haspopup="dialog"
                                                                        onClick={(e) => setCond({ anchor: e.currentTarget, cell, subjectKey: s.subject.key, subjectLabel: s.subject.label, op, target: `${t.t}.${f.f}`, ti })}
                                                                    >
                                                                        <StatusCell s="C" op={`${f.f} ${op}`} defaultDeny={dd} differs={visible.length > 1 && si !== baseIdx && !!base && base.s !== cell.s} subjectLabel={s.subject.label} clickable />
                                                                    </button>
                                                                ) : (
                                                                    <StatusCell s={cell.s} op={`${f.f} ${op}`} defaultDeny={dd} differs={visible.length > 1 && si !== baseIdx && !!base && base.s !== cell.s} subjectLabel={s.subject.label} />
                                                                )}
                                                            </td>
                                                        )
                                                    })
                                                )}
                                            </tr>
                                        ))}
                                </React.Fragment>
                            )
                        }} />
                    </tbody>
                </table>
                {!rows.length && <p className="lens-empty">No tables match the current filters.</p>}
            </div>
            {rows.length > limit && (
                <div className="lens-card__footer">
                    <button type="button" className="lens-btn lens-btn--secondary" onClick={() => setLimit(limit + PAGE * 3)}>
                        Show more ({rows.length - limit} remaining)
                    </button>
                    <button type="button" className="lens-btn lens-btn--tertiary" onClick={() => setLimit(rows.length)}>
                        Show all
                    </button>
                </div>
            )}
        </section>
    )
}

/** The security data filters that apply, or may apply, to one subject on a table. */
function filtersFor(results: AnalysisResult, subjectKey: string, ti: number): DataFilterInfo[] {
    const s = results.subjects.find((x) => x.subject.key === subjectKey)
    const all = results.dataFilters || []
    return ((s && s.tables[ti].sdf) || []).filter((o) => o.r !== 'N' && all[o.i]).map((o) => all[o.i])
}

/**
 * Marker beside a table that has security data filters: they hide rows from some subjects even
 * when the ACLs grant access. The tip says who the filters apply to.
 */
function DataFilterMark({ results, ti, subjects }: { results: AnalysisResult; ti: number; subjects: string[] }) {
    const first = results.subjects[0]?.tables[ti]
    if (!first || !first.sdf || !first.sdf.length || !results.dataFilters) return null
    const n = first.sdf.length
    const lines = results.subjects
        .filter((s) => subjects.indexOf(s.subject.key) >= 0)
        .map((s) => {
            const sdf = s.tables[ti].sdf || []
            const applied = sdf.filter((o) => o.r === 'A').length
            const depends = sdf.filter((o) => o.r === 'C').length
            return `${s.subject.label}: ${applied ? `${applied} applied` : 'none applied'}${depends ? `, ${depends} depend on a security attribute` : ''}`
        })
    const anyApplied = results.subjects.some((s) => subjects.indexOf(s.subject.key) >= 0 && (s.tables[ti].sdf || []).some((o) => o.r !== 'N'))
    const tip = `${n} security data filter${n === 1 ? '' : 's'} on this table: they hide rows even when the ACLs allow access, so access they apply to shows as Conditional. ${lines.join(' · ')}. Open the table for details.`
    return (
        <span className={`lens-dfmark${anyApplied ? ' lens-dfmark--on' : ''}`} data-tip={tip} aria-label={tip} tabIndex={0}>
            <Icon name="filter" size={12} />
        </span>
    )
}
