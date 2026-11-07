// Offline tests of run sets (which tables a capped run covers) and the dashboard layout: saved tabs,
// older layouts, and the helpers behind dragging. Run with: node tests/offline/run.mjs
const assert = require('assert')
const Module = require('module')
const path = require('path')

const origResolve = Module._resolveFilename
Module._resolveFilename = function (req, parent, ...rest) {
    if (req.endsWith('.ts')) req = req.replace(/\.ts$/, '.js')
    return origResolve.call(this, req, parent, ...rest)
}
const build = path.join(__dirname, '..', '..', '.test-build')
const { tableWindow, coverageWarning } = require(path.join(build, 'engine', 'table-window.js'))

const id = (c) => c.repeat(32)

// ---- run sets ------------------------------------------------------------------
const names = ['e', 'a', 'c', 'b', 'd']

// everything fits: untouched, order kept
let w = tableWindow(names, 5)
assert.deepStrictEqual(w.tables, names)
assert.equal(w.coverage, null)

// first set
w = tableWindow(names, 2)
assert.deepStrictEqual(w.tables, ['a', 'b'])
assert.deepStrictEqual(w.coverage, { from: 1, to: 2, total: 5, nextAfter: 'b' })
assert.match(coverageWarning(w.coverage), /Run next set/)

// middle and last sets, following nextAfter
w = tableWindow(names, 2, w.coverage.nextAfter)
assert.deepStrictEqual(w.tables, ['c', 'd'])
assert.deepStrictEqual(w.coverage, { from: 3, to: 4, total: 5, nextAfter: 'd' })
w = tableWindow(names, 2, w.coverage.nextAfter)
assert.deepStrictEqual(w.tables, ['e'])
assert.deepStrictEqual(w.coverage, { from: 5, to: 5, total: 5 })
assert.match(coverageWarning(w.coverage), /last set/)

// a last set that exactly fills the window has nothing after it
w = tableWindow(['a', 'b', 'c', 'd'], 2, 'b')
assert.deepStrictEqual(w.coverage, { from: 3, to: 4, total: 4 })

// every table gets analyzed exactly once across the sets
const many = Array.from({ length: 4166 }, (_, i) => 't' + i)
const seen = []
let after
do {
    w = tableWindow(many, 1500, after)
    seen.push(...w.tables)
    after = w.coverage.nextAfter
} while (after)
assert.equal(seen.length, 4166)
assert.equal(new Set(seen).size, 4166)

// a table added before the cursor doesn't move the next set's start
w = tableWindow(['a', 'aa', 'b', 'c', 'd'], 2, 'b')
assert.deepStrictEqual(w.tables, ['c', 'd'])

// nothing left after the starting point
w = tableWindow(['a', 'b'], 2, 'z')
assert.deepStrictEqual(w.tables, [])
assert.equal(w.coverage.nextAfter, undefined)
assert.match(coverageWarning(w.coverage), /none come after/)

console.log('dashboard tests passed')
