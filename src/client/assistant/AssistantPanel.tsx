import React, { useEffect, useRef, useState } from 'react'
import { AiMessage, AiStatus, LensApi } from '../services/LensApi'
import { useAssistant } from './AssistantContext'
import Markdown from './Markdown'
import Tip from '../components/Tip'
import { useClosing } from '../utils/useClosing'

const TOOL_LABEL: { [t: string]: string } = {
    best_practices: 'best practices',
    check_my_access: 'checked your access',
    find_subject: 'looked up users/roles',
    get_roles: 'read roles',
    search_acls: 'searched ACLs',
    get_acl: 'read an ACL',
    describe_table: 'read table schema',
    evaluate_access: 'evaluated access',
    search_records: 'read records',
    get_lens_run: 'read an ACL Lens run',
}

function suggestions(ctx: ReturnType<typeof useAssistant>['context']): string[] {
    const out: string[] = []
    if (ctx.table) {
        out.push(`Explain who can update ${ctx.table} records and why.`)
        out.push(`Review the ACLs on ${ctx.table} against best practices.`)
    }
    if (ctx.run_number) out.push(`Summarize the most important differences in ${ctx.run_number}.`)
    if (ctx.subjects && ctx.subjects.length > 1) out.push(`What roles would make ${ctx.subjects[0]} match ${ctx.subjects[1]}, and is that safe?`)
    out.push('A user cannot see a field on a form. How do I troubleshoot it?')
    out.push('How should I design ACLs for a new custom application table?')
    return out.slice(0, 4)
}

export default function AssistantPanel() {
    const a = useAssistant()
    const { rendered, closing } = useClosing(a.open, 320)
    const [status, setStatus] = useState<AiStatus | null>(null)
    const [statusError, setStatusError] = useState('')
    const [convId, setConvId] = useState('')
    const [messages, setMessages] = useState<AiMessage[]>([])
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    const [showHistory, setShowHistory] = useState(false)
    const [history, setHistory] = useState<{ sys_id: string; title: string; updated: string }[]>([])
    const endRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLTextAreaElement>(null)

    useEffect(() => {
        if (a.open && !status)
            LensApi.aiStatus()
                .then(setStatus)
                .catch((e) => setStatusError(e.message))
        if (a.open) setTimeout(() => inputRef.current?.focus(), 250)
    }, [a.open])

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }, [messages, busy])

    useEffect(() => {
        if (!a.open) return
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && a.close()
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [a.open])

    const send = async (text?: string) => {
        const message = (text ?? a.draft).trim()
        if (!message || busy) return
        a.setDraft('')
        setError('')
        setMessages((m) => m.concat([{ role: 'user', content: message, tools_used: [] }]))
        setBusy(true)
        try {
            const res = await LensApi.aiChat({ conversation_id: convId || undefined, message, context: a.context })
            setConvId(res.conversation_id)
            setMessages((m) => m.concat([{ role: 'assistant', content: res.answer, tools_used: res.tools_used }]))
        } catch (e: any) {
            setError(e.message)
        } finally {
            setBusy(false)
        }
    }

    const openHistory = async () => {
        setShowHistory(!showHistory)
        if (!showHistory) LensApi.aiConversations().then(setHistory).catch(() => setHistory([]))
    }

    const loadConversation = async (id: string) => {
        setShowHistory(false)
        try {
            const c = await LensApi.aiConversation(id)
            setConvId(c.sys_id)
            setMessages(c.messages)
        } catch (e: any) {
            setError(e.message)
        }
    }

    if (!rendered) return null
    const unavailable = status && !status.active
    return (
        <div className={`lens-ai${closing ? ' lens-ai--closing' : ''}`} role="dialog" aria-modal="false" aria-labelledby="ai-title">
            <header className="lens-ai__head">
                <div>
                    <h2 id="ai-title">Security Assistant</h2>
                    <p className="lens-muted lens-ai__status">
                        {statusError
                            ? statusError
                            : !status
                              ? 'Connecting…'
                              : status.active
                                ? `${status.active.name}${status.active.model ? ` · ${status.active.model}` : ''} · read-only · sees only what you can access`
                                : 'No AI provider available'}
                    </p>
                </div>
                <div className="lens-actions">
                    <button type="button" className="lens-btn lens-btn--ghost" onClick={openHistory} aria-expanded={showHistory}>
                        History
                    </button>
                    <button
                        type="button"
                        className="lens-btn lens-btn--ghost"
                        onClick={() => {
                            setConvId('')
                            setMessages([])
                            setError('')
                        }}
                    >
                        New chat
                    </button>
                    <button type="button" className="lens-icon-btn" aria-label="Close assistant" onClick={a.close}>
                        ×
                    </button>
                </div>
            </header>
            {showHistory && (
                <ul className="lens-ai__history">
                    {history.map((h) => (
                        <li key={h.sys_id}>
                            <button type="button" onClick={() => loadConversation(h.sys_id)}>
                                <span>{h.title}</span>
                                <span className="lens-muted">{h.updated}</span>
                            </button>
                        </li>
                    ))}
                    {!history.length && <li className="lens-muted">No saved conversations yet.</li>}
                </ul>
            )}
            <div className="lens-ai__body">
                {unavailable && (
                    <div className="lens-alert lens-alert--warning">
                        <p>The assistant needs an AI provider.</p>
                        <ul>
                            {status!.providers.map((p) => (
                                <li key={p.name}>
                                    {p.name}: {p.available ? 'available' : p.reason}
                                </li>
                            ))}
                        </ul>
                        <p>
                            {status!.is_admin ? (
                                <a href="/x_acllens_ai_provider_list.do" target="_blank" rel="noreferrer">
                                    Configure AI Providers
                                </a>
                            ) : (
                                'Ask an ACL Lens admin to configure one under ACL Lens → AI Providers.'
                            )}
                        </p>
                    </div>
                )}
                {!messages.length && !unavailable && (
                    <div className="lens-ai__welcome">
                        <p>Ask about access, troubleshooting, or designing ACLs. I can look things up, but only what you have access to, and I never change anything.</p>
                        <Tip id="ai-context">The assistant knows which run and table you have open, so you can ask "why is this denied?" directly.</Tip>
                        <div className="lens-ai__suggest">
                            {suggestions(a.context).map((s) => (
                                <button key={s} type="button" className="lens-suggest" onClick={() => send(s)}>
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                {messages.map((m, i) => (
                    <div key={i} className={`lens-msg lens-msg--${m.role}`}>
                        {m.role === 'assistant' ? <Markdown text={m.content} /> : <p>{m.content}</p>}
                        {m.tools_used && m.tools_used.length > 0 && (
                            <p className="lens-msg__tools">
                                {Array.from(new Set(m.tools_used))
                                    .map((t) => TOOL_LABEL[t] || t)
                                    .join(' · ')}
                            </p>
                        )}
                    </div>
                ))}
                {busy && (
                    <div className="lens-msg lens-msg--assistant lens-msg--busy" aria-live="polite">
                        <span className="lens-dots" aria-hidden="true">
                            <i />
                            <i />
                            <i />
                        </span>
                        Looking into it…
                    </div>
                )}
                {error && <div className="lens-alert lens-alert--critical">{error}</div>}
                <div ref={endRef} />
            </div>
            <form
                className="lens-ai__input"
                onSubmit={(e) => {
                    e.preventDefault()
                    send()
                }}
            >
                {(a.context.run_number || a.context.table) && (
                    <p className="lens-ai__ctx">
                        Context: {[a.context.run_number, a.context.table].filter(Boolean).join(' · ')}
                    </p>
                )}
                <textarea
                    ref={inputRef}
                    className="lens-input lens-ai__textarea"
                    rows={2}
                    placeholder="Ask a security question… (Enter to send, Shift+Enter for a new line)"
                    value={a.draft}
                    disabled={!!unavailable}
                    onChange={(e) => a.setDraft(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            send()
                        }
                    }}
                />
                <button type="submit" className="lens-btn lens-btn--primary" disabled={busy || !a.draft.trim() || !!unavailable}>
                    Send
                </button>
            </form>
        </div>
    )
}
