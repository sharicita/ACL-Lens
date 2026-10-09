import { GlideRecord } from '@servicenow/glide'

/**
 * Untyped GlideRecord factory. The engine reads many platform tables (sys_security_acl,
 * sys_user_has_role, ...) whose generated field typings are not part of this project, so the
 * engine works with plain string field names.
 */
export function gr(table: string): any {
    return new GlideRecord(table) as any
}

export function chunk<T>(list: T[], size: number): T[][] {
    const out: T[][] = []
    for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size))
    return out
}

export function bool(value: string): boolean {
    return value === 'true' || value === '1'
}

/** Strips the trailing "^EQ" the condition builder appends to empty/complete queries. */
export function cleanQuery(q: string): string {
    const v = (q || '').trim()
    if (!v || v === '^EQ' || v === 'EQ') return ''
    return v.replace(/\^EQ$/, '')
}
