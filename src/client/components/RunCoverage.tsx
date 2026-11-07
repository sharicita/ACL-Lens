import React from 'react'
import { AnalysisResult, TableCoverage } from '../types'
import HelpTip from './HelpTip'
import Icon from './Icon'

interface Props {
    coverage: TableCoverage
    busy: string
    onNext: (startAfter: string, from: number, to: number) => void
}

const n = (x: number) => x.toLocaleString('en-US')

/** Which tables a capped run covers. Runs saved before sets existed only have a warning to go on. */
export function coverageOf(results: AnalysisResult): TableCoverage | null {
    if (results.coverage) return results.coverage
    const tables = results.subjects.length ? results.subjects[0].tables : []
    if (!results.truncated || !tables.length) return null
    const matched = results.warnings.map((w) => /^(\d+) tables matched/.exec(w)).filter((m) => !!m)[0]
    return { from: 1, to: tables.length, total: matched ? parseInt(matched[1], 10) : 0, nextAfter: tables[tables.length - 1].t }
}

/** The name for the next set's run: "My run (tables 1501–3000)". */
export function nextSetName(name: string, from: number, to: number): string {
    const base = (name || '').replace(/ \(tables \d+–\d+\)$/, '')
    return `${base ? `${base} ` : ''}(tables ${from}–${to})`
}

/** Shows how much of a large run this one covers, and starts the next set. */
export default function RunCoverage({ coverage: c, busy, onNext }: Props) {
    const size = Math.max(1, c.to - c.from + 1)
    const from = c.to + 1
    const to = c.total ? Math.min(c.total, c.to + size) : c.to + size
    const empty = c.to < c.from
    return (
        <section className="lens-coverage" aria-label="Tables covered by this run">
            <p className="lens-coverage__text">
                <Icon name="table" />
                {empty ? (
                    <span>No tables left to analyze: {n(c.total)} matched, and none come after this set's starting point.</span>
                ) : (
                    <span>
                        This run covers tables <strong>{n(c.from)}</strong> to <strong>{n(c.to)}</strong>
                        {c.total ? (
                            <>
                                {' '}
                                of <strong>{n(c.total)}</strong>
                            </>
                        ) : (
                            ''
                        )}
                        {c.nextAfter ? '.' : '. This is the last set.'}
                    </span>
                )}
                <HelpTip label="What is a set of tables?">
                    <span>
                        Runs analyze tables in alphabetical order, up to the Max tables number. <strong>Run next set</strong> repeats this run for the tables that come next, using the same
                        subjects and filters, and saves it as a new run. Each set has its own results, so counts and reports cover only that set.
                    </span>
                    <span>To cover more tables in one run, use Edit in workspace and raise Max tables (up to 5,000). Very long runs can be stopped by ServiceNow, which is what sets avoid.</span>
                </HelpTip>
            </p>
            {c.nextAfter && (
                <button
                    type="button"
                    className="lens-btn lens-btn--primary"
                    disabled={!!busy}
                    onClick={() => onNext(c.nextAfter as string, from, to)}
                    data-tip={`Analyzes the tables after ${c.nextAfter} and saves a new run. This run stays as it is.`}
                >
                    <Icon name="play" />
                    {busy === 'next' ? 'Running next set…' : `Run next set (${n(from)} to ${n(to)})`}
                </button>
            )}
        </section>
    )
}
