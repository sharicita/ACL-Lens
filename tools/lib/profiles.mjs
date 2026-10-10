// Install profiles: the instance-specific values that must never be committed.
// They live in acl-lens.local.json (git-ignored) next to package.json.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
export const PROFILE_FILE = path.join(ROOT, 'acl-lens.local.json')
/** The scope written in the committed source. Each profile replaces it with its own scope. */
export const SOURCE_SCOPE = 'x_acllens'

const SCOPE_RE = /^x_[a-z0-9_]+$/
const ID_RE = /^[0-9a-f]{32}$/
const ALIAS_RE = /^[A-Za-z0-9._-]{1,64}$/
const NAME_RE = /^[a-z0-9][a-z0-9_-]{0,31}$/

export function newSysId() {
    return crypto.randomBytes(16).toString('hex')
}

/** Returns a list of problems with a profile (empty when it is valid). */
export function validateProfile(p) {
    const errors = []
    if (!p || typeof p !== 'object') return ['Profile is missing.']
    if (!SCOPE_RE.test(p.scope || '')) errors.push('Scope must start with x_ and use only lowercase letters, numbers and underscores.')
    else if (p.scope.length > 18) errors.push('Scope can be at most 18 characters.')
    if (!ID_RE.test(p.scopeId || '')) errors.push('Scope ID must be a 32-character sys_id.')
    if (!ALIAS_RE.test(p.alias || '')) errors.push('Login alias may use letters, numbers, dot, dash and underscore.')
    if (p.instance) {
        try {
            const u = new URL(p.instance)
            if (u.protocol !== 'https:') errors.push('Instance URL must use https.')
        } catch {
            errors.push('Instance URL is not a valid URL.')
        }
    }
    return errors
}

export function validName(name) {
    return NAME_RE.test(name || '')
}

export function readProfiles() {
    if (!fs.existsSync(PROFILE_FILE)) return { default: '', profiles: {} }
    const data = JSON.parse(fs.readFileSync(PROFILE_FILE, 'utf8'))
    return { default: data.default || '', profiles: data.profiles || {} }
}

export function saveProfile(name, profile, makeDefault = true) {
    if (!validName(name)) throw new Error('Profile name may use lowercase letters, numbers, dash and underscore.')
    const errors = validateProfile(profile)
    if (errors.length) throw new Error(errors.join(' '))
    const data = readProfiles()
    data.profiles[name] = {
        instance: profile.instance || '',
        alias: profile.alias,
        scope: profile.scope,
        scopeId: profile.scopeId,
    }
    if (makeDefault || !data.default) data.default = name
    fs.writeFileSync(PROFILE_FILE, JSON.stringify(data, null, 4) + '\n')
    return data
}

export function getProfile(name) {
    const data = readProfiles()
    const names = Object.keys(data.profiles)
    // with more than one instance configured, never guess which one to change
    if (!name && names.length > 1)
        throw new Error(`Several install profiles exist (${names.join(', ')}). Name the one to use, for example: npm run deploy -- --profile ${data.default || names[0]}`)
    const key = name || data.default
    if (!key) throw new Error('No install profile yet. Run "npm run setup" (guided) or "npm run profile -- add" first.')
    const p = data.profiles[key]
    if (!p) throw new Error(`No profile named "${key}". Known profiles: ${Object.keys(data.profiles).join(', ') || 'none'}.`)
    const errors = validateProfile(p)
    if (errors.length) throw new Error(`Profile "${key}" is invalid: ${errors.join(' ')}`)
    return { name: key, ...p }
}
