import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'

/**
 * App-wide tooltips. Any element with a `data-tip="..."` attribute gets a styled tooltip on
 * hover or keyboard focus. Rendered in one fixed layer so scroll containers never clip it.
 */
export default function TooltipLayer() {
    const [tip, setTip] = useState<{ text: string; x: number; y: number; below: boolean } | null>(null)
    const target = useRef<HTMLElement | null>(null)
    const timer = useRef<number>(0)
    const boxRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const hide = () => {
            window.clearTimeout(timer.current)
            if (target.current) target.current.removeAttribute('aria-describedby')
            target.current = null
            setTip(null)
        }
        const show = (el: HTMLElement, delay: number) => {
            const text = el.getAttribute('data-tip')
            if (!text) return
            window.clearTimeout(timer.current)
            target.current = el
            timer.current = window.setTimeout(() => {
                const r = el.getBoundingClientRect()
                const below = r.top < 80
                setTip({ text, x: r.left + r.width / 2, y: below ? r.bottom + 8 : r.top - 8, below })
                el.setAttribute('aria-describedby', 'lens-tooltip')
            }, delay)
        }
        const over = (e: Event) => {
            const el = (e.target as HTMLElement)?.closest?.('[data-tip]') as HTMLElement | null
            if (el === target.current) return
            if (el) show(el, e.type === 'focusin' ? 0 : 350)
            else hide()
        }
        const out = (e: Event) => {
            const to = (e as MouseEvent).relatedTarget as HTMLElement | null
            if (target.current && to && target.current.contains(to)) return
            if (e.type === 'mouseout' && to && to.closest && to.closest('[data-tip]') === target.current) return
            hide()
        }
        const key = (e: KeyboardEvent) => e.key === 'Escape' && hide()
        document.addEventListener('mouseover', over)
        document.addEventListener('focusin', over)
        document.addEventListener('mouseout', out)
        document.addEventListener('focusout', out)
        document.addEventListener('keydown', key)
        document.addEventListener('scroll', hide, true)
        return () => {
            document.removeEventListener('mouseover', over)
            document.removeEventListener('focusin', over)
            document.removeEventListener('mouseout', out)
            document.removeEventListener('focusout', out)
            document.removeEventListener('keydown', key)
            document.removeEventListener('scroll', hide, true)
        }
    }, [])

    // keep the bubble inside the viewport: shift sideways, and flip above/below when it would be cut off
    const [shift, setShift] = useState(0)
    useLayoutEffect(() => {
        if (!tip || !boxRef.current || !target.current) return setShift(0)
        const w = boxRef.current.offsetWidth
        const h = boxRef.current.offsetHeight
        const left = tip.x - w / 2
        const max = document.documentElement.clientWidth - 8
        setShift(left < 8 ? 8 - left : left + w > max ? max - (left + w) : 0)
        const r = target.current.getBoundingClientRect()
        const fitsAbove = r.top - 8 - h >= 8
        const fitsBelow = r.bottom + 8 + h <= window.innerHeight - 8
        if (!tip.below && !fitsAbove && fitsBelow) setTip({ ...tip, below: true, y: r.bottom + 8 })
        else if (tip.below && !fitsBelow && fitsAbove) setTip({ ...tip, below: false, y: r.top - 8 })
    }, [tip])

    if (!tip) return null
    return (
        <div
            id="lens-tooltip"
            role="tooltip"
            ref={boxRef}
            className={`lens-tooltip${tip.below ? ' lens-tooltip--below' : ''}`}
            style={{ left: tip.x + shift, top: tip.y }}
        >
            {tip.text}
        </div>
    )
}
