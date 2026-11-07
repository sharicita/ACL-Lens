import React, { useState } from 'react'
import FieldInfo from '../components/FieldInfo'
import Icon from '../components/Icon'
import { RunRecord } from '../types'
import { DashTab, Report } from './types'

interface Props {
    reports: Report[]
    tabs: DashTab[]
    activeTab: DashTab
    runs: RunRecord[]
    busy: boolean
    onAdd: (ids: string[], runs: RunRecord[]) => void
    onCancel?: () => void
}

const runName = (r: RunRecord) => `${r.number}${r.name ? ` ${r.name}` : ''}`

/**
 * Fills a tab. Choosing a run adds it as a pill, and that is enough: each run becomes a report of
 * its data. Ticking reports is optional: alone they are added as they are, and with runs chosen
 * each ticked report is added once per run, showing that run.
 */
export default function ReportPicker({ reports, tabs, activeTab, runs, busy, onAdd, onCancel }: Props) {
    const [picked, setPicked] = useState<string[]>([])
    const [runIds, setRunIds] = useState<string[]>([])
    const chosen = runIds.map((id) => runs.filter((r) => r.sys_id === id)[0]).filter((r) => !!r)

    const here = (id: string) => activeTab.tiles.some((t) => t.report === id)
    const placed: { [id: string]: boolean } = {}
    const groups = tabs
        .filter((t) => t.id !== activeTab.id)
        .map((t) => {
            const list = t.tiles.map((x) => reports.filter((r) => r.sys_id === x.report)[0]).filter((r) => !!r && !placed[r.sys_id] && !here(r.sys_id))
            for (const r of list) placed[r.sys_id] = true
            return { label: `On ${t.title}`, list }
        })
    groups.push({ label: groups.some((g) => g.list.length) ? 'Other reports' : 'Reports', list: reports.filter((r) => !placed[r.sys_id] && !here(r.sys_id)) })

    const toggle = (id: string) => setPicked(picked.indexOf(id) >= 0 ? picked.filter((x) => x !== id) : picked.concat([id]))
    const n = chosen.length ? chosen.length * Math.max(1, picked.length) : picked.length
    return (
        <section className="lens-picker" aria-labelledby="picker-title">
            <h4 id="picker-title">Add reports to this tab</h4>
            <div className="lens-field lens-picker__run">
                <span className="lens-field__label lens-field__label--info">
                    <label htmlFor="picker-run">Show data from</label>
                    <FieldInfo label="Show data from" text="Choose one or more saved runs. Each becomes a report that keeps showing that run, whatever Data from says at the top of the page." />
                </span>
                <select
                    id="picker-run"
                    className="lens-input"
                    value=""
                    onChange={(e) => {
                        if (e.target.value) setRunIds(runIds.concat([e.target.value]))
                    }}
                >
                    <option value="">{chosen.length ? 'Add another run…' : 'Choose a run…'}</option>
                    {runs
                        .filter((r) => runIds.indexOf(r.sys_id) < 0)
                        .map((r) => (
                            <option key={r.sys_id} value={r.sys_id}>
                                {runName(r)} · {(r.subject_summary || '').substring(0, 60)}
                            </option>
                        ))}
                </select>
            </div>
            {chosen.length > 0 && (
                <ul className="lens-picker__pills" aria-label="Runs to add">
                    {chosen.map((r) => (
                        <li key={r.sys_id} className="lens-datapill" data-tip={`${r.subject_summary || ''} · ${r.created}`}>
                            <span className="lens-datapill__name">{runName(r)}</span>
                            <button type="button" className="lens-datapill__x" aria-label={`Remove ${r.number}`} onClick={() => setRunIds(runIds.filter((id) => id !== r.sys_id))}>
                                <Icon name="close" size={12} />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            <div className="lens-actions">
                <button type="button" className="lens-btn lens-btn--primary" disabled={!n || busy} onClick={() => onAdd(picked, chosen)}>
                    {busy ? 'Adding…' : n ? `Add ${n} report${n === 1 ? '' : 's'}` : 'Add reports'}
                </button>
                {onCancel && (
                    <button type="button" className="lens-btn lens-btn--tertiary" onClick={onCancel}>
                        Cancel
                    </button>
                )}
            </div>
            <details className="lens-picker__more">
                <summary>
                    Choose specific reports{picked.length ? ` (${picked.length})` : ''}
                    <FieldInfo label="Choose specific reports" text="Optional. Without a run, ticked reports are added as they are and follow Data from. With runs chosen, you get each ticked report for each run." />
                </summary>
                <div className="lens-picker__groups">
                    {groups
                        .filter((g) => g.list.length > 0)
                        .map((g) => (
                            <fieldset key={g.label} className="lens-picker__group">
                                <legend>{g.label}</legend>
                                {g.list.map((r) => (
                                    <label key={r.sys_id} className="lens-check" data-tip={r.description || undefined}>
                                        <input type="checkbox" checked={picked.indexOf(r.sys_id) >= 0} onChange={() => toggle(r.sys_id)} />
                                        {r.name}
                                    </label>
                                ))}
                            </fieldset>
                        ))}
                </div>
            </details>
        </section>
    )
}
