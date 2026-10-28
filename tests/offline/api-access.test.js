// Offline tests for the API access gate (policies, auth scopes, endpoint ACLs, fold).
// Run with: node tests/offline/run.mjs
const assert = require('assert')
const path = require('path')
const Module = require('module')
const BUILD = path.join(__dirname, '..', '..', '.test-build')

const resolve = Module._resolveFilename
Module._resolveFilename = function (req, ...rest) {
    return resolve.call(this, req.endsWith('.ts') ? req.replace(/\.ts$/, '.js') : req, ...rest)
}
const { policyLevel, policyDecision, scopeDecision, endpointDecision, evalApiGate, applyApiGate } = require(path.join(BUILD, 'engine', 'api-access.js'))

let n = 0
function test(name, fn) {
    try {
        fn()
        n++
    } catch (e) {
        console.error('FAIL api-access: ' + name + '\n  ' + e.message)
        process.exitCode = 1
    }
}

const T = 'now/table'
const RES = '/now/table/{tableName}'
function pol(extra = {}) {
    return Object.assign(
        { id: 'p', active: true, apiPath: T, version: '', resource: '', method: '', tables: [], allVersions: true, allMethods: true, allResources: true, allTables: true, global: false, profiles: ['oauth'] },
        extra
    )
}
function scopeRow(extra = {}) {
    return Object.assign({ id: 's', active: true, apiPath: T, version: '', resource: '', method: '', allVersions: true, allMethods: true, allResources: true, authScope: 'sc1' }, extra)
}
function inputs(extra = {}) {
    return Object.assign(
        {
            policies: [],
            profiles: { oauth: { id: 'oauth', active: true }, basic: { id: 'basic', active: true }, pinned: { id: 'pinned', active: true, oauthEntity: 'appA' } },
            scopeRows: [],
            useraccountScope: 'ua',
            acls: {},
        },
        extra
    )
}
const subject = (roles = [], evalAcl) => ({ hasRole: (r) => roles.includes(r), evalAcl: evalAcl || (() => ({ r: 'P', c: 'open' })) })
const ctx = (extra = {}) => Object.assign({ api: T, version: 'v1', resource: RES }, extra)

// --- policy prioritization: one test per level -------------------------------------------------
const level = (p, c = ctx(), m = 'GET') => policyLevel(p, c, 'incident', m)
test('level 1 method+resource+version', () => assert.strictEqual(level(pol({ allResources: false, resource: RES, allMethods: false, method: 'GET', allVersions: false, version: 'v1' })), 1))
test('level 2 method+resource', () => assert.strictEqual(level(pol({ allResources: false, resource: RES, allMethods: false, method: 'GET' })), 2))
test('level 3 resource+version', () => assert.strictEqual(level(pol({ allResources: false, resource: RES, allVersions: false, version: 'v1' })), 3))
test('level 4 resource', () => assert.strictEqual(level(pol({ allResources: false, resource: RES })), 4))
test('level 5 method+version', () => assert.strictEqual(level(pol({ allMethods: false, method: 'GET', allVersions: false, version: 'v1' })), 5))
test('level 6 method', () => assert.strictEqual(level(pol({ allMethods: false, method: 'GET' })), 6))
test('level 7 version / whole API', () => {
    assert.strictEqual(level(pol({ allVersions: false, version: 'v1' })), 7)
    assert.strictEqual(level(pol()), 7)
})
test('level 8 global (not all methods) only for its method', () => {
    const g = pol({ global: true, apiPath: '', allMethods: false, method: 'GET' })
    assert.strictEqual(level(g), 8)
    assert.strictEqual(level(g, ctx(), 'POST'), 0)
})
test('level 9 global (all methods)', () => assert.strictEqual(level(pol({ global: true, apiPath: '' })), 9))
test('inactive policy is ignored', () => assert.strictEqual(level(pol({ active: false })), 0))
test('other API path, other version, other method, other resource do not apply', () => {
    assert.strictEqual(level(pol({ apiPath: 'now/stats' })), 0)
    assert.strictEqual(level(pol({ allVersions: false, version: 'v2' })), 0)
    assert.strictEqual(level(pol({ allMethods: false, method: 'POST' })), 0)
    assert.strictEqual(level(pol({ allResources: false, resource: '/now/other' })), 0)
})
test('missing version in the context means latest', () => {
    assert.strictEqual(level(pol({ allVersions: false, version: 'latest' }), ctx({ version: undefined })), 7)
    assert.strictEqual(level(pol({ allVersions: false, version: 'v1' }), ctx({ version: undefined })), 0)
})
test('table policy honours the table list', () => {
    const p = pol({ allTables: false, tables: ['task'] })
    assert.strictEqual(policyLevel(p, ctx(), 'task', 'GET'), 7)
    assert.strictEqual(policyLevel(p, ctx(), 'incident', 'GET'), 0)
})

// --- policy decision ---------------------------------------------------------------------------
test('no matching policy: no restriction', () => assert.strictEqual(policyDecision(ctx(), 'incident', 'GET', inputs()), null))
test('non-global beats global', () => {
    const i = inputs({ policies: [pol({ id: 'g', global: true, apiPath: '', profiles: ['basic'] }), pol({ id: 'n', profiles: ['oauth'] })] })
    const d = policyDecision(ctx(), 'incident', 'GET', i)
    assert.strictEqual(d.id, 'n')
    assert.strictEqual(d.ok, true) // the default "any" profile finds oauth usable
})
test('chosen profile must be mapped to the winning policy', () => {
    const i = inputs({ policies: [pol({ profiles: ['oauth'] })] })
    assert.strictEqual(policyDecision(ctx({ authProfile: 'oauth' }), 'incident', 'GET', i).ok, true)
    assert.strictEqual(policyDecision(ctx({ authProfile: 'basic' }), 'incident', 'GET', i).ok, false)
})
test('more specific policy replaces a broader one', () => {
    const i = inputs({ policies: [pol({ id: 'broad', profiles: ['basic'] }), pol({ id: 'get', allMethods: false, method: 'GET', profiles: ['oauth'] })] })
    const d = policyDecision(ctx({ authProfile: 'basic' }), 'incident', 'GET', i)
    assert.strictEqual(d.id, 'get')
    assert.strictEqual(d.ok, false)
    assert.strictEqual(policyDecision(ctx({ authProfile: 'basic' }), 'incident', 'POST', i).ok, true)
})
test('tied policies combine their profiles', () => {
    const i = inputs({ policies: [pol({ id: 'a', profiles: ['oauth'] }), pol({ id: 'b', profiles: ['basic'] })] })
    assert.strictEqual(policyDecision(ctx({ authProfile: 'basic' }), 'incident', 'GET', i).ok, true)
})
test('inactive or unknown profiles are not usable; a pinned profile matches only its application', () => {
    const i = inputs({ policies: [pol({ profiles: ['pinned', 'gone'] })] })
    assert.strictEqual(policyDecision(ctx({ authProfile: 'pinned', oauthEntity: 'appA' }), 'incident', 'GET', i).ok, true)
    assert.strictEqual(policyDecision(ctx({ authProfile: 'pinned', oauthEntity: 'appB' }), 'incident', 'GET', i).ok, false)
    assert.strictEqual(policyDecision(ctx({ authProfile: 'gone' }), 'incident', 'GET', i).ok, false)
    i.profiles.pinned.active = false
    assert.strictEqual(policyDecision(ctx({ authProfile: 'pinned', oauthEntity: 'appA' }), 'incident', 'GET', i).ok, false)
})
test('policy "any" with no usable profile is blocked', () => {
    const i = inputs({ policies: [pol({ profiles: [] })] })
    assert.strictEqual(policyDecision(ctx(), 'incident', 'GET', i).ok, false)
})
test('a resource-specific policy and no resource chosen: Conditional', () => {
    const i = inputs({ policies: [pol({ id: 'api', profiles: ['oauth'] }), pol({ id: 'res', allResources: false, resource: RES, profiles: ['basic'] })] })
    const d = policyDecision(ctx({ resource: undefined, authProfile: 'oauth' }), 'incident', 'GET', i)
    assert.strictEqual(d.ok, 'C')
})

// --- scope check -------------------------------------------------------------------------------
const entity = (extra = {}) => Object.assign({ id: 'appA', restriction: 'restricted', scopes: [] }, extra)
const meths = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
test('no OAuth application: scope check does not apply', () => assert.strictEqual(scopeDecision(ctx(), meths, inputs()), null))
test('useraccount reaches every API', () => {
    const i = inputs({ entity: entity({ scopes: ['ua'] }), scopeRows: [scopeRow()] })
    assert.deepStrictEqual(scopeDecision(ctx(), meths, i), { r: 'P', why: 'useraccount' })
})
test('API scope held by the application passes; missing scope fails', () => {
    const rows = [scopeRow()]
    assert.strictEqual(scopeDecision(ctx(), meths, inputs({ entity: entity({ scopes: ['sc1'] }), scopeRows: rows })).r, 'P')
    const d = scopeDecision(ctx(), meths, inputs({ entity: entity({ scopes: ['other'] }), scopeRows: rows }))
    assert.strictEqual(d.r, 'F')
    assert.strictEqual(d.why, 'noscope')
})
test('API without a scope row: restricted refuses, unrestricted passes, useraccount-scoped is Conditional', () => {
    assert.strictEqual(scopeDecision(ctx(), meths, inputs({ entity: entity() })).why, 'unscoped')
    assert.strictEqual(scopeDecision(ctx(), meths, inputs({ entity: entity() })).r, 'F')
    assert.strictEqual(scopeDecision(ctx(), meths, inputs({ entity: entity({ restriction: 'unrestricted' }) })).r, 'P')
    assert.strictEqual(scopeDecision(ctx(), meths, inputs({ entity: entity({ restriction: 'useraccount' }) })).r, 'C')
})
test('inactive scope rows and other APIs do not count as the API being scoped', () => {
    const rows = [scopeRow({ active: false }), scopeRow({ apiPath: 'now/stats' })]
    assert.strictEqual(scopeDecision(ctx(), meths, inputs({ entity: entity({ restriction: 'unrestricted' }), scopeRows: rows })).r, 'P')
})
test('tokens from an external identity provider are Conditional', () => {
    assert.deepStrictEqual(scopeDecision(ctx(), meths, inputs({ entity: entity({ external: true }) })), { r: 'C', why: 'ext' })
})

// --- endpoint ACLs -----------------------------------------------------------------------------
const aclInfo = (id, extra = {}) => Object.assign({ id, name: id, op: 'execute', decision: 'allow', roles: [], adminOverrides: true, condition: '', hasScript: false, securityAttribute: '', appliesTo: '', description: '', scope: 'x' }, extra)
const byAcl = (m) => (a) => (m[a.id] === 'P' ? { r: 'P', c: 'role' } : m[a.id] === 'C' ? { r: 'C', c: 'cond' } : { r: 'F', c: 'norole' })
const res = (extra = {}) => Object.assign({ requiresAuthentication: true, requiresAclAuthorization: true, requiresInternalRole: false, acls: [] }, extra)
test('endpoint: one passing ACL is enough; none passing fails; conditional stays Conditional', () => {
    const i = inputs({ acls: { a: aclInfo('a'), b: aclInfo('b') } })
    const ep = { defaultAcls: [], resource: res({ acls: ['a', 'b'] }) }
    assert.strictEqual(endpointDecision(ep, i, subject([], byAcl({ a: 'F', b: 'P' }))).r, 'P')
    assert.strictEqual(endpointDecision(ep, i, subject([], byAcl({ a: 'F', b: 'F' }))).r, 'F')
    assert.strictEqual(endpointDecision(ep, i, subject([], byAcl({ a: 'F', b: 'C' }))).r, 'C')
})
test('endpoint: resource ACLs override the API default ACLs; empty falls back to them', () => {
    const i = inputs({ acls: { a: aclInfo('a'), d: aclInfo('d') } })
    const ev = subject([], byAcl({ a: 'P', d: 'F' }))
    assert.strictEqual(endpointDecision({ defaultAcls: ['d'], resource: res({ acls: ['a'] }) }, i, ev).r, 'P')
    assert.strictEqual(endpointDecision({ defaultAcls: ['d'], resource: res() }, i, ev).r, 'F')
})
test('endpoint: ACL authorization off, or no ACLs, passes; internal role required', () => {
    const i = inputs({ acls: { a: aclInfo('a') } })
    assert.strictEqual(endpointDecision({ defaultAcls: ['a'], resource: res({ requiresAclAuthorization: false }) }, i, subject([], byAcl({ a: 'F' }))).r, 'P')
    assert.strictEqual(endpointDecision({ defaultAcls: [], resource: res() }, i, subject()).r, 'P')
    assert.strictEqual(endpointDecision({ defaultAcls: [], resource: res({ requiresInternalRole: true }) }, i, subject([])).r, 'F')
    assert.strictEqual(endpointDecision({ defaultAcls: [], resource: res({ requiresInternalRole: true }) }, i, subject(['snc_internal'])).r, 'P')
})

// --- the gate and the fold ---------------------------------------------------------------------
const OPS = ['create', 'read', 'write', 'delete']
test('gate: web-service access off denies every operation (Table API only)', () => {
    const g = evalApiGate(ctx(), 'incident', false, OPS, inputs(), subject())
    assert.strictEqual(g.s, 'D')
    assert.strictEqual(g.ws, false)
    assert.deepStrictEqual(g.why, ['wsoff'])
})
test('gate: open policy and scope pass', () => {
    const g = evalApiGate(ctx({ oauthEntity: 'appA', authProfile: 'oauth' }), 'incident', true, OPS, inputs({ entity: entity({ scopes: ['ua'] }), policies: [pol()] }), subject())
    assert.strictEqual(g.s, 'G')
    assert.deepStrictEqual(g.why, [])
})
test('gate: a method-specific policy blocks only that operation', () => {
    const i = inputs({ policies: [pol({ allMethods: false, method: 'DELETE', profiles: ['oauth'] })] })
    const g = evalApiGate(ctx({ authProfile: 'basic' }), 'incident', true, OPS, i, subject())
    assert.strictEqual(g.s, 'D')
    assert.deepStrictEqual(g.ops, { create: 'G', read: 'G', write: 'G' })
    assert.deepStrictEqual(g.why, ['authblocked'])
    assert.strictEqual(g.pol.delete.ok, false)
})
test('gate: write is as strict as its strictest method', () => {
    const i = inputs({ policies: [pol({ id: 'put', allMethods: false, method: 'PUT', profiles: ['oauth'] })] })
    const g = evalApiGate(ctx({ authProfile: 'basic' }), 'incident', true, ['write'], i, subject())
    assert.strictEqual(g.s, 'D')
})
test('gate: scripted REST API checks scope and endpoint ACLs, not ws_access', () => {
    const i = inputs({
        entity: entity({ scopes: ['sc1'] }),
        scopeRows: [scopeRow({ apiPath: 'x/api' })],
        acls: { a: aclInfo('a') },
        endpoint: { defaultAcls: ['a'], resource: res() },
    })
    const g = evalApiGate({ api: 'x/api', version: 'v1' }, 'incident', false, OPS, i, subject([], byAcl({ a: 'F' })))
    assert.strictEqual(g.ws, undefined)
    assert.strictEqual(g.s, 'D')
    assert.deepStrictEqual(g.why, ['endpoint'])
    assert.strictEqual(g.ep.length, 1)
})
test('gate: an unscoped API for a restricted application is denied with its reason', () => {
    const g = evalApiGate(ctx({ oauthEntity: 'appA' }), 'incident', true, OPS, inputs({ entity: entity() }), subject())
    assert.strictEqual(g.s, 'D')
    assert.deepStrictEqual(g.why, ['unscoped'])
})

const cell = (s) => ({ s, lvl: 'x', a: [] })
test('fold: a denying gate makes the operation Denied and keeps the ACL-only status', () => {
    const cells = { read: cell('G'), write: cell('C'), delete: cell('N'), create: cell('D') }
    applyApiGate(cells, { s: 'D', why: ['wsoff'] })
    assert.strictEqual(cells.read.s, 'D')
    assert.strictEqual(cells.read.acl, 'G')
    assert.strictEqual(cells.read.api, 'D')
    assert.strictEqual(cells.write.acl, 'C')
    assert.strictEqual(cells.delete.s, 'D')
    assert.strictEqual(cells.create.api, undefined) // already denied: nothing to explain
})
test('fold: a conditional gate turns Granted into Conditional only', () => {
    const cells = { read: cell('G'), write: cell('C'), delete: cell('D'), create: cell('N') }
    applyApiGate(cells, { s: 'C', why: ['ext'] })
    assert.strictEqual(cells.read.s, 'C')
    assert.strictEqual(cells.read.acl, 'G')
    assert.strictEqual(cells.write.s, 'C')
    assert.strictEqual(cells.write.api, 'C')
    assert.strictEqual(cells.delete.s, 'D')
    assert.strictEqual(cells.delete.api, undefined)
    assert.strictEqual(cells.create.s, 'N')
})
test('fold: a passing gate, no gate (old runs) and non-REST operations change nothing', () => {
    const cells = { read: cell('G'), list_edit: cell('G') }
    applyApiGate(cells, { s: 'G', why: [] })
    applyApiGate(cells, undefined)
    assert.strictEqual(cells.read.s, 'G')
    applyApiGate(cells, { s: 'D', why: ['wsoff'] })
    assert.strictEqual(cells.list_edit.s, 'G')
    assert.strictEqual(cells.read.s, 'D')
})
test('fold: per-operation gate status wins over the table status', () => {
    const cells = { read: cell('G'), delete: cell('G') }
    applyApiGate(cells, { s: 'D', ops: { read: 'G' }, why: ['authblocked'] })
    assert.strictEqual(cells.read.s, 'G')
    assert.strictEqual(cells.delete.s, 'D')
})

test('endpoint: no resource chosen keeps the default ACL result Conditional unless it fails', () => {
    const i = inputs({ acls: { a: aclInfo('a') } })
    const ep = { defaultAcls: ['a'] }
    assert.strictEqual(endpointDecision(ep, i, subject([], byAcl({ a: 'P' }))).r, 'C')
    assert.strictEqual(endpointDecision(ep, i, subject([], byAcl({ a: 'F' }))).r, 'F')
    assert.strictEqual(endpointDecision({ defaultAcls: [] }, i, subject()).r, 'P')
})
test('endpoint: outcomes index the shared ACL order when the loader provides one', () => {
    const i = inputs({ acls: { a: aclInfo('a'), b: aclInfo('b') }, order: ['b', 'a'] })
    const d = endpointDecision({ defaultAcls: ['a'], resource: res() }, i, subject([], byAcl({ a: 'P' })))
    assert.strictEqual(d.out[0].i, 1)
})
test('gate: configuration the user cannot read makes the gate Conditional, never a pass', () => {
    const g = evalApiGate(ctx(), 'incident', true, OPS, inputs({ hidden: ['sys_api_access_policy'] }), subject())
    assert.strictEqual(g.s, 'C')
    assert.deepStrictEqual(g.why, ['hidden'])
})
test('gate: hidden configuration does not soften a denial', () => {
    const g = evalApiGate(ctx(), 'incident', false, OPS, inputs({ hidden: ['oauth_entity'] }), subject())
    assert.strictEqual(g.s, 'D')
})

const { accountWarning } = require(path.join(BUILD, 'engine', 'account.js'))
test('account warning says what the API run evaluated', () => {
    const s = { type: 'user', label: 'svc', account: { identity: 'machine', identityLabel: 'Machine', webServiceOnly: false, integrationUser: false } }
    const plain = accountWarning(s)
    const withApi = accountWarning(s, { api: 'now/table' })
    assert.ok(plain.includes('are not evaluated'))
    assert.ok(withApi.includes('now/table') && !withApi.includes('are not evaluated'))
    assert.strictEqual(accountWarning({ type: 'user', label: 'h', account: { identity: 'human', identityLabel: '', webServiceOnly: false, integrationUser: false } }, { api: 'now/table' }), '')
})

console.log('api-access tests: ' + n + ' passed')
