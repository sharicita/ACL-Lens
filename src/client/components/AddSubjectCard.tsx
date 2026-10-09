import React, { useEffect, useRef, useState } from 'react'
import { LensApi } from '../services/LensApi'
import { SubjectOption, SubjectType } from '../types'
import SearchCombo from './SearchCombo'

interface Props {
    /** subjects already in the run (they can't be added twice) */
    existing: { type: SubjectType; id: string }[]
    /** busy label while the new run is being created */
    busy: string
    onAdd: (s: SubjectOption) => void
}

/**
 * The last card in the subject row: adds another user or role to this comparison. Picking one runs
 * the same tables again with everyone plus the new subject and opens the new run.
 */
export default function AddSubjectCard({ existing, busy, onAdd }: Props) {
    const [open, setOpen] = useState(false)
    const [type, setType] = useState<SubjectType>('user')
    const opener = useRef<HTMLButtonElement>(null)
    const panel = useRef<HTMLDivElement>(null)

    // put the cursor in the search box when the card opens or the User/Role choice changes
    useEffect(() => {
        if (open) panel.current?.querySelector('input')?.focus()
    }, [open, type])
    const has = (t: SubjectType, id: string) => existing.some((s) => s.type === t && s.id === id)

    if (busy)
        return (
            <div className="lens-subject lens-subject--add lens-subject--add-busy" role="status">
                <span className="lens-spinner" aria-hidden="true" />
                <span>{busy}</span>
                <span className="lens-muted">Running the same tables with the new subject. This opens as a new run.</span>
            </div>
        )

    if (!open)
        return (
            <button
                ref={opener}
                type="button"
                className="lens-subject lens-subject--add"
                onClick={() => setOpen(true)}
                data-tip="Add another user or role to this comparison. The same tables are analyzed again and saved as a new run."
            >
                <span className="lens-subject__plus" aria-hidden="true">
                    +
                </span>
                <span>Add user or role</span>
            </button>
        )

    return (
        <div ref={panel} className="lens-subject lens-subject--add lens-subject--add-open" role="group" aria-label="Add a user or role">
            <div className="lens-segment" role="radiogroup" aria-label="Add a">
                {(['user', 'role'] as SubjectType[]).map((t) => (
                    <button
                        key={t}
                        type="button"
                        role="radio"
                        aria-checked={type === t}
                        className={`lens-segment__item${type === t ? ' lens-segment__item--on' : ''}`}
                        onClick={() => setType(t)}
                    >
                        {t === 'user' ? 'User' : 'Role'}
                    </button>
                ))}
            </div>
            <SearchCombo
                key={type}
                label={type === 'user' ? 'Add a user' : 'Add a role'}
                hideLabel
                placeholder={type === 'user' ? 'Type a user ID, name or email…' : 'Type a role name…'}
                search={async (q) =>
                    (await LensApi.searchSubjects(type, q)).map((o) => ({
                        key: o.id,
                        primary: o.label,
                        secondary: o.sub,
                        badge: type,
                        disabled: has(type, o.id),
                    }))
                }
                onPick={(o) => onAdd({ id: o.key, type, label: o.primary, sub: o.secondary || '' })}
            />
            <p className="lens-muted lens-subject__addnote">The same tables are analyzed again with everyone plus your choice, and saved as a new run.</p>
            <button
                type="button"
                className="lens-link"
                onClick={() => {
                    setOpen(false)
                    setTimeout(() => opener.current?.focus(), 0)
                }}
            >
                Cancel
            </button>
        </div>
    )
}
