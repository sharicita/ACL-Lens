import React, { useState } from 'react'
import { ApiContext } from '../types'
import { LensApi } from '../services/LensApi'
import SearchCombo from './SearchCombo'
import HelpTip from './HelpTip'
import FieldInfo from './FieldInfo'
import Tip from './Tip'
import Icon from './Icon'

interface Props {
    api: ApiContext | undefined
    onChange: (api: ApiContext | undefined) => void
    /** a selected user is a machine, AI agent, web-service-only or integration account */
    suggest: boolean
}

const TABLE_API = 'now/table'

type NameKey = 'api' | 'authProfile' | 'oauthEntity' | 'operation'

interface PickProps {
    id: string
    label: string
    info: string
    placeholder: string
    emptyText: string
    value: string
    name: string
    /** shown when nothing is chosen (a default the engine applies) */
    unset: string
    search: (q: string) => Promise<{ id: string; name: string; detail: string }[]>
    onPick: (id: string, name: string) => void
    onClear: () => void
}

/** One optional choice: a search box until something is picked, then the pick with a remove button. */
function Pick(p: PickProps) {
    return (
        <div className="lens-field">
            <span className="lens-field__label lens-field__label--info">
                <span id={p.id}>{p.label}</span>
                <FieldInfo label={p.label} text={p.info} />
            </span>
            {p.value ? (
                <ul className="lens-chips" aria-labelledby={p.id}>
                    <li className="lens-chip">
                        {p.name || <code>{p.value}</code>}
                        <button type="button" className="lens-chip__remove" aria-label={`Remove ${p.name || p.value}`} onClick={p.onClear}>
                            ×
                        </button>
                    </li>
                </ul>
            ) : (
                <>
                    <SearchCombo
                        label={p.label}
                        hideLabel
                        placeholder={p.placeholder}
                        emptyText={p.emptyText}
                        clearOnPick
                        search={async (q) => (await p.search(q)).map((o) => ({ key: o.id, primary: o.name, secondary: o.detail }))}
                        onPick={(o) => p.onPick(o.key, o.primary)}
                    />
                    <p className="lens-muted">{p.unset}</p>
                </>
            )}
        </div>
    )
}

/**
 * "Evaluate as API access": adds the controls that sit in front of record ACLs when a request
 * arrives through a REST API (access policy, OAuth auth scope, API ACLs, web-service access).
 */
export default function ApiAccessPanel({ api, onChange, suggest }: Props) {
    const [open, setOpen] = useState(suggest || !!api)
    const expanded = open || !!api
    const isTable = !!api && api.api === TABLE_API

    const patch = (changes: Partial<ApiContext>, names: { [k in NameKey]?: string } = {}, drop: NameKey[] = []) => {
        if (!api) return
        const merged = { ...(api.names || {}), ...names } as { [k: string]: string }
        for (const k of drop) delete merged[k]
        onChange({ ...api, ...changes, names: merged })
    }

    return (
        <section className="lens-card" aria-labelledby="api-title">
            <div className="lens-card__header">
                <h2 id="api-title">
                    <Icon name="plug" />
                    Evaluate as API access <span className="lens-muted">(optional)</span>
                </h2>
                <HelpTip label="What does Evaluate as API access add?">
                    <span>
                        Requests that arrive through a REST API must also pass checks that come before record ACLs: the OAuth application's auth scope, the REST API access policy for the
                        authentication method, the API's own ACLs and, for the Table API, the table's web-service access setting.
                    </span>
                    <span>The result for each table is the record access combined with these checks. Anything that can't be decided without a live request shows as Conditional.</span>
                </HelpTip>
                {!api && (
                    <button type="button" className="lens-btn lens-btn--ghost" aria-expanded={expanded} onClick={() => setOpen(!expanded)}>
                        {expanded ? 'Hide' : 'Set up'}
                    </button>
                )}
            </div>
            {expanded && (
                <div className="lens-card__body lens-filter">
                    <label className="lens-check">
                        <input
                            type="checkbox"
                            checked={!!api}
                            onChange={(e) => onChange(e.target.checked ? { api: TABLE_API, authProfile: 'any', resource: '/now/table/{tableName}', names: { api: 'Table API' } } : undefined)}
                        />
                        Also check the API controls for this run
                    </label>
                    {suggest && !api && <Tip id="api-suggest">A selected user is a machine, AI agent, web-service-only or integration account. These usually reach data through APIs, so tick the box above to include the API checks.</Tip>}
                    {api && (
                        <>
                            <Pick
                                id="api-pick-api"
                                label="REST API"
                                info="The API the requests go to. The Table API (/api/now/table) is the default. Pick a Scripted REST API to check its auth scope and API ACLs instead."
                                placeholder="Search REST APIs…"
                                emptyText="No REST APIs you can read match. Only users with the web service or API administration roles can see Scripted REST APIs."
                                value={api.api}
                                name={(api.names || {}).api || (isTable ? 'Table API' : '')}
                                unset=""
                                search={LensApi.searchApis}
                                onPick={(id, name) =>
                                    patch(
                                        { api: id, operation: undefined, resource: id === TABLE_API ? '/now/table/{tableName}' : undefined },
                                        { api: name },
                                        ['operation']
                                    )
                                }
                                onClear={() => patch({ api: TABLE_API, operation: undefined, resource: '/now/table/{tableName}' }, { api: 'Table API' }, ['operation'])}
                            />
                            {!isTable && (
                                <Pick
                                    id="api-pick-operation"
                                    label="REST resource"
                                    info="The resource (operation) of this Scripted REST API. Its own ACLs and flags replace the API's default ACLs. Leave empty to check the default ACLs only (shown as Conditional)."
                                    placeholder="Search resources of this API…"
                                    emptyText="No resources you can read match."
                                    value={api.operation || ''}
                                    name={(api.names || {}).operation || ''}
                                    unset="Not chosen: only the API's default ACLs are checked, and the result is at most Conditional."
                                    search={(q) => LensApi.searchApiResources(api.api, q)}
                                    onPick={(id, name) => patch({ operation: id }, { operation: name })}
                                    onClear={() => patch({ operation: undefined }, {}, ['operation'])}
                                />
                            )}
                            <Pick
                                id="api-pick-profile"
                                label="Authentication method"
                                info="The inbound authentication profile the integration uses (Basic, OAuth token, ID token, API key, certificate). REST API access policies allow specific methods. Leave empty to ask whether any allowed method exists."
                                placeholder="Search authentication profiles…"
                                emptyText="No authentication profiles you can read match."
                                value={api.authProfile && api.authProfile !== 'any' ? api.authProfile : ''}
                                name={(api.names || {}).authProfile || ''}
                                unset="Any method: passes if the matching access policy allows at least one active authentication profile."
                                search={LensApi.searchAuthProfiles}
                                onPick={(id, name) => patch({ authProfile: id }, { authProfile: name })}
                                onClear={() => patch({ authProfile: 'any' }, {}, ['authProfile'])}
                            />
                            <Pick
                                id="api-pick-oauth"
                                label="OAuth application"
                                info="The Application Registry entry the token was issued to. Its auth scopes are compared with the scope the API requires. Leave empty for authentication that doesn't use OAuth."
                                placeholder="Search OAuth applications…"
                                emptyText="No OAuth applications you can read match."
                                value={api.oauthEntity || ''}
                                name={(api.names || {}).oauthEntity || ''}
                                unset="Not chosen: the auth scope check is skipped."
                                search={LensApi.searchOauthApps}
                                onPick={(id, name) => patch({ oauthEntity: id }, { oauthEntity: name })}
                                onClear={() => patch({ oauthEntity: undefined }, {}, ['oauthEntity'])}
                            />
                        </>
                    )}
                </div>
            )}
        </section>
    )
}
