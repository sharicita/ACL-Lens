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
const { cleanTabs, layoutJson, readLayout } = require(path.join(build, 'reports', 'dashboard-layout.js'))
const { reportCacheKey } = require(path.join(build, 'reports', 'report-cache.js'))
const { moveItem, moveTileToTab, addTileToTab, runReportDef } = require(path.join(build, 'client', 'dashboard', 'layout.js'))

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

// ---- saved layout ----------------------------------------------------------------
const tile = (c, size) => ({ report: id(c), size: size || 1 })
const fallback = [tile('a')]

// no dashboard yet, or an unreadable one: the default tab
assert.deepStrictEqual(readLayout('', fallback), { tabs: [{ id: 'main', title: 'Overview', description: '', tiles: fallback }], custom: false })
assert.equal(readLayout('{broken', fallback).custom, false)

// a dashboard saved before tabs existed becomes one tab
const old = readLayout(JSON.stringify([tile('b', 2), tile('c')]), fallback)
assert.equal(old.custom, true)
assert.equal(old.tabs.length, 1)
assert.deepStrictEqual(old.tabs[0].tiles, [tile('b', 2), tile('c')])

// round trip
const tabs = [
    { id: 'main', title: ' Overview ', description: 'All of it', tiles: [tile('a', 2)] },
    { id: 'tab-2', title: 'Agents', description: '', tiles: [] },
]
const clean = cleanTabs(tabs)
assert.equal(clean[0].title, 'Overview')
assert.deepStrictEqual(readLayout(layoutJson(clean), fallback), { tabs: clean, custom: true })

// tiles: bad IDs and repeats on one tab are dropped; a report may be on several tabs
const t2 = cleanTabs([
    { id: 'a', title: 'A', tiles: [tile('a'), tile('a'), { report: '<script>' }, null] },
    { id: 'b', title: 'B', tiles: [tile('a')] },
])
assert.equal(t2[0].tiles.length, 1)
assert.equal(t2[1].tiles.length, 1)

// rejected with a message
assert.throws(() => cleanTabs([]), /at least one tab/)
assert.throws(() => cleanTabs(undefined), /at least one tab/)
assert.throws(() => cleanTabs([{ id: 'a', title: '   ' }]), /title/)
assert.throws(() => cleanTabs([{ id: 'BAD ID', title: 'x' }]), /invalid ID/)
assert.throws(() => cleanTabs([{ id: 'a', title: 'x' }, { id: 'a', title: 'y' }]), /invalid ID/)
assert.throws(() => cleanTabs(Array.from({ length: 21 }, (_, i) => ({ id: 't' + i, title: 'x' }))), /up to 20/)

// the largest allowed dashboard still fits the column, so JSON is never cut off
const fullTiles = Array.from({ length: 40 }, (_, i) => ({ report: i.toString(16).padStart(32, '0'), size: 2 }))
const full = cleanTabs(Array.from({ length: 20 }, (_, i) => ({ id: 't' + i, title: 'T'.repeat(60), description: 'D'.repeat(300), tiles: fullTiles })))
assert.ok(layoutJson(full).length < 60000)

// ---- stored report results --------------------------------------------------------
const def = { measure: 'access', chart: 'bar', options: { ops: ['read'], run: id('a') } }
const k = reportCacheKey(def)
assert.ok(k.key.length <= 40, 'fits the column')
assert.deepStrictEqual(reportCacheKey({ ...def, options: { run: id('b'), ops: ['read'] } }), k, 'same definition: option order and run make no difference')
assert.notEqual(reportCacheKey({ ...def, chart: 'donut' }).key, k.key)
assert.notEqual(reportCacheKey({ ...def, measure: 'privileged' }).key, k.key)
assert.notEqual(reportCacheKey({ ...def, options: { ops: ['write'] } }).key, k.key)
assert.deepStrictEqual(reportCacheKey({ ...def, options: { ops: ['read'], limit: undefined } }), k, 'an unset option is no different')

// ---- arranging -----------------------------------------------------------------
const l = ['a', 'b', 'c', 'd']
assert.deepStrictEqual(moveItem(l, 0, 2), ['b', 'a', 'c', 'd'], 'forward, before c')
assert.deepStrictEqual(moveItem(l, 0, 4), ['b', 'c', 'd', 'a'], 'to the end')
assert.deepStrictEqual(moveItem(l, 3, 0), ['d', 'a', 'b', 'c'], 'to the start')
assert.deepStrictEqual(moveItem(l, 2, 1), ['a', 'c', 'b', 'd'], 'backward')
assert.deepStrictEqual(moveItem(l, 1, 1), l, 'before itself: no change')
assert.deepStrictEqual(moveItem(l, 1, 2), l, 'before the next one: no change')
assert.deepStrictEqual(moveItem(l, 9, 0), l, 'unknown item: no change')
assert.deepStrictEqual(l, ['a', 'b', 'c', 'd'], 'input not changed')

const dash = [
    { id: 'x', title: 'X', description: '', tiles: [tile('a', 2), tile('b')] },
    { id: 'y', title: 'Y', description: '', tiles: [tile('c')] },
]
let moved = moveTileToTab(dash, id('a'), 'x', 'y')
assert.deepStrictEqual(moved[0].tiles, [tile('b')])
assert.deepStrictEqual(moved[1].tiles, [tile('c'), tile('a', 2)], 'keeps its width, goes last')
moved = moveTileToTab([dash[0], { ...dash[1], tiles: [tile('a')] }], id('a'), 'x', 'y')
assert.equal(moved[1].tiles.length, 1, 'already on the target tab: not doubled')
assert.equal(moved[0].tiles.length, 1)
assert.strictEqual(moveTileToTab(dash, id('a'), 'x', 'x'), dash, 'same tab: no change')
assert.strictEqual(moveTileToTab(dash, id('z'), 'x', 'y'), dash, 'unknown report: no change')
assert.equal(addTileToTab(dash, id('c'), 'y')[1].tiles.length, 1, 'adding twice: not doubled')
assert.equal(addTileToTab(dash, id('d'), 'y')[1].tiles.length, 2)

// a run as a report
const analysis = runReportDef({ sys_id: id('a'), number: 'ALR1', name: 'Agents', run_type: 'analyze', created: 'today' })
assert.equal(analysis.name, 'ALR1 Agents')
assert.equal(analysis.measure, 'access')
assert.deepStrictEqual(analysis.options, { run: id('a') })
assert.equal(runReportDef({ sys_id: id('a'), number: 'ALR1', run_type: 'compare' }).measure, 'differences')
assert.equal(runReportDef({ sys_id: id('a'), number: 'ALR1' }).name, 'ALR1', 'no name')
assert.equal(runReportDef({ sys_id: id('a'), number: 'ALR1', name: 'x'.repeat(200) }).name.length, 100)

console.log('dashboard tests passed')
