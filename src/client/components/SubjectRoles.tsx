import React, { useState } from 'react'
import { RoleSource, Subject } from '../types'
import RecordLink, { recordUrl } from './RecordLink'

/** How many chips a list shows before "+N more". */
const SHORT = 6

interface Grouped {
    /** explicitly assigned to the subject itself */
    assigned: RoleSource[]
    /** users only: roles the user's groups give, by group name */
    groups: { group: string; roles: RoleSource[] }[]
    /** come automatically with another role (inherited / contained) */
    implicit: RoleSource[]
}

/** Each role once, under its strongest assignment: selected/direct > group > inherited/contained. */
export function groupRoles(s: Subject): Grouped {
    const out: Grouped = { assigned: [], groups: [], implicit: [] }
    const byRole: { [r: string]: RoleSource[] } = {}
    for (const src of s.roleSources) (byRole[src.role] = byRole[src.role] || []).push(src)
    const groupIdx: { [g: string]: number } = {}
    for (const role of Object.keys(byRole).sort()) {
        const srcs = byRole[role]
        const has = (k: string) => srcs.find((x) => (x.kind || 'direct') === k)
        const explicit = has('selected') || has('direct') || (s.type === 'group' ? has('group') : undefined)
        if (explicit) {
            out.assigned.push(explicit)
            continue
        }
        const viaGroups = s.type === 'user' ? srcs.filter((x) => x.kind === 'group') : []
        if (viaGroups.length) {
            for (const g of viaGroups) {
                const name = g.from || 'group'
                if (groupIdx[name] === undefined) {
                    groupIdx[name] = out.groups.length
                    out.groups.push({ group: name, roles: [] })
                }
                out.groups[groupIdx[name]].roles.push(g)
            }
            continue
        }
        out.implicit.push(srcs[0])
    }
    // roles a subject holds without a recorded source still count as assigned
    for (const r of s.roles) if (!byRole[r]) out.assigned.push({ role: r, via: 'direct', kind: 'direct' })
    out.groups.sort((a, b) => a.group.localeCompare(b.group))
    return out
}

function Chips({ list, tip, kind }: { list: RoleSource[]; tip: (r: RoleSource) => string; kind: string }) {
    const [all, setAll] = useState(false)
    const shown = all ? list : list.slice(0, SHORT)
    return (
        <ul className="lens-rolechips">
            {shown.map((r) => (
                <li key={r.role}>
                    <a
                        className={`lens-rolechip lens-rolechip--${kind}`}
                        href={recordUrl.roleByName(r.role)}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${r.role}: ${tip(r)}. Opens the role record in a new window`}
                        data-tip={`${tip(r)}. Click to open the role record.`}
                    >
                        {r.role}
                    </a>
                </li>
            ))}
            {list.length > SHORT && (
                <li>
                    <button type="button" className="lens-link lens-rolechips__more" onClick={() => setAll(!all)} aria-expanded={all}>
                        {all ? 'Show fewer' : `+${list.length - SHORT} more`}
                    </button>
                </li>
            )}
        </ul>
    )
}

/**
 * The roles on a subject card: what is explicitly assigned, visible straight away, and the
 * implicit (inherited / contained) roles one click away.
 */
export default function SubjectRoles({ subject }: { subject: Subject }) {
    const [showImplicit, setShowImplicit] = useState(false)
    const g = groupRoles(subject)
    const label = subject.type === 'role' ? 'The role' : subject.type === 'group' ? 'Assigned to the group' : 'Assigned directly'
    const implicitLabel = subject.type === 'user' ? 'inherited' : 'contained'
    return (
        <div className="lens-subject__rolelist">
            <div className="lens-rolegroup">
                <span className="lens-rolegroup__label">{label}</span>
                {g.assigned.length ? (
                    <Chips list={g.assigned} kind="assigned" tip={() => (subject.type === 'role' ? 'The selected role' : subject.type === 'group' ? 'Given to the group' : 'Given to the user directly')} />
                ) : (
                    <span className="lens-muted">none</span>
                )}
            </div>
            {g.groups.map((grp) => (
                <div className="lens-rolegroup" key={grp.group}>
                    <span className="lens-rolegroup__label">
                        Via group <RecordLink href={recordUrl.groupByName(grp.group)} what={`group record for ${grp.group}`}>{grp.group}</RecordLink>
                    </span>
                    <Chips list={grp.roles} kind="group" tip={() => `Granted because the user is in ${grp.group}`} />
                </div>
            ))}
            {g.implicit.length > 0 && (
                <div className="lens-rolegroup">
                    <button
                        type="button"
                        className="lens-link lens-rolegroup__toggle"
                        aria-expanded={showImplicit}
                        onClick={() => setShowImplicit(!showImplicit)}
                        data-tip={`Roles that come automatically with another role (${implicitLabel})`}
                    >
                        <span className={`lens-caret__icon${showImplicit ? ' lens-caret__icon--open' : ''}`}>▸</span>
                        {g.implicit.length} {implicitLabel} role{g.implicit.length === 1 ? '' : 's'}
                    </button>
                    {showImplicit && <Chips list={g.implicit} kind="implicit" tip={(r) => (r.from ? `Comes with ${r.from}` : r.via)} />}
                </div>
            )}
        </div>
    )
}
