import React from 'react'
import { SubjectResult, TABLE_OPS } from '../types'
import HelpTip from './HelpTip'
import AccountBadge from './AccountBadge'
import RecordLink, { recordUrl } from './RecordLink'
import AddSubjectCard from './AddSubjectCard'
import { SubjectOption } from '../types'

interface Props {
    subjects: SubjectResult[]
    defaultDeny: boolean
    hidden: Set<string>
    baseline: string
    onToggle: (key: string) => void
    onBaseline: (key: string) => void
    onShowRoles: () => void
    /** add another subject (runs again as a new run); omitted when adding isn't possible */
    onAdd?: (s: SubjectOption) => void
    addBusy?: string
}

/** most subjects one analysis can compare */
export const MAX_SUBJECTS = 8

const OP_LABEL: { [op: string]: string } = { create: 'Create', read: 'Read', write: 'Write', delete: 'Delete' }

export function BaselineHelp() {
    return (
        <HelpTip label="What is the baseline?">
            <span>
                The <strong>baseline</strong> is the user or role everyone else is compared to <em>on this screen</em>. In the matrix, a result that differs from the baseline gets a
                purple outline, so you can spot differences at a glance.
            </span>
            <span>It does not change any results or the saved run. It starts as the first subject.</span>
            <span>
                Your choice is remembered <strong>in this browser, for this run</strong>, so it is still set when you come back. Other people choose their own.
            </span>
        </HelpTip>
    )
}

function assignmentSummary(sr: SubjectResult): string {
    const s = sr.subject
    if (s.type === 'role') {
        const contained = s.roles.length - 1
        return contained ? `the role + ${contained} contained role${contained === 1 ? '' : 's'}` : 'contains no other roles'
    }
    const kinds = { direct: 0, group: 0, inherited: 0 } as { [k: string]: number }
    const seen: { [r: string]: boolean } = {}
    for (const r of s.roleSources) {
        // count each role once, by its strongest assignment: direct > group > inherited
        if (seen[r.role]) continue
        const all = s.roleSources.filter((x) => x.role === r.role).map((x) => x.kind || 'direct')
        const k = all.indexOf('direct') >= 0 ? 'direct' : all.indexOf('group') >= 0 ? 'group' : 'inherited'
        kinds[k]++
        seen[r.role] = true
    }
    const parts = []
    if (kinds.direct) parts.push(`${kinds.direct} direct`)
    if (kinds.group) parts.push(`${kinds.group} via groups`)
    if (kinds.inherited) parts.push(`${kinds.inherited} inherited`)
    return parts.join(' · ') || 'no roles assigned'
}

export default function SubjectCards({ subjects, defaultDeny, hidden, baseline, onToggle, onBaseline, onShowRoles, onAdd, addBusy }: Props) {
    const multi = subjects.length > 1
    return (
        <div className="lens-subjects">
            {subjects.map((sr) => {
                const s = sr.subject
                const total = sr.tables.length
                const isHidden = hidden.has(s.key)
                const isBase = baseline === s.key
                const others = subjects.filter((o) => o.subject.key !== s.key)
                const onlyHere = s.roles.filter((r) => others.every((o) => o.subject.roles.indexOf(r) < 0)).length
                const sharedTip = others.map((o) => `${o.subject.roles.filter((r) => s.roles.indexOf(r) >= 0).length} shared with ${o.subject.label}`).join(' · ')
                return (
                    <article key={s.key} className={`lens-subject${isHidden ? ' lens-subject--hidden' : ''}${isBase ? ' lens-subject--baseline' : ''}`} aria-label={`${s.type} ${s.label}`}>
                        <header className="lens-subject__head">
                            <span className={`lens-kind lens-kind--${s.type}`}>{s.type}</span>
                            <div className="lens-subject__name">
                                <span className="lens-subject__title">
                                    <strong data-tip={s.label}>{s.label}</strong>
                                    <RecordLink
                                        href={s.type === 'user' ? recordUrl.user(s.id) : recordUrl.role(s.id)}
                                        what={`${s.type === 'user' ? 'user' : 'role'} record for ${s.label}`}
                                    />
                                </span>
                                {s.sub && (
                                    <span className="lens-subject__sub" data-tip={s.sub}>
                                        {s.sub}
                                    </span>
                                )}
                                {s.type === 'user' && <AccountBadge account={s.account} />}
                            </div>
                            {isBase && multi && (
                                <span className="lens-pill lens-pill--baseline" data-tip="Everyone else is compared to this subject on this screen.">
                                    Baseline
                                </span>
                            )}
                        </header>
                        {(s.isAdmin || !s.active || (s.type === 'user' && !s.roles.length)) && (
                            <p className="lens-subject__flags">
                                {s.isAdmin && (
                                    <span className="lens-pill" data-tip="Has the admin role, which passes most role checks.">
                                        admin
                                    </span>
                                )}
                                {!s.active && (
                                    <span className="lens-pill lens-pill--error" data-tip="This user account is inactive and can't sign in.">
                                        inactive
                                    </span>
                                )}
                                {s.type === 'user' && !s.roles.length && (
                                    <span className="lens-pill" data-tip="No roles: only rules that are open to everyone apply.">
                                        no roles
                                    </span>
                                )}
                            </p>
                        )}

                        <table className="lens-subject__access">
                            <caption className="lens-subject__caption">Tables accessible, of {total} analyzed</caption>
                            <thead>
                                <tr>
                                    <th scope="col">
                                        <span className="lens-sr">Operation</span>
                                    </th>
                                    <th scope="col" data-tip="Allowed outright by the rules.">
                                        Granted
                                    </th>
                                    <th scope="col" data-tip="Roles match, but a condition or script decides record by record. Open a table to see the condition.">
                                        Condit.
                                    </th>
                                    <th scope="col" data-tip={defaultDeny ? 'Denied by a rule, or no rule applies (this instance denies by default).' : 'Denied by a rule.'}>
                                        Denied
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {TABLE_OPS.map((op) => {
                                    const c = sr.counts[op]
                                    const granted = c.G + (defaultDeny ? 0 : c.N)
                                    const denied = c.D + (defaultDeny ? c.N : 0)
                                    const pct = (n: number) => `${total ? (n / total) * 100 : 0}%`
                                    return (
                                        <tr key={op}>
                                            <th scope="row">
                                                <span className="lens-subject__opcell">
                                                    {OP_LABEL[op]}
                                                    <span className="lens-bar" aria-hidden="true">
                                                        <span className="lens-bar__seg lens-bar__seg--G" style={{ width: pct(granted) }} />
                                                        <span className="lens-bar__seg lens-bar__seg--C" style={{ width: pct(c.C) }} />
                                                    </span>
                                                </span>
                                            </th>
                                            <td className="lens-num lens-num--G">{granted}</td>
                                            <td className="lens-num lens-num--C">{c.C}</td>
                                            <td className="lens-num lens-num--D">{denied}</td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>

                        <p className="lens-subject__roles">
                            <span data-tip={assignmentSummary(sr)} tabIndex={0}>
                                <strong>{s.roles.length}</strong> role{s.roles.length === 1 ? '' : 's'}
                            </span>
                            {multi && s.roles.length > 0 && (
                                <>
                                    {' · '}
                                    <span data-tip={`Roles no other subject has. ${sharedTip}.`} tabIndex={0}>
                                        <strong>{onlyHere}</strong> only here
                                    </span>
                                </>
                            )}
                        </p>

                        <div className="lens-subject__actions">
                            <button type="button" className="lens-link" onClick={onShowRoles} data-tip="Compare roles side by side and see how each was assigned.">
                                Compare roles
                            </button>
                            {multi && (
                                <span className="lens-subject__baseline">
                                    <button
                                        type="button"
                                        className="lens-link"
                                        disabled={isBase}
                                        onClick={() => onBaseline(s.key)}
                                        aria-pressed={isBase}
                                        data-tip="Compare everyone against this subject on this screen."
                                    >
                                        {isBase ? 'Is the baseline' : 'Use as baseline'}
                                    </button>
                                    <BaselineHelp />
                                </span>
                            )}
                            {multi && (
                                <button type="button" className="lens-link" onClick={() => onToggle(s.key)} aria-pressed={isHidden} data-tip="Hide or show this subject's columns in the matrix.">
                                    {isHidden ? 'Show column' : 'Hide column'}
                                </button>
                            )}
                        </div>
                    </article>
                )
            })}
            {onAdd && subjects.length < MAX_SUBJECTS && (
                <AddSubjectCard existing={subjects.map((x) => ({ type: x.subject.type, id: x.subject.id }))} busy={addBusy || ''} onAdd={onAdd} />
            )}
        </div>
    )
}
