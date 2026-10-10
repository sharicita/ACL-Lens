import React, { useEffect, useId, useRef, useState } from 'react'
import Icon from './Icon'

interface Props {
    title: React.ReactNode
    subtitle?: React.ReactNode
    actions?: React.ReactNode
    onClose: () => void
    /** panel width, e.g. "min(900px, 96vw)" */
    width?: string
    children: React.ReactNode
}

/**
 * Slide-out panel: moves focus in on open and back on close, keeps Tab inside, closes on Esc or
 * the backdrop, and slides out before it unmounts.
 */
export default function Drawer({ title, subtitle, actions, onClose, width, children }: Props) {
    const [closing, setClosing] = useState(false)
    const panelRef = useRef<HTMLDivElement>(null)
    const titleId = useId()

    useEffect(() => {
        const opener = document.activeElement as HTMLElement | null
        panelRef.current?.focus()
        return () => opener?.focus?.()
    }, [])

    const requestClose = () => {
        if (closing) return
        setClosing(true)
        setTimeout(onClose, 320)
    }
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && requestClose()
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [closing])

    const trapTab = (e: React.KeyboardEvent) => {
        if (e.key !== 'Tab' || !panelRef.current) return
        const f = panelRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])')
        if (!f.length) return
        const first = f[0]
        const last = f[f.length - 1]
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault()
            last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault()
            first.focus()
        }
    }

    return (
        <div className={`lens-drawer${closing ? ' lens-drawer--closing' : ''}`} role="dialog" aria-modal="true" aria-labelledby={titleId}>
            <div className="lens-drawer__backdrop" onClick={requestClose} />
            <div className="lens-drawer__panel" ref={panelRef} tabIndex={-1} onKeyDown={trapTab} style={width ? { width } : undefined}>
                <header className="lens-drawer__head">
                    <div>
                        <h2 id={titleId}>{title}</h2>
                        {subtitle && <p className="lens-muted lens-drawer__sub">{subtitle}</p>}
                    </div>
                    <div className="lens-actions">
                        {actions}
                        <button type="button" className="lens-btn lens-btn--tertiary" onClick={requestClose} aria-label="Close">
                            <Icon name="close" size={14} />
                            Close
                        </button>
                    </div>
                </header>
                <div className="lens-drawer__body">{children}</div>
            </div>
        </div>
    )
}
