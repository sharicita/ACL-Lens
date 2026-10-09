import { gr, chunk } from './glide.ts'

export interface TableMeta {
    name: string
    label: string
    parent: string
}

const SYSTEM_PREFIXES = ['sys_', 'v_', 'ts_', 'syslog', 'ua_', 'sysevent', 'sysauto', 'sysrule', 'clone_', 'ecc_']

/** In-memory copy of sys_db_object (name, label, parent) used to walk table hierarchies. */
export class Schema {
    tables: { [name: string]: TableMeta } = {}

    load() {
        const idToName: { [id: string]: string } = {}
        const parentIds: { [name: string]: string } = {}
        const t = gr('sys_db_object')
        t.addNotNullQuery('name')
        t.query()
        while (t.next()) {
            const name = t.getValue('name')
            idToName[t.getUniqueValue()] = name
            parentIds[name] = t.getValue('super_class') || ''
            this.tables[name] = { name, label: t.getValue('label') || name, parent: '' }
        }
        for (const name in parentIds) {
            const pid = parentIds[name]
            if (pid && idToName[pid]) this.tables[name].parent = idToName[pid]
        }
        return this
    }

    exists(name: string): boolean {
        return !!this.tables[name]
    }

    label(name: string): string {
        return this.tables[name] ? this.tables[name].label : name
    }

    /** [table, parent, grandparent, ...] - not including "*" */
    chain(name: string): string[] {
        const out: string[] = []
        let cur = name
        let guard = 0
        while (cur && guard++ < 30) {
            out.push(cur)
            cur = this.tables[cur] ? this.tables[cur].parent : ''
        }
        return out
    }

    isSystem(name: string): boolean {
        for (const p of SYSTEM_PREFIXES) if (name.indexOf(p) === 0) return true
        return false
    }

    allNames(): string[] {
        return Object.keys(this.tables).sort()
    }

    tablesInScope(scope: string): string[] {
        const out: string[] = []
        const t = gr('sys_db_object')
        t.addQuery('sys_scope.scope', scope)
        t.query()
        while (t.next()) out.push(t.getValue('name'))
        return out.sort()
    }
}

/**
 * For "*.field" ACLs: returns, per field name, the set of tables that define that column.
 * A "*.field" rule only matters for tables (or their parents) that actually have the field, so
 * the lookup is limited to the analyzed tables and their ancestors.
 */
export function tablesDefiningFields(fields: string[], tables: string[]): { [field: string]: { [table: string]: boolean } } {
    const out: { [field: string]: { [table: string]: boolean } } = {}
    if (!fields.length || !tables.length) return out
    for (const part of chunk(tables, 300)) {
        const d = gr('sys_dictionary')
        d.addQuery('name', 'IN', part.join(','))
        d.addQuery('element', 'IN', fields.join(','))
        d.query()
        while (d.next()) {
            const f = d.getValue('element')
            if (!out[f]) out[f] = {}
            out[f][d.getValue('name')] = true
        }
    }
    return out
}

export interface FieldMeta {
    name: string
    label: string
    type: string
    definedOn: string
}

/** Every column on a table including inherited ones (child definitions win). */
export function listFields(schema: Schema, table: string): FieldMeta[] {
    const chain = schema.chain(table)
    const byName: { [f: string]: FieldMeta } = {}
    const d = gr('sys_dictionary')
    d.addQuery('name', 'IN', chain.join(','))
    d.addNotNullQuery('element')
    d.query()
    while (d.next()) {
        const f = d.getValue('element')
        const on = d.getValue('name')
        const existing = byName[f]
        // keep the most specific definition (lowest index in the chain)
        if (existing && chain.indexOf(existing.definedOn) <= chain.indexOf(on)) continue
        byName[f] = { name: f, label: d.getValue('column_label') || f, type: d.getValue('internal_type'), definedOn: on }
    }
    return Object.keys(byName)
        .sort()
        .map((k) => byName[k])
}
