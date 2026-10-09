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

// ---- fake provider: scripted replies, records what it was sent ---------
const sent = []
let script = []
const providers = {
    pickProvider: () => ({ sys_id: 'p1', name: 'Fake', type: 'anthropic' }),
    complete: (p, system, messages) => { sent.push({ system, messages: JSON.parse(JSON.stringify(messages)) }); return script.shift() },
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

const { chat, parseAction, getConversation, listConversations } = require(path.join(__dirname, '..', '..', '.test-build', 'ai', 'agent.js'))

// ---- parseAction ----------------------------------------------------------
assert.deepEqual(parseAction('{"action":"tool","tool":"t","arguments":{"a":1}}'), { action: 'tool', tool: 't', arguments: { a: 1 } })
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

// ---- runaway tool loop is capped -------------------------------------------
script = Array(10).fill('{"action":"tool","tool":"check_my_access","arguments":{"table":"x"}}')
const r3 = chat(undefined, 'loop forever')
assert.equal(r3.tools_used.length, 6)
assert.ok(r3.answer.includes('could not finish'))

// ---- other users' conversations are not reachable ---------------------------
DB['x_acllens_ai_conversation'][0].user = 'someone_else'
assert.throws(() => chat(r1.conversation_id, 'hi'), /not found/)
assert.throws(() => getConversation(r1.conversation_id), /not found/)
console.log('agent: all tests passed')
