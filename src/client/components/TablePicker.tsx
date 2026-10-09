import React, { useRef } from 'react'
import { LensApi } from '../services/LensApi'
import SearchCombo from './SearchCombo'

interface Props {
    mode: 'tables' | 'prefix'
    /** comma separated list */
    value: string
    onChange: (value: string) => void
}

function split(v: string): string[] {
    return (v || '')
        .split(',')
        .map((x) => x.trim())
        .filter((x) => !!x)
}

/**
 * Picks tables (or table-name prefixes) with the same search as everywhere else in the app.
 * Suggestions come from tables the signed-in user can read; any typed text can also be added.
 */
export default function TablePicker({ mode, value, onChange }: Props) {
    const items = split(value)
    const add = (v: string) => {
        const t = v.trim()
        if (t && items.indexOf(t) < 0) onChange(items.concat([t]).join(', '))
    }
    const remove = (v: string) => onChange(items.filter((x) => x !== v).join(', '))
    const lastCount = useRef(0)

    return (
        <div className="lens-field">
            <SearchCombo
                label={mode === 'tables' ? 'Tables' : 'Table name starts with'}
                placeholder={mode === 'tables' ? 'Start typing a table name or label…' : 'Type a prefix such as cmdb_ci or x_acme_…'}
                clearOnPick
                emptyText="No tables you can access match. Press Enter to add what you typed."
                search={async (q) => {
                    const r = await LensApi.searchTables(q)
                    lastCount.current = r.prefixCount
                    return r.results.map((t) => ({ key: t.name, primary: t.name, secondary: t.label, disabled: items.indexOf(t.name) >= 0 }))
                }}
                freeTextOption={(q) => {
                    const t = q.trim()
                    if (!t || items.indexOf(t) >= 0) return null
                    return mode === 'prefix'
                        ? { key: `prefix:${t}`, primary: `Use prefix "${t}"`, secondary: lastCount.current ? `${lastCount.current} table(s) you can see start with it`  : 'add as typed' }
                        : { key: `free:${t}`, primary: `Add "${t}" as typed`, secondary: 'exact table name' }
                }}
                onPick={(o, typed) => add(o.key.startsWith('prefix:') || o.key.startsWith('free:') ? typed : o.key)}
            />
            <ul className="lens-chips" aria-label={mode === 'tables' ? 'Selected tables' : 'Selected prefixes'}>
                {items.map((t) => (
                    <li key={t} className="lens-chip">
                        <code>{t}</code>
                        <button type="button" className="lens-chip__remove" aria-label={`Remove ${t}`} onClick={() => remove(t)}>
                            ×
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    )
}
