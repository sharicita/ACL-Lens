// Offline test that saved runs are private: the person who ran one and ACL Lens admins. The app reads
// runs with plain GlideRecord, which ignores ACLs, so this rule in code is what protects its pages.
// Run with: node tests/offline/run.mjs
const assert = require('assert')
const Module = require('module')
const path = require('path')

const DB = {}
let me = 'alice'
let admin = false
let idSeq = 0
const sysId = () => (++idSeq).toString(16).padStart(32, '0')
class FakeGR {
    constructor(t) { this.t = t; this.q = []; this.rows = null; this.i = -1; this.cur = null; this.lim = 1e9; this.ord = null }
    initialize() { this.cur = {} }
    setValue(k, v) { this.cur[k] = String(v) }
    insert() { const id = sysId(); this.cur.sys_id = id; this.cur.sys_mod_count = '0'; (DB[this.t] = DB[this.t] || []).push(this.cur); return id }
    update() { this.cur.sys_mod_count = String(parseInt(this.cur.sys_mod_count || '0', 10) + 1); return this.cur.sys_id }
    get(id) { const r = (DB[this.t] || []).find((x) => x.sys_id === id); this.cur = r || null; return !!r }
    getValue(k) { return this.cur && this.cur[k] !== undefined ? this.cur[k] : '' }
    getDisplayValue(k) { return this.getValue(k) }
    getUniqueValue() { return this.cur.sys_id }
    addQuery(k, v) { this.q.push([k, String(v)]) }
    addEncodedQuery() {}
    orderBy(k) { this.ord = [k, 1] }
    orderByDesc(k) { this.ord = [k, -1] }
    setLimit(n) { this.lim = n }
    query() {
        let rows = (DB[this.t] || []).filter((r) => this.q.every(([k, v]) => (r[k] === undefined ? 'false' : r[k]) === v))
        if (this.ord) rows = rows.slice().sort((a, b) => String(a[this.ord[0]]).localeCompare(String(b[this.ord[0]])) * this.ord[1])
        this.rows = rows.slice(0, this.lim)
    }
    next() { this.i++; this.cur = this.rows[this.i]; return !!this.cur }
    getRowCount() { return this.rows.length }
    deleteMultiple() { this.query(); DB[this.t] = (DB[this.t] || []).filter((r) => !this.rows.includes(r)) }
    isNewRecord() { return !this.cur.sys_id }
}
const glide = {
    GlideRecord: FakeGR,
    GlideRecordSecure: FakeGR,
    GlideSysAttachment: class {},
    GlideDateTime: class {},
    gs: { getUserID: () => me, hasRole: (r) => (r === 'x_acllens.admin' ? admin : true), getProperty: (k, d) => d, warn() {}, info() {}, error() {}, getUserDisplayName: () => me },
}
const origResolve = Module._resolveFilename
Module._resolveFilename = function (req, parent, ...rest) {
    if (req.startsWith('@servicenow/glide')) return '@glide'
    if (req.endsWith('.ts')) req = req.replace(/\.ts$/, '.js')
    return origResolve.call(this, req, parent, ...rest)
}
require.cache['@glide'] = { id: '@glide', filename: '@glide', loaded: true, exports: glide }

const build = path.join(__dirname, '..', '..', '.test-build')
const { getRun, listRuns, mayReadRun, saveBlob } = require(path.join(build, 'engine', 'storage.js'))
const { loadRun, rerun } = require(path.join(build, 'engine', 'runs.js'))
const { dashboardData, previewReport, getDashboard, saveDashboard } = require(path.join(build, 'reports', 'reports.js'))
const { reportCacheKey } = require(path.join(build, 'reports', 'report-cache.js'))

// ---- the rule ---------------------------------------------------------------------
assert.equal(mayReadRun('alice', 'alice', false), true, 'the owner')
assert.equal(mayReadRun('alice', 'bob', false), false, 'someone else')
assert.equal(mayReadRun('alice', 'bob', true), true, 'an admin')
assert.equal(mayReadRun('', 'bob', false), false, 'no owner: not everyone')
assert.equal(mayReadRun('', '', false), false, 'no owner and no user')

// ---- runs -------------------------------------------------------------------------
const addRun = (owner, number, created) => {
    const r = new FakeGR('x_acllens_run')
    r.initialize()
    r.setValue('number', number)
    r.setValue('run_by', owner)
    r.setValue('status', 'complete')
    r.setValue('run_type', 'analyze')
    r.setValue('archived', 'false')
    r.setValue('sys_created_on', created)
    r.setValue('subjects', '[]')
    r.setValue('filter', '{"mode":"tables"}')
    return r.insert()
}
const aliceRun = addRun('alice', 'ALR1', '2026-01-01')
const bobRun = addRun('bob', 'ALR2', '2026-01-02')
saveBlob(aliceRun, 'results', { secret: 'alice', subjects: [] })
saveBlob(bobRun, 'results', { secret: 'bob', subjects: [] })

const as = (user, isAdmin, fn) => {
    me = user
    admin = isAdmin
    return fn()
}

assert.equal(as('alice', false, () => getRun(aliceRun)).number, 'ALR1', 'owner opens their run')
assert.equal(as('alice', false, () => getRun(bobRun)), null, "someone else's run looks like it doesn't exist")
assert.equal(as('alice', true, () => getRun(bobRun)).number, 'ALR2', 'admin opens any run')

assert.equal(as('alice', false, () => loadRun(aliceRun)).results.secret, 'alice')
assert.equal(as('alice', false, () => loadRun(bobRun)), null, 'results of another run are not returned')
assert.equal(as('alice', true, () => loadRun(bobRun)).results.secret, 'bob')

const numbers = (list) => list.map((r) => r.number).sort()
assert.deepStrictEqual(numbers(as('alice', false, () => listRuns({ limit: 50 }))), ['ALR1'], 'History lists only your runs')
assert.deepStrictEqual(numbers(as('bob', false, () => listRuns({ limit: 50 }))), ['ALR2'])
assert.deepStrictEqual(numbers(as('admin', true, () => listRuns({ limit: 50 }))), ['ALR1', 'ALR2'], 'admins list every run')
assert.throws(() => as('alice', false, () => rerun(bobRun)), /Run not found/, "can't rerun someone else's run")

// ---- dashboard --------------------------------------------------------------------
const addReport = (options, extra) => {
    const r = new FakeGR('x_acllens_report')
    r.initialize()
    r.setValue('name', 'Report')
    r.setValue('measure', 'access')
    r.setValue('chart', 'bar')
    r.setValue('options', JSON.stringify(options))
    r.setValue('shared', 'true')
    r.setValue('system', 'false')
    r.setValue('owner', 'admin')
    return r.insert()
}
// a stored result is read without loading the run, so it needs its own check
const stored = (runId, options) => {
    const { key, text } = reportCacheKey({ measure: 'access', chart: 'bar', options })
    saveBlob(runId, 'report', { def: text, data: { total: 99, marker: runId } }, key)
}
const pinnedToBob = addReport({ run: bobRun })
stored(bobRun, { run: bobRun })

let res = as('alice', false, () => dashboardData({ reports: [pinnedToBob] }))
assert.ok(res.reports[pinnedToBob].error, 'a shared report tied to another run shows no data')
assert.equal(res.reports[pinnedToBob].total, undefined)
assert.match(res.reports[pinnedToBob].error, /owner and ACL Lens admins/)

res = as('bob', false, () => dashboardData({ reports: [pinnedToBob] }))
assert.equal(res.reports[pinnedToBob].total, 99, 'the owner sees it')
assert.equal(res.reports[pinnedToBob].source.number, 'ALR2')
assert.equal(as('admin', true, () => dashboardData({ reports: [pinnedToBob] })).reports[pinnedToBob].total, 99, 'an admin sees it')

// asking for another person's run directly
const plain = addReport({})
stored(bobRun, {})
res = as('alice', false, () => dashboardData({ run: bobRun, reports: [plain] }))
assert.equal(res.run, null, 'no run details')
assert.deepStrictEqual(res.reports, {}, 'no results')

// "Latest run" means your latest: bob's is newer, but alice gets hers
stored(aliceRun, {})
res = as('alice', false, () => dashboardData({ reports: [plain] }))
assert.equal(res.run.number, 'ALR1')
assert.equal(res.reports[plain].marker, aliceRun)
assert.equal(as('admin', true, () => dashboardData({ reports: [plain] })).run.number, 'ALR2', "an admin's latest is the newest of all")

// the report editor's preview
let preview = as('alice', false, () => previewReport({ run: bobRun, report: { measure: 'access', chart: 'bar', options: {} } }))
assert.deepStrictEqual(preview, { run: null, data: null }, 'no preview of another run')
preview = as('alice', false, () => previewReport({ report: { measure: 'access', chart: 'bar', options: { run: bobRun } } }))
assert.deepStrictEqual(preview, { run: null, data: null }, 'not through a report option either')

// someone with no runs
res = as('carol', false, () => dashboardData({ reports: [plain] }))
assert.equal(res.run, null)
assert.deepStrictEqual(res.reports, {})

// ---- saving a dashboard from two windows -------------------------------------------
const tabsWith = (...titles) => titles.map((title, i) => ({ id: 'tab-' + i, title, description: '', tiles: [] }))
as('dana', false, () => {
    const start = getDashboard()
    assert.equal(start.version, -1, 'no dashboard saved yet')
    // two windows open at the same time
    const windowA = start.version
    const windowB = start.version
    let saved = saveDashboard({ tabs: tabsWith('Overview', 'AI EDG'), version: windowA })
    assert.deepStrictEqual(saved.tabs.map((x) => x.title), ['Overview', 'AI EDG'])
    // window B still shows the old dashboard: its save is refused, and it gets the new one
    const stale = saveDashboard({ tabs: tabsWith('Overview'), version: windowB })
    assert.equal(stale.conflict, true)
    assert.deepStrictEqual(stale.dashboard.tabs.map((x) => x.title), ['Overview', 'AI EDG'], 'the new tab survives')
    // saving from the latest version works, and each save moves the version on
    saved = saveDashboard({ tabs: tabsWith('Overview', 'AI EDG', 'Audit'), version: stale.dashboard.version })
    assert.equal(saved.tabs.length, 3)
    assert.ok(saved.version > stale.dashboard.version)
    assert.equal(saveDashboard({ tabs: tabsWith('Overview'), version: stale.dashboard.version }).conflict, true, 'the older version again: refused')
    // a page from before versions existed can't overwrite anything
    assert.throws(() => saveDashboard({ tabs: tabsWith('Overview') }), /out of date/)
    assert.equal(getDashboard().tabs.length, 3)
})
// another person's saves don't count against yours
as('erin', false, () => assert.equal(saveDashboard({ tabs: tabsWith('Mine'), version: -1 }).tabs[0].title, 'Mine'))

console.log('run access tests passed')
