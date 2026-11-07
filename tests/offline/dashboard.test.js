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
const { reportLine, dashboardContext, runContext, tableLine, workspaceContext, historyContext } = require(path.join(build, 'client', 'assistant', 'screenContext.js'))
const { moveItem, moveTileToTab, addTileToTab, runReportDef, sliceGroups } = require(path.join(build, 'client', 'dashboard', 'layout.js'))

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

// a card's chart choice is kept, and anything unknown is dropped
const charted = cleanTabs([{ id: 'a', title: 'A', tiles: [{ report: id('a'), size: 1, chart: 'pie' }, { report: id('b'), size: 1, chart: 'hologram' }] }])[0].tiles
assert.equal(charted[0].chart, 'pie')
assert.equal('chart' in charted[1], false)

// ---- pie slices ------------------------------------------------------------------
const gs = (n) => Array.from({ length: n }, (_, i) => ({ key: 'g' + i, label: 'G' + i, value: 10 - i }))
assert.equal(sliceGroups(gs(6)).length, 6, 'few groups stay as they are')
const sliced = sliceGroups(gs(9).concat([{ key: '__other', label: 'Other (5)', value: 7 }]))
assert.equal(sliced.length, 7)
assert.equal(sliced[6].label, 'Other (8)', 'three more groups join the five in Other')
assert.equal(sliced.reduce((n, g) => n + g.value, 0), gs(9).reduce((n, g) => n + g.value, 7), 'the total stays the same')
const fresh = sliceGroups(gs(8))
assert.equal(fresh[6].key, '__other')
assert.equal(fresh[6].label, 'Other (2)')

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

// ---- what the assistant is told about the page --------------------------------------
const source = { sys_id: id('a'), number: 'ALR0001014', name: 'Agents', created: 'today' }
const chartData = { unit: 'differences', total: 61022, groupBy: 'operation', groups: [{ key: 'create', label: 'create', value: 50010 }, { key: 'write', label: 'write', value: 9643 }], source }
const line = reportLine('Agents', chartData)
assert.ok(line.includes('61,022 differences') && line.includes('create 50,010') && line.includes('ALR0001014'))
assert.match(reportLine('Slow'), /still calculating/)
assert.match(reportLine('Bad', { error: 'gone' }), /could not be calculated \(gone\)/)
const shown = { sys_id: id('b'), number: 'ALR0001004', name: '', subject_summary: 'AIEDG Service' }
const aiTab = { id: 't', title: 'AI EDG', description: 'AI EDG agent access', tiles: [] }
// every report from one run: that run is the context, not the dashboard's Data from
let screen = dashboardContext({ tab: aiTab, shownRun: shown, reports: [{ name: 'Agents', data: chartData }] })
assert.equal(screen.run_number, 'ALR0001014')
assert.equal(screen.tab, 'AI EDG')
assert.ok(screen.summary.some((s) => s.includes('AI EDG agent access')))
assert.ok(!screen.summary.join().includes('ALR0001004'))
// a mix: the Data from run is named as well
screen = dashboardContext({ tab: aiTab, shownRun: shown, reports: [{ name: 'Agents', data: chartData }, { name: 'Other', data: { ...chartData, source: undefined } }], detail: 'rows open' })
assert.equal(screen.run_number, 'ALR0001004')
assert.ok(screen.summary.join().includes('ALR0001004') && screen.summary.includes('rows open'))
assert.equal(dashboardContext({ tab: aiTab, shownRun: null, reports: [] }).run_id, undefined)
const counts = { read: { G: 1, C: 2, D: 3, N: 0 } }
const page = runContext({
    run: { sys_id: id('c'), number: 'ALR1', name: 'x', run_type: 'compare', created: 'today', table_count: 1500, status: 'complete', filter: { mode: 'all', excludeSystem: true }, original_run: '', original_number: '', error_message: '' },
    results: { coverage: { from: 1, to: 1500, total: 4166 }, subjects: [{ subject: { label: 'Bot', type: 'user', roles: ['a'] }, counts }] },
    comparison: { summary: { tablesCompared: 1500, tablesDifferent: 12, tablesIdentical: 1488, tableCellsDifferent: 40, fieldCellsDifferent: 60 } },
    drift: null,
}, 'matrix')
const text = page.summary.join(' ')
assert.equal(page.run_number, 'ALR1')
assert.deepStrictEqual(page.subjects, ['Bot (user)'])
assert.ok(['1 to 1,500 of 4,166', 'read: 1 granted, 2 conditional, 3 denied', '12 differ', 'Side-by-side matrix', 'system tables excluded'].every((x) => text.includes(x)), text)
assert.equal(tableLine('incident', [{ label: 'Bot', ops: { read: { s: 'G' }, write: { s: 'D' } } }]), 'Table details are open for incident. Bot: read Granted, write Denied.')
assert.ok(workspaceContext({ subjects: [{ label: 'Bot', type: 'user' }], filter: { mode: 'tables', value: 'incident' } }).summary.join().includes('Bot (user)'))
assert.equal(historyContext(Array.from({ length: 30 }, () => ({ number: 'A', run_type: 'analyze', status: 'complete' })), false).summary.length, 16, 'a long list is cut down')

console.log('dashboard tests passed')
