// Builds and installs ACL Lens for one install profile.
//
// The committed source uses the placeholder scope "x_acllens". A profile build copies the project
// into .deploy/<profile>/ (git-ignored), replaces the placeholder with the profile's scope and
// scope ID, and runs the ServiceNow SDK there. The committed source is never changed, except that
// new record keys the SDK adds to keys.ts are copied back (with the placeholder restored).
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { ROOT, SOURCE_SCOPE } from './profiles.mjs'

const TEXT_EXT = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.json', '.html', '.css', '.md', '.xml', '.txt'])
const ROOT_FILES = ['package.json', 'now.prebuild.mjs', 'now.dev.mjs']
const COPY_DIRS = ['src', '@types']
const KEYS = path.join('src', 'fluent', 'generated', 'keys.ts')

function replaceAll(text, from, to) {
    return from === to ? text : text.split(from).join(to)
}

function copyTree(src, dest, scope) {
    fs.mkdirSync(dest, { recursive: true })
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        const s = path.join(src, entry.name)
        const d = path.join(dest, entry.name)
        if (entry.isDirectory()) copyTree(s, d, scope)
        else if (TEXT_EXT.has(path.extname(entry.name))) fs.writeFileSync(d, replaceAll(fs.readFileSync(s, 'utf8'), SOURCE_SCOPE, scope))
        else fs.copyFileSync(s, d)
    }
}

/** Mirrors one changed project file (path relative to the root) into the workspace. */
export function syncFile(profile, rel) {
    const s = path.join(ROOT, rel)
    const d = path.join(workspaceDir(profile), rel)
    if (!fs.existsSync(s)) return fs.rmSync(d, { force: true, recursive: true })
    if (fs.statSync(s).isDirectory()) return
    fs.mkdirSync(path.dirname(d), { recursive: true })
    if (TEXT_EXT.has(path.extname(s))) fs.writeFileSync(d, replaceAll(fs.readFileSync(s, 'utf8'), SOURCE_SCOPE, profile.scope))
    else fs.copyFileSync(s, d)
}

export function workspaceDir(profile) {
    return path.join(ROOT, '.deploy', profile.name)
}

/** Creates or refreshes .deploy/<profile>/ from the current source. */
export function prepareWorkspace(profile) {
    const ws = workspaceDir(profile)
    fs.mkdirSync(ws, { recursive: true })
    for (const dir of COPY_DIRS) {
        fs.rmSync(path.join(ws, dir), { recursive: true, force: true })
        if (fs.existsSync(path.join(ROOT, dir))) copyTree(path.join(ROOT, dir), path.join(ws, dir), profile.scope)
    }
    for (const f of ROOT_FILES) {
        if (fs.existsSync(path.join(ROOT, f))) fs.writeFileSync(path.join(ws, f), replaceAll(fs.readFileSync(path.join(ROOT, f), 'utf8'), SOURCE_SCOPE, profile.scope))
    }
    const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'now.config.json'), 'utf8'))
    config.scope = profile.scope
    config.scopeId = profile.scopeId
    fs.writeFileSync(path.join(ws, 'now.config.json'), JSON.stringify(config, null, 4) + '\n')

    const nm = path.join(ws, 'node_modules')
    if (!fs.existsSync(nm)) {
        if (!fs.existsSync(path.join(ROOT, 'node_modules'))) throw new Error('Dependencies are not installed yet. Run "npm ci" first.')
        fs.symlinkSync(path.join(ROOT, 'node_modules'), nm, 'junction')
    }
    return ws
}

/** Copies keys the SDK added during the profile build back to the committed keys.ts. */
export function syncKeysBack(profile) {
    const built = path.join(workspaceDir(profile), KEYS)
    if (!fs.existsSync(built)) return false
    const restored = replaceAll(fs.readFileSync(built, 'utf8'), profile.scope, SOURCE_SCOPE)
    const target = path.join(ROOT, KEYS)
    if (fs.existsSync(target) && fs.readFileSync(target, 'utf8') === restored) return false
    fs.writeFileSync(target, restored)
    return true
}

function sdkBin() {
    // The SDK's package "exports" hide its files from require.resolve, so look in node_modules directly.
    const require = createRequire(path.join(ROOT, 'package.json'))
    for (const dir of require.resolve.paths('@servicenow/sdk') || []) {
        const bin = path.join(dir, '@servicenow', 'sdk', 'bin', 'index.js')
        if (fs.existsSync(bin)) return bin
    }
    throw new Error('The ServiceNow SDK is not installed. Run "npm ci" first.')
}

/** Runs one now-sdk command in the workspace. Output lines go to log(line, isError). */
export function runSdk(args, cwd, log) {
    return new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [sdkBin(), ...args], { cwd, env: process.env })
        const pipe = (stream, isError) => {
            let buf = ''
            stream.on('data', (chunk) => {
                buf += chunk.toString()
                const lines = buf.split(/\r?\n/)
                buf = lines.pop()
                for (const l of lines) log(l, isError)
            })
            stream.on('end', () => buf && log(buf, isError))
        }
        pipe(child.stdout, false)
        pipe(child.stderr, true)
        child.on('error', reject)
        child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`now-sdk ${args[0]} failed (exit code ${code}).`))))
    })
}

/** Runs now-sdk and returns its stdout (for queries). */
function sdkOutput(args, cwd) {
    return new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [sdkBin(), ...args], { cwd, env: process.env })
        let out = ''
        child.stdout.on('data', (d) => (out += d))
        child.on('error', reject)
        child.on('close', (code) => (code === 0 ? resolve(out) : reject(new Error(`now-sdk ${args[0]} failed (exit code ${code}).`))))
    })
}

/**
 * Polls an install's execution tracker (read-only) until it finishes. States: 0 pending,
 * 1 running, 2 successful, 3 failed, 4 cancelled.
 */
export async function waitForTracker(id, alias, cwd, log, timeoutMs = 20 * 60 * 1000) {
    const started = Date.now()
    let last = ''
    while (Date.now() - started < timeoutMs) {
        const out = await sdkOutput(['query', 'sys_execution_tracker', '-q', `sys_id=${id}`, '-f', 'state,percent_complete,message', '-o', 'json', '--auth', alias], cwd)
        const rec = (JSON.parse(out.slice(out.indexOf('{'))).records || [])[0]
        if (!rec) throw new Error('The install tracker record was not found on the instance.')
        const note = `Install ${rec.percent_complete || 0}%${rec.message ? `: ${rec.message}` : ''}`
        if (note !== last) log(note)
        last = note
        if (rec.state === '2') return
        if (rec.state === '3' || rec.state === '4') throw new Error(`The install did not succeed on the instance: ${rec.message || 'see the install tracker'}.`)
        await new Promise((r) => setTimeout(r, 10000))
    }
    throw new Error('Still installing after 20 minutes. Check the install tracker on the instance.')
}

/**
 * Read-only check before an install: if the instance already has an app with this scope, the
 * profile's scope ID must be that app's sys_id. Otherwise the platform answers "Unable to install
 * application as application was null" (the package names an app that doesn't exist there).
 */
export async function checkInstalledApp(profile, cwd) {
    let out
    try {
        out = await sdkOutput(['query', 'sys_app', '-q', `scope=${profile.scope}`, '-f', 'sys_id', '-o', 'json', '--auth', profile.alias], cwd)
    } catch (e) {
        return // can't check (for example no read access); the install reports its own errors
    }
    const rec = (JSON.parse(out.slice(out.indexOf('{'))).records || [])[0]
    if (rec && rec.sys_id && rec.sys_id !== profile.scopeId)
        throw new Error(
            `The instance already has ${profile.scope} installed with scope ID ${rec.sys_id}, but profile "${profile.name}" uses ${profile.scopeId}. ` +
                `Nothing was installed. Point the profile at the installed app, then deploy again:\n` +
                `  npm run profile -- add ${profile.name} --alias ${profile.alias} --scope ${profile.scope} --scope-id ${rec.sys_id}${profile.instance ? ` --instance ${profile.instance}` : ''}`
        )
}

/**
 * Builds the profile, then installs and/or packs it.
 * @param {{name:string, alias:string, scope:string, scopeId:string}} profile
 * @param {{install?: boolean, pack?: boolean, log?: (line:string, isError?:boolean) => void}} opts
 */
export async function buildProfile(profile, opts = {}) {
    const log = opts.log || ((l, e) => (e ? console.error(l) : console.log(l)))
    log(`Preparing ${profile.scope} (profile "${profile.name}") in .deploy/${profile.name}`)
    const ws = prepareWorkspace(profile)
    await runSdk(['build'], ws, log)
    if (syncKeysBack(profile)) log('Copied new record keys back to src/fluent/generated/keys.ts (commit this file).')
    if (opts.install) {
        await checkInstalledApp(profile, ws)
        log(`Installing on the instance saved as "${profile.alias}"…`)
        const seen = []
        try {
            await runSdk(['install', '--auth', profile.alias], ws, (line, isError) => {
                seen.push(line)
                log(line, isError)
            })
        } catch (e) {
            // Some accounts may send the install but not read its progress ("Forbidden"). The install
            // keeps running on the instance, so follow its tracker record instead of failing.
            const m = seen.join('\n').match(/Unable to track app install status[\s\S]*?sys_execution_tracker\.do\?sys_id=([0-9a-f]{32})/)
            if (!m) throw e
            log('The SDK could not read the install progress, so following the install tracker on the instance instead…')
            await waitForTracker(m[1], profile.alias, ws, log)
        }
    }
    if (opts.pack) {
        await runSdk(['pack'], ws, log)
        log(`Package written under .deploy/${profile.name}/target`)
    }
    return ws
}
