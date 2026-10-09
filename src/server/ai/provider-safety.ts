// Pure helpers that keep AI provider calls safe. No Glide imports, so they are unit-tested offline.

export type ProviderType = 'now_assist' | 'anthropic' | 'openai_compatible' | 'azure_openai'

const PROVIDER_TYPES: ProviderType[] = ['now_assist', 'anthropic', 'openai_compatible', 'azure_openai']
const ANTHROPIC_DEFAULT_ENDPOINT = 'https://api.anthropic.com/v1/messages'

/**
 * Maps the stored type to a known provider type. Accepts the value or its label (older records
 * could be typed in by hand) and returns '' for anything unrecognised - never guess, because a
 * wrong guess sends the API key to the wrong service.
 */
export function normalizeType(raw: string): ProviderType | '' {
    const v = (raw || '').trim().toLowerCase()
    if ((PROVIDER_TYPES as string[]).indexOf(v) >= 0) return v as ProviderType
    if (v.indexOf('now assist') >= 0) return 'now_assist'
    if (v.indexOf('anthropic') >= 0 || v.indexOf('claude') >= 0) return 'anthropic'
    if (v.indexOf('azure') >= 0) return 'azure_openai'
    if (v.indexOf('openai') >= 0) return 'openai_compatible'
    return ''
}

/** Accepts the full Messages URL, the API base (https://api.anthropic.com) or the base + /v1. */
export function anthropicUrl(endpoint: string): string {
    const e = (endpoint || '').trim().replace(/\/+$/, '')
    if (!e) return ANTHROPIC_DEFAULT_ENDPOINT
    if (/\/v1\/messages$/.test(e)) return e
    if (/\/v1$/.test(e)) return `${e}/messages`
    return `${e}/v1/messages`
}

function hostOf(url: string): { protocol: string; host: string } | null {
    const m = /^([a-z][a-z0-9+.-]*):\/\/([^/?#:]+)(:\d+)?/i.exec((url || '').trim())
    return m ? { protocol: m[1].toLowerCase(), host: m[2].toLowerCase() } : null
}

function hostIs(host: string, domain: string): boolean {
    return host === domain || host.endsWith(`.${domain}`)
}

/** Hosts each provider type is expected to use. openai_compatible is generic, so any host. */
const EXPECTED_HOSTS: { [t: string]: string[] } = {
    anthropic: ['anthropic.com'],
    azure_openai: ['azure.com', 'azure-api.net'],
}

/**
 * Checks the URL a provider is about to call. Returns a problem description, or '' when it is
 * safe to send the API key there.
 * - HTTPS only.
 * - For provider types with a known service, the host must belong to that service unless the
 *   admin explicitly allowed a custom endpoint (e.g. an approved internal AI gateway).
 * - Never send a key for one vendor to another vendor's well-known API host.
 */
export function checkEndpoint(type: ProviderType, url: string, allowCustom: boolean): string {
    if (type === 'now_assist') return ''
    const h = hostOf(url)
    if (!h) return `Endpoint "${url}" is not a valid URL`
    if (h.protocol !== 'https') return 'Endpoint must use https://'
    const foreign: { [t: string]: string[] } = {
        anthropic: ['openai.com', 'azure.com', 'googleapis.com'],
        azure_openai: ['openai.com', 'anthropic.com'],
    }
    const wrong = (foreign[type] || []).filter((d) => hostIs(h.host, d))[0]
    if (wrong) return `Endpoint host ${h.host} belongs to a different AI service than the selected Type - check Type and Endpoint URL`
    const expected = EXPECTED_HOSTS[type]
    if (expected && !allowCustom && !expected.some((d) => hostIs(h.host, d))) {
        return `Endpoint host ${h.host} is not a ${expected.join(' / ')} address. If this is an approved gateway, tick "Allow custom endpoint"`
    }
    return ''
}

/**
 * Removes API keys and key fragments from text that may be shown to users (provider errors can
 * echo a masked key such as "sk-ant-u****…6QAA").
 */
export function redactSecrets(text: string, secret?: string): string {
    const esc = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    let out = String(text || '')
    if (secret && secret.length >= 8) {
        out = out.split(secret).join('[redacted key]')
        // a partial echo starting with the key's first 8 characters, and the key's last 4 as a token
        out = out.replace(new RegExp(`${esc(secret.substring(0, 8))}[A-Za-z0-9_\\-*.…]*`, 'g'), '[redacted key]')
        out = out.replace(new RegExp(`\\b${esc(secret.substring(secret.length - 4))}\\b`, 'g'), '[redacted]')
    }
    return out
        .replace(/\b(sk|pk|rk|ak)-[A-Za-z0-9_*.\-…]{4,}/gi, '[redacted key]')
        .replace(/[A-Za-z0-9_\-]{0,16}\*{4,}[A-Za-z0-9_\-]{0,16}/g, '[redacted]')
        .replace(/\b(Bearer|x-api-key|api-key)\s*[:=]?\s*[A-Za-z0-9_\-.]{12,}/gi, '$1 [redacted]')
}
