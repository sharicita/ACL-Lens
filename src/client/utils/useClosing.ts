import { useEffect, useState } from 'react'

/**
 * Keeps an element mounted for `ms` after `open` turns false so a CSS exit animation can play.
 * Returns whether to render it and whether it is currently closing.
 */
export function useClosing(open: boolean, ms = 200) {
    const [rendered, setRendered] = useState(open)
    const [closing, setClosing] = useState(false)
    useEffect(() => {
        if (open) {
            setRendered(true)
            setClosing(false)
            return
        }
        if (!rendered) return
        setClosing(true)
        const t = setTimeout(() => {
            setRendered(false)
            setClosing(false)
        }, ms)
        return () => clearTimeout(t)
    }, [open])
    return { rendered, closing }
}
