import React from 'react'
import { Comparison, DiffRow } from '../types'
import { rank, statusText } from '../utils/status'
import { StatusCell } from './StatusCell'
import RecordLink, { recordUrl } from './RecordLink'
import SortTh, { GroupedRows, ListBreadcrumb, useSort } from './SortTh'

const OP_ORDER: { [op: string]: number } = { create: 0, read: 1, write: 2, delete: 3 }

interface Props {
    cmp: Comparison
    rows: DiffRow[]
    limit?: number
    emptyText: string
}

/** Sortable list of differing cells: level, table, field, operation and each subject's result. */
export default function DiffTable({ cmp, rows, limit, emptyText }: Props) {
    const columns: { [key: string]: (d: DiffRow) => string | number } = {
        level: (d) => d.kind,
        table: (d) => d.l || d.t,
        field: (d) => (d.kind === 'table' ? '' : d.f === '*' ? '' : d.f),
        op: (d) => OP_ORDER[d.op] ?? 9,
    }
    cmp.subjects.forEach((s, i) => (columns[s.key] = (d) => rank(d.statuses[i], cmp.defaultDeny)))
    const groupLabel: { [key: string]: (d: DiffRow) => string } = {
        level: (d) => (d.kind === 'table' ? 'Table' : 'Field'),
        field: (d) => (d.kind === 'table' ? '— (table rule)' : d.f === '*' ? 'all other fields' : d.f),
    }
    cmp.subjects.forEach((s, i) => (groupLabel[s.key] = (d) => statusText(d.statuses[i], cmp.defaultDeny)))
    const sorter = useSort(rows, columns, { groupLabel })
    return (
        <>
            <ListBreadcrumb sorter={sorter} />
            <table className="lens-mx lens-mx--compact">
                <thead>
                    <tr>
                        <SortTh sorter={sorter} col="level" tip="Table = create/read/write/delete on whole records. Field = read/write on one field.">
                            Level
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
                        {cmp.subjects.map((x) => (
                            <SortTh key={x.key} sorter={sorter} col={x.key} tip={`Sort by ${x.label}'s access (most access first)`}>
                                {x.label}
                            </SortTh>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    <GroupedRows sorter={sorter} colSpan={4 + cmp.subjects.length} limit={limit} render={(d, i) => (
                        <tr key={`${d.t}-${d.f}-${d.op}-${i}`}>
                            <td>
                                <span className={`lens-level lens-level--${d.kind}`}>{d.kind === 'table' ? 'Table' : 'Field'}</span>
                            </td>
                            <th scope="row">
                                {d.l} <code>{d.t}</code> <RecordLink href={recordUrl.table(d.t)} what={`table definition for ${d.t}`} />
                            </th>
                            <td>
                                {d.kind === 'table' ? (
                                    <span className="lens-muted" aria-label="Not a field rule">
                                        —
                                    </span>
                                ) : d.f === '*' ? (
                                    <em>all other fields</em>
                                ) : (
                                    <code>{d.f}</code>
                                )}
                            </td>
                            <td>{d.op}</td>
                            {d.statuses.map((st, si) => (
                                <td key={si}>
                                    <StatusCell s={st} op={d.op} defaultDeny={cmp.defaultDeny} differs={st !== d.statuses[0]} subjectLabel={cmp.subjects[si].label} />
                                </td>
                            ))}
                        </tr>
                    )} />
                </tbody>
            </table>
            {!rows.length && <p className="lens-empty">{emptyText}</p>}
        </>
    )
}

/** Rows for a CSV export of differences. */
export function diffCsvRows(cmp: Comparison, rows: DiffRow[], statusText: (s: any, dd: boolean) => string): unknown[][] {
    const out: unknown[][] = [['Level', 'Table', 'Table label', 'Field', 'Operation'].concat(cmp.subjects.map((s) => `${s.label} (${s.type})`))]
    for (const d of rows)
        out.push([d.kind === 'table' ? 'Table' : 'Field', d.t, d.l, d.kind === 'table' ? '' : d.f === '*' ? '* (all other fields)' : d.f, d.op].concat(d.statuses.map((s) => statusText(s, cmp.defaultDeny))))
    return out
}
