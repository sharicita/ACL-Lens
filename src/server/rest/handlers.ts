import { gs, GlideRecordSecure } from '@servicenow/glide'
import { fieldDetail } from '../engine/analyze.ts'
import { searchSubjects } from '../engine/subjects.ts'
import { listRuns } from '../engine/storage.ts'
import { executeRun, loadRun, rerun } from '../engine/runs.ts'
import { rankedSearch } from '../engine/search.ts'
import { aclDetail } from '../engine/acl-detail.ts'
import { clearHistory, deleteRun, getSettings, historyEnabled, instanceTheme, previewClear, saveSettings, setArchived } from '../admin/settings.ts'
import { SubjectRef } from '../engine/types.ts'

const USER_ROLE = 'x_acllens.user'

function qp(request: any, name: string): string {
    const v = request.queryParams ? request.queryParams[name] : undefined
    if (v === undefined || v === null) return ''
    return String(Array.isArray(v) ? v[0] : v)
}

function body(request: any): any {
    try {
        return request.body && request.body.data ? request.body.data : {}
    } catch (e) {
        return {}
    }
}

/** Runs a handler with the app role check and consistent JSON error responses. */
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
        response.setStatus(message.indexOf('not found') >= 0 ? 404 : message.indexOf('role is required') >= 0 ? 403 : 400)
        response.setBody({ error: { message } })
    }
}

function parseSubjects(value: string): SubjectRef[] {
    return value
        .split(',')
        .map((p) => p.trim())
        .filter((p) => !!p)
        .map((p) => {
            const [type, id] = p.split(':')
            return { type: type === 'role' ? 'role' : 'user', id } as SubjectRef
        })
}

export function getSubjects(request: any, response: any) {
    handle(request, response, (req) =>
        searchSubjects(qp(req, 'type') || 'user', qp(req, 'q'), parseInt(qp(req, 'limit') || '20', 10))
    )
}

export function getScopes(request: any, response: any) {
    handle(request, response, (req) =>
        // only scopes the signed-in user can read; custom (x_) apps first when the box is empty
        rankedSearch(
            { table: 'sys_scope', fields: ['scope', 'name'], text: qp(req, 'q'), limit: 10, secure: true, orderBy: 'scope', emptyQuery: 'scopeSTARTSWITHx_' },
            (r) => ({ scope: r.getValue('scope'), name: r.getValue('name') })
        )
    )
}

export function getTables(request: any, response: any) {
    handle(request, response, (req) => {
        // only tables the signed-in user can read, ranked: name starts with -> label starts with -> contains
        const text = (qp(req, 'q') || '').trim()
        const results = rankedSearch(
            { table: 'sys_db_object', fields: ['name', 'label'], text, limit: 10, secure: true, orderBy: 'name', baseQuery: 'nameISNOTEMPTY' },
            (r) => ({ name: r.getValue('name'), label: r.getValue('label') || r.getValue('name'), scope: r.getDisplayValue('sys_scope') })
        )
        // how many tables a prefix would select (prefix mode)
        let prefixCount = 0
        if (text) {
            const c = new GlideRecordSecure('sys_db_object') as any
            c.addQuery('name', 'STARTSWITH', text)
            c.query()
            prefixCount = c.getRowCount()
        }
        return { results, prefixCount }
    })
}

export function getAclDetail(request: any, response: any) {
    handle(request, response, (req) => aclDetail(req.pathParams.id))
}

export function postRun(request: any, response: any) {
    handle(request, response, (req) => executeRun(body(req)))
}

export function getRuns(request: any, response: any) {
    handle(request, response, (req) =>
        listRuns({
            limit: Math.min(parseInt(qp(req, 'limit') || '50', 10), 200),
            text: qp(req, 'q'),
            type: qp(req, 'type'),
            originalRun: qp(req, 'original'),
            archived: qp(req, 'archived') === 'true',
        })
    )
}

export function getRunById(request: any, response: any) {
    handle(request, response, (req) => {
        const data = loadRun(req.pathParams.id)
        if (!data) throw new Error('Run not found')
        return data
    })
}

export function postRerun(request: any, response: any) {
    handle(request, response, (req) => rerun(req.pathParams.id))
}

export function getFields(request: any, response: any) {
    handle(request, response, (req) => {
        const table = qp(req, 'table')
        const subjects = parseSubjects(qp(req, 'subjects'))
        if (!table) throw new Error('table is required')
        if (!subjects.length) throw new Error('subjects is required')
        return fieldDetail(table, subjects)
    })
}

const ADMIN_ROLE = 'x_acllens.admin'

function requireAdmin() {
    if (!gs.hasRole(ADMIN_ROLE)) throw new Error(`The ${ADMIN_ROLE} role is required`)
}

export function getMe(request: any, response: any) {
    handle(request, response, () => ({
        user: gs.getUserName(),
        is_admin: gs.hasRole(ADMIN_ROLE),
        history_enabled: historyEnabled(),
        instance_theme: instanceTheme(),
    }))
}

export function getSettingsRoute(request: any, response: any) {
    handle(request, response, () => {
        requireAdmin()
        return getSettings()
    })
}

export function putSettingsRoute(request: any, response: any) {
    handle(request, response, (req) => {
        requireAdmin()
        return saveSettings(body(req))
    })
}

export function postHistoryPreview(request: any, response: any) {
    handle(request, response, (req) => {
        requireAdmin()
        return previewClear(body(req))
    })
}

export function postHistoryClear(request: any, response: any) {
    handle(request, response, (req) => {
        requireAdmin()
        return clearHistory(body(req))
    })
}

export function deleteRunRoute(request: any, response: any) {
    handle(request, response, (req) => {
        requireAdmin()
        return deleteRun(req.pathParams.id)
    })
}

export function postRunArchive(request: any, response: any) {
    handle(request, response, (req) => {
        requireAdmin()
        return setArchived(req.pathParams.id, body(req).archived !== false)
    })
}
