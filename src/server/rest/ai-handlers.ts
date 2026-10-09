import { gs } from '@servicenow/glide'
import { chat, getConversation, listConversations } from '../ai/agent.ts'
import { handleMcp } from '../ai/mcp.ts'
import { providerStatus } from '../ai/providers.ts'

const USER_ROLE = 'x_acllens.user'

function handle(request: any, response: any, fn: (request: any) => unknown) {
    if (!gs.hasRole(USER_ROLE)) {
        response.setStatus(403)
        response.setBody({ error: { message: `The ${USER_ROLE} role is required to use ACL Lens` } })
        return
    }
    try {
        const result = fn(request)
        response.setStatus(200)
        // the platform wraps the body in { result: ... }
        response.setBody(result as any)
    } catch (e: any) {
        const message = e && e.message ? e.message : String(e)
        response.setStatus(message.indexOf('not found') >= 0 ? 404 : 400)
        response.setBody({ error: { message } })
    }
}

export function getAiStatus(request: any, response: any) {
    handle(request, response, () => providerStatus())
}

export function postAiChat(request: any, response: any) {
    handle(request, response, (req) => {
        const b = req.body && req.body.data ? req.body.data : {}
        return chat(b.conversation_id || undefined, b.message, b.context)
    })
}

export function getAiConversations(request: any, response: any) {
    handle(request, response, () => listConversations())
}

export function getAiConversation(request: any, response: any) {
    handle(request, response, (req) => getConversation(req.pathParams.id))
}

export function postMcp(request: any, response: any) {
    handleMcp(request, response)
}
