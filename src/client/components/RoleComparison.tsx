import React, { useMemo, useState } from 'react'
import { RoleSource, SubjectResult } from '../types'
import { rankFilter } from '../utils/rank'
import HelpTip from './HelpTip'
import FieldInfo from './FieldInfo'
import RecordLink, { recordUrl } from './RecordLink'
import SortTh, { GroupedRows, ListBreadcrumb, useSort } from './SortTh'
import ListActions from './ListActions'
import { byNames } from '../utils/snList'
import { download, toCsv } from '../utils/download'
import SubjectName from './SubjectName'
import { useSubjectVisible } from './SubjectName'

interface Props {
    subjects: SubjectResult[]
}

const KIND_LABEL: { [k: string]: string } = {
    direct: 'Direct',
    group: 'Group',
    inherited: 'Inherited',
    selected: 'Selected role',
    contained: 'Contained',
}

function Assignment({ src }: { src: RoleSource }) {
    const kind = src.kind || 'direct'
    const detail = src.from ? `${KIND_LABEL[kind]}: ${src.from}` : KIND_LABEL[kind]
    const tip =
        kind === 'direct'
            ? 'Assigned to the user directly.'
            : kind === 'group'
              ? `Granted because the user is in the group "${src.from}".`
              : kind === 'inherited'
                ? `Comes automatically with the role "${src.from || 'another role'}" the user holds.`
                : kind === 'contained'
                  ? `Contained in the role "${src.from}".`
                  : 'The role you selected.'
    return (
        <span className={`lens-assign lens-assign--${kind}`} data-tip={tip}>
            {detail}
            {kind === 'group' && src.from && <RecordLink href={recordUrl.groupByName(src.from)} what={`group record for ${src.from}`} />}
        </span>
    )
}

interface Group {
    id: string
    title: string
    hint: string
    roles: string[]
}

export default function RoleComparison({ subjects }: Props) {
    const [q, setQ] = useState('')
    const [showHow, setShowHow] = useState(true)
    const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
    const multi = subjects.length > 1

    const sourcesBy = useMemo(() => {
        const m: { [key: string]: { [role: string]: RoleSource[] } } = {}
        for (const s of subjects) {
            const r: { [role: string]: RoleSource[] } = {}
            for (const src of s.subject.roleSources) (r[src.role] = r[src.role] || []).push(src)
            m[s.subject.key] = r
        }
        return m
    }, [subjects])

    const groups: Group[] = useMemo(() => {
        const all = Array.from(new Set(subjects.flatMap((s) => s.subject.roles))).sort()
        const has = (key: string, role: string) => !!sourcesBy[key][role]
        if (multi) {
            const shared = all.filter((r) => subjects.every((s) => has(s.subject.key, r)))
            const some = all.filter((r) => !subjects.every((s) => has(s.subject.key, r)))
            return [
                { id: 'diff', title: 'Held by only some subjects', hint: 'These roles explain most access differences.', roles: some },
                { id: 'shared', title: 'Shared by every subject', hint: 'Everyone has these, so they never cause a difference.', roles: shared },
            ].filter((g) => g.roles.length)
        }
        const key = subjects[0].subject.key
        const strongest = (role: string) => {
            const kinds = (sourcesBy[key][role] || []).map((x) => x.kind || 'direct')
            for (const k of ['selected', 'direct', 'group', 'inherited', 'contained']) if (kinds.indexOf(k as any) >= 0) return k
            return 'direct'
        }
        const by = (k: string[]) => all.filter((r) => k.indexOf(strongest(r)) >= 0)
        return [
            { id: 'direct', title: 'Assigned directly', hint: 'Given to this user (or selected) explicitly.', roles: by(['direct', 'selected']) },
            { id: 'group', title: 'Granted through groups', hint: 'Removing the user from the group removes these.', roles: by(['group']) },
            { id: 'inherited', title: 'Inherited from other roles', hint: 'Come automatically with another role.', roles: by(['inherited', 'contained']) },
        ].filter((g) => g.roles.length)
    }, [subjects, sourcesBy, multi])

    const toggle = (id: string) => {
        const n = new Set(collapsed)
        n.has(id) ? n.delete(id) : n.add(id)
        setCollapsed(n)
    }

    return (
        <section className="lens-card" aria-labelledby="roles-title">
            <div className="lens-card__header lens-mx__toolbar">
                <h2 id="roles-title">Roles</h2>
                <HelpTip label="How roles are assigned">
                    <span>
                        <strong>Direct</strong>: given to the user. <strong>Group</strong>: comes from a group the user is in. <strong>Inherited</strong>: comes automatically
                        with another role (a role can contain other roles). For a selected role, <strong>Contained</strong> shows which roles it includes.
                    </span>
                    <span>Roles saved in runs created before this view existed show as Direct/Inherited only; rerun to get the full detail.</span>
                </HelpTip>
                <input className="lens-input lens-mx__search" placeholder="Filter roles…" aria-label="Filter roles" value={q} onChange={(e) => setQ(e.target.value)} />
                <label className="lens-check">
                    <input type="checkbox" checked={showHow} onChange={(e) => setShowHow(e.target.checked)} /> Show how each role is assigned
                </label>
                <span className="lens-actions">
                    <button type="button" className="lens-btn lens-btn--ghost" onClick={() => setCollapsed(new Set())}>
                        Expand all
                    </button>
                    <button type="button" className="lens-btn lens-btn--ghost" onClick={() => setCollapsed(new Set(groups.map((g) => g.id)))}>
                        Collapse all
                    </button>
                </span>
                <ListActions
                    list={byNames('sys_user_role', groups.flatMap((g) => rankFilter(g.roles, q, (r) => [r])), 'these roles')}
                    onExport={() => {
                        const out: unknown[][] = [['Group', 'Role'].concat(subjects.map((s) => s.subject.label))]
                        for (const g of groups)
                            for (const role of rankFilter(g.roles, q, (r) => [r]))
                                out.push([g.title, role].concat(subjects.map((s) => (sourcesBy[s.subject.key][role] || []).map((x) => (x.kind || 'direct') + (x.from ? `: ${x.from}` : '')).join('; '))))
                        download('acl-lens-roles.csv', toCsv(out), 'text/csv;charset=utf-8')
                    }}
                    exportWhat={`the roles listed${q ? ` (filtered by "${q}")` : ''}, with how each subject holds them`}
                    filtered={!!q}
                />
            </div>
            <div className="lens-card__body lens-roles-cmp">
                {multi && (
                    <ul className="lens-roles-cmp__summary">
                        {groups.map((g) => (
                            <li key={g.id}>
                                <strong>{g.roles.length}</strong> {g.title.toLowerCase()}
                            </li>
                        ))}
                    </ul>
                )}
                {groups.map((g) => {
                    const roles = rankFilter(g.roles, q, (r) => [r])
                    const open = !collapsed.has(g.id)
                    const bodyId = `roles-group-${g.id}`
                    return (
                        <div key={g.id} className="lens-roles-cmp__group">
                            <h3>
                                <button type="button" className="lens-disclosure" aria-expanded={open} aria-controls={bodyId} onClick={() => toggle(g.id)}>
                                    <span className={`lens-caret__icon${open ? ' lens-caret__icon--open' : ''}`} aria-hidden="true">
                                        ▸
                                    </span>
                                    {g.title} <span className="lens-muted">({roles.length}{q ? ` of ${g.roles.length}` : ''})</span>
                                </button>
                                <FieldInfo label={g.title} text={g.hint} />
                            </h3>
                            {open && (
                                <div id={bodyId} className="lens-mx__scroll lens-mx__scroll--short">
                                    {roles.length ? (
                                        <RoleTable title={g.title} roles={roles} subjects={subjects} sourcesBy={sourcesBy} showHow={showHow} />
                                    ) : (
                                        <p className="lens-muted">No roles match the filter.</p>
                                    )}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </section>
    )
}

interface TableProps {
    title: string
    roles: string[]
    subjects: SubjectResult[]
    sourcesBy: { [key: string]: { [role: string]: RoleSource[] } }
    showHow: boolean
}

function RoleTable({ title, roles, subjects: allSubjects, sourcesBy, showHow }: TableProps) {
    const vis = useSubjectVisible()
    const subjects = allSubjects.filter((s) => vis(s.subject.key))
    const columns: { [key: string]: (role: string) => string | number } = { role: (r) => r }
    for (const s of subjects) columns[s.subject.key] = (r) => (sourcesBy[s.subject.key][r] ? 1 : 0)
    const groupLabel: { [key: string]: (role: string) => string } = {}
    for (const s of subjects) groupLabel[s.subject.key] = (r) => (sourcesBy[s.subject.key][r] ? 'has the role' : 'does not have it')
    const sorter = useSort(roles, columns, { groupLabel })
    return (
        <>
        <ListBreadcrumb sorter={sorter} noun="roles" />
        <table className="lens-mx lens-mx--compact">
            <caption className="lens-sr">{title}</caption>
            <thead>
                <tr>
                    <SortTh sorter={sorter} col="role">
                        Role
                    </SortTh>
                    {subjects.map((s) => (
                        <SortTh key={s.subject.key} sorter={sorter} col={s.subject.key} tip={`Sort by whether ${s.subject.label} has the role`}>
                            <SubjectName subjectKey={s.subject.key} />
                        </SortTh>
                    ))}
                </tr>
            </thead>
            <tbody>
                <GroupedRows sorter={sorter} colSpan={1 + subjects.length} render={(role) => (
                    <tr key={role}>
                        <th scope="row" onContextMenu={sorter.cellMenu('role', role)}>
                            <code>{role}</code> <RecordLink href={recordUrl.roleByName(role)} what={`role record for ${role}`} />
                        </th>
                        {subjects.map((s) => {
                            const src = sourcesBy[s.subject.key][role]
                            return (
                                <td key={s.subject.key} onContextMenu={sorter.cellMenu(s.subject.key, role)}>
                                    {src ? (
                                        <span className="lens-yes-cell">
                                            <span className="lens-yes" aria-label="Has this role">
                                                ✓
                                            </span>
                                            {showHow && src.map((x, i) => <Assignment key={i} src={x} />)}
                                        </span>
                                    ) : (
                                        <span className="lens-no" aria-label="Does not have this role">
                                            —
                                        </span>
                                    )}
                                </td>
                            )
                        })}
                    </tr>
                )} />
            </tbody>
        </table>
        </>
    )
}
