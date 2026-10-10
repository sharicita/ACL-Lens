import { gr, chunk, bool, cleanQuery } from './glide.ts'
import { ALL_TABLE_OPS, AclInfo, Op } from './types.ts'

const OPS_QUERY = `operation.nameIN${ALL_TABLE_OPS.join(',')}`
const MAX_TARGETED_NAMES = 150

/**
 * Loads active record ACLs (create/read/write/delete and the other table operations) with their roles and indexes them by
 * "<acl name>|<operation>" for fast hierarchy lookups.
 */
export class AclIndex {
    acls: AclInfo[] = []
    private byKey: { [key: string]: number[] } = {}
    /** table name (or "*") -> field names that have field-specific ACLs */
    fieldsByTable: { [table: string]: { [field: string]: boolean } } = {}

    /**
     * @param tableNames tables (including ancestors) to load ACLs for; null loads every record ACL.
     */
    load(tableNames: string[] | null) {
        const a = gr('sys_security_acl')
        a.addEncodedQuery(`type=record^active=true^${OPS_QUERY}`)
        const targeted = !!tableNames && tableNames.length <= MAX_TARGETED_NAMES
        if (targeted) {
            const parts = ['name=*', 'nameSTARTSWITH*.']
            for (const t of tableNames as string[]) parts.push(`name=${t}`, `nameSTARTSWITH${t}.`)
            a.addEncodedQuery(parts.join('^OR'))
        }
        a.query()
        const idToIndex: { [id: string]: number } = {}
        while (a.next()) {
            const opName = (a.getDisplayValue('operation') || a.getValue('operation')) as Op
            const localOrExisting = a.getValue('local_or_existing')
            const info: AclInfo = {
                id: a.getUniqueValue(),
                name: a.getValue('name'),
                op: opName,
                decision: a.getValue('decision_type') === 'deny' ? 'deny' : 'allow',
                roles: [],
                adminOverrides: bool(a.getValue('admin_overrides')),
                condition: cleanQuery(a.getValue('condition')),
                hasScript: bool(a.getValue('advanced')) && !!(a.getValue('script') || '').trim(),
                securityAttribute:
                    localOrExisting === 'Existing' && a.getValue('security_attribute')
                        ? a.getDisplayValue('security_attribute')
                        : '',
                appliesTo: cleanQuery(a.getValue('applies_to')),
                description: a.getValue('description') || '',
                scope: a.getDisplayValue('sys_scope') || '',
            }
            idToIndex[info.id] = this.acls.length
            this.acls.push(info)
        }
        this.loadRoles(idToIndex, targeted)
        this.buildIndex()
        return this
    }

    private loadRoles(idToIndex: { [id: string]: number }, targeted: boolean) {
        const add = (r: any) => {
            const idx = idToIndex[r.getValue('sys_security_acl')]
            const role = r.getDisplayValue('sys_user_role')
            if (idx !== undefined && role) this.acls[idx].roles.push(role)
        }
        if (targeted) {
            for (const ids of chunk(Object.keys(idToIndex), 300)) {
                const r = gr('sys_security_acl_role')
                r.addQuery('sys_security_acl', 'IN', ids.join(','))
                r.query()
                while (r.next()) add(r)
            }
            return
        }
        const r = gr('sys_security_acl_role')
        r.addEncodedQuery(`sys_security_acl.type=record^sys_security_acl.active=true`)
        r.query()
        while (r.next()) add(r)
    }

    private buildIndex() {
        this.acls.forEach((acl, i) => {
            const key = `${acl.name}|${acl.op}`
            if (!this.byKey[key]) this.byKey[key] = []
            this.byKey[key].push(i)
            const dot = acl.name.indexOf('.')
            if (dot > 0) {
                const table = acl.name.substring(0, dot)
                const field = acl.name.substring(dot + 1)
                if (field && field !== '*') {
                    if (!this.fieldsByTable[table]) this.fieldsByTable[table] = {}
                    this.fieldsByTable[table][field] = true
                }
            }
        })
    }

    find(name: string, op: Op): number[] {
        return this.byKey[`${name}|${op}`] || []
    }

    /** Distinct table names that appear in ACLs requiring any of the given roles. */
    tablesSecuredBy(roles: { [role: string]: boolean }): string[] {
        const out: { [t: string]: boolean } = {}
        for (const acl of this.acls) {
            if (!acl.roles.some((r) => roles[r])) continue
            const t = acl.name.split('.')[0]
            if (t && t !== '*') out[t] = true
        }
        return Object.keys(out).sort()
    }

    /** names of the security attributes the loaded ACLs use */
    attributeNames(): string[] {
        return this.acls.map((a) => a.securityAttribute).filter((n) => !!n)
    }

    starFields(): string[] {
        return Object.keys(this.fieldsByTable['*'] || {})
    }
}
