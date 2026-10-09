// Shapes ACL Lens evaluation results for the assistant according to what the signed-in user may
// read. No Glide imports, so it is unit-tested offline.

export const REASONS: { [c: string]: string } = {
    open: 'no roles/condition/script',
    role: 'holds a required role',
    admin: 'admin override',
    adminrole: 'admin satisfies role',
    norole: 'missing required role',
    elev: 'requires role elevation',
    cond: 'depends on condition',
    script: 'depends on script',
    attr: 'depends on security attribute',
    attrfail: 'security attribute fails',
    scope: 'applies-to filter',
}

const STATUS: { [s: string]: string } = { G: 'granted', C: 'conditional', D: 'denied', N: 'no rule (default mode)' }
const RESULT: { [r: string]: string } = { P: 'pass', C: 'conditional', F: 'fail' }

export const HIDDEN_NOTE =
    'ACL names, matched rule levels and required roles are hidden because the signed-in user cannot read ACL definitions (sys_security_acl). Only outcomes and general reasons are shown.'

interface AclLike {
    name: string
    decision: string
    roles: string[]
}

interface CellLike {
    s: string
    lvl?: string
    dlvl?: string
    a: { i: number; r: string; c: string }[]
}

/**
 * detail = true: full explanation (ACL names, roles, levels) - only when the user can read ACLs.
 * detail = false: outcome plus distinct, name-free reasons, e.g. "conditional: depends on condition".
 */
export function explainCell(cell: CellLike, acls: AclLike[], detail: boolean) {
    if (detail) {
        return {
            status: STATUS[cell.s],
            matched_level: cell.lvl || null,
            deny_unless_level: cell.dlvl || null,
            acls: cell.a.map((o) => ({
                name: acls[o.i].name,
                decision: acls[o.i].decision,
                roles: acls[o.i].roles,
                result: RESULT[o.r],
                why: REASONS[o.c] || o.c,
            })),
        }
    }
    const reasons: string[] = []
    for (const o of cell.a) {
        const decision = acls[o.i] && acls[o.i].decision === 'deny' ? 'deny-unless rule' : 'allow rule'
        const text = `${decision} ${RESULT[o.r]}: ${REASONS[o.c] || 'other'}`
        if (reasons.indexOf(text) < 0) reasons.push(text)
    }
    return { status: STATUS[cell.s], reasons }
}
