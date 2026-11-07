import React, { useEffect, useRef, useState } from 'react'
import Icon from './Icon'

/** Copies text, including where the page runs in a frame that blocks the clipboard API. */
export async function copyText(text: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text)
        return true
    } catch (e) {
        const area = document.createElement('textarea')
        area.value = text
        area.setAttribute('readonly', '')
        area.className = 'lens-sr'
        document.body.appendChild(area)
        area.select()
        let ok = false
        try {
            ok = document.execCommand('copy')
        } catch (e2) {
            ok = false
        }
        document.body.removeChild(area)
        return ok
    }
}

/** A small copy icon. It shows a check, and says so to screen readers, once the text is copied. */
export default function CopyButton({ text, label }: { text: string; label: string }) {
    const [state, setState] = useState<'' | 'done' | 'failed'>('')
    const timer = useRef(0)
    useEffect(() => () => window.clearTimeout(timer.current), [])
    return (
        <button
            type="button"
            className="lens-icon-btn lens-copy"
            draggable={false}
            aria-label={`Copy ${label}`}
            data-tip={state === 'done' ? 'Copied' : state === 'failed' ? 'Could not copy' : `Copy: ${text}`}
            onClick={async () => {
                setState((await copyText(text)) ? 'done' : 'failed')
                window.clearTimeout(timer.current)
                timer.current = window.setTimeout(() => setState(''), 1500)
            }}
        >
            <Icon name={state === 'done' ? 'check' : 'copy'} size={13} />
            <span className="lens-sr" role="status">
                {state === 'done' ? `Copied ${label}` : state === 'failed' ? 'Could not copy' : ''}
            </span>
        </button>
    )
}
