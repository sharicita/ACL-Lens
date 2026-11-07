// Identifies a calculated report so its result can be reused. A saved run never changes, so the
// same definition on the same run always gives the same answer. No Glide here, so it can be tested offline.

export interface CacheableDef {
    measure: string
    chart: string
    options: object
}

/** Reports slower than this on a run (in ms) are stored, so small runs add no rows. */
export const CACHE_OVER_MS = 3000

function fnv(text: string, seed: number): string {
    let h = seed
    for (let i = 0; i < text.length; i++) {
        h ^= text.charCodeAt(i)
        h = Math.imul(h, 16777619)
    }
    return (h >>> 0).toString(16).padStart(8, '0')
}

/**
 * `text` is the full definition, stored with the result and compared on read, so a hash collision
 * can't show another report's numbers. Which run it applies to is not part of it: results are
 * stored per run, and a copy of a report tied to a different run has its own results there.
 */
export function reportCacheKey(def: CacheableDef): { key: string; text: string } {
    const given = (def.options || {}) as { [k: string]: unknown }
    const options: { [k: string]: unknown } = {}
    for (const k of Object.keys(given).sort()) if (k !== 'run' && given[k] !== undefined) options[k] = given[k]
    const text = JSON.stringify([def.measure, def.chart, options])
    return { key: fnv(text, 2166136261) + fnv(text, 33554467), text }
}
