import React, { useEffect, useState } from 'react'

const NEVER_KEY = 'x_acllens.dismissedTips'
const CLOSED_KEY = 'x_acllens.closedTips'
const EVENT = 'acl-lens-tips'

function local(): Storage | null {
    try {
        return window.localStorage
    } catch (e) {
        return null
    }
}

function readJson<T>(key: string, fallback: T): T {
    try {
        const raw = local()?.getItem(key)
        return raw ? (JSON.parse(raw) as T) : fallback
    } catch (e) {
        return fallback
    }
}

function writeJson(key: string, value: unknown) {
    try {
        local()?.setItem(key, JSON.stringify(value))
    } catch (e) {
        /* storage unavailable - the tip just reappears */
    }
}

/**
 * Identifies the current ServiceNow login session, shared by every tab and window. Uses a short
 * hash of the session's CSRF token (never the token itself); it changes when the user signs in again.
 */
function sessionId(): string {
    const token = String((window as any).g_ck || '')
    if (!token) {
        // outside the platform (local dev): fall back to this tab's session
        try {
            let id = window.sessionStorage.getItem(CLOSED_KEY + '.tab')
            if (!id) {
                id = Math.random().toString(36).slice(2)
                window.sessionStorage.setItem(CLOSED_KEY + '.tab', id)
            }
            return id
        } catch (e) {
            return 'tab'
        }
    }
    let h = 2166136261
    for (let i = 0; i < token.length; i++) h = Math.imul(h ^ token.charCodeAt(i), 16777619)
    return (h >>> 0).toString(36)
}

function closedThisSession(): string[] {
    const data = readJson<{ s?: string; ids?: string[] }>(CLOSED_KEY, {})
    return data.s === sessionId() ? data.ids || [] : []
}

function isHidden(id: string) {
    return readJson<string[]>(NEVER_KEY, []).indexOf(id) >= 0 || closedThisSession().indexOf(id) >= 0
}

interface Props {
    id: string
    children: React.ReactNode
}

/**
 * A small usage hint.
 * - × closes it for the rest of this ServiceNow session, in every tab; it can return next session.
 * - "Don't show again" hides it for good in this browser.
 */
export default function Tip({ id, children }: Props) {
    const [hidden, setHidden] = useState(() => isHidden(id))

    // other copies of the same tip (or other tabs) close together
    useEffect(() => {
        const sync = () => setHidden(isHidden(id))
        window.addEventListener(EVENT, sync)
        window.addEventListener('storage', sync)
        return () => {
            window.removeEventListener(EVENT, sync)
            window.removeEventListener('storage', sync)
        }
    }, [id])

    if (hidden) return null
    const done = () => {
        setHidden(true)
        window.dispatchEvent(new Event(EVENT))
    }
    return (
        <p className="lens-tip" role="note">
            <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="currentColor" d="M9 21h6v-1H9v1Zm3-19a7 7 0 0 0-4 12.7V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.3A7 7 0 0 0 12 2Z" />
            </svg>
            <span>{children}</span>
            <button
                type="button"
                className="lens-tip__never"
                onClick={() => {
                    writeJson(NEVER_KEY, readJson<string[]>(NEVER_KEY, []).concat([id]))
                    done()
                }}
            >
                Don't show again
            </button>
            <button
                type="button"
                className="lens-tip__close"
                aria-label="Close tip for this session"
                data-tip="Close for this session. It may show again after you next sign in."
                onClick={() => {
                    writeJson(CLOSED_KEY, { s: sessionId(), ids: closedThisSession().concat([id]) })
                    done()
                }}
            >
                ×
            </button>
        </p>
    )
}
