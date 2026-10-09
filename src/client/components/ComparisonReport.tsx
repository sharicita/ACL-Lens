import React, { useMemo, useState } from 'react'
import { Comparison, SubjectResult } from '../types'
import { rankFilter } from '../utils/rank'
import { exportFilteredDiffsCsv } from '../utils/exports'
import { ListKind, listUrl, roleRows, RoleRow } from '../utils/reportLists'
import RecordLink, { recordUrl } from './RecordLink'
import SortTh, { useSort } from './SortTh'
import DiffTable from './DiffTable'

interface Props {
    runId: string
    cmp: Comparison
    subjects: SubjectResult[]
    fileBase: string
    onExport: () => void
    onShowRoles: () => void
}

type Kind = '' | 'table' | 'field'
const PAGE = 200
const KIND_TEXT: { [k: string]: string } = { table: 'table (CRUD) rules', field: 'field rules' }

interface Tile {
    num: number
    label: string
    tip: string
    list: ListKind
    sub?: string
    tone?: 'warn' | 'ok'
}

export default function ComparisonReport({ runId, cmp, subjects, fileBase, onExport, onShowRoles }: Props) {
    const [kind, setKind] = useState<Kind>('')
    const [q, setQ] = useState('')
    const [limit, setLimit] = useState(PAGE)
    const [showShared, setShowShared] = useState(true)
    const label = (key: string) => cmp.subjects.filter((s) => s.key === key)[0]?.label || key
    const s = cmp.summary

    const allRoles = useMemo(() => roleRows(cmp, subjects), [cmp, subjects])
    const roleStats = useMemo(() => {
        const explicit = allRoles.filter((r) => r.explicitAll).length
        const shared = allRoles.filter((r) => r.shared).length
        return { explicit, inherited: shared - explicit, some: allRoles.length - shared }
    }, [allRoles])
    const roles = showShared ? allRoles : allRoles.filter((r) => !r.shared)

    const diffs = useMemo(() => rankFilter(cmp.diffs.filter((d) => !kind || d.kind === kind), q, (d) => [d.t, d.f, d.l]), [cmp, kind, q])
    const filtered = !!kind || !!q.trim()
    const clearFilter = () => {
        setKind('')
        setQ('')
        setLimit(PAGE)
    }
    const filterText = [kind ? KIND_TEXT[kind] : '', q.trim() ? `matching "${q.trim()}"` : ''].filter(Boolean).join(', ')

    const tiles: Tile[] = [
        {
            num: roleStats.explicit,
            label: 'explicit roles in common',
            tip: 'Roles every subject has been given explicitly: assigned directly, through a group, or (for a role) the role itself. Opens the list in a new window.',
            tone: roleStats.explicit ? 'ok' : undefined,
            list: 'roles-explicit',
        },
        {
            num: roleStats.inherited,
            label: 'inherited roles in common',
            tip: 'Roles every subject has, where at least one subject gets it only because another role contains it. Opens the list in a new window.',
            tone: roleStats.inherited ? 'ok' : undefined,
            list: 'roles-inherited',
        },
        {
            num: roleStats.some,
            label: 'roles not shared',
            tip: 'Roles held by only some of the subjects. These usually explain the access differences. Opens the list in a new window.',
            tone: roleStats.some ? 'warn' : undefined,
            list: 'roles-unshared',
        },
        {
            num: s.tablesCompared,
            label: 'tables compared',
            sub: `${s.tablesIdentical} with identical access`,
            tip: '"Identical" means every subject gets exactly the same result for every table operation and field rule on that table. Opens all tables in a new window.',
            list: 'tables',
        },
        {
            num: s.tablesDifferent,
            label: 'tables differ',
            tip: 'Tables where at least one table operation or field rule gives a different result for at least one subject. Opens the list in a new window.',
            tone: s.tablesDifferent ? 'warn' : undefined,
            list: 'tables-differ',
        },
        {
            num: s.fieldCellsDifferent,
            label: 'field rules differ',
            tip: 'Field × operation pairs (read or write on one field, or "all other fields") with a different result for at least one subject. Opens the list in a new window.',
            list: 'fields-differ',
        },
        {
            num: s.tableCellsDifferent,
            label: 'table (CRUD) rules differ',
            tip: 'Table × operation pairs (create, read, write or delete on whole records) with a different result for at least one subject. Opens the list in a new window.',
            list: 'crud-differ',
        },
    ]

    const perSubject = useSort(s.perSubject, {
        subject: (p) => label(p.key),
        granted: (p) => p.granted,
        conditional: (p) => p.conditional,
        denied: (p) => p.denied,
        exclusive: (p) => p.exclusive,
    })

    return (
        <section className="lens-card lens-report" aria-labelledby="cmp-title">
            <div className="lens-card__header">
                <h2 id="cmp-title">Comparison script results</h2>
                <button type="button" className="lens-btn lens-btn--secondary" onClick={onExport}>
                    Export comparison CSV
                </button>
            </div>
            <div className="lens-card__body">
                <ul className="lens-tiles" aria-label="Summary – each opens a list in a new window">
                    {tiles.map((t) => (
                        <li key={t.list}>
                            <a
                                className={`lens-tile lens-tile--link${t.tone ? ` lens-tile--${t.tone}` : ''}`}
                                href={listUrl(runId, t.list)}
                                target="_blank"
                                rel="noopener noreferrer"
                                data-tip={t.tip}
                                aria-label={`${t.num} ${t.label}${t.sub ? `, ${t.sub}` : ''} – open the list (new window)`}
                            >
                                <span className="lens-tile__num">{t.num}</span>
                                <span className="lens-tile__label">{t.label}</span>
                                {t.sub && <span className="lens-tile__sub">{t.sub}</span>}
                                <span className="lens-tile__open" aria-hidden="true">
                                    ↗
                                </span>
                            </a>
                        </li>
                    ))}
                </ul>

                <h3>Per subject (table × operation cells)</h3>
                <table className="lens-mx lens-mx--compact lens-mx--report">
                    <thead>
                        <tr>
                            <SortTh sorter={perSubject} col="subject">
                                Subject
                            </SortTh>
                            <SortTh sorter={perSubject} col="granted">
                                Granted
                            </SortTh>
                            <SortTh sorter={perSubject} col="conditional">
                                Conditional
                            </SortTh>
                            <SortTh sorter={perSubject} col="denied">
                                Denied
                            </SortTh>
                            <SortTh sorter={perSubject} col="exclusive" tip="Table × operation cells where only this subject has access">
                                Exclusive access
                            </SortTh>
                        </tr>
                    </thead>
                    <tbody>
                        {perSubject.rows.map((p) => (
                            <tr key={p.key}>
                                <th scope="row">{label(p.key)}</th>
                                <td>{p.granted}</td>
                                <td>{p.conditional}</td>
                                <td>{p.denied}</td>
                                <td>{p.exclusive}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <h3>Head to head</h3>
                <ul className="lens-pairs">
                    {cmp.pairs.map((p) => (
                        <li key={`${p.a}-${p.b}`}>
                            <strong>{label(p.a)}</strong> has more access on <b>{p.aMore}</b> cells · <strong>{label(p.b)}</strong> has more on <b>{p.bMore}</b> · equal on {p.same}
                        </li>
                    ))}
                </ul>

                <div className="lens-report__roles-head">
                    <h3 id="cmp-roles">Roles</h3>
                    <label className="lens-check" data-tip="Include roles that every subject has. Clear it to list only the roles that differ.">
                        <input type="checkbox" checked={showShared} onChange={(e) => setShowShared(e.target.checked)} /> Shared roles
                    </label>
                    <span className="lens-muted" aria-live="polite">
                        {roles.length} of {allRoles.length} roles
                    </span>
                    <button type="button" className="lens-link" onClick={onShowRoles}>
                        How each role is assigned
                    </button>
                </div>
                <div className="lens-mx__scroll lens-mx__scroll--short">
                    {roles.length ? (
                        <RolesTable rows={roles} cmp={cmp} />
                    ) : (
                        <p className="lens-empty">Every role is shared. Tick "Shared roles" to list them.</p>
                    )}
                </div>

                <h3>Every difference</h3>
                <div className="lens-actions">
                    <input className="lens-input" placeholder="Filter table or field…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Filter differences" />
                    <label className="lens-inline-field">
                        <span>Show</span>
                        <select className="lens-input lens-input--narrow" value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
                            <option value="">Table and field rules</option>
                            <option value="table">Table (CRUD) rules</option>
                            <option value="field">Field rules</option>
                        </select>
                    </label>
                    <span className="lens-muted" aria-live="polite">
                        {filtered ? `${diffs.length} of ${cmp.diffs.length} differences` : `${diffs.length} differences`}
                    </span>
                    {filtered && (
                        <>
                            <button
                                type="button"
                                className="lens-btn lens-btn--success"
                                disabled={!diffs.length}
                                onClick={() => exportFilteredDiffsCsv(cmp, diffs, fileBase, filterText)}
                                data-tip={`Download the ${diffs.length} differences shown (${filterText}) as CSV`}
                            >
                                Download filtered list
                            </button>
                            <button type="button" className="lens-btn lens-btn--ghost lens-btn--small" onClick={clearFilter}>
                                Clear filter
                            </button>
                        </>
                    )}
                </div>
                <div className="lens-mx__scroll">
                    <DiffTable
                        cmp={cmp}
                        rows={diffs}
                        limit={limit}
                        emptyText={filtered ? 'No differences match this filter.' : 'No differences – these subjects have identical access for the analyzed tables.'}
                    />
                </div>
                {diffs.length > limit && (
                    <button type="button" className="lens-btn lens-btn--secondary" onClick={() => setLimit(limit + PAGE * 5)}>
                        Show more ({diffs.length - limit} remaining)
                    </button>
                )}
            </div>
        </section>
    )
}

/** Roles × subjects, sortable. Also used by the report list view. */
export function RolesTable({ rows, cmp }: { rows: RoleRow[]; cmp: Comparison }) {
    const columns: { [key: string]: (r: RoleRow) => string | number } = { role: (r) => r.role, held: (r) => r.held.filter(Boolean).length }
    cmp.subjects.forEach((s, i) => (columns[s.key] = (r) => (r.held[i] === 'explicit' ? 2 : r.held[i] === 'inherited' ? 1 : 0)))
    const sorter = useSort(rows, columns)
    return (
        <table className="lens-mx lens-mx--compact">
            <thead>
                <tr>
                    <SortTh sorter={sorter} col="role">
                        Role
                    </SortTh>
                    {cmp.subjects.map((x) => (
                        <SortTh key={x.key} sorter={sorter} col={x.key} tip={`Sort by how ${x.label} holds the role`}>
                            {x.label}
                        </SortTh>
                    ))}
                    <SortTh sorter={sorter} col="held" tip="How many subjects hold the role">
                        Held by
                    </SortTh>
                </tr>
            </thead>
            <tbody>
                {sorter.rows.map((r) => (
                    <tr key={r.role} className={r.shared ? '' : 'lens-row--diff'}>
                        <th scope="row">
                            <code>{r.role}</code> <RecordLink href={recordUrl.roleByName(r.role)} what={`role record for ${r.role}`} />
                        </th>
                        {r.held.map((h, i) => (
                            <td key={cmp.subjects[i].key}>
                                {h ? (
                                    <span className="lens-yes-cell">
                                        <span className="lens-yes" aria-hidden="true">
                                            ✓
                                        </span>
                                        <span className={h === 'inherited' ? 'lens-muted' : 'lens-sr'}>{h}</span>
                                    </span>
                                ) : (
                                    <span className="lens-no" aria-label="Does not have this role">
                                        —
                                    </span>
                                )}
                            </td>
                        ))}
                        <td>
                            {r.held.filter(Boolean).length} of {cmp.subjects.length}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    )
}
