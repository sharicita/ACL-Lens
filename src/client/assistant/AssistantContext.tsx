import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ScreenContext } from './screenContext'

export type { ScreenContext }

interface AssistantApi {
    open: boolean
    context: ScreenContext
    draft: string
    setContext: (c: ScreenContext) => void
    /** Opens the panel, optionally pre-filling a question. */
    ask: (question?: string) => void
    close: () => void
    setDraft: (s: string) => void
}

const Ctx = createContext<AssistantApi | null>(null)

export function AssistantProvider({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(false)
    const [context, setContext] = useState<ScreenContext>({})
    const [draft, setDraft] = useState('')
    const ask = useCallback((question?: string) => {
        if (question) setDraft(question)
        setOpen(true)
    }, [])
    const close = useCallback(() => setOpen(false), [])
    const value = useMemo(() => ({ open, context, draft, setContext, ask, close, setDraft }), [open, context, draft, ask, close])
    return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAssistant(): AssistantApi {
    const v = useContext(Ctx)
    if (!v) throw new Error('useAssistant must be used inside AssistantProvider')
    return v
}
