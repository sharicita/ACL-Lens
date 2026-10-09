import React, { useEffect, useState } from 'react'
import { ClearRequest, LensApi, Settings } from '../services/LensApi'
import Tip from './Tip'

interface Props {
    onSaved: (s: Settings) => void
}

const today = () => new Date().toISOString().substring(0, 10)

export default function SettingsView({ onSaved }: Props) {
    const [saved, setSaved] = useState<Settings | null>(null)
    const [form, setForm] = useState<Settings | null>(null)
    const [busy, setBusy] = useState('')
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')
    const [clear, setClear] = useState<ClearRequest>({ mode: 'older_than', days: 90, from: today(), to: today(), include_archived: false })
    const [preview, setPreview] = useState<number | null>(null)

    useEffect(() => {
        LensApi.getSettings()
            .then((s) => {
                setSaved(s)
                setForm(s)
            })
            .catch((e) => setError(e.message))
    }, [])

    // a changed clear request invalidates the previewed count
    useEffect(() => setPreview(null), [clear])

    if (error && !form) return <div className="lens-alert lens-alert--critical">{error}</div>
    if (!form || !saved) return <p className="lens-muted">Loading settings…</p>
    const dirty = JSON.stringify(form) !== JSON.stringify(saved)

    const save = async () => {
        setBusy('save')
        setError('')
        setMessage('')
        try {
            const s = await LensApi.saveSettings(form)
            setSaved(s)
            setForm(s)
            onSaved(s)
            setMessage('Settings saved.')
        } catch (e: any) {
            setError(e.message)
        } finally {
            setBusy('')
        }
    }

    const doPreview = async () => {
        setBusy('preview')
        setError('')
        setMessage('')
        try {
            setPreview((await LensApi.previewClear(clear)).count)
        } catch (e: any) {
            setError(e.message)
        } finally {
            setBusy('')
        }
    }

    const doClear = async () => {
        setBusy('clear')
        setError('')
        try {
            const r = await LensApi.clearHistory(clear)
            setMessage(`Deleted ${r.deleted} run(s) and their saved results.`)
            setPreview(null)
        } catch (e: any) {
            setError(e.message)
        } finally {
            setBusy('')
        }
    }

    return (
        <div className="lens-settings">
            {message && (
                <div className="lens-alert lens-alert--positive" role="status">
                    {message}
                </div>
            )}
            {error && <div className="lens-alert lens-alert--critical">{error}</div>}

            <section className="lens-card" aria-labelledby="set-history">
                <div className="lens-card__header">
                    <h2 id="set-history">History</h2>
                </div>
                <div className="lens-card__body lens-settings__body">
                    <label className="lens-switch">
                        <input type="checkbox" checked={form.history_enabled} onChange={(e) => setForm({ ...form, history_enabled: e.target.checked })} />
                        <span>
                            <strong>Save runs to History</strong>
                            <span className="lens-muted">
                                When off, analyses and comparisons still work but are not stored. They can't be reopened, rerun or audited later.
                            </span>
                        </span>
                    </label>
                </div>
            </section>

            <section className="lens-card" aria-labelledby="set-appearance">
                <div className="lens-card__header">
                    <h2 id="set-appearance">Appearance</h2>
                </div>
                <div className="lens-card__body lens-settings__body">
                    <label className="lens-switch">
                        <input type="checkbox" checked={!!form.instance_theme} onChange={(e) => setForm({ ...form, instance_theme: e.target.checked })} />
                        <span>
                            <strong>Use the instance theme</strong>
                            <span className="lens-muted">
                                Match the colours of your instance's Next Experience theme (backgrounds, text and borders). The Granted / Conditional / Denied colours
                                stay the same so results always read the same way. Applies to everyone after saving.
                            </span>
                        </span>
                    </label>
                </div>
            </section>

            <section className="lens-card" aria-labelledby="set-retention">
                <div className="lens-card__header">
                    <h2 id="set-retention">Automatic cleanup</h2>
                </div>
                <div className="lens-card__body lens-settings__body">
                    <label className="lens-switch">
                        <input type="checkbox" checked={form.retention_enabled} onChange={(e) => setForm({ ...form, retention_enabled: e.target.checked })} />
                        <span>
                            <strong>Clean up old runs automatically</strong>
                            <span className="lens-muted">A daily job (2:30 AM) removes or archives runs older than the period below.</span>
                        </span>
                    </label>
                    <fieldset className="lens-settings__group" disabled={!form.retention_enabled}>
                        <label className="lens-field lens-settings__days">
                            <span className="lens-field__label">Keep runs for (days)</span>
                            <input
                                className="lens-input"
                                type="number"
                                min={1}
                                max={3650}
                                value={form.retention_days}
                                onChange={(e) => setForm({ ...form, retention_days: parseInt(e.target.value || '0', 10) })}
                            />
                        </label>
                        <div className="lens-field">
                            <span className="lens-field__label">Then</span>
                            <div className="lens-radios" role="radiogroup">
                                <label className="lens-check" data-tip="Permanently removes the run, its saved results and its CSV attachment.">
                                    <input type="radio" name="ret-action" checked={form.retention_action === 'delete'} onChange={() => setForm({ ...form, retention_action: 'delete' })} />
                                    Delete
                                </label>
                                <label className="lens-check" data-tip="Keeps the run but hides it from History. Admins can show archived runs and restore them.">
                                    <input type="radio" name="ret-action" checked={form.retention_action === 'archive'} onChange={() => setForm({ ...form, retention_action: 'archive' })} />
                                    Archive
                                </label>
                            </div>
                        </div>
                    </fieldset>
                </div>
                <div className="lens-card__footer">
                    <button type="button" className="lens-btn lens-btn--primary" disabled={!dirty || !!busy} onClick={save}>
                        {busy === 'save' ? 'Saving…' : 'Save settings'}
                    </button>
                    <button type="button" className="lens-btn lens-btn--ghost" disabled={!dirty || !!busy} onClick={() => setForm(saved)}>
                        Discard changes
                    </button>
                </div>
            </section>

            <section className="lens-card" aria-labelledby="set-clear">
                <div className="lens-card__header">
                    <h2 id="set-clear">Clear history now</h2>
                </div>
                <div className="lens-card__body lens-settings__body">
                    <Tip id="settings-clear">Preview first: you'll see exactly how many runs match before anything is deleted. Deleting can't be undone; archive instead if you may need them later.</Tip>
                    <div className="lens-radios" role="radiogroup" aria-label="What to clear">
                        <label className="lens-check">
                            <input type="radio" name="clear-mode" checked={clear.mode === 'older_than'} onChange={() => setClear({ ...clear, mode: 'older_than' })} />
                            Older than
                        </label>
                        <label className="lens-check">
                            <input type="radio" name="clear-mode" checked={clear.mode === 'range'} onChange={() => setClear({ ...clear, mode: 'range' })} />
                            Date range
                        </label>
                        <label className="lens-check">
                            <input type="radio" name="clear-mode" checked={clear.mode === 'all'} onChange={() => setClear({ ...clear, mode: 'all' })} />
                            All runs
                        </label>
                    </div>
                    {clear.mode === 'older_than' && (
                        <label className="lens-field lens-settings__days">
                            <span className="lens-field__label">Days</span>
                            <input className="lens-input" type="number" min={1} value={clear.days} onChange={(e) => setClear({ ...clear, days: parseInt(e.target.value || '0', 10) })} />
                        </label>
                    )}
                    {clear.mode === 'range' && (
                        <div className="lens-settings__range">
                            <label className="lens-field">
                                <span className="lens-field__label">From</span>
                                <input className="lens-input" type="date" value={clear.from} max={clear.to} onChange={(e) => setClear({ ...clear, from: e.target.value })} />
                            </label>
                            <label className="lens-field">
                                <span className="lens-field__label">To</span>
                                <input className="lens-input" type="date" value={clear.to} min={clear.from} onChange={(e) => setClear({ ...clear, to: e.target.value })} />
                            </label>
                        </div>
                    )}
                    <label className="lens-check">
                        <input type="checkbox" checked={!!clear.include_archived} onChange={(e) => setClear({ ...clear, include_archived: e.target.checked })} />
                        Include archived runs
                    </label>
                </div>
                <div className="lens-card__footer">
                    <button type="button" className="lens-btn lens-btn--tertiary" disabled={!!busy} onClick={doPreview}>
                        {busy === 'preview' ? 'Counting…' : 'Preview'}
                    </button>
                    {preview !== null && (
                        <>
                            <span className="lens-settings__count">
                                {preview === 0 ? 'No runs match.' : `${preview} run(s) will be permanently deleted.`}
                            </span>
                            {preview > 0 && (
                                <button type="button" className="lens-btn lens-btn--danger" disabled={!!busy} onClick={doClear}>
                                    {busy === 'clear' ? 'Deleting…' : `Delete ${preview} run(s)`}
                                </button>
                            )}
                        </>
                    )}
                </div>
            </section>
        </div>
    )
}
