// Offline tests for provider safety checks and strict ACL-detail shaping.
// Run with: node tests/offline/run.mjs
const assert = require('assert')
const path = require('path')
const BUILD = path.join(__dirname, '..', '..', '.test-build', 'ai')
const { normalizeType, anthropicUrl, checkEndpoint, redactSecrets } = require(path.join(BUILD, 'provider-safety.js'))
const { explainCell, HIDDEN_NOTE } = require(path.join(BUILD, 'evaluation-view.js'))

// ---- provider type ----------------------------------------------------------
assert.equal(normalizeType('anthropic'), 'anthropic')
assert.equal(normalizeType('Anthropic Claude (Messages API)'), 'anthropic', 'label typed by hand')
assert.equal(normalizeType('Azure OpenAI'), 'azure_openai')
assert.equal(normalizeType('OpenAI-compatible (chat/completions)'), 'openai_compatible')
assert.equal(normalizeType('Now Assist (Generative AI Controller)'), 'now_assist')
assert.equal(normalizeType('something else'), '', 'unknown types are not guessed')

// ---- anthropic URL ----------------------------------------------------------
assert.equal(anthropicUrl(''), 'https://api.anthropic.com/v1/messages')
assert.equal(anthropicUrl('https://api.anthropic.com'), 'https://api.anthropic.com/v1/messages')
assert.equal(anthropicUrl('https://api.anthropic.com/v1/'), 'https://api.anthropic.com/v1/messages')
assert.equal(anthropicUrl(' https://api.anthropic.com/v1/messages '), 'https://api.anthropic.com/v1/messages')

// ---- endpoint checks ---------------------------------------------------------
assert.equal(checkEndpoint('anthropic', 'https://api.anthropic.com/v1/messages', false), '')
assert.match(checkEndpoint('anthropic', 'https://api.openai.com/v1/chat/completions', false), /different AI service/, 'the incident case')
assert.match(checkEndpoint('anthropic', 'https://api.openai.com/v1', true), /different AI service/, 'custom flag never allows another vendor')
assert.match(checkEndpoint('anthropic', 'https://gateway.corp.example/v1/messages', false), /Allow custom endpoint/)
assert.equal(checkEndpoint('anthropic', 'https://gateway.corp.example/v1/messages', true), '', 'approved gateway')
assert.match(checkEndpoint('anthropic', 'http://api.anthropic.com/v1/messages', false), /https/)
assert.match(checkEndpoint('anthropic', 'https://api.anthropic.com.evil.example/v1/messages', false), /not a anthropic.com/, 'look-alike host')
assert.equal(checkEndpoint('azure_openai', 'https://myres.openai.azure.com/openai/deployments/x/chat/completions?api-version=2024-10-21', false), '')
assert.match(checkEndpoint('azure_openai', 'https://api.openai.com/v1/chat/completions', false), /different AI service/)
assert.equal(checkEndpoint('openai_compatible', 'https://api.openai.com/v1/chat/completions', false), '')
assert.equal(checkEndpoint('openai_compatible', 'https://llm.corp.example/v1/chat/completions', false), '', 'generic type: any https host')
assert.match(checkEndpoint('openai_compatible', 'not a url', false), /valid URL/)
assert.equal(checkEndpoint('now_assist', '', false), '')

// ---- redaction --------------------------------------------------------------
const echoed = 'Incorrect API key provided: sk-ant-u*******************************6QAA. You can find your API key at https://platform.openai.com/account/api-keys.'
const r1 = redactSecrets(echoed)
assert.ok(!/sk-ant/.test(r1) && !/6QAA/.test(r1), r1)
assert.ok(r1.includes('platform.openai.com'), 'non-secret text kept')
const key = 'sk-ant-api03-ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-wxyz6QAA'
const r2 = redactSecrets(`bad key ${key} and tail 6QAA and head sk-ant-api03-ABCD`, key)
assert.ok(!r2.includes(key) && !r2.includes('6QAA') && !r2.includes('ABCD'), r2)
assert.ok(!/Bearer abcdefghijklmnop/.test(redactSecrets('Authorization: Bearer abcdefghijklmnopqrstuv')))
assert.equal(redactSecrets('Model not found: claude-x'), 'Model not found: claude-x', 'ordinary errors unchanged')

// ---- strict ACL detail (option A) ------------------------------------------------
const acls = [
    { name: 'incident', decision: 'allow', roles: ['sn_incident_write'] },
    { name: 'incident', decision: 'allow', roles: ['problem_coordinator'] },
    { name: 'incident', decision: 'deny', roles: [] },
]
const cell = { s: 'C', lvl: 'incident', dlvl: 'incident', a: [{ i: 2, r: 'P', c: 'open' }, { i: 0, r: 'C', c: 'cond' }, { i: 1, r: 'F', c: 'norole' }] }
const full = explainCell(cell, acls, true)
assert.equal(full.acls.length, 3)
assert.deepEqual(full.acls[0].roles, [])
assert.equal(full.matched_level, 'incident')
const strict = explainCell(cell, acls, false)
const text = JSON.stringify(strict)
assert.equal(strict.status, 'conditional')
assert.ok(!text.includes('sn_incident_write') && !text.includes('problem_coordinator'), 'no role names')
assert.ok(!('acls' in strict) && !('matched_level' in strict), 'no ACL names or levels')
assert.deepEqual(strict.reasons, [
    'deny-unless rule pass: no roles/condition/script',
    'allow rule conditional: depends on condition',
    'allow rule fail: missing required role',
])
assert.ok(/cannot read ACL definitions/.test(HIDDEN_NOTE))

console.log('safety: all tests passed')
