import React, { useEffect, useId, useRef, useState } from 'react'

export interface ComboOption {
    key: string
    primary: string
    secondary?: string
    badge?: string
    disabled?: boolean
}

interface Props {
    label: string
    placeholder?: string
    /** returns ranked options for the text (an empty string means "show suggestions") */
    search: (text: string) => Promise<ComboOption[]>
    onPick: (option: ComboOption, text: string) => void
    /** optional first row built from the typed text, e.g. "Use prefix x_" */
    freeTextOption?: (text: string) => ComboOption | null
    value?: string
    onTextChange?: (text: string) => void
    clearOnPick?: boolean
    disabled?: boolean
    emptyText?: string
    hideLabel?: boolean
}

function Highlight({ text, query }: { text: string; query: string }) {
    const q = query.trim()
    const i = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1
    if (i < 0) return <>{text}</>
    return (
        <>
            {text.substring(0, i)}
            <mark className="lens-hl">{text.substring(i, i + q.length)}</mark>
            {text.substring(i + q.length)}
        </>
    )
}

/**
 * The app-wide search box: results appear as soon as it gets focus, starts-with matches come
 * first, matching text is highlighted, and it is fully keyboard and screen-reader operable
 * (ARIA 1.2 combobox pattern).
 */
export default function SearchCombo(p: Props) {
    const id = useId()
    const listId = `${id}-list`
    const [text, setText] = useState(p.value || '')
    const [open, setOpen] = useState(false)
    const [options, setOptions] = useState<ComboOption[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [active, setActive] = useState(-1)
    const seq = useRef(0)

    useEffect(() => {
        if (p.value !== undefined) setText(p.value)
    }, [p.value])

    useEffect(() => {
        if (!open) return
        const mine = ++seq.current
        setLoading(true)
        const t = setTimeout(
            () => {
                p.search(text)
                    .then((r) => {
                        if (mine !== seq.current) return
                        setOptions(r)
                        setError('')
                    })
                    .catch((e) => mine === seq.current && setError(e.message))
                    .finally(() => mine === seq.current && setLoading(false))
            },
            text ? 150 : 0
        )
        return () => clearTimeout(t)
    }, [text, open])

    const free = p.freeTextOption ? p.freeTextOption(text) : null
    const all = (free ? [free] : []).concat(options)

    const pick = (o: ComboOption) => {
        if (o.disabled) return
        p.onPick(o, text)
        if (p.clearOnPick) {
            setText('')
            p.onTextChange && p.onTextChange('')
        }
        setActive(-1)
        setOpen(false)
    }

    const optionId = (i: number) => `${id}-opt-${i}`
    return (
        <div className="lens-combo">
            <label className={p.hideLabel ? 'lens-sr' : 'lens-field__label'} htmlFor={`${id}-input`}>
                {p.label}
            </label>
            <input
                id={`${id}-input`}
                className="lens-input"
                value={text}
                placeholder={p.placeholder}
                disabled={p.disabled}
                role="combobox"
                aria-expanded={open}
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={open && active >= 0 ? optionId(active) : undefined}
                autoComplete="off"
                onFocus={() => setOpen(true)}
                onBlur={() => setTimeout(() => setOpen(false), 150)}
                onChange={(e) => {
                    setText(e.target.value)
                    p.onTextChange && p.onTextChange(e.target.value)
                    setOpen(true)
                    setActive(-1)
                }}
                onKeyDown={(e) => {
                    if (e.key === 'ArrowDown') {
                        e.preventDefault()
                        setOpen(true)
                        setActive((a) => Math.min(a + 1, all.length - 1))
                    } else if (e.key === 'ArrowUp') {
                        e.preventDefault()
                        setActive((a) => Math.max(a - 1, 0))
                    } else if (e.key === 'Enter' && open && all.length) {
                        e.preventDefault()
                        pick(all[active >= 0 ? active : 0])
                    } else if (e.key === 'Escape') {
                        setOpen(false)
                    }
                }}
            />
            {open && (
                <ul id={listId} className="lens-combo__list lens-combo__list--pop" role="listbox" aria-label={p.label}>
                    {all.map((o, i) => (
                        <li
                            key={o.key}
                            id={optionId(i)}
                            role="option"
                            aria-selected={i === active}
                            aria-disabled={o.disabled || undefined}
                            className={`lens-combo__option${i === active ? ' lens-combo__option--active' : ''}${o.disabled ? ' lens-combo__option--disabled' : ''}`}
                            onMouseDown={(e) => e.preventDefault()}
                            onMouseEnter={() => setActive(i)}
                            onClick={() => pick(o)}
                        >
                            {o.badge && <span className={`lens-kind lens-kind--${o.badge}`}>{o.badge}</span>}
                            <span className="lens-combo__primary">
                                <Highlight text={o.primary} query={text} />
                            </span>
                            {o.secondary && (
                                <span className="lens-muted lens-combo__secondary">
                                    <Highlight text={o.secondary} query={text} />
                                </span>
                            )}
                        </li>
                    ))}
                    {!all.length && (
                        <li className="lens-combo__empty" role="presentation">
                            {loading ? 'Searching…' : error || p.emptyText || 'No matches'}
                        </li>
                    )}
                </ul>
            )}
            <span className="lens-sr" aria-live="polite">
                {open && !loading ? `${all.length} result${all.length === 1 ? '' : 's'}` : ''}
            </span>
        </div>
    )
}
