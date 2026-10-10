import React, { useEffect, useMemo, useState } from 'react'
import { DiffRow, RunPayload, Status, TABLE_OPS } from '../types'
import { LensApi } from '../services/LensApi'
import { rankFilter } from '../utils/rank'
import { setTitle } from '../utils/nav'
import { download, safeName, toCsv } from '../utils/download'
import { OP_SHORT, rank, statusText } from '../utils/status'
import { filterDiffs, filterRoles, LIST_TITLES, ListKind, roleRows, RoleRow, TableRow, tableRows } from '../utils/reportLists'
import { RolesTable } from './ComparisonReport'
import DiffTable, { diffCsvRows } from './DiffTable'
import { Legend, StatusCell } from './StatusCell'
import RecordLink, { recordUrl } from './RecordLink'
import SortTh, { GroupedRows, ListBreadcrumb, useSort } from './SortTh'
import Icon from './Icon'
import ListActions from './ListActions'
import { aclsFor, byNames, SnList } from '../utils/snList'
import SubjectName from './SubjectName'
import { SubjectsProvider } from './SubjectName'
import { AccountTypeFilter, useSubjectVisible } from './SubjectName'

interface Props {
    runId: string
    list: ListKind
    onOpenRun: (id: string) => void
}

const DESCRIPTION: { [k in ListKind]: string } = {
    'roles-explicit': 'Roles every subject has been given explicitly: directly, through a group, or (for a role) the role itself.',
    'roles-inherited': 'Roles every subject has, where at least one subject gets it only because another role contains it.',
    'roles-unshared': 'Roles held by only some of the subjects. These usually explain the access differences.',
    tables: 'Every table in the comparison with each subject’s create / read / write / delete result.',
    'tables-differ': 'Tables where at least one table operation or field rule differs between subjects.',
    'fields-differ': 'Read or write on a field (or on "all other fields") where the subjects get different results.',
    'crud-differ': 'Create, read, write or delete on whole records where the subjects get different results.',
}

/** A full-page, sortable, filterable report list opened from a comparison tile. */
export default function ReportList({ runId, list, onOpenRun }: Props) {
    const [payload, setPayload] = useState<RunPayload | null>(null)
    const [error, setError] = useState('')
    const [q, setQ] = useState('')

    useEffect(() => {
        LensApi.getRun(runId)
            .then((p) => {
                setPayload(p)
                setTitle(`ACL Lens – ${p.run.number} – ${LIST_TITLES[list]}`)
            })
            .catch((e) => setError(e.message))
    }, [runId, list])

    if (error) return <div className="lens-alert lens-alert--critical">{error}</div>
    if (!payload) return <p className="lens-muted">Loading…</p>
    const { run, results, comparison: cmp } = payload
    if (!results || !cmp) return <div className="lens-alert lens-alert--warning">This run has no comparison results. Open the run and select Rerun with the comparison script.</div>

    const isRoles = list.indexOf('roles') === 0
    const isTables = list === 'tables' || list === 'tables-differ'
    const fileBase = `${run.number}-${list}`

    return (
        <SubjectsProvider subjects={results.subjects}>
        <section className="lens-card lens-list" aria-labelledby="list-title">
            <div className="lens-card__header">
                <div>
                    <p className="lens-muted lens-list__crumb">
                        <button type="button" className="lens-link" onClick={() => onOpenRun(runId)}>
                            {run.number}
                            {run.name ? ` · ${run.name}` : ''}
                        </button>{' '}
                        · {cmp.subjects.map((s) => s.label).join(' vs ')}
                    </p>
                    <h2 id="list-title">{LIST_TITLES[list]}</h2>
                    <p className="lens-muted lens-list__desc">{DESCRIPTION[list]}</p>
                </div>
            </div>
            <div className="lens-card__body">
                {isRoles && <RoleList q={q} setQ={setQ} payload={payload} list={list} fileBase={fileBase} />}
                {isTables && <TableList q={q} setQ={setQ} rows={tableRows(results, cmp).filter((t) => list === 'tables' || t.diffs > 0)} payload={payload} fileBase={fileBase} />}
                {!isRoles && !isTables && <DiffList q={q} setQ={setQ} payload={payload} list={list} fileBase={fileBase} />}
            </div>
        </section>
        </SubjectsProvider>
    )
}

interface ListProps {
    q: string
    setQ: (q: string) => void
    payload: RunPayload
    fileBase: string
}

function Toolbar({ q, setQ, shown, total, noun, onExport, list }: { q: string; setQ: (q: string) => void; shown: number; total: number; noun: string; onExport: () => void; list: SnList }) {
    return (
        <div className="lens-actions">
            <input className="lens-input" placeholder={`Filter ${noun}…`} value={q} onChange={(e) => setQ(e.target.value)} aria-label={`Filter ${noun}`} />
            <span className="lens-muted" aria-live="polite">
                {shown !== total ? `${shown} of ${total}` : total} {noun}
            </span>
            {q.trim() && (
                <button type="button" className="lens-btn lens-btn--ghost lens-btn--small" onClick={() => setQ('')}>
                    Clear filter
                </button>
            )}
            <span className="lens-list__export">
                <ListActions list={list} onExport={onExport} exportWhat={`the ${shown} ${noun} shown${q.trim() ? ` (filtered by "${q.trim()}")` : shown !== total ? ' (filtered)' : ''}`} filtered={shown !== total} />
            </span>
        </div>
    )
}

function RoleList({ q, setQ, payload, list, fileBase }: ListProps & { list: ListKind }) {
    const cmp = payload.comparison!
    const all = useMemo(() => filterRoles(roleRows(cmp, payload.results!.subjects), list), [payload, list])
    const rows = rankFilter(all, q, (r) => [r.role])
    const [visible, setVisible] = useState<RoleRow[] | null>(null)
    const shown = visible || rows
    const exportCsv = () => {
        const out: unknown[][] = [['Role'].concat(cmp.subjects.map((s) => s.label))]
        for (const r of shown) out.push([r.role].concat(r.held.map((h) => h || '')))
        download(`${safeName(fileBase)}.csv`, toCsv(out), 'text/csv;charset=utf-8')
    }
    return (
        <>
            <Toolbar q={q} setQ={setQ} shown={shown.length} total={all.length} noun="roles" onExport={exportCsv} list={byNames('sys_user_role', shown.map((r) => r.role), `these ${shown.length} roles`)} />
            <AccountTypeFilter />
            {rows.length ? <RolesTable rows={rows} cmp={cmp} listId="list-roles" onVisible={setVisible} /> : <p className="lens-empty">{all.length ? 'No roles match the filter.' : 'No roles in this list.'}</p>}
        </>
    )
}

function DiffList({ q, setQ, payload, list, fileBase }: ListProps & { list: ListKind }) {
    const cmp = payload.comparison!
    const all = useMemo(() => filterDiffs(cmp.diffs, list), [cmp, list])
    const rows = useMemo(() => rankFilter(all, q, (d) => [d.t, d.f, d.l]), [all, q])
    const [visible, setVisible] = useState<DiffRow[] | null>(null)
    const shown = visible || rows
    return (
        <>
            <Toolbar
                q={q}
                setQ={setQ}
                shown={shown.length}
                total={all.length}
                noun="differences"
                onExport={() => download(`${safeName(fileBase)}.csv`, toCsv(diffCsvRows(cmp, shown, statusText)), 'text/csv;charset=utf-8')}
                list={aclsFor(shown.map((d) => ({ t: d.t, f: d.kind === 'field' ? d.f : '', op: d.op })), `the ACL records for these ${shown.length} differences`)}
            />
            <Legend defaultDeny={cmp.defaultDeny} baseline={false} />
            <AccountTypeFilter />
            <div className="lens-mx__scroll lens-list__scroll">
                <DiffTable cmp={cmp} rows={rows} listId="list-diffs" onVisible={setVisible} emptyText={all.length ? 'No differences match the filter.' : 'No differences in this list.'} />
            </div>
        </>
    )
}

function TableList({ q, setQ, rows: all, payload, fileBase }: ListProps & { rows: TableRow[] }) {
    const cmp = payload.comparison!
    const dd = cmp.defaultDeny
    const rows = useMemo(() => rankFilter(all, q, (t) => [t.t, t.l]), [all, q])
    const columns: { [key: string]: (t: TableRow) => string | number } = { table: (t) => t.l || t.t, name: (t) => t.t, diffs: (t) => t.diffs }
    cmp.subjects.forEach((s, i) => (columns[s.key] = (t) => t.ops[i].reduce((n, st: Status) => n + rank(st, dd), 0)))
    const groupLabel: { [key: string]: (t: TableRow) => string } = { diffs: (t) => (t.diffs ? `${t.diffs} differences` : 'identical') }
    cmp.subjects.forEach((s, i) => (groupLabel[s.key] = (t) => t.ops[i].map((st, oi) => `${OP_SHORT[TABLE_OPS[oi]]}:${st === 'N' ? '–' : st}`).join(' ')))
    groupLabel.table = (t) => t.t
    const sorter = useSort(rows, columns, { groupLabel, id: 'list-tables', required: ['table'] })
    const on = (col: string, t: TableRow) => ({ onContextMenu: sorter.cellMenu(col, t) })
    const vis = useSubjectVisible()
    const exportCsv = () => {
        const head: unknown[] = ['Table', 'Table label', 'Differences']
        cmp.subjects.forEach((s) => TABLE_OPS.forEach((op) => head.push(`${s.label} – ${op}`)))
        const out: unknown[][] = [head]
        for (const t of sorter.rows) {
            const r: unknown[] = [t.t, t.l, t.diffs]
            t.ops.forEach((ops) => ops.forEach((st) => r.push(statusText(st, dd))))
            out.push(r)
        }
        download(`${safeName(fileBase)}.csv`, toCsv(out), 'text/csv;charset=utf-8')
    }
    return (
        <>
            <Toolbar q={q} setQ={setQ} shown={sorter.rows.length} total={all.length} noun="tables" onExport={exportCsv} list={byNames('sys_db_object', sorter.rows.map((t) => t.t), `these ${sorter.rows.length} tables`)} />
            <Legend defaultDeny={dd} baseline={false} />
            <AccountTypeFilter />
            <div className="lens-mx__scroll lens-list__scroll">
                <ListBreadcrumb sorter={sorter} />
                <table className="lens-mx lens-mx--compact">
                    <thead>
                        <tr>
                            <SortTh sorter={sorter} col="table">
                                Table
                            </SortTh>
                            <SortTh sorter={sorter} col="diffs" tip="Table and field rules on this table where the subjects differ (most first)">
                                Differences
                            </SortTh>
                            {cmp.subjects.map((s) => !vis(s.key) ? null : (
                                <SortTh key={s.key} sorter={sorter} col={s.key} tip={`Sort by ${s.label}'s access (most first). Letters: C = create, R = read, W = write, D = delete.`}>
                                    <SubjectName subjectKey={s.key} label={s.label} />
                                </SortTh>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        <GroupedRows sorter={sorter} colSpan={2 + cmp.subjects.length} render={(t) => (
                            <tr key={t.t}>
                                <th scope="row" {...on('table', t)}>
                                    {t.l} <code>{t.t}</code> <RecordLink href={recordUrl.table(t.t)} what={`table definition for ${t.t}`} />
                                </th>
                                {sorter.shows('diffs') && <td {...on('diffs', t)}>{t.diffs ? t.diffs : <span className="lens-muted">identical</span>}</td>}
                                {t.ops.map((ops, si) => !sorter.shows(cmp.subjects[si].key) || !vis(cmp.subjects[si].key) ? null : (
                                    <td key={si} {...on(cmp.subjects[si].key, t)}>
                                        <span className="lens-crud" aria-label={`${cmp.subjects[si].label}`}>
                                            {ops.map((st, oi) => (
                                                <span key={oi} className="lens-crud__op">
                                                    <span className="lens-crud__letter" aria-hidden="true">
                                                        {OP_SHORT[TABLE_OPS[oi]]}
                                                    </span>
                                                    <StatusCell s={st} op={TABLE_OPS[oi]} defaultDeny={dd} subjectLabel={cmp.subjects[si].label} />
                                                </span>
                                            ))}
                                        </span>
                                    </td>
                                ))}
                            </tr>
                        )} />
                    </tbody>
                </table>
                {!rows.length && <p className="lens-empty">{all.length ? 'No tables match the filter.' : 'No tables in this list.'}</p>}
            </div>
        </>
    )
}
