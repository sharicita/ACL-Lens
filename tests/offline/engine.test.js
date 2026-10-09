// Offline tests for the ACL evaluator and comparison script (no ServiceNow needed).
// Run with: node tests/offline/run.mjs
const assert = require('assert')
const path = require('path')
const Module = require('module')
const BUILD = path.join(__dirname, '..', '..', '.test-build')

// server modules import each other as './x.ts'; the compiled files are './x.js'
const resolve = Module._resolveFilename
Module._resolveFilename = function (req, ...rest) {
    return resolve.call(this, req.endsWith('.ts') ? req.replace(/\.ts$/, '.js') : req, ...rest)
}
const { Evaluator } = require(path.join(BUILD, 'engine', 'evaluator.js'))
const { compare, drift } = require(path.join(BUILD, 'engine', 'compare.js'))

function acl(name, op, extra = {}) {
    return Object.assign({ id: name + op, name, op, decision: 'allow', roles: [], adminOverrides: false, condition: '', hasScript: false, securityAttribute: '', appliesTo: '', description: '', scope: 'global' }, extra)
}
function index(acls) {
    const byKey = {}
    acls.forEach((a, i) => (byKey[a.name + '|' + a.op] = (byKey[a.name + '|' + a.op] || []).concat([i])))
    return { acls, find: (n, op) => byKey[n + '|' + op] || [] }
}
function subj(roles, extra = {}) {
    return Object.assign({ type: 'user', id: 'u', key: 'user:' + roles.join(','), label: roles.join(','), sub: '', active: true, isAdmin: roles.includes('admin'), roles, roleSources: [] }, extra)
}

const idx = index([
    acl('task', 'read', { roles: ['itil'] }),
    acl('incident', 'write', { roles: ['itil'], condition: 'active=true' }),
    acl('incident', 'write', { roles: ['incident_manager'] }),
    acl('incident', 'read', { decision: 'deny', roles: ['snc_internal'] }),
    acl('*', 'delete', { roles: ['admin'], adminOverrides: true }),
    acl('incident.priority', 'write', { roles: ['incident_manager'] }),
    acl('task.*', 'write', { roles: ['itil'] }),
    acl('*.*', 'read'),
    acl('secret', 'read', { roles: ['security_admin'] }),
    acl('scripty', 'read', { roles: ['itil'], hasScript: true }),
    acl('attr', 'read', { securityAttribute: 'UserIsAuthenticated' }),
    acl('nobody', 'read', { securityAttribute: 'HasNobodyRole', roles: ['itil'] }),
    acl('kb', 'read', { roles: ['public'], hasScript: true }),
])
const elevated = { security_admin: true }
const chain = ['incident', 'task']

const itil = new Evaluator(idx, subj(['itil', 'snc_internal']), elevated)
const im = new Evaluator(idx, subj(['incident_manager', 'snc_internal']), elevated)
const noInternal = new Evaluator(idx, subj(['itil']), elevated)
const admin = new Evaluator(idx, subj(['admin', 'snc_internal']), elevated)
const secAdmin = new Evaluator(idx, subj(['security_admin']), elevated)

// table read: incident has no allow read -> inherits task (itil). deny-unless requires snc_internal
assert.equal(itil.evalLevels(itil.tableLevels(chain), 'read').s, 'G')
assert.equal(itil.evalLevels(itil.tableLevels(chain), 'read').lvl, 'task')
assert.equal(noInternal.evalLevels(noInternal.tableLevels(chain), 'read').s, 'D', 'deny-unless blocks')
assert.equal(im.evalLevels(im.tableLevels(chain), 'read').s, 'D', 'no itil -> task read fails')
// write: incident level matched (2 ACLs). itil has condition -> C; incident_manager -> G
assert.equal(itil.evalLevels(itil.tableLevels(chain), 'write').s, 'C')
assert.equal(im.evalLevels(im.tableLevels(chain), 'write').s, 'G')
// delete: falls to * ; admin overrides
assert.equal(admin.evalLevels(admin.tableLevels(chain), 'delete').s, 'G')
assert.equal(itil.evalLevels(itil.tableLevels(chain), 'delete').s, 'D')
// create: nothing matches -> N
assert.equal(itil.evalLevels(itil.tableLevels(chain), 'create').s, 'N')
// admin implicitly satisfies itil role on task read
assert.equal(admin.evalLevels(admin.tableLevels(chain), 'read').s, 'G')
// fields
assert.equal(im.evalLevels(im.fieldLevels(chain, 'priority'), 'write').s, 'G')
assert.equal(itil.evalLevels(itil.fieldLevels(chain, 'priority'), 'write').s, 'D', 'explicit field rule wins over task.*')
assert.equal(itil.evalLevels(itil.fieldLevels(chain, 'short_description'), 'write').s, 'G', 'task.* applies')
assert.equal(itil.evalLevels(itil.fieldLevels(chain, 'short_description'), 'write').lvl, 'task.*')
assert.equal(itil.evalLevels(itil.fieldLevels(chain, 'x'), 'read').s, 'G', '*.* open')
// elevated role
assert.equal(secAdmin.evalLevels(['secret'], 'read').s, 'C')
assert.equal(admin.evalLevels(['secret'], 'read').s, 'D', 'admin does not implicitly hold elevated roles')
// script / attribute
assert.equal(itil.evalLevels(['scripty'], 'read').s, 'C')
assert.equal(im.evalLevels(['attr'], 'read').s, 'G')
assert.equal(itil.evalLevels(['nobody'], 'read').s, 'D')

// "public" is held implicitly by everyone (regression: kb_knowledge read showed Denied)
assert.equal(im.evalLevels(['kb'], 'read').s, 'C')

// comparison
function result(subjects) {
    return {
        defaultDeny: true,
        subjects: subjects.map((ev, n) => ({
            subject: ev.subject,
            counts: { create: { G: 0, C: 0, D: 0, N: 1 }, read: { G: 1, C: 0, D: 0, N: 0 }, write: { G: 0, C: 1, D: 0, N: 0 }, delete: { G: 0, C: 0, D: 1, N: 0 } },
            tables: [{ t: 'incident', l: 'Incident', ops: Object.fromEntries(['create', 'read', 'write', 'delete'].map((op) => [op, ev.evalLevels(ev.tableLevels(chain), op)])), fields: [{ f: 'priority', ops: Object.fromEntries(['create', 'read', 'write'].map((op) => [op, ev.evalLevels(ev.fieldLevels(chain, 'priority'), op)])) }] }],
        })),
    }
}
const r = result([itil, im])
const c = compare(r)
assert.equal(c.summary.tablesDifferent, 1)
assert.equal(c.summary.tableCellsDifferent, 2, 'read + write differ')
assert.equal(c.summary.fieldCellsDifferent, 1, 'only priority write differs')
assert.equal(c.pairs[0].aMore + c.pairs[0].bMore + c.pairs[0].same, 4)
const d = drift(result([itil]), result([itil]))
assert.equal(d.total, 0)
console.log('engine: all tests passed')
