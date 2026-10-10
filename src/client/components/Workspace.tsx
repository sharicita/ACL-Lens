import React, { useState } from 'react'
import { WorkspaceDraft } from '../app'
import { LensApi } from '../services/LensApi'
import { RunPayload } from '../types'
import SubjectPicker from './SubjectPicker'
import FilterPanel from './FilterPanel'
import Tip from './Tip'
import Icon from './Icon'

interface Props {
    draft: WorkspaceDraft
    historyEnabled: boolean
    onDraftChange: (d: WorkspaceDraft) => void
    onRunComplete: (p: RunPayload) => void
}

const MAX_SUBJECTS = 8

export default function Workspace({ draft, historyEnabled, onDraftChange, onRunComplete }: Props) {
    const [busy, setBusy] = useState<'' | 'analyze' | 'compare'>('')
    const [error, setError] = useState('')

    const run = async (runType: 'analyze' | 'compare') => {
        setBusy(runType)
        setError('')
        try {
            const payload = await LensApi.createRun({
                name: draft.name,
                run_type: runType,
                subjects: draft.subjects.map((s) => ({ type: s.type, id: s.id })),
                filter: draft.filter,
            })
            onRunComplete(payload)
        } catch (e: any) {
            setError(e.message)
        } finally {
            setBusy('')
        }
    }

    const n = draft.subjects.length
    return (
        <div className="lens-workspace">
            <SubjectPicker
                selected={draft.subjects}
                max={MAX_SUBJECTS}
                onAdd={(s) => onDraftChange({ ...draft, subjects: draft.subjects.concat([s]) })}
                onRemove={(s) => onDraftChange({ ...draft, subjects: draft.subjects.filter((x) => !(x.id === s.id && x.type === s.type)) })}
            />
            <FilterPanel filter={draft.filter} onChange={(filter) => onDraftChange({ ...draft, filter })} />
            <section className="lens-card" aria-labelledby="run-title">
                <div className="lens-card__header">
                    <h2 id="run-title">
                        <Icon name="bolt" />
                        3. Run
                    </h2>
                </div>
                <div className="lens-card__body lens-run">
                    <label className="lens-field lens-run__name">
                        <span className="lens-field__label">Name (optional)</span>
                        <input
                            className="lens-input"
                            value={draft.name}
                            placeholder="e.g. Service desk vs ITIL baseline"
                            onChange={(e) => onDraftChange({ ...draft, name: e.target.value })}
                        />
                    </label>
                    <div className="lens-actions">
                        <button
                            type="button"
                            className="lens-btn lens-btn--primary"
                            disabled={!n || !!busy}
                            onClick={() => run('analyze')}
                            data-tip="Evaluate CRUD and field access for the selected users and roles and show them side by side."
                        >
                            <Icon name="play" />
                            {busy === 'analyze' ? 'Analyzing…' : `Analyze ${n > 1 ? 'side by side' : 'access'}`}
                        </button>
                        <button
                            type="button"
                            className="lens-btn lens-btn--secondary"
                            disabled={n < 2 || !!busy}
                            data-tip={n < 2 ? 'Select at least two users or roles to compare.' : 'Analyze, then run the comparison script: totals, head-to-head counts, role differences and an exportable list of every difference.'}
                            onClick={() => run('compare')}
                        >
                            <Icon name="compare" />
                            {busy === 'compare' ? 'Comparing…' : 'Analyze + run comparison script'}
                        </button>
                    </div>
                    {!historyEnabled && (
                        <p className="lens-note" data-tip="An ACL Lens admin can turn History back on in ACL Lens > Properties.">
                            History is turned off: results are shown but not saved, and can't be rerun later.
                        </p>
                    )}
                    {n === 1 && <Tip id="ws-compare">Add a second user or role to compare them side by side.</Tip>}
                    {n === 0 && <Tip id="ws-start">Start by searching for a user (for example a colleague who reports a problem) or a role you are designing.</Tip>}
                    {busy && <p className="lens-muted">Evaluating ACLs on the instance – large table sets can take a minute.</p>}
                    {error && (
                        <div className="lens-alert lens-alert--critical" role="alert">
                            {error}
                        </div>
                    )}
                </div>
            </section>
        </div>
    )
}
