// Mirrors src/server/engine/types.ts and the run/comparison payloads returned by the REST API.
export type Op = 'create' | 'read' | 'write' | 'delete'
export const TABLE_OPS: Op[] = ['create', 'read', 'write', 'delete']
export const FIELD_OPS: Op[] = ['create', 'read', 'write']
export type Status = 'G' | 'C' | 'D' | 'N'
export type SubjectType = 'user' | 'role'

export interface SubjectOption {
    id: string
    label: string
    sub: string
    type: SubjectType
}

export type RoleAssignment = 'direct' | 'group' | 'inherited' | 'selected' | 'contained'

export interface RoleSource {
    role: string
    via: string
    /** missing on runs saved before role assignment details were recorded */
    kind?: RoleAssignment
    from?: string
}

export interface AccountInfo {
    identity: 'human' | 'machine' | 'ai_agent' | 'unclassified' | ''
    identityLabel: string
    webServiceOnly: boolean
    integrationUser: boolean
}

export interface Subject {
    account?: AccountInfo
    type: SubjectType
    id: string
    key: string
    label: string
    sub: string
    active: boolean
    isAdmin: boolean
    roles: string[]
    roleSources: RoleSource[]
}

export interface AclInfo {
    id: string
    name: string
    op: Op
    decision: 'allow' | 'deny'
    roles: string[]
    adminOverrides: boolean
    condition: string
    hasScript: boolean
    securityAttribute: string
    appliesTo: string
    description: string
    scope: string
}

export interface AclOutcome {
    i: number
    r: 'P' | 'C' | 'F'
    c: string
}

export interface Cell {
    s: Status
    lvl: string
    dlvl?: string
    a: AclOutcome[]
}

export interface FieldRow {
    f: string
    ops: { [op: string]: Cell }
}

export interface TableResult {
    t: string
    l: string
    ops: { [op: string]: Cell }
    fields: FieldRow[]
}

export interface SubjectResult {
    subject: Subject
    tables: TableResult[]
    counts: { [op: string]: { [s: string]: number } }
}

export type FilterMode = 'secured_by_roles' | 'tables' | 'prefix' | 'scope' | 'all'

export interface AnalysisFilter {
    mode: FilterMode
    value?: string
    includeFields?: boolean
    excludeSystem?: boolean
    maxTables?: number
}

export interface AnalysisResult {
    version: number
    generatedAt: string
    defaultDeny: boolean
    filter: AnalysisFilter
    tableCount: number
    truncated: boolean
    warnings: string[]
    acls: AclInfo[]
    subjects: SubjectResult[]
}

export interface DiffRow {
    kind: 'table' | 'field'
    t: string
    l: string
    f: string
    op: string
    statuses: Status[]
}

export interface Comparison {
    subjects: { key: string; label: string; type: string }[]
    defaultDeny: boolean
    summary: {
        tablesCompared: number
        tablesIdentical: number
        tablesDifferent: number
        tableCellsDifferent: number
        fieldCellsDifferent: number
        perSubject: { key: string; granted: number; conditional: number; denied: number; exclusive: number }[]
    }
    roles: { role: string; has: boolean[] }[]
    pairs: { a: string; b: string; aMore: number; bMore: number; same: number }[]
    diffs: DiffRow[]
}

export interface DriftResult {
    total: number
    truncated: boolean
    notes: string[]
    rows: { subject: string; kind: string; t: string; f: string; op: string; from: Status; to: Status }[]
}

export interface RunRecord {
    sys_id: string
    number: string
    name: string
    run_type: 'analyze' | 'compare'
    status: 'running' | 'complete' | 'error'
    subjects: { type: SubjectType; id: string; label?: string }[]
    subject_summary: string
    filter: AnalysisFilter
    summary: any
    original_run: string
    original_number: string
    run_by: string
    created: string
    duration_ms: number
    table_count: number
    diff_count: number
    error_message: string
    rerun_count?: number
    archived?: boolean
    /** history is turned off: this run exists only in the browser */
    unsaved?: boolean
}

export interface RunPayload {
    run: RunRecord
    results: AnalysisResult | null
    comparison: Comparison | null
    drift: DriftResult | null
}

export interface FieldDetail {
    table: string
    label: string
    chain: string[]
    defaultDeny: boolean
    subjects: { key: string; label: string; type: string }[]
    tableCells: { [key: string]: { [op: string]: Cell } }
    rows: {
        field: { name: string; label: string; type: string; definedOn: string }
        cells: { [key: string]: { [op: string]: Cell } }
    }[]
    acls: AclInfo[]
}
