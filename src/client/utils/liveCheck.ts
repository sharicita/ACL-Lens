import { SubjectType } from '../types'

/**
 * "Check live": the platform evaluates access exactly as it would at run time, with the same
 * evaluation the Access Analyzer uses, and reports every data point it shows (overall access,
 * security data filters, ACLs, access handlers, data filtration, execution time, scripts,
 * admin override, insights) plus the result of every ACL checked.
 *
 * The platform only lets its own Access Analyzer scope call that evaluation, so ACL Lens calls the
 * Access Analyzer's "Get access debug logs" data broker from the browser with the signed-in user's
 * session. The platform's ACL on that data broker decides who may run it (admin, user_admin or
 * access_analyzer_admin): ACL Lens never widens anyone's access.
 */

/** "Get access debug logs" (sys_ux_data_broker_transform, Access Analyzer plugin) */
const DEBUG_LOG_BROKER = '84b4614577c22110eba8fe21fe5a9943'

export type LiveStatus = 'passed' | 'blocked' | 'skipped' | 'undefined' | 'applied' | 'not_applied' | ''

export interface LiveAcl {
    sysId: string
    name: string
    level: 'Table' | 'Field'
    decision: 'allow' | 'deny' | ''
    status: LiveStatus
    roles: string[]
    rolesResult: LiveStatus
    conditionResult: LiveStatus
    scriptResult: LiveStatus
    securityAttributeResult: LiveStatus
    appliesToResult: string
    app: string
}

export interface LiveStep {
    type: 'Access Handler' | 'Data Filtration' | 'Security Data Filter' | 'Business Rule'
    name: string
    status: LiveStatus
    sysId: string
    mode?: string
}

export interface LiveOperation {
    op: string
    overall: LiveStatus
    securityDataFilter: LiveStatus
    acl: LiveStatus
    accessHandler: LiveStatus
    dataFiltration: LiveStatus
    /** an ACL script took part in the decision */
    script: boolean
    adminOverride: string
    insights: string
    time: string
    acls: LiveAcl[]
    steps: LiveStep[]
}

export interface LiveResult {
    subject: { type: SubjectType; id: string; label: string }
    table: string
    record: string
    field: string
    executedAt: string
    recordAvailable?: string
    readOnlyField?: string
    operations: LiveOperation[]
}

const ENTITY: { [t: string]: string } = { user: 'User', group: 'Group', role: 'Role' }

function ui(v: unknown): LiveStatus {
    const s = String(v === undefined || v === null ? '' : v).toLowerCase()
    if (s === 'true') return 'passed'
    if (s === 'false') return 'blocked'
    if (s === 'not_evaluated') return 'skipped'
    return ''
}

function refResult(a: any): string {
    let ref = a.controlledByReference
    if (typeof ref === 'string') {
        try {
            ref = JSON.parse(ref)
        } catch (e) {
            ref = {}
        }
    }
    return String((ref && ref.evalResult) || '').toLowerCase()
}

/** Same rule as the platform's analyzer: every check that ran passed -> passed; none ran -> skipped. */
function cumulative(a: any): LiveStatus {
    const r = String(a.rolesResult || '').toLowerCase()
    const c = String(a.conditionResult || '').toLowerCase()
    const s = String(a.scriptResult || '').toLowerCase()
    const at = String(a.securityAttributeResult || '').toLowerCase()
    const ref = refResult(a)
    if (r === 'true' && c === 'true' && s === 'true' && at === 'true' && ref === 'true') return 'passed'
    if (r === 'true' && at !== 'false' && c === 'not_evaluated' && s === 'not_evaluated' && ref === 'not_evaluated') return 'passed'
    if (r === 'not_evaluated' && c === 'not_evaluated' && s === 'not_evaluated' && at === 'not_evaluated' && ref === 'not_evaluated') return 'skipped'
    return 'blocked'
}

/** Turns the platform's debug log into the Access Analyzer's columns (mirrors its own parsing). */
export function parseLive(resp: any, req: { table: string; record: string; field: string; ops: string[] }): Omit<LiveResult, 'subject' | 'executedAt'> {
    const debug = resp.securityDebug || {}
    const detail = resp.detail || {}
    const { table, record, field } = req
    const readOnly = field ? (detail.readOnlyProperty === 'true' ? 'yes' : 'no') : undefined
    const path = (op: string) => `record/${table}${field ? '.' + field : ''}/${op}`
    const operations = req.ops.map((op): LiveOperation => {
        const o = debug[op] || { debugLogs: [] }
        const acls: LiveAcl[] = []
        const steps: LiveStep[] = []
        let hasDF = false
        let blocking = ''
        let adminOverride = ''
        let time = ''
        for (const l of o.debugLogs || []) {
            if (!time && l.time) time = l.time
            if (l.logType === 'SecurityRulesInfo') {
                for (const a of l.acls || []) {
                    const name = String(a.path || '').split('/')[1] || a.sysId
                    acls.push({
                        sysId: a.sysId,
                        name,
                        level: name.indexOf('.') > 0 ? 'Field' : 'Table',
                        decision: a.aclDecisionType === 'DENY_UNLESS' ? 'deny' : a.aclDecisionType === 'ALLOW_IF' ? 'allow' : '',
                        status: cumulative(a),
                        roles: a.roles || [],
                        rolesResult: ui(a.rolesResult),
                        conditionResult: ui(a.conditionResult),
                        scriptResult: ui(a.scriptResult),
                        securityAttributeResult: ui(a.securityAttributeResult),
                        appliesToResult: String(a.appliesToConditionResult || '').toLowerCase(),
                        app: a.app || '',
                    })
                }
            } else if (l.logType === 'DataFiltrationInfo') {
                hasDF = true
                steps.push({ type: 'Data Filtration', name: l.name || '', status: l.status ? 'passed' : 'blocked', sysId: String(l.ref || '').split('=')[1] || '' })
            } else if (l.logType === 'AccessHandlerInfo') {
                if (l.accessHandler === 'DataFiltrationAccessHandler') continue
                steps.push({ type: 'Access Handler', name: l.name || l.accessHandler || '', status: l.result ? 'passed' : 'blocked', sysId: '' })
                if (!l.result && !blocking) blocking = l.accessHandler || l.name || ''
            } else if (l.logType === 'SecurityDataFilterInfo') {
                const r = l.dataFilterResult || {}
                steps.push({
                    type: 'Security Data Filter',
                    name: r.name || 'Security data filter',
                    status: l.applicable ? 'applied' : 'not_applied',
                    sysId: r.sysId || '',
                    mode: r.mode === 'IF' ? 'Filter if' : r.mode === 'UNLESS' ? 'Filter unless' : '',
                })
            } else if (l.logType === 'BusinessRuleInfo') {
                steps.push({ type: 'Business Rule', name: l.name || '', status: '', sysId: l.sysId || '' })
            }
            if (l.path === path(op) && !adminOverride) adminOverride = l.isCumulativeOverride ? 'yes' : 'no'
        }
        if (!record) adminOverride = 'n/a'
        const passed = !!o.status
        // scripts are not evaluated for query operations or without a record
        const scriptRan = op !== 'query_match' && op !== 'query_range' && !!record && acls.some((a) => a.scriptResult === 'passed' || a.scriptResult === 'blocked')
        const out: LiveOperation = {
            op,
            overall: passed ? 'passed' : 'blocked',
            securityDataFilter: steps.some((s) => s.type === 'Security Data Filter' && s.status === 'applied')
                ? 'applied'
                : steps.some((s) => s.type === 'Security Data Filter')
                  ? 'not_applied'
                  : 'undefined',
            acl: 'undefined',
            accessHandler: 'skipped',
            dataFiltration: 'skipped',
            script: scriptRan,
            adminOverride: adminOverride || 'n/a',
            insights: o.insights || '',
            time,
            acls,
            steps,
        }
        if (field && readOnly === 'yes' && op === 'write') {
            out.insights = `The field ${field} is read only, so write is not allowed.`
            out.acl = 'skipped'
            return out
        }
        if (field && readOnly === 'yes' && op === 'create') out.insights = `The field ${field} is read only.`
        if (o.logType === 'AccessHandlerInfo') {
            if (hasDF) out.dataFiltration = passed ? 'passed' : 'blocked'
            else {
                out.accessHandler = passed ? 'passed' : 'blocked'
                if (!passed && !out.insights && blocking) out.insights = `${blocking} is blocking access`
            }
        } else if (hasDF) out.dataFiltration = 'passed'
        if (o.logType === 'SecurityRulesInfo' && acls.length) out.acl = passed ? 'passed' : 'blocked'
        return out
    })
    const res: Omit<LiveResult, 'subject' | 'executedAt'> = { table, record, field, operations }
    if (detail.hasOwnProperty('isRecordAvailable')) res.recordAvailable = detail.isRecordAvailable === 'true' ? 'yes' : 'no'
    if (readOnly) res.readOnlyField = readOnly
    return res
}

export async function runLiveCheck(args: { subject: { type: SubjectType; id: string; label: string }; table: string; record?: string; field?: string; ops: string[] }): Promise<LiveResult> {
    const record = (args.record || '').trim()
    const field = (args.field || '').trim()
    if (record && !/^[0-9a-f]{32}$/.test(record)) throw new Error('The record must be a 32-character sys_id')
    const payload = {
        entitySysId: args.subject.id,
        entityType: ENTITY[args.subject.type],
        targetName: args.table,
        targetResource: 'record',
        targetField: field,
        targetMethod: '',
        targetRecord: record,
        targetOperations: args.ops,
    }
    const res = await fetch('/api/now/uxf/databroker/exec', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-UserToken': (window as any).g_ck },
        body: JSON.stringify([{ type: 'TRANSFORM', definitionSysId: DEBUG_LOG_BROKER, inputValues: { requestPayload: { type: 'JSON_LITERAL', value: payload } } }]),
    })
    let body: any = null
    try {
        body = await res.json()
    } catch (e) {
        /* handled below */
    }
    const item = body && body.result && body.result[0]
    if (!res.ok || !item) {
        const msg = (body && body.error && body.error.message) || `HTTP ${res.status}`
        throw new Error(`The live check could not run: ${msg}. It needs the Access Analyzer plugin and the admin, user_admin or access_analyzer_admin role.`)
    }
    if (item.errors && item.errors.length) {
        const e = item.errors[0]
        throw new Error(`The live check was refused: ${(e && (e.message || e.code)) || 'access denied'}. It needs the admin, user_admin or access_analyzer_admin role.`)
    }
    let out: any = item.executionResult && item.executionResult.output
    if (typeof out === 'string') {
        try {
            out = JSON.parse(out)
        } catch (e) {
            throw new Error('The live check returned an unreadable response')
        }
    }
    if (!out || out.error || out.pass === false) throw new Error(`The live check failed: ${(out && out.errorMessage) || 'no response'}`)
    const now = new Date()
    return {
        subject: args.subject,
        executedAt: now.toLocaleString(),
        ...parseLive(out, { table: args.table, record, field, ops: args.ops }),
    }
}
