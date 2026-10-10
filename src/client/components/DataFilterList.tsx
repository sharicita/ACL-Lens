import React from 'react'
import { AnalysisResult, FilterResult, SubjectResult } from '../types'
import RecordLink from './RecordLink'
import Tip from './Tip'
import DocLink from './DocLink'

const RESULT_TEXT: { [r in FilterResult]: string } = {
    A: 'Applied',
    N: 'Not applied',
    C: 'Depends',
}
const RESULT_TIP: { [r in FilterResult]: string } = {
    A: 'The filter applies: only rows matching the filter are visible, even where the ACLs grant access.',
    N: 'The filter does not apply: the security attribute lets this subject see every row the ACLs allow.',
    C: 'Depends on a security attribute ACL Lens cannot resolve without a live session (a script or a non-role condition).',
}

/** The security data filters on a table (or a table it extends) and whether each applies to each subject. */
export default function DataFilterList({ results, index, subjects }: { results: AnalysisResult; index: number; subjects: SubjectResult[] }) {
    const first = results.subjects[0].tables[index]
    const filters = results.dataFilters || []
    if (!first.sdf || !first.sdf.length) return <p className="lens-muted">No security data filters apply to this table.</p>
    return (
        <>
            <Tip id="detail-sdf">
                Security data filters run after the ACLs: they hide rows that don't match the filter unless (or if) a security attribute is met. A user can pass every ACL
                and still see fewer records. <DocLink doc="acl" label="ServiceNow docs: Access control" />
            </Tip>
            <ul className="lens-dflist">
                {first.sdf.map((o, n) => {
                    const f = filters[o.i]
                    if (!f) return null
                    return (
                        <li key={f.id}>
                            <div className="lens-dflist__head">
                                <span className={`lens-pill lens-pill--${f.mode === 'unless' ? 'deny' : 'allow'}`}>{f.mode === 'unless' ? 'Filter unless' : 'Filter if'}</span>
                                <strong>{f.securityAttribute || 'no security attribute (always applies)'}</strong>
                                {f.table !== first.t && <span className="lens-muted">inherited from {f.table}</span>}
                                <RecordLink href={`/sys_security_data_filter.do?sys_id=${encodeURIComponent(f.id)}`} what={`security data filter on ${f.table}`}>
                                    Open filter
                                </RecordLink>
                            </div>
                            {f.description && <span className="lens-muted">{f.description}</span>}
                            {f.filter && (
                                <span>
                                    Rows shown when it applies: <code>{f.filter}</code>
                                </span>
                            )}
                            <ul className="lens-dflist__subjects" aria-label="Result for each subject">
                                {subjects.map((s) => {
                                    const r = (s.tables[index].sdf || [])[n]?.r || 'C'
                                    return (
                                        <li key={s.subject.key}>
                                            {s.subject.label}
                                            <span className={`lens-dfres lens-dfres--${r}`} data-tip={RESULT_TIP[r]}>
                                                {RESULT_TEXT[r]}
                                            </span>
                                        </li>
                                    )
                                })}
                            </ul>
                        </li>
                    )
                })}
            </ul>
        </>
    )
}
