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
        log(`Installing on the instance saved as "${profile.alias}"…`)
        await runSdk(['install', '--auth', profile.alias], ws, log)
    }
    if (opts.pack) {
        await runSdk(['pack'], ws, log)
        log(`Package written under .deploy/${profile.name}/target`)
    }
    return ws
}
