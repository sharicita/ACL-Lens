import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { AclInfo, Cell, DataFilterInfo } from '../types'
import { REASON_TEXT } from '../utils/status'
import { ConditionDetail } from './AclList'
import RecordLink, { recordUrl } from './RecordLink'
import Icon from './Icon'

interface Props {
    anchor: HTMLElement
    cell: Cell
    acls: AclInfo[]
    subjectLabel: string
    op: string
    /** "incident" or "incident.short_description" */
    target: string
    /** the security data filters that apply (or may apply) to this subject on the table */
    filters?: DataFilterInfo[]
    onOpenDetails?: () => void
    onClose: () => void
}

/**
 * "Why is this Conditional?" next to a matrix cell: the rules that decide record by record, with their
 * condition / script shown straight away. Positioned against the window so it is never cut off.
 */
export default function ConditionPopover({ anchor, cell, acls, subjectLabel, op, target, filters = [], onOpenDetails, onClose }: Props) {
    const ref = useRef<HTMLDivElement>(null)
    const titleId = useId()
    const [pos, setPos] = useState<{ left: number; top: number } | null>(null)

    const place = () => {
        const b = anchor.getBoundingClientRect()
        const m = ref.current
        const w = m ? m.offsetWidth : 380
        const h = m ? m.offsetHeight : 300
        const vw = document.documentElement.clientWidth
        const vh = window.innerHeight
        const left = Math.min(Math.max(8, b.left + b.width / 2 - w / 2), vw - w - 8)
        const below = b.bottom + 6
        const top = below + h <= vh - 8 ? below : b.top - 6 - h >= 8 ? b.top - 6 - h : Math.max(8, vh - h - 8)
        setPos({ left, top })
    }
    useLayoutEffect(place, [anchor])
    useEffect(() => {
        if (pos) ref.current?.focus()
    }, [pos !== null])
    useEffect(() => {
        const away = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && !anchor.contains(e.target as Node) && onClose()
        const key = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose()
                anchor.focus()
            }
        }
        document.addEventListener('mousedown', away)
        document.addEventListener('keydown', key)
        window.addEventListener('resize', place)
        return () => {
            document.removeEventListener('mousedown', away)
            document.removeEventListener('keydown', key)
            window.removeEventListener('resize', place)
        }
    }, [anchor])

    // the rules that make the result depend on the record (allow-if or deny-unless)
    const deciding = cell.a.filter((o) => o.r === 'C' && acls[o.i])
    return (
        <div
            ref={ref}
            className="lens-condpop"
            role="dialog"
            aria-labelledby={titleId}
            tabIndex={-1}
            style={pos ? { left: pos.left, top: pos.top } : { visibility: 'hidden', left: 0, top: 0 }}
        >
            <div className="lens-condpop__head">
                <h3 id={titleId}>
                    Why it's Conditional
                    <span className="lens-muted">
                        {subjectLabel} · {op} · <code>{target}</code>
                    </span>
                </h3>
                <button
                    type="button"
                    className="lens-icon-btn"
                    aria-label="Close"
                    onClick={() => {
                        onClose()
                        anchor.focus()
                    }}
                >
                    <Icon name="close" size={14} />
                </button>
            </div>
            <div className="lens-condpop__body">
                {cell.df && (
                    <div className="lens-condpop__df">
                        <p className="lens-muted lens-condpop__lead">
                            <Icon name="filter" size={12} />{' '}
                            {cell.df === 'A'
                                ? `A security data filter applies to ${subjectLabel}: rows outside the filter are hidden.`
                                : `A security data filter may apply to ${subjectLabel}, depending on a security attribute that can't be resolved without a session.`}
                            {cell.acl === 'G' && ' The ACLs alone grant this operation, so it reaches only some records.'}
                        </p>
                        {filters.length > 0 && (
                            <ul className="lens-condpop__list">
                                {filters.map((f) => (
                                    <li key={f.id}>
                                        <div className="lens-condpop__rule">
                                            <span className="lens-pill">{f.mode === 'if' ? 'Filter if' : 'Filter unless'}</span>
                                            <RecordLink href={`/sys_security_data_filter.do?sys_id=${encodeURIComponent(f.id)}`} what="the security data filter">
                                                {f.description || f.table}
                                            </RecordLink>
                                            {f.securityAttribute && <span className="lens-muted">{f.securityAttribute}</span>}
                                        </div>
                                        {f.filter && <code className="lens-condpop__filter">{f.filter}</code>}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
                {deciding.length ? (
                    <>
                        <p className="lens-muted lens-condpop__lead">
                            The roles match, but {deciding.length === 1 ? 'this rule decides' : 'these rules decide'} record by record:
                        </p>
                        <ul className="lens-condpop__list">
                            {deciding.map((o) => {
                                const acl = acls[o.i]
                                return (
                                    <li key={`${acl.id}-${o.i}`}>
                                        <div className="lens-condpop__rule">
                                            <span className={`lens-pill lens-pill--${acl.decision}`}>{acl.decision === 'deny' ? 'Deny unless' : 'Allow if'}</span>
                                            <RecordLink href={recordUrl.acl(acl.id)} what={`ACL record ${acl.name}`}>
                                                {acl.name}
                                            </RecordLink>
                                            <span className="lens-muted">{REASON_TEXT[o.c] || o.c}</span>
                                        </div>
                                        <ConditionDetail acl={acl} initiallyOpen />
                                    </li>
                                )
                            })}
                        </ul>
                    </>
                ) : cell.df ? null : (
                    <p className="lens-muted">The result depends on the record or session, but no single rule is marked as the deciding one. Open the full details to see every rule checked.</p>
                )}
                {onOpenDetails && (
                    <button
                        type="button"
                        className="lens-link lens-condpop__more"
                        onClick={() => {
                            onClose()
                            onOpenDetails()
                        }}
                    >
                        Open full details for this table
                    </button>
                )}
            </div>
        </div>
    )
}
