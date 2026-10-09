import { GlideRecordSecure } from '@servicenow/glide'
import { gr } from './glide.ts'

/**
 * App-wide ranked search used by every typeahead. Results come in passes:
 * 1. a key field starts with the text, 2. any other field starts with it, 3. any field contains it.
 * Duplicates are skipped and the total is capped. `secure` limits results to records the
 * signed-in user can read (GlideRecordSecure).
 */
export interface RankedSearchOptions {
    table: string
    /** first field is the primary key field (e.g. name / scope / user_name) */
    fields: string[]
    text: string
    limit: number
    secure: boolean
    /** extra encoded query applied to every pass */
    baseQuery?: string
    /** used when text is empty */
    emptyQuery?: string
    orderBy: string
}

/** Makes free text safe to embed in an encoded query: "^" and line breaks would start new conditions. */
export function queryText(text: string, max = 100): string {
    return String(text || '')
        .replace(/[\^\r\n]/g, ' ')
        .trim()
        .substring(0, max)
}

export function rankedSearch<T>(o: RankedSearchOptions, map: (r: any) => T): T[] {
    const q = queryText(o.text)
    const out: T[] = []
    const seen: { [id: string]: boolean } = {}
    const pass = (query: string) => {
        if (out.length >= o.limit) return
        const r = (o.secure ? new GlideRecordSecure(o.table) : gr(o.table)) as any
        const parts = [o.baseQuery, query].filter((x) => !!x).join('^')
        if (parts) r.addEncodedQuery(parts)
        r.orderBy(o.orderBy)
        r.setLimit(o.limit + out.length)
        r.query()
        while (r.next() && out.length < o.limit) {
            const id = r.getUniqueValue()
            if (seen[id]) continue
            seen[id] = true
            out.push(map(r))
        }
    }
    if (!q) {
        if (o.emptyQuery) pass(o.emptyQuery)
        pass('')
        return out
    }
    pass(`${o.fields[0]}STARTSWITH${q}`)
    for (const f of o.fields.slice(1)) pass(`${f}STARTSWITH${q}`)
    pass(o.fields.map((f) => `${f}LIKE${q}`).join('^OR'))
    return out
}
