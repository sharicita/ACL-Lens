import React, { useState } from 'react'
import Icon from './Icon'
import { listHref, MAX_QUERY, SnList } from '../utils/snList'

interface Props {
    /** the same items as ServiceNow records (omit when there is no record equivalent) */
    list?: SnList | null
    /** downloads what is shown */
    onExport?: () => void
    /** hover text: what Export downloads, e.g. "the 4 differences shown" */
    exportWhat?: string
    /** a filter is active: Export is highlighted */
    filtered?: boolean
}

/**
 * Actions for a queried / filtered list: open the same items in a ServiceNow list view, export
 * what is shown, and copy the ServiceNow encoded query.
 */
export default function ListActions({ list, onExport, exportWhat, filtered }: Props) {
    const [copied, setCopied] = useState(false)
    const href = list ? listHref(list) : null
    const tooLong = !!list && list.count > 0 && list.query.length > MAX_QUERY
    return (
        <span className="lens-listactions">
            {list && (
                <>
                    {href ? (
                        <a
                            className="lens-btn lens-btn--tertiary lens-btn--small"
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            data-tip={`Open ${list.what} in a ServiceNow list view (new window). Your own permissions apply.`}
                            aria-label={`Open ${list.what} in a ServiceNow list (new window)`}
                        >
                            <Icon name="list" />
                            Open list
                        </a>
                    ) : (
                        <button
                            type="button"
                            className="lens-btn lens-btn--tertiary lens-btn--small"
                            disabled
                            data-tip={tooLong ? `Too many items (${list.count}) to open as one list. Filter first.` : 'Nothing to open.'}
                        >
                            <Icon name="list" />
                            Open list
                        </button>
                    )}
                    <button
                        type="button"
                        className="lens-btn lens-btn--ghost lens-btn--small"
                        disabled={!list.count}
                        onClick={() =>
                            navigator.clipboard?.writeText(list.query).then(() => {
                                setCopied(true)
                                setTimeout(() => setCopied(false), 1500)
                            })
                        }
                        data-tip={`Copy the ServiceNow encoded query for ${list.what} (${list.table}). Paste it into any list filter or script.`}
                        aria-label={`Copy the ServiceNow query for ${list.what}`}
                    >
                        <Icon name="copy" />
                        {copied ? 'Copied' : 'Copy query'}
                    </button>
                </>
            )}
            {onExport && (
                <button
                    type="button"
                    className={`lens-btn lens-btn--small ${filtered ? 'lens-btn--success' : 'lens-btn--secondary'}`}
                    onClick={onExport}
                    data-tip={`Export ${exportWhat || 'this list'} as CSV`}
                    aria-label={`Export ${exportWhat || 'this list'} as CSV`}
                >
                    <Icon name="download" />
                    Export
                </button>
            )}
        </span>
    )
}
