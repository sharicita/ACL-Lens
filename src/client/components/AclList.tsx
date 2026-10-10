import React, { useEffect, useId, useState } from 'react'
import { AclDetail, LensApi } from '../services/LensApi'
import { AclInfo, AclOutcome, Cell } from '../types'
import { REASON_TEXT, RESULT_TEXT, statusText } from '../utils/status'
import { StatusCell } from './StatusCell'
import DocLink from './DocLink'
import RecordLink, { recordUrl } from './RecordLink'

interface Props {
    cell: Cell
    acls: AclInfo[]
    op: string
    defaultDeny: boolean
}

// ACL details are fetched once per page view and shared by every drawer that shows the ACL
const detailCache = new Map<string, Promise<AclDetail>>()
function loadDetail(id: string) {
    if (!detailCache.has(id)) detailCache.set(id, LensApi.aclDetail(id))
    return detailCache.get(id) as Promise<AclDetail>
}

const SCRIPT_PREVIEW_LINES = 12

export function ConditionDetail({ acl, initiallyOpen = false }: { acl: AclInfo; initiallyOpen?: boolean }) {
    const [open, setOpen] = useState(initiallyOpen)
    const [data, setData] = useState<AclDetail | null>(null)
    const [error, setError] = useState('')
    const [fullScript, setFullScript] = useState(false)
    const id = useId()

    const toggle = () => {
        const next = !open
        setOpen(next)
        if (next && !data)
            loadDetail(acl.id)
                .then(setData)
                .catch((e) => setError(e.message))
    }

    // opened from the start (e.g. the matrix condition popover): load at once
    useEffect(() => {
        if (initiallyOpen)
            loadDetail(acl.id)
                .then(setData)
                .catch((e) => setError(e.message))
    }, [])

    const what = [acl.condition ? 'condition' : '', acl.hasScript ? 'script' : '', acl.securityAttribute ? 'security attribute' : '', acl.appliesTo ? '"applies to" filter' : '']
        .filter(Boolean)
        .join(', ')
    if (!what) return null
    const lines = data && data.script ? data.script.split('\n') : []
    return (
        <div className="lens-cond">
            <button type="button" className="lens-disclosure lens-disclosure--small" aria-expanded={open} aria-controls={id} onClick={toggle}>
                <span className={`lens-caret__icon${open ? ' lens-caret__icon--open' : ''}`} aria-hidden="true">
                    ▸
                </span>
                {open ? 'Hide' : 'Show'} the {what}
            </button>
            {open && (
                <div id={id} className="lens-cond__body" aria-live="polite">
                    {!data && !error && <p className="lens-muted">Loading…</p>}
                    {error && <p className="lens-alert lens-alert--critical">{error}</p>}
                    {data && (
                        <dl>
                            {data.condition && (
                                <>
                                    <dt>Condition – the record must match</dt>
                                    <dd>{data.condition}</dd>
                                </>
                            )}
                            {data.applies_to && (
                                <>
                                    <dt>Applies to – only these records</dt>
                                    <dd>{data.applies_to}</dd>
                                </>
                            )}
                            {data.security_attribute && (
                                <>
                                    <dt>Security attribute</dt>
                                    <dd>
                                        <code>{data.security_attribute}</code>
                                    </dd>
                                </>
                            )}
                            {data.has_script && (
                                <>
                                    <dt>Script – must set answer to true</dt>
                                    <dd>
                                        {data.script_hidden ? (
                                            <span className="lens-muted">Hidden: you don't have access to read ACL scripts. A security administrator can review it.</span>
                                        ) : (
                                            <>
                                                <pre className="lens-md__pre">
                                                    <code>{(fullScript ? lines : lines.slice(0, SCRIPT_PREVIEW_LINES)).join('\n')}</code>
                                                </pre>
                                                {lines.length > SCRIPT_PREVIEW_LINES && (
                                                    <button type="button" className="lens-link" onClick={() => setFullScript(!fullScript)}>
                                                        {fullScript ? 'Show less' : `Show all ${lines.length} lines`}
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </dd>
                                </>
                            )}
                            {data.description && (
                                <>
                                    <dt>Description</dt>
                                    <dd>{data.description}</dd>
                                </>
                            )}
                        </dl>
                    )}
                    <p className="lens-muted lens-cond__next">
                        To see the result for one specific record, impersonate the user in a sub-production instance with security debugging on.{' '}
                        <DocLink doc="troubleshoot" label="ServiceNow: troubleshooting access control" />
                    </p>
                </div>
            )}
        </div>
    )
}

function Outcome({ o, acl }: { o: AclOutcome; acl: AclInfo }) {
    return (
        <li className={`lens-why__acl lens-why__acl--${o.r}`}>
            <span
                className={`lens-pill lens-pill--${acl.decision}`}
                data-tip={
                    acl.decision === 'deny'
                        ? 'Deny-unless: every matched deny-unless rule must pass, or access is denied.'
                        : 'Allow-if: passing any one matched allow-if rule is enough.'
                }
            >
                {acl.decision === 'deny' ? 'Deny unless' : 'Allow if'}
            </span>
            <RecordLink href={recordUrl.acl(acl.id)} what={`ACL record ${acl.name}`}>
                {acl.name}
            </RecordLink>
            <span className={`lens-result lens-result--${o.r}`}>{RESULT_TEXT[o.r]}</span>
            <span className="lens-why__reason">{REASON_TEXT[o.c] || o.c}</span>
            <span className="lens-why__meta">
                {acl.roles.length ? (
                    <>
                        Roles: {acl.roles.map((r) => <code key={r}>{r}</code>)}
                    </>
                ) : (
                    'No roles'
                )}
                {acl.adminOverrides ? ' · admin overrides' : null}
                {acl.scope ? ` · ${acl.scope}` : null}
            </span>
            {(o.r === 'C' || o.r === 'F') && <ConditionDetail acl={acl} />}
        </li>
    )
}

/** Explains one evaluated cell: the ACL level that matched and each ACL's outcome. */
export default function AclList({ cell, acls, op, defaultDeny }: Props) {
    return (
        <div className="lens-why">
            <div className="lens-why__head">
                <StatusCell s={cell.s} op={op} defaultDeny={defaultDeny} />
                <strong>{statusText(cell.s, defaultDeny)}</strong>
                <span className="lens-muted">
                    {cell.lvl ? (
                        <>
                            matched <code>{cell.lvl}</code>
                        </>
                    ) : (
                        'no allow rule at any level'
                    )}
                    {cell.dlvl ? (
                        <>
                            {' '}
                            · deny-unless at <code>{cell.dlvl}</code>
                        </>
                    ) : null}
                </span>
            </div>
            {cell.a.length > 0 && (
                <ul className="lens-why__list">
                    {cell.a.map((o, idx) => {
                        const acl = acls[o.i]
                        return acl ? <Outcome key={`${acl.id}-${idx}`} o={o} acl={acl} /> : null
                    })}
                </ul>
            )}
        </div>
    )
}
