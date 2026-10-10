import React, { createContext, useContext, useMemo, useState } from 'react'
import { Subject, SubjectResult } from '../types'
import { AccountIcon } from './AccountBadge'

/** Account-type groups used by the filter: users by identity type, plus roles. */
export type SubjectKind = 'human' | 'machine' | 'ai_agent' | 'unclassified' | 'unknown' | 'role'

const KIND_LABEL: { [k in SubjectKind]: string } = {
    human: 'Human',
    machine: 'Machine / service',
    ai_agent: 'AI agent',
    unclassified: 'Unclassified',
    unknown: 'Not recorded',
    role: 'Role',
}
const KIND_ORDER: SubjectKind[] = ['human', 'machine', 'ai_agent', 'unclassified', 'unknown', 'role']

export function kindOf(s: Subject | undefined): SubjectKind {
    if (!s) return 'unknown'
    if (s.type === 'role') return 'role'
    // runs saved before account types were recorded have none
    return (s.account && (s.account.identity || 'unclassified')) || 'unknown'
}

interface Ctx {
    map: { [key: string]: Subject }
    kinds: SubjectKind[]
    hiddenKinds: Set<SubjectKind>
    setHiddenKinds: (k: Set<SubjectKind>) => void
}

/** The subjects of the run on screen, plus the account-type filter shared by every table on the page. */
const SubjectsContext = createContext<Ctx>({ map: {}, kinds: [], hiddenKinds: new Set(), setHiddenKinds: () => undefined })

export function SubjectsProvider({ subjects, children }: { subjects: SubjectResult[]; children: React.ReactNode }) {
    const [hiddenKinds, setHiddenKinds] = useState<Set<SubjectKind>>(new Set())
    const value = useMemo(() => {
        const map: { [key: string]: Subject } = {}
        for (const s of subjects) map[s.subject.key] = s.subject
        const present = new Set(subjects.map((s) => kindOf(s.subject)))
        return { map, kinds: KIND_ORDER.filter((k) => present.has(k)), hiddenKinds, setHiddenKinds }
    }, [subjects, hiddenKinds])
    return <SubjectsContext.Provider value={value}>{children}</SubjectsContext.Provider>
}

/** Returns a test: is this subject shown under the current account-type filter? */
export function useSubjectVisible(): (key: string) => boolean {
    const ctx = useContext(SubjectsContext)
    return (key: string) => !ctx.hiddenKinds.has(kindOf(ctx.map[key]))
}

/**
 * Account-type filter: toggles for each type present (users by identity type, and roles). Hidden
 * types disappear from every table on the page. At least one type stays shown. Renders nothing when
 * there is only one type.
 */
export function AccountTypeFilter() {
    const ctx = useContext(SubjectsContext)
    if (ctx.kinds.length < 2) return null
    const counts: { [k: string]: number } = {}
    for (const key of Object.keys(ctx.map)) counts[kindOf(ctx.map[key])] = (counts[kindOf(ctx.map[key])] || 0) + 1
    const shown = ctx.kinds.filter((k) => !ctx.hiddenKinds.has(k)).length
    return (
        <div className="lens-opsel lens-kindsel" role="group" aria-label="Show subjects by account type">
            <span className="lens-opsel__label">Account types</span>
            {ctx.kinds.map((k) => {
                const on = !ctx.hiddenKinds.has(k)
                return (
                    <button
                        key={k}
                        type="button"
                        className={`lens-kindsel__opt${on ? ' lens-opsel__op--on' : ''}`}
                        aria-pressed={on}
                        disabled={on && shown === 1}
                        data-tip={on && shown === 1 ? 'At least one type stays shown.' : `${on ? 'Hide' : 'Show'} ${KIND_LABEL[k].toLowerCase()} subjects (${counts[k]}) in every table`}
                        onClick={() => {
                            const n = new Set(ctx.hiddenKinds)
                            n.has(k) ? n.delete(k) : n.add(k)
                            ctx.setHiddenKinds(n)
                        }}
                    >
                        {KIND_LABEL[k]} <span className="lens-kindsel__count">{counts[k]}</span>
                    </button>
                )
            })}
            {ctx.hiddenKinds.size > 0 && (
                <button type="button" className="lens-link lens-opsel__all" onClick={() => ctx.setHiddenKinds(new Set())}>
                    All
                </button>
            )}
        </div>
    )
}

/**
 * A compared subject's name, with an account-type icon for users (human, machine / service, AI agent,
 * unclassified). Pass `focusable` when the name is not inside a button or link.
 */
export default function SubjectName({ subjectKey, label, focusable }: { subjectKey: string; label?: string; focusable?: boolean }) {
    const s = useContext(SubjectsContext).map[subjectKey]
    const name = label || (s && s.label) || subjectKey
    return (
        <span className="lens-subjname">
            {/* runs saved before account types were recorded have none: show no icon rather than guess */}
            {s && s.type === 'user' && s.account && <AccountIcon account={s.account} focusable={focusable} />}
            {name}
        </span>
    )
}
