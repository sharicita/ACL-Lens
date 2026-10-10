import React from 'react'
import Icon from './Icon'

interface Props {
    current: 'settings' | 'mcp'
    onNavigate: (view: 'settings' | 'mcp') => void
}

/** Sub-navigation shared by the Configuration pages (ACL Lens admins only). */
export default function ConfigNav({ current, onNavigate }: Props) {
    const item = (view: 'settings' | 'mcp', label: string) => (
        <button
            type="button"
            className={`lens-segment__item${current === view ? ' lens-segment__item--on' : ''}`}
            aria-current={current === view ? 'page' : undefined}
            onClick={() => onNavigate(view)}
        >
            <Icon name={view === 'settings' ? 'sliders' : 'plug'} />
            {label}
        </button>
    )
    return (
        <nav className="lens-confignav" aria-label="Configuration">
            <span className="lens-confignav__title">Configuration</span>
            <div className="lens-segment">
                {item('settings', 'Properties')}
                {item('mcp', 'MCP server')}
            </div>
            <a className="lens-link lens-confignav__ext" href="/x_acllens_ai_provider_list.do" target="_blank" rel="noopener noreferrer" aria-label="AI providers (opens in a new window)">
                <Icon name="sparkle" />
                AI providers ↗
            </a>
            <span className="lens-muted lens-confignav__note">Visible to ACL Lens admins only.</span>
        </nav>
    )
}
