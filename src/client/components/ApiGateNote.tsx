import React from 'react'
import { ApiGate, Cell } from '../types'
import { API_REASON_TEXT, statusText } from '../utils/status'
import Icon from './Icon'

interface Props {
    cell: Cell
    gate?: ApiGate
    op: string
    subjectLabel?: string
    defaultDeny: boolean
}

/** Explains, next to a result, how the API access checks changed or limited it. Renders nothing for UI-only runs. */
export default function ApiGateNote({ cell, gate, op, subjectLabel, defaultDeny }: Props) {
    if (!cell.api || !gate) return null
    const who = subjectLabel ? ` for ${subjectLabel}` : ''
    const policy = gate.pol && gate.pol[op]
    return (
        <div className="lens-condpop__df">
            <p className="lens-muted lens-condpop__lead">
                <Icon name="plug" size={12} />{' '}
                {cell.api === 'D'
                    ? `The API access checks deny this operation${who}, whatever the record ACLs say.`
                    : `The API access checks depend on something that can't be resolved statically${who}.`}
                {cell.acl && ` The record ACLs alone give ${statusText(cell.acl, defaultDeny)}.`}
            </p>
            <ul className="lens-condpop__list">
                {gate.why.map((w) => (
                    <li key={w}>{API_REASON_TEXT[w] || w}</li>
                ))}
                {policy && policy.ok === false && !gate.why.includes('authblocked') && <li>{API_REASON_TEXT.authblocked}</li>}
            </ul>
        </div>
    )
}
