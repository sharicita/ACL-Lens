import { AclInfo, AclOutcome, AclResult, ApiContext, ApiGate, ApiReason, Cell, Op, Reason, Status } from './types.ts'

// Static evaluation of the controls that sit in front of record ACLs when a request arrives through
// a REST API: REST API access policies, OAuth auth scopes, Scripted REST endpoint ACLs and the
// table's web-service switch. Pure logic: the loader that fills the inputs comes separately.

/** Path of the built-in Table API (a processor, not a Scripted REST API). */
export const TABLE_API_PATH = 'now/table'

/** REST methods a record operation uses; an operation with several is as strict as its strictest method. */
export const OP_METHODS: { [op: string]: string[] } = {
    read: ['GET'],
    create: ['POST'],
    write: ['PUT', 'PATCH'],
    delete: ['DELETE'],
}

export interface AccessPolicy {
    id: string
    active: boolean
    /** namespace/service_id, or a fixed path such as now/table */
    apiPath: string
    version: string
    resource: string
    method: string
    tables: string[]
    allVersions: boolean
    allMethods: boolean
    allResources: boolean
    allTables: boolean
    global: boolean
    /** inbound_auth_profile sys_ids this policy allows */
    profiles: string[]
}

export interface InboundProfile {
    id: string
    active: boolean
    /** std_http_auth.oauth_entity: a pinned profile only matches that OAuth application */
    oauthEntity?: string
}

export interface ApiScopeRow {
    id: string
    active: boolean
    apiPath: string
    version: string
    resource: string
    method: string
    allVersions: boolean
    allMethods: boolean
    allResources: boolean
    /** sys_auth_scope sys_id */
    authScope: string
}

export interface OauthEntityInfo {
    id: string
    /** scope_restriction_status */
    restriction: 'unrestricted' | 'useraccount' | 'restricted'
    /** sys_auth_scope sys_ids held through oauth_entity_auth_scope_mapping */
    scopes: string[]
    /** a token issued by an external identity provider: the scope comes from that provider */
    external?: boolean
}

export interface RestResource {
    requiresAuthentication: boolean
    requiresAclAuthorization: boolean
    requiresInternalRole: boolean
    /** sys_ws_operation.enforce_acl; empty falls back to the API's default ACLs */
    acls: string[]
}

/** The Scripted REST API and resource the run is evaluated against (not used for the Table API). */
export interface RestEndpoint {
    defaultAcls: string[]
    resource?: RestResource
}

export interface ApiInputs {
    policies: AccessPolicy[]
    profiles: { [id: string]: InboundProfile }
    scopeRows: ApiScopeRow[]
    /** sys_auth_scope sys_id of `useraccount` ('' when the release has none) */
    useraccountScope: string
    entity?: OauthEntityInfo
    endpoint?: RestEndpoint
    /** REST_Endpoint ACLs by sys_id */
    acls: { [id: string]: AclInfo }
    /** sys_ids in the order of AnalysisResult.apiAcls (gate outcomes index into it) */
    order?: string[]
    /** API configuration tables the signed-in user can't read: the gate can't be fully evaluated */
    hidden?: string[]
    /** Machine Identity Access Control records; absent means the check is not part of this evaluation */
    miac?: MiacInputs
}

/** One Machine Identity Access Control record: which users may use which policies and tables. */
export interface MiacRecord {
    id: string
    /** sys_user sys_ids */
    users: string[]
    /** sys_api_access_policy sys_ids */
    policies: string[]
    /** table names */
    tables: string[]
    /** "Applies to child tables": a listed table also covers the tables that extend it */
    childTables: boolean
}

export interface MiacInputs {
    /**
     * ok         - the records were read
     * absent     - the table doesn't exist on this instance
     * hidden     - the signed-in user can't read the records
     * unverified - the table's columns aren't the ones expected, so the records can't be trusted
     */
    state: 'ok' | 'absent' | 'hidden' | 'unverified'
    records: MiacRecord[]
}

export interface ApiSubject {
    /** how the subject fares against one ACL (the engine's Evaluator.evalAcl) */
    evalAcl(acl: AclInfo): { r: AclResult; c: Reason }
    hasRole(role: string): boolean
    /** sys_user sys_id; empty for role and group subjects, which MIAC records don't name */
    userId?: string
    /** a machine, AI agent, web-service-only or integration account */
    nonHuman?: boolean
}

const API_PATH = /^[A-Za-z0-9_\-./]{1,120}$/
const SYS_ID = /^[0-9a-f]{32}$/
const SHORT_TEXT = /^[A-Za-z0-9_\-. {}/]{0,200}$/

/**
 * Cleans the API context a client sends with a run. Returns undefined when no API was chosen and
 * throws for values that could not be valid, so nothing unchecked reaches a query.
 */
export function normalizeApiContext(x: any): ApiContext | undefined {
    if (!x || typeof x !== 'object' || !x.api) return undefined
    const text = (v: any) => (v === undefined || v === null ? '' : String(v).trim())
    const api = text(x.api).replace(/^\/?(api\/)?/, '')
    if (!API_PATH.test(api)) throw new Error('Choose a valid API')
    const out: ApiContext = { api }
    const profile = text(x.authProfile)
    if (profile) {
        if (profile !== 'any' && !SYS_ID.test(profile)) throw new Error('Choose a valid authentication method')
        out.authProfile = profile
    }
    for (const key of ['oauthEntity', 'operation'] as const) {
        const v = text(x[key])
        if (!v) continue
        if (!SYS_ID.test(v)) throw new Error(key === 'oauthEntity' ? 'Choose a valid OAuth application' : 'Choose a valid REST resource')
        out[key] = v
    }
    for (const key of ['version', 'resource'] as const) {
        const v = text(x[key])
        if (!v) continue
        if (!SHORT_TEXT.test(v)) throw new Error(`The ${key} contains characters that are not allowed`)
        out[key] = v
    }
    if (api === TABLE_API_PATH && !out.resource) out.resource = '/now/table/{tableName}'
    if (x.names && typeof x.names === 'object') {
        const names: { [key: string]: string } = {}
        for (const key of ['api', 'authProfile', 'oauthEntity', 'operation']) {
            const v = text(x.names[key]).replace(/[\r\n]/g, ' ').substring(0, 100)
            if (v) names[key] = v
        }
        if (Object.keys(names).length) out.names = names
    }
    return out
}

const normVersion = (v: string | undefined) => v || 'latest'

/**
 * Specificity of an access policy for a request, 1 (most specific) to 9, or 0 when it does not apply.
 * Order from the platform docs: method+resource+version, method+resource, resource+version, resource,
 * method+version, method, version, global (not all methods), global (all methods). A non-global policy
 * always beats a global one. A policy covering the whole API (all versions, methods and resources) has
 * no tier of its own in the docs; it ranks with the version tier (7). To confirm in Phase 4.
 */
export function policyLevel(p: AccessPolicy, ctx: ApiContext, table: string, method: string): number {
    if (!p.active) return 0
    if (p.global) return p.allMethods ? 9 : p.method === method ? 8 : 0
    if (p.apiPath !== ctx.api) return 0
    if (ctx.api === TABLE_API_PATH && !p.allTables && p.tables.indexOf(table) < 0) return 0
    if (!p.allVersions && p.version !== normVersion(ctx.version)) return 0
    if (!p.allMethods && p.method !== method) return 0
    if (!p.allResources && (!ctx.resource || p.resource !== ctx.resource)) return 0
    const byResource = !p.allResources
    const byMethod = !p.allMethods
    const byVersion = !p.allVersions
    if (byResource) return byMethod ? (byVersion ? 1 : 2) : byVersion ? 3 : 4
    if (byMethod) return byVersion ? 5 : 6
    return 7
}

/** Resource-specific policies that could apply if the run named a resource. */
function resourcePending(p: AccessPolicy, ctx: ApiContext, method: string): boolean {
    return p.active && !p.global && p.apiPath === ctx.api && !p.allResources && !ctx.resource && (p.allMethods || p.method === method)
}

export interface PolicyDecision {
    id: string
    ok: boolean | 'C'
    lvl: number
}

/**
 * Whether the chosen authentication method is allowed for one request. No matching policy means no
 * restriction. When several policies tie, the profiles they allow are combined.
 */
export function policyDecision(ctx: ApiContext, table: string, method: string, inputs: ApiInputs): PolicyDecision | null {
    let best = 0
    let winners: AccessPolicy[] = []
    let pending = false
    for (const p of inputs.policies) {
        const lvl = policyLevel(p, ctx, table, method)
        if (!lvl) {
            if (resourcePending(p, ctx, method)) pending = true
            continue
        }
        if (!best || lvl < best) {
            best = lvl
            winners = [p]
        } else if (lvl === best) winners.push(p)
    }
    if (!best) return null
    const allowed: { [id: string]: boolean } = {}
    for (const p of winners) for (const id of p.profiles) allowed[id] = true
    const usable = (id: string) => {
        const prof = inputs.profiles[id]
        if (!prof || !prof.active) return false
        return !prof.oauthEntity || !ctx.oauthEntity || prof.oauthEntity === ctx.oauthEntity
    }
    const ids = Object.keys(allowed).filter(usable)
    const chosen = ctx.authProfile || 'any'
    let ok: boolean | 'C' = chosen === 'any' ? ids.length > 0 : ids.indexOf(chosen) >= 0
    if (ok === true && pending) ok = 'C'
    return { id: winners[0].id, ok, lvl: best }
}

function scopeRowApplies(r: ApiScopeRow, ctx: ApiContext, methods: string[]): boolean {
    if (!r.active || r.apiPath !== ctx.api) return false
    if (!r.allVersions && r.version !== normVersion(ctx.version)) return false
    if (!r.allMethods && methods.indexOf(r.method) < 0) return false
    if (!r.allResources && (!ctx.resource || r.resource !== ctx.resource)) return false
    return true
}

export interface ScopeDecision {
    r: 'P' | 'F' | 'C'
    why: ApiReason | 'scope' | ''
    id?: string
}

/**
 * OAuth auth scope check. An API is restricted only when it has a REST API Auth Scope record; the
 * OAuth application must hold one of those scopes. `useraccount` reaches every API. Returns null
 * when no OAuth application was chosen (the scope check doesn't apply).
 */
export function scopeDecision(ctx: ApiContext, methods: string[], inputs: ApiInputs): ScopeDecision | null {
    const e = inputs.entity
    if (!e) return null
    if (e.external) return { r: 'C', why: 'ext' }
    if (inputs.useraccountScope && e.scopes.indexOf(inputs.useraccountScope) >= 0) return { r: 'P', why: 'useraccount' }
    const rows = inputs.scopeRows.filter((r) => scopeRowApplies(r, ctx, methods))
    if (!rows.length) {
        // not yet confirmed on an instance for 'useraccount': Conditional until Phase 4 settles it
        if (e.restriction === 'restricted') return { r: 'F', why: 'unscoped' }
        return e.restriction === 'useraccount' ? { r: 'C', why: 'unscoped' } : { r: 'P', why: '' }
    }
    const hit = rows.find((r) => e.scopes.indexOf(r.authScope) >= 0)
    return hit ? { r: 'P', why: 'scope', id: hit.id } : { r: 'F', why: 'noscope', id: rows[0].id }
}

export interface EndpointDecision {
    r: 'P' | 'F' | 'C'
    /** outcomes of the endpoint ACLs, indexed into `acls` */
    out: AclOutcome[]
    acls: AclInfo[]
}

/**
 * Scripted REST checks: the caller needs ONE of the resource's ACLs (the API's default ACLs when the
 * resource lists none), plus an internal role when the resource asks for one.
 */
export function endpointDecision(endpoint: RestEndpoint, inputs: ApiInputs, subject: ApiSubject): EndpointDecision {
    const res = endpoint.resource
    const none: EndpointDecision = { r: 'P', out: [], acls: [] }
    if (res && res.requiresInternalRole && !subject.hasRole('snc_internal')) return { r: 'F', out: [], acls: [] }
    if (res && !res.requiresAclAuthorization) return none
    const ids = (res && res.acls.length ? res.acls : endpoint.defaultAcls).filter((id) => !!inputs.acls[id] && inputs.acls[id].decision === 'allow')
    if (!ids.length) return none
    const acls = ids.map((id) => inputs.acls[id])
    const out = acls.map((a, n) => {
        const e = subject.evalAcl(a)
        const pos = inputs.order ? inputs.order.indexOf(a.id) : -1
        return { i: pos >= 0 ? pos : n, r: e.r, c: e.c }
    })
    const r = out.some((o) => o.r === 'P') ? 'P' : out.some((o) => o.r === 'C') ? 'C' : 'F'
    // no resource chosen: the resource's own ACLs or flags may still narrow the API's default ACLs
    return { r: !res && r !== 'F' ? 'C' : r, out, acls }
}

export interface MiacColumns {
    users: string
    policies: string
    tables: string
    childTables: string
}

/**
 * Finds the MIAC columns by their form labels. The column names haven't been confirmed on an instance,
 * so they aren't assumed. Returns null unless each label matches exactly one column on the table itself,
 * which is also the result when users or policies are held in a separate many-to-many table.
 */
export function matchMiacColumns(elements: { name: string; label: string }[]): MiacColumns | null {
    const own = elements.filter((e) => e.name.indexOf('sys_') !== 0)
    const one = (label: RegExp): string => {
        const hits = own.filter((e) => label.test(e.label))
        return hits.length === 1 ? hits[0].name : ''
    }
    const users = one(/^users?$/i)
    const policies = one(/polic/i)
    const tables = one(/^tables?$/i)
    const childTables = one(/child/i)
    return users && policies && tables && childTables ? { users, policies, tables, childTables } : null
}

export interface MiacDecision {
    r: 'P' | 'F' | 'C'
    why?: ApiReason
}

/** One MIAC record against one request: the table must be listed and a referenced policy must cover it. */
function miacRecordDecision(rec: MiacRecord, ctx: ApiContext, chain: string[], method: string, inputs: ApiInputs): MiacDecision {
    if (ctx.api === TABLE_API_PATH) {
        const table = chain[0]
        const names = rec.childTables ? chain : [table]
        if (!names.some((n) => rec.tables.indexOf(n) >= 0)) return { r: 'F', why: 'miactable' }
    }
    const referenced = inputs.policies.filter((p) => rec.policies.indexOf(p.id) >= 0)
    if (referenced.some((p) => policyLevel(p, ctx, chain[0], method) > 0)) return { r: 'P' }
    if (referenced.some((p) => resourcePending(p, ctx, method))) return { r: 'C', why: 'ext' }
    // the referenced policy may exist but be unreadable: that is not the same as not covered
    if (inputs.hidden && inputs.hidden.indexOf('sys_api_access_policy') >= 0) return { r: 'C', why: 'miacunknown' }
    return { r: 'F', why: 'miacpolicy' }
}

/**
 * The MIAC check for one request. `chain` is the table followed by its parents.
 *
 * Observed on an instance: a MIAC refuses every API and table it doesn't list, whatever the roles, and
 * a listed table that its referenced policies don't cover is still refused. Not confirmed, so reported
 * as Conditional: whether a machine account with no MIAC at all is refused, and how several records
 * naming one user combine. Returns null when the check says nothing about this subject: role and group
 * subjects, and human accounts no record names.
 */
export function miacDecision(ctx: ApiContext, chain: string[], method: string, inputs: ApiInputs, subject: ApiSubject): MiacDecision | null {
    const miac = inputs.miac
    const userId = subject.userId
    if (!miac || !userId) return null
    const named = miac.state === 'ok' ? miac.records.filter((r) => r.users.indexOf(userId) >= 0) : []
    if (!named.length) {
        if (!subject.nonHuman) return null
        return { r: 'C', why: miac.state === 'ok' ? 'miacnone' : 'miacunknown' }
    }
    const results = named.map((r) => miacRecordDecision(r, ctx, chain, method, inputs))
    const failed = results.filter((d) => d.r === 'F')
    if (failed.length === results.length) return failed[0]
    if (failed.length) return { r: 'C', why: 'miacmulti' }
    return results.find((d) => d.r === 'C') || { r: 'P' }
}

const worst = (a: Status, b: Status): Status => (a === 'D' || b === 'D' ? 'D' : a === 'C' || b === 'C' ? 'C' : 'G')
const fromR = (r: 'P' | 'F' | 'C'): Status => (r === 'F' ? 'D' : r === 'C' ? 'C' : 'G')

/**
 * The API gate for one table. `wsAccess` is sys_db_object.ws_access (Table API only). `inputs.endpoint`
 * is set for Scripted REST APIs. Operations are evaluated by the REST method(s) they use. `chain` is the
 * table followed by its parents (used for MIAC's "Applies to child tables").
 */
export function evalApiGate(ctx: ApiContext, table: string, wsAccess: boolean, ops: Op[], inputs: ApiInputs, subject: ApiSubject, chain: string[] = [table]): ApiGate {
    const why: ApiReason[] = []
    const add = (w: ApiReason) => {
        if (why.indexOf(w) < 0) why.push(w)
    }
    const isTable = ctx.api === TABLE_API_PATH
    const gate: ApiGate = { s: 'G', why }
    let base: Status = 'G'

    if (isTable) {
        gate.ws = wsAccess
        if (!wsAccess) {
            base = 'D'
            add('wsoff')
        }
    }

    if (inputs.hidden && inputs.hidden.length) {
        base = worst(base, 'C')
        add('hidden')
    }

    const methodsAll = OP_METHODS.read.concat(OP_METHODS.create, OP_METHODS.write, OP_METHODS.delete)
    const sc = scopeDecision(ctx, methodsAll, inputs)
    if (sc) {
        gate.scope = sc
        base = worst(base, fromR(sc.r))
        if (sc.r !== 'P' && sc.why && sc.why !== 'scope') add(sc.why)
    }

    if (inputs.endpoint) {
        const ep = endpointDecision(inputs.endpoint, inputs, subject)
        if (ep.out.length) gate.ep = ep.out
        base = worst(base, fromR(ep.r))
        if (ep.r !== 'P') add('endpoint')
    }

    const perOp: { [op: string]: Status } = {}
    const pol: { [op: string]: PolicyDecision } = {}
    for (const op of ops) {
        const methods = OP_METHODS[op]
        if (!methods) continue
        let s: Status = base
        for (const m of methods) {
            const d = policyDecision(ctx, table, m, inputs)
            if (!d) continue
            pol[op] = pol[op] && pol[op].ok === false ? pol[op] : d
            if (d.ok === false) {
                s = worst(s, 'D')
                add('authblocked')
            } else if (d.ok === 'C') {
                s = worst(s, 'C')
                add('ext')
            }
        }
        for (const m of methods) {
            const d = miacDecision(ctx, chain, m, inputs, subject)
            if (!d || d.r === 'P') continue
            s = worst(s, fromR(d.r))
            if (d.why) add(d.why)
        }
        perOp[op] = s
    }
    const statuses = Object.keys(perOp).map((k) => perOp[k])
    gate.s = statuses.reduce((a, b) => worst(a, b), base)
    for (const op in perOp) if (perOp[op] !== gate.s) (gate.ops = gate.ops || {})[op] = perOp[op]
    if (Object.keys(pol).length) gate.pol = pol
    return gate
}

/**
 * Folds the API gate into table operation cells (after the data filters). A denying gate makes the
 * operation Denied whatever the record ACLs say; a conditional gate turns Granted into Conditional.
 * The ACL-only status is kept in `acl`. Operations the gate has no REST method for are left alone.
 */
export function applyApiGate(cells: { [op: string]: Cell }, gate: ApiGate | undefined) {
    if (!gate) return
    for (const op in cells) {
        if (!OP_METHODS[op]) continue
        const s = (gate.ops && gate.ops[op]) || gate.s
        if (s === 'G') continue
        const cell = cells[op]
        if (s === 'D') {
            if (cell.s === 'D') continue
            cell.acl = cell.acl || cell.s
            cell.api = 'D'
            cell.s = 'D'
        } else if (cell.s === 'G' || cell.s === 'C') {
            cell.api = 'C'
            if (cell.s === 'G') {
                cell.acl = cell.acl || 'G'
                cell.s = 'C'
            }
        } else if (cell.s === 'N') {
            cell.api = 'C'
        }
    }
}
