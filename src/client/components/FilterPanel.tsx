import React from 'react'
import { AnalysisFilter, FilterMode } from '../types'
import ScopeInput from './ScopeInput'
import TablePicker from './TablePicker'
import HelpTip from './HelpTip'
import DocLink from './DocLink'
import Tip from './Tip'
import FieldInfo from './FieldInfo'
import Icon from './Icon'

interface Props {
    filter: AnalysisFilter
    onChange: (f: AnalysisFilter) => void
}

const MODES: { value: FilterMode; label: string; help: string; placeholder?: string }[] = [
    {
        value: 'secured_by_roles',
        label: 'Tables secured by these roles',
        help: 'Every table that has an ACL naming one of the selected subjects’ roles. Best starting point.',
    },
    { value: 'tables', label: 'Specific tables', help: 'Search and add one or more tables. Parent tables are taken into account automatically.', placeholder: 'incident' },
    { value: 'prefix', label: 'Table name starts with', help: 'Every table whose name starts with one of these prefixes (for example cmdb_ci or a custom app prefix).', placeholder: 'cmdb_ci' },
    { value: 'scope', label: 'Application scope', help: 'All tables owned by an application scope.', placeholder: 'x_acme_app or global' },
    { value: 'all', label: 'All tables', help: 'Every table on the instance (use Max tables / exclude system to keep it fast).' },
]

export default function FilterPanel({ filter, onChange }: Props) {
    const mode = MODES.filter((m) => m.value === filter.mode)[0] || MODES[0]
    const set = (patch: Partial<AnalysisFilter>) => onChange({ ...filter, ...patch })
    return (
        <section className="lens-card" aria-labelledby="filter-title">
            <div className="lens-card__header">
                <h2 id="filter-title">
                    <Icon name="table" />
                    2. Which tables?
                </h2>
                <HelpTip label="How are tables checked?">
                    <span>
                        For each table, ACL Lens checks the create, read, write and delete rules exactly as ServiceNow matches them: the table first, then its parent tables, then the
                        catch-all <code>*</code> rules. Field rules are checked the same way.
                    </span>
                </HelpTip>
                <DocLink doc="acl" label="ServiceNow docs: how Access Control Lists work" />
            </div>
            <div className="lens-card__body lens-filter">
                <div className="lens-field">
                    <span className="lens-field__label lens-field__label--info">
                        <label htmlFor="filter-mode">Scope of analysis</label>
                        <FieldInfo label={`Scope of analysis: ${mode.label}`} text={mode.help} />
                    </span>
                    <select id="filter-mode" className="lens-input" value={filter.mode} onChange={(e) => set({ mode: e.target.value as FilterMode })}>
                        {MODES.map((m) => (
                            <option key={m.value} value={m.value} title={m.help}>
                                {m.label}
                            </option>
                        ))}
                    </select>
                </div>
                {(filter.mode === 'tables' || filter.mode === 'prefix') && (
                    <TablePicker key={filter.mode} mode={filter.mode} value={filter.value || ''} onChange={(value) => set({ value })} />
                )}
                {filter.mode === 'scope' && (
                    <div className="lens-field">
                        <ScopeInput value={filter.value || ''} onChange={(value) => set({ value })} />
                    </div>
                )}
                {filter.mode === 'secured_by_roles' && (
                    <Tip id="filter-admin">
                        Comparing against <code>admin</code> or other broad roles? Pick "Specific tables" or "Table name starts with" instead – broad roles touch thousands of tables.
                    </Tip>
                )}
                {filter.mode === 'all' && (
                    <Tip id="filter-all">Tick "Exclude system tables" to keep "All tables" fast and focused on business data.</Tip>
                )}
                <div className="lens-filter__opts">
                    <label className="lens-check">
                        <input type="checkbox" checked={filter.includeFields !== false} onChange={(e) => set({ includeFields: e.target.checked })} />
                        Include field-level rules
                    </label>
                    <FieldInfo label="Include field-level rules" text="Also evaluate read and write rules on individual fields. Turn off for a faster, table-level overview." />
                    <label className="lens-check">
                        <input type="checkbox" checked={!!filter.excludeSystem} onChange={(e) => set({ excludeSystem: e.target.checked })} />
                        Exclude system tables (sys_*, v_*, ts_* …)
                    </label>
                    <FieldInfo label="Exclude system tables" text="Skips platform tables such as sys_*, v_* and ts_* so results focus on business data." />
                    <label className="lens-check">
                        Max tables
                        <input
                            className="lens-input lens-input--narrow"
                            type="number"
                            min={1}
                            max={5000}
                            placeholder="1500"
                            value={filter.maxTables || ''}
                            onChange={(e) => set({ maxTables: e.target.value ? parseInt(e.target.value, 10) : undefined })}
                        />
                    </label>
                    <FieldInfo label="Max tables" text="Stops after this many tables (default 1,500, up to 5,000) so very broad analyses stay fast." />
                </div>
            </div>
        </section>
    )
}
