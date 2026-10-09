import React from 'react'
import { LensApi } from '../services/LensApi'
import SearchCombo from './SearchCombo'

interface Props {
    value: string
    onChange: (scope: string) => void
}

/** Application scope typeahead. Results come from scopes the signed-in user can read. */
export default function ScopeInput({ value, onChange }: Props) {
    return (
        <SearchCombo
            label="Application scope"
            placeholder="Start typing a scope or app name…"
            value={value}
            onTextChange={onChange}
            emptyText="No scopes you can access match"
            search={async (q) => (await LensApi.searchScopes(q)).map((s) => ({ key: s.scope, primary: s.scope, secondary: s.name }))}
            onPick={(o) => onChange(o.key)}
        />
    )
}
