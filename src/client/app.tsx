import React, { useCallback, useEffect, useRef, useState } from 'react'
import { AnalysisFilter, RunPayload, SubjectOption } from './types'
import { getViewFromUrl, pushView, setTitle, ViewName, ViewState } from './utils/nav'
import Header from './components/Header'
import Workspace from './components/Workspace'
import HistoryView from './components/HistoryView'
import RunView from './components/RunView'
import { AssistantProvider, useAssistant } from './assistant/AssistantContext'
import AssistantPanel from './assistant/AssistantPanel'
import SettingsView from './components/SettingsView'
import TooltipLayer from './components/TooltipLayer'
import ReportList from './components/ReportList'
import { isListKind } from './utils/reportLists'
import { LensApi } from './services/LensApi'

export interface WorkspaceDraft {
    subjects: SubjectOption[]
    filter: AnalysisFilter
    name: string
}

const EMPTY_DRAFT: WorkspaceDraft = {
    subjects: [],
    filter: { mode: 'secured_by_roles', value: '', includeFields: true, excludeSystem: false },
    name: '',
}

export default function App() {
    return (
        <AssistantProvider>
            <Shell />
        </AssistantProvider>
    )
}

function AssistantLauncher() {
    const a = useAssistant()
    if (a.open) return null
    return (
        <button type="button" className="lens-launcher" onClick={() => a.ask()} aria-label="Open Security Assistant">
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="currentColor" d="M12 2 4 5v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V5l-8-3Zm-1 13-3-3 1.4-1.4 1.6 1.6 4.6-4.6L17 9l-6 6Z" />
            </svg>
            Security Assistant
        </button>
    )
}

function Shell() {
    const [view, setView] = useState<ViewState>(getViewFromUrl)
    const [draft, setDraft] = useState<WorkspaceDraft>(EMPTY_DRAFT)
    // results already in memory (just executed) so opening them doesn't refetch
    const cache = useRef<{ [id: string]: RunPayload }>({})
    const [me, setMe] = useState<{ is_admin: boolean; history_enabled: boolean; instance_theme?: boolean }>({ is_admin: false, history_enabled: true })

    useEffect(() => {
        LensApi.me()
            .then(setMe)
            .catch(() => undefined)
    }, [])

    // admin setting: follow the instance's Next Experience theme colours
    useEffect(() => {
        document.documentElement.classList.toggle('lens-theme-instance', !!me.instance_theme)
    }, [me.instance_theme])

    useEffect(() => {
        const onPop = () => setView(getViewFromUrl())
        window.addEventListener('popstate', onPop)
        return () => window.removeEventListener('popstate', onPop)
    }, [])

    useEffect(() => {
        if (view.view === 'history') setTitle('ACL Lens – History')
        else if (view.view === 'settings') setTitle('ACL Lens – Settings')
        else if (view.view === 'workspace') setTitle('ACL Lens – Workspace')
    }, [view])

    const navigate = useCallback((name: ViewName, id?: string | null, title?: string) => {
        pushView(name, id, title || 'ACL Lens')
        setView({ view: name, id: id || null })
    }, [])

    const openRun = useCallback(
        (payload: RunPayload) => {
            cache.current[payload.run.sys_id] = payload
            navigate('run', payload.run.sys_id, `ACL Lens – ${payload.run.number}`)
        },
        [navigate]
    )

    const editInWorkspace = useCallback(
        (payload: RunPayload) => {
            const subs: SubjectOption[] = (payload.results?.subjects || []).map((s) => ({
                id: s.subject.id,
                type: s.subject.type,
                label: s.subject.label,
                sub: s.subject.sub,
            }))
            setDraft({ subjects: subs, filter: payload.run.filter, name: payload.run.name })
            navigate('workspace')
        },
        [navigate]
    )

    return (
        <div className="lens">
            <Header view={view.view} isAdmin={me.is_admin} onNavigate={(v) => navigate(v)} />
            <main className="lens__main">
                {view.view === 'workspace' && <Workspace draft={draft} historyEnabled={me.history_enabled} onDraftChange={setDraft} onRunComplete={openRun} />}
                {view.view === 'history' && <HistoryView isAdmin={me.is_admin} historyEnabled={me.history_enabled} onOpen={(id) => navigate('run', id)} onRunComplete={openRun} />}
                {view.view === 'settings' &&
                    (me.is_admin ? (
                        <SettingsView onSaved={(s) => setMe({ ...me, history_enabled: s.history_enabled, instance_theme: s.instance_theme })} />
                    ) : (
                        <div className="lens-alert lens-alert--warning">Settings are available to ACL Lens admins (x_acllens.admin).</div>
                    ))}
                {view.view === 'list' && view.id && isListKind(view.list || null) && (
                    <ReportList key={`${view.id}-${view.list}`} runId={view.id} list={view.list as any} onOpenRun={(id) => navigate('run', id)} />
                )}
                {view.view === 'run' && view.id && (
                    <RunView
                        key={view.id}
                        runId={view.id}
                        cached={cache.current[view.id]}
                        onRunComplete={openRun}
                        onOpenRun={(id) => navigate('run', id)}
                        onEdit={editInWorkspace}
                        isAdmin={me.is_admin}
                        onDeleted={() => {
                            // forget the deleted run so Back can't show it from memory
                            delete cache.current[view.id as string]
                            navigate('history')
                        }}
                    />
                )}
            </main>
            <AssistantLauncher />
            <AssistantPanel />
            <TooltipLayer />
        </div>
    )
}
