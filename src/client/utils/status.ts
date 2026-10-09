import { Status } from '../types'

export const STATUS_LABEL: { [s: string]: string } = {
    G: 'Granted',
    C: 'Conditional',
    D: 'Denied',
    N: 'No rule',
}

export const STATUS_SHORT: { [s: string]: string } = { G: 'G', C: 'C', D: 'D', N: '–' }

export const OP_SHORT: { [op: string]: string } = { create: 'C', read: 'R', write: 'W', delete: 'D' }

export function statusText(s: Status, defaultDeny: boolean): string {
    if (s === 'N') return defaultDeny ? 'No rule (denied by default)' : 'No rule (allowed by default)'
    return STATUS_LABEL[s]
}

/** Effective access rank: 2 full, 1 conditional, 0 none. */
export function rank(s: Status, defaultDeny: boolean): number {
    if (s === 'G') return 2
    if (s === 'C') return 1
    if (s === 'N') return defaultDeny ? 0 : 2
    return 0
}

export const REASON_TEXT: { [c: string]: string } = {
    open: 'No roles, condition or script – anyone passes',
    role: 'Holds a required role',
    admin: 'Admin with "Admin overrides"',
    adminrole: 'Admin implicitly satisfies the role requirement',
    norole: 'Missing every required role',
    elev: 'Only via an elevated-privilege role (must elevate in session)',
    cond: 'Role OK – depends on the ACL condition (record dependent)',
    script: 'Role OK – depends on the ACL script',
    attr: 'Role OK – depends on a security attribute',
    attrfail: 'Security attribute fails for this subject',
    scope: 'Role OK – "Applies to" filter limits which records',
}

export const RESULT_TEXT: { [r: string]: string } = { P: 'Pass', C: 'Conditional', F: 'Fail' }
