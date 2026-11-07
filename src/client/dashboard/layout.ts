// Pure helpers for arranging dashboard tabs and tiles (tested offline).
import type { DashTab, ReportGroup, ReportOptions, Span, Tile } from './types'

/** Most named slices in a pie or donut; the rest join "Other" so the colors stay readable. */
export const MAX_SLICES = 6

/** A report calculated for bars can have more groups than a pie can show. Keeps the total the same. */
export function sliceGroups(groups: ReportGroup[], max = MAX_SLICES): ReportGroup[] {
    const named = groups.filter((g) => g.key !== '__other')
    if (named.length <= max) return groups
    const rest = named.slice(max)
    const old = groups.filter((g) => g.key === '__other')[0]
    const count = rest.length + (old ? parseInt((/\d+/.exec(old.label) || ['0'])[0], 10) : 0)
    const value = rest.reduce((n, g) => n + g.value, old ? old.value : 0)
    return named.slice(0, max).concat([{ key: '__other', label: `Other (${count})`, value }])
}

/** Moves one item so it sits before the item now at `before` (list length = the end). */
export function moveItem<T>(list: T[], from: number, before: number): T[] {
    if (from < 0 || from >= list.length) return list
    const out = list.slice()
    const [item] = out.splice(from, 1)
    out.splice(before > from ? before - 1 : before, 0, item)
    return out
}

export function newTabId(): string {
    return `tab-${Date.now().toString(36)}-${Math.floor(Math.random() * 1296).toString(36)}`
}

/** Moves a report to the end of another tab. If it is already there, it just leaves the first tab. */
export function moveTileToTab(tabs: DashTab[], report: string, fromTab: string, toTab: string): DashTab[] {
    if (fromTab === toTab) return tabs
    const source = tabs.filter((t) => t.id === fromTab)[0]
    const tile = source && source.tiles.filter((x) => x.report === report)[0]
    if (!tile) return tabs
    return tabs.map((t) => {
        if (t.id === fromTab) return { ...t, tiles: t.tiles.filter((x) => x.report !== report) }
        if (t.id === toTab && !t.tiles.some((x) => x.report === report)) return { ...t, tiles: t.tiles.concat([tile]) }
        return t
    })
}

/** Adds a report to a tab, unless it is already there. */
export function addTileToTab(tabs: DashTab[], report: string, toTab: string): DashTab[] {
    const tile: Tile = { report, size: 1 }
    return tabs.map((t) => (t.id === toTab && !t.tiles.some((x) => x.report === report) ? { ...t, tiles: t.tiles.concat([tile]) } : t))
}

// ---- card widths and rows: a 6-column grid -----------------------------------------------

export const COLUMNS = 6
export const SPANS: { span: Span; label: string }[] = [
    { span: 6, label: 'Full row' },
    { span: 3, label: 'Half' },
    { span: 4, label: 'Two thirds' },
    { span: 2, label: 'One third' },
]

/** A card's width in columns. Cards saved before widths could be chosen are half or full. */
export function spanOf(t: Tile): Span {
    return t.span || (t.size === 2 ? 6 : 3)
}

/** A card with this width, still readable by pages from before widths could be chosen. */
export function withSpan(t: Tile, span: Span): Tile {
    return { ...t, span, size: span === COLUMNS ? 2 : 1 }
}

/** Which cards share a row, the way the grid lays them out: a row ends when it's full or a card starts a new one. */
export function rowsOf(tiles: Tile[]): number[][] {
    const rows: number[][] = []
    let used = COLUMNS
    tiles.forEach((t, i) => {
        const span = spanOf(t)
        if (t.row || used + span > COLUMNS) {
            rows.push([])
            used = 0
        }
        rows[rows.length - 1].push(i)
        used += span
    })
    return rows
}

export type DropSide = 'before' | 'after' | 'below'

function setRow(t: Tile, row: boolean): Tile {
    const { row: _old, ...rest } = t
    return row ? { ...rest, row: true } : rest
}

/**
 * Moves a card next to another: beside it (before or after, in the same row) or below it, as the
 * first card of a new row under that row. The card keeps its width and chart.
 */
export function dropTile(tiles: Tile[], dragged: string, target: string, side: DropSide): Tile[] {
    const from = tiles.findIndex((t) => t.report === dragged)
    if (from < 0 || dragged === target || tiles.findIndex((t) => t.report === target) < 0) return tiles
    let list = tiles.slice()
    const [card] = list.splice(from, 1)
    // the card after it would otherwise join the row above
    if (card.row && list[from]) list[from] = setRow(list[from], true)
    const at = list.findIndex((t) => t.report === target)
    if (side === 'before') {
        list.splice(at, 0, setRow(card, !!list[at].row))
        list[at + 1] = setRow(list[at + 1], false)
    } else if (side === 'after') {
        list.splice(at + 1, 0, setRow(card, false))
    } else {
        const row = rowsOf(list).filter((r) => r.indexOf(at) >= 0)[0]
        const end = row[row.length - 1] + 1
        list.splice(end, 0, setRow(card, true))
        // what was under that row stays a row of its own
        if (list[end + 1]) list[end + 1] = setRow(list[end + 1], true)
    }
    return list
}

/** Moves a card to the end, on a row of its own. */
export function dropAtEnd(tiles: Tile[], dragged: string): Tile[] {
    const from = tiles.findIndex((t) => t.report === dragged)
    if (from < 0) return tiles
    const list = tiles.slice()
    const [card] = list.splice(from, 1)
    if (card.row && list[from]) list[from] = setRow(list[from], true)
    return list.concat([setRow(card, true)])
}

/** Starts a new row with this card, or lets it join the row above when there's room. */
export function toggleRow(tiles: Tile[], report: string): Tile[] {
    return tiles.map((t) => (t.report === report ? setRow(t, !t.row) : t))
}

/** What a run looks like as a report: its access, or its differences for a comparison run. */
export function runReportDef(run: { sys_id: string; number: string; name?: string; run_type?: string; created?: string }): {
    name: string
    description: string
    measure: string
    chart: 'bar'
    options: ReportOptions
} {
    return {
        name: `${run.number}${run.name ? ` ${run.name}` : ''}`.substring(0, 100),
        description: `From run ${run.number}, ${run.created || ''}.`,
        measure: run.run_type === 'compare' ? 'differences' : 'access',
        chart: 'bar',
        options: { run: run.sys_id },
    }
}

// which tab is open is a per-viewer convenience: remembered in this browser
const ACTIVE_TAB = 'acl-lens.dashboard.tab'
export function readActiveTab(): string {
    try {
        return window.localStorage.getItem(ACTIVE_TAB) || ''
    } catch (e) {
        return ''
    }
}
export function writeActiveTab(id: string) {
    try {
        window.localStorage.setItem(ACTIVE_TAB, id)
    } catch (e) {
        /* storage unavailable - the choice lasts until the page is left */
    }
}
