import React, { useState } from 'react'
import { LensApi } from '../services/LensApi'
import { SubjectOption, SubjectType } from '../types'
import SearchCombo from './SearchCombo'
import HelpTip from './HelpTip'

interface Props {
    selected: SubjectOption[]
    max: number
    onAdd: (s: SubjectOption) => void
    onRemove: (s: SubjectOption) => void
}

export default function SubjectPicker({ selected, max, onAdd, onRemove }: Props) {
    const [type, setType] = useState<SubjectType>('user')
    const full = selected.length >= max
    const isSelected = (t: SubjectType, id: string) => selected.some((s) => s.id === id && s.type === t)

    return (
        <section className="lens-card" aria-labelledby="pick-title">
            <div className="lens-card__header">
                <h2 id="pick-title">1. Users and roles</h2>
                <HelpTip label="Users or roles?">
                    <span>
                        A <strong>user</strong> is analyzed with every role they hold: assigned directly, through their groups, and roles contained in those roles.
                        A <strong>role</strong> is analyzed with the role itself plus every role it contains, which is what anyone given that role would get.
                    </span>
                </HelpTip>
                <span className="lens-muted lens-card__aside">
                    {selected.length}/{max} selected – add two or more to compare
                </span>
            </div>
            <div className="lens-card__body">
                <div className="lens-picker">
                    <div className="lens-segment" role="radiogroup" aria-label="Search for">
                        {(['user', 'role'] as SubjectType[]).map((t) => (
                            <button
                                key={t}
                                type="button"
                                role="radio"
                                aria-checked={type === t}
                                className={`lens-segment__item${type === t ? ' lens-segment__item--on' : ''}`}
                                onClick={() => setType(t)}
                                data-tip={t === 'user' ? 'Analyze a person: all roles they hold directly, through groups and inherited.' : 'Analyze a role: the role and every role it contains.'}
                            >
                                {t === 'user' ? 'User' : 'Role'}
                            </button>
                        ))}
                    </div>
                    <SearchCombo
                        key={type}
                        label={type === 'user' ? 'Search users' : 'Search roles'}
                        hideLabel
                        placeholder={full ? 'Maximum reached' : type === 'user' ? 'Start typing a user ID, name or email…' : 'Start typing a role name…'}
                        disabled={full}
                        clearOnPick
                        search={async (q) =>
                            (await LensApi.searchSubjects(type, q)).map((o) => ({
                                key: o.id,
                                primary: o.label,
                                secondary: o.sub,
                                badge: type,
                                disabled: isSelected(type, o.id),
                            }))
                        }
                        onPick={(o) => onAdd({ id: o.key, type, label: o.primary, sub: o.secondary || '' })}
                    />
                </div>
                <ul className="lens-chips" aria-label="Selected users and roles">
                    {selected.map((s) => (
                        <li key={`${s.type}:${s.id}`} className="lens-chip">
                            <span className={`lens-kind lens-kind--${s.type}`}>{s.type}</span>
                            {s.label}
                            <button type="button" className="lens-chip__remove" aria-label={`Remove ${s.label}`} onClick={() => onRemove(s)}>
                                ×
                            </button>
                        </li>
                    ))}
                    {!selected.length && <li className="lens-muted">Nothing selected yet.</li>}
                </ul>
            </div>
        </section>
    )
}
