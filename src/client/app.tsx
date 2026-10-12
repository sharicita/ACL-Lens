import React, { useCallback, useEffect, useRef, useState } from 'react'
import { AnalysisFilter, RunPayload, SubjectOption } from './types'
import { getViewFromUrl, pushView, setTitle, ViewName, ViewState } from './utils/nav'
import Header from './components/Header'
import Workspace from './components/Workspace'
import HistoryView from './components/HistoryView'
import RunView from './components/RunView'
import { AssistantProvider } from './assistant/AssistantContext'
import DashboardView from './dashboard/DashboardView'
import AssistantPanel from './assistant/AssistantPanel'
import SettingsView from './components/SettingsView'
import McpSetupView from './components/McpSetupView'
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
    filter: { mode: 'tables', value: '', includeFields: true, excludeSystem: true },
    name: '',
}

/** True when the user's ServiceNow theme has a dark page background. */
export function themeIsDark(): boolean {
    const rgb = getComputedStyle(document.documentElement).getPropertyValue('--now-color_background--primary').split(',').map((x) => parseInt(x, 10))
    if (rgb.length < 3 || rgb.some((x) => isNaN(x))) return false
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2] < 110
}

export default function App() {
    return (
        <AssistantProvider>
            <Shell />
        </AssistantProvider>
    )
}


function Shell() {
    const [view, setView] = useState<ViewState>(getViewFromUrl)
    const [draft, setDraft] = useState<WorkspaceDraft>(EMPTY_DRAFT)
    // results already in memory (just executed) so opening them doesn't refetch
    const cache = useRef<{ [id: string]: RunPayload }>({})
    // e.g. "External User Not Authorized" when the Explicit Roles plugin is active and the user lacks snc_internal
    const [accessProblem, setAccessProblem] = useState('')
    const [me, setMe] = useState<{ is_admin: boolean; can_live_check?: boolean; history_enabled: boolean; instance_theme?: boolean }>({ is_admin: false, history_enabled: true })

    useEffect(() => {
        LensApi.me()
            .then(setMe)
            .catch((e) => setAccessProblem(String(e.message || '')))
    }, [])

    // admin setting: follow each user's own ServiceNow theme (and its dark appearance)
    useEffect(() => {
        const root = document.documentElement
        root.classList.toggle('lens-theme-instance', !!me.instance_theme)
        root.classList.toggle('lens-theme-dark', !!me.instance_theme && themeIsDark())
    }, [me.instance_theme])

    useEffect(() => {
        const onPop = () => setView(getViewFromUrl())
        window.addEventListener('popstate', onPop)
        return () => window.removeEventListener('popstate', onPop)
    }, [])

    useEffect(() => {
        if (view.view === 'history') setTitle('ACL Lens – History')
        else if (view.view === 'dashboard') setTitle('ACL Lens – Reporting dashboard')
        else if (view.view === 'settings') setTitle('ACL Lens – Properties')
        else if (view.view === 'mcp') setTitle('ACL Lens – MCP Server')
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
                {accessProblem && (
                    <div className="lens-alert lens-alert--critical" role="alert">
                        {/external user/i.test(accessProblem) ? (
                            <>
                                <strong>ServiceNow treats your account as an external user, so ACL Lens can't load your data.</strong> This instance uses the Explicit Roles
                                plugin: ask an administrator to give you the <code>snc_internal</code> role (and the ACL Lens user role), then sign out and back in.
                            </>
                        ) : (
                            <>
                                <strong>ACL Lens couldn't check your access:</strong> {accessProblem}. You may need the ACL Lens user role (<code>x_acllens.user</code>);
                                ask an administrator.
                            </>
                        )}
                    </div>
                )}
                {view.view === 'workspace' && <Workspace draft={draft} historyEnabled={me.history_enabled} onDraftChange={setDraft} onRunComplete={openRun} onOpenDashboard={() => navigate('dashboard')} />}
                {view.view === 'dashboard' && <DashboardView isAdmin={me.is_admin} onOpenRun={(id) => navigate('run', id)} onNavigate={(v) => navigate(v)} />}
                {view.view === 'history' && <HistoryView isAdmin={me.is_admin} historyEnabled={me.history_enabled} onOpen={(id) => navigate('run', id)} onRunComplete={openRun} />}
                {view.view === 'settings' &&
                    (me.is_admin ? (
                        <SettingsView onNavigate={(v) => navigate(v)} onSaved={(s) => setMe({ ...me, history_enabled: s.history_enabled, instance_theme: s.instance_theme })} />
                    ) : (
                        <div className="lens-alert lens-alert--warning">Settings are available to ACL Lens admins (x_acllens.admin).</div>
                    ))}
                {view.view === 'mcp' &&
                    (me.is_admin ? (
                        <McpSetupView onNavigate={(v) => navigate(v)} />
                    ) : (
                        <div className="lens-alert lens-alert--warning">The MCP server setup is available to ACL Lens admins (x_acllens.admin).</div>
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
                        canLiveCheck={!!me.can_live_check}
                        onDeleted={() => {
                            // forget the deleted run so Back can't show it from memory
                            delete cache.current[view.id as string]
                            navigate('history')
                        }}
                    />
                )}
            </main>
            <AssistantPanel />
            <TooltipLayer />
        </div>
    )
}
