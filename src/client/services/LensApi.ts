import { AnalysisFilter, FieldDetail, RunPayload, RunRecord, SubjectOption, SubjectType } from '../types'

declare global {
    interface Window {
        g_ck: string
    }
}

const BASE = '/api/x_acllens/lens'

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`${BASE}${path}`, {
        ...init,
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-UserToken': window.g_ck,
            ...(init.headers || {}),
        },
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
        const message = data?.result?.error?.message || data?.error?.message
        throw new Error(message || `Request failed (${response.status})`)
    }
    return data.result as T
}

export type SubjectRef = { type: SubjectType; id: string }

export interface AclDetail {
    sys_id: string
    name: string
    operation: string
    decision: string
    description: string
    roles: string[]
    condition: string
    condition_query: string
    applies_to: string
    security_attribute: string
    has_script: boolean
    script: string
    script_hidden: boolean
    admin_overrides: boolean
}

export interface Settings {
    history_enabled: boolean
    retention_enabled: boolean
    retention_days: number
    retention_action: 'delete' | 'archive'
    instance_theme: boolean
    mcp_enabled: boolean
}

export interface McpInfo {
    enabled: boolean
    endpoint: string
    protocol_version: string
    transport: string
    required_role: string
    tools: { name: string; description: string }[]
    prompts: { name: string; description: string }[]
    resources: { uri: string; title: string }[]
}

export interface ClearRequest {
    mode: 'all' | 'range' | 'older_than'
    from?: string
    to?: string
    days?: number
    include_archived?: boolean
}

export interface AiStatus {
    active: { sys_id: string; name: string; type: string; model: string } | null
    providers: { name: string; type: string; available: boolean; reason: string }[]
    is_admin: boolean
}

export interface AiMessage {
    role: 'user' | 'assistant'
    content: string
    tools_used: string[]
    created?: string
}

export interface AiChatResult {
    conversation_id: string
    title: string
    answer: string
    tools_used: string[]
    provider: string
}

export const LensApi = {
    searchSubjects(type: SubjectType, q: string) {
        const p = new URLSearchParams({ type, q, limit: '15' })
        return request<Omit<SubjectOption, 'type'>[]>(`/subjects?${p}`)
    },
    searchTables(q: string) {
        return request<{ results: { name: string; label: string; scope: string }[]; prefixCount: number }>(`/tables?${new URLSearchParams({ q })}`)
    },
    aclDetail(id: string) {
        return request<AclDetail>(`/acl/${id}`)
    },
    searchScopes(q: string) {
        return request<{ scope: string; name: string }[]>(`/scopes?${new URLSearchParams({ q })}`)
    },
    createRun(body: { name?: string; run_type: 'analyze' | 'compare'; subjects: SubjectRef[]; filter: AnalysisFilter }) {
        return request<RunPayload>('/runs', { method: 'POST', body: JSON.stringify(body) })
    },
    listRuns(params: { q?: string; type?: string; original?: string; limit?: number; archived?: boolean }) {
        const p = new URLSearchParams()
        if (params.archived) p.set('archived', 'true')
        if (params.q) p.set('q', params.q)
        if (params.type) p.set('type', params.type)
        if (params.original) p.set('original', params.original)
        p.set('limit', String(params.limit || 50))
        return request<RunRecord[]>(`/runs?${p}`)
    },
    getRun(id: string) {
        return request<RunPayload>(`/runs/${id}`)
    },
    rerun(id: string) {
        return request<RunPayload>(`/runs/${id}/rerun`, { method: 'POST', body: '{}' })
    },
    me() {
        return request<{ user: string; is_admin: boolean; history_enabled: boolean; instance_theme?: boolean }>('/me')
    },
    getSettings() {
        return request<Settings>('/admin/settings')
    },
    saveSettings(s: Partial<Settings>) {
        return request<Settings>('/admin/settings', { method: 'PUT', body: JSON.stringify(s) })
    },
    previewClear(r: ClearRequest) {
        return request<{ count: number }>('/admin/history/preview', { method: 'POST', body: JSON.stringify(r) })
    },
    clearHistory(r: ClearRequest) {
        return request<{ deleted: number }>('/admin/history/clear', { method: 'POST', body: JSON.stringify(r) })
    },
    mcpInfo() {
        return request<McpInfo>('/admin/mcp')
    },
    /** Calls the MCP endpoint as the signed-in user (tools/list) and summarizes the answer. */
    async mcpSelfTest(): Promise<{ ok: boolean; text: string }> {
        try {
            const r = await fetch(`${BASE}/mcp`, {
                method: 'POST',
                headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-UserToken': window.g_ck },
                body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
            })
            const data = await r.json().catch(() => null)
            if (data && data.error) return { ok: false, text: `Refused: ${data.error.message}` }
            if (!r.ok || !data || !data.result) return { ok: false, text: `The endpoint answered with HTTP ${r.status}.` }
            return { ok: true, text: `Working: the endpoint returned ${data.result.tools.length} tools.` }
        } catch (e: any) {
            return { ok: false, text: `Could not reach the endpoint: ${e.message}` }
        }
    },
    deleteRun(id: string) {
        return request<{ deleted: number; number: string }>(`/runs/${id}`, { method: 'DELETE' })
    },
    archiveRun(id: string, archived: boolean) {
        return request<{ archived: boolean }>(`/runs/${id}/archive`, { method: 'POST', body: JSON.stringify({ archived }) })
    },
    aiStatus() {
        return request<AiStatus>('/ai/status')
    },
    aiChat(body: { conversation_id?: string; message: string; context?: unknown }) {
        return request<AiChatResult>('/ai/chat', { method: 'POST', body: JSON.stringify(body) })
    },
    aiConversations() {
        return request<{ sys_id: string; title: string; updated: string; messages: number }[]>('/ai/conversations')
    },
    aiConversation(id: string) {
        return request<{ sys_id: string; title: string; messages: AiMessage[] }>(`/ai/conversations/${id}`)
    },
    fields(table: string, subjects: SubjectRef[]) {
        const p = new URLSearchParams({ table, subjects: subjects.map((s) => `${s.type}:${s.id}`).join(',') })
        return request<FieldDetail>(`/fields?${p}`)
    },
}
