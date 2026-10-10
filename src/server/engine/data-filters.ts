import { gr, chunk, cleanQuery } from './glide.ts'
import { AttributeInfo, evalDataFilter, parseCondition, scriptIsEmpty } from './attributes.ts'
import { DataFilterInfo, DataFilterOutcome } from './types.ts'

/**
 * Active security data filters (sys_security_data_filter), indexed by table. A filter on a table
 * also applies to the tables that extend it.
 */
export class DataFilterIndex {
    filters: DataFilterInfo[] = []
    private byTable: { [table: string]: number[] } = {}

    /** @param tableNames tables (including ancestors) to load filters for; null loads every active filter. */
    load(tableNames: string[] | null) {
        const read = (q: any) => {
            q.addQuery('active', true)
            q.query()
            while (q.next()) {
                const info: DataFilterInfo = {
                    id: q.getUniqueValue(),
                    table: q.getValue('table_name'),
                    mode: q.getValue('mode') === 'if' ? 'if' : 'unless',
                    filter: cleanQuery(q.getValue('filter')),
                    securityAttribute: q.getValue('security_attribute') ? q.getDisplayValue('security_attribute') : '',
                    description: q.getValue('description') || '',
                }
                if (!info.table) continue
                ;(this.byTable[info.table] = this.byTable[info.table] || []).push(this.filters.length)
                this.filters.push(info)
            }
        }
        try {
            if (tableNames) {
                for (const part of chunk(tableNames, 300)) {
                    const q = gr('sys_security_data_filter')
                    q.addQuery('table_name', 'IN', part.join(','))
                    read(q)
                }
            } else read(gr('sys_security_data_filter'))
        } catch (e) {
            // releases without security data filters
        }
        return this
    }

    attributeNames(): string[] {
        return this.filters.map((f) => f.securityAttribute).filter((n) => !!n)
    }

    /** Filters that apply to a table: those on the table itself or on any table it extends. */
    forChain(chain: string[]): number[] {
        const out: number[] = []
        for (const t of chain) for (const i of this.byTable[t] || []) out.push(i)
        return out
    }
}

export function dataFilterOutcomes(index: DataFilterIndex, chain: string[], attrs: { [name: string]: AttributeInfo }, roles: { [r: string]: boolean }): DataFilterOutcome[] {
    return index.forChain(chain).map((i) => ({ i, r: evalDataFilter(index.filters[i], attrs, roles) }))
}

/** Loads the named attributes (by name) and resolves the role sys_ids their conditions use. */
export function loadAttributes(names: string[]): { [name: string]: AttributeInfo } {
    const out: { [name: string]: AttributeInfo } = {}
    const wanted = names.filter((n, i) => !!n && names.indexOf(n) === i)
    if (!wanted.length) return out
    const rows: { name: string; condition: string; script: string; type: string }[] = []
    const roleIds: { [id: string]: boolean } = {}
    for (const part of chunk(wanted, 200)) {
        const a = gr('sys_security_attribute')
        a.addQuery('name', 'IN', part.join(','))
        a.query()
        while (a.next()) {
            const condition = a.getValue('condition') || ''
            rows.push({ name: a.getValue('name'), condition, script: a.getValue('script') || '', type: a.getValue('type') || '' })
            const re = /Role!?=([0-9a-f]{32})/g
            let m: RegExpExecArray | null
            while ((m = re.exec(condition))) roleIds[m[1]] = true
        }
    }
    const roleName: { [id: string]: string } = {}
    for (const part of chunk(Object.keys(roleIds), 200)) {
        const r = gr('sys_user_role')
        r.addQuery('sys_id', 'IN', part.join(','))
        r.query()
        while (r.next()) roleName[r.getUniqueValue()] = r.getValue('name')
    }
    for (const row of rows) {
        const groups = parseCondition(row.condition, roleName)
        const known = groups.length > 0 && groups.every((g) => g.every((t) => t.kind !== 'unknown') || g.some((t) => t.kind === 'loggedin' && !t.negate))
        out[row.name] = { name: row.name, groups, resolvable: known && scriptIsEmpty(row.script) }
    }
    return out
}
