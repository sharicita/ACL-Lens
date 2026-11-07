import React, { useEffect, useState } from 'react'
import FieldInfo from '../components/FieldInfo'
import { LensApi } from '../services/LensApi'
import { RunRecord } from '../types'
import { addTileToTab, newTabId, runReportDef, writeActiveTab } from './layout'
import ReportEditor from './ReportEditor'
import { Catalog, Dashboard, Report } from './types'

interface Props {
    run: RunRecord
    isAdmin: boolean
    onSaved: (message: string) => void
    onClose: () => void
}

const NEW_TAB = '__new'

/** Saves a run as a report: a chart that keeps showing this run, placed on a dashboard tab. */
export default function SaveRunReport({ run, isAdmin, onSaved, onClose }: Props) {
    const [catalog, setCatalog] = useState<Catalog | null>(null)
    const [dash, setDash] = useState<Dashboard | null>(null)
    const [error, setError] = useState('')
    const [tabId, setTabId] = useState('')
    const [newTitle, setNewTitle] = useState('')

    useEffect(() => {
        Promise.all([LensApi.reports(), LensApi.dashboard()])
            .then(([rep, d]) => {
                setCatalog(rep.catalog)
                setDash(d)
                setTabId(d.tabs[0].id)
            })
            .catch((e) => setError(e.message))
    }, [])

    if (error) return <div className="lens-alert lens-alert--critical">{error}</div>
    if (!catalog || !dash) return null

    const saved = async (report: Report) => {
        const creating = tabId === NEW_TAB
        const id = creating ? newTabId() : tabId
        const title = creating ? newTitle.trim() || report.name.substring(0, 60) : dash.tabs.filter((t) => t.id === id)[0].title
        const tabs = creating ? dash.tabs.concat([{ id, title, description: '', tiles: [] }]) : dash.tabs
        try {
            await LensApi.saveDashboard({ tabs: addTileToTab(tabs, report.sys_id, id), run: dash.run })
            writeActiveTab(id)
            onSaved(`Saved "${report.name}" to the "${title}" dashboard tab.`)
        } catch (e: any) {
            onSaved(`Saved the report "${report.name}", but couldn't add it to a tab (${e.message}). You can add it with Add report on the dashboard.`)
        }
    }

    return (
        <ReportEditor
            report={null}
            catalog={catalog}
            run={run.sys_id}
            isAdmin={isAdmin}
            onSaved={saved}
            onClose={onClose}
            title={`Save ${run.number} as a report`}
            saveLabel="Save to dashboard"
            pinLabel={run.number}
            initial={runReportDef(run)}
        >
            <div className="lens-saverun__tab">
                <div className="lens-field">
                    <span className="lens-field__label lens-field__label--info">
                        <label htmlFor="saverun-tab">Dashboard tab</label>
                        <FieldInfo label="Dashboard tab" text="Where the report goes. You can drag it to another tab or position later." />
                    </span>
                    <select id="saverun-tab" className="lens-input" value={tabId} onChange={(e) => setTabId(e.target.value)}>
                        {dash.tabs.map((t) => (
                            <option key={t.id} value={t.id}>
                                {t.title}
                            </option>
                        ))}
                        {dash.tabs.length < 20 && <option value={NEW_TAB}>New tab…</option>}
                    </select>
                </div>
                {tabId === NEW_TAB && (
                    <label className="lens-field">
                        <span className="lens-field__label">New tab title</span>
                        <input className="lens-input" value={newTitle} maxLength={60} onChange={(e) => setNewTitle(e.target.value)} />
                    </label>
                )}
            </div>
        </ReportEditor>
    )
}
