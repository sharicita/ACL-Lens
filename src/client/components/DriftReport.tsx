import React from 'react'
import { DriftResult } from '../types'
import { StatusCell } from './StatusCell'
import SortTh, { GroupedRows, ListBreadcrumb, useSort } from './SortTh'
import { rank, statusText } from '../utils/status'
import ListActions from './ListActions'
import { aclsFor } from '../utils/snList'

interface Props {
    drift: DriftResult
    originalNumber: string
    onOpenOriginal: () => void
    onExport: () => void
}

export default function DriftReport({ drift, originalNumber, onOpenOriginal, onExport }: Props) {
    const sorter = useSort(drift.rows, {
        subject: (r) => r.subject,
        table: (r) => r.t,
        field: (r) => r.f,
        op: (r) => r.op,
        from: (r) => rank(r.from, true),
        to: (r) => rank(r.to, true),
    }, { groupLabel: { from: (r) => statusText(r.from, true), to: (r) => statusText(r.to, true), field: (r) => r.f || '— (table rule)' } })
    return (
        <section className="lens-card" aria-labelledby="drift-title">
            <div className="lens-card__header">
                <h2 id="drift-title">Changes since original run</h2>
                <button type="button" className="lens-link" onClick={onOpenOriginal}>
                    Open {originalNumber}
                </button>
                {drift.total > 0 && (
                    <ListActions
                        list={aclsFor(drift.rows.map((r) => ({ t: r.t, f: r.f, op: r.op })), `the ACL records for these ${drift.rows.length} changes`)}
                        onExport={onExport}
                        exportWhat={`the ${drift.rows.length} access changes since ${originalNumber}`}
                    />
                )}
            </div>
            <div className="lens-card__body">
                {drift.total === 0 && !drift.notes.length ? (
                    <p>No access changes – results match {originalNumber} exactly.</p>
                ) : (
                    <>
                        <p>
                            <strong>{drift.total}</strong> cell(s) changed{drift.truncated ? ` (first ${drift.rows.length} shown)` : ''}.
                        </p>
                        {drift.notes.length > 0 && (
                            <ul className="lens-notes">
                                {drift.notes.map((n) => (
                                    <li key={n}>{n}</li>
                                ))}
                            </ul>
                        )}
                        {drift.rows.length > 0 && (
                            <div className="lens-mx__scroll lens-mx__scroll--short">
                                <ListBreadcrumb sorter={sorter} />
                                <table className="lens-mx lens-mx--compact">
                                    <thead>
                                        <tr>
                                            <SortTh sorter={sorter} col="subject">
                                                Subject
                                            </SortTh>
                                            <SortTh sorter={sorter} col="table">
                                                Table
                                            </SortTh>
                                            <SortTh sorter={sorter} col="field">
                                                Field
                                            </SortTh>
                                            <SortTh sorter={sorter} col="op">
                                                Operation
                                            </SortTh>
                                            <SortTh sorter={sorter} col="from">
                                                Before
                                            </SortTh>
                                            <SortTh sorter={sorter} col="to">
                                                Now
                                            </SortTh>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <GroupedRows sorter={sorter} colSpan={6} render={(r, i) => (
                                            <tr key={i}>
                                                <td>{r.subject}</td>
                                                <td>
                                                    <code>{r.t}</code>
                                                </td>
                                                <td>{r.f ? <code>{r.f}</code> : <span className="lens-muted">— (table rule)</span>}</td>
                                                <td>{r.op}</td>
                                                <td>
                                                    <StatusCell s={r.from} op={r.op} defaultDeny />
                                                </td>
                                                <td>
                                                    <StatusCell s={r.to} op={r.op} defaultDeny differs />
                                                </td>
                                            </tr>
                                        )} />
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}
            </div>
        </section>
    )
}
