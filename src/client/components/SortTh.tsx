import React, { useMemo, useState } from 'react'

export type SortValue = string | number | boolean | null | undefined
export type SortDir = 'asc' | 'desc'

export interface Sorter<T> {
    rows: T[]
    key: string
    dir: SortDir
    toggle: (key: string) => void
}

/**
 * Sorts rows by one column. `columns` maps a column key to the value to sort by. With no column
 * chosen (key ''), rows keep their original order (for example search relevance).
 */
export function useSort<T>(rows: T[], columns: { [key: string]: (row: T) => SortValue }, initial: { key?: string; dir?: SortDir } = {}): Sorter<T> {
    const [key, setKey] = useState(initial.key || '')
    const [dir, setDir] = useState<SortDir>(initial.dir || 'asc')
    const sorted = useMemo(() => {
        const get = columns[key]
        if (!get) return rows
        const factor = dir === 'asc' ? 1 : -1
        return rows
            .map((row, i) => ({ row, i, v: get(row) }))
            .sort((a, b) => {
                const c = compareValues(a.v, b.v)
                return c ? c * factor : a.i - b.i
            })
            .map((x) => x.row)
        // columns is usually an inline object; the key and rows identify the sort
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rows, key, dir])
    // numbers (counts, access levels) sort largest first on the first click; text A to Z
    const toggle = (k: string) => {
        if (k === key) setDir(dir === 'asc' ? 'desc' : 'asc')
        else {
            const get = columns[k]
            const sample = get ? rows.map(get).find((v) => v !== null && v !== undefined && v !== '') : undefined
            setKey(k)
            setDir(typeof sample === 'number' ? 'desc' : 'asc')
        }
    }
    return { rows: sorted, key, dir, toggle }
}

function compareValues(a: SortValue, b: SortValue): number {
    const empty = (v: SortValue) => v === null || v === undefined || v === ''
    if (empty(a) || empty(b)) return empty(a) === empty(b) ? 0 : empty(a) ? 1 : -1
    if (typeof a === 'number' && typeof b === 'number') return a - b
    if (typeof a === 'boolean' && typeof b === 'boolean') return a === b ? 0 : a ? -1 : 1
    return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' })
}

interface Props<T> {
    sorter: Sorter<T>
    col: string
    children: React.ReactNode
    tip?: string
    className?: string
    scope?: 'col' | 'row'
    rowSpan?: number
    abbr?: string
}

/** A column header that sorts its table. Announces the sort state to assistive technology. */
export default function SortTh<T>({ sorter, col, children, tip, className, scope = 'col', rowSpan, abbr }: Props<T>) {
    const active = sorter.key === col
    const ariaSort = active ? (sorter.dir === 'asc' ? 'ascending' : 'descending') : 'none'
    return (
        <th scope={scope} aria-sort={ariaSort} className={className} rowSpan={rowSpan} abbr={abbr}>
            <button type="button" className={`lens-sort${active ? ' lens-sort--active' : ''}`} onClick={() => sorter.toggle(col)} data-tip={tip}>
                {children}
                <span className="lens-sort__icon" aria-hidden="true">
                    {active ? (sorter.dir === 'asc' ? '▲' : '▼') : '↕'}
                </span>
            </button>
        </th>
    )
}
