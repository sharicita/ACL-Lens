import React, { useState } from 'react'
import { RunRecord } from '../types'
import Icon from './Icon'

interface Props {
    run: RunRecord
    reruns: RunRecord[]
    busy: string
    canCompare: boolean
    onRerun: () => void
    onCompare: () => void
    onEdit: () => void
    onOpenRun: (id: string) => void
    onExportMatrix: (onlyFiltered: boolean) => void
    onExportJson: () => void
    onExportComparison?: () => void
    /** ACL Lens admins can archive and delete runs */
    isAdmin?: boolean
    onArchive?: (archived: boolean) => void
    onDelete?: () => void
}

const FILTER_TEXT: { [m: string]: string } = {
    secured_by_roles: 'Tables secured by these roles',
    tables: 'Tables',
    prefix: 'Starts with',
    scope: 'Scope',
    all: 'All tables',
}

export default function RunHeader(p: Props) {
    const { run } = p
    const [exportOpen, setExportOpen] = useState(false)
    const [confirmDelete, setConfirmDelete] = useState(false)
    const manage = p.isAdmin && !run.unsaved
    const filter = run.filter || ({} as RunRecord['filter'])
    return (
        <section className="lens-card lens-runhead">
            <div className="lens-runhead__main">
                <div>
                    <p className="lens-runhead__eyebrow">
                        <span
                            className={`lens-pill lens-pill--${run.run_type}`}
                            data-tip={
                                run.run_type === 'compare'
                                    ? 'Comparison run: analysis plus the comparison script (totals, head-to-head, role differences, every difference).'
                                    : 'Analysis run: side-by-side access for the selected users and roles.'
                            }
                        >
                            {run.run_type === 'compare' ? 'Comparison' : 'Analysis'}
                        </span>
                        <strong data-tip={run.unsaved ? 'History is turned off, so this run was not saved. It disappears when you leave the page.' : 'Run number. Use it to find this run in History or reference it in a change record.'}>
                            {run.number}
                        </strong>
                        {run.archived && (
                            <span className="lens-pill" data-tip="Archived runs are hidden from History unless you choose to show archived runs.">
                                Archived
                            </span>
                        )}
                        <span className="lens-muted">
                            {run.created} · {run.run_by} · {run.table_count} tables · {(run.duration_ms / 1000).toFixed(1)}s
                        </span>
                    </p>
                    <h2 className="lens-runhead__title">{run.name || run.subject_summary || 'Untitled run'}</h2>
                    <p className="lens-muted" data-tip="Which tables this run analyzed. Use Edit in workspace to change it and run again.">
                        {FILTER_TEXT[filter.mode] || filter.mode}
                        {filter.value ? `: ${filter.value}` : ''}
                        {filter.includeFields === false ? ' · record rules only' : ' · record + field rules'}
                        {filter.excludeSystem ? ' · system tables excluded' : ''}
                    </p>
                    {(run.original_run || p.reruns.length > 0) && (
                        <p className="lens-lineage">
                            {run.original_run && (
                                <>
                                    Rerun of{' '}
                                    <button
                                        type="button"
                                        className="lens-link"
                                        onClick={() => p.onOpenRun(run.original_run)}
                                        data-tip={`This run repeated ${run.original_number} with the same users, roles and tables using live data. "Changes since original run" lists anything that moved. Click to open the original.`}
                                    >
                                        {run.original_number}
                                    </button>
                                </>
                            )}
                            {p.reruns.length > 0 && (
                                <>
                                    {run.original_run ? ' · ' : ''}Reruns:{' '}
                                    {p.reruns.map((r, i) => (
                                        <React.Fragment key={r.sys_id}>
                                            {i > 0 ? ', ' : ''}
                                            <button
                                                type="button"
                                                className="lens-link"
                                                onClick={() => p.onOpenRun(r.sys_id)}
                                                data-tip={`${r.number} reran this analysis on ${r.created}${r.run_by ? ` (${r.run_by})` : ''}${
                                                    r.summary && r.summary.drift ? `: ${r.summary.drift.total} access change(s) since this run` : ''
                                                }. Reruns re-evaluate the same users, roles and tables with live data so you can see what changed. Click to open it.`}
                                            >
                                                {r.number}
                                            </button>
                                        </React.Fragment>
                                    ))}
                                </>
                            )}
                        </p>
                    )}
                </div>
                <div className="lens-actions lens-runhead__actions">
                    {p.canCompare && (
                        <button
                            type="button"
                            className="lens-btn lens-btn--primary"
                            disabled={!!p.busy}
                            onClick={p.onCompare}
                            data-tip="Runs the server-side comparison script on these users and roles and saves it as a new comparison run you can export."
                        >
                            <Icon name="compare" />
                            {p.busy === 'compare' ? 'Comparing…' : 'Run comparison script'}
                        </button>
                    )}
                    {!run.unsaved && (
                        <button
                            type="button"
                            className="lens-btn lens-btn--secondary"
                            disabled={!!p.busy}
                            onClick={p.onRerun}
                            data-tip="Re-evaluates the same users, roles and tables with current ACLs and roles. Saves a new run linked to this one and shows what changed."
                        >
                            <Icon name="rerun" />
                            {p.busy === 'rerun' ? 'Rerunning…' : 'Rerun'}
                        </button>
                    )}
                    <button type="button" className="lens-btn lens-btn--tertiary" onClick={p.onEdit} data-tip="Loads these users, roles and filters into the Workspace so you can adjust and run again.">
                        <Icon name="edit" />
                        Edit in workspace
                    </button>
                    {manage && p.onArchive && (
                        <button
                            type="button"
                            className="lens-btn lens-btn--tertiary"
                            disabled={!!p.busy}
                            onClick={() => p.onArchive && p.onArchive(!run.archived)}
                            data-tip={run.archived ? 'Show this run in History again.' : 'Hide this run from History without deleting it. "Show archived" in History brings it back.'}
                        >
                            <Icon name={run.archived ? 'restore' : 'archive'} />
                            {p.busy === 'archive' ? 'Saving…' : run.archived ? 'Restore' : 'Archive'}
                        </button>
                    )}
                    {manage && p.onDelete && !confirmDelete && (
                        <button
                            type="button"
                            className="lens-btn lens-btn--danger-quiet"
                            disabled={!!p.busy}
                            onClick={() => setConfirmDelete(true)}
                            data-tip="Permanently delete this run, its results and attachments. You will be asked to confirm."
                        >
                            <Icon name="trash" />
                            Delete
                        </button>
                    )}
                    <div className="lens-menu">
                        <button
                            type="button"
                            className="lens-btn lens-btn--tertiary"
                            aria-haspopup="menu"
                            aria-expanded={exportOpen}
                            onClick={() => setExportOpen(!exportOpen)}
                            data-tip="Download as Excel-friendly CSV or JSON, or print / save as PDF."
                        >
                            <Icon name="download" />
                            Export ▾
                        </button>
                        {exportOpen && (
                            <ul className="lens-menu__list" role="menu" onClick={() => setExportOpen(false)}>
                                {p.onExportComparison && (
                                    <li role="none">
                                        <button type="button" role="menuitem" onClick={p.onExportComparison}>
                                            Comparison differences (CSV)
                                        </button>
                                    </li>
                                )}
                                <li role="none">
                                    <button type="button" role="menuitem" onClick={() => p.onExportMatrix(false)}>
                                        Full access matrix (CSV)
                                    </button>
                                </li>
                                <li role="none">
                                    <button type="button" role="menuitem" onClick={() => p.onExportMatrix(true)}>
                                        Matrix – currently filtered tables (CSV)
                                    </button>
                                </li>
                                <li role="none">
                                    <button type="button" role="menuitem" onClick={p.onExportJson}>
                                        Raw results (JSON)
                                    </button>
                                </li>
                                <li role="none">
                                    <button type="button" role="menuitem" onClick={() => window.print()}>
                                        Print / save as PDF
                                    </button>
                                </li>
                            </ul>
                        )}
                    </div>
                </div>
            </div>
            {confirmDelete && (
                <div className="lens-confirm" role="alertdialog" aria-labelledby="confirm-delete-text">
                    <p id="confirm-delete-text">
                        Delete <strong>{run.number}</strong> permanently? Its results and attachments are removed and this can't be undone.
                        {p.reruns.length > 0 ? ` Its ${p.reruns.length} rerun(s) are kept but lose the link back to it.` : ''} To keep it out of the way instead, use Archive.
                    </p>
                    <div className="lens-actions">
                        <button
                            type="button"
                            className="lens-btn lens-btn--danger"
                            disabled={!!p.busy}
                            autoFocus
                            onClick={() => {
                                setConfirmDelete(false)
                                if (p.onDelete) p.onDelete()
                            }}
                        >
                            {p.busy === 'delete' ? 'Deleting…' : 'Delete permanently'}
                        </button>
                        <button type="button" className="lens-btn lens-btn--tertiary" onClick={() => setConfirmDelete(false)}>
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </section>
    )
}
