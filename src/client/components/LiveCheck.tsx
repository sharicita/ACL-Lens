import React, { useState } from 'react'
import { ALL_TABLE_OPS, AnalysisResult, FIELD_OPS } from '../types'
import { LiveResult, LiveStatus, runLiveCheck } from '../utils/liveCheck'
import { OP_HELP, rank, STATUS_LABEL, statusText } from '../utils/status'
import { download, safeName, toCsv } from '../utils/download'
import RecordLink, { recordUrl } from './RecordLink'
import Tip from './Tip'
import Icon from './Icon'

interface Props {
    results: AnalysisResult
    index: number
    canRun: boolean
}

const ST_TEXT: { [s: string]: string } = {
    passed: 'Passed',
    blocked: 'Blocked',
    skipped: 'Skipped',
    undefined: 'Undefined',
    applied: 'Applied',
    not_applied: 'Not applied',
    '': '–',
}
const ST_TIP: { [s: string]: string } = {
    passed: 'Access granted',
    blocked: 'Access denied',
    skipped: 'Did not evaluate',
    undefined: 'No rule found',
    applied: 'The filter hides rows that do not match it',
    not_applied: 'The filter does not apply to this subject',
}

function St({ s }: { s: LiveStatus }) {
    return (
        <span className={`lens-live__st lens-live__st--${s || 'none'}`} data-tip={ST_TIP[s] || ''}>
            {ST_TEXT[s] ?? s}
        </span>
    )
}

/**
 * Live check: the platform evaluates access right now for one subject, exactly as the Access
 * Analyzer does, so it shows every data point the analyzer shows next to ACL Lens's prediction.
 */
export default function LiveCheck({ results, index, canRun }: Props) {
    const subjects = results.subjects
    const table = subjects[0].tables[index]
    const [who, setWho] = useState(subjects[0].subject.key)
    const [record, setRecord] = useState('')
    const [field, setField] = useState('')
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    const [live, setLive] = useState<LiveResult | null>(null)
    const [open, setOpen] = useState<Set<string>>(new Set())
    const dd = results.defaultDeny
    const fieldNames = table.fields.map((f) => f.f).filter((f) => f !== '*')

    if (!canRun)
        return (
            <p className="lens-muted">
                Live checks use the platform's Access Analyzer, which only runs for the <code>admin</code>, <code>user_admin</code> or <code>access_analyzer_admin</code> role.
                ACL Lens doesn't change who can run it.
            </p>
        )

    const run = async () => {
        const sr = subjects.find((s) => s.subject.key === who) || subjects[0]
        setBusy(true)
        setError('')
        try {
            const ops = field.trim() ? FIELD_OPS : ALL_TABLE_OPS
            const r = await runLiveCheck({ subject: { type: sr.subject.type, id: sr.subject.id, label: sr.subject.label }, table: table.t, record, field, ops })
            setLive(r)
            setOpen(new Set())
        } catch (e: any) {
            setError(e && e.message ? e.message : String(e))
        } finally {
            setBusy(false)
        }
    }

    const cellFor = (op: string) => {
        if (!live) return undefined
        const sr = subjects.find((s) => s.subject.key === `${live.subject.type}:${live.subject.id}`)
        if (!sr) return undefined
        const t = sr.tables[index]
        return live.field ? t.fields.find((f) => f.f === live.field)?.ops[op] : t.ops[op]
    }
    const predicted = (op: string) => {
        const cell = cellFor(op)
        return cell ? statusText(cell.s, dd, op) : 'not analyzed'
    }
    /** short label for the table; the full wording is in the tip */
    const predictedShort = (op: string) => {
        const cell = cellFor(op)
        if (!cell) return '–'
        if (cell.s === 'N') return rank('N', dd, op) > 0 ? 'No rule: allowed' : 'No rule: blocked'
        return STATUS_LABEL[cell.s]
    }

    const exportCsv = () => {
        if (!live) return
        const rows: unknown[][] = [
            [`Live check: ${live.subject.label} (${live.subject.type}) on ${live.table}${live.field ? '.' + live.field : ''}${live.record ? ' record ' + live.record : ''} at ${live.executedAt}`],
            [],
            ['Operation', 'Overall access', 'Security data filter', 'ACL', 'Access handler', 'Data filtration', 'Script', 'Admin override', 'Insights', 'ACL Lens prediction', 'Execution time'],
        ]
        for (const o of live.operations)
            rows.push([o.op, ST_TEXT[o.overall], ST_TEXT[o.securityDataFilter], ST_TEXT[o.acl], ST_TEXT[o.accessHandler], ST_TEXT[o.dataFiltration], o.script ? 'yes' : '', o.adminOverride, o.insights, predicted(o.op), o.time])
        rows.push([])
        rows.push(['Operation', 'ACL', 'Level', 'Decision', 'Status', 'Roles', 'Roles result', 'Condition', 'Script', 'Security attribute'])
        for (const o of live.operations)
            for (const a of o.acls)
                rows.push([o.op, a.name, a.level, a.decision === 'deny' ? 'Deny unless' : 'Allow if', ST_TEXT[a.status], a.roles.join(' '), ST_TEXT[a.rolesResult], ST_TEXT[a.conditionResult], ST_TEXT[a.scriptResult], ST_TEXT[a.securityAttributeResult]])
        download(`${safeName(`live-${live.subject.label}-${live.table}`)}.csv`, toCsv(rows), 'text/csv;charset=utf-8')
    }

    const toggle = (op: string) => {
        const n = new Set(open)
        n.has(op) ? n.delete(op) : n.add(op)
        setOpen(n)
    }

    return (
        <div className="lens-live">
            <Tip id="detail-live">
                The platform evaluates access right now, the same way its Access Analyzer does: security data filters, ACLs (with conditions and scripts when you give a
                record), access handlers and data filtration. It is read-only. Compare it with ACL Lens's prediction in the last column.
            </Tip>
            <div className="lens-live__form">
                <label className="lens-field">
                    <span>Subject</span>
                    <select className="lens-input" value={who} onChange={(e) => setWho(e.target.value)}>
                        {subjects.map((s) => (
                            <option key={s.subject.key} value={s.subject.key}>
                                {s.subject.label} ({s.subject.type})
                            </option>
                        ))}
                    </select>
                </label>
                <label className="lens-field">
                    <span data-tip="Optional. With a record, conditions and scripts are evaluated for that record.">Record sys_id (optional)</span>
                    <input className="lens-input" value={record} placeholder="32-character sys_id" onChange={(e) => setRecord(e.target.value.trim())} />
                </label>
                <label className="lens-field">
                    <span data-tip="Optional. Checks create, read and write for one field instead of the table operations.">Field (optional)</span>
                    <input className="lens-input" value={field} list={`live-fields-${table.t}`} placeholder="e.g. priority" onChange={(e) => setField(e.target.value.trim())} />
                    <datalist id={`live-fields-${table.t}`}>
                        {fieldNames.map((f) => (
                            <option key={f} value={f} />
                        ))}
                    </datalist>
                </label>
                <button type="button" className="lens-btn lens-btn--primary" disabled={busy} onClick={run}>
                    <Icon name="target" size={14} />
                    {busy ? 'Checking…' : 'Check live'}
                </button>
            </div>
            {error && (
                <p className="lens-alert lens-alert--critical" role="alert">
                    {error}
                </p>
            )}
            {live && (
                <section className="lens-live__result" aria-label="Live check results">
                    <div className="lens-live__meta">
                        <span>
                            <strong>{live.subject.label}</strong> · <code>{live.table + (live.field ? '.' + live.field : '')}</code>
                            {live.record && (
                                <>
                                    {' '}
                                    ·{' '}
                                    <RecordLink href={`/${live.table}.do?sys_id=${encodeURIComponent(live.record)}`} what="the record checked">
                                        record
                                    </RecordLink>
                                </>
                            )}
                        </span>
                        <span className="lens-muted">Executed {live.executedAt}</span>
                        {live.recordAvailable && <span className="lens-muted">Record available to the subject: {live.recordAvailable}</span>}
                        {live.readOnlyField && <span className="lens-muted">Read-only field: {live.readOnlyField}</span>}
                        <button type="button" className="lens-btn lens-btn--tertiary" onClick={exportCsv} data-tip="Download this live check, with every ACL checked, as CSV">
                            <Icon name="download" size={13} />
                            Export
                        </button>
                    </div>
                    {live.recordAvailable === 'no' && (
                        <p className="lens-alert lens-alert--warning" role="status">
                            {live.subject.label} can't see this record
                            {(() => {
                                const brs = Array.from(new Set(live.operations.flatMap((o) => o.steps.filter((s) => s.type === 'Business Rule').map((s) => s.name))))
                                return brs.length ? `: the query business rule ${brs.join(', ')} hides it` : ''
                            })()}
                            , so the platform blocks every operation before any ACL is checked. Try a record they can see, or leave the record empty to check the table.
                        </p>
                    )}
                    <div className="lens-mx__scroll">
                        <table className="lens-mx lens-mx--compact lens-live__table">
                            <thead>
                                <tr>
                                    <th>Operation</th>
                                    <th>Overall access</th>
                                    <th>Security data filter</th>
                                    <th>ACL</th>
                                    <th>Access handler</th>
                                    <th>Data filtration</th>
                                    <th data-tip="An ACL script took part in the decision">Script</th>
                                    <th data-tip="Whether admin overrides decided the result (needs a record)">Admin override</th>
                                    <th data-tip="What ACL Lens's static analysis predicted for this subject">ACL Lens prediction</th>
                                    <th>Execution time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {live.operations.map((o) => (
                                    <React.Fragment key={o.op}>
                                        <tr>
                                            <th scope="row">
                                                <button type="button" className="lens-caret" aria-expanded={open.has(o.op)} aria-label={`${open.has(o.op) ? 'Hide' : 'Show'} the rules checked for ${o.op}`} onClick={() => toggle(o.op)}>
                                                    <span className={`lens-caret__icon${open.has(o.op) ? ' lens-caret__icon--open' : ''}`}>▸</span>
                                                </button>
                                                <span data-tip={OP_HELP[o.op]}>{o.op}</span>
                                            </th>
                                            <td>
                                                <St s={o.overall} />
                                            </td>
                                            <td>
                                                <St s={o.securityDataFilter} />
                                            </td>
                                            <td>
                                                <St s={o.acl} />
                                            </td>
                                            <td>
                                                <St s={o.accessHandler} />
                                            </td>
                                            <td>
                                                <St s={o.dataFiltration} />
                                            </td>
                                            <td>{o.script ? <span data-tip="An ACL script was evaluated">◆</span> : ''}</td>
                                            <td className="lens-muted">{o.adminOverride}</td>
                                            <td className="lens-muted lens-live__pred" data-tip={predicted(o.op)}>
                                                {predictedShort(o.op)}
                                            </td>
                                            <td className="lens-muted lens-live__time">{o.time}</td>
                                        </tr>
                                        {o.insights && (
                                            <tr className="lens-live__insight">
                                                <td colSpan={10}>{o.insights}</td>
                                            </tr>
                                        )}
                                        {open.has(o.op) && (
                                            <tr className="lens-live__detail">
                                                <td colSpan={10}>
                                                    {!o.acls.length && !o.steps.length && <span className="lens-muted">No rule matched this operation.</span>}
                                                    {o.acls.length > 0 && (
                                                        <table className="lens-live__acls">
                                                            <thead>
                                                                <tr>
                                                                    <th>ACL</th>
                                                                    <th>Type</th>
                                                                    <th>Status</th>
                                                                    <th>Roles</th>
                                                                    <th>Condition</th>
                                                                    <th>Script</th>
                                                                    <th>Security attribute</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {o.acls.map((a, i) => (
                                                                    <tr key={`${a.sysId}-${i}`}>
                                                                        <td>
                                                                            <RecordLink href={recordUrl.acl(a.sysId)} what={`ACL record ${a.name}`}>
                                                                                {a.name}
                                                                            </RecordLink>
                                                                            <span className="lens-muted"> · {a.level}</span>
                                                                        </td>
                                                                        <td>{a.decision === 'deny' ? 'Deny unless' : 'Allow if'}</td>
                                                                        <td>
                                                                            <St s={a.status} />
                                                                        </td>
                                                                        <td>
                                                                            <St s={a.rolesResult} />
                                                                            {a.roles.length > 0 && <span className="lens-muted lens-live__roles"> {a.roles.join(', ')}</span>}
                                                                        </td>
                                                                        <td>
                                                                            <St s={a.conditionResult} />
                                                                        </td>
                                                                        <td>
                                                                            <St s={a.scriptResult} />
                                                                        </td>
                                                                        <td>
                                                                            <St s={a.securityAttributeResult} />
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    )}
                                                    {o.steps.length > 0 && (
                                                        <ul className="lens-live__steps">
                                                            {o.steps.map((s, i) => (
                                                                <li key={i}>
                                                                    <span className="lens-muted">{s.type}:</span> {s.name}
                                                                    {s.mode && <span className="lens-muted"> ({s.mode})</span>} {s.status && <St s={s.status} />}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <p className="lens-muted lens-live__legend">
                        The three checks run in order: access handlers, data filters, then ACLs. Access is granted only if each one passes or does not apply. Without a record,
                        conditions and scripts are skipped.
                    </p>
                </section>
            )}
        </div>
    )
}
