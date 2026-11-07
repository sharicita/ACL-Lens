import { TableCoverage } from './types.ts'

/**
 * Picks the tables one run analyzes. Runs that can't cover everything at once work through the
 * matched tables in alphabetical sets. A set starts after a table name rather than at a position,
 * so a table added to the instance between two runs doesn't shift later sets or skip a table.
 */
export function tableWindow(tables: string[], max: number, startAfter?: string): { tables: string[]; coverage: TableCoverage | null } {
    if (tables.length <= max && !startAfter) return { tables, coverage: null }
    const sorted = tables.slice().sort()
    const rest = startAfter ? sorted.filter((t) => t > startAfter) : sorted
    const page = rest.slice(0, max)
    const from = sorted.length - rest.length + 1
    const coverage: TableCoverage = { from, to: from + page.length - 1, total: sorted.length }
    if (rest.length > page.length) coverage.nextAfter = page[page.length - 1]
    return { tables: page, coverage }
}

export function coverageWarning(c: TableCoverage): string {
    if (c.to < c.from) return `${c.total} tables matched and none come after the point this set starts from.`
    const part = `${c.total} tables matched; this run covers tables ${c.from} to ${c.to} (alphabetical).`
    return c.nextAfter ? `${part} Use "Run next set" to continue, or raise "Max tables".` : `${part} This is the last set.`
}
