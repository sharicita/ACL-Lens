import { queryText, rankedSearch } from './search.ts'
import { TABLE_API_PATH } from './api-access.ts'

// Typeahead lookups for the "Evaluate as API access" section of the run form. Every lookup uses
// GlideRecordSecure through rankedSearch, so results are limited to what the signed-in user can
// read; users without the API administration roles usually get an empty list.

export interface ApiOption {
    /** value stored in the run: an API path or a sys_id */
    id: string
    name: string
    /** one short line of context for the list */
    detail: string
}

const TABLE_API: ApiOption = { id: TABLE_API_PATH, name: 'Table API', detail: '/api/now/table (built in)' }

/** The built-in Table API first (when it matches), then Scripted REST APIs. */
export function lookupApis(text: string): ApiOption[] {
    const q = queryText(text).toLowerCase()
    const out: ApiOption[] = !q || TABLE_API.name.toLowerCase().indexOf(q) >= 0 || 'table'.indexOf(q) >= 0 ? [TABLE_API] : []
    const rest = rankedSearch(
        { table: 'sys_ws_definition', fields: ['name', 'service_id', 'base_uri'], text, limit: 10, secure: true, orderBy: 'name', baseQuery: 'active=true^namespaceISNOTEMPTY^service_idISNOTEMPTY' },
        (r): ApiOption => ({ id: `${r.getValue('namespace')}/${r.getValue('service_id')}`, name: r.getValue('name'), detail: r.getValue('base_uri') })
    )
    return out.concat(rest)
}

export function lookupAuthProfiles(text: string): ApiOption[] {
    return rankedSearch(
        { table: 'inbound_auth_profile', fields: ['name'], text, limit: 10, secure: true, orderBy: 'name', baseQuery: 'active=true' },
        (r): ApiOption => ({ id: r.getUniqueValue(), name: r.getValue('name'), detail: r.getDisplayValue('sys_class_name') || '' })
    )
}

export function lookupOauthApps(text: string): ApiOption[] {
    return rankedSearch(
        { table: 'oauth_entity', fields: ['name', 'client_id'], text, limit: 10, secure: true, orderBy: 'name', baseQuery: 'active=true' },
        (r): ApiOption => ({
            id: r.getUniqueValue(),
            name: r.getValue('name'),
            detail: [r.getDisplayValue('type'), r.getDisplayValue('scope_restriction_status')].filter((x) => !!x).join(' · '),
        })
    )
}

/** Resources (operations) of one Scripted REST API. */
export function lookupResources(api: string, text: string): ApiOption[] {
    const slash = (api || '').indexOf('/')
    if (slash <= 0 || !/^[A-Za-z0-9_\-./]+$/.test(api)) return []
    const namespace = api.substring(0, slash)
    const serviceId = api.substring(slash + 1)
    return rankedSearch(
        {
            table: 'sys_ws_operation',
            fields: ['name', 'relative_path'],
            text,
            limit: 10,
            secure: true,
            orderBy: 'name',
            baseQuery: `active=true^web_service_definition.namespace=${namespace}^web_service_definition.service_id=${serviceId}`,
        },
        (r): ApiOption => ({ id: r.getUniqueValue(), name: r.getValue('name'), detail: `${r.getDisplayValue('http_method')} ${r.getValue('relative_path') || '/'}` })
    )
}
