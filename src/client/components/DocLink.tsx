import React from 'react'

/**
 * Verified ServiceNow references (official docs, or ServiceNow-employee articles on the
 * ServiceNow Community where the docs site has no stable public URL). Checked 2026-10-09.
 */
export const DOCS = {
    acl: {
        url: 'https://www.servicenow.com/docs/r/platform-security/access-control/access-control-rules.html',
        title: 'ServiceNow docs: Access Control Lists (ACLs)',
    },
    troubleshoot: {
        url: 'https://www.servicenow.com/community/platform-privacy-security-blog/troubleshooting-access-control/ba-p/3446022',
        title: 'ServiceNow: Troubleshooting access control (Access Analyzer, debugging, impersonation)',
    },
    strategy: {
        url: 'https://www.servicenow.com/community/platform-privacy-security-blog/planning-your-access-control-strategy/ba-p/3446016',
        title: 'ServiceNow: Planning your access control strategy (Allow-If vs Deny-Unless, best practices)',
    },
    features: {
        url: 'https://www.servicenow.com/community/platform-privacy-security/new-access-control-features/ta-p/3206245',
        title: 'ServiceNow: New access control features (Deny-Unless ACLs, Query ACLs, Security Data Filters)',
    },
    updateSets: {
        url: 'https://www.servicenow.com/docs/r/application-development/system-update-sets/system-update-sets.html',
        title: 'ServiceNow docs: System update sets',
    },
} as const

export type DocKey = keyof typeof DOCS

/** Small book icon that opens a ServiceNow reference in a new window. */
export default function DocLink({ doc, label }: { doc: DocKey; label?: string }) {
    const d = DOCS[doc]
    const text = `${label || d.title} (opens in a new window)`
    return (
        <a className="lens-doclink" href={d.url} target="_blank" rel="noopener noreferrer" aria-label={text} data-tip={text}>
            <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path
                    fill="currentColor"
                    d="M6 3h11a2 2 0 0 1 2 2v13.5a.5.5 0 0 1-.5.5H7a1 1 0 0 0 0 2h11.5a.5.5 0 0 1 0 1H7a2 2 0 0 1-2-2V4a1 1 0 0 1 1-1Zm2 4v1.5h8V7H8Zm0 3.5V12h6v-1.5H8Z"
                />
            </svg>
        </a>
    )
}
