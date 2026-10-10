import React from 'react'

interface Props {
    /** what the field is, e.g. "Scope of analysis" */
    label: string
    /** the help text, shown on hover or keyboard focus (like ServiceNow field hints) */
    text: string
}

/**
 * Field help kept out of the way: a small info icon next to a label. Hovering or tabbing to it shows
 * the text in the app tooltip; screen readers hear the label and then the text.
 */
export default function FieldInfo({ label, text }: Props) {
    return (
        <button type="button" className="lens-info" data-tip={text} aria-label={`About ${label}`} onClick={(e) => e.preventDefault()}>
            <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path
                    fill="currentColor"
                    d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16Zm-1 6v8h2v-8h-2Zm0-4v2h2V6h-2Z"
                />
            </svg>
        </button>
    )
}
