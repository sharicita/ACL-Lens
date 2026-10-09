import { gs } from '@servicenow/glide'
import { gr } from '../engine/glide.ts'
import { ChatMessage, complete, pickProvider } from './providers.ts'
import { RESPONSE_PROTOCOL, SYSTEM_PROMPT } from './guidance.ts'
import { TOOLS, runTool } from './tools.ts'

const CONV_TABLE = 'x_acllens_ai_conversation'
const MSG_TABLE = 'x_acllens_ai_message'
const MAX_STEPS = 6
const MAX_TOOL_OUTPUT = 8000
const HISTORY_TURNS = 12

export interface ChatContext {
    run_id?: string
    run_number?: string
    subjects?: string[]
    table?: string
    view?: string
}

function toolCatalog(): string {
    return TOOLS.map((t) => `- ${t.name}: ${t.description}\n  arguments (JSON schema): ${JSON.stringify(t.inputSchema.properties)}${t.inputSchema.required ? ` required: ${t.inputSchema.required.join(', ')}` : ''}`).join('\n')
}

/** Stable system prompt (identical on every request so providers can cache it). */
function systemPrompt(): string {
    return `${SYSTEM_PROMPT}\n\nTools (all read-only, run as the signed-in user):\n${toolCatalog()}\n\n${RESPONSE_PROTOCOL}`
}

/** Pulls the first JSON object out of a model reply; falls back to treating it as an answer. */
export function parseAction(text: string): { action: 'tool' | 'answer'; tool?: string; arguments?: any; content?: string } {
    const t = (text || '').trim()
    const start = t.indexOf('{')
    if (start >= 0) {
        // walk braces to find the matching end, ignoring braces inside strings
        let depth = 0
        let inStr = false
        let esc = false
        for (let i = start; i < t.length; i++) {
            const ch = t[i]
            if (inStr) {
                if (esc) esc = false
                else if (ch === '\\') esc = true
                else if (ch === '"') inStr = false
                continue
            }
            if (ch === '"') inStr = true
            else if (ch === '{') depth++
            else if (ch === '}' && --depth === 0) {
                try {
                    const obj = JSON.parse(t.substring(start, i + 1))
                    if (obj && obj.action === 'tool' && obj.tool) return { action: 'tool', tool: obj.tool, arguments: obj.arguments || {} }
                    if (obj && obj.action === 'answer') return { action: 'answer', content: String(obj.content || '') }
                } catch (e) {
                    /* fall through */
                }
                break
            }
        }
    }
    return { action: 'answer', content: t }
}

function ownConversation(id: string): any | null {
    const c = gr(CONV_TABLE)
    if (!id || !c.get(id) || c.getValue('user') !== gs.getUserID()) return null
    return c
}

function history(convId: string): ChatMessage[] {
    const m = gr(MSG_TABLE)
    m.addQuery('conversation', convId)
    m.orderByDesc('seq')
    m.setLimit(HISTORY_TURNS)
    m.query()
    const out: ChatMessage[] = []
    while (m.next()) out.unshift({ role: m.getValue('role') === 'assistant' ? 'assistant' : 'user', content: m.getValue('content') || '' })
    return out
}

function addMessage(convId: string, role: 'user' | 'assistant', content: string, toolsUsed: string[], providerName: string): number {
    const c = gr(CONV_TABLE)
    c.get(convId)
    const seq = parseInt(c.getValue('message_count') || '0', 10) + 1
    const m = gr(MSG_TABLE)
    m.initialize()
    m.setValue('conversation', convId)
    m.setValue('seq', seq)
    m.setValue('role', role)
    m.setValue('content', content.substring(0, 65000))
    m.setValue('tools_used', toolsUsed.join(', ').substring(0, 4000))
    m.setValue('provider_name', providerName)
    m.insert()
    c.setValue('message_count', seq)
    c.update()
    return seq
}

function contextNote(ctx: ChatContext | undefined): string {
    if (!ctx) return ''
    const parts: string[] = []
    if (ctx.run_number) parts.push(`viewing ACL Lens run ${ctx.run_number}${ctx.run_id ? ` (sys_id ${ctx.run_id})` : ''}`)
    if (ctx.subjects && ctx.subjects.length) parts.push(`subjects: ${ctx.subjects.join(', ')}`)
    if (ctx.table) parts.push(`selected table: ${ctx.table}`)
    return parts.length ? `[Context from the ACL Lens screen - ${parts.join('; ')}]\n` : ''
}

export interface ChatResult {
    conversation_id: string
    title: string
    answer: string
    tools_used: string[]
    provider: string
}

/**
 * Runs one user turn: stores the question, loops model -> read-only tool -> model until the
 * model answers (max MAX_STEPS tool calls), stores and returns the answer.
 */
export function chat(conversationId: string | undefined, message: string, ctx?: ChatContext): ChatResult {
    const text = (message || '').trim()
    if (!text) throw new Error('Message is empty')
    const provider = pickProvider()
    if (!provider) throw new Error('No AI provider is available. An ACL Lens admin can configure one under ACL Lens > AI Providers.')

    let conv = conversationId ? ownConversation(conversationId) : null
    if (conversationId && !conv) throw new Error('Conversation not found')
    if (!conv) {
        const c = gr(CONV_TABLE)
        c.initialize()
        c.setValue('title', text.substring(0, 120))
        c.setValue('user', gs.getUserID())
        c.setValue('provider', provider.sys_id)
        if (ctx && ctx.run_id) c.setValue('run', ctx.run_id)
        c.setValue('message_count', 0)
        const id = c.insert()
        conv = gr(CONV_TABLE)
        conv.get(id)
    }
    const convId = conv.getUniqueValue()
    const prior = history(convId)
    addMessage(convId, 'user', text, [], provider.name)

    const system = systemPrompt()
    const messages: ChatMessage[] = prior.concat([{ role: 'user', content: contextNote(ctx) + text }])
    const toolsUsed: string[] = []
    let answer = ''
    for (let step = 0; step <= MAX_STEPS; step++) {
        const reply = complete(provider, system, messages)
        const action = parseAction(reply)
        if (action.action === 'answer' || step === MAX_STEPS) {
            answer = action.action === 'answer' ? action.content || '' : 'I could not finish gathering the information needed. Please narrow the question (user, table, operation) and try again.'
            break
        }
        const result = runTool(action.tool as string, action.arguments)
        toolsUsed.push(action.tool as string)
        let out = JSON.stringify(result)
        if (out.length > MAX_TOOL_OUTPUT) out = `${out.substring(0, MAX_TOOL_OUTPUT)}... [truncated]`
        messages.push({ role: 'assistant', content: JSON.stringify({ action: 'tool', tool: action.tool, arguments: action.arguments }) })
        messages.push({ role: 'user', content: `Tool result for ${action.tool}:\n${out}\n\nContinue: call another tool or answer, using the JSON protocol.` })
    }
    if (!answer) answer = 'The AI provider returned an empty response.'
    addMessage(convId, 'assistant', answer, toolsUsed, provider.name)
    return { conversation_id: convId, title: conv.getValue('title'), answer, tools_used: toolsUsed, provider: provider.name }
}

export function listConversations(limit = 30) {
    const c = gr(CONV_TABLE)
    c.addQuery('user', gs.getUserID())
    c.orderByDesc('sys_updated_on')
    c.setLimit(limit)
    c.query()
    const out = []
    while (c.next()) out.push({ sys_id: c.getUniqueValue(), title: c.getValue('title'), updated: c.getDisplayValue('sys_updated_on'), messages: parseInt(c.getValue('message_count') || '0', 10) })
    return out
}

export function getConversation(id: string) {
    const c = ownConversation(id)
    if (!c) throw new Error('Conversation not found')
    const m = gr(MSG_TABLE)
    m.addQuery('conversation', id)
    m.orderBy('seq')
    m.query()
    const messages = []
    while (m.next()) messages.push({ role: m.getValue('role'), content: m.getValue('content'), tools_used: m.getValue('tools_used') ? m.getValue('tools_used').split(', ') : [], created: m.getDisplayValue('sys_created_on') })
    return { sys_id: id, title: c.getValue('title'), messages }
}
