import { gs, GlideRecordSecure } from '@servicenow/glide'
import { fieldDetail } from '../engine/analyze.ts'
import { getRun, loadBlob } from '../engine/storage.ts'
import { Comparison } from '../engine/compare.ts'
import { SubjectRef } from '../engine/types.ts'
import { guidanceText, GUIDANCE } from './guidance.ts'
import { explainCell, HIDDEN_NOTE } from './evaluation-view.ts'
import { queryText } from '../engine/search.ts'

/**
 * Read-only tools for the Security Assistant and the MCP server.
 * Every instance lookup uses GlideRecordSecure, so results are limited to what the signed-in
 * user can read. Nothing here inserts, updates or deletes records.
 */

export interface ToolDef {
    name: string
    description: string
    inputSchema: { type: 'object'; properties: { [k: string]: any }; required?: string[]; additionalProperties?: boolean }
    run: (args: any) => unknown
}

const NO_ACCESS = { error: 'no_access', message: 'The signed-in user does not have access to this information.' }

function secure(table: string): any {
    return new GlideRecordSecure(table) as any
}

function baseUrl(): string {
    const u = gs.getProperty('glide.servlet.uri', '/') || '/'
    return u.endsWith('/') ? u : `${u}/`
}

function link(table: string, sysId: string): string {
    return `${baseUrl()}${table}.do?sys_id=${sysId}`
}

function listLink(table: string, query: string): string {
    return `${baseUrl()}${table}_list.do?sysparm_query=${encodeURIComponent(query)}`
}

function clampInt(v: unknown, def: number, max: number): number {
    const n = parseInt(String(v === undefined ? def : v), 10)
    return Math.max(1, Math.min(isNaN(n) ? def : n, max))
}

function tableReadable(table: string): boolean {
    if (!table || !gs.tableExists(table)) return false
    return secure(table).canRead()
}

/** Resolve a user, role or group by sys_id, user_name/name or display name - only if the user can read it. */
function resolveSubjectRef(type: string, value: string): { ref: SubjectRef; label: string } | null {
    const v = queryText(value)
    if (!v) return null
    if (type === 'group') {
        const g = secure('sys_user_group')
        g.addEncodedQuery(`sys_id=${v}^ORname=${v}`)
        g.setLimit(1)
        g.query()
        return g.next() ? { ref: { type: 'group', id: g.getUniqueValue() }, label: g.getValue('name') } : null
    }
    if (type === 'role') {
        const r = secure('sys_user_role')
        r.addEncodedQuery(`sys_id=${v}^ORname=${v}`)
        r.setLimit(1)
        r.query()
        return r.next() ? { ref: { type: 'role', id: r.getUniqueValue() }, label: r.getValue('name') } : null
    }
    const u = secure('sys_user')
    u.addEncodedQuery(`sys_id=${v}^ORuser_name=${v}^ORname=${v}^ORemail=${v}`)
    u.setLimit(1)
    u.query()
    return u.next() ? { ref: { type: 'user', id: u.getUniqueValue() }, label: u.getValue('name') || u.getValue('user_name') } : null
}

export const TOOLS: ToolDef[] = [
    {
        name: 'best_practices',
        description: 'ServiceNow ACL/security best-practice guidance. Topics: evaluation, troubleshooting, design, testing, scripted, scoped_apps. Omit topic for all.',
        inputSchema: { type: 'object', properties: { topic: { type: 'string', enum: Object.keys(GUIDANCE) } }, additionalProperties: false },
        run: (a) => ({ guidance: guidanceText(a.topic) }),
    },
    {
        name: 'check_my_access',
        description: "Live platform check of the signed-in user's own create/read/write/delete access on a table (optionally a specific record). Uses the platform's real ACL evaluation.",
        inputSchema: {
            type: 'object',
            properties: { table: { type: 'string' }, sys_id: { type: 'string', description: 'Optional record sys_id' } },
            required: ['table'],
            additionalProperties: false,
        },
        run: (a) => {
            if (!a.table || !gs.tableExists(a.table)) return { error: 'unknown_table', message: `Table ${a.table} does not exist` }
            const g = secure(a.table)
            const out: any = { table: a.table, user: gs.getUserName(), read: g.canRead(), create: g.canCreate(), write: g.canWrite(), delete: g.canDelete() }
            if (a.sys_id) {
                const r = secure(a.table)
                if (r.get(a.sys_id)) {
                    out.record = { sys_id: a.sys_id, read: r.canRead(), write: r.canWrite(), delete: r.canDelete(), link: link(a.table, a.sys_id) }
                } else out.record = { sys_id: a.sys_id, read: false, note: 'Record not found or not readable' }
            }
            return out
        },
    },
    {
        name: 'find_subject',
        description: 'Find users or roles by name (only ones the signed-in user can see). Returns sys_ids to use with other tools.',
        inputSchema: {
            type: 'object',
            properties: { type: { type: 'string', enum: ['user', 'role'] }, query: { type: 'string' } },
            required: ['type', 'query'],
            additionalProperties: false,
        },
        run: (a) => {
            const table = a.type === 'role' ? 'sys_user_role' : 'sys_user'
            if (!tableReadable(table)) return NO_ACCESS
            const g = secure(table)
            const q = queryText(a.query)
            g.addEncodedQuery(a.type === 'role' ? `nameLIKE${q}` : `nameLIKE${q}^ORuser_nameLIKE${q}^ORemailLIKE${q}`)
            g.setLimit(10)
            g.query()
            const out = []
            while (g.next()) out.push({ sys_id: g.getUniqueValue(), name: g.getValue(a.type === 'role' ? 'name' : 'name'), user_name: a.type === 'user' ? g.getValue('user_name') : undefined, link: link(table, g.getUniqueValue()) })
            return { results: out }
        },
    },
    {
        name: 'get_roles',
        description: 'Roles held by a user (with how they were granted) or the roles contained by a role.',
        inputSchema: {
            type: 'object',
            properties: { type: { type: 'string', enum: ['user', 'role'] }, subject: { type: 'string', description: 'sys_id, user_name or role name' } },
            required: ['type', 'subject'],
            additionalProperties: false,
        },
        run: (a) => {
            const s = resolveSubjectRef(a.type, a.subject)
            if (!s) return { error: 'not_found', message: `${a.type} "${a.subject}" not found or not visible to you` }
            if (a.type === 'role') {
                if (!tableReadable('sys_user_role_contains')) return NO_ACCESS
                const c = secure('sys_user_role_contains')
                c.addQuery('role', s.ref.id)
                c.query()
                const contains = []
                while (c.next()) contains.push(c.getDisplayValue('contains'))
                return { role: s.label, link: link('sys_user_role', s.ref.id), contains }
            }
            if (!tableReadable('sys_user_has_role')) return NO_ACCESS
            const r = secure('sys_user_has_role')
            r.addQuery('user', s.ref.id)
            r.addQuery('state', 'active')
            r.query()
            const roles = []
            while (r.next()) {
                const group = r.getValue('granted_by') ? r.getDisplayValue('granted_by') : ''
                roles.push({ role: r.getDisplayValue('role'), via: group ? `group: ${group}` : r.getValue('inherited') === '1' || r.getValue('inherited') === 'true' ? 'inherited' : 'direct' })
            }
            return { user: s.label, link: link('sys_user', s.ref.id), roles }
        },
    },
    {
        name: 'search_acls',
        description: 'Search ACL definitions (sys_security_acl) by table, field, operation or role. Only returns ACLs the signed-in user can read.',
        inputSchema: {
            type: 'object',
            properties: {
                table: { type: 'string' },
                field: { type: 'string' },
                operation: { type: 'string', description: 'create, read, write, delete, execute, ...' },
                role: { type: 'string', description: 'Role name required by the ACL' },
                include_inactive: { type: 'boolean' },
                limit: { type: 'number' },
            },
            additionalProperties: false,
        },
        run: (a) => {
            if (!tableReadable('sys_security_acl')) return NO_ACCESS
            const parts: string[] = []
            if (!a.include_inactive) parts.push('active=true')
            if (a.table && a.field) parts.push(`name=${a.table}.${a.field}`)
            else if (a.table) parts.push(`name=${a.table}^ORnameSTARTSWITH${a.table}.`)
            if (a.operation) parts.push(`operation.name=${a.operation}`)
            if (a.role) {
                const ids: string[] = []
                const ar = secure('sys_security_acl_role')
                ar.addQuery('sys_user_role.name', a.role)
                ar.setLimit(500)
                ar.query()
                while (ar.next()) ids.push(ar.getValue('sys_security_acl'))
                if (!ids.length) return { results: [], note: `No readable ACLs require role ${a.role}` }
                parts.push(`sys_idIN${ids.join(',')}`)
            }
            const query = parts.join('^')
            const g = secure('sys_security_acl')
            if (query) g.addEncodedQuery(query)
            g.orderBy('name')
            g.setLimit(clampInt(a.limit, 20, 50))
            g.query()
            const out = []
            while (g.next()) {
                const id = g.getUniqueValue()
                const roles: string[] = []
                const rr = secure('sys_security_acl_role')
                rr.addQuery('sys_security_acl', id)
                rr.query()
                while (rr.next()) roles.push(rr.getDisplayValue('sys_user_role'))
                out.push({
                    sys_id: id,
                    name: g.getValue('name'),
                    type: g.getDisplayValue('type'),
                    operation: g.getDisplayValue('operation'),
                    decision: g.getValue('decision_type') || 'allow',
                    active: g.getValue('active') === '1' || g.getValue('active') === 'true',
                    roles,
                    has_condition: !!g.getValue('condition'),
                    has_script: (g.getValue('advanced') === '1' || g.getValue('advanced') === 'true') && !!g.getValue('script'),
                    admin_overrides: g.getValue('admin_overrides') === '1' || g.getValue('admin_overrides') === 'true',
                    scope: g.getDisplayValue('sys_scope'),
                    link: link('sys_security_acl', id),
                })
            }
            return { results: out, list_link: listLink('sys_security_acl', query) }
        },
    },
    {
        name: 'get_acl',
        description: 'Full details of one ACL (condition, script, roles, security attribute) if the signed-in user can read it.',
        inputSchema: { type: 'object', properties: { sys_id: { type: 'string' } }, required: ['sys_id'], additionalProperties: false },
        run: (a) => {
            const g = secure('sys_security_acl')
            if (!g.get(a.sys_id)) return NO_ACCESS
            const roles: string[] = []
            const rr = secure('sys_security_acl_role')
            rr.addQuery('sys_security_acl', a.sys_id)
            rr.query()
            while (rr.next()) roles.push(rr.getDisplayValue('sys_user_role'))
            return {
                name: g.getValue('name'),
                type: g.getDisplayValue('type'),
                operation: g.getDisplayValue('operation'),
                decision: g.getValue('decision_type') || 'allow',
                active: g.getValue('active'),
                description: g.getValue('description'),
                roles,
                condition: g.getDisplayValue('condition') || g.getValue('condition'),
                applies_to: g.getValue('applies_to'),
                advanced: g.getValue('advanced'),
                script: g.getValue('script'),
                security_attribute: g.getDisplayValue('security_attribute'),
                admin_overrides: g.getValue('admin_overrides'),
                scope: g.getDisplayValue('sys_scope'),
                updated: `${g.getDisplayValue('sys_updated_on')} by ${g.getValue('sys_updated_by')}`,
                link: link('sys_security_acl', a.sys_id),
            }
        },
    },
    {
        name: 'describe_table',
        description: 'Table metadata: label, parent tables, application scope and columns (only what the signed-in user can read).',
        inputSchema: { type: 'object', properties: { table: { type: 'string' } }, required: ['table'], additionalProperties: false },
        run: (a) => {
            if (!tableReadable('sys_db_object')) return NO_ACCESS
            const chain: string[] = []
            let label = ''
            let scope = ''
            let id = ''
            let cur = a.table
            for (let i = 0; cur && i < 20; i++) {
                const t = secure('sys_db_object')
                if (!t.get('name', cur)) break
                if (i === 0) {
                    label = t.getValue('label')
                    scope = t.getDisplayValue('sys_scope')
                    id = t.getUniqueValue()
                }
                chain.push(cur)
                const parentId = t.getValue('super_class')
                const p = secure('sys_db_object')
                cur = parentId && p.get(parentId) ? p.getValue('name') : ''
            }
            if (!chain.length) return { error: 'not_found', message: `Table ${a.table} not found or not visible to you` }
            const fields = []
            if (tableReadable('sys_dictionary')) {
                const d = secure('sys_dictionary')
                d.addQuery('name', 'IN', chain.join(','))
                d.addNotNullQuery('element')
                d.setLimit(300)
                d.query()
                while (d.next()) fields.push({ name: d.getValue('element'), label: d.getValue('column_label'), type: d.getValue('internal_type'), on: d.getValue('name') })
            }
            return { table: a.table, label, scope, hierarchy: chain, link: link('sys_db_object', id), fields }
        },
    },
    {
        name: 'evaluate_access',
        description: 'ACL Lens static evaluation of a user, role or group on a table (create/read/write/delete plus list_edit, query_match, query_range, add_to_list, save_as_template, report_on, personalize_choices, report_view, and security data filters) and optionally one field. Returns outcomes and reasons. ACL names, matched levels and required roles are included only if the signed-in user can read ACL definitions. The subject must be visible to the signed-in user.',
        inputSchema: {
            type: 'object',
            properties: {
                subject_type: { type: 'string', enum: ['user', 'role', 'group'] },
                subject: { type: 'string', description: 'sys_id, user_name, role name or group name' },
                table: { type: 'string' },
                field: { type: 'string' },
            },
            required: ['subject_type', 'subject', 'table'],
            additionalProperties: false,
        },
        run: (a) => {
            const s = resolveSubjectRef(a.subject_type, a.subject)
            if (!s) return { error: 'not_found', message: `${a.subject_type} "${a.subject}" not found or not visible to you` }
            if (!gs.tableExists(a.table)) return { error: 'unknown_table' }
            const d = fieldDetail(a.table, [s.ref])
            const key = d.subjects[0].key
            // mirror the signed-in user's access: ACL detail only if they can read ACL definitions
            const detail = tableReadable('sys_security_acl')
            const explain = (cell: any) => explainCell(cell, d.acls, detail)
            const ops: any = {}
            for (const op in d.tableCells[key]) ops[op] = explain(d.tableCells[key][op])
            const out: any = { subject: s.label, table: a.table, default_deny: d.defaultDeny, record_access: ops }
            const sdf = d.dataFilters[0].sdf
            if (sdf.length && tableReadable('sys_security_data_filter'))
                out.security_data_filters = sdf.map((o: any) => {
                    const f = d.filters[o.i]
                    return { table: f.table, mode: f.mode, security_attribute: f.securityAttribute, filter: f.filter, description: f.description, result: o.r === 'A' ? 'applied' : o.r === 'N' ? 'not_applied' : 'depends' }
                })
            if (tableReadable('sys_db_object')) out.hierarchy = d.chain
            if (!detail) out.note = HIDDEN_NOTE
            if (a.field) {
                const row = d.rows.filter((r: any) => r.field.name === a.field)[0]
                if (row) {
                    const f: any = {}
                    for (const op in row.cells[key]) f[op] = explain(row.cells[key][op])
                    out.field_access = { field: a.field, ...f }
                } else out.field_access = { field: a.field, error: 'Field not found on table' }
            }
            return out
        },
    },
    {
        name: 'search_records',
        description: 'Read up to 10 records from any table the signed-in user can read, using an encoded query. Returns display values and links.',
        inputSchema: {
            type: 'object',
            properties: {
                table: { type: 'string' },
                query: { type: 'string', description: 'Encoded query' },
                fields: { type: 'array', items: { type: 'string' }, description: 'Up to 8 field names' },
                limit: { type: 'number' },
            },
            required: ['table'],
            additionalProperties: false,
        },
        run: (a) => {
            if (!tableReadable(a.table)) return NO_ACCESS
            const g = secure(a.table)
            if (a.query) g.addEncodedQuery(a.query)
            g.setLimit(clampInt(a.limit, 5, 10))
            g.query()
            const fields: string[] = (a.fields || []).slice(0, 8)
            const out = []
            while (g.next()) {
                const row: any = { sys_id: g.getUniqueValue(), display: g.getDisplayValue(), link: link(a.table, g.getUniqueValue()) }
                for (const f of fields) if (g.isValidField(f)) row[f] = g.getDisplayValue(f)
                out.push(row)
            }
            return { table: a.table, results: out }
        },
    },
    {
        name: 'get_lens_run',
        description: 'Summary of a saved ACL Lens run (by number like ALR0001001 or sys_id), including comparison headline numbers and sample differences.',
        inputSchema: { type: 'object', properties: { run: { type: 'string' } }, required: ['run'], additionalProperties: false },
        run: (a) => {
            const g = secure('x_acllens_run')
            const runKey = queryText(a.run, 40)
            g.addEncodedQuery(`number=${runKey}^ORsys_id=${runKey}`)
            g.setLimit(1)
            g.query()
            if (!g.next()) return NO_ACCESS
            const run = getRun(g.getUniqueValue())
            const cmp = loadBlob<Comparison>(g.getUniqueValue(), 'comparison')
            return {
                run,
                link: `${baseUrl()}x_acllens_lens.do?view=run&id=${g.getUniqueValue()}`,
                comparison: cmp ? { summary: cmp.summary, subjects: cmp.subjects, sample_differences: cmp.diffs.slice(0, 40) } : null,
            }
        },
    },
]

export function findTool(name: string): ToolDef | null {
    return TOOLS.filter((t) => t.name === name)[0] || null
}

export function runTool(name: string, args: unknown): unknown {
    const tool = findTool(name)
    if (!tool) return { error: 'unknown_tool', message: `No tool named ${name}` }
    try {
        return tool.run(args && typeof args === 'object' ? args : {})
    } catch (e: any) {
        return { error: 'tool_failed', message: e && e.message ? e.message : String(e) }
    }
}
