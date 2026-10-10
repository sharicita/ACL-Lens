// Mirrors src/server/engine/types.ts and the run/comparison payloads returned by the REST API.
export type Op =
    | 'create'
    | 'read'
    | 'write'
    | 'delete'
    | 'list_edit'
    | 'query_match'
    | 'query_range'
    | 'add_to_list'
    | 'save_as_template'
    | 'report_on'
    | 'personalize_choices'
    | 'report_view'
/** the core record operations (cards, counts and summaries use these) */
export const TABLE_OPS: Op[] = ['create', 'read', 'write', 'delete']
/** the other table operations the platform checks */
export const EXTRA_OPS: Op[] = ['list_edit', 'query_match', 'query_range', 'add_to_list', 'save_as_template', 'report_on', 'personalize_choices', 'report_view']
export const ALL_TABLE_OPS: Op[] = TABLE_OPS.concat(EXTRA_OPS)
export const FIELD_OPS: Op[] = ['create', 'read', 'write']
export type Status = 'G' | 'C' | 'D' | 'N'
export type SubjectType = 'user' | 'role' | 'group'

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

/** A = applied (rows outside the filter are hidden), N = not applied, C = depends on a security attribute */
export type FilterResult = 'A' | 'N' | 'C'

export interface DataFilterInfo {
    id: string
    table: string
    mode: 'if' | 'unless'
    filter: string
    securityAttribute: string
    description: string
}

export interface DataFilterOutcome {
    i: number
    r: FilterResult
}

export interface TableResult {
    t: string
    l: string
    ops: { [op: string]: Cell }
    fields: FieldRow[]
    /** security data filters (missing on runs saved before they were analyzed) */
    sdf?: DataFilterOutcome[]
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
    /** also analyze every table that extends a selected table */
    includeChildren?: boolean
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
    dataFilters?: DataFilterInfo[]
    /** table operations evaluated (missing on runs saved before the extra operations: TABLE_OPS) */
    ops?: Op[]
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
    dataFilters?: { key: string; sdf: DataFilterOutcome[] }[]
    filters?: DataFilterInfo[]
    rows: {
        field: { name: string; label: string; type: string; definedOn: string }
        cells: { [key: string]: { [op: string]: Cell } }
    }[]
    acls: AclInfo[]
}
