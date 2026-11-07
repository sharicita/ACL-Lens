import { ApiContext, Subject } from './types.ts'

/**
 * Non-human accounts usually reach data through APIs, where controls beyond record ACLs also
 * apply: OAuth scopes on the token, REST API access policies, and the API's own ACLs.
 * Returns the run warning for such a subject, or '' for everyone else. With an API context the
 * run evaluated those controls, so the warning says what was and wasn't covered.
 */
export function isNonHuman(s: Subject): boolean {
    const a = s.account
    return s.type === 'user' && !!a && (a.identity === 'machine' || a.identity === 'ai_agent' || a.webServiceOnly || a.integrationUser)
}

export function accountWarning(s: Subject, api?: ApiContext): string {
    const a = s.account
    if (s.type !== 'user' || !a) return ''
    const kinds: string[] = []
    if (a.identity === 'machine') kinds.push('a machine identity')
    else if (a.identity === 'ai_agent') kinds.push('an AI agent identity')
    if (a.webServiceOnly) kinds.push('web service access only')
    if (a.integrationUser) kinds.push('an internal integration user')
    if (!kinds.length) return ''
    if (api) {
        return (
            `${s.label} is ${kinds.join(', ')}: results combine record ACLs and security data filters with the API access checks for ${api.api} ` +
            '(OAuth auth scope, REST API access policy, Machine Identity Access Control, API ACLs and web-service access). Adaptive authentication conditions, tokens from an external identity provider and Machine Identity Access Control records that can\'t be read show as Conditional.'
        )
    }
    return (
        `${s.label} is ${kinds.join(', ')}: results show what record ACLs and security data filters allow. ` +
        'OAuth scopes, REST API access policies, Machine Identity Access Control and API-level ACLs are not evaluated (the live check does not cover them either) and can narrow this further.'
    )
}
