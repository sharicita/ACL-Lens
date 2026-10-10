import React from 'react'
import { ChartType, DIM_LABEL, ReportData, ReportGroup, TONE } from './types'

interface Props {
    chart: ChartType
    data: ReportData
    /** a bar, slice or row was chosen: open the matching rows */
    onPick?: (group: ReportGroup | null) => void
    /** compact (dashboard tile) or full (preview/detail) */
    compact?: boolean
}

const STACK_ORDER = ['Granted', 'Conditional', 'No rule (allowed)', 'No rule', 'Denied', 'Applied', 'Not applied', 'Depends']
const SERIES = ['s1', 's2', 's3', 's4', 's5', 's6', 's7']

function toneOf(label: string, i: number) {
    return TONE[label] || SERIES[i % SERIES.length]
}

const fmt = (n: number) => n.toLocaleString()

function Empty({ data }: { data: ReportData }) {
    return <p className="lens-muted lens-chart__empty">{data.note || `Nothing found in this run (0 ${data.unit}).`}</p>
}

function Tile({ data, onPick }: Props) {
    const top = data.groups.slice(0, 3)
    return (
        <div className="lens-chart-tile">
            <button type="button" className="lens-chart-tile__value" onClick={() => onPick && onPick(null)} data-tip={`Show all ${fmt(data.total)} ${data.unit}`}>
                {fmt(data.total)}
            </button>
            <span className="lens-muted">{data.unit}</span>
            {data.note && !data.total && <p className="lens-muted lens-chart__empty">{data.note}</p>}
            {top.length > 0 && data.total > 0 && (
                <ul className="lens-chart-tile__top">
                    {top.map((g) => (
                        <li key={g.key}>
                            <button type="button" className="lens-link" onClick={() => onPick && onPick(g)}>
                                {g.label}
                            </button>{' '}
                            <span className="lens-muted">{fmt(g.value)}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}

function Bars({ data, onPick }: Props) {
    if (!data.total) return <Empty data={data} />
    const max = Math.max(...data.groups.map((g) => g.value), 1)
    const stacked = data.groups.some((g) => g.parts && Object.keys(g.parts).length > 1)
    const parts = stacked ? STACK_ORDER.filter((p) => data.groups.some((g) => g.parts && g.parts[p])).concat(
        Array.from(new Set(data.groups.flatMap((g) => Object.keys(g.parts || {})))).filter((p) => STACK_ORDER.indexOf(p) < 0)
    ) : []
    return (
        <div className="lens-chart-bars">
            {stacked && (
                <ul className="lens-chart__legend" aria-hidden="true">
                    {parts.map((p, i) => (
                        <li key={p}>
                            <span className={`lens-chart__swatch lens-tone--${toneOf(p, i)}`} />
                            {p}
                        </li>
                    ))}
                </ul>
            )}
            <ul className="lens-chart-bars__list" aria-label={`${DIM_LABEL[data.groupBy] || 'Group'} by number of ${data.unit}`}>
                {data.groups.map((g) => (
                    <li key={g.key}>
                        <button
                            type="button"
                            className="lens-chart-bars__row"
                            onClick={() => onPick && onPick(g.key === '__other' ? null : g)}
                            aria-label={`${g.label}: ${fmt(g.value)} ${data.unit}${g.parts ? ' (' + Object.keys(g.parts).map((p) => `${p} ${g.parts![p]}`).join(', ') + ')' : ''}`}
                            data-tip={g.parts ? Object.keys(g.parts).map((p) => `${p}: ${fmt(g.parts![p])}`).join(' · ') : `${fmt(g.value)} ${data.unit}`}
                        >
                            <span className="lens-chart-bars__label">{g.label}</span>
                            <span className="lens-chart-bars__track">
                                {stacked && g.parts ? (
                                    parts.map((p, i) =>
                                        g.parts![p] ? (
                                            <span key={p} className={`lens-chart-bars__bar lens-tone--${toneOf(p, i)}`} style={{ width: `${(g.parts![p] / max) * 100}%` }} />
                                        ) : null
                                    )
                                ) : (
                                    <span className={`lens-chart-bars__bar lens-tone--${toneOf(g.key, 0)}`} style={{ width: `${(g.value / max) * 100}%` }} />
                                )}
                            </span>
                            <span className="lens-chart-bars__value">{fmt(g.value)}</span>
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    )
}

function Donut({ data, onPick }: Props) {
    if (!data.total) return <Empty data={data} />
    const R = 42
    const C = 2 * Math.PI * R
    let offset = 0
    const segs = data.groups.map((g, i) => {
        const len = (g.value / data.total) * C
        const seg = { g, i, len, offset }
        offset += len
        return seg
    })
    return (
        <div className="lens-chart-donut">
            <svg viewBox="0 0 110 110" role="img" aria-label={`${fmt(data.total)} ${data.unit}: ${data.groups.map((g) => `${g.label} ${g.value}`).join(', ')}`}>
                <g transform="rotate(-90 55 55)">
                    {segs.map(({ g, i, len, offset: o }) => (
                        <circle
                            key={g.key}
                            className={`lens-chart-donut__seg lens-stroke--${toneOf(g.key, i)}`}
                            cx="55"
                            cy="55"
                            r={R}
                            fill="none"
                            strokeWidth="16"
                            strokeDasharray={`${len} ${C - len}`}
                            strokeDashoffset={-o}
                            onClick={() => onPick && onPick(g.key === '__other' ? null : g)}
                        />
                    ))}
                </g>
                <text x="55" y="53" textAnchor="middle" className="lens-chart-donut__total">
                    {fmt(data.total)}
                </text>
                <text x="55" y="67" textAnchor="middle" className="lens-chart-donut__unit">
                    {data.unit.length > 14 ? data.unit.split(' ')[0] : data.unit}
                </text>
            </svg>
            <ul className="lens-chart__legend lens-chart__legend--col">
                {segs.map(({ g, i }) => (
                    <li key={g.key}>
                        <button type="button" className="lens-link" onClick={() => onPick && onPick(g.key === '__other' ? null : g)}>
                            <span className={`lens-chart__swatch lens-tone--${toneOf(g.key, i)}`} />
                            {g.label}
                        </button>
                        <span className="lens-muted">
                            {fmt(g.value)} · {Math.round((g.value / data.total) * 100)}%
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    )
}

function List({ data, onPick, compact }: Props) {
    if (!data.total) return <Empty data={data} />
    const rows = data.rows.slice(0, compact ? 6 : 50)
    return (
        <div className="lens-chart-list">
            <table className="lens-mx lens-mx--compact">
                <thead>
                    <tr>
                        {data.columns.map((c) => (
                            <th key={c.key} scope="col">
                                {c.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r, i) => (
                        <tr key={i}>
                            {data.columns.map((c) => (
                                <td key={c.key}>{c.key === 'table' ? <code>{r.table}</code> : String((r as any)[c.key] ?? '')}</td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
            {data.total > rows.length && (
                <button type="button" className="lens-link" onClick={() => onPick && onPick(null)}>
                    Show all {fmt(data.total)} {data.unit}
                </button>
            )}
        </div>
    )
}

export default function ReportChart(props: Props) {
    if (props.data.error) return <p className="lens-alert lens-alert--critical">{props.data.error}</p>
    if (props.chart === 'tile') return <Tile {...props} />
    if (props.chart === 'donut') return <Donut {...props} />
    if (props.chart === 'list') return <List {...props} />
    return <Bars {...props} />
}
