import { Status } from '../types'

export const STATUS_LABEL: { [s: string]: string } = {
    G: 'Granted',
    C: 'Conditional',
    D: 'Denied',
    N: 'No rule',
}

export const STATUS_SHORT: { [s: string]: string } = { G: 'G', C: 'C', D: 'D', N: '–' }

export const OP_SHORT: { [op: string]: string } = {
    create: 'C',
    read: 'R',
    write: 'W',
    delete: 'D',
    list_edit: 'LE',
    query_match: 'QM',
    query_range: 'QR',
    add_to_list: 'AL',
    save_as_template: 'ST',
    report_on: 'RO',
    personalize_choices: 'PC',
    report_view: 'RV',
}

/** what each table operation controls */
export const OP_HELP: { [op: string]: string } = {
    create: 'Create records',
    read: 'Read records',
    write: 'Update records',
    delete: 'Delete records',
    list_edit: 'Edit records from a list',
    query_match: 'Filter with exact-match operators (is, is not, is empty)',
    query_range: 'Filter with range operators (starts with, contains, greater than…) and sort',
    add_to_list: 'Add columns to a list (personalize list)',
    save_as_template: 'Save a record as a template',
    report_on: 'Create reports on the table',
    personalize_choices: 'Personalize choice lists',
    report_view: 'See the table in reports',
}

/**
 * What the platform does when no ACL matches an operation. create/read/write/delete follow
 * glide.sm.default_mode. For the others the platform has its own answer, confirmed with live checks:
 * query_match and report_on are allowed; list_edit, add_to_list, save_as_template and
 * personalize_choices are blocked. query_range and report_view normally have a "*" rule.
 */
const NO_RULE: { [op: string]: 'allow' | 'deny' } = {
    query_match: 'allow',
    report_on: 'allow',
    list_edit: 'deny',
    add_to_list: 'deny',
    save_as_template: 'deny',
    personalize_choices: 'deny',
}

function noRuleAllows(defaultDeny: boolean, op?: string): boolean {
    const d = op ? NO_RULE[op] : undefined
    return d ? d === 'allow' : !defaultDeny
}

export function statusText(s: Status, defaultDeny: boolean, op?: string): string {
    if (s === 'N') {
        if (op && NO_RULE[op]) return NO_RULE[op] === 'allow' ? 'No rule (the platform allows this operation when no rule exists)' : 'No rule (the platform blocks this operation when no rule exists)'
        return noRuleAllows(defaultDeny, op) ? 'No rule (allowed by default)' : 'No rule (denied by default)'
    }
    return STATUS_LABEL[s]
}

/** Effective access rank: 2 full, 1 conditional, 0 none. */
export function rank(s: Status, defaultDeny: boolean, op?: string): number {
    if (s === 'G') return 2
    if (s === 'C') return 1
    if (s === 'N') return noRuleAllows(defaultDeny, op) ? 2 : 0
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
