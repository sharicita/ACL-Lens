import React, { useMemo, useState } from 'react'
import Drawer from '../components/Drawer'
import SortTh, { GroupedRows, ListBreadcrumb, useSort } from '../components/SortTh'
import ListActions from '../components/ListActions'
import { byNames } from '../utils/snList'
import { download, safeName, toCsv } from '../utils/download'
import { rankFilter } from '../utils/rank'
import { CATEGORY_LABEL, DIM_LABEL, Fact, Report, ReportData, ReportGroup } from './types'

interface Props {
    report: Report
    data: ReportData
    /** only rows in this group (a bar or slice that was clicked) */
    group: ReportGroup | null
    runLabel: string
    onOpenRun?: () => void
    onClose: () => void
}

/** Every row behind a report (or behind one bar of it), as a sortable list with export. */
export default function ReportDetail({ report, data, group, runLabel, onOpenRun, onClose }: Props) {
    const [q, setQ] = useState('')
    const all = useMemo(() => {
        if (!group || !data.groupBy) return data.rows
        return data.rows.filter((f) => String((f as any)[data.groupBy] || '(none)') === group.key)
    }, [data, group])
    const rows = useMemo(() => rankFilter(all, q, (f) => [f.table || '', f.tableLabel || '', f.subject || '', f.role || '', f.acl || '']), [all, q])
    const columns: { [k: string]: (f: Fact) => string } = {}
    for (const c of data.columns) columns[c.key] = (f) => String((f as any)[c.key] ?? '')
    const sorter = useSort(rows, columns)
    const tables = Array.from(new Set(sorter.rows.map((f) => f.table).filter((t): t is string => !!t)))

    const exportCsv = () => {
        const out: unknown[][] = [[`${report.name}${group ? ` – ${DIM_LABEL[data.groupBy] || ''}: ${group.label}` : ''} (${runLabel})`], []]
        out.push(data.columns.map((c) => c.label))
        for (const f of sorter.rows) out.push(data.columns.map((c) => (f as any)[c.key] ?? ''))
        download(`${safeName(`acl-lens-${report.name}${group ? '-' + group.label : ''}`)}.csv`, toCsv(out), 'text/csv;charset=utf-8')
    }

    return (
        <Drawer
            title={report.name}
            subtitle={
                <>
                    {CATEGORY_LABEL[report.category]} · {runLabel}
                    {group && (
                        <>
                            {' '}
                            · {DIM_LABEL[data.groupBy]}: <strong>{group.label}</strong>
                        </>
                    )}
                </>
            }
            width="min(1000px, 96vw)"
            actions={
                onOpenRun && (
                    <button type="button" className="lens-btn lens-btn--secondary" onClick={onOpenRun} data-tip="Open the run these results come from">
                        Open run
                    </button>
                )
            }
            onClose={onClose}
        >
            {report.description && <p className="lens-muted">{report.description}</p>}
            {data.rowsTruncated && !group && (
                <p className="lens-alert lens-alert--warning">The first {data.rows.length.toLocaleString()} of {data.total.toLocaleString()} rows are listed. Narrow the report's filters to see the rest.</p>
            )}
            <div className="lens-list__toolbar">
                <input className="lens-input" placeholder="Filter rows…" aria-label="Filter rows" value={q} onChange={(e) => setQ(e.target.value)} />
                <ListActions
                    list={tables.length ? byNames('sys_db_object', tables, `the ${tables.length} tables in these rows`) : null}
                    onExport={exportCsv}
                    exportWhat={`the ${sorter.rows.length} rows shown`}
                    filtered={!!q || !!group || sorter.filters.length > 0}
                />
            </div>
            <ListBreadcrumb sorter={sorter} noun={data.unit} />
            <div className="lens-mx__scroll">
                <table className="lens-mx lens-mx--compact">
                    <thead>
                        <tr>
                            {data.columns.map((c) => (
                                <SortTh key={c.key} sorter={sorter} col={c.key}>
                                    {c.label}
                                </SortTh>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        <GroupedRows
                            sorter={sorter}
                            colSpan={data.columns.length}
                            limit={500}
                            render={(f, i) => (
                                <tr key={i}>
                                    {data.columns.map((c) => (
                                        <td key={c.key} onContextMenu={sorter.cellMenu(c.key, f)}>
                                            {c.key === 'table' ? (
                                                <>
                                                    {f.tableLabel && f.tableLabel !== f.table && <span>{f.tableLabel} </span>}
                                                    <code>{f.table}</code>
                                                </>
                                            ) : (
                                                String((f as any)[c.key] ?? '')
                                            )}
                                        </td>
                                    ))}
                                </tr>
                            )}
                        />
                    </tbody>
                </table>
                {!sorter.rows.length && <p className="lens-empty">No rows match.</p>}
            </div>
        </Drawer>
    )
}
