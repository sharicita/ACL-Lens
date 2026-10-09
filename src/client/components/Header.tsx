import React from 'react'
import { ViewName } from '../utils/nav'

interface Props {
    view: ViewName
    isAdmin: boolean
    onNavigate: (v: ViewName) => void
}

export default function Header({ view, isAdmin, onNavigate }: Props) {
    // the Configuration pages (properties, MCP server) all sit under the Settings tab
    const active = (name: ViewName) => view === name || (name === 'settings' && view === 'mcp')
    const tab = (name: ViewName, label: string, tipText: string) => (
        <button
            data-tip={tipText}
            type="button"
            className={`lens-tab${active(name) ? ' lens-tab--active' : ''}`}
            aria-current={active(name) ? 'page' : undefined}
            onClick={() => onNavigate(name)}
        >
            {label}
        </button>
    )
    return (
        <header className="lens-header">
            <div className="lens-header__brand">
                <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                        fill="currentColor"
                        d="M12 2 4 5v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V5l-8-3Zm0 2.2 6 2.3V11c0 4-2.6 7.8-6 8.9-3.4-1.1-6-4.9-6-8.9V6.5l6-2.3Zm-1 4.8v2H9v2h2v2h2v-2h2v-2h-2V9h-2Z"
                    />
                </svg>
                <div>
                    <h1 className="lens-header__title">ACL Lens</h1>
                    <p className="lens-header__sub">Analyze and compare detailed access permissions across users, roles, tables, records, and fields.</p>
                </div>
            </div>
            <nav className="lens-header__tabs" aria-label="ACL Lens views">
                {tab('workspace', 'Workspace', 'Choose users and roles and run an analysis or comparison.')}
                {tab('history', 'History', 'Saved runs: open, export or rerun them.')}
                {isAdmin && tab('settings', 'Settings', 'Admin configuration: properties, MCP server and AI providers.')}
            </nav>
        </header>
    )
}
