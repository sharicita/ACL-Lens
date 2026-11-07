// Offline test of run-result storage: large results are saved in parts (no single huge string),
// reload to the identical object, old single-string blobs still load, and the size cap is enforced.
// Run with: node tests/offline/run.mjs
const assert = require('assert')
const Module = require('module')
const path = require('path')

const DB = {}
let idSeq = 0
let props = {}
class FakeGR {
    constructor(t) { this.t = t; this.q = []; this.rows = null; this.i = -1; this.cur = null; this.ord = null }
    initialize() { this.cur = {} }
    setValue(k, v) { this.cur[k] = String(v) }
    insert() { const id = 'id' + ++idSeq; this.cur.sys_id = id; (DB[this.t] = DB[this.t] || []).push(this.cur); return id }
    getValue(k) { return this.cur && this.cur[k] !== undefined ? this.cur[k] : '' }
    addQuery(k, v) { this.q.push([k, String(v)]) }
    orderBy(k) { this.ord = k }
    query() {
        let rows = (DB[this.t] || []).filter((r) => this.q.every(([k, v]) => r[k] === v))
        if (this.ord) rows = rows.slice().sort((a, b) => parseInt(a[this.ord]) - parseInt(b[this.ord]))
        this.rows = rows
    }
    next() { this.i++; this.cur = this.rows[this.i]; return !!this.cur }
    deleteMultiple() { this.query(); DB[this.t] = (DB[this.t] || []).filter((r) => !this.rows.includes(r)) }
}
const glide = { GlideRecord: FakeGR, GlideSysAttachment: class {}, gs: { getProperty: (k, d) => (k in props ? props[k] : d), warn() {} } }
const origResolve = Module._resolveFilename
Module._resolveFilename = function (req, parent, ...rest) {
    if (req.startsWith('@servicenow/glide')) return '@glide'
    if (req.endsWith('.ts')) req = req.replace(/\.ts$/, '.js')
    return origResolve.call(this, req, parent, ...rest)
}
require.cache['@glide'] = { id: '@glide', filename: '@glide', loaded: true, exports: glide }
const { saveBlob, loadBlob, deleteBlob, maxResultMb } = require(path.join(__dirname, '..', '..', '.test-build', 'engine', 'storage.js'))

const table = (n) => ({ t: 't' + n, l: 'Table ' + n, ops: { read: { s: 'G', a: [{ i: n % 7 }] } }, fields: [{ f: '*', ops: {} }, { f: 'name', ops: {} }] })
const result = {
    version: 1,
    warnings: ['w1'],
    acls: Array.from({ length: 50 }, (_, i) => ({ n: 'acl' + i })),
    subjects: [0, 1].map((s) => ({ subject: { key: 'u' + s }, counts: { read: { G: 1 } }, tables: Array.from({ length: 3000 }, (_, n) => table(n + s)) })),
}

// round trip, split over many rows and parts
saveBlob('r1', 'results', result)
const rows = DB.x_acllens_run_data.filter((r) => r.run === 'r1')
assert.ok(rows.length > 10, 'stored in many rows')
assert.ok(rows.every((r) => r.payload.length <= 60000), 'each row within the field size')
assert.deepStrictEqual(loadBlob('r1', 'results'), JSON.parse(JSON.stringify(result)))
assert.equal(result.subjects[0].tables.length, 3000, 'payload not modified by saving')

// small payload and empty payload
saveBlob('r2', 'comparison', { a: 1, rows: [1, 2] })
assert.deepStrictEqual(loadBlob('r2', 'comparison'), { a: 1, rows: [1, 2] })
assert.equal(loadBlob('missing', 'results'), null)

// a blob saved by older versions (one JSON string over several rows) still loads
const legacy = JSON.stringify(result)
for (let i = 0, seq = 0; i < legacy.length; i += 60000, seq++) {
    const d = new FakeGR('x_acllens_run_data')
    d.initialize(); d.setValue('run', 'old'); d.setValue('kind', 'results'); d.setValue('seq', seq); d.setValue('payload', legacy.substring(i, i + 60000)); d.insert()
}
assert.deepStrictEqual(loadBlob('old', 'results'), JSON.parse(legacy))

// keyed blobs of one kind stay apart, and don't disturb each other when removed
saveBlob('r4', 'report', { a: 1 }, 'k1')
saveBlob('r4', 'report', { a: 2 }, 'k2')
saveBlob('r4', 'results', { main: true })
assert.deepStrictEqual(loadBlob('r4', 'report', 'k1'), { a: 1 })
assert.deepStrictEqual(loadBlob('r4', 'report', 'k2'), { a: 2 })
assert.equal(loadBlob('r4', 'report', 'k3'), null)
assert.deepStrictEqual(loadBlob('r4', 'results'), { main: true })
deleteBlob('r4', 'report', 'k1')
assert.equal(loadBlob('r4', 'report', 'k1'), null)
assert.deepStrictEqual(loadBlob('r4', 'report', 'k2'), { a: 2 })

// the property sets the cap; a result over it fails with guidance and leaves no rows behind
assert.equal(maxResultMb(), 256)
props = { 'x_acllens.run.max_result_mb': '1' }
assert.equal(maxResultMb(), 8, 'values below the minimum are raised to 8')
props = { 'x_acllens.run.max_result_mb': 'abc' }
assert.equal(maxResultMb(), 256, 'bad values fall back to the default')
props = { 'x_acllens.run.max_result_mb': '8' }
const big = { subjects: [{ tables: Array.from({ length: 150000 }, (_, n) => table(n)) }] }
assert.throws(() => saveBlob('r3', 'results', big), /saved-result limit.*x_acllens\.run\.max_result_mb/)
assert.equal(DB.x_acllens_run_data.filter((r) => r.run === 'r3').length, 0, 'partial rows removed')
props = { 'x_acllens.run.max_result_mb': '64' }
saveBlob('r3', 'results', big)
assert.equal(loadBlob('r3', 'results').subjects[0].tables.length, 150000)

console.log('storage tests passed')
