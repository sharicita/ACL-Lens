#!/usr/bin/env node
// Guided setup for ACL Lens: "npm run setup".
//
// Starts a small web page on this computer only (127.0.0.1) that walks through installing the app:
// dependencies, ServiceNow login, application scope, install, next steps. It uses Node's built-in
// modules only, so it works before "npm ci".
//
// Safety: the server listens on 127.0.0.1 only, every API call needs the one-time token from the
// URL it prints, and the Host header must match (blocks DNS-rebinding). Passwords are passed
// straight to the ServiceNow SDK ("now-sdk auth --password-stdin"), which keeps them in the
// operating system's credential store; this server never writes or logs them.
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { ROOT, newSysId, readProfiles, saveProfile, validName } from '../lib/profiles.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const TOKEN = crypto.randomBytes(24).toString('hex')
const MIN_NODE = [20, 18]
const IDLE_LIMIT_MS = 60 * 60 * 1000
const STATIC = { '/': ['wizard.html', 'text/html'], '/wizard.css': ['wizard.css', 'text/css'], '/wizard.js': ['wizard.js', 'text/javascript'] }
const DOCS = { 'INSTALL.md': 'INSTALL.md', 'install-and-deploy.md': 'docs/install-and-deploy.md', 'user-guide.md': 'docs/user-guide.md' }

let port = 0
let lastSeen = Date.now()

// ---- one background job at a time (npm ci, install) ------------------------------------------
const job = { id: 0, name: '', running: false, ok: null, error: '', lines: [] }
function startJob(name, fn) {
    if (job.running) throw new Error(`Please wait: "${job.name}" is still running.`)
    Object.assign(job, { id: job.id + 1, name, running: true, ok: null, error: '', lines: [] })
    const log = (line) => {
        job.lines.push(String(line))
        if (job.lines.length > 2000) job.lines.splice(0, job.lines.length - 2000)
    }
    Promise.resolve()
        .then(() => fn(log))
        .then(
            () => Object.assign(job, { running: false, ok: true }),
            (e) => Object.assign(job, { running: false, ok: false, error: e.message || String(e) })
        )
    return job.id
}

// ---- helpers ---------------------------------------------------------------------------------
function sdkBin() {
    const bin = path.join(ROOT, 'node_modules', '@servicenow', 'sdk', 'bin', 'index.js')
    return fs.existsSync(bin) ? bin : ''
}

/** Runs now-sdk and returns its output. stdinText is written to the process and never logged. */
function sdk(args, stdinText) {
    return new Promise((resolve, reject) => {
        const bin = sdkBin()
        if (!bin) return reject(new Error('The ServiceNow SDK is not installed yet. Complete step 1 first.'))
        const child = spawn(process.execPath, [bin, ...args], { cwd: ROOT })
        let out = ''
        let err = ''
        child.stdout.on('data', (d) => (out += d))
        child.stderr.on('data', (d) => (err += d))
        child.on('error', reject)
        child.on('close', (code) => (code === 0 ? resolve(out) : reject(new Error(clean(err || out) || `now-sdk ${args[0]} failed.`))))
        if (stdinText !== undefined) child.stdin.end(stdinText)
        else child.stdin.end()
    })
}

function clean(text) {
    return String(text)
        .replace(/\x1b\[[0-9;]*m/g, '')
        .split(/\r?\n/)
        .filter((l) => l.trim() && !/npm notice/.test(l))
        .slice(-8)
        .join('\n')
}

async function query(alias, table, q, fields) {
    const out = await sdk(['query', table, '-q', q, '-f', fields, '--limit', '20', '-o', 'json', '--auth', alias])
    const start = out.indexOf('{')
    const data = JSON.parse(out.slice(start))
    if (!data.ok) throw new Error(data.error || 'The instance query failed.')
    return data.records || []
}

async function listLogins() {
    if (!sdkBin()) return []
    const out = clean(await sdk(['auth', '--list']).catch(() => ''))
    const logins = []
    for (const line of out.split('\n')) {
        const m = line.match(/^\s*\*?\[(.+)\]\s*$/)
        if (m) logins.push({ alias: m[1], host: '', isDefault: line.trim().startsWith('*') })
        const h = line.match(/^\s*host = (.+)$/)
        if (h && logins.length) logins[logins.length - 1].host = h[1].trim()
    }
    return logins
}

function normalizeInstance(input) {
    let s = String(input || '').trim()
    if (!s) throw new Error('Enter your instance address.')
    if (/^[a-z0-9-]+$/i.test(s)) s = `https://${s}.service-now.com`
    if (!/^https?:\/\//i.test(s)) s = `https://${s}`
    const u = new URL(s)
    if (u.protocol !== 'https:') throw new Error('The instance address must start with https://')
    return u.origin
}

function nodeOk() {
    const [maj, min] = process.versions.node.split('.').map(Number)
    return maj > MIN_NODE[0] || (maj === MIN_NODE[0] && min >= MIN_NODE[1])
}

function npmCi(log) {
    return new Promise((resolve, reject) => {
        const child = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['ci', '--no-audit', '--no-fund'], { cwd: ROOT, shell: process.platform === 'win32' })
        const each = (d) => clean(d).split('\n').forEach((l) => l && log(l))
        child.stdout.on('data', each)
        child.stderr.on('data', each)
        child.on('error', reject)
        child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`npm ci failed (exit code ${code}).`))))
    })
}

// ---- API -------------------------------------------------------------------------------------
const api = {
    async 'GET /api/status'() {
        const profiles = readProfiles()
        return {
            node: process.versions.node,
            nodeOk: nodeOk(),
            nodeMin: MIN_NODE.join('.'),
            depsInstalled: !!sdkBin(),
            profiles,
            logins: await listLogins(),
        }
    },
    async 'POST /api/deps'() {
        return { job: startJob('Install dependencies', npmCi) }
    },
    async 'POST /api/login'(b) {
        const instance = normalizeInstance(b.instance)
        const alias = String(b.alias || '').trim()
        if (!/^[A-Za-z0-9._-]{1,64}$/.test(alias)) throw new Error('The login name may use letters, numbers, dot, dash and underscore.')
        const username = String(b.username || '').trim()
        if (!username) throw new Error('Enter your ServiceNow user name.')
        if (!b.password) throw new Error('Enter your password.')
        try {
            await sdk(['auth', '--add', instance, '--type', 'basic', '--alias', alias, '--username', username, '--password-stdin'], String(b.password))
        } catch (e) {
            throw new Error(String(e.message).split(String(b.password)).join('••••'))
        }
        return { alias, instance }
    },
    async 'POST /api/inspect'(b) {
        const alias = String(b.alias || '')
        const login = (await listLogins()).find((l) => l.alias === alias)
        if (!login) throw new Error('That saved login was not found. Add it in step 2.')
        const [prop] = await query(alias, 'sys_properties', 'name=glide.appcreator.company.code', 'value')
        const code = ((prop && prop.value) || '').toLowerCase().replace(/[^a-z0-9]/g, '')
        const prefix = code ? `x_${code}_` : 'x_'
        let suggested = `${prefix}acllens`
        if (suggested.length > 18) suggested = `${prefix}acl`.slice(0, 18)
        const existing = await query(alias, 'sys_app', 'nameSTARTSWITHACL Lens^ORscopeLIKEacllens', 'name,scope,sys_id,version')
        return { instance: login.host, prefix, companyCode: code, suggested, existing }
    },
    async 'POST /api/check-scope'(b) {
        const scope = String(b.scope || '')
        const rows = await query(String(b.alias || ''), 'sys_scope', `scope=${scope}`, 'name,scope,sys_id')
        return { taken: rows.length > 0, app: rows[0] || null }
    },
    async 'POST /api/profile'(b) {
        if (!validName(b.name)) throw new Error('Profile name may use lowercase letters, numbers, dash and underscore (start with a letter or number).')
        saveProfile(b.name, { instance: b.instance, alias: b.alias, scope: b.scope, scopeId: b.scopeId || newSysId() }, true)
        return { profiles: readProfiles() }
    },
    async 'POST /api/install'(b) {
        const { getProfile } = await import('../lib/profiles.mjs')
        const { buildProfile } = await import('../lib/workspace.mjs')
        const profile = getProfile(b.name)
        return { job: startJob('Install ACL Lens', (log) => buildProfile(profile, { install: true, log: (l) => log(clean(l)) })) }
    },
    async 'GET /api/job'(_b, url) {
        const since = Number(url.searchParams.get('since') || 0)
        return { id: job.id, name: job.name, running: job.running, ok: job.ok, error: job.error, total: job.lines.length, lines: job.lines.slice(since) }
    },
    async 'POST /api/quit'() {
        setTimeout(() => process.exit(0), 200)
        return { bye: true }
    },
}

function send(res, status, body, type = 'application/json') {
    res.writeHead(status, {
        'Content-Type': `${type}; charset=utf-8`,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer',
        'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    })
    res.end(type === 'application/json' ? JSON.stringify(body) : body)
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        let data = ''
        req.on('data', (c) => {
            data += c
            if (data.length > 64 * 1024) reject(new Error('Request too large.'))
        })
        req.on('end', () => {
            try {
                resolve(data ? JSON.parse(data) : {})
            } catch {
                reject(new Error('Invalid request.'))
            }
        })
    })
}

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://127.0.0.1:${port}`)
    if (req.headers.host !== `127.0.0.1:${port}` && req.headers.host !== `localhost:${port}`) return send(res, 421, { error: 'Wrong host.' })
    lastSeen = Date.now()
    try {
        if (req.method === 'GET' && STATIC[url.pathname]) {
            const [file, type] = STATIC[url.pathname]
            return send(res, 200, fs.readFileSync(path.join(HERE, file), 'utf8'), type)
        }
        if (req.method === 'GET' && url.pathname.startsWith('/docs/')) {
            const rel = DOCS[url.pathname.slice('/docs/'.length)]
            if (!rel) return send(res, 404, 'Not found', 'text/plain')
            return send(res, 200, fs.readFileSync(path.join(ROOT, rel), 'utf8'), 'text/plain')
        }
        const handler = api[`${req.method} ${url.pathname}`]
        if (!handler) return send(res, 404, { error: 'Not found.' })
        const given = Buffer.from(String(req.headers['x-setup-token'] || ''))
        const want = Buffer.from(TOKEN)
        if (given.length !== want.length || !crypto.timingSafeEqual(given, want)) return send(res, 403, { error: 'This setup page has expired. Use the address printed in the terminal.' })
        const body = req.method === 'POST' ? await readBody(req) : {}
        send(res, 200, await handler(body, url))
    } catch (e) {
        send(res, 400, { error: e.message || String(e) })
    }
})

server.listen(0, '127.0.0.1', () => {
    port = server.address().port
    const link = `http://127.0.0.1:${port}/#${TOKEN}`
    console.log('\nACL Lens guided setup is running on this computer only.')
    console.log(`Open this address in your browser if it did not open by itself:\n\n  ${link}\n`)
    console.log('Keep this window open while you use the setup. Press Ctrl+C to stop.\n')
    if (!process.argv.includes('--no-open')) {
        const opener = process.platform === 'win32' ? ['cmd', ['/c', 'start', '', link]] : process.platform === 'darwin' ? ['open', [link]] : ['xdg-open', [link]]
        try {
            spawn(opener[0], opener[1], { stdio: 'ignore', detached: true }).on('error', () => {}).unref()
        } catch {
            /* the address is printed above */
        }
    }
})

setInterval(() => {
    if (!job.running && Date.now() - lastSeen > IDLE_LIMIT_MS) {
        console.log('Setup closed after an hour without activity.')
        process.exit(0)
    }
}, 60 * 1000).unref()
