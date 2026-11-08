// Offline test of the Security Assistant loop with a fake Glide DB, fake provider and fake tools.
// Run with: node tests/offline/run.mjs
const assert = require('assert')
const Module = require('module')
const path = require('path')

// ---- fake glide ---------------------------------------------------------
const DB = {}
let idSeq = 0
class FakeGR {
    constructor(t) { this.t = t; this.q = []; this.rows = null; this.i = -1; this.cur = null; this.lim = 1e9; this.ord = null }
    initialize() { this.cur = {} }
    setValue(k, v) { this.cur[k] = String(v) }
    insert() { const id = 'id' + ++idSeq; this.cur.sys_id = id; (DB[this.t] = DB[this.t] || []).push(this.cur); return id }
    update() { return this.cur.sys_id }
    get(id) { const r = (DB[this.t] || []).find((x) => x.sys_id === id); this.cur = r || null; return !!r }
    getValue(k) { return this.cur && this.cur[k] !== undefined ? this.cur[k] : '' }
    getDisplayValue(k) { return this.getValue(k) }
    getUniqueValue() { return this.cur.sys_id }
    addQuery(k, v) { this.q.push([k, String(v)]) }
    orderBy(k) { this.ord = [k, 1] }
    orderByDesc(k) { this.ord = [k, -1] }
    setLimit(n) { this.lim = n }
    query() {
        let rows = (DB[this.t] || []).filter((r) => this.q.every(([k, v]) => r[k] === v))
        if (this.ord) rows = rows.slice().sort((a, b) => (parseInt(a[this.ord[0]]) - parseInt(b[this.ord[0]])) * this.ord[1])
        this.rows = rows.slice(0, this.lim)
    }
    next() { this.i++; this.cur = this.rows[this.i]; return !!this.cur }
}
const glide = { GlideRecord: FakeGR, gs: { getUserID: () => 'me', getProperty: (k, d) => d, hasRole: () => true } }

// ---- fake clock: every model call takes modelMs ----------------------------
let clock = 1e12
let modelMs = 0
Date.now = () => clock

// ---- fake provider: scripted replies, records what it was sent ---------
const sent = []
let script = []
const providers = {
    pickProvider: () => ({ sys_id: 'p1', name: 'Fake', type: 'anthropic' }),
    complete: (p, system, messages) => {
        sent.push({ system, messages: JSON.parse(JSON.stringify(messages)) })
        clock += modelMs
        const next = script.shift()
        if (next instanceof Error) throw next
        return next
    },
}
const toolCalls = []
const tools = {
    TOOLS: [{ name: 'check_my_access', description: 'x', inputSchema: { type: 'object', properties: { table: { type: 'string' } }, required: ['table'] } }],
    runTool: (name, args) => { toolCalls.push([name, args]); return { table: args.table, read: false, link: 'https://x/incident.do?sys_id=1' } },
}

const origResolve = Module._resolveFilename
Module._resolveFilename = function (req, parent, ...rest) {
    if (req.startsWith('@servicenow/glide')) return '@glide'
    if (req.endsWith('/providers.ts')) return '@providers'
    if (req.endsWith('/tools.ts')) return '@tools'
    if (req.endsWith('.ts')) req = req.replace(/\.ts$/, '.js')
    return origResolve.call(this, req, parent, ...rest)
}
require.cache['@glide'] = { id: '@glide', filename: '@glide', loaded: true, exports: glide }
require.cache['@providers'] = { id: '@providers', filename: '@providers', loaded: true, exports: providers }
require.cache['@tools'] = { id: '@tools', filename: '@tools', loaded: true, exports: tools }

const { chat, parseAction, summarizeTools, getConversation, listConversations } = require(path.join(__dirname, '..', '..', '.test-build', 'ai', 'agent.js'))

// ---- parseAction ----------------------------------------------------------
assert.deepEqual(parseAction('{"action":"tool","tool":"t","arguments":{"a":1}}'), { action: 'tool', calls: [{ tool: 't', arguments: { a: 1 } }] })
assert.deepEqual(parseAction('{"action":"tool","tool":"t"}'), { action: 'tool', calls: [{ tool: 't', arguments: {} }] })
assert.deepEqual(parseAction('```json\n{"action":"tools","calls":[{"tool":"a","arguments":{"x":1}},{"tool":"b"},{"nope":1}]}\n```'), {
    action: 'tool',
    calls: [{ tool: 'a', arguments: { x: 1 } }, { tool: 'b', arguments: {} }],
})
assert.equal(parseAction('{"action":"tools","calls":[]}').action, 'answer', 'empty batch is not a tool call')
assert.equal(parseAction('Sure! ```json\n{"action":"answer","content":"Hi {there}"}\n```').content, 'Hi {there}')
assert.equal(parseAction('plain text answer').content, 'plain text answer')
assert.equal(parseAction('{"action":"answer","content":"a \\"quoted\\" } brace"}').content, 'a "quoted" } brace')
assert.equal(parseAction('{not json').action, 'answer')

// ---- loop: tool then answer ------------------------------------------------
script = [
    '{"action":"tool","tool":"check_my_access","arguments":{"table":"incident"}}',
    '{"action":"answer","content":"You cannot read incidents. [Open](https://x/incident.do?sys_id=1)"}',
]
const r1 = chat(undefined, 'Can I read incidents?', { table: 'incident', run_number: 'ALR1' })
assert.equal(r1.answer.startsWith('You cannot read incidents'), true)
assert.deepEqual(r1.tools_used, ['check_my_access'])
assert.deepEqual(toolCalls[0], ['check_my_access', { table: 'incident' }])
assert.ok(sent[0].messages[0].content.includes('[Context from the ACL Lens screen'), 'context note sent')
assert.ok(sent[1].messages.some((m) => m.content.startsWith('Tool result for check_my_access')), 'tool result fed back')

const sys0 = sent[0].system
assert.ok(sys0.includes('read-only') && sys0.includes('check_my_access'), 'system prompt has rules + catalog')

// ---- follow-up uses history, system prompt identical (cacheable) ------------
script = ['{"action":"answer","content":"Ask for the itil role."}']
const r2 = chat(r1.conversation_id, 'How do I fix it?')
assert.equal(r2.conversation_id, r1.conversation_id)
const last = sent[sent.length - 1]
assert.equal(last.system, sys0, 'system prompt stable across turns')
assert.deepEqual(last.messages.map((m) => m.role), ['user', 'assistant', 'user'])
const conv = getConversation(r1.conversation_id)
assert.equal(conv.messages.length, 4)
assert.equal(listConversations().length, 1)

// ---- step budget used up: the model answers from what it has -----------------
script = Array(12).fill('{"action":"tool","tool":"check_my_access","arguments":{"table":"x"}}').concat(['{"action":"answer","content":"Partial answer. Could not verify: x write."}'])
let before = sent.length
const r3 = chat(undefined, 'loop forever')
assert.equal(r3.tools_used.length, 12)
assert.equal(r3.answer, 'Partial answer. Could not verify: x write.', 'model answer, not the canned text')
const finalMsgs = sent[sent.length - 1].messages
assert.ok(finalMsgs[finalMsgs.length - 1].content.startsWith('Tools are no longer available'), 'final call says tools are gone')
assert.equal(sent.length - before, 13)
assert.equal(script.length, 0)

// ---- ...and the canned text only when that final reply is empty --------------
script = Array(12).fill('{"action":"tool","tool":"check_my_access","arguments":{"table":"x"}}').concat(['{"action":"answer","content":"  "}'])
assert.ok(chat(undefined, 'loop again').answer.includes('could not finish'))
script = Array(12).fill('{"action":"tool","tool":"check_my_access","arguments":{"table":"x"}}').concat(['{"action":"tool","tool":"check_my_access","arguments":{"table":"x"}}'])
const r3c = chat(undefined, 'loop once more')
assert.ok(r3c.answer.includes('could not finish'), 'a tool request after the budget is not run')
assert.equal(r3c.tools_used.length, 12)

// ---- batched calls: parsed, executed, capped per reply and per turn ----------
toolCalls.length = 0
const batch = (tables) => JSON.stringify({ action: 'tools', calls: tables.map((t) => ({ tool: 'check_my_access', arguments: { table: t } })) })
script = [batch(['pm_project', 'pm_project_task']), batch(['a', 'b', 'c', 'd', 'e', 'f', 'g']), batch(['h', 'i', 'j', 'k', 'l', 'm']), '{"action":"answer","content":"Design done."}']
before = sent.length
const r4 = chat(undefined, 'Design CRUD for pm_project and pm_project_task')
assert.deepEqual(toolCalls.slice(0, 2), [['check_my_access', { table: 'pm_project' }], ['check_my_access', { table: 'pm_project_task' }]])
assert.equal(r4.tools_used.length, 12, '2 + 5 (capped per reply) + 5 (capped by the turn budget)')
assert.deepEqual(toolCalls.map((c) => c[1].table), ['pm_project', 'pm_project_task', 'a', 'b', 'c', 'd', 'e', 'h', 'i', 'j', 'k', 'l'])
const afterBatch = sent[before + 1].messages
assert.ok(afterBatch[afterBatch.length - 2].content.includes('"action":"tools"'), 'batched request echoed')
const batchResult = afterBatch[afterBatch.length - 1].content
assert.ok(batchResult.includes('Tool result for check_my_access {"table":"pm_project"}') && batchResult.includes('{"table":"pm_project_task"}'), 'both results fed back in one message')
assert.ok(batchResult.includes('Tool calls left for this question: 10'))
assert.ok(sent[before + 2].messages.slice(-1)[0].content.includes('2 further call(s) were not run'))
assert.ok(sent[sent.length - 1].messages.slice(-1)[0].content.startsWith('Tools are no longer available'), 'budget reached by batches -> final answer call')
assert.equal(r4.answer, 'Design done.')

// ---- time budget (fake clock) --------------------------------------------------
modelMs = 40000
toolCalls.length = 0
script = Array(3).fill('{"action":"tool","tool":"check_my_access","arguments":{"table":"x"}}').concat(['{"action":"answer","content":"Answer within time."}'])
before = sent.length
const r5 = chat(undefined, 'slow provider')
// calls start at t=0, 40s, 80s; at 120s the 90s budget is gone -> final call without tools
assert.equal(r5.answer, 'Answer within time.')
assert.equal(r5.tools_used.length, 3)
assert.equal(sent.length - before, 4)
assert.ok(sent[sent.length - 1].messages.slice(-1)[0].content.includes('the time limit'))
script = []
modelMs = 0

// ---- history carries a bounded tool summary into follow-up turns ---------------
script = ['{"action":"tool","tool":"check_my_access","arguments":{"table":"pm_project"}}', '{"action":"answer","content":"No read on pm_project."}']
const r6 = chat(undefined, 'Can I read pm_project?')
script = ['{"action":"answer","content":"As found before."}']
chat(r6.conversation_id, 'And what did you check?')
const follow = sent[sent.length - 1].messages
assert.equal(follow[1].role, 'assistant')
assert.ok(follow[1].content.startsWith('[Tool results gathered for this answer'), 'summary resent with the answer')
assert.ok(follow[1].content.includes('check_my_access({"table":"pm_project"}) -> {"table":"pm_project","read":false'))
assert.ok(follow[1].content.endsWith('No read on pm_project.'))
assert.equal(getConversation(r6.conversation_id).messages[1].content, 'No read on pm_project.', 'UI content has no summary')
const big = summarizeTools(Array(50).fill({ tool: 't', arguments: { q: 'y'.repeat(500) }, output: 'z'.repeat(5000) }))
assert.ok(big.length <= 4100, 'summary is bounded')
assert.ok(big.includes('more tool call(s) not summarised'))

// ---- provider failure after tools: the findings are kept for the retry ---------
script = ['{"action":"tool","tool":"check_my_access","arguments":{"table":"pm_project"}}', new Error('timeout')]
assert.throws(() => chat(undefined, 'Will fail'), /timeout/)
const failedConv = DB['x_acllens_ai_conversation'][DB['x_acllens_ai_conversation'].length - 1].sys_id
script = ['{"action":"answer","content":"Retried."}']
chat(failedConv, 'Try again')
const retry = sent[sent.length - 1].messages
assert.deepEqual(retry.map((m) => m.role), ['user', 'assistant', 'user'])
assert.ok(retry[1].content.includes('check_my_access({"table":"pm_project"})'), 'retry sees earlier tool results')

// ---- other users' conversations are not reachable ---------------------------
DB['x_acllens_ai_conversation'][0].user = 'someone_else'
assert.throws(() => chat(r1.conversation_id, 'hi'), /not found/)
assert.throws(() => getConversation(r1.conversation_id), /not found/)

// the page behind the assistant reaches the model, within limits and marked as data
script = ['{"action":"answer","content":"ok"}']
sent.length = 0
chat(undefined, 'What does this graph show?', { page: 'Reporting dashboard', run_number: 'ALR2', summary: ['Report "Differences": 61,022 differences, create 50,010.'] })
const note = sent[0].messages[0].content
assert.ok(note.includes('Reporting dashboard') && note.includes('61,022') && note.includes('ALR2'), 'page and report in the note')
assert.ok(note.includes('rather than instructions'), 'marked as data')
assert.ok(note.endsWith('What does this graph show?'), 'question last')
script = ['{"action":"answer","content":"ok"}']
sent.length = 0
chat(undefined, 'Big page', { summary: Array.from({ length: 500 }, () => 'x'.repeat(5000)) })
assert.ok(sent[0].messages[0].content.length < 7000, 'a huge page is cut down')
script = ['{"action":"answer","content":"ok"}']
sent.length = 0
chat(undefined, 'No page', {})
assert.equal(sent[0].messages[0].content, 'No page', 'nothing added without context')

console.log('agent: all tests passed')
