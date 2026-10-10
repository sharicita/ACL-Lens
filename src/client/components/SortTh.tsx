import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import Icon from './Icon'

/*
 * List behaviour modelled on ServiceNow list views:
 * - click a column heading to sort (again to reverse);
 * - each heading has a column menu: Sort (a to z), Sort (z to a), Group by <column>, Ungroup;
 * - grouped rows sit under collapsible group headings with counts; Expand all / Collapse all;
 * - a breadcrumb above the list shows the active sort and grouping, each removable.
 */

export type SortValue = string | number | boolean | null | undefined
export type SortDir = 'asc' | 'desc'

export interface Group<T> {
    id: string
    label: string
    count: number
    rows: T[]
}

export interface Sorter<T> {
    rows: T[]
    /** rows given to the list, before cell filters */
    total: number
    key: string
    dir: SortDir
    toggle: (key: string) => void
    sortBy: (key: string, dir: SortDir) => void
    clearSort: () => void
    groupBy: string
    setGroupBy: (key: string) => void
    groups: Group<T>[] | null
    collapsed: Set<string>
    toggleGroup: (id: string) => void
    setAllCollapsed: (collapsed: boolean) => void
    /** column labels, filled in by the headings (used by the breadcrumb and menus) */
    labels: { [key: string]: string }
    /** cell filters from "Show matching" / "Filter out" */
    filters: CellFilter[]
    addFilter: (f: CellFilter) => void
    removeFilter: (index: number) => void
    /** right-click handler for a cell in column `col` of `row` */
    cellMenu: (col: string, row: T) => (e: React.MouseEvent) => void
    menu: { x: number; y: number; col: string; id: string; label: string } | null
    closeMenu: () => void
    /** personalize columns (only when the list has an id) */
    personalizable: boolean
    shows: (col: string) => boolean
    hiddenCols: Set<string>
    setColumnHidden: (col: string, hidden: boolean) => void
    resetColumns: () => void
    /** columns that always stay visible */
    isRequired: (col: string) => boolean
}

export interface CellFilter {
    col: string
    /** value identity (same as grouping) */
    id: string
    label: string
    /** true = Filter out (not equal); false = Show matching */
    out: boolean
}

export interface ListOptions<T> {
    initial?: { key?: string; dir?: SortDir }
    /** a stable list name; enables "Personalize columns" (remembered in this browser) */
    id?: string
    /** columns that must stay visible (e.g. the row name) */
    required?: string[]
    /** called with the rows left after cell filters, in display order */
    onVisible?: (rows: T[]) => void
    /** how a group heading names a value, e.g. status letter -> "Granted" */
    groupLabel?: { [key: string]: (row: T) => string }
}

/**
 * Sorts and groups rows by column. `columns` maps a column key to the value to sort by. With no
 * column chosen, rows keep their original order (for example search relevance).
 */
export function useSort<T>(rows: T[], columns: { [key: string]: (row: T) => SortValue }, opts: ListOptions<T> = {}): Sorter<T> {
    const [key, setKey] = useState(opts.initial?.key || '')
    const [dir, setDir] = useState<SortDir>(opts.initial?.dir || 'asc')
    const [groupBy, setGroupByState] = useState('')
    const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
    const labels = useRef<{ [key: string]: string }>({}).current
    const [filters, setFilters] = useState<CellFilter[]>([])
    const [menu, setMenu] = useState<Sorter<T>['menu']>(null)
    const storeKey = opts.id ? `acl-lens.columns.${opts.id}` : ''
    const [hiddenCols, setHiddenCols] = useState<Set<string>>(() => {
        try {
            return new Set(storeKey ? JSON.parse(window.localStorage.getItem(storeKey) || '[]') : [])
        } catch (e) {
            return new Set()
        }
    })
    const saveHidden = (h: Set<string>) => {
        setHiddenCols(h)
        try {
            if (storeKey) window.localStorage.setItem(storeKey, JSON.stringify(Array.from(h)))
        } catch (e) {
            /* storage unavailable: the choice lasts until the page is left */
        }
    }

    // the identity of a cell value, shared by grouping and cell filters
    const valueId = (col: string, r: T) => {
        const named = opts.groupLabel && opts.groupLabel[col]
        if (named) return named(r)
        const get = columns[col]
        return get ? String(get(r) ?? '') : ''
    }
    const valueLabel = (col: string, r: T) => {
        const named = opts.groupLabel && opts.groupLabel[col]
        const get = columns[col]
        return (named ? named(r) : get ? String(get(r) ?? '') : '') || '(empty)'
    }

    const filtered = useMemo(() => {
        if (!filters.length) return rows
        return rows.filter((r) => filters.every((f) => (valueId(f.col, r) === f.id) !== f.out))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rows, filters])

    const sorted = useMemo(() => {
        const get = columns[key]
        if (!get) return filtered
        const factor = dir === 'asc' ? 1 : -1
        return filtered
            .map((row, i) => ({ row, i, v: get(row) }))
            .sort((a, b) => {
                const c = compareValues(a.v, b.v)
                return c ? c * factor : a.i - b.i
            })
            .map((x) => x.row)
        // columns is usually an inline object; the key and rows identify the sort
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filtered, key, dir])

    const onVisible = opts.onVisible
    useEffect(() => {
        if (onVisible) onVisible(sorted)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sorted])

    const groups = useMemo(() => {
        const get = columns[groupBy]
        if (!get) return null
        const nameOf = (opts.groupLabel && opts.groupLabel[groupBy]) || ((r: T) => String(get(r) ?? ''))
        const byId = new Map<string, { v: SortValue; group: Group<T> }>()
        for (const r of sorted) {
            const v = get(r)
            // a group name (e.g. a date from a timestamp) merges values that share it
            const id = opts.groupLabel && opts.groupLabel[groupBy] ? nameOf(r) : String(v ?? '')
            let entry = byId.get(id)
            if (!entry) {
                entry = { v, group: { id, label: nameOf(r) || '(empty)', count: 0, rows: [] } }
                byId.set(id, entry)
            }
            entry.group.rows.push(r)
            entry.group.count++
        }
        // group order follows the sort when sorting by the grouped column, otherwise ascending
        const factor = key === groupBy && dir === 'desc' ? -1 : 1
        return Array.from(byId.values())
            .sort((a, b) => compareValues(a.v, b.v) * factor)
            .map((e) => e.group)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sorted, groupBy, key, dir])

    // numbers (counts, access levels) sort largest first on the first click; text A to Z
    const firstDir = (k: string): SortDir => {
        const get = columns[k]
        const sample = get ? rows.map(get).find((v) => v !== null && v !== undefined && v !== '') : undefined
        return typeof sample === 'number' ? 'desc' : 'asc'
    }
    const toggle = (k: string) => {
        if (k === key) setDir(dir === 'asc' ? 'desc' : 'asc')
        else {
            setKey(k)
            setDir(firstDir(k))
        }
    }
    return {
        rows: sorted,
        total: rows.length,
        key,
        dir,
        toggle,
        sortBy: (k, d) => {
            setKey(k)
            setDir(d)
        },
        clearSort: () => setKey(''),
        groupBy,
        setGroupBy: (k) => {
            setGroupByState(k)
            setCollapsed(new Set())
        },
        groups,
        collapsed,
        toggleGroup: (id) => {
            const n = new Set(collapsed)
            n.has(id) ? n.delete(id) : n.add(id)
            setCollapsed(n)
        },
        setAllCollapsed: (all) => setCollapsed(all && groups ? new Set(groups.map((g) => g.id)) : new Set()),
        labels,
        filters,
        addFilter: (f) => setFilters(filters.filter((x) => !(x.col === f.col && x.id === f.id)).concat([f])),
        removeFilter: (i) => setFilters(filters.filter((_x, n) => n !== i)),
        cellMenu: (col, row) => (e) => {
            if (!columns[col]) return
            e.preventDefault()
            const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
            // mouse position, or the cell's corner when opened from the keyboard (Shift+F10)
            const x = e.clientX || r.left + 8
            const y = e.clientY || r.bottom
            setMenu({ x, y, col, id: valueId(col, row), label: valueLabel(col, row) })
        },
        menu,
        closeMenu: () => setMenu(null),
        personalizable: !!opts.id,
        shows: (col) => !hiddenCols.has(col),
        hiddenCols,
        setColumnHidden: (col, hidden) => {
            if (opts.required && opts.required.indexOf(col) >= 0) return
            const n = new Set(hiddenCols)
            hidden ? n.add(col) : n.delete(col)
            saveHidden(n)
        },
        resetColumns: () => saveHidden(new Set()),
        isRequired: (col) => !!opts.required && opts.required.indexOf(col) >= 0,
    }
}

function compareValues(a: SortValue, b: SortValue): number {
    const empty = (v: SortValue) => v === null || v === undefined || v === ''
    if (empty(a) || empty(b)) return empty(a) === empty(b) ? 0 : empty(a) ? 1 : -1
    if (typeof a === 'number' && typeof b === 'number') return a - b
    if (typeof a === 'boolean' && typeof b === 'boolean') return a === b ? 0 : a ? -1 : 1
    return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' })
}

function textOf(node: React.ReactNode): string {
    if (node === null || node === undefined || typeof node === 'boolean') return ''
    if (typeof node === 'string' || typeof node === 'number') return String(node)
    if (Array.isArray(node)) return node.map(textOf).join('')
    if (React.isValidElement(node)) return textOf((node.props as any).children)
    return ''
}

/** The column menu (Sort / Group by), positioned against the window so it is never cut off. */
function ColumnMenu<T>({ sorter, col, label, groupable, onClose, anchor }: { sorter: Sorter<T>; col: string; label: string; groupable: boolean; onClose: () => void; anchor: HTMLElement }) {
    const ref = useRef<HTMLUListElement>(null)
    const [pos, setPos] = useState<{ left: number; top: number } | null>(null)

    useLayoutEffect(() => {
        const b = anchor.getBoundingClientRect()
        const m = ref.current
        const w = m ? m.offsetWidth : 200
        const h = m ? m.offsetHeight : 150
        const vw = document.documentElement.clientWidth
        const left = Math.min(Math.max(8, b.right - w), vw - w - 8)
        const top = b.bottom + 4 + h > window.innerHeight - 8 ? Math.max(8, b.top - 4 - h) : b.bottom + 4
        setPos({ left, top })
    }, [anchor])

    // focus the first item once the menu is placed (it is hidden until then)
    useEffect(() => {
        if (pos) ref.current?.querySelector<HTMLButtonElement>('button')?.focus()
    }, [pos !== null])

    useEffect(() => {
        const away = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && !anchor.contains(e.target as Node) && onClose()
        const key = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose()
                anchor.focus()
            }
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                const items = Array.from(ref.current?.querySelectorAll<HTMLButtonElement>('button') || [])
                const i = items.indexOf(document.activeElement as HTMLButtonElement)
                const next = items[(i + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length]
                next?.focus()
                e.preventDefault()
            }
        }
        const scroll = () => onClose()
        document.addEventListener('mousedown', away)
        document.addEventListener('keydown', key)
        window.addEventListener('scroll', scroll, true)
        return () => {
            document.removeEventListener('mousedown', away)
            document.removeEventListener('keydown', key)
            window.removeEventListener('scroll', scroll, true)
        }
    }, [anchor, onClose])

    const pick = (fn: () => void) => () => {
        fn()
        onClose()
        anchor.focus()
    }
    const sorted = sorter.key === col
    return (
        <ul ref={ref} className="lens-colmenu" role="menu" aria-label={`${label} column options`} style={pos ? { left: pos.left, top: pos.top } : { visibility: 'hidden' }}>
            <li role="none">
                <button type="button" role="menuitem" onClick={pick(() => sorter.sortBy(col, 'asc'))} aria-current={sorted && sorter.dir === 'asc' ? 'true' : undefined}>
                    Sort (a to z)
                </button>
            </li>
            <li role="none">
                <button type="button" role="menuitem" onClick={pick(() => sorter.sortBy(col, 'desc'))} aria-current={sorted && sorter.dir === 'desc' ? 'true' : undefined}>
                    Sort (z to a)
                </button>
            </li>
            {sorted && (
                <li role="none">
                    <button type="button" role="menuitem" onClick={pick(() => sorter.clearSort())}>
                        Remove sort
                    </button>
                </li>
            )}
            {groupable && (
                <li role="none" className="lens-colmenu__sep">
                    <button type="button" role="menuitem" onClick={pick(() => sorter.setGroupBy(col))} disabled={sorter.groupBy === col}>
                        Group by {label}
                    </button>
                </li>
            )}
            {groupable && sorter.groupBy && (
                <li role="none">
                    <button type="button" role="menuitem" onClick={pick(() => sorter.setGroupBy(''))}>
                        Ungroup
                    </button>
                </li>
            )}
        </ul>
    )
}

interface Props<T> {
    sorter: Sorter<T>
    col: string
    children: React.ReactNode
    /** column name for menus and the breadcrumb, when the heading text is short (e.g. "C") */
    label?: string
    tip?: string
    className?: string
    scope?: 'col' | 'row'
    rowSpan?: number
    abbr?: string
    /** offer "Group by" (default true) */
    groupable?: boolean
}

/** A column heading that sorts its table, with a ServiceNow-style column menu. */
export default function SortTh<T>({ sorter, col, children, label, tip, className, scope = 'col', rowSpan, abbr, groupable = true }: Props<T>) {
    const [menu, setMenu] = useState(false)
    const btn = useRef<HTMLButtonElement>(null)
    const name = label || textOf(children).trim() || col
    sorter.labels[col] = name
    if (!sorter.shows(col)) return null
    const active = sorter.key === col
    const ariaSort = active ? (sorter.dir === 'asc' ? 'ascending' : 'descending') : 'none'
    return (
        <th scope={scope} aria-sort={ariaSort} className={`lens-th${className ? ' ' + className : ''}`} rowSpan={rowSpan} abbr={abbr}>
            <span className="lens-th__inner">
                <button type="button" className={`lens-sort${active ? ' lens-sort--active' : ''}`} onClick={() => sorter.toggle(col)} data-tip={tip}>
                    {children}
                    <span className="lens-sort__icon" aria-hidden="true">
                        {active ? (sorter.dir === 'asc' ? '▲' : '▼') : '↕'}
                    </span>
                </button>
                <button
                    ref={btn}
                    type="button"
                    className="lens-th__menu"
                    aria-label={`${name} column options`}
                    aria-haspopup="menu"
                    aria-expanded={menu}
                    onClick={() => setMenu(!menu)}
                >
                    <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                        <path fill="currentColor" d="M12 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm0 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm0 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
                    </svg>
                </button>
            </span>
            {menu && btn.current && <ColumnMenu sorter={sorter} col={col} label={name} groupable={groupable} onClose={() => setMenu(false)} anchor={btn.current} />}
        </th>
    )
}

/** A small popup menu at a screen position (cell menu), kept on screen. */
function PopupMenu({ x, y, label, onClose, children }: { x: number; y: number; label: string; onClose: () => void; children: React.ReactNode }) {
    const ref = useRef<HTMLUListElement>(null)
    const [pos, setPos] = useState<{ left: number; top: number } | null>(null)
    useLayoutEffect(() => {
        const m = ref.current
        const w = m ? m.offsetWidth : 220
        const h = m ? m.offsetHeight : 120
        const vw = document.documentElement.clientWidth
        setPos({ left: Math.min(Math.max(8, x), vw - w - 8), top: y + h > window.innerHeight - 8 ? Math.max(8, y - h) : y })
    }, [x, y])
    useEffect(() => {
        if (pos) ref.current?.querySelector<HTMLButtonElement>('button')?.focus()
    }, [pos !== null])
    useEffect(() => {
        const away = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && onClose()
        const key = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                const items = Array.from(ref.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') || [])
                const i = items.indexOf(document.activeElement as HTMLButtonElement)
                items[(i + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length]?.focus()
                e.preventDefault()
            }
        }
        const scroll = () => onClose()
        document.addEventListener('mousedown', away)
        document.addEventListener('keydown', key)
        window.addEventListener('scroll', scroll, true)
        return () => {
            document.removeEventListener('mousedown', away)
            document.removeEventListener('keydown', key)
            window.removeEventListener('scroll', scroll, true)
        }
    }, [onClose])
    return (
        <ul ref={ref} className="lens-colmenu" role="menu" aria-label={label} style={pos ? { left: pos.left, top: pos.top } : { visibility: 'hidden', left: 0, top: 0 }}>
            {children}
        </ul>
    )
}

/** "Personalize columns": choose which columns this list shows (remembered in this browser). */
function ColumnsPicker<T>({ sorter }: { sorter: Sorter<T> }) {
    const [open, setOpen] = useState(false)
    const btn = useRef<HTMLButtonElement>(null)
    const cols = Object.keys(sorter.labels)
    const visibleCount = cols.filter((c) => sorter.shows(c)).length
    const r = btn.current?.getBoundingClientRect()
    return (
        <>
            <button
                ref={btn}
                type="button"
                className="lens-btn lens-btn--ghost lens-btn--small"
                aria-haspopup="menu"
                aria-expanded={open}
                onClick={() => setOpen(!open)}
                data-tip="Personalize columns: choose which columns this list shows (remembered in this browser)"
            >
                <Icon name="columns" />
                Columns{sorter.hiddenCols.size ? ` (${visibleCount} of ${cols.length})` : ''}
            </button>
            {open && r && (
                <PopupMenu x={r.right - 220} y={r.bottom + 4} label="Personalize columns" onClose={() => setOpen(false)}>
                    {cols.map((c) => {
                        const on = sorter.shows(c)
                        return (
                            <li role="none" key={c}>
                                <button
                                    type="button"
                                    role="menuitemcheckbox"
                                    aria-checked={on}
                                    disabled={(on && visibleCount === 1) || sorter.isRequired(c)}
                                    title={sorter.isRequired(c) ? 'Always shown' : undefined}
                                    onClick={() => sorter.setColumnHidden(c, on)}
                                >
                                    <span className="lens-colmenu__check" aria-hidden="true">
                                        {on ? '✓' : ''}
                                    </span>
                                    {sorter.labels[c]}
                                </button>
                            </li>
                        )
                    })}
                    {sorter.hiddenCols.size > 0 && (
                        <li role="none" className="lens-colmenu__sep">
                            <button type="button" role="menuitem" onClick={() => sorter.resetColumns()}>
                                Show all columns
                            </button>
                        </li>
                    )}
                </PopupMenu>
            )}
        </>
    )
}

/**
 * The bar above a list: active grouping, cell filters and sort (each removable), Expand / Collapse
 * all, Personalize columns, and the right-click cell menu (Show matching / Filter out / Group by).
 */
/**
 * The record count, worded like a ServiceNow list: "23 tables", or "1 to 100 of 340 tables" when
 * only the first rows are shown, plus "filtered from 400" when cell filters narrow the list.
 */
function ListCount<T>({ sorter, noun, limit }: { sorter: Sorter<T>; noun: string; limit?: number }) {
    const n = sorter.rows.length
    const shown = limit ? Math.min(limit, n) : n
    const text = shown < n ? `1 to ${shown} of ${n} ${noun}` : `${n} ${noun}`
    return (
        <span className="lens-crumbs__count" role="status" aria-live="polite">
            {text}
            {sorter.filters.length > 0 && sorter.total !== n && <span className="lens-muted"> (filtered from {sorter.total})</span>}
        </span>
    )
}

/**
 * The bar above a list: record count, cell filters, grouping and sort (each removable), and
 * column options. `noun` names what is counted; `limit` is how many rows are rendered.
 */
export function ListBreadcrumb<T>({ sorter, noun = 'records', limit }: { sorter: Sorter<T>; noun?: string; limit?: number }) {
    const name = (k: string) => sorter.labels[k] || k
    const m = sorter.menu
    const cellMenu = m && (
        <PopupMenu x={m.x} y={m.y} label={`${name(m.col)} cell options`} onClose={sorter.closeMenu}>
            <li role="none">
                <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                        sorter.addFilter({ col: m.col, id: m.id, label: m.label, out: false })
                        sorter.closeMenu()
                    }}
                >
                    Show matching ({name(m.col)} = {m.label})
                </button>
            </li>
            <li role="none">
                <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                        sorter.addFilter({ col: m.col, id: m.id, label: m.label, out: true })
                        sorter.closeMenu()
                    }}
                >
                    Filter out ({name(m.col)} ≠ {m.label})
                </button>
            </li>
            <li role="none" className="lens-colmenu__sep">
                <button
                    type="button"
                    role="menuitem"
                    disabled={sorter.groupBy === m.col}
                    onClick={() => {
                        sorter.setGroupBy(m.col)
                        sorter.closeMenu()
                    }}
                >
                    Group by {name(m.col)}
                </button>
            </li>
        </PopupMenu>
    )
    const active = sorter.key || sorter.groupBy || sorter.filters.length
    return (
        <div className="lens-crumbs" aria-label="List settings">
            <ListCount sorter={sorter} noun={noun} limit={limit} />
            {sorter.filters.map((f, i) => (
                <span className="lens-crumb lens-crumb--filter" key={`${f.col}:${f.id}:${f.out}`}>
                    <Icon name="filter" size={12} />
                    {name(f.col)} {f.out ? '≠' : '='} <strong>{f.label}</strong>
                    <button type="button" className="lens-crumb__x" aria-label={`Remove filter ${name(f.col)} ${f.out ? 'not' : ''} ${f.label}`} onClick={() => sorter.removeFilter(i)}>
                        <Icon name="close" size={12} />
                    </button>
                </span>
            ))}
            {sorter.groupBy && (
                <span className="lens-crumb">
                    Grouped by <strong>{name(sorter.groupBy)}</strong>
                    <button type="button" className="lens-crumb__x" aria-label={`Remove grouping by ${name(sorter.groupBy)}`} onClick={() => sorter.setGroupBy('')}>
                        <Icon name="close" size={12} />
                    </button>
                </span>
            )}
            {sorter.key && (
                <span className="lens-crumb">
                    Sorted by <strong>{name(sorter.key)}</strong> {sorter.dir === 'asc' ? '(a to z)' : '(z to a)'}
                    <button type="button" className="lens-crumb__x" aria-label={`Remove sort by ${name(sorter.key)}`} onClick={() => sorter.clearSort()}>
                        <Icon name="close" size={12} />
                    </button>
                </span>
            )}
            {!active && sorter.personalizable && <span className="lens-crumbs__hint">Right-click a cell to show matching or filter out.</span>}
            <span className="lens-crumbs__actions">
                {sorter.groups && (
                    <>
                        <button type="button" className="lens-link" onClick={() => sorter.setAllCollapsed(false)}>
                            Expand all
                        </button>
                        <button type="button" className="lens-link" onClick={() => sorter.setAllCollapsed(true)}>
                            Collapse all
                        </button>
                    </>
                )}
                {sorter.personalizable && <ColumnsPicker sorter={sorter} />}
            </span>
            {cellMenu}
        </div>
    )
}

/**
 * Renders a table body's rows, grouped when a group-by column is set. `limit` caps how many data
 * rows are rendered in total (group headings always show).
 */
export function GroupedRows<T>({ sorter, colSpan, render, limit }: { sorter: Sorter<T>; colSpan: number; render: (row: T, index: number) => React.ReactNode; limit?: number }) {
    const max = limit || Infinity
    if (!sorter.groups) return <>{sorter.rows.slice(0, max).map(render)}</>
    let shown = 0
    const out: React.ReactNode[] = []
    const label = sorter.labels[sorter.groupBy] || sorter.groupBy
    for (const g of sorter.groups) {
        const open = !sorter.collapsed.has(g.id)
        out.push(
            <tr key={`group:${g.id}`} className="lens-group">
                <th colSpan={colSpan} scope="rowgroup">
                    <button type="button" className="lens-group__toggle" aria-expanded={open} onClick={() => sorter.toggleGroup(g.id)}>
                        <span className={`lens-caret__icon${open ? ' lens-caret__icon--open' : ''}`} aria-hidden="true">
                            ▸
                        </span>
                        <span className="lens-muted">{label}:</span> <strong>{g.label}</strong> <span className="lens-muted">({g.count})</span>
                    </button>
                </th>
            </tr>
        )
        if (!open) continue
        for (const r of g.rows) {
            if (shown >= max) break
            out.push(render(r, shown++))
        }
    }
    return <>{out}</>
}
