import React, { useEffect, useState } from 'react'
import Drawer from '../components/Drawer'
import FieldInfo from '../components/FieldInfo'
import { LensApi } from '../services/LensApi'
import { OP_HELP, OP_SHORT } from '../utils/status'
import ReportChart from './ReportChart'
import { Catalog, CATEGORY_LABEL, CHART_LABEL, ChartType, DIM_LABEL, Report, ReportData, ReportOptions } from './types'

interface Props {
    /** an existing report (edit, or customize a read-only one), or null for a new report */
    report: Report | null
    catalog: Catalog
    run: string
    isAdmin: boolean
    onSaved: (r: Report, replaced: string | null) => void
    onDeleted?: (id: string) => void
    onClose: () => void
}

const KINDS = ['Human', 'Machine / service', 'AI agent', 'Unclassified', 'Not recorded', 'Role', 'Group']
const STATUSES = ['Granted', 'Conditional', 'Denied', 'No rule']

function toggle(list: string[] | undefined, v: string): string[] {
    const s = new Set(list || [])
    s.has(v) ? s.delete(v) : s.add(v)
    return Array.from(s)
}

function lines(text: string): string[] {
    return text
        .split(/[\s,]+/)
        .map((x) => x.trim())
        .filter((x) => !!x)
}

/**
 * Create or edit a report. A shipped (read-only) report opens as "Customize": saving makes the
 * user's own copy and swaps it in on their dashboard.
 */
export default function ReportEditor({ report, catalog, run, isAdmin, onSaved, onDeleted, onClose }: Props) {
    const readOnly = !!report && !report.can_edit
    const first = catalog.measures[0]
    const [name, setName] = useState(report ? (readOnly ? `${report.name} (my copy)` : report.name) : '')
    const [description, setDescription] = useState(report?.description || '')
    const [measure, setMeasure] = useState(report?.measure || first.id)
    const [chart, setChart] = useState<ChartType>(report?.chart || 'bar')
    const [opts, setOpts] = useState<ReportOptions>(report?.options || {})
    const [shared, setShared] = useState(!!report?.shared && !report?.system)
    const [preview, setPreview] = useState<ReportData | null>(null)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    const m = catalog.measures.find((x) => x.id === measure) || first
    const hasOps = m.dims.indexOf('operation') >= 0
    const hasStatus = m.dims.indexOf('status') >= 0 && ['access'].indexOf(m.id) >= 0
    const hasKinds = m.dims.indexOf('kind') >= 0 || m.dims.indexOf('subject') >= 0
    const hasTables = m.dims.indexOf('table') >= 0

    // live preview (debounced)
    useEffect(() => {
        const t = window.setTimeout(async () => {
            try {
                const r = await LensApi.previewReport(run, { name: name || 'preview', measure, chart, options: opts })
                setPreview(r.data)
                setError('')
            } catch (e: any) {
                setError(e.message)
            }
        }, 350)
        return () => window.clearTimeout(t)
    }, [measure, chart, JSON.stringify(opts), run])

    const save = async () => {
        setBusy(true)
        setError('')
        try {
            const body: Partial<Report> & { copied_from?: string } = { name, description, measure, chart, options: opts, category: m.category }
            if (report && !readOnly) body.sys_id = report.sys_id
            if (report && readOnly) body.copied_from = report.sys_id
            if (isAdmin) body.shared = shared
            const saved = await LensApi.saveReport(body)
            onSaved(saved, report && readOnly ? report.sys_id : null)
        } catch (e: any) {
            setError(e.message)
        } finally {
            setBusy(false)
        }
    }

    const remove = async () => {
        if (!report || !onDeleted || !window.confirm(`Delete the report "${report.name}"? It is removed from your dashboard too.`)) return
        setBusy(true)
        try {
            await LensApi.deleteReport(report.sys_id)
            onDeleted(report.sys_id)
        } catch (e: any) {
            setError(e.message)
            setBusy(false)
        }
    }

    const setO = (patch: Partial<ReportOptions>) => setOpts({ ...opts, ...patch })

    return (
        <Drawer
            title={!report ? 'New report' : readOnly ? `Customize: ${report.name}` : `Edit: ${report.name}`}
            subtitle={readOnly ? 'This report ships with ACL Lens and is read-only. Saving creates your own copy and puts it on your dashboard in its place.' : undefined}
            width="min(1100px, 96vw)"
            onClose={onClose}
            actions={
                <>
                    {report && report.can_edit && onDeleted && (
                        <button type="button" className="lens-btn lens-btn--tertiary" disabled={busy} onClick={remove}>
                            Delete
                        </button>
                    )}
                    <button type="button" className="lens-btn lens-btn--primary" disabled={busy || !name.trim()} onClick={save}>
                        {busy ? 'Saving…' : readOnly ? 'Save my copy' : 'Save'}
                    </button>
                </>
            }
        >
            {error && (
                <p className="lens-alert lens-alert--critical" role="alert">
                    {error}
                </p>
            )}
            <div className="lens-editor">
                <form className="lens-editor__form" onSubmit={(e) => e.preventDefault()}>
                    <label className="lens-field">
                        <span className="lens-field__label">Name</span>
                        <input className="lens-input" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} />
                    </label>
                    <label className="lens-field">
                        <span className="lens-field__label">Description</span>
                        <input className="lens-input" value={description} maxLength={1000} onChange={(e) => setDescription(e.target.value)} />
                    </label>
                    <label className="lens-field">
                        <span className="lens-field__label">
                            What it measures <FieldInfo label="What it measures" text={m.description} />
                        </span>
                        <select
                            className="lens-input"
                            value={measure}
                            onChange={(e) => {
                                const next = catalog.measures.find((x) => x.id === e.target.value)
                                setMeasure(e.target.value)
                                if (next) setOpts({ groupBy: next.groupBy })
                            }}
                        >
                            {(['overview', 'high_risk', 'vulnerability', 'comparison'] as const).map((cat) => (
                                <optgroup key={cat} label={CATEGORY_LABEL[cat]}>
                                    {catalog.measures
                                        .filter((x) => x.category === cat)
                                        .map((x) => (
                                            <option key={x.id} value={x.id}>
                                                {x.label}
                                            </option>
                                        ))}
                                </optgroup>
                            ))}
                        </select>
                    </label>
                    <div className="lens-field">
                        <span className="lens-field__label">Chart</span>
                        <div className="lens-segment" role="radiogroup" aria-label="Chart">
                            {(['bar', 'donut', 'tile', 'list'] as ChartType[]).map((c) => (
                                <button key={c} type="button" role="radio" aria-checked={chart === c} className={`lens-segment__item${chart === c ? ' lens-segment__item--on' : ''}`} onClick={() => setChart(c)}>
                                    {CHART_LABEL[c]}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="lens-editor__row">
                        <label className="lens-field">
                            <span className="lens-field__label">Group by</span>
                            <select className="lens-input" value={opts.groupBy ?? m.groupBy} onChange={(e) => setO({ groupBy: e.target.value as any })}>
                                {m.dims.map((d) => (
                                    <option key={d} value={d}>
                                        {DIM_LABEL[d]}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="lens-field">
                            <span className="lens-field__label">
                                Show the top <FieldInfo label="Show the top" text="How many groups to chart; the rest are added up as Other." />
                            </span>
                            <input className="lens-input" type="number" min={1} max={50} value={opts.limit || ''} placeholder="10" onChange={(e) => setO({ limit: e.target.value ? parseInt(e.target.value, 10) : undefined })} />
                        </label>
                    </div>
                    {hasOps && (
                        <div className="lens-field">
                            <span className="lens-field__label">
                                Operations <FieldInfo label="Operations" text="Leave all off to use the report's default operations." />
                            </span>
                            <div className="lens-opsel">
                                {catalog.operations.map((op) => {
                                    const on = (opts.ops || []).indexOf(op) >= 0
                                    return (
                                        <button key={op} type="button" className={`lens-opsel__op${on ? ' lens-opsel__op--on' : ''}`} aria-pressed={on} data-tip={`${op}: ${OP_HELP[op]}`} onClick={() => setO({ ops: toggle(opts.ops, op) })}>
                                            {OP_SHORT[op]}
                                            <span className="lens-sr"> ({op})</span>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                    {hasStatus && (
                        <fieldset className="lens-field lens-editor__checks">
                            <legend className="lens-field__label">Results</legend>
                            {STATUSES.map((s) => (
                                <label key={s} className="lens-check">
                                    <input type="checkbox" checked={(opts.statuses || []).indexOf(s) >= 0} onChange={() => setO({ statuses: toggle(opts.statuses, s) })} />
                                    {s}
                                </label>
                            ))}
                        </fieldset>
                    )}
                    {hasKinds && m.id !== 'differences' && (
                        <fieldset className="lens-field lens-editor__checks">
                            <legend className="lens-field__label">Account types</legend>
                            {KINDS.map((k) => (
                                <label key={k} className="lens-check">
                                    <input type="checkbox" checked={(opts.kinds || []).indexOf(k) >= 0} onChange={() => setO({ kinds: toggle(opts.kinds, k) })} />
                                    {k}
                                </label>
                            ))}
                        </fieldset>
                    )}
                    {hasTables && (
                        <label className="lens-field">
                            <span className="lens-field__label">Table name or label contains</span>
                            <input className="lens-input" value={opts.tableText || ''} onChange={(e) => setO({ tableText: e.target.value || undefined })} />
                        </label>
                    )}
                    {m.id === 'high_risk_tables' && (
                        <label className="lens-field">
                            <span className="lens-field__label">
                                High-risk tables <FieldInfo label="High-risk tables" text="One per line or comma-separated. Leave empty for the built-in list." />
                            </span>
                            <textarea className="lens-input" rows={5} value={(opts.tables || []).join('\n')} placeholder={catalog.highRiskTables.join('\n')} onChange={(e) => setO({ tables: lines(e.target.value) })} />
                        </label>
                    )}
                    {m.id === 'privileged' && (
                        <label className="lens-field">
                            <span className="lens-field__label">
                                Privileged roles <FieldInfo label="Privileged roles" text="One per line or comma-separated. Leave empty for the built-in list." />
                            </span>
                            <textarea className="lens-input" rows={4} value={(opts.roles || []).join('\n')} placeholder={catalog.privilegedRoles.join('\n')} onChange={(e) => setO({ roles: lines(e.target.value) })} />
                        </label>
                    )}
                    {isAdmin && (
                        <label className="lens-check">
                            <input type="checkbox" checked={shared} onChange={(e) => setShared(e.target.checked)} />
                            Share with all ACL Lens users
                            <FieldInfo label="Share" text="Shared reports appear in everyone's Add report list. Only ACL Lens admins can share." />
                        </label>
                    )}
                </form>
                <section className="lens-editor__preview" aria-label="Preview">
                    <h3>Preview</h3>
                    <p className="lens-muted">With the run the dashboard shows. {m.description}</p>
                    {preview ? <ReportChart chart={chart} data={preview} /> : <p className="lens-muted">Loading…</p>}
                </section>
            </div>
        </Drawer>
    )
}
