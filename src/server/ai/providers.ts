import { gs } from '@servicenow/glide'
import { RESTMessageV2 } from '@servicenow/glide/sn_ws'
import { OneExtendUtil } from '@servicenow/glide/sn_one_extend'
import { gr } from '../engine/glide.ts'
import { anthropicUrl, checkEndpoint, normalizeType, ProviderType, redactSecrets } from './provider-safety.ts'

export interface ChatMessage {
    role: 'user' | 'assistant'
    content: string
}

export interface Provider {
    sys_id: string
    name: string
    type: ProviderType
    endpoint: string
    allowCustomEndpoint: boolean
    model: string
    capabilityId: string
    skillInput: string
    maxTokens: number
    timeoutSeconds: number
    isDefault: boolean
    available: boolean
    reason: string
}

const PROVIDER_TABLE = 'x_acllens_ai_provider'
const NOW_ASSIST_GENERIC_NAMES = ['Generic Prompt', 'Now LLM Generic', 'Generic prompt', 'Now Assist Generic']
const ANTHROPIC_DEFAULT_MODEL = 'claude-opus-5-5'
// models that accept the server-side refusal fallback ("default" routing)
const ANTHROPIC_FALLBACK_MODELS = ['claude-fable-5-1', 'claude-opus-5-5', 'claude-opus-5', 'claude-sonnet-5-5']

/** Returns [capability sys_id, problem]. */
function findNowAssistCapability(configured: string): [string, string] {
    try {
        if (!gs.tableExists('sys_one_extend_capability')) return ['', 'Now Assist (Generative AI Controller) is not installed on this instance']
        const c = gr('sys_one_extend_capability')
        if (configured) {
            if (!c.get(configured)) return ['', 'The selected Now Assist skill/capability no longer exists']
            if (!(c.getValue('active') === '1' || c.getValue('active') === 'true')) return ['', `The selected capability "${c.getValue('name')}" is inactive - activate or publish the skill`]
            return [configured, '']
        }
        c.addQuery('active', true)
        c.addQuery('name', 'IN', NOW_ASSIST_GENERIC_NAMES.join(','))
        c.setLimit(1)
        c.query()
        if (c.next()) return [c.getUniqueValue(), '']
        return ['', 'No Now Assist skill selected and no generic prompt capability is active. Create a Now Assist Skill Kit skill with a "prompt" input and select it in "Now Assist skill / capability".']
    } catch (e) {
        return ['', 'Now Assist capabilities could not be read']
    }
}

export function providerFromRecord(p: any): Provider {
    return toProvider(p)
}

function toProvider(p: any): Provider {
    const normalized = normalizeType(p.getValue('type'))
    const type = (normalized || p.getValue('type')) as Provider['type']
    const out: Provider = {
        sys_id: p.getUniqueValue(),
        name: p.getValue('name'),
        type,
        endpoint: p.getValue('endpoint') || '',
        model: p.getValue('model') || '',
        capabilityId: p.getValue('capability') || p.getValue('capability_id') || '',
        skillInput: p.getValue('skill_input') || 'prompt',
        maxTokens: parseInt(p.getValue('max_tokens') || '16000', 10) || 16000,
        timeoutSeconds: parseInt(p.getValue('timeout_seconds') || '120', 10) || 120,
        isDefault: p.getValue('is_default') === '1' || p.getValue('is_default') === 'true',
        allowCustomEndpoint: p.getValue('allow_custom_endpoint') === '1' || p.getValue('allow_custom_endpoint') === 'true',
        available: true,
        reason: '',
    }
    if (!normalized) {
        out.available = false
        out.reason = `Unknown provider type "${p.getValue('type')}" - choose one from the Type list`
    } else if (type === 'now_assist') {
        const [cap, problem] = findNowAssistCapability(out.capabilityId)
        out.capabilityId = cap
        if (!cap) {
            out.available = false
            out.reason = problem
        }
    } else {
        if (!p.getValue('api_key')) {
            out.available = false
            out.reason = 'No API key configured'
        }
        if (type !== 'anthropic' && !out.endpoint) {
            out.available = false
            out.reason = 'No endpoint configured'
        } else {
            const problem = checkEndpoint(type, requestUrl(out), out.allowCustomEndpoint)
            if (problem) {
                out.available = false
                out.reason = problem
            }
        }
    }
    return out
}

/** Active providers in priority order: Now Assist (when available) -> default -> order. */
export function listProviders(): Provider[] {
    const p = gr(PROVIDER_TABLE)
    p.addQuery('active', true)
    p.orderBy('order')
    p.query()
    const all: Provider[] = []
    while (p.next()) all.push(toProvider(p))
    const score = (x: Provider) => (x.type === 'now_assist' && x.available ? 0 : x.isDefault && x.available ? 1 : x.available ? 2 : 3)
    return all.sort((a, b) => score(a) - score(b))
}

export function pickProvider(): Provider | null {
    const list = listProviders().filter((x) => x.available)
    return list.length ? list[0] : null
}

function apiKey(sysId: string): string {
    const p = gr(PROVIDER_TABLE)
    if (!p.get(sysId)) return ''
    return p.getElement('api_key').getDecryptedValue() || ''
}

/** The exact URL a provider's request is sent to. */
function requestUrl(p: Provider): string {
    if (p.type === 'anthropic') return anthropicUrl(p.endpoint)
    if (p.type === 'azure_openai') return p.endpoint
    return `${(p.endpoint || '').replace(/\/+$/, '')}/chat/completions`
}

/**
 * Sends the request. The endpoint is re-checked here, right before the key leaves the instance,
 * and provider error text is scrubbed of key fragments before it is shown to anyone.
 */
function http(p: Provider, key: string, headers: { [k: string]: string }, body: unknown): any {
    const endpoint = requestUrl(p)
    const problem = checkEndpoint(p.type, endpoint, p.allowCustomEndpoint)
    if (problem) throw new Error(`Request blocked: ${problem}`)
    const timeoutSeconds = p.timeoutSeconds
    const rm = new RESTMessageV2()
    rm.setEndpoint(endpoint)
    rm.setHttpMethod('post')
    rm.setHttpTimeout(timeoutSeconds * 1000)
    rm.setRequestHeader('Content-Type', 'application/json')
    rm.setRequestHeader('Accept', 'application/json')
    for (const h in headers) rm.setRequestHeader(h, headers[h])
    rm.setRequestBody(JSON.stringify(body))
    const res = rm.execute()
    const status = res.getStatusCode()
    const text = res.getBody() || ''
    let data: any = null
    try {
        data = text ? JSON.parse(text) : null
    } catch (e) {
        data = null
    }
    if (status < 200 || status >= 300) {
        const msg = (data && (data.error?.message || data.message)) || res.getErrorMessage() || text.substring(0, 300)
        throw new Error(`AI provider returned HTTP ${status}: ${redactSecrets(String(msg), key)}`)
    }
    return data
}

function callAnthropic(p: Provider, system: string, messages: ChatMessage[]): string {
    const model = p.model || ANTHROPIC_DEFAULT_MODEL
    const body: any = {
        model,
        max_tokens: p.maxTokens,
        system,
        messages,
        output_config: { effort: 'medium' },
        // the system prompt is identical on every call; cache it
        cache_control: { type: 'ephemeral' },
    }
    const key = apiKey(p.sys_id)
    const headers: { [k: string]: string } = { 'x-api-key': key, 'anthropic-version': '2023-06-01' }
    if (ANTHROPIC_FALLBACK_MODELS.indexOf(model) >= 0) {
        // on a safety-classifier decline, the API re-runs the request on a suitable model
        body.fallbacks = 'default'
        headers['anthropic-beta'] = 'server-side-fallback-2026-07-01'
    }
    const data = http(p, key, headers, body)
    if (data.stop_reason === 'refusal') {
        const why = data.stop_details && data.stop_details.explanation ? `: ${data.stop_details.explanation}` : ''
        return JSON.stringify({ action: 'answer', content: `The AI provider declined this request${why}. Try rephrasing it.` })
    }
    const text = (data.content || [])
        .filter((b: any) => b.type === 'text')
        .map((b: any) => b.text)
        .join('')
    if (data.stop_reason === 'max_tokens' && !text) throw new Error('The AI provider hit its output limit; raise "Max output tokens" on the provider.')
    return text
}

function callOpenAiStyle(p: Provider, system: string, messages: ChatMessage[]): string {
    const key = apiKey(p.sys_id)
    const headers: { [k: string]: string } = p.type === 'azure_openai' ? { 'api-key': key } : { Authorization: `Bearer ${key}` }
    const body: any = { messages: [{ role: 'system', content: system }].concat(messages as any[]), max_tokens: p.maxTokens }
    if (p.model) body.model = p.model
    const data = http(p, key, headers, body)
    const choice = data && data.choices && data.choices[0]
    return (choice && choice.message && choice.message.content) || ''
}

function findResponseText(obj: any, depth = 0): string {
    if (!obj || depth > 6) return ''
    if (typeof obj === 'string') return ''
    for (const k of ['response', 'model_output', 'output', 'text']) {
        if (typeof obj[k] === 'string' && obj[k]) return obj[k]
    }
    for (const k in obj) {
        const v = findResponseText(obj[k], depth + 1)
        if (v) return v
    }
    return ''
}

function callNowAssist(p: Provider, system: string, messages: ChatMessage[]): string {
    const transcript = messages.map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n\n')
    const prompt = `${system}\n\n${transcript}\n\nAssistant:`
    const request = {
        executionRequests: [{ payload: { [p.skillInput]: prompt }, capabilityId: p.capabilityId, meta: { feature: 'ACL Lens Security Assistant' } }],
        mode: 'sync',
    }
    const res = OneExtendUtil.execute(request)
    const raw = res && (res as any).capabilities ? (res as any).capabilities[p.capabilityId] : res
    if (raw && raw.status && String(raw.status).toLowerCase() === 'error') throw new Error(`Now Assist error: ${redactSecrets(String(raw.message || raw.error || 'unknown'))}`)
    const text = findResponseText(raw)
    if (!text) throw new Error('Now Assist returned an empty response')
    return text
}

/** Sends one completion request to the provider and returns the model's text. */
export function complete(p: Provider, system: string, messages: ChatMessage[]): string {
    switch (p.type) {
        case 'now_assist':
            return callNowAssist(p, system, messages)
        case 'anthropic':
            return callAnthropic(p, system, messages)
        case 'openai_compatible':
        case 'azure_openai':
            return callOpenAiStyle(p, system, messages)
        default:
            throw new Error(`Unknown provider type "${p.type}"`)
    }
}

export function providerStatus() {
    const list = listProviders()
    const chosen = list.filter((x) => x.available)[0] || null
    return {
        active: chosen ? { sys_id: chosen.sys_id, name: chosen.name, type: chosen.type, model: chosen.model || (chosen.type === 'anthropic' ? ANTHROPIC_DEFAULT_MODEL : '') } : null,
        providers: list.map((x) => ({ name: x.name, type: x.type, available: x.available, reason: x.reason })),
        is_admin: gs.hasRole('x_acllens.admin'),
    }
}
