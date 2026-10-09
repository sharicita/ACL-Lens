import { gr, bool, chunk } from './glide.ts'
import { rankedSearch } from './search.ts'
import { AccountInfo, RoleSource, Subject, SubjectRef } from './types.ts'

export interface SubjectOption {
    id: string
    label: string
    sub: string
}

/** Typeahead search for users or roles, ranked: starts-with first, then contains. */
export function searchSubjects(type: string, text: string, limit = 20): SubjectOption[] {
    if (type === 'role') {
        return rankedSearch(
            { table: 'sys_user_role', fields: ['name', 'description'], text, limit, secure: false, orderBy: 'name' },
            (r) => ({ id: r.getUniqueValue(), label: r.getValue('name'), sub: r.getValue('description') || '' })
        )
    }
    return rankedSearch(
        { table: 'sys_user', fields: ['user_name', 'name', 'first_name', 'last_name', 'email'], text, limit, secure: false, orderBy: 'name' },
        (u) => ({
            id: u.getUniqueValue(),
            label: u.getValue('name') || u.getValue('user_name'),
            sub: `${u.getValue('user_name') || ''}${bool(u.getValue('active')) ? '' : ' (inactive)'}`,
        })
    )
}

function addSource(sources: RoleSource[], seen: { [k: string]: boolean }, src: RoleSource) {
    const k = `${src.role}|${src.via}`
    if (seen[k]) return
    seen[k] = true
    sources.push(src)
}

/**
 * Breadth-first walk of sys_user_role_contains from the given roles. Returns, for every contained
 * role, the held role it comes from (the first one found, closest first).
 */
function inheritanceRoots(held: { id: string; name: string }[]): { [roleName: string]: string } {
    const rootOf: { [name: string]: string } = {}
    const visited: { [id: string]: boolean } = {}
    let frontier: { id: string; root: string }[] = []
    for (const h of held) {
        if (!h.id || visited[h.id]) continue
        visited[h.id] = true
        frontier.push({ id: h.id, root: h.name })
    }
    let guard = 0
    while (frontier.length && guard++ < 20) {
        const rootById: { [id: string]: string } = {}
        for (const f of frontier) rootById[f.id] = f.root
        const next: { id: string; root: string }[] = []
        for (const part of chunk(Object.keys(rootById), 200)) {
            const c = gr('sys_user_role_contains')
            c.addQuery('role', 'IN', part.join(','))
            c.query()
            while (c.next()) {
                const childId = c.getValue('contains')
                const childName = c.getDisplayValue('contains')
                const root = rootById[c.getValue('role')]
                if (!childId || !childName || !root) continue
                if (!rootOf[childName]) rootOf[childName] = root
                if (!visited[childId]) {
                    visited[childId] = true
                    next.push({ id: childId, root })
                }
            }
        }
        frontier = next
    }
    return rootOf
}

function resolveUser(id: string): Subject {
    const u = gr('sys_user')
    if (!u.get(id)) throw new Error(`User ${id} not found`)
    const roles: { [name: string]: boolean } = {}
    const sources: RoleSource[] = []
    const seen: { [k: string]: boolean } = {}

    // first pass: every active role row; remember which parent row an inherited role came from
    const rows: { role: string; roleId: string; group: string; inherited: boolean; parentRow: string }[] = []
    const rowRole: { [rowId: string]: string } = {}
    const hr = gr('sys_user_has_role')
    hr.addQuery('user', id)
    hr.addQuery('state', 'active')
    hr.query()
    while (hr.next()) {
        const role = hr.getDisplayValue('role')
        if (!role) continue
        roles[role] = true
        rowRole[hr.getUniqueValue()] = role
        rows.push({
            role,
            roleId: hr.getValue('role'),
            group: hr.getValue('granted_by') ? hr.getDisplayValue('granted_by') : '',
            inherited: bool(hr.getValue('inherited')),
            parentRow: hr.getValue('included_in_role') || '',
        })
    }
    // parent rows normally belong to the same user; look up any that were not in the first pass
    const missing = rows.map((r) => r.parentRow).filter((p) => p && !rowRole[p])
    for (const part of chunk(missing, 200)) {
        const p = gr('sys_user_has_role')
        p.addQuery('sys_id', 'IN', part.join(','))
        p.query()
        while (p.next()) rowRole[p.getUniqueValue()] = p.getDisplayValue('role')
    }
    // Most releases don't record the parent on inherited rows: work it out from role containment,
    // starting at the roles the user holds directly or through a group.
    const rootOf = inheritanceRoots(rows.filter((r) => !r.inherited).map((r) => ({ id: r.roleId, name: r.role })))
    for (const r of rows) {
        const parent = (r.parentRow ? rowRole[r.parentRow] || '' : '') || rootOf[r.role] || ''
        if (r.inherited) {
            addSource(sources, seen, { role: r.role, kind: 'inherited', from: parent, via: parent ? `inherited from ${parent}${r.group ? ` (group: ${r.group})` : ''}` : 'inherited (contained role)' })
        } else if (r.group) {
            addSource(sources, seen, { role: r.role, kind: 'group', from: r.group, via: `group: ${r.group}` })
        } else {
            addSource(sources, seen, { role: r.role, kind: 'direct', via: 'direct' })
        }
    }
    const names = Object.keys(roles).sort()
    const field = (f: string) => (u.isValidField(f) ? u.getValue(f) : '')
    const identity = field('identity_type') as AccountInfo['identity']
    const account: AccountInfo = {
        identity: identity || '',
        identityLabel: identity ? u.getDisplayValue('identity_type') || identity : '',
        webServiceOnly: bool(field('web_service_access_only')),
        integrationUser: bool(field('internal_integration_user')),
    }
    return {
        account,
        type: 'user',
        id,
        key: `user:${id}`,
        label: u.getValue('name') || u.getValue('user_name'),
        sub: u.getValue('user_name') || '',
        active: bool(u.getValue('active')),
        isAdmin: !!roles['admin'],
        roles: names,
        roleSources: sources.sort((a, b) => (a.role < b.role ? -1 : a.role > b.role ? 1 : 0)),
    }
}

function resolveRole(id: string): Subject {
    const r = gr('sys_user_role')
    if (!r.get(id)) throw new Error(`Role ${id} not found`)
    const rootName = r.getValue('name')
    const roles: { [name: string]: boolean } = { [rootName]: true }
    const sources: RoleSource[] = [{ role: rootName, via: 'selected role', kind: 'selected' }]
    const seen: { [k: string]: boolean } = {}
    const visited: { [sysId: string]: boolean } = { [id]: true }

    // Breadth-first walk of sys_user_role_contains so nested containment is captured.
    let frontier = [id]
    while (frontier.length) {
        const next: string[] = []
        const c = gr('sys_user_role_contains')
        c.addQuery('role', 'IN', frontier.join(','))
        c.query()
        while (c.next()) {
            const childId = c.getValue('contains')
            const childName = c.getDisplayValue('contains')
            if (!childId || !childName) continue
            roles[childName] = true
            const parentName = c.getDisplayValue('role')
            addSource(sources, seen, { role: childName, kind: 'contained', from: parentName, via: `contained in: ${parentName}` })
            if (!visited[childId]) {
                visited[childId] = true
                next.push(childId)
            }
        }
        frontier = next
    }
    const names = Object.keys(roles).sort()
    return {
        type: 'role',
        id,
        key: `role:${id}`,
        label: rootName,
        sub: r.getValue('description') || 'Role',
        active: true,
        isAdmin: !!roles['admin'],
        roles: names,
        roleSources: sources.sort((a, b) => (a.role < b.role ? -1 : a.role > b.role ? 1 : 0)),
    }
}

export function resolveSubject(ref: SubjectRef): Subject {
    if (!ref || !ref.id) throw new Error('Subject id is required')
    return ref.type === 'role' ? resolveRole(ref.id) : resolveUser(ref.id)
}

/** Names of roles flagged "Elevated privilege" - these only apply once elevated in-session. */
export function loadElevatedRoles(): { [name: string]: boolean } {
    const out: { [name: string]: boolean } = {}
    const r = gr('sys_user_role')
    r.addQuery('elevated_privilege', true)
    r.query()
    while (r.next()) out[r.getValue('name')] = true
    return out
}
