import { GlideRecordSecure } from '@servicenow/glide'
import { gr } from './glide.ts'

/**
 * Explains one ACL on demand (used to show *why* a result is Conditional).
 * Conditions, applies-to filters and security attributes are part of ACL Lens's own analysis, so
 * they are shown to app users. The script body is shown only when the signed-in user can read ACL
 * definitions themselves.
 */
export function aclDetail(id: string) {
    const a = gr('sys_security_acl')
    if (!id || !a.get(id)) throw new Error('ACL not found')
    const roles: string[] = []
    const r = gr('sys_security_acl_role')
    r.addQuery('sys_security_acl', id)
    r.query()
    while (r.next()) roles.push(r.getDisplayValue('sys_user_role'))
    const advanced = a.getValue('advanced') === '1' || a.getValue('advanced') === 'true'
    const script = advanced ? a.getValue('script') || '' : ''
    const canReadScripts = (new GlideRecordSecure('sys_security_acl') as any).canRead()
    const attr = a.getValue('security_attribute') && a.getValue('local_or_existing') === 'Existing'
    return {
        sys_id: id,
        name: a.getValue('name'),
        operation: a.getDisplayValue('operation'),
        decision: a.getValue('decision_type') || 'allow',
        description: a.getValue('description') || '',
        roles,
        condition: a.getValue('condition') ? a.getDisplayValue('condition') || a.getValue('condition') : '',
        condition_query: a.getValue('condition') || '',
        applies_to: a.getValue('applies_to') ? a.getDisplayValue('applies_to') || a.getValue('applies_to') : '',
        security_attribute: attr ? a.getDisplayValue('security_attribute') : '',
        has_script: !!script.trim(),
        script: canReadScripts ? script.substring(0, 4000) : '',
        script_hidden: !!script.trim() && !canReadScripts,
        admin_overrides: a.getValue('admin_overrides') === '1' || a.getValue('admin_overrides') === 'true',
    }
}
