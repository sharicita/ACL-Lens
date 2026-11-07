import { GlideRecordSecure } from '@servicenow/glide'
import { aclInfoFromRow } from './acl-index.ts'
import { AccessPolicy, ApiInputs, ApiScopeRow, InboundProfile, matchMiacColumns, MiacInputs, MiacRecord, OauthEntityInfo, RestEndpoint, RestResource, TABLE_API_PATH } from './api-access.ts'
import { bool, chunk, gr } from './glide.ts'
import { AclInfo, ApiContext } from './types.ts'

// Loads the API configuration (access policies, auth scopes, Scripted REST ACLs) a run needs.
// Configuration tables are read as the signed-in user (GlideRecordSecure): a table the user can't
// read is reported in `hidden` so the gate becomes Conditional instead of wrongly passing.
// Tables or columns missing on older releases are treated as having no data.

export interface ApiLoad {
    inputs: ApiInputs
    /** endpoint ACLs in the order ApiGate.ep indexes (AnalysisResult.apiAcls) */
    acls: AclInfo[]
    /** names of the security attributes the endpoint ACLs use */
    attributeNames(): string[]
}

const API_PATH = /^[A-Za-z0-9_\-./]+$/
const SYS_ID = /^[0-9a-f]{32}$/
const MIAC_TABLE = 'sys_security_machine_identity_access_control'

function open(table: string, hidden: string[]): any | null {
    const g = new GlideRecordSecure(table) as any
    if (!g.isValid()) return null
    if (!g.canRead()) {
        hidden.push(table)
        return null
    }
    return g
}

const field = (g: any, f: string): string => (g.isValidField(f) ? g.getValue(f) || '' : '')
const list = (value: string): string[] => (value || '').split(',').filter((s) => !!s)

/** Rows of `table` whose `column` is one of `ids`, handed to `each` (ids are looked up in chunks). */
function eachIn(table: string, column: string, ids: string[], hidden: string[], each: (g: any) => void) {
    if (!ids.length) return
    for (const part of chunk(ids, 200)) {
        const g = open(table, hidden)
        if (!g) return
        g.addQuery(column, 'IN', part.join(','))
        g.query()
        while (g.next()) each(g)
    }
}

export function loadApiInputs(ctx: ApiContext): ApiLoad {
    if (!API_PATH.test(ctx.api || '')) throw new Error('Choose a valid API')
    if (ctx.oauthEntity && !SYS_ID.test(ctx.oauthEntity)) throw new Error('Choose a valid OAuth application')
    if (ctx.operation && !SYS_ID.test(ctx.operation)) throw new Error('Choose a valid REST resource')
    const hidden: string[] = []
    const inputs: ApiInputs = { policies: [], profiles: {}, scopeRows: [], useraccountScope: '', acls: {}, order: [], hidden }

    // REST API access policies for this API, plus the global ones
    const policyIds: string[] = []
    const p = open('sys_api_access_policy', hidden)
    if (p) {
        p.addEncodedQuery(p.isValidField('apply_global') ? `active=true^api_path=${ctx.api}^ORapply_global=true` : `active=true^api_path=${ctx.api}`)
        p.query()
        while (p.next()) {
            const row: AccessPolicy = {
                id: p.getUniqueValue(),
                active: bool(field(p, 'active')),
                apiPath: field(p, 'api_path'),
                version: field(p, 'version'),
                resource: field(p, 'api_resource'),
                method: field(p, 'http_method'),
                tables: list(field(p, 'api_tablename')),
                allVersions: bool(field(p, 'apply_all_versions')),
                allMethods: bool(field(p, 'apply_all_methods')),
                allResources: bool(field(p, 'apply_all_resources')),
                allTables: bool(field(p, 'apply_all_tables')),
                global: bool(field(p, 'apply_global')),
                profiles: [],
            }
            policyIds.push(row.id)
            inputs.policies.push(row)
        }
    }
    const byPolicy: { [id: string]: AccessPolicy } = {}
    for (const row of inputs.policies) byPolicy[row.id] = row
    const profileIds: { [id: string]: boolean } = {}
    eachIn('sys_auth_profile_mapping', 'api_access_policy', policyIds, hidden, (m) => {
        const pol = byPolicy[m.getValue('api_access_policy')]
        const prof = m.getValue('inbound_auth_profile')
        if (!pol || !prof) return
        pol.profiles.push(prof)
        profileIds[prof] = true
    })
    const ids = Object.keys(profileIds)
    eachIn('inbound_auth_profile', 'sys_id', ids, hidden, (g) => {
        const prof: InboundProfile = { id: g.getUniqueValue(), active: bool(field(g, 'active')) }
        inputs.profiles[prof.id] = prof
    })
    eachIn('std_http_auth', 'sys_id', ids, hidden, (g) => {
        const prof = inputs.profiles[g.getUniqueValue()]
        const pinned = field(g, 'oauth_entity')
        if (prof && pinned) prof.oauthEntity = pinned
    })

    if (ctx.oauthEntity) loadScopes(ctx, inputs, hidden)
    inputs.miac = loadMiac()

    const acls: AclInfo[] = []
    if (ctx.api !== TABLE_API_PATH) inputs.endpoint = loadEndpoint(ctx, inputs, acls, hidden)
    return { inputs, acls, attributeNames: () => acls.map((a) => a.securityAttribute).filter((n) => !!n) }
}

/**
 * Reads the MIAC records. Not reported through `hidden`, because that would make the gate Conditional
 * for human accounts too. Anything unexpected yields a state other than 'ok', which the gate treats as
 * "couldn't be evaluated", never as allowed. Not yet run on an instance that has MIAC records.
 */
function loadMiac(): MiacInputs {
    const none = (state: MiacInputs['state']): MiacInputs => ({ state, records: [] })
    try {
        const g = new GlideRecordSecure(MIAC_TABLE) as any
        if (!g.isValid()) return none('absent')
        if (!g.canRead()) return none('hidden')
        const elements: { name: string; label: string }[] = []
        const found = g.getElements()
        for (let i = 0; i < found.length; i++) elements.push({ name: String(found[i].getName()), label: String(found[i].getLabel()) })
        const columns = matchMiacColumns(elements)
        if (!columns) return none('unverified')
        if (g.isValidField('active')) g.addQuery('active', true)
        g.query()
        const records: MiacRecord[] = []
        const lists = [columns.users, columns.policies, columns.tables]
        while (g.next()) {
            // a field the user can't read comes back empty, which must not look like "lists nothing"
            if (lists.some((c) => !g.getElement(c).canRead())) return none('hidden')
            records.push({
                id: g.getUniqueValue(),
                users: list(g.getValue(columns.users)),
                policies: list(g.getValue(columns.policies)),
                tables: list(g.getValue(columns.tables)),
                childTables: bool(g.getValue(columns.childTables)),
            })
        }
        resolveTableNames(records)
        return { state: 'ok', records }
    } catch (e) {
        return none('unverified')
    }
}

/** The Tables list may hold table names or sys_db_object sys_ids: turn sys_ids into names. */
function resolveTableNames(records: MiacRecord[]) {
    const ids: { [id: string]: boolean } = {}
    for (const r of records) for (const t of r.tables) if (SYS_ID.test(t)) ids[t] = true
    const names: { [id: string]: string } = {}
    for (const part of chunk(Object.keys(ids), 200)) {
        const d = gr('sys_db_object')
        d.addQuery('sys_id', 'IN', part.join(','))
        d.query()
        while (d.next()) names[d.getUniqueValue()] = d.getValue('name')
    }
    for (const r of records) r.tables = r.tables.map((t) => names[t] || t)
}

function loadScopes(ctx: ApiContext, inputs: ApiInputs, hidden: string[]) {
    const s = open('sys_api_access_scope', hidden)
    if (s) {
        s.addEncodedQuery(`active=true^api_path=${ctx.api}`)
        s.query()
        while (s.next()) {
            const row: ApiScopeRow = {
                id: s.getUniqueValue(),
                active: true,
                apiPath: field(s, 'api_path'),
                version: field(s, 'version'),
                resource: field(s, 'api_resource'),
                method: field(s, 'http_method'),
                allVersions: bool(field(s, 'apply_all_versions')),
                allMethods: bool(field(s, 'apply_all_methods')),
                allResources: bool(field(s, 'apply_all_resources')),
                authScope: field(s, 'auth_scope'),
            }
            inputs.scopeRows.push(row)
        }
    }
    const ua = open('sys_auth_scope', hidden)
    if (ua) {
        ua.addQuery('name', 'useraccount')
        ua.query()
        if (ua.next()) inputs.useraccountScope = ua.getUniqueValue()
    }

    // an application the user can't read or that no longer exists can't be checked: Conditional
    let entity: OauthEntityInfo = { id: ctx.oauthEntity as string, restriction: 'restricted', scopes: [], external: true }
    const e = open('oauth_entity', hidden)
    if (e) {
        e.addQuery('sys_id', ctx.oauthEntity)
        e.query()
        if (e.next()) {
            const restriction = field(e, 'scope_restriction_status')
            entity = {
                id: e.getUniqueValue(),
                restriction: restriction === 'unrestricted' || restriction === 'useraccount' ? restriction : 'restricted',
                scopes: [],
                // providers (not clients) don't carry scopes of their own: the scope comes from the identity provider
                external: field(e, 'type') === 'oauth_provider',
            }
        }
    }
    eachIn('oauth_entity_auth_scope_mapping', 'oauth_entity', [ctx.oauthEntity as string], hidden, (m) => {
        if (m.getValue('auth_scope')) entity.scopes.push(m.getValue('auth_scope'))
    })
    inputs.entity = entity
}

function loadEndpoint(ctx: ApiContext, inputs: ApiInputs, acls: AclInfo[], hidden: string[]): RestEndpoint {
    const [namespace, ...rest] = ctx.api.split('/')
    const endpoint: RestEndpoint = { defaultAcls: [] }
    const d = open('sys_ws_definition', hidden)
    if (d) {
        d.addQuery('namespace', namespace)
        d.addQuery('service_id', rest.join('/'))
        d.query()
        if (d.next()) endpoint.defaultAcls = list(field(d, 'enforce_acl'))
    }
    if (ctx.operation) {
        const o = open('sys_ws_operation', hidden)
        if (o) {
            o.addQuery('sys_id', ctx.operation)
            o.query()
            if (o.next()) {
                const resource: RestResource = {
                    requiresAuthentication: bool(field(o, 'requires_authentication')),
                    requiresAclAuthorization: bool(field(o, 'requires_acl_authorization')),
                    requiresInternalRole: bool(field(o, 'requires_snc_internal_role')),
                    acls: list(field(o, 'enforce_acl')),
                }
                endpoint.resource = resource
            }
        }
    }
    // endpoint ACLs and their roles are read like the record ACLs (the engine's own view of the ACL table)
    const wanted: { [id: string]: boolean } = {}
    for (const id of endpoint.defaultAcls.concat(endpoint.resource ? endpoint.resource.acls : [])) if (SYS_ID.test(id)) wanted[id] = true
    const idList = Object.keys(wanted)
    for (const part of chunk(idList, 200)) {
        const a = gr('sys_security_acl')
        a.addQuery('sys_id', 'IN', part.join(','))
        a.addQuery('active', true)
        a.query()
        while (a.next()) {
            const info = aclInfoFromRow(a)
            inputs.acls[info.id] = info
            inputs.order = (inputs.order || []).concat([info.id])
            acls.push(info)
        }
        const r = gr('sys_security_acl_role')
        r.addQuery('sys_security_acl', 'IN', part.join(','))
        r.query()
        while (r.next()) {
            const acl = inputs.acls[r.getValue('sys_security_acl')]
            const role = r.getDisplayValue('sys_user_role')
            if (acl && role) acl.roles.push(role)
        }
    }
    return endpoint
}
