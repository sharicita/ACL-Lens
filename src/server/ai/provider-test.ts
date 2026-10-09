import { gs } from '@servicenow/glide'
import { complete, providerFromRecord } from './providers.ts'

/** "Test connection" UI action on an AI provider record: saves the form, then sends one short prompt. */
export function testProviderAction(current: any) {
    // the button submits the form: save it so the test uses what is on screen
    current.update()
    const p = providerFromRecord(current)
    if (!p.available) {
        gs.addErrorMessage(`Not ready: ${p.reason}`)
    } else {
        const started = new Date().getTime()
        try {
            const reply = complete(p, 'You are a connectivity check. Reply with the single word OK.', [{ role: 'user', content: 'Connection test' }])
            const ms = new Date().getTime() - started
            gs.addInfoMessage(`Connected to ${p.name} in ${ms} ms. Reply: "${(reply || '').trim().substring(0, 200)}"`)
        } catch (e: any) {
            gs.addErrorMessage(`Connection failed: ${e && e.message ? e.message : e}`)
        }
    }
}
