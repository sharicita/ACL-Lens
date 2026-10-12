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
const { Evaluator, applyDataFilters } = require(path.join(BUILD, 'engine', 'evaluator.js'))
const { accountWarning } = require(path.join(BUILD, 'engine', 'account.js'))
const { compare, drift } = require(path.join(BUILD, 'engine', 'compare.js'))
const { parseCondition, evalAttribute, evalDataFilter, scriptIsEmpty } = require(path.join(BUILD, 'engine', 'attributes.js'))

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

// security attributes: compound role conditions resolve exactly
const ROLE_IDS = { a1: 'maint', b2: 'udc_admin', c3: 'itil' }
const attr = (name, cond, script = '') => {
    const groups = parseCondition(cond, ROLE_IDS)
    const known = groups.length > 0 && groups.every((g) => g.every((t) => t.kind !== 'unknown') || g.some((t) => t.kind === 'loggedin' && !t.negate))
    return { name, groups, resolvable: known && scriptIsEmpty(script) }
}
const HasMaint = attr('HasMaint', 'Role=a1')
const HasEither = attr('HasEither', 'Role=a1^ORRole=c3')
const Both = attr('Both', 'Role=a1^Role=c3')
const Authn = attr('Authn', 'LoggedIn=true^ORAllowUnauthRolelessAcl=true')
const Odd = attr('Odd', 'department=x')
assert.ok(scriptIsEmpty("/** \n * Using 'current' in the script is not allowed. \n*/"))
assert.ok(!scriptIsEmpty('/* x */ answer = true'))
assert.equal(evalAttribute(HasMaint, { maint: true }), 'P')
assert.equal(evalAttribute(HasMaint, { admin: true }), 'F', 'attributes check roles literally')
assert.equal(evalAttribute(HasEither, { itil: true }), 'P')
assert.equal(evalAttribute(Both, { itil: true }), 'F')
assert.equal(evalAttribute(Both, { itil: true, maint: true }), 'P')
assert.equal(evalAttribute(Authn, {}), 'P')
assert.equal(evalAttribute(Odd, { itil: true }), 'C')
assert.equal(evalAttribute(attr('Gone', 'Role=zz^ORRole=a1'), { maint: true }), 'P')
assert.equal(evalAttribute(attr('Gone', 'Role=zz'), { itil: true }), 'F', 'a missing role is never held')
assert.equal(evalAttribute(undefined, {}), 'C')
assert.equal(evalAttribute(attr('Scripted', 'Role=a1', 'answer = gs.hasRole("x")'), { maint: true }), 'C')

// ACLs that use a resolvable attribute are no longer Conditional
const idx2 = index([acl('cat', 'read', { securityAttribute: 'HasMaint' }), acl('cat', 'report_on', { roles: ['itil'] })])
const maintEv = new Evaluator(idx2, subj(['maint']), {}, { HasMaint })
const itilEv = new Evaluator(idx2, subj(['itil']), {}, { HasMaint })
assert.equal(maintEv.evalLevels(['cat'], 'read').s, 'G')
assert.equal(itilEv.evalLevels(['cat'], 'read').s, 'D')
// extra operations evaluate like the core ones
assert.equal(itilEv.evalLevels(['cat', '*'], 'report_on').s, 'G')
assert.equal(maintEv.evalLevels(['cat', '*'], 'report_on').s, 'D')
assert.equal(itilEv.evalLevels(['cat', '*'], 'query_match').s, 'N')

// security data filters: "unless" applies when the attribute is not met; "if" when it is
const attrs = { HasMaint }
const unless = { id: '1', table: 'sc_catalog', mode: 'unless', filter: 'sys_id!=x', securityAttribute: 'HasMaint', description: '' }
const iff = Object.assign({}, unless, { mode: 'if' })
assert.equal(evalDataFilter(unless, attrs, { itil: true }), 'A')
assert.equal(evalDataFilter(unless, attrs, { maint: true }), 'N')
assert.equal(evalDataFilter(iff, attrs, { maint: true }), 'A')
assert.equal(evalDataFilter(iff, attrs, { itil: true }), 'N')
assert.equal(evalDataFilter(Object.assign({}, unless, { securityAttribute: '' }), attrs, {}), 'A')
assert.equal(evalDataFilter(Object.assign({}, unless, { securityAttribute: 'Unknown' }), attrs, {}), 'C')

// security data filters fold into the status: Granted -> Conditional (except create), the ACL result is kept
{
    const cells = () => ({ create: { s: 'G', lvl: 't', a: [] }, read: { s: 'G', lvl: 't', a: [] }, write: { s: 'C', lvl: 't', a: [] }, delete: { s: 'D', lvl: 't', a: [] } })
    const applied = cells()
    applyDataFilters(applied, [{ i: 0, r: 'N' }, { i: 1, r: 'A' }])
    assert.equal(applied.create.s, 'G', 'create does not query existing rows')
    assert.equal(applied.read.s, 'C')
    assert.equal(applied.read.acl, 'G')
    assert.equal(applied.read.df, 'A')
    assert.equal(applied.write.s, 'C')
    assert.equal(applied.write.acl, undefined, 'already Conditional: status unchanged')
    assert.equal(applied.write.df, 'A')
    assert.equal(applied.delete.s, 'D', 'denied stays denied')
    assert.equal(applied.delete.df, undefined)
    const depends = cells()
    applyDataFilters(depends, [{ i: 0, r: 'C' }])
    assert.equal(depends.read.s, 'C')
    assert.equal(depends.read.df, 'C')
    const notApplied = cells()
    applyDataFilters(notApplied, [{ i: 0, r: 'N' }])
    assert.equal(notApplied.read.s, 'G', 'a filter that does not apply changes nothing')
    assert.equal(notApplied.read.df, undefined)
    applyDataFilters(notApplied, undefined)
    assert.equal(notApplied.read.s, 'G')
}

// machine, AI agent, web-service-only and integration accounts get a warning that API-level controls aren't evaluated
{
    const acct = (a) => subj(['itil'], { label: 'Svc', account: Object.assign({ identity: '', identityLabel: '', webServiceOnly: false, integrationUser: false }, a) })
    assert.ok(/machine identity/.test(accountWarning(acct({ identity: 'machine' }))))
    assert.ok(/OAuth scopes/.test(accountWarning(acct({ webServiceOnly: true }))))
    assert.ok(/integration user/.test(accountWarning(acct({ integrationUser: true }))))
    assert.ok(/AI agent/.test(accountWarning(acct({ identity: 'ai_agent' }))))
    assert.equal(accountWarning(acct({ identity: 'human' })), '')
    assert.equal(accountWarning(subj(['itil'])), '', 'no account info recorded')
    assert.equal(accountWarning(Object.assign(acct({ identity: 'machine' }), { type: 'role' })), '')
}

// comparison counts differences in the extra operations; runs without them still compare
const withExtra = (ev) => ({ subject: ev.subject, counts: { create: { G: 0, C: 0, D: 0, N: 0 }, read: { G: 0, C: 0, D: 0, N: 0 }, write: { G: 0, C: 0, D: 0, N: 0 }, delete: { G: 0, C: 0, D: 0, N: 0 } }, tables: [{ t: 'cat', l: 'Cat', ops: Object.fromEntries(['create', 'read', 'write', 'delete', 'report_on'].map((op) => [op, ev.evalLevels(['cat', '*'], op)])), fields: [] }] })
const c2 = compare({ defaultDeny: true, subjects: [withExtra(maintEv), withExtra(itilEv)] })
assert.deepEqual(c2.diffs.map((x) => x.op).sort(), ['read', 'report_on'])

// ---- reporting dashboard measures
const { runReport, MEASURES } = require(path.join(BUILD, 'engine', 'report-measures.js'))
const cellOf = (st, a = []) => ({ s: st, lvl: '', a })
const acls = [
    { id: 'a0', name: 'sys_user', op: 'write', decision: 'allow', roles: [], adminOverrides: false, condition: '', hasScript: false, securityAttribute: '', appliesTo: '', description: '', scope: 'global' },
    { id: 'a1', name: 'incident', op: 'read', decision: 'allow', roles: ['itil'], adminOverrides: false, condition: '', hasScript: true, securityAttribute: '', appliesTo: '', description: '', scope: 'global' },
]
const emptyCounts = () => Object.fromEntries(['create', 'read', 'write', 'delete'].map((op) => [op, { G: 0, C: 0, D: 0, N: 0 }]))
const subjectRow = (subject, perTable) => ({ subject, counts: emptyCounts(), tables: perTable.map(([t, ops, sdf]) => ({ t, l: t, ops, fields: [], sdf })) })
const human = { type: 'user', id: 'h', key: 'user:h', label: 'Hana', sub: '', active: true, isAdmin: true, roles: ['admin', 'itil'], roleSources: [], account: { identity: 'human', identityLabel: 'Human', webServiceOnly: false, integrationUser: false } }
const bot = { type: 'user', id: 'b', key: 'user:b', label: 'Bot', sub: '', active: false, isAdmin: false, roles: ['itil'], roleSources: [], account: { identity: '', identityLabel: '', webServiceOnly: true, integrationUser: false } }
const resultR = {
    defaultDeny: false,
    ops: ['create', 'read', 'write', 'delete', 'query_match'],
    acls,
    dataFilters: [{ id: 'f', table: 'incident', mode: 'unless', filter: 'active=true', securityAttribute: 'HasAdminRole', description: '' }],
    subjects: [
        subjectRow(human, [
            ['sys_user', { create: cellOf('G'), read: cellOf('G'), write: cellOf('G', [{ i: 0, r: 'P', c: 'open' }]), delete: cellOf('D'), query_match: cellOf('N') }],
            ['incident', { create: cellOf('N'), read: cellOf('C', [{ i: 1, r: 'C', c: 'script' }]), write: cellOf('G'), delete: cellOf('D'), query_match: cellOf('N') }, [{ i: 0, r: 'N' }]],
        ]),
        subjectRow(bot, [
            ['sys_user', { create: cellOf('D'), read: cellOf('G'), write: cellOf('D'), delete: cellOf('D'), query_match: cellOf('N') }],
            ['incident', { create: cellOf('N'), read: cellOf('C', [{ i: 1, r: 'C', c: 'script' }]), write: cellOf('G'), delete: cellOf('D'), query_match: cellOf('N') }, [{ i: 0, r: 'A' }]],
        ]),
    ],
}
const rep = (measure, options = {}, chart = 'bar') => runReport({ measure, chart, options }, { results: resultR, comparison: null, drift: null })
// every shipped measure runs without errors on the same run
for (const m of MEASURES) rep(m.id)
const acc = rep('access', { ops: ['create', 'read', 'write', 'delete'], groupBy: 'status' })
assert.equal(acc.total, 16)
assert.deepEqual(Object.fromEntries(acc.groups.map((g) => [g.key, g.value])), { Granted: 6, Denied: 6, Conditional: 2, 'No rule': 2 })
const priv = rep('privileged')
assert.deepEqual(priv.rows.map((f) => f.subject + ':' + f.role), ['Hana:admin'])
const hr = rep('high_risk_tables', { groupBy: 'subject' })
assert.deepEqual(hr.groups.map((g) => g.key + ':' + g.value), ['Hana:2'], 'create + write on sys_user')
const machine = rep('machine_changes')
assert.deepEqual(machine.rows.map((f) => f.table + '.' + f.operation).sort(), ['incident.create', 'incident.write'], 'no rule with default allow counts as allowed')
assert.equal(rep('inactive_access').total, 3, 'Bot is inactive: sys_user read, incident read (C) and write')
assert.deepEqual(rep('open_acls').rows.map((f) => f.acl + ':' + f.subject), ['sys_user:Hana'])
assert.equal(rep('scripted', { groupBy: 'subject' }).total, 2)
const nr = rep('no_rule_allowed', { groupBy: 'operation' })
assert.deepEqual(nr.groups.map((g) => g.key + ':' + g.value), ['create:2'], 'query_match no-rule is allowed but not counted by default (read/create/write/delete only)')
assert.equal(rep('no_rule_allowed', { ops: ['query_match'] }).total, 4)
assert.deepEqual(rep('data_filters', { groupBy: 'status' }).groups.map((g) => g.key + ':' + g.value).sort(), ['Applied:1', 'Not applied:1'])
assert.equal(rep('unshared_roles').total, 1, 'admin is held by Hana only')
assert.equal(rep('differences', { groupBy: 'table' }).groups[0].key, 'sys_user')
assert.ok(rep('access_gained').note, 'a run that is not a rerun explains why it is empty')
// filters and "Other"
assert.equal(rep('access', { kinds: ['Machine / service'], ops: ['write'] }).total, 2)
assert.equal(rep('access', { tableText: 'inc', ops: ['read'] }).total, 2)
const capped = rep('access', { groupBy: 'table', limit: 1 })
assert.equal(capped.groups.length, 2)
assert.equal(capped.groups[1].key, '__other')
console.log('engine: all tests passed')
