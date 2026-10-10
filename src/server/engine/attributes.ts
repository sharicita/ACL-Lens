import { AclResult, DataFilterInfo, FilterResult } from './types.ts'

/**
 * Security attributes (sys_security_attribute) used by ACLs and security data filters.
 * Most platform attributes are "compound" role checks such as `Role=<sys_id>^ORRole=<sys_id>`,
 * which can be resolved exactly from a subject's roles. Anything else (scripts, lookups, other
 * condition terms) stays Conditional.
 */
export interface AttributeTerm {
    kind: 'role' | 'loggedin' | 'unknown'
    /** role name for kind "role" */
    role?: string
    negate?: boolean
}

export interface AttributeInfo {
    name: string
    /** AND of OR-groups; empty when the attribute cannot be resolved statically */
    groups: AttributeTerm[][]
    resolvable: boolean
}

type Tri = 'P' | 'F' | 'C'

function or(list: Tri[]): Tri {
    if (list.indexOf('P') >= 0) return 'P'
    return list.every((x) => x === 'F') ? 'F' : 'C'
}
function and(list: Tri[]): Tri {
    if (list.indexOf('F') >= 0) return 'F'
    return list.every((x) => x === 'P') ? 'P' : 'C'
}

/** True when a script holds nothing but comments and whitespace (the platform's default template). */
export function scriptIsEmpty(script: string): boolean {
    return !(script || '')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/[^\n]*/g, '')
        .trim()
}

/**
 * Parses an encoded attribute condition into AND-of-OR groups. `roleName` maps role sys_ids to names.
 * ^OR binds a term to the one before it; ^ starts a new AND group.
 */
export function parseCondition(condition: string, roleName: { [id: string]: string }): AttributeTerm[][] {
    const q = (condition || '').trim().replace(/\^EQ$/, '')
    if (!q) return []
    if (q.indexOf('^NQ') >= 0) return [[{ kind: 'unknown' }]]
    const groups: AttributeTerm[][] = []
    for (const raw of q.split('^')) {
        const isOr = raw.indexOf('OR') === 0 && groups.length > 0
        const term = isOr ? raw.substring(2) : raw
        const m = /^([A-Za-z_]+)(!=|=)(.*)$/.exec(term)
        let t: AttributeTerm = { kind: 'unknown' }
        // a role sys_id that does not exist on the instance can never be held
        if (m && m[1] === 'Role') t = { kind: 'role', role: roleName[m[3]] || `(missing role ${m[3]})`, negate: m[2] === '!=' }
        else if (m && m[1] === 'LoggedIn' && m[2] === '=') t = { kind: 'loggedin', negate: m[3] !== 'true' }
        if (isOr) groups[groups.length - 1].push(t)
        else groups.push([t])
    }
    return groups
}

/** Outcome of an attribute for a subject that is logged in and holds `roles` (exact role names, no implicit admin). */
export function evalAttribute(info: AttributeInfo | undefined, roles: { [r: string]: boolean }): AclResult {
    if (!info || !info.resolvable || !info.groups.length) return 'C'
    return and(
        info.groups.map((g) =>
            or(
                g.map((t): Tri => {
                    if (t.kind === 'role') return !!roles[t.role as string] !== !!t.negate ? 'P' : 'F'
                    if (t.kind === 'loggedin') return t.negate ? 'F' : 'P'
                    return 'C'
                })
            )
        )
    )
}

/**
 * Whether a filter restricts the rows a subject sees. "if": applied when the attribute is met.
 * "unless": applied unless the attribute is met. A filter without an attribute always applies.
 */
export function evalDataFilter(f: DataFilterInfo, attrs: { [name: string]: AttributeInfo }, roles: { [r: string]: boolean }): FilterResult {
    if (!f.securityAttribute) return 'A'
    const met = evalAttribute(attrs[f.securityAttribute], roles)
    if (met === 'C') return 'C'
    const applies = f.mode === 'if' ? met === 'P' : met === 'F'
    return applies ? 'A' : 'N'
}
