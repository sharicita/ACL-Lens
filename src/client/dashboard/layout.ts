// Pure helpers for arranging dashboard tabs and tiles (tested offline).
import type { DashTab, ReportOptions, Tile } from './types'

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
