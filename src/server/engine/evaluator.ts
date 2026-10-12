import { AclIndex } from './acl-index.ts'
import { AttributeInfo, evalAttribute } from './attributes.ts'
import { AclInfo, AclOutcome, AclResult, Cell, DataFilterOutcome, Op, Reason, Status, Subject } from './types.ts'

/** Security attributes whose outcome is known without a session/record. */
const ATTR_ALWAYS_PASS: { [k: string]: boolean } = {
    UserIsAuthenticated: true,
    user_is_authenticated: true,
    AlwaysTrue: true,
}
const ATTR_ALWAYS_FAIL: { [k: string]: boolean } = { HasNobodyRole: true, AlwaysFalse: true }
/** Roles every user holds implicitly. */
export const IMPLICIT_ROLES = ['public']

const ATTR_ADMIN: { [k: string]: boolean } = { HasAdminRole: true, has_admin_role: true }

/**
 * Static ACL evaluator. It mirrors the platform's matching order:
 *  - table rules: table -> parent tables -> "*"
 *  - field rules: table.field -> parent.field -> *.field -> table.* -> parent.* -> *.*
 * The first level that has at least one ACL for the operation is the one evaluated.
 * Allow-if ACLs: the subject needs to pass ANY matched ACL.
 * Deny-unless ACLs: the subject needs to pass ALL matched ACLs.
 * Roles are evaluated exactly; conditions/scripts/attributes that depend on a record or the
 * live session are reported as Conditional rather than guessed.
 */
export class Evaluator {
    private roleSet: { [r: string]: boolean } = {}

    constructor(
        private index: AclIndex,
        private subject: Subject,
        private elevated: { [r: string]: boolean },
        /** resolved security attributes by name; unresolved ones stay Conditional */
        private attrs: { [name: string]: AttributeInfo } = {}
    ) {
        for (const r of subject.roles) this.roleSet[r] = true
        // implicit roles every session holds, never stored in sys_user_has_role
        for (const r of IMPLICIT_ROLES) this.roleSet[r] = true
    }

    /** the subject's roles, including implicit ones */
    roles(): { [r: string]: boolean } {
        return this.roleSet
    }

    evalAcl(acl: AclInfo): { r: AclResult; c: Reason } {
        const s = this.subject
        if (acl.adminOverrides && s.isAdmin) return { r: 'P', c: 'admin' }

        let reason: Reason = 'open'
        let elevationOnly = false
        if (acl.roles.length) {
            const held = acl.roles.filter((r) => this.roleSet[r])
            if (!held.length) {
                // admin implicitly satisfies role checks, except elevated-privilege roles
                if (s.isAdmin && acl.roles.some((r) => !this.elevated[r])) reason = 'adminrole'
                else return { r: 'F', c: 'norole' }
            } else {
                reason = 'role'
                elevationOnly = held.every((r) => this.elevated[r])
            }
        }

        const attr = acl.securityAttribute
        if (attr) {
            if (ATTR_ALWAYS_FAIL[attr]) return { r: 'F', c: 'attrfail' }
            if (ATTR_ADMIN[attr] && !s.isAdmin) return { r: 'F', c: 'attrfail' }
            if (!ATTR_ALWAYS_PASS[attr] && !ATTR_ADMIN[attr]) {
                const met = evalAttribute(this.attrs[attr], this.roleSet)
                if (met === 'F') return { r: 'F', c: 'attrfail' }
                if (met === 'C') return { r: 'C', c: 'attr' }
            }
        }
        if (acl.hasScript) return { r: 'C', c: 'script' }
        if (acl.condition) return { r: 'C', c: 'cond' }
        if (acl.appliesTo) return { r: 'C', c: 'scope' }
        if (elevationOnly) return { r: 'C', c: 'elev' }
        return { r: 'P', c: reason }
    }

    private firstLevel(levels: string[], op: Op, decision: 'allow' | 'deny'): { lvl: string; out: AclOutcome[] } | null {
        for (const lvl of levels) {
            const hits = this.index.find(lvl, op).filter((i) => this.index.acls[i].decision === decision)
            if (hits.length) {
                return {
                    lvl,
                    out: hits.map((i) => {
                        const res = this.evalAcl(this.index.acls[i])
                        return { i, r: res.r, c: res.c }
                    }),
                }
            }
        }
        return null
    }

    /** Evaluates one operation for an ordered list of ACL name levels. */
    evalLevels(levels: string[], op: Op): Cell {
        const allow = this.firstLevel(levels, op, 'allow')
        const deny = this.firstLevel(levels, op, 'deny')
        const outcomes = (deny ? deny.out : []).concat(allow ? allow.out : [])

        let status: Status
        const denyFails = !!deny && deny.out.some((o) => o.r === 'F')
        const denyCond = !!deny && deny.out.some((o) => o.r === 'C')
        if (denyFails) status = 'D'
        else if (!allow) status = deny ? (denyCond ? 'C' : 'N') : 'N'
        else if (allow.out.some((o) => o.r === 'P')) status = denyCond ? 'C' : 'G'
        else if (allow.out.some((o) => o.r === 'C')) status = 'C'
        else status = 'D'

        const cell: Cell = { s: status, lvl: allow ? allow.lvl : '', a: outcomes }
        if (deny) cell.dlvl = deny.lvl
        return cell
    }

    tableLevels(chain: string[]): string[] {
        return chain.concat(['*'])
    }

    fieldLevels(chain: string[], field: string): string[] {
        const out: string[] = []
        if (field !== '*') {
            for (const t of chain) out.push(`${t}.${field}`)
            out.push(`*.${field}`)
        }
        for (const t of chain) out.push(`${t}.*`)
        out.push('*.*')
        return out
    }
}

/** Operations a security data filter does not restrict: creating a record doesn't query existing rows. */
const DATA_FILTER_FREE_OPS: { [op: string]: boolean } = { create: true }

/**
 * Folds security data filter outcomes into table operation cells. A filter that applies (or may
 * apply) hides rows outside it, so a Granted operation only reaches some records: Conditional.
 * The ACL-only status is kept in `acl` so the UI can explain the change.
 */
export function applyDataFilters(ops: { [op: string]: Cell }, sdf: DataFilterOutcome[] | undefined) {
    if (!sdf || !sdf.length) return
    const r = sdf.some((o) => o.r === 'A') ? 'A' : sdf.some((o) => o.r === 'C') ? 'C' : ''
    if (!r) return
    for (const op in ops) {
        if (DATA_FILTER_FREE_OPS[op]) continue
        const cell = ops[op]
        if (cell.s !== 'G' && cell.s !== 'C') continue
        cell.df = r
        if (cell.s === 'G') {
            cell.acl = 'G'
            cell.s = 'C'
        }
    }
}

export function emptyCounts(ops: Op[]): { [op: string]: { [s: string]: number } } {
    const c: { [op: string]: { [s: string]: number } } = {}
    for (const op of ops) c[op] = { G: 0, C: 0, D: 0, N: 0 }
    return c
}
