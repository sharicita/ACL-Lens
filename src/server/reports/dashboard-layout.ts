// The saved shape of a user's dashboard: ordered tabs, each with a title, a description and its own
// report tiles. Stored as JSON in x_acllens_dashboard.layout. No Glide here, so it can be tested offline.

export interface Tile {
    report: string
    size: 1 | 2
}

export interface DashTab {
    id: string
    title: string
    description: string
    tiles: Tile[]
}

export const MAX_TABS = 20
export const MAX_TILES = 40
export const MAX_TITLE = 60
export const MAX_DESCRIPTION = 300
/** stays under the column's 65,000 characters, so saved JSON is never cut off */
const MAX_JSON = 60000

const SYS_ID = /^[0-9a-f]{32}$/
const TAB_ID = /^[a-z0-9-]{1,40}$/

export const DEFAULT_TAB_ID = 'main'
export const DEFAULT_TAB_TITLE = 'Overview'

function cleanTiles(value: unknown): Tile[] {
    const seen: { [id: string]: boolean } = {}
    const out: Tile[] = []
    for (const t of Array.isArray(value) ? (value as any[]) : []) {
        const id = t ? String(t.report) : ''
        if (!SYS_ID.test(id) || seen[id] || out.length >= MAX_TILES) continue
        seen[id] = true
        out.push({ report: id, size: t.size === 2 ? 2 : 1 })
    }
    return out
}

/** Validates the tabs a client sent. Throws with a message the user can act on. */
export function cleanTabs(value: unknown): DashTab[] {
    if (!Array.isArray(value) || !value.length) throw new Error('A dashboard needs at least one tab. If this keeps happening, refresh the page.')
    if (value.length > MAX_TABS) throw new Error(`A dashboard can have up to ${MAX_TABS} tabs`)
    const seen: { [id: string]: boolean } = {}
    return (value as any[]).map((t) => {
        const id = t ? String(t.id) : ''
        if (!TAB_ID.test(id) || seen[id]) throw new Error('A dashboard tab has an invalid ID. Refresh the page and try again.')
        seen[id] = true
        const title = String(t.title || '').trim().substring(0, MAX_TITLE)
        if (!title) throw new Error('Give the tab a title')
        return { id, title, description: String(t.description || '').trim().substring(0, MAX_DESCRIPTION), tiles: cleanTiles(t.tiles) }
    })
}

/** The JSON to store. Throws rather than letting the column cut the JSON off. */
export function layoutJson(tabs: DashTab[]): string {
    const text = JSON.stringify({ tabs })
    if (text.length > MAX_JSON) throw new Error('This dashboard is too large to save. Remove some reports or tabs.')
    return text
}

export function defaultTabs(tiles: Tile[]): DashTab[] {
    return [{ id: DEFAULT_TAB_ID, title: DEFAULT_TAB_TITLE, description: '', tiles }]
}

/**
 * Reads a stored layout. Dashboards saved before tabs existed hold a plain list of tiles, which
 * becomes one tab. Anything unreadable falls back to the default.
 */
export function readLayout(text: string, fallback: Tile[]): { tabs: DashTab[]; custom: boolean } {
    try {
        const saved = JSON.parse(text || 'null')
        if (Array.isArray(saved)) return { tabs: defaultTabs(cleanTiles(saved)), custom: true }
        if (saved && Array.isArray(saved.tabs)) return { tabs: cleanTabs(saved.tabs), custom: true }
    } catch (e) {
        /* keep the default */
    }
    return { tabs: defaultTabs(fallback), custom: false }
}
