import React, { useEffect, useRef, useState } from 'react'
import { AnalysisResult, TABLE_OPS } from '../types'
import { LiveStatus } from '../utils/liveCheck'
import { VERIFY_MAX_TABLES, VerifyProgress, VerifyRow, Verdict, verifyLive } from '../utils/liveVerify'
import { OP_HELP, STATUS_LABEL, statusText } from '../utils/status'
import { download, safeName, toCsv } from '../utils/download'
import Icon from './Icon'

interface Props {
    results: AnalysisResult
    /** subject key of the baseline: the live check evaluates as this subject */
    baseline: string
    /** table indexes to verify (the tables the matrix shows) */
    tables: () => number[]
    canRun: boolean
    fileBase: string
    onOpenTable: (index: number) => void
}

const LIVE_TEXT: { [s: string]: string } = { passed: 'Passed', blocked: 'Blocked', skipped: 'Skipped', undefined: 'Undefined', applied: 'Applied', not_applied: 'Not applied', '': '–' }
const VERDICT_TEXT: { [v: string]: string } = { agree: 'Agrees', differs: 'Differs', resolved: 'Conditional', error: 'Error' }

function Live({ s }: { s: LiveStatus | undefined }) {
    const v = s || ''
    return <span className={`lens-live__st lens-live__st--${v || 'none'}`}>{LIVE_TEXT[v] ?? v}</span>
}

/**
 * Verify live: the platform evaluates every table in the run as the baseline subject (the same
 * evaluation as its Access Analyzer, which impersonates the subject) and ACL Lens lists where the
 * platform's answer differs from the prediction, with the access handler, data filtration or ACL
 * step that decided it.
 */
export default function LiveVerify({ results, baseline, tables, canRun, fileBase, onOpenTable }: Props) {
    const subject = results.subjects.find((s) => s.subject.key === baseline) || results.subjects[0]
    const [rows, setRows] = useState<VerifyRow[] | null>(null)
    const [progress, setProgress] = useState<VerifyProgress | null>(null)
    const [running, setRunning] = useState(false)
    const [showAll, setShowAll] = useState(false)
    const [checkedFor, setCheckedFor] = useState('')
    const [notice, setNotice] = useState('')
    const cancelled = useRef(false)

    // results belong to one subject: clear them when the baseline changes
    useEffect(() => {
        if (checkedFor && subject && checkedFor !== subject.subject.key && !running) {
            setRows(null)
            setProgress(null)
        }
    }, [subject && subject.subject.key])
    useEffect(() => () => void (cancelled.current = true), [])

    if (!subject) return null
    const ops = results.ops && results.ops.length ? (results.ops as string[]) : (TABLE_OPS as string[])

    const start = async () => {
        const list = tables()
        setNotice(list.length ? '' : 'No tables match the matrix filter. Clear the filter to choose the tables to verify.')
        if (!list.length) return
        if (list.length > 50 && !window.confirm(`Verify ${Math.min(list.length, VERIFY_MAX_TABLES)} tables live as ${subject.subject.label}? Each table is one platform check, so this can take a few minutes.`)) return
        cancelled.current = false
        setRunning(true)
        setShowAll(false)
        setRows([])
        setCheckedFor(subject.subject.key)
        setProgress({ done: 0, total: Math.min(list.length, VERIFY_MAX_TABLES) })
        try {
            const out = await verifyLive({
                results,
                subject,
                tables: list,
                ops,
                isCancelled: () => cancelled.current,
                onProgress: (p, r) => {
                    if (cancelled.current) return
                    setProgress(p)
                    setRows(r)
                },
            })
            setRows(out)
        } finally {
            setRunning(false)
        }
    }

    const count = (v: Verdict) => (rows || []).filter((r) => r.verdict === v).length
    const order: { [v: string]: number } = { error: 0, differs: 1, resolved: 2, agree: 3 }
    const shown = (rows || [])
        .filter((r) => showAll || r.verdict === 'differs' || r.verdict === 'error')
        .sort((a, b) => order[a.verdict] - order[b.verdict] || a.table.localeCompare(b.table) || ops.indexOf(a.op) - ops.indexOf(b.op))
    const handlerBlocks = (rows || []).filter((r) => r.live && r.live.accessHandler === 'blocked').length
    const dd = results.defaultDeny

    const exportCsv = () => {
        if (!rows) return
        const out: unknown[][] = [
            [`Live verification as ${subject.subject.label} (${subject.subject.type})`],
            [],
            ['Table', 'Label', 'Operation', 'ACL Lens', 'Live overall', 'Security data filter', 'ACL', 'Access handler', 'Data filtration', 'Result', 'Why'],
        ]
        for (const r of rows)
            out.push([r.table, r.label, r.op, r.op ? statusText(r.predicted, dd, r.op) : '', LIVE_TEXT[r.live?.overall || ''], LIVE_TEXT[r.live?.securityDataFilter || ''], LIVE_TEXT[r.live?.acl || ''], LIVE_TEXT[r.live?.accessHandler || ''], LIVE_TEXT[r.live?.dataFiltration || ''], VERDICT_TEXT[r.verdict], r.reason])
        download(`${safeName(`${fileBase}-live-${subject.subject.label}`)}.csv`, toCsv(out), 'text/csv;charset=utf-8')
    }

    return (
        <section className="lens-card lens-verify" aria-labelledby="verify-title">
            <div className="lens-card__header lens-verify__head">
                <div>
                    <h2 id="verify-title">Live verification</h2>
                    <p className="lens-muted lens-verify__sub">
                        The platform evaluates each table as <strong>{subject.subject.label}</strong>, the same way its Access Analyzer does. This covers access handlers and data
                        filtration, which ACL Lens can't read. Read-only, and nothing is saved.
                    </p>
                </div>
                {canRun ? (
                    <div className="lens-verify__actions">
                        {running ? (
                            <button type="button" className="lens-btn lens-btn--secondary" onClick={() => (cancelled.current = true)}>
                                <Icon name="close" size={13} />
                                Stop
                            </button>
                        ) : (
                            <button type="button" className="lens-btn lens-btn--primary" onClick={start} data-tip={`Run the platform's live check as ${subject.subject.label} for the tables shown in the matrix`}>
                                <Icon name="target" size={14} />
                                {rows ? 'Verify again' : `Verify live as ${subject.subject.label}`}
                            </button>
                        )}
                        {rows && rows.length > 0 && !running && (
                            <button type="button" className="lens-btn lens-btn--tertiary" onClick={exportCsv} data-tip="Download every operation checked, with the platform's answer, as CSV">
                                <Icon name="download" size={13} />
                                Export
                            </button>
                        )}
                    </div>
                ) : (
                    <p className="lens-muted lens-verify__sub">
                        Needs the <code>admin</code>, <code>user_admin</code> or <code>access_analyzer_admin</code> role, which the platform enforces.
                    </p>
                )}
            </div>
            {notice && (
                <div className="lens-verify__body">
                    <p className="lens-muted" role="status">
                        {notice}
                    </p>
                </div>
            )}
            {progress && (
                <div className="lens-verify__body">
                    {running && (
                        <div className="lens-verify__progress" role="status">
                            <progress max={progress.total} value={progress.done} aria-label="Tables checked" />
                            <span className="lens-muted">
                                Checked {progress.done} of {progress.total} tables…
                            </span>
                        </div>
                    )}
                    {rows && rows.length > 0 && (
                        <>
                            <p className="lens-verify__summary" role={running ? undefined : 'status'}>
                                <span className="lens-verify__chip lens-verify__chip--agree">{count('agree')} agree</span>
                                <span className="lens-verify__chip lens-verify__chip--differs">{count('differs')} differ</span>
                                <span className="lens-verify__chip" data-tip="ACL Lens predicted Conditional; the platform's table-level answer is shown for reference">
                                    {count('resolved')} conditional
                                </span>
                                {count('error') > 0 && <span className="lens-verify__chip lens-verify__chip--error">{count('error')} could not run</span>}
                                {handlerBlocks > 0 && (
                                    <span className="lens-muted">
                                        · access handlers blocked {handlerBlocks} operation{handlerBlocks === 1 ? '' : 's'}
                                    </span>
                                )}
                                {progress.total < tables().length && !running && (
                                    <span className="lens-muted">· only the first {VERIFY_MAX_TABLES} tables were checked</span>
                                )}
                            </p>
                            <label className="lens-check">
                                <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} /> <span>Show every operation checked</span>
                            </label>
                            {shown.length ? (
                                <div className="lens-mx__scroll">
                                    <table className="lens-mx lens-mx--compact lens-verify__table">
                                        <thead>
                                            <tr>
                                                <th>Table</th>
                                                <th>Operation</th>
                                                <th data-tip="ACL Lens's prediction">ACL Lens</th>
                                                <th data-tip="The platform's answer for the table (no specific record)">Live</th>
                                                <th>Access handler</th>
                                                <th>Data filtration</th>
                                                <th>Security data filter</th>
                                                <th>Why</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {shown.map((r, i) => (
                                                <tr key={`${r.table}-${r.op}-${i}`} className={`lens-verify__row--${r.verdict}`}>
                                                    <th scope="row">
                                                        <button type="button" className="lens-link" onClick={() => onOpenTable(r.ti)} data-tip="Open the table details, where the Live tab shows every rule the platform checked">
                                                            {r.label || r.table}
                                                        </button>{' '}
                                                        <code className="lens-muted">{r.table}</code>
                                                    </th>
                                                    {r.verdict === 'error' ? (
                                                        <td colSpan={7} className="lens-verify__err">
                                                            {r.reason}
                                                        </td>
                                                    ) : (
                                                        <>
                                                            <td data-tip={OP_HELP[r.op]}>{r.op}</td>
                                                            <td data-tip={statusText(r.predicted, dd, r.op)}>{STATUS_LABEL[r.predicted]}</td>
                                                            <td>
                                                                <Live s={r.live?.overall} />
                                                            </td>
                                                            <td>
                                                                <Live s={r.live?.accessHandler} />
                                                            </td>
                                                            <td>
                                                                <Live s={r.live?.dataFiltration} />
                                                            </td>
                                                            <td>
                                                                <Live s={r.live?.securityDataFilter} />
                                                            </td>
                                                            <td className="lens-verify__why">{r.reason}</td>
                                                        </>
                                                    )}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                !running && <p className="lens-muted">The platform agrees with every Granted, Denied and No rule result checked.</p>
                            )}
                        </>
                    )}
                </div>
            )}
        </section>
    )
}
