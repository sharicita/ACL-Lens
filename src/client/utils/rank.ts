/**
 * Shared search ranking used by every search box and filter in the app:
 * 0 = the first text starts with the query, 1 = another text starts with it,
 * 2 = any text contains it, -1 = no match. Case-insensitive.
 */
export function matchRank(texts: string[], query: string): number {
    const q = query.trim().toLowerCase()
    if (!q) return 0
    const t = texts.map((x) => (x || '').toLowerCase())
    if (t[0] && t[0].startsWith(q)) return 0
    if (t.some((x) => x.startsWith(q))) return 1
    if (t.some((x) => x.includes(q))) return 2
    return -1
}

/** Filters items to matches and orders them by rank, keeping the original order within a rank. */
export function rankFilter<T>(items: T[], query: string, texts: (item: T) => string[]): T[] {
    if (!query.trim()) return items
    return items
        .map((item, i) => ({ item, i, r: matchRank(texts(item), query) }))
        .filter((x) => x.r >= 0)
        .sort((a, b) => a.r - b.r || a.i - b.i)
        .map((x) => x.item)
}
