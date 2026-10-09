import React from 'react'
import { AccountInfo } from '../types'

const ICONS: { [k: string]: string } = {
    // person
    human: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-4 0-7 2-7 4.5V20h14v-1.5C19 16 16 14 12 14Z',
    // gear
    machine:
        'M19.4 13a7.6 7.6 0 0 0 0-2l2.1-1.6-2-3.4-2.5 1a7.5 7.5 0 0 0-1.7-1L15 3h-4l-.3 2.9a7.5 7.5 0 0 0-1.7 1l-2.5-1-2 3.4L6.6 11a7.6 7.6 0 0 0 0 2l-2.1 1.6 2 3.4 2.5-1c.5.4 1.1.7 1.7 1L11 21h4l.3-2.9c.6-.3 1.2-.6 1.7-1l2.5 1 2-3.4L19.4 13ZM13 15a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z',
    // sparkle
    ai_agent: 'M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8L12 2Zm6 12 .9 2.1L21 17l-2.1.9L18 20l-.9-2.1L15 17l2.1-.9L18 14Z',
    // person with question mark
    unclassified: 'M10 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-4 0-7 2-7 4.5V20h10.3A6 6 0 0 1 14 14.2c-1.2-.1-2.6-.2-4-.2Zm8 0a3.5 3.5 0 0 0-3.5 3.5h1.5a2 2 0 1 1 3 1.7c-.6.4-1 .9-1 1.6v.2h1.5v-.1c0-.3.2-.5.5-.7A3.5 3.5 0 0 0 18 14Zm-.75 7.5h1.5V23h-1.5v-1.5Z',
}

const TEXT: { [k: string]: { label: string; tip: string } } = {
    human: { label: 'Human', tip: 'Identity type: Human – a person who signs in interactively.' },
    machine: { label: 'Machine', tip: 'Identity type: Machine – a service or integration account, not a person.' },
    ai_agent: { label: 'AI agent', tip: 'Identity type: AI – an account used by an AI agent.' },
    unclassified: { label: 'Unclassified', tip: 'Identity type not set (unclassified). Set it on the user record so human and machine accounts are easy to tell apart.' },
}

/** Shows what kind of account a user is (sys_user.identity_type) plus integration flags. */
export default function AccountBadge({ account }: { account?: AccountInfo }) {
    if (!account) return null
    const kind = account.identity || 'unclassified'
    const t = TEXT[kind] || { label: account.identityLabel || kind, tip: `Identity type: ${account.identityLabel || kind}` }
    const extra = [account.webServiceOnly ? 'Web service access only: cannot sign in to the UI' : '', account.integrationUser ? 'Internal integration user' : '']
        .filter(Boolean)
        .join('. ')
    const tip = extra ? `${t.tip} ${extra}.` : t.tip
    return (
        <span className={`lens-account lens-account--${kind}`} data-tip={tip}>
            <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path fill="currentColor" d={ICONS[kind] || ICONS.unclassified} />
            </svg>
            <span>{t.label}</span>
            {account.webServiceOnly && <span className="lens-account__flag">API only</span>}
            {account.integrationUser && <span className="lens-account__flag">integration</span>}
        </span>
    )
}
