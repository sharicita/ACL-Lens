import { Subject } from './types.ts'

/**
 * Non-human accounts usually reach data through APIs, where controls ACL Lens doesn't evaluate
 * also apply: OAuth scopes on the token, REST API access policies, and the API's own ACLs.
 * Returns the run warning for such a subject, or '' for everyone else.
 */
export function accountWarning(s: Subject): string {
    const a = s.account
    if (s.type !== 'user' || !a) return ''
    const kinds: string[] = []
    if (a.identity === 'machine') kinds.push('a machine identity')
    else if (a.identity === 'ai_agent') kinds.push('an AI agent identity')
    if (a.webServiceOnly) kinds.push('web service access only')
    if (a.integrationUser) kinds.push('an internal integration user')
    if (!kinds.length) return ''
    return (
        `${s.label} is ${kinds.join(', ')}: results show what record ACLs and security data filters allow. ` +
        'OAuth scopes, REST API access policies and API-level ACLs are not evaluated (the live check does not cover them either) and can narrow this further.'
    )
}
