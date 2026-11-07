// The saved shape of a user's dashboard: ordered tabs, each with a title, a description and its own
// report tiles. Stored as JSON in x_acllens_dashboard.layout. No Glide here, so it can be tested offline.

export interface Tile {
    report: string
    /** width before columns could be chosen (2 full, 1 half); only kept when there's no span */
    size?: 1 | 2
    /** how this card shows the report; without it, the report's own chart */
    chart?: string
    /** width out of 6 columns (6, 3, 2 or 4); without it, size decides: 2 full, 1 half */
    span?: number
    /** starts a new row */
    row?: boolean
}

const CHARTS = ['tile', 'bar', 'overlay', 'pie', 'donut', 'list']

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
        // a span says it all, so size is only kept without one: that keeps the largest dashboard within the column
        const tile: Tile = [2, 3, 4, 6].indexOf(t.span) >= 0 ? { report: id, span: t.span } : { report: id, size: t.size === 2 ? 2 : 1 }
        if (t.row === true) tile.row = true
        if (CHARTS.indexOf(t.chart) >= 0) tile.chart = t.chart
        out.push(tile)
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
