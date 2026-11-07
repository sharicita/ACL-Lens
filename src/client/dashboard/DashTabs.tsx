import React, { useEffect, useRef, useState } from 'react'
import HelpTip from '../components/HelpTip'
import Icon from '../components/Icon'
import { moveItem, newTabId } from './layout'
import { DashTab } from './types'

interface Props {
    tabs: DashTab[]
    active: string
    onSelect: (id: string) => void
    /** the tabs changed: added, edited, reordered or removed */
    onChange: (tabs: DashTab[]) => void
    /** a report tile is being dragged, so tabs accept it */
    tileDragging: boolean
    onTileDrop: (tabId: string) => void
}

const MAX_TABS = 20

function TabForm({ tab, onSave, onCancel }: { tab?: DashTab; onSave: (title: string, description: string) => void; onCancel: () => void }) {
    const [title, setTitle] = useState(tab ? tab.title : '')
    const [description, setDescription] = useState(tab ? tab.description : '')
    const first = useRef<HTMLInputElement>(null)
    useEffect(() => first.current?.focus(), [])
    return (
        <form
            className="lens-dashtabs__form"
            onSubmit={(e) => {
                e.preventDefault()
                if (title.trim()) onSave(title.trim(), description.trim())
            }}
            onKeyDown={(e) => e.key === 'Escape' && onCancel()}
        >
            <label className="lens-field">
                <span className="lens-field__label">Tab title</span>
                <input ref={first} className="lens-input" value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} />
            </label>
            <label className="lens-field lens-field--wide">
                <span className="lens-field__label">Description (optional)</span>
                <input className="lens-input" value={description} maxLength={300} onChange={(e) => setDescription(e.target.value)} />
            </label>
            <button type="submit" className="lens-btn lens-btn--primary" disabled={!title.trim()}>
                {tab ? 'Save tab' : 'Add tab'}
            </button>
            <button type="button" className="lens-btn lens-btn--tertiary" onClick={onCancel}>
                Cancel
            </button>
        </form>
    )
}

/** The dashboard's tabs: choose, add, rename, describe, remove and drag to reorder. */
export default function DashTabs({ tabs, active, onSelect, onChange, tileDragging, onTileDrop }: Props) {
    const [form, setForm] = useState<'' | 'new' | 'edit'>('')
    const [dragId, setDragId] = useState('')
    const [dropAt, setDropAt] = useState<{ id: string; after: boolean } | null>(null)
    const [tileOver, setTileOver] = useState('')
    const refs = useRef<{ [id: string]: HTMLDivElement | null }>({})
    const index = tabs.findIndex((t) => t.id === active)
    const current = tabs[index]

    useEffect(() => {
        if (!tileDragging) setTileOver('')
    }, [tileDragging])

    const clearDrag = () => {
        setDragId('')
        setDropAt(null)
    }
    const move = (from: number, before: number) => onChange(moveItem(tabs, from, before))
    const removeTab = () => {
        if (!current || tabs.length < 2) return
        const n = current.tiles.length
        const what = n ? ` Its ${n} report${n === 1 ? ' comes' : 's come'} off the dashboard, but stay available under Add report.` : ''
        if (!window.confirm(`Remove the tab "${current.title}"?${what}`)) return
        onChange(tabs.filter((t) => t.id !== current.id))
        onSelect(tabs[index === 0 ? 1 : index - 1].id)
    }
    const onTabKey = (e: React.KeyboardEvent, i: number) => {
        let next = -1
        if (e.key === 'ArrowRight') next = (i + 1) % tabs.length
        else if (e.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length
        else if (e.key === 'Home') next = 0
        else if (e.key === 'End') next = tabs.length - 1
        else if (e.key === 'Enter' || e.key === ' ') next = i
        if (next < 0) return
        e.preventDefault()
        onSelect(tabs[next].id)
        refs.current[tabs[next].id]?.focus()
    }

    return (
        <div className="lens-dashtabs">
            <div className="lens-dashtabs__strip">
                <div className="lens-dashtabs__list" role="tablist" aria-label="Dashboard tabs">
                    {tabs.map((t, i) => {
                        const classes = ['lens-dashtab']
                        if (t.id === active) classes.push('lens-dashtab--on')
                        if (t.id === dragId) classes.push('lens-dashtab--dragging')
                        if (dropAt && dropAt.id === t.id) classes.push(dropAt.after ? 'lens-dashtab--drop-after' : 'lens-dashtab--drop-before')
                        if (tileOver === t.id) classes.push('lens-dashtab--drop-into')
                        return (
                            <div
                                key={t.id}
                                ref={(el) => {
                                    refs.current[t.id] = el
                                }}
                                id={`dash-tab-${t.id}`}
                                role="tab"
                                aria-selected={t.id === active}
                                aria-controls="dash-tabpanel"
                                tabIndex={t.id === active ? 0 : -1}
                                className={classes.join(' ')}
                                draggable={tabs.length > 1}
                                data-tip={t.description || undefined}
                                onClick={() => onSelect(t.id)}
                                onKeyDown={(e) => onTabKey(e, i)}
                                onDragStart={(e) => {
                                    e.dataTransfer.effectAllowed = 'move'
                                    e.dataTransfer.setData('text/plain', t.title)
                                    window.setTimeout(() => setDragId(t.id), 0)
                                }}
                                onDragEnd={clearDrag}
                                onDragOver={(e) => {
                                    if (tileDragging) {
                                        if (t.id === active) return
                                        e.preventDefault()
                                        setTileOver(t.id)
                                    } else if (dragId && dragId !== t.id) {
                                        e.preventDefault()
                                        const box = e.currentTarget.getBoundingClientRect()
                                        const after = e.clientX > box.left + box.width / 2
                                        if (!dropAt || dropAt.id !== t.id || dropAt.after !== after) setDropAt({ id: t.id, after })
                                    }
                                }}
                                onDragLeave={() => {
                                    setTileOver('')
                                    setDropAt(null)
                                }}
                                onDrop={(e) => {
                                    e.preventDefault()
                                    if (tileDragging) onTileDrop(t.id)
                                    else if (dragId && dragId !== t.id && dropAt) move(tabs.findIndex((x) => x.id === dragId), dropAt.after ? i + 1 : i)
                                    clearDrag()
                                    setTileOver('')
                                }}
                            >
                                {tabs.length > 1 && (
                                    <span className="lens-dashtab__grip">
                                        <Icon name="grip" size={12} />
                                    </span>
                                )}
                                <span className="lens-dashtab__title">{t.title}</span>
                            </div>
                        )
                    })}
                </div>
                {tabs.length < MAX_TABS && (
                    <button type="button" className="lens-btn lens-btn--tertiary lens-dashtabs__add" onClick={() => setForm('new')} data-tip="Adds an empty tab with its own title and description.">
                        + New tab
                    </button>
                )}
                <HelpTip label="How do dashboard tabs work?">
                    <span>
                        Tabs group reports however you like, each with its own title and description. Drag a tab to change the order. Drag a report by its title bar to move it on the tab, or drop it on
                        another tab to move it there.
                    </span>
                    <span>Your tabs and layout are saved for you only.</span>
                </HelpTip>
            </div>
            {form === 'new' && (
                <TabForm
                    onCancel={() => setForm('')}
                    onSave={(title, description) => {
                        const id = newTabId()
                        onChange(tabs.concat([{ id, title, description, tiles: [] }]))
                        onSelect(id)
                        setForm('')
                    }}
                />
            )}
            {form === 'edit' && current && (
                <TabForm
                    tab={current}
                    onCancel={() => setForm('')}
                    onSave={(title, description) => {
                        onChange(tabs.map((t) => (t.id === current.id ? { ...t, title, description } : t)))
                        setForm('')
                    }}
                />
            )}
            {form === '' && current && (
                <div className="lens-dashtabs__panel">
                    <div className="lens-dashtabs__about">
                        <h3>{current.title}</h3>
                        {current.description && <p className="lens-muted">{current.description}</p>}
                    </div>
                    <span className="lens-dashtabs__tools">
                        <button type="button" className="lens-icon-btn" onClick={() => setForm('edit')} aria-label={`Edit the title and description of ${current.title}`} data-tip="Edit title and description">
                            <Icon name="edit" size={14} />
                        </button>
                        {tabs.length > 1 && (
                            <>
                                <button type="button" className="lens-icon-btn" disabled={index === 0} onClick={() => move(index, index - 1)} aria-label={`Move ${current.title} left`} data-tip="Move tab left">
                                    ←
                                </button>
                                <button type="button" className="lens-icon-btn" disabled={index === tabs.length - 1} onClick={() => move(index, index + 2)} aria-label={`Move ${current.title} right`} data-tip="Move tab right">
                                    →
                                </button>
                                <button type="button" className="lens-icon-btn" onClick={removeTab} aria-label={`Remove the tab ${current.title}`} data-tip="Remove this tab (its reports are kept)">
                                    <Icon name="trash" size={14} />
                                </button>
                            </>
                        )}
                    </span>
                </div>
            )}
        </div>
    )
}
