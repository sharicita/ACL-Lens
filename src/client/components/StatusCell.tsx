import React from 'react'
import { Status } from '../types'
import { STATUS_SHORT, statusText } from '../utils/status'
import HelpTip from './HelpTip'
import DocLink from './DocLink'

interface Props {
    s: Status
    op: string
    defaultDeny: boolean
    /** differs from the baseline subject */
    differs?: boolean
    subjectLabel?: string
    /** the cell opens the condition when clicked */
    clickable?: boolean
}

export function StatusCell({ s, op, defaultDeny, differs, subjectLabel, clickable }: Props) {
    const text = statusText(s, defaultDeny)
    const hint = s === 'C' ? (clickable ? ' – click to see the condition' : ' – open the table to see the condition') : ''
    const title = `${subjectLabel ? subjectLabel + ' – ' : ''}${op}: ${text}${hint}${differs ? ' (differs from the baseline subject)' : ''}`
    return (
        <span className={`lens-cell lens-cell--${s}${differs ? ' lens-cell--diff' : ''}`} data-tip={title} aria-label={title}>
            {STATUS_SHORT[s]}
        </span>
    )
}

const LEGEND_TIP: { [s: string]: string } = {
    G: 'Granted: at least one matching ACL passes outright and no deny-unless rule blocks it.',
    C: 'Conditional: roles match, but a condition, script, security attribute or role elevation decides per record or session.',
    D: 'Denied: no matching allow rule can pass, or a deny-unless rule fails.',
    N: 'No rule: no ACL matches at any level, so the instance default (glide.sm.default_mode) applies.',
}

export function Legend({ defaultDeny, baseline = true }: { defaultDeny: boolean; baseline?: boolean }) {
    return (
        <ul className="lens-legend" aria-label="Legend">
            {(['G', 'C', 'D', 'N'] as Status[]).map((s) => (
                <li key={s} data-tip={LEGEND_TIP[s]}>
                    <span className={`lens-cell lens-cell--${s}`} aria-hidden="true">
                        {STATUS_SHORT[s]}
                    </span>
                    {statusText(s, defaultDeny)}
                </li>
            ))}
            {baseline && (
            <li>
                <span className="lens-cell lens-cell--G lens-cell--diff" aria-hidden="true">
                    G
                </span>
                Differs from the baseline
                <HelpTip label="What is the baseline?">
                    <span>
                        The <strong>baseline</strong> is the user or role everyone else is compared to on this screen. A purple outline means that subject's result is
                        different from the baseline's.
                    </span>
                    <span>It doesn't change results or the saved run. Change it with "Use as baseline" on a subject card. It's remembered in this browser for this run.</span>
                </HelpTip>
            </li>
            )}
            <li className="lens-muted">Columns: C = create, R = read, W = write, D = delete</li>
            <li>
                <HelpTip label="What do the results mean?">
                    <span>
                        <strong>Granted</strong>: a matching rule allows it outright. <strong>Conditional</strong>: the roles match, but a condition or script decides record by
                        record – open the table to see it. <strong>Denied</strong>: no matching rule allows it, or a deny-unless rule blocks it. <strong>No rule</strong>: nothing
                        matches, so the instance default applies.
                    </span>
                    <span>Field results show the field rule only; seeing a field also needs access to the record.</span>
                </HelpTip>
                <DocLink doc="acl" label="ServiceNow docs: Access Control Lists" />
            </li>
        </ul>
    )
}
