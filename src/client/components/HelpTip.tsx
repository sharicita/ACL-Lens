import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'

interface Props {
    /** short accessible name, e.g. "What is a baseline?" */
    label: string
    children: React.ReactNode
}

const GAP = 6
const EDGE = 8

/**
 * A small "?" button that opens a short explanation. Click or Enter/Space opens it, Escape or a
 * click elsewhere closes it, and focus returns to the button. The popover is positioned against
 * the window, so it is never cut off by the screen edge or by a scrolling container.
 */
export default function HelpTip({ label, children }: Props) {
    const [open, setOpen] = useState(false)
    const [pos, setPos] = useState<{ left: number; top: number } | null>(null)
    const id = useId()
    const wrap = useRef<HTMLSpanElement>(null)
    const btn = useRef<HTMLButtonElement>(null)
    const pop = useRef<HTMLSpanElement>(null)

    const place = () => {
        if (!btn.current || !pop.current) return
        const b = btn.current.getBoundingClientRect()
        const w = pop.current.offsetWidth
        const h = pop.current.offsetHeight
        const vw = document.documentElement.clientWidth
        const vh = window.innerHeight
        const left = Math.min(Math.max(EDGE, b.left + b.width / 2 - w / 2), vw - w - EDGE)
        // below the button when it fits, otherwise above, otherwise whichever side has more room
        let top = b.bottom + GAP
        if (top + h > vh - EDGE) top = b.top - GAP - h >= EDGE ? b.top - GAP - h : vh - b.bottom > b.top ? b.bottom + GAP : Math.max(EDGE, b.top - GAP - h)
        setPos({ left, top })
    }

    useLayoutEffect(() => {
        if (open) place()
        else setPos(null)
    }, [open])

    useEffect(() => {
        if (!open) return
        const onDoc = (e: MouseEvent) => wrap.current && !wrap.current.contains(e.target as Node) && setOpen(false)
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setOpen(false)
                btn.current?.focus()
            }
        }
        document.addEventListener('mousedown', onDoc)
        document.addEventListener('keydown', onKey)
        window.addEventListener('resize', place)
        window.addEventListener('scroll', place, true)
        return () => {
            document.removeEventListener('mousedown', onDoc)
            document.removeEventListener('keydown', onKey)
            window.removeEventListener('resize', place)
            window.removeEventListener('scroll', place, true)
        }
    }, [open])

    return (
        <span className="lens-help" ref={wrap}>
            <button
                ref={btn}
                type="button"
                className="lens-help__btn"
                aria-label={label}
                aria-expanded={open}
                aria-controls={id}
                onClick={() => setOpen(!open)}
            >
                ?
            </button>
            {open && (
                <span
                    id={id}
                    ref={pop}
                    role="note"
                    className="lens-help__pop"
                    style={pos ? { left: pos.left, top: pos.top } : { visibility: 'hidden', left: 0, top: 0 }}
                >
                    <strong className="lens-help__title">{label}</strong>
                    {children}
                </span>
            )}
        </span>
    )
}
