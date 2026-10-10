import React from 'react'

/**
 * Small, subtle line icons (24-unit grid, drawn with currentColor). Always decorative: the text next
 * to an icon says what the control does, so icons are hidden from assistive technology.
 */
const PATHS: { [name: string]: string } = {
    shield: 'M12 3 5 6v5c0 4.4 3 8.4 7 9.6 4-1.2 7-5.2 7-9.6V6l-7-3Zm-3 9 2 2 4-4',
    workspace: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
    history: 'M4 12a8 8 0 1 0 2.3-5.6M4 4v4h4M12 8v4l3 2',
    settings:
        'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.6 7.6 0 0 0-2-1.2L14.5 3h-5l-.4 2.6a7.6 7.6 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.6 7.6 0 0 0 2 1.2l.4 2.6h5l.4-2.6a7.6 7.6 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z',
    users: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-6 9c0-3.3 2.7-6 6-6s6 2.7 6 6M16 4.2a3.5 3.5 0 0 1 0 6.6M18 14.4c1.8.9 3 2.9 3 5.6',
    table: 'M4 5h16v14H4zM4 10h16M4 15h16M10 10v9',
    play: 'M8 5v14l11-7z',
    bolt: 'M13 3 5 13h6l-1 8 8-10h-6l1-8Z',
    list: 'M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01',
    copy: 'M9 9h10v11H9zM5 15V4h10',
    columns: 'M4 4h16v16H4zM9.3 4v16M14.6 4v16',
    filter: 'M4 5h16l-6 7v6l-4 2v-8L4 5Z',
    compare: 'M8 4v16M16 4v16M4 8h4M16 16h4M4 16h4M16 8h4',
    rerun: 'M20 12a8 8 0 1 1-2.3-5.6M20 4v4h-4',
    edit: 'M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4',
    archive: 'M4 5h16v4H4zM5 9v10h14V9M10 13h4',
    trash: 'M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13M10 11v6M14 11v6',
    download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
    report: 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h6M9 17h6M9 9h3',
    grid: 'M4 4h16v16H4zM4 9.3h16M4 14.6h16M9.3 4v16M14.6 4v16',
    plug: 'M9 3v5M15 3v5M7 8h10v3a5 5 0 0 1-10 0V8ZM12 16v5',
    sliders: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M16 4v4M10 10v4M18 16v4',
    sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3ZM19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2Z',
    eyeOff: 'M3 3l18 18M10.6 6.1A9.8 9.8 0 0 1 12 6c5 0 9 6 9 6a16 16 0 0 1-2.8 3.3M6.4 7.4C4.3 8.9 3 12 3 12s4 6 9 6c1.4 0 2.7-.4 3.8-1M9.9 9.9a3 3 0 0 0 4.2 4.2',
    eye: 'M3 12s4-6 9-6 9 6 9 6-4 6-9 6-9-6-9-6Zm9 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
    target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-5a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0-3.5a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1Z',
    close: 'M6 6l12 12M18 6 6 18',
    chat: 'M5 5h14v10H9l-4 4V5Z',
    restore: 'M4 12a8 8 0 1 0 2.3-5.6M4 4v4h4',
}

export type IconName = keyof typeof PATHS

export default function Icon({ name, size = 15, className }: { name: IconName | string; size?: number; className?: string }) {
    const d = PATHS[name]
    if (!d) return null
    return (
        <svg
            className={`lens-icon${className ? ' ' + className : ''}`}
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={name === 'play' ? 0 : 1.7}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
        >
            <path d={d} fill={name === 'play' ? 'currentColor' : 'none'} />
        </svg>
    )
}
