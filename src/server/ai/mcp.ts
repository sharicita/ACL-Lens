import { gs } from '@servicenow/glide'
import { GUIDANCE, MCP_PROMPTS, SYSTEM_PROMPT } from './guidance.ts'
import { TOOLS, runTool } from './tools.ts'

/**
 * Minimal stateless MCP server (JSON-RPC 2.0 over Streamable HTTP, POST only) exposing the ACL Lens
 * read-only tools, guidance resources and prompts. Requests are authenticated by the platform,
 * so every tool runs as the calling user.
 */

const PROTOCOL_VERSION = '2025-06-18'

function ok(id: unknown, result: unknown) {
    return { jsonrpc: '2.0', id, result }
}

function fail(id: unknown, code: number, message: string) {
    return { jsonrpc: '2.0', id, error: { code, message } }
}

function handleOne(msg: any): unknown | null {
    if (!msg || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string') return fail(msg && msg.id !== undefined ? msg.id : null, -32600, 'Invalid request')
    const isNotification = msg.id === undefined || msg.id === null
    const p = msg.params || {}
    let result: unknown
    switch (msg.method) {
        case 'initialize':
            result = {
                protocolVersion: PROTOCOL_VERSION,
                capabilities: { tools: { listChanged: false }, prompts: { listChanged: false }, resources: { listChanged: false } },
                serverInfo: { name: 'acl-lens', title: 'ACL Lens Security Tools', version: '1.0.0' },
                instructions: SYSTEM_PROMPT,
            }
            break
        case 'ping':
            result = {}
            break
        case 'tools/list':
            result = {
                tools: TOOLS.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema, annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false } })),
            }
            break
        case 'tools/call': {
            if (!TOOLS.some((t) => t.name === p.name)) return fail(msg.id, -32602, `Unknown tool: ${p.name}`)
            const out: any = runTool(p.name, p.arguments || {})
            result = { content: [{ type: 'text', text: JSON.stringify(out, null, 2) }], isError: !!(out && out.error) }
            break
        }
        case 'resources/list':
            result = {
                resources: Object.keys(GUIDANCE).map((k) => ({ uri: `acl-lens://guidance/${k}`, name: k, title: GUIDANCE[k].title, mimeType: 'text/markdown' })),
            }
            break
        case 'resources/read': {
            const key = String(p.uri || '').replace('acl-lens://guidance/', '')
            if (!GUIDANCE[key]) return fail(msg.id, -32002, `Resource not found: ${p.uri}`)
            result = { contents: [{ uri: p.uri, mimeType: 'text/markdown', text: `# ${GUIDANCE[key].title}\n\n${GUIDANCE[key].text}` }] }
            break
        }
        case 'prompts/list':
            result = {
                prompts: Object.keys(MCP_PROMPTS).map((k) => ({ name: k, description: MCP_PROMPTS[k].description, arguments: MCP_PROMPTS[k].args })),
            }
            break
        case 'prompts/get': {
            const pr = MCP_PROMPTS[p.name]
            if (!pr) return fail(msg.id, -32602, `Unknown prompt: ${p.name}`)
            const missing = pr.args.filter((a) => a.required && !(p.arguments || {})[a.name]).map((a) => a.name)
            if (missing.length) return fail(msg.id, -32602, `Missing arguments: ${missing.join(', ')}`)
            result = { description: pr.description, messages: [{ role: 'user', content: { type: 'text', text: pr.build(p.arguments || {}) } }] }
            break
        }
        default:
            if (isNotification) return null
            return fail(msg.id, -32601, `Method not found: ${msg.method}`)
    }
    return isNotification ? null : ok(msg.id, result)
}

/** Writes the JSON-RPC response directly (bypassing the platform's { result } wrapper). */
export function handleMcp(request: any, response: any) {
    const write = (status: number, body: unknown) => {
        response.setStatus(status)
        response.setContentType('application/json')
        if (body !== null && body !== undefined) response.getStreamWriter().writeString(JSON.stringify(body))
    }
    if (!gs.hasRole('x_acllens.user')) return write(403, fail(null, -32001, 'The x_acllens.user role is required'))
    let msg: any
    try {
        msg = request.body.data
    } catch (e) {
        return write(400, fail(null, -32700, 'Parse error'))
    }
    if (Array.isArray(msg)) {
        const out = msg.map(handleOne).filter((r) => r !== null)
        return out.length ? write(200, out) : write(202, null)
    }
    const res = handleOne(msg)
    return res === null ? write(202, null) : write(200, res)
}
