import React, { useMemo, useState } from 'react'
import { AnalysisResult, FIELD_OPS, Op, TABLE_OPS } from '../types'
import { OP_SHORT, rank } from '../utils/status'
import { rankFilter } from '../utils/rank'
import { StatusCell } from './StatusCell'
import SortTh, { useSort } from './SortTh'

interface Props {
    results: AnalysisResult
    hidden: Set<string>
    baseline: string
    onOpenTable: (index: number) => void
    onFilteredChange?: (tables: Set<string>) => void
}

const PAGE = 100

export default function AccessMatrix({ results, hidden, baseline, onOpenTable, onFilteredChange }: Props) {
    const [q, setQ] = useState('')
    const [diffsOnly, setDiffsOnly] = useState(false)
    const [hideNone, setHideNone] = useState(false)
    const [opFocus, setOpFocus] = useState<'' | Op>('')
    const [limit, setLimit] = useState(PAGE)
    const [expanded, setExpanded] = useState<Set<number>>(new Set())
    const [collapsing, setCollapsing] = useState<Set<number>>(new Set())
    const dd = results.defaultDeny
    const visible = results.subjects.filter((s) => !hidden.has(s.subject.key))
    const baseIdx = Math.max(0, visible.findIndex((s) => s.subject.key === baseline))
    const ops = opFocus ? [opFocus] : TABLE_OPS

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
                if (st.some((x) => rank(x, dd) > 0)) any = true
            }
            if (!differs)
                t.fields.forEach((_f, fi) => {
                    for (const op of FIELD_OPS) {
                        if (opFocus && op !== opFocus) continue
                        if (new Set(visible.map((s) => s.tables[ti].fields[fi]?.ops[op].s)).size > 1) differs = true
                    }
                })
            if (diffsOnly && !differs) return
            if (hideNone && !any) return
            out.push({ ti, differs })
        })
        return out
    }, [results, q, diffsOnly, hideNone, opFocus, hidden])

    // optional column sort; with none chosen, rows keep the search ranking
    const sortCols: { [key: string]: (r: { ti: number; differs: boolean }) => string | number } = { table: (r) => results.subjects[0].tables[r.ti].l || results.subjects[0].tables[r.ti].t }
    for (const s of visible) for (const op of ops) sortCols[`${s.subject.key}:${op}`] = (r) => rank(s.tables[r.ti].ops[op].s, dd)
    const sorter = useSort(rows, sortCols)

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
                <select
                    className="lens-input lens-input--narrow"
                    value={opFocus}
                    aria-label="Operation focus"
                    data-tip="Focus on one operation (create, read, write or delete) to simplify the matrix."
                    onChange={(e) => setOpFocus(e.target.value as Op | '')}
                >
                    <option value="">All operations</option>
                    {TABLE_OPS.map((op) => (
                        <option key={op} value={op}>
                            {op}
                        </option>
                    ))}
                </select>
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
            </div>
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
                                    {s.subject.label}
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
                                        className={`lens-mx__op${op === ops[0] ? ' lens-mx__cell--first' : ''}`}
                                        tip={`Sort by ${s.subject.label}'s ${op} access (most first)`}
                                    >
                                        {OP_SHORT[op]}
                                    </SortTh>
                                ))
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {sorter.rows.slice(0, limit).map(({ ti, differs }) => {
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
                                        </th>
                                        {visible.map((s, si) =>
                                                ops.map((op) => (
                                                    <td key={`${s.subject.key}-${op}`} className={`lens-mx__cell${op === ops[0] ? ' lens-mx__cell--first' : ''}`}>
                                                        <StatusCell
                                                            s={s.tables[ti].ops[op].s}
                                                            op={op}
                                                            defaultDeny={dd}
                                                            differs={visible.length > 1 && si !== baseIdx && s.tables[ti].ops[op].s !== visible[baseIdx].tables[ti].ops[op].s}
                                                            subjectLabel={s.subject.label}
                                                        />
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
                                                                <StatusCell s={cell.s} op={`${f.f} ${op}`} defaultDeny={dd} differs={visible.length > 1 && si !== baseIdx && !!base && base.s !== cell.s} subjectLabel={s.subject.label} />
                                                            </td>
                                                        )
                                                    })
                                                )}
                                            </tr>
                                        ))}
                                </React.Fragment>
                            )
                        })}
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
