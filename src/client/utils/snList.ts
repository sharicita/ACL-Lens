/**
 * Builds ServiceNow list-view links (and the encoded queries behind them) for the lists ACL Lens
 * shows, so a filtered result can be opened as real records in a standard list.
 */

/** Longest encoded query we put in a URL; longer lists should be narrowed first. */
export const MAX_QUERY = 7000

export interface SnList {
    table: string
    query: string
    count: number
    /** what the list shows, e.g. "ACL records for these 4 differences" */
    what: string
}

function uniq(list: string[]): string[] {
    return Array.from(new Set(list.filter(Boolean)))
}

/** A list of records by name (roles, tables). */
export function byNames(table: string, names: string[], what: string): SnList {
    const n = uniq(names)
    return { table, query: `nameIN${n.join(',')}`, count: n.length, what }
}

/** Records by sys_id (e.g. runs). */
export function bySysIds(table: string, ids: string[], what: string): SnList {
    const n = uniq(ids)
    return { table, query: `sys_idIN${n.join(',')}`, count: n.length, what }
}

/**
 * The record ACLs defined directly on these table / field + operation pairs. Each pair is its own
 * OR block (^NQ) so the list matches exactly those pairs.
 */
export function aclsFor(cells: { t: string; f?: string; op: string }[], what: string): SnList {
    const parts = uniq(cells.map((c) => `type=record^name=${c.f ? `${c.t}.${c.f}` : c.t}^operation.name=${c.op}`))
    return { table: 'sys_security_acl', query: parts.join('^NQ'), count: parts.length, what }
}

/** Dictionary entries for fields of one table (and its parents). */
export function fieldsOf(tables: string[], fields: string[], what: string): SnList {
    return { table: 'sys_dictionary', query: `nameIN${uniq(tables).join(',')}^elementIN${uniq(fields).join(',')}`, count: uniq(fields).length, what }
}

export function listHref(l: SnList): string | null {
    if (!l.count || l.query.length > MAX_QUERY) return null
    return `/${l.table}_list.do?sysparm_query=${encodeURIComponent(l.query)}`
}
