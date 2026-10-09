#!/usr/bin/env node
// Rewrites this copy of the project to use your application scope, in place.
//
// Use it only for installs that build from the repository itself (ServiceNow IDE Git import, or
// a fork's branch). For installs from this computer, use "npm run setup" / "npm run deploy",
// which keep the committed source unchanged.
//
//   node tools/scope.mjs x_12345_acllens [--scope-id <32-char sys_id>]
import fs from 'node:fs'
import path from 'node:path'
import { ROOT, SOURCE_SCOPE, newSysId, validateProfile } from './lib/profiles.mjs'

const [scope, ...rest] = process.argv.slice(2)
const i = rest.indexOf('--scope-id')
const scopeId = i >= 0 ? rest[i + 1] : newSysId()

const errors = validateProfile({ scope, scopeId, alias: 'unused' })
if (errors.length) {
    console.error(errors.join('\n'))
    process.exit(1)
}

const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'now.config.json'), 'utf8'))
const from = config.scope
if (from !== SOURCE_SCOPE) console.warn(`Note: this copy already uses ${from}; changing it to ${scope}.`)

const TEXT_EXT = new Set(['.ts', '.tsx', '.js', '.mjs', '.json', '.html', '.css'])
let changed = 0
function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name)
        if (e.isDirectory()) walk(p)
        else if (TEXT_EXT.has(path.extname(e.name))) {
            const s = fs.readFileSync(p, 'utf8')
            if (s.includes(from)) {
                fs.writeFileSync(p, s.split(from).join(scope))
                changed++
            }
        }
    }
}
walk(path.join(ROOT, 'src'))
for (const f of ['tests/offline/agent.test.js', 'now.prebuild.mjs']) {
    const p = path.join(ROOT, f)
    if (fs.existsSync(p)) {
        const s = fs.readFileSync(p, 'utf8')
        if (s.includes(from)) fs.writeFileSync(p, s.split(from).join(scope))
    }
}
config.scope = scope
config.scopeId = scopeId
fs.writeFileSync(path.join(ROOT, 'now.config.json'), JSON.stringify(config, null, 4) + '\n')
console.log(`Scope set to ${scope} (scope ID ${scopeId}) in now.config.json and ${changed} source files.`)
